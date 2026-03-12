const fs = require('fs');
const path = require('path');
const utils = require('./utils'); // for isRelevant logic as per quality rules

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_JS_PATH = path.join(__dirname, '..', 'data.js');

// Mapa super: scraper id -> app nombre
const SUPER_MAP = {
    'wong': 'Wong',
    'metro': 'Metro',
    'plazavea': 'Plaza Vea',
    'tottus': 'Tottus'
};

// Mapa categoría: scraper id -> app nombre
const CAT_MAP = {
    'arroz': 'Arroz',
    'aceite': 'Aceite',
    'azucar-blanca': 'Azúcar Blanca',
    'azucar-rubia': 'Azúcar Rubia',
    'harina': 'Harina',
    'avena': 'Avena',
    'fideos': 'Fideos',
    'pollo': 'Pollo',
    'huevos': 'Huevos',
    'leche-evaporada': 'Leche Evaporada',
    'leche-fresca': 'Leche Fresca',
    'mantequilla': 'Mantequilla',
    'lentejas': 'Lentejas',
    'frijol-canario': 'Frijol Canario',
    'pan-molde': 'Pan de Molde'
};

function extractMarca(nombre) {
    const marcas = [
        'Costeño', 'Mochica', 'Faraón', 'Tottus', 'Bell\'s', 'Bells',
        'Paisana', 'Vallenorte', 'Valle Norte', 'Doña Isolina', 'Rímac', 'La Preferida',
        'Primor', 'Cil', 'Capri', 'Sello de Oro', 'Dorina', 'Friol',
        'Gloria', 'Laive', 'Pura Vida', 'Anchor', 'Bonle', 'Miami',
        'Wong', 'Metro', 'Cuisine & Co', 'Eco', 'Molitalia', 'Don Victorio', 'Cayetano',
        'Nicolini', 'Lavaggi', 'Buli', 'Alianza', 'Maximo',
        'San Fernando', 'La Molina', 'Redondos', 'Benedetti', 'Gran Chalán', 'Mizu', 'Huella Verde', 
        'Inverni', 'Miyabi-Mai', 'Bárcidda', 'Kellogg\'s', 'Ricocan', 'Pedigree'
    ];
    const nb = nombre.toLowerCase();
    for (const m of marcas) {
        if (nb.includes(m.toLowerCase())) return m;
    }
    const tokens = nombre.split(' ');
    if (tokens[0] && /^[A-ZÁÉÍÓÚ]/.test(tokens[0]) && tokens[0].length > 2) {
        return tokens[0];
    }
    return 'Genérico';
}

function extractTipo(nombre, categoria) {
    const nb = nombre.toLowerCase();
    if (categoria === 'Arroz') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('gran reserva')) return 'Gran Reserva';
        if (nb.includes('añejo extra') || nb.includes('anejo extra')) return 'Añejo Extra';
        if (nb.includes('extra añejo') || nb.includes('extra anejo')) return 'Extra Añejo';
        if (nb.includes('extra')) return 'Extra';
        if (nb.includes('superior')) return 'Superior';
        return 'Extra'; 
    }
    if (categoria === 'Aceite') {
        if (nb.includes('oliva')) return 'De Oliva';
        if (nb.includes('girasol')) return 'De Girasol';
        if (nb.includes('cártamo') || nb.includes('cartamo')) return 'De Cártamo';
        return 'Vegetal';
    }
    const words = ['molida', 'entera', 'fresca', 'congelada', 'filetes', 'bolsa', 'caja'];
    for (const w of words) {
        if (nb.includes(w)) return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return categoria;
}

function parseCurrency(val) {
    return typeof val === 'number' ? val : 0;
}

function formatFecha(timestampStr) {
    const d = new Date(timestampStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function normalizePuppeteerItem(item, catId) {
    const categoria = CAT_MAP[catId] || catId;
    const superNombre = SUPER_MAP[item.super] || (item.super === 'wong' ? 'Wong' : (item.super === 'metro' ? 'Metro' : item.super));

    return {
        fecha: formatFecha(item.timestamp),
        super: superNombre,
        item: item.nombre,
        categoria: categoria,
        marca: extractMarca(item.nombre),
        tipo: extractTipo(item.nombre, categoria),
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
    // 1. Cargar existentes
    for (const d of existingData) {
        const key = `${d.super}|${d.item}|${d.fecha}`.toLowerCase();
        mergedMap.set(key, d);
    }

    let addedCount = 0;
    let discardedCount = 0;

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.includes('master-data'));
    console.log(`[Merge] Procesando ${files.length} archivos JSON en ${DATA_DIR}...`);

    for (const file of files) {
        const filepath = path.join(DATA_DIR, file);
        let products;
        try {
            products = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
            console.warn(`[Merge] Error leyendo ${file}: ${e.message}`);
            continue;
        }

        if (!Array.isArray(products) || products.length === 0) continue;

        // "wong-arroz.json" -> catId "arroz"
        const parts = file.replace('.json', '').split('-');
        const catId = parts.slice(1).join('-');

        // Filtro estricto usando isRelevant
        const validProducts = products.filter(p => utils.isRelevant(p.nombre || '', catId));

        for (const raw of validProducts) {
            const norm = normalizePuppeteerItem(raw, catId);
            const key = `${norm.super}|${norm.item}|${norm.fecha}`.toLowerCase();
            if (mergedMap.has(key)) {
                discardedCount++;
            } else {
                mergedMap.set(key, norm);
                addedCount++;
            }
        }
        console.log(`[Merge] ${file}: +${validProducts.length} procesados (${products.length - validProducts.length} filtrados)`);
    }

    const finalDataset = Array.from(mergedMap.values());
    console.log(`[Merge] Terminó. Dataset final: ${finalDataset.length}`);
    console.log(`[Reporte] Agregados: ${addedCount}`);
    console.log(`[Reporte] Descartados (duplicados): ${discardedCount}`);

    const header = `// PRECIO JUSTO — rawData\n// Base: Browse.AI + Puppeteer Scrapers\n// Generado: ${new Date().toISOString()}\n// Registros: ${finalDataset.length}\n`;
    const finalContent = `${header}const rawData = ${JSON.stringify(finalDataset, null, 2)};\n`;

    fs.writeFileSync(DATA_JS_PATH, finalContent, 'utf8');
    console.log(`✅ ¡Éxito! Dataset maestro actualizado en MVP/data.js`);

    // Reporte: productos por super y categoría
    const bySuper = {};
    const byCat = {};
    for (const p of finalDataset) {
        bySuper[p.super] = (bySuper[p.super] || 0) + 1;
        byCat[p.categoria] = (byCat[p.categoria] || 0) + 1;
    }
    console.log('\n--- REPORTE POR SUPERMERCADO ---');
    console.table(bySuper);
    console.log('\n--- REPORTE POR CATEGORÍA ---');
    console.table(byCat);
}

main();
