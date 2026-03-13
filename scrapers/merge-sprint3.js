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
    if (tokens[0] && /^[A-ZÁÉÍÓÚ]/.test(tokens[0]) && tokens[0].length > 2 && tokens[0] !== 'Dato') {
        return tokens[0];
    }
    return 'Genérico';
}

function extractTipo(nombre, categoria) {
    const nb = nombre.toLowerCase();
    
    if (categoria === 'Arroz' || categoria === 'arroz') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('gran reserva')) return 'Gran Reserva';
        if (nb.includes('japónico') || nb.includes('japonico') || nb.includes('jap??nico')) return 'Japónico';
        
        const tieneAnejo = nb.includes('añejo') || nb.includes('anejo') || nb.includes('a??ejo');
        const tieneSuperior = nb.includes('superior');
        const tieneExtra = nb.includes('extra');

        if (tieneAnejo && tieneSuperior) return 'Superior Añejo';
        if (tieneAnejo && tieneExtra) return 'Añejo Extra';
        if (tieneAnejo) return 'Añejo';
        if (tieneSuperior) return 'Superior';
        if (tieneExtra) return 'Extra';
        
        return 'Extra'; // Fallback Arroz
    }
    if (categoria === 'Aceite' || categoria === 'aceite') {
        if (nb.includes('oliva')) return 'De Oliva';
        if (nb.includes('girasol')) return 'De Girasol';
        if (nb.includes('cártamo') || nb.includes('cartamo') || nb.includes('c??rtamo')) return 'De Cártamo';
        if (nb.includes('soja') || nb.includes('soya')) return 'De Soya';
        if (nb.includes('mezcla')) return 'Mezcla';
        return 'Vegetal';
    }
    if (categoria === 'Fideos' || categoria === 'fideos') {
        if (nb.includes('spaghetti') || nb.includes('espagueti')) return 'Spaghetti';
        if (nb.includes('tallarí') || nb.includes('tallari')) return 'Tallarín';
        if (nb.includes('cabello')) return 'Cabello de Ángel';
        if (nb.includes('canuto')) return 'Canuto';
        if (nb.includes('codito')) return 'Codito';
        if (nb.includes('tornillo')) return 'Tornillo';
        if (nb.includes('corbata')) return 'Corbata';
        if (nb.includes('macarró') || nb.includes('macarro')) return 'Macarrón';
        if (nb.includes('integral')) return 'Integral';
        return 'Pasta Larga'; // Fallback
    }
    if (categoria === 'Carne' || categoria === 'carne') {
        if (nb.includes('molida')) return 'Molida';
        if (nb.includes('bisteck') || nb.includes('bistec')) return 'Bisteck';
        if (nb.includes('guiso')) return 'Guiso';
        if (nb.includes('churrasco')) return 'Churrasco';
        if (nb.includes('lomo')) return 'Lomo';
        if (nb.includes('asado')) return 'Asado';
        if (nb.includes('sancochado')) return 'Sancochado';
        return 'Cortes Variados';
    }
    if (categoria === 'Pollo' || categoria === 'pollo') {
        if (nb.includes('entero')) return 'Entero';
        if (nb.includes('pechuga')) return 'Pechuga';
        if (nb.includes('pierna')) return 'Pierna';
        if (nb.includes('encuentro')) return 'Encuentro';
        if (nb.includes('filete')) return 'Filete';
        if (nb.includes('milanesa')) return 'Milanesa';
        return 'Cortes Variados';
    }
    if (categoria === 'Pan de Molde' || categoria === 'pan-molde') {
        if (nb.includes('blanco')) return 'Blanco';
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('sin borde')) return 'Sin Borde';
        if (nb.includes('semillas') || nb.includes('linaza') || nb.includes('multicereal')) return 'Multicereal';
        return 'Blanco';
    }
    if (categoria === 'Leche Fresca' || categoria === 'leche-fresca' || categoria === 'Leche' || categoria === 'leche-evaporada') {
        if (nb.includes('deslactosada')) return 'Deslactosada';
        if (nb.includes('light')) return 'Light';
        if (nb.includes('entera')) return 'Entera';
        if (nb.includes('evaporada')) return 'Evaporada';
        if (nb.includes('fresca') || nb.includes('uht')) return 'Fresca';
        if (nb.includes('mezcla') || nb.includes('láctea') || nb.includes('lactea')) return 'Mezcla Láctea';
        return 'Entera';
    }
    if (categoria === 'Huevos' || categoria === 'huevos') {
        if (nb.includes('codorniz')) return 'Codorniz';
        if (nb.includes('rosado') || nb.includes('pardo')) return 'Rosado';
        if (nb.includes('blanco')) return 'Blanco';
        return 'Rosado'; // Majoritarily Rosado in Peru
    }
    if (categoria === 'Azúcar Blanca' || categoria === 'azucar-blanca') return 'Blanca';
    if (categoria === 'Azúcar Rubia' || categoria === 'azucar-rubia') return 'Rubia';
    if (categoria === 'Avena' || categoria === 'avena') {
        if (nb.includes('entera') || nb.includes('tradicional')) return 'Tradicional';
        if (nb.includes('instantánea') || nb.includes('instantanea') || nb.includes('precocida')) return 'Instantánea';
        if (nb.includes('maca')) return 'Con Maca';
        if (nb.includes('kiwicha') || nb.includes('quinua')) return 'Multicereal';
        return 'Clásica';
    }
    if (categoria === 'Mantequilla' || categoria === 'mantequilla') {
        if (nb.includes('con sal')) return 'Con Sal';
        if (nb.includes('sin sal')) return 'Sin Sal';
        return 'Regular';
    }
    if (categoria === 'Lentejas' || categoria === 'lentejas') {
        if (nb.includes('bebé') || nb.includes('bebe')) return 'Bebé';
        if (nb.includes('pardina')) return 'Pardina';
        return 'Regular';
    }
    if (categoria === 'Frijol Canario' || categoria === 'frijol-canario') {
         if (nb.includes('castilla')) return 'Castilla'; // shouldn't happen due to exclusions but just in case
         return 'Canario';
    }
    if (categoria === 'Harina' || categoria === 'harina') {
        if (nb.includes('preparada')) return 'Preparada';
        if (nb.includes('sin preparar')) return 'Sin Preparar';
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('maíz') || nb.includes('maiz')) return 'De Maíz';
        return 'Sin Preparar';
    }

    // Default Fallback
    const words = ['filetes', 'congelada', 'fresca'];
    for (const w of words) {
        if (nb.includes(w)) return w.charAt(0).toUpperCase() + w.slice(1);
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

function generateStableId(superNombre, itemNombre) {
    const clean = itemNombre.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
    const sId = superNombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sId}_${clean}`;
}

function normalizePuppeteerItem(item, catId) {
    const categoria = CAT_MAP[catId] || catId;
    const superNombre = SUPER_MAP[item.super] || (item.super === 'wong' ? 'Wong' : (item.super === 'metro' ? 'Metro' : item.super));

    let rubro = "Abarrotes";
    if (['Pollo', 'Carne', 'Pescado'].includes(categoria)) rubro = "Carnes";
    if (['Verduras', 'Frutas'].includes(categoria)) rubro = "Frescos";
    if (['Leche Evaporada', 'Leche Fresca', 'Mantequilla', 'Huevos'].includes(categoria)) rubro = "Lácteos y Huevos";
    if (['Pan de Molde'].includes(categoria)) rubro = "Panadería";

    return {
        // --- SPRINT 4 NEW SCHEMA ---
        product_id: generateStableId(superNombre, item.nombre),
        supermercado: superNombre,
        rubro: rubro,
        categoria: categoria,
        tipo: extractTipo(item.nombre, categoria),
        presentacion: item.presentacion?.valor || 1,
        precio_x_presentacion: parseCurrency(item.precios?.online),
        precio_x_um: parseCurrency(item.precios?.porUnidad),
        um: item.presentacion?.unidad || 'u',
        precio_online: parseCurrency(item.precios?.online),
        precio_regular: parseCurrency(item.precios?.regular) || 0,
        precio_tarjeta: parseCurrency(item.precios?.tarjeta) || null,
        descuento_publicado: (item.descuento && item.descuento > 0) ? -item.descuento : null,

        // --- LEGACY SCHEMA (kept for backwards compatibility) ---
        fecha: formatFecha(item.timestamp),
        super: superNombre,
        item: item.nombre,
        marca: extractMarca(item.nombre),
        clase: null,
        precioOnline: parseCurrency(item.precios?.online),
        precioRegular: parseCurrency(item.precios?.regular) || 0,
        descuento: (item.descuento && item.descuento > 0) ? -item.descuento : null,
        vt: item.presentacion?.valor || 1,
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
        // Backfill new schema fields if missing
        if (!d.product_id) d.product_id = generateStableId(d.super, d.item);
        if (!d.supermercado) d.supermercado = d.super;
        if (!d.rubro) {
            let r = "Abarrotes";
            if (['Pollo', 'Carne', 'Pescado', 'carne', 'pollo', 'pescado'].includes(d.categoria)) r = "Carnes";
            if (['Verduras', 'Frutas', 'verduras', 'frutas'].includes(d.categoria)) r = "Frescos";
            if (['Leche Evaporada', 'Leche Fresca', 'Mantequilla', 'Huevos', 'leche', 'huevos', 'mantequilla'].includes(d.categoria)) r = "Lácteos y Huevos";
            if (['Pan de Molde', 'pan'].includes(d.categoria)) r = "Panadería";
            d.rubro = r;
        }
        if (!d.tipo) d.tipo = extractTipo(d.item, d.categoria);
        if (d.presentacion === undefined) d.presentacion = d.vt || 1;
        if (d.precio_x_presentacion === undefined) d.precio_x_presentacion = d.precioOnline;
        if (d.precio_x_um === undefined) d.precio_x_um = d.pxum;
        if (!d.um) d.um = d.um || 'u';
        if (d.precio_online === undefined) d.precio_online = d.precioOnline;
        if (d.precio_regular === undefined) d.precio_regular = d.precioRegular || 0;
        if (d.precio_tarjeta === undefined) d.precio_tarjeta = null;
        if (d.descuento_publicado === undefined) d.descuento_publicado = d.descuento || null;

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
