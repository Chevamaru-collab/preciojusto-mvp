/**

 * build_comparison_dataset.js

 *

 * Reads rawData from data.js, normalizes and groups products by

 * (categoria + tipo + presentacion + unit), and outputs comparison_data.json.

 *

 * Grouping key: normalized_categoria | normalized_tipo | presentacion | normalized_um

 *

 * Exclusion rules:

 *  - tipo === "Combo/Pack" → excluded (packs not comparable to singles)

 *  - precioOnline missing, null, 0, or negative → excluded

 *  - presentacion missing or NaN → excluded

 *  - Groups with only 1 store → excluded (no comparison possible)

 *

 * Same-store duplicates: keeps the cheapest precioOnline.

 */



const fs = require('fs');

const path = require('path');

// --- FILTER INVALID TYPES ---
const INVALID_TYPES = [
    'regular',
    'variado',
    'variados',
    'surtido',
    'combo',
    'mix',
    'otros'
];

function isValidType(tipo) {
    if (!tipo) return false;
    const t = tipo.toLowerCase();
    return !INVALID_TYPES.some(invalid => t.includes(invalid));
}

// ─── Unit normalization map ────────────────────────────────────────

const UNIT_MAP = {

    'ml': 'ml',

    'lt': 'lt',

    'l': 'lt',

    'g': 'g',

    'kg': 'kg',

    'u': 'u',

};



/**

 * Normalize a unit string to a canonical lowercase form.

 * Unknown units are returned as-is in lowercase.

 */

function normalizeUnit(um) {

    if (!um || typeof um !== 'string') return '';

    const lower = um.trim().toLowerCase();

    return UNIT_MAP[lower] || lower;

}

function normalizePresentation(presentacion, unit) {
    if (!presentacion || !unit) return { value: presentacion, unit };

    const u = unit.toLowerCase();

    if (u === 'ml') {
        return { value: presentacion / 1000, unit: 'lt' };
    }

    if (u === 'g') {
        return { value: presentacion / 1000, unit: 'kg' };
    }

    if (u === 'lt' || u === 'kg' || u === 'u') {
        return { value: presentacion, unit: u };
    }

    return { value: presentacion, unit: u };
}

/**

 * Normalize a category string:

 *  - lowercase

 *  - trim

 *  - strip accents (NFD + remove combining marks)

 *  - replace hyphens with spaces

 *  - collapse multiple spaces

 */

function normalizeCategory(cat) {

    if (!cat || typeof cat !== 'string') return '';

    return cat

        .trim()

        .toLowerCase()

        .normalize('NFD')

        .replace(/[\u0300-\u036f]/g, '')  // strip accents

        .replace(/-/g, ' ')               // hyphens → spaces

        .replace(/\s+/g, ' ')             // collapse whitespace

        .trim();

}



/**

 * Normalize tipo string: lowercase, trim. Returns '' for falsy.

 */

function normalizeTipo(tipo) {

    if (!tipo || typeof tipo !== 'string') return '';

    return tipo.trim().toLowerCase();

}



/**

 * Parse presentacion to a numeric value. Returns NaN for invalid.

 */

function parsePresentacion(val) {

    if (val === null || val === undefined) return NaN;

    const num = Number(val);

    return num;

}



/**

 * Title-case a normalized category for display.

 * e.g. "azucar blanca" → "Azucar Blanca"

 */

function titleCase(str) {

    if (!str) return '';

    return str

        .split(' ')

        .map(w => w.charAt(0).toUpperCase() + w.slice(1))

        .join(' ');

}



/**

 * Build a human-readable product name from group components.

 */

function buildProductName(category, tipo, presentacion, unit) {

    const catDisplay = titleCase(category);

    const tipoDisplay = titleCase(tipo);

    const parts = [catDisplay];

    // Suppress tipo if it's already part of the category name (e.g. "azucar blanca" already contains "blanca")

    if (tipoDisplay && !category.toLowerCase().includes(tipo.toLowerCase())) {

        parts.push(tipoDisplay);

    }

    parts.push(`${presentacion}${unit}`);

    return parts.join(' ');

}



/**

 * Check if a row has a valid price for comparison.

 */

function hasValidPrice(row) {

    const price = row.precioOnline;

    return typeof price === 'number' && isFinite(price) && price > 0;

}



/**

 * Check if a row has a valid presentacion for comparison.

 */

function hasValidPresentacion(row) {

    const p = parsePresentacion(row.presentacion);

    return !isNaN(p) && p > 0;

}



/**

 * Check if a row should be excluded (Combo/Pack).

 */

function isComboOrPack(row) {

    const tipo = (row.tipo || '').trim();

    return tipo === 'Combo/Pack';

}



/**

 * Core transformation: takes an array of raw product rows and returns

 * the grouped comparison dataset (before filtering by store count).

 *

 * Returns ALL groups (including single-store). The caller decides

 * whether to filter.

 */

