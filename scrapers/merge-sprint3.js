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
        'Inverni', 'Miyabi-Mai', 'Bárcidda', 'Kellogg\'s', 'Ricocan', 'Pedigree', 'Campomar', 'Florida',
        'Compass', 'Wesson', 'Spread', 'Pam', 'Olivos del Sur', 'Sao', 'Bimbo', 'Pyc', 'Unión', 'Bodega',
        'Cocinero', 'Deleite', 'Oléico', 'Oleico', '3 Ositos', 'Grano de Oro', 'Santa Catalina', 'La Purita', 'La Florencia'
    ];
    const nb = nombre.toLowerCase();
    for (const m of marcas) {
        if (nb.includes(m.toLowerCase())) return m;
    }
    
    const blacklistedGenericFirstWords = [
        'pack', 'twopack', 'sixpack', 'tripack', 'precio', 'promo', 'dato',
        'bolsa', 'caja', 'el', 'la', 'los', 'las', 'un', 'una', 'con', 'sin', 'surtido',
        'oferta', 'super', 'mega', 'mini', 'maxi', 'extra',
        'arroz', 'avena', 'aceite', 'fideos', 'azúcar', 'azucar', 'pan', 'leche', 'filete'
    ];

    const tokens = nombre.split(' ');
    if (tokens[0] && /^[A-ZÁÉÍÓÚ]/.test(tokens[0]) && tokens[0].length > 2) {
        const potentialBrand = tokens[0].toLowerCase();
        if (!blacklistedGenericFirstWords.includes(potentialBrand)) {
            return tokens[0];
        }
    }
    return 'Genérico';
}

