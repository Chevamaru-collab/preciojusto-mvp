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

function buildComparisonGroups(rawData) {

    const groups = new Map();



    for (const row of rawData) {

        // --- Exclusion checks ---

        if (isComboOrPack(row)) continue;

        if (!hasValidPrice(row)) continue;

        if (!hasValidPresentacion(row)) continue;

        if (!isValidType(row.tipo)) continue;



        // --- Normalize fields ---

        const cat = normalizeCategory(row.categoria);

        const tipo = normalizeTipo(row.tipo);

        const rawPres = parsePresentacion(row.presentacion);
        const rawUnit = normalizeUnit(row.um);

        const { value: pres, unit: normalizedUnit } = normalizePresentation(rawPres, rawUnit);

        const unit = normalizedUnit;

        const store = (row.super || row.supermercado || '').trim();

        const price = row.precioOnline;



        if (!cat || !store) continue;



        // --- Build grouping key ---

        const key = `${cat}|${tipo}|${pres}|${unit}`;



        if (!groups.has(key)) {

            groups.set(key, {

                category: cat,

                tipo: tipo,

                presentacion: pres,

                unit: unit,

                storeMap: new Map(), // store → cheapest price

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

            product_name: buildProductName(group.category, group.tipo, group.presentacion, group.unit),

            category: titleCase(group.category),

            presentation: group.presentacion,

            unit: group.unit,

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

    // data.js declares: const rawData = [...]

    // We wrap it so we can capture the variable

    const wrappedCode = content + '\nmodule.exports = rawData;';

    const tmpPath = path.join(__dirname, '_tmp_data_loader.js');

    fs.writeFileSync(tmpPath, wrappedCode, 'utf8');

    try {

        // Clear require cache to ensure fresh load

        delete require.cache[require.resolve(tmpPath)];

        const data = require(tmpPath);

        return data;

    } finally {

        // Clean up temp file

        try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }

    }

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

};



// ─── CLI runner ────────────────────────────────────────────────────

if (require.main === module) {

    const dataPath = path.join(__dirname, '..', 'data.js');

    const outputPath = path.join(__dirname, '..', 'comparison_data.json');



    console.log('Loading rawData from data.js...');

    const rawData = loadRawData(dataPath);

    console.log(`Loaded ${rawData.length} records.`);



    console.log('Building comparison groups...');

    const groups = buildComparisonGroups(rawData);

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