function buildComparisonGroups(rawData, catalog = [], catalogLookup = new Map(), matcher = matcherEngine) {

    const groups = new Map();



    for (const row of rawData) {

        // --- Exclusion checks ---

        if (isComboOrPack(row)) continue;

        if (!hasValidPrice(row)) continue;

        if (!hasValidPresentacion(row)) continue;

        if (!isValidType(row.tipo)) continue;



        // --- Normalize fields ---

        const matched = getCanonicalMatch(row, catalog, catalogLookup, matcher);
        if (!matched) continue;

        const cat = matched.categoria || normalizeCategory(row.categoria);
        const tipo = matched.subcategoria || normalizeTipo(row.tipo);
        const pres = matched.presentation;
        const unit = matched.unit || '';
        const store = (row.super || row.supermercado || '').trim();
        const price = row.precioOnline;

        if (!cat || !store) continue;

        const key = matched.canonical_name;



        if (!groups.has(key)) {

            groups.set(key, {
                canonical_name: matched.canonical_name,
                comparison_group: matched.comparison_group || matched.family_name || matched.canonical_name,
                category: matched.categoria || cat,
                tipo: matched.subcategoria || tipo,
                presentacion: matched.presentation,
                unit: matched.unit || unit,
                price_unit: matched.price_unit || matched.normalized_unit || null,
                normalized_unit: matched.normalized_unit || null,
                storeMap: new Map(),
            });

        }



        const group = groups.get(key);

        const existing = group.storeMap.get(store);

        // Keep the cheapest price if same store appears multiple times

        if (existing === undefined || price < existing) {

            group.storeMap.set(store, price);

        }

    }



    return groups;

}



/**

 * Transform internal groups into the final output format.

 * Filters to groups with >= minStores stores.

 */

function formatOutput(groups, minStores = 2) {

    const results = [];



    for (const [, group] of groups) {

        if (group.storeMap.size < minStores) continue;



        const stores = [];

        for (const [store, price] of group.storeMap) {

            stores.push({ store, price });

        }

        stores.sort((a, b) => a.price - b.price);



        const bestPrice = stores[0].price;

        const bestStore = stores[0].store;



        results.push({
            canonical_name: group.canonical_name,

            product_name: group.canonical_name,

            comparison_group: group.comparison_group,

            category: group.category,

            presentation: group.presentacion,

            unit: group.unit,

            price_unit: group.price_unit,

            normalized_unit: group.normalized_unit,

            stores: stores,

            best_price: bestPrice,

            best_store: bestStore,

        });

    }



    // Sort by category, then product_name

    results.sort((a, b) => {

        const catCmp = a.category.localeCompare(b.category);

        if (catCmp !== 0) return catCmp;

        return a.product_name.localeCompare(b.product_name);

    });



    return results;

}



/**

 * Load rawData from data.js by evaluating it in a controlled way.

 */

function loadRawData(filePath) {

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);

}

const matcherEngine = require('../ontology/product_matcher_engine');


function flattenMasterData(masterData) {
    const rows = [];

    if (!masterData || !masterData.supermercados) return rows;

    for (const [superKey, categories] of Object.entries(masterData.supermercados)) {
        for (const [categoryKey, products] of Object.entries(categories || {})) {
            for (const product of products || []) {
                const precioOnline = product?.precios?.online ?? null;
                const precioRegular = product?.precios?.regular ?? null;
                const precioTarjeta = product?.precios?.tarjeta ?? null;
                const precioPorUnidad = product?.precios?.porUnidad ?? null;

                const presentacionValor = product?.presentacion?.valor ?? null;
                const presentacionUnidad = product?.presentacion?.unidad ?? null;
                const pack = product?.presentacion?.pack ?? 1;

                const categoria = product?.categoria || categoryKey || '';
                const nombre = product?.nombre || '';
                const superNombre = product?.super || superKey || '';

                rows.push({
                    fecha: product?.timestamp ? new Date(product.timestamp).toLocaleDateString('es-PE') : '',
                    super: normalizeSuperName(superNombre),
                    supermercado: normalizeSuperName(superNombre),
                    item: nombre,
                    categoria: normalizeCategoryLabel(categoria),
                    marca: inferBrand(nombre),
                    tipo: inferTipo(nombre, categoria),
                    clase: null,
                    precioOnline,
                    precioRegular: precioRegular ?? 0,
                    descuento: product?.descuento ?? null,
                    presentacion: presentacionValor,
                    vt: presentacionValor,
                    um: presentacionUnidad,
                    pxum: precioPorUnidad,
                    pack,
                    product_id: product?.id || '',
                    rubro: product?.rubro || '',
                    precio_x_presentacion: precioOnline,
                    precio_x_um: precioPorUnidad,
                    precio_online: precioOnline,
                    precio_regular: precioRegular,
                    precio_tarjeta: precioTarjeta,
                    descuento_publicado: product?.descuento ?? null
                });
            }
        }
    }

    return rows;
}

function normalizeSuperName(name) {
    const n = String(name || '').trim().toLowerCase();
    if (n === 'wong') return 'Wong';
    if (n === 'metro') return 'Metro';
    if (n === 'tottus') return 'Tottus';
    if (n === 'plazavea' || n === 'plaza vea') return 'Plaza Vea';
    return name;
}