function extractTipo(nombre, categoria) {
    const nb = nombre.toLowerCase();

    // 1. GLOBAL COMBO INTERCEPTION FOR ALL 15 CATEGORIES (STRICT WORD BOUNDARY)
    if (/\bpack\b/.test(nb) || nb.includes(' + ') || nb.includes(' gratis ') || nb.includes('tripack') || nb.includes('sixpack') || nb.includes('twopack') || nb.includes(' combo ')) {
        return 'Combo/Pack';
    }
    
    // 2. SPECIFIC CATEGORY TYPING
    if (categoria === 'Arroz' || categoria === 'arroz') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('gran reserva')) {
            if (nb.includes('extra') && nb.includes('añejo')) return 'Extra Añejo Gran Reserva';
            if (nb.includes('extra')) return 'Extra Gran Reserva';
            return 'Gran Reserva';
        }
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
        if (nb.includes('canola')) return 'De Canola';
        if (nb.includes('maíz') || nb.includes('maiz')) return 'De Maíz';
        if (nb.includes('ajonjolí') || nb.includes('ajonjoli') || nb.includes('sésamo') || nb.includes('sesamo')) return 'De Ajonjolí';
        if (nb.includes('coco')) return 'De Coco';
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
    if (categoria === 'Pan de Molde' || categoria === 'pan-molde' || categoria === 'Pan' || categoria === 'pan') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('blanco')) return 'Blanco';
        if (nb.includes('multigranos')) return 'Multigranos';
        if (nb.includes('avena') && (nb.includes('semilla') || nb.includes('multisemilla'))) return 'Multisemilla y Avena';
        if (nb.includes('avena')) return 'Con Avena';
        if (nb.includes('semillas') || nb.includes('multisemilla') || nb.includes('linaza')) return 'Multisemilla';
        if (nb.includes('pita')) return 'Pita';
        if (nb.includes('hamburguesa') || nb.includes('hot dog') || nb.includes('pancho')) return 'Hamburguesa/Hot Dog';
        if (nb.includes('ciabatta') || nb.includes('francés') || nb.includes('frances') || nb.includes('baguette')) return 'Ciabatta/Francés';
        if (nb.includes('sin borde')) return 'Sin Borde';
        return 'Regular';
    }
    if (categoria === 'Leche Fresca' || categoria === 'leche-fresca' || categoria === 'Leche' || categoria === 'leche-evaporada') {
        if (nb.includes('activavena')) return 'UHT Activavena';
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
        if (nb.includes('sin gluten')) return 'Sin Gluten';
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
    if (categoria === 'Lentejas' || categoria === 'lentejas' || categoria === 'Frijol Canario' || categoria === 'frijol-canario' || categoria === 'Menestras' || categoria === 'menestras') {
        if (nb.includes('lenteja') || nb.includes('lentejón') || nb.includes('lentejon')) return 'Lentejas';
        if (nb.includes('garbanzo')) return 'Garbanzos';
        if (nb.includes('frijol') || nb.includes('frejol') || nb.includes('canario') || nb.includes('castilla') || nb.includes('panamito') || nb.includes('palo') || nb.includes('negro')) return 'Frijoles';
        if (nb.includes('pallar')) return 'Pallares';
        if (nb.includes('arveja') || nb.includes('alverja')) return 'Arvejas';
        if (nb.includes('trigo')) return 'Trigo';
        if (nb.includes('soya')) return 'Soya';
        if (nb.includes('quinua')) return 'Quinua';
        if (nb.includes('maíz') || nb.includes('maiz') || nb.includes('mote') || nb.includes('cancha')) return 'Maíz';
        return 'Menestras Variadas';
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
    const itemNameLower = item.nombre.toLowerCase();

    // NATIVE LEAKAGE RESOLUTION BEFORE ANY PROCESSING
    let finalCatId = catId;
    if (itemNameLower.includes('vinagre') && ['arroz', 'Arroz'].includes(catId)) {
        finalCatId = 'Condimentos';
    } else if (itemNameLower.includes('pan de molde')) {
        finalCatId = 'pan-molde';
    } else if (itemNameLower.includes('cereal') || itemNameLower.includes('chocapic') || itemNameLower.includes('zucaritas')) {
        finalCatId = 'Cereales_Oculto'; 
    } else if (itemNameLower.includes('lunch') || itemNameLower.includes('comida preparada')) {
        finalCatId = 'Comida_Preparada_Oculta';
    } else if (itemNameLower.includes('leche activavena')) {
        finalCatId = 'leche-fresca';
    }

    const categoria = CAT_MAP[finalCatId] || finalCatId;
    const superNombre = SUPER_MAP[item.super] || (item.super === 'wong' ? 'Wong' : (item.super === 'metro' ? 'Metro' : item.super));

    let rubro = "Abarrotes";
    if (['Pollo', 'Carne', 'Pescado'].includes(categoria)) rubro = "Carnes";
    if (['Verduras', 'Frutas'].includes(categoria)) rubro = "Frescos";
    if (['Leche Evaporada', 'Leche Fresca', 'Mantequilla', 'Huevos'].includes(categoria)) rubro = "Lácteos y Huevos";
    if (['Pan de Molde'].includes(categoria)) rubro = "Panadería";

    // GLOBAL VOLUME MULTIPLIER & FALLBACK CORRECTIONS
    let parsedVt = item.presentacion?.valor || 1;
    let parsedPxum = parseCurrency(item.precios?.porUnidad);
    let umFinal = item.presentacion?.unidad || 'u';
    
    // Look for string patterns like "x 2un", "Paquete 6un", "Bandeja 12un" 
    const packMatch = itemNameLower.match(/(?:x|paquete|bandeja|bolsa|caja)[\s]*(\d+)[\s]*(?:un|und|unid|unidades)\b/);
    if (packMatch && packMatch[1]) {
        const multiplier = parseInt(packMatch[1], 10);
        if (multiplier > 1 && multiplier < 50) { // Safety bound
            parsedVt = parsedVt * multiplier;
            // Unitary price drops by the multiplier since there's more volume for the same shelf price
            if (parsedPxum > 0) {
                parsedPxum = parsedPxum / multiplier;
            }
        }
    }
    
    // Fallback for Scraper Failure to detect 'kg' boundaries (e.g., 'Arroz Gran Reserva 5kg' mapped to '1 u')
    if (umFinal === 'u' && ['Arroz', 'Avena', 'Fideos', 'Azúcar Blanca', 'Azúcar Rubia', 'Leche Fresca', 'Leche', 'Aceite'].includes(categoria)) {
        const fallbackMatch = itemNameLower.match(/(?:\b|x|bolsa|pack)[\s]*(\d+(?:\.\d+)?)[\s]*(kg|g|gr|l|lt|ml)\b/);
        if (fallbackMatch && fallbackMatch[1]) {
            const val = parseFloat(fallbackMatch[1]);
            const weightType = fallbackMatch[2];
            
            if (['g', 'gr', 'ml'].includes(weightType)) {
                parsedVt = val / 1000;
            } else {
                parsedVt = val;
            }
            umFinal = ['l', 'lt', 'ml'].includes(weightType) ? 'lt' : 'kg';
            
            if (item.precios?.online && parsedVt > 0) {
                parsedPxum = parseCurrency(item.precios.online) / parsedVt;
            }
        }
    }

    return {
        // --- SPRINT 4 NEW SCHEMA ---
        product_id: generateStableId(superNombre, item.nombre),
        supermercado: superNombre,
        rubro: rubro,
        categoria: categoria,
        tipo: extractTipo(item.nombre, categoria),
        presentacion: item.presentacion?.valor || 1, // original scanned string value
        volumen_total: parsedVt, // new computed total volume
        precio_x_presentacion: parseCurrency(item.precios?.online),
        precio_x_um: parsedPxum,
        um: umFinal,
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

if (require.main === module) {
    main();
} else {
    module.exports = {
        extractMarca,
        extractTipo,
        normalizePuppeteerItem
    };
}
