const fs = require('fs');
const path = require('path');

const DATA_JS_PATH = path.join(__dirname, '..', 'data.js');
const MASTER_JSON_PATH = path.join(__dirname, '..', 'data', 'master-data.json');

function extractMarca(nombre) {
    const marcas = [
        'Costeño', 'Faraón', 'Valle Norte', 'Vallenorte', 'Paisana', 'Wong',
        'Metro', 'Cuisine & Co', 'Bell\'s', 'Gran Chalán', 'Mizu', 'Huella Verde', 
        'Inverni', 'Miyabi-Mai', 'Bárcidda', 'Kellogg\'s', 'Ricocan', 'Pedigree',
        'Primor', 'Sao', 'Cocinero', 'Capri', 'Florida', 'Campomar', 'Molitalia',
        'Don Vittorio', 'Gloria', 'Ideal', 'Laive'
    ];
    if(!nombre) return 'Dato Libre';
    const lower = nombre.toLowerCase();
    for (const m of marcas) {
        if (lower.includes(m.toLowerCase())) return m;
    }
    return 'Dato Libre';
}

function extractTipo(nombre) {
    const tipos = [
        'Extra Añejo', 'Añejo Extra', 'Gran Reserva', 'Superior', 'Integral', 
        'Parbolizado', 'Japónico', 'Arborio', 'Carnaroli', 'Extra',
        'Vegetal', 'Soya', 'Oliva', 'Girasol', 'Maíz'
    ];
    if(!nombre) return 'Regular';
    const lower = nombre.toLowerCase();
    for (const t of tipos) {
        if (lower.includes(t.toLowerCase())) return t;
    }
    return 'Regular';
}

function parseCurrency(val) {
    return typeof val === 'number' ? val : 0;
}

function formatFecha(timestampStr) {
    const d = new Date(timestampStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function normalizePuppeteerItem(item, superId) {
    return {
        fecha: formatFecha(item.timestamp),
        super: superId === 'wong' ? 'Wong' : 
               superId === 'metro' ? 'Metro' : 
               superId === 'plazavea' ? 'Plaza Vea' : 
               superId === 'tottus' ? 'Tottus' : superId,
        item: item.nombre,
        categoria: item.categoria || 'Generico',
        marca: extractMarca(item.nombre),
        tipo: extractTipo(item.nombre),
        clase: null,
        precioOnline: parseCurrency(item.precios?.online),
        precioRegular: parseCurrency(item.precios?.regular) || 0,
        descuento: (item.descuento && item.descuento > 0) ? -item.descuento : null,
        presentacion: item.presentacion?.valor || 1,
        vt: item.presentacion?.valor || 1,
        um: item.presentacion?.unidad || 'u',
        pxum: parseCurrency(item.precios?.porUnidad) || parseCurrency(item.precios?.online),
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
        console.error(`ERROR: No se encontró data.js`);
        process.exit(1);
    }

    const mergedMap = new Map();
    // 1. Cargar existentes
    for (const d of existingData) {
        const key = `${d.super}|${d.item}|${d.fecha}`.toLowerCase();
        mergedMap.set(key, d);
    }

    let addedCount = 0;
    let discardedCount = 0;

    // 2. Leer Master JSON Object
    if (fs.existsSync(MASTER_JSON_PATH)) {
        const masterData = JSON.parse(fs.readFileSync(MASTER_JSON_PATH, 'utf8'));
        
        const superDict = masterData.supermercados;
        if(superDict) {
            for(const superId in superDict) {
                const cats = superDict[superId];
                for(const catId in cats) {
                    const items = cats[catId];
                    for(const rawItem of items) {
                        const norm = normalizePuppeteerItem(rawItem, superId);
                        norm.categoria = catId; // Sobreescribimos con catId real
                        
                        const key = `${norm.super}|${norm.item}|${norm.fecha}`.toLowerCase();
                        if (mergedMap.has(key)) {
                            discardedCount++;
                        } else {
                            mergedMap.set(key, norm);
                            addedCount++;
                        }
                    }
                }
            }
        }
        
    } else {
        console.log(`[Master] No se encontró el archivo master-data.json`);
    }

    const finalDataset = Array.from(mergedMap.values());
    console.log(`[Merge] Terminó. Dataset final: ${finalDataset.length}`);
    console.log(`[Reporte] Nuevos agregados hoy: ${addedCount}`);
    console.log(`[Reporte] Descartados (duplicados): ${discardedCount}`);

    const header = `// PRECIO JUSTO — rawData\n// Base: Browse.AI + Puppeteer Scrapers + Sprint 3/4\n// Generado: ${new Date().toISOString()}\n// Registros: ${finalDataset.length}\n`;
    const finalContent = `${header}const rawData = ${JSON.stringify(finalDataset, null, 2)};\n`;

    fs.writeFileSync(DATA_JS_PATH, finalContent, 'utf8');
    console.log(`✅ ¡Éxito! Dataset maestro actualizado en MVP/data.js preservando el histórico`);
}

main();