function normalizeCategoryLabel(cat) {
    const c = String(cat || '').trim().toLowerCase();
    const map = {
        'aceite': 'Aceite',
        'arroz': 'Arroz',
        'azucar-blanca': 'Azúcar Blanca',
        'azucar-rubia': 'Azúcar Rubia',
        'condimentos': 'Condimentos',
        'fideos': 'Fideos',
        'frijol-canario': 'Frijol Canario',
        'frutas': 'Frutas',
        'harina': 'Harina',
        'huevos': 'Huevos',
        'leche': 'Leche',
        'leche-evaporada': 'Leche Evaporada',
        'leche-fresca': 'Leche Fresca',
        'lentejas': 'Lentejas',
        'mantequilla': 'Mantequilla',
        'menestras': 'Menestras',
        'pan-molde': 'Pan de Molde',
        'pan': 'Pan',
        'pollo': 'Pollo',
        'verduras': 'Verduras',
        'avena': 'Avena'
    };
    return map[c] || cat;
}

function inferBrand(name) {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    return parts[0] || '';
}

function inferTipo(name, categoria) {
    const n = String(name || '').toLowerCase();
    const c = String(categoria || '').toLowerCase();

    if (c.includes('aceite')) {
        if (n.includes('vegetal')) return 'Vegetal';
        if (n.includes('girasol')) return 'Girasol';
        if (n.includes('oliva')) return 'Oliva';
        if (n.includes('canola')) return 'Canola';
        if (n.includes('cártamo') || n.includes('cartamo')) return 'Cártamo';
    }

    if (c.includes('arroz')) {
        if (n.includes('extra')) return 'Extra';
        if (n.includes('superior')) return 'Superior';
        if (n.includes('integral')) return 'Integral';
        if (n.includes('añejo') || n.includes('anejo')) return 'Añejo';
    }

    if (c.includes('huevo')) {
        if (n.includes('codorniz')) return 'Codorniz';
        if (n.includes('rosado')) return 'Rosado';
        if (n.includes('pardo')) return 'Pardo';
    }

    if (c.includes('leche')) {
        if (n.includes('entera')) return 'Entera';
        if (n.includes('descremada')) return 'Descremada';
        if (n.includes('sin lactosa')) return 'Sin Lactosa';
    }

    if (c.includes('pollo')) {
        if (n.includes('pechuga')) return 'Pechuga';
        if (n.includes('pierna')) return 'Pierna';
        if (n.includes('entero')) return 'Entero';
    }

    return String(categoria || '').trim();
}

function buildCatalogLookup(catalog) {
    const map = new Map();
    for (const entry of catalog || []) {
        map.set(entry.canonical_name, entry);
    }
    return map;
}

function getCanonicalMatch(row, catalog, catalogLookup, matcher = matcherEngine) {
    const rawName = row.item || row.nombre || '';
    if (!rawName) return null;

    const result = matcher.match({ name: rawName }, catalog, 1);
    if (!result || !result.best_match) return null;

    return catalogLookup.get(result.best_match) || null;
}


// ─── Exports for testing ───────────────────────────────────────────

module.exports = {

    normalizeUnit,

    normalizeCategory,

    normalizeTipo,

    parsePresentacion,

    titleCase,

    buildProductName,

    hasValidPrice,

    hasValidPresentacion,

    isComboOrPack,

    buildComparisonGroups,

    formatOutput,

    loadRawData,

    flattenMasterData,

    normalizeSuperName,

    normalizeCategoryLabel,

    inferBrand,

    inferTipo,

    buildCatalogLookup,

    getCanonicalMatch,

};



// ─── CLI runner ────────────────────────────────────────────────────

if (require.main === module) {

    const dataPath = path.join(__dirname, '..', 'data', 'master-data.json');

    const outputPath = path.join(__dirname, '..', 'comparison_data.json');



    console.log('Loading rawData from master-data.json...');

    const masterData = loadRawData(dataPath);

    const rawData = flattenMasterData(masterData);

    console.log(`Loaded ${rawData.length} flattened records.`);



    console.log('Loading matcher catalog...');

    const catalog = matcherEngine.loadCatalog();

    const catalogLookup = buildCatalogLookup(catalog);

    console.log(`Loaded ${catalog.length} matcher catalog entries.`);

    console.log('Building comparison groups...');

    const groups = buildComparisonGroups(rawData, catalog, catalogLookup, matcherEngine);

    console.log(`Found ${groups.size} total groups.`);



    console.log('Formatting output (filtering to multi-store groups)...');

    const output = formatOutput(groups, 2);

    console.log(`Output: ${output.length} comparable product groups.`);



    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`Written to ${outputPath}`);



    // Summary stats

    const categories = [...new Set(output.map(g => g.category))];

    console.log(`\nCategories in output: ${categories.length}`);

    console.log(categories.sort().join(', '));



    const storeCountDist = {};

    output.forEach(g => {

        const n = g.stores.length;

        storeCountDist[n] = (storeCountDist[n] || 0) + 1;

    });

    console.log('\nStore count distribution:');

    Object.entries(storeCountDist).sort().forEach(([n, count]) => {

        console.log(`  ${n} stores: ${count} groups`);

    });

}
