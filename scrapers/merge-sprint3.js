const fs = require('fs');
const path = require('path');

const DATA_JS_PATH = path.join(__dirname, '..', 'data.js');
const WONG_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'wong-arroz.json');
const METRO_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'metro-arroz.json');

function extractMarca(nombre) {
    const marcas = [
        'Costeño', 'Faraón', 'Valle Norte', 'Vallenorte', 'Paisana', 'Wong',
        'Metro', 'Cuisine & Co', 'Bell\'s', 'Gran Chalán', 'Mizu', 'Huella Verde', 
        'Inverni', 'Miyabi-Mai', 'Bárcidda', 'Kellogg\'s', 'Ricocan', 'Pedigree'
    ];
    const lower = nombre.toLowerCase();
    for (const m of marcas) {
        if (lower.includes(m.toLowerCase())) {
            // Normalizar "Valle Norte" a "Vallenorte" por consistencia si lo prefieren,
            // pero lo dejaremos como coincide.
            return m;
        }
    }
    return 'Arroz';
}

function extractTipo(nombre) {
    const tipos = [
        'Extra Añejo', 'Añejo Extra', 'Gran Reserva', 'Superior', 'Integral', 
        'Parbolizado', 'Japónico', 'Arborio', 'Carnaroli', 'Extra'
    ];
    const lower = nombre.toLowerCase();
    for (const t of tipos) {
        if (lower.includes(t.toLowerCase())) return t;
    }
    return 'Extra';
}

function parseCurrency(val) {
    return typeof val === 'number' ? val : 0;
}

function formatFecha(timestampStr) {
    const d = new Date(timestampStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function normalizePuppeteerItem(item) {
    return {
        fecha: formatFecha(item.timestamp),
        super: item.super === 'wong' ? 'Wong' : (item.super === 'metro' ? 'Metro' : item.super),
        item: item.nombre,
        categoria: 'Arroz',
        marca: extractMarca(item.nombre),
        tipo: extractTipo(item.nombre),
        clase: null,
        precioOnline: parseCurrency(item.precios?.online),
        precioRegular: parseCurrency(item.precios?.regular) || 0,
        descuento: (item.descuento && item.descuento > 0) ? -item.descuento : null,
        presentacion: item.presentacion?.valor || 1,
        vt: item.presentacion?.valor || 1,
        um: item.presentacion?.unidad || 'u',
        pxum: parseCurrency(item.precios?.porUnidad),
        pack: item.presentacion?.pack || 1
    };
}

async function main() {
    let existingData = [];
    if (fs.existsSync(DATA_JS_PATH)) {
        const jsContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
        const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            existingData = JSON.parse(jsonMatch[0]);
            console.log(`[Data.js] Leídos ${existingData.length} registros existentes.`);
        }
    } else {
        console.error(`ERROR: No se encontró data.js en ${DATA_JS_PATH}`);
        process.exit(1);
    }

    const mergedMap = new Map();
    // 1. Cargar existentes (Browse.AI priority)
    for (const d of existingData) {
        const key = `${d.super}|${d.item}|${d.fecha}`.toLowerCase();
        mergedMap.set(key, d);
    }

    let addedCount = 0;
    let discardedCount = 0;

    // 2. Leer Wong JSON
    if (fs.existsSync(WONG_JSON_PATH)) {
        const pData = JSON.parse(fs.readFileSync(WONG_JSON_PATH, 'utf8'));
        console.log(`[Wong] Leídos ${pData.length} registros raw.`);
        for (const raw of pData) {
            const norm = normalizePuppeteerItem(raw);
            const key = `${norm.super}|${norm.item}|${norm.fecha}`.toLowerCase();
            if (mergedMap.has(key)) {
                discardedCount++;
            } else {
                mergedMap.set(key, norm);
                addedCount++;
            }
        }
    } else {
        console.log(`[Wong] No se encontró el archivo: ${WONG_JSON_PATH}`);
    }

    // 3. Leer Metro JSON
    if (fs.existsSync(METRO_JSON_PATH)) {
        const pData = JSON.parse(fs.readFileSync(METRO_JSON_PATH, 'utf8'));
        console.log(`[Metro] Leídos ${pData.length} registros raw.`);
        for (const raw of pData) {
            const norm = normalizePuppeteerItem(raw);
            const key = `${norm.super}|${norm.item}|${norm.fecha}`.toLowerCase();
            if (mergedMap.has(key)) {
                discardedCount++;
            } else {
                mergedMap.set(key, norm);
                addedCount++;
            }
        }
    } else {
        console.log(`[Metro] No se encontró el archivo: ${METRO_JSON_PATH}`);
    }

    const finalDataset = Array.from(mergedMap.values());
    console.log(`[Merge] Terminó. Dataset final: ${finalDataset.length}`);
    console.log(`[Reporte] Agregados: ${addedCount}`);
    console.log(`[Reporte] Descartados (duplicados): ${discardedCount}`);

    const header = `// PRECIO JUSTO — rawData\n// Base: Browse.AI + Puppeteer Scrapers\n// Generado: ${new Date().toISOString()}\n// Registros: ${finalDataset.length}\n`;
    const finalContent = `${header}const rawData = ${JSON.stringify(finalDataset, null, 2)};\n`;

    fs.writeFileSync(DATA_JS_PATH, finalContent, 'utf8');
    console.log(`✅ ¡Éxito! Dataset maestro actualizado en MVP/data.js`);
}

main();
