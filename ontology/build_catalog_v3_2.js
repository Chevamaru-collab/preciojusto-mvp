const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'product_matcher_catalog_v3_1.json');
const overridesPath = path.join(__dirname, 'catalog_v3_2_overrides.json');
const outputPath = path.join(__dirname, 'product_matcher_catalog_v3_2.json');

const catalog = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

let result = [];

// Remove any generic "Avena"
// A generic "Avena" is defined as any catalog entry where comparison_group is exactly "Avena",
// or a category "Avena" that belongs to the old generic structure.
let removedCount = 0;
for (const item of catalog) {
    if (item.comparison_group === 'Avena') {
        removedCount++;
        continue; // drop generic Avena
    }

    // Recover monolithic Unknown items
    if (item.canonical_name === 'Unknown') {
        const family = item.family_name || '';
        if (family && family.trim() !== '' && family.trim() !== 'Unknown') {
            // Recoverable garbage: keep visible textual identity
            item.canonical_name = family.trim();
            item.categoria = family.trim();
            item.comparison_group = family.trim();
            item.needs_review = true;
        } else {
            // Hard-unknown
            item.needs_review = true; 
        }
    }

    result.push({ ...item });
}

// Map the new ones from overrides
for (const rule of overrides) {
    if (rule.action === 'replace_avena' || rule.action === 'add_menestras') {
        const newItem = {
            canonical_name: rule.canonical_name,
            family_name: rule.family_name || rule.canonical_name,
            rubro: rule.rubro || "Desayuno",
            categoria: rule.categoria || "Avena",
            subcategoria: rule.subcategoria || "",
            presentation: rule.action === 'add_menestras' ? rule.presentation : null,
            unit: rule.action === 'add_menestras' ? rule.unit : "",
            normalized_unit: rule.action === 'add_menestras' ? rule.normalized_unit : null,
            price_unit: rule.action === 'add_menestras' ? rule.price_unit : null,
            brand: null,
            comparison_group: rule.comparison_group,
            comparison_level: 1,
            is_generic_group: false,
            aliases: [...rule.patterns], // Seed the aliases with the isolated keywords
            needs_review: false
        };
        result.push(newItem);
    }
}

// Deduplication (defensive)
const dedupMap = new Map();
for (const item of result) {
    const key = [
        item.canonical_name || '',
        item.presentation === null || item.presentation === undefined ? '' : item.presentation,
        item.unit || '',
        item.comparison_group || ''
    ].join('||');

    if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
    } else {
        const existing = dedupMap.get(key);
        const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...(item.aliases || [])]));
        existing.aliases = mergedAliases;
        dedupMap.set(key, existing);
    }
}

const finalCatalog = Array.from(dedupMap.values());

fs.writeFileSync(outputPath, JSON.stringify(finalCatalog, null, 2), 'utf8');

console.log('V3.2 generado correctamente');
console.log('Input V3.1:', catalog.length);
console.log('Removed generic Avena:', removedCount);
console.log('Added specialized Avena:', overrides.length);
console.log('Output V3.2:', finalCatalog.length);
console.log('Archivo:', outputPath);
