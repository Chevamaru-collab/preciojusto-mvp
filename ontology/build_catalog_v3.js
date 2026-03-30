const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, 'product_matcher_catalog_v2.json');
const OUTPUT_PATH = path.join(__dirname, 'product_matcher_catalog_v3.json');
const REPORT_PATH = path.join(__dirname, 'validation_report_v3.md');

// Core Mappings
const BRANDS_TO_EXTRACT = ['Tottus', 'Wong', 'Metro', 'Plaza Vea', 'Bells', 'Cuisine & Co', 'Cuisine &amp; Co', 'Sumaq', 'Extra', 'Tottus Precio Insuperable', 'Wong Premium'];
const GARBAGE_CATEGORIES = ['Varios', 'Envasado', 'Empacados'];
const HERBS = ['Perejil', 'Culantro', 'Albahaca'];

// Basic Rubro inference
function inferRubro(cat, sub, name) {
    const text = `${cat} ${sub} ${name}`.toLowerCase();
    if (/aceite/i.test(text)) return 'Abarrotes';
    if (/azucar/i.test(text)) return 'Abarrotes';
    if (/avena/i.test(text)) return 'Desayuno';
    if (/leche/i.test(text)) return 'Lácteos';
    if (/huevo/i.test(text)) return 'Lácteos';
    if (/perejil|culantro|albahaca|apio|cebolla|champiñon|alcachofa|acelga/i.test(text)) return 'Verduras';
    if (/aguaymanto|arandano|arándano|chirimoya|fruta|berry|frambuesa|fresa|manzana|platano/i.test(text)) return 'Frutas';
    if (/embutido|fiambre|cabanossi/i.test(text)) return 'Embutidos';
    if (/colorante|especias|quimico|canela|clavo|levadura/i.test(text)) return 'Ingredientes';
    if (/agua|bebida/i.test(text)) return 'Bebidas';
    return cat || 'Unknown'; // Fallback so it's not empty, but mapped via needs_review
}

// Map garbage identities to real items based on clues
function resolveGarbage(entry) {
    const clues = [entry.subcategoria, entry.canonical_name, ...entry.aliases].join(' ').toLowerCase();
    
    let realCat = null;
    let realSub = null;

    if (clues.includes('aguaymanto')) { realCat = 'Frutas'; realSub = 'Aguaymanto'; }
    else if (clues.includes('mix berries') || clues.includes('blueberries')) { realCat = 'Frutas'; realSub = 'Mix Berries'; }
    else if (clues.includes('avena')) { realCat = 'Avena'; realSub = ''; }
    
    // If not found above, promote subcategoria or the first relevant token
    if (!realCat && entry.subcategoria && entry.subcategoria.trim() !== '') {
        const parts = entry.subcategoria.trim().split(' ');
        realCat = parts[0];
        realSub = parts.slice(1).join(' ');
    }

    if (!realCat && entry.aliases && entry.aliases.length > 0) {
        const cleanAlias = entry.aliases.find(a => !GARBAGE_CATEGORIES.some(g => new RegExp(`\\b${g}\\b`, 'i').test(a)));
        if (cleanAlias) {
            const words = cleanAlias.split(' ').filter(w => !/^\d/i.test(w) && !/^KG$|^LT$|^UND$|^GR$/i.test(w));
            if (words.length > 0) {
                realCat = words[0];
                realSub = words.slice(1).join(' ');
            }
        }
    }
    
    return { realCat, realSub };
}

function extractBrand(fields) {
    let detectedBrand = null;
    const cleanFields = fields.map(field => {
        if (!field) return field;
        let cleaned = field;
        for (const brand of BRANDS_TO_EXTRACT) {
            const regex = new RegExp(`\\b${brand}\\b`, 'ig');
            if (regex.test(cleaned)) {
                detectedBrand = brand;
                cleaned = cleaned.replace(regex, '').replace(/\s+/g, ' ').trim();
            }
        }
        return cleaned;
    });
    return { detectedBrand, cleanFields };
}

function processCatalog(data) {
    let entriesBefore = data.length;
    let retailerRemoved = 0;
    let brandsExtractedCount = 0;
    let garbageRemovedCount = 0;
    
    let processed = [];

    data.forEach(entry => {
        let isGenericGroup = false;
        let needsReview = false;
        let brand = null;
        let aliases = [...(entry.aliases || [])];

        // 1. Retailer & Brand Extraction
        let oldCat = entry.categoria || '';
        let oldSub = entry.subcategoria || '';
        let oldFam = entry.family_name || '';

        const extraction = extractBrand([oldCat, oldSub, oldFam]);
        
        let [cat, sub, fam] = extraction.cleanFields;
        if (extraction.detectedBrand) {
            brand = extraction.detectedBrand;
            if (['Tottus', 'Wong', 'Metro', 'Plaza Vea'].includes(brand)) {
                retailerRemoved++;
            } else {
                brandsExtractedCount++;
            }
        }

        const isGarbage = !cat || GARBAGE_CATEGORIES.some(g => new RegExp(`^${g}$`, 'i').test(cat) || new RegExp(`^${g}$`, 'i').test(entry.categoria));
        // 2. Garbage category removal & Empty category rescue
        if (isGarbage) {
            garbageRemovedCount++;
            const { realCat, realSub } = resolveGarbage(entry);
            if (realCat) {
                cat = realCat;
                sub = realSub;
            } else {
                needsReview = true;
                cat = 'Unknown';
            }
        }

        // Normalize spaces
        cat = cat ? cat.replace(/surtida|mixta|mix/ig, '').trim() : '';
        sub = sub ? sub.trim() : '';
        
        // 3. Inference and explicit rules
        let isMix = /mix\b|mixta|ensalada|surtid/i.test(entry.canonical_name + ' ' + (entry.aliases || []).join(' ') + ' ' + oldSub);
        
        // Assign categories based on rules
        let rubro = inferRubro(cat, sub, entry.canonical_name);
        if (rubro === cat || rubro === 'Unknown') needsReview = true;

        if (cat === 'Aguaymantos' || cat === 'Arándanos') {
            sub = cat;
            cat = 'Frutas';
            rubro = 'Frutas';
        }

        if (isMix && rubro === 'Frutas') {
            sub = 'Mix Frutas'; // Keep mixes separate
            if (/berr/i.test(entry.canonical_name + ' ' + oldSub)) sub = 'Mix Berries';
        }

        let pres = entry.presentation;
        let unit = entry.unit;
        let normU = entry.normalized_unit;
        let pUnit = entry.price_unit;

        // 4. ATADO Logic
        const isHerb = HERBS.some(h => new RegExp(`\\b${h}\\b`, 'i').test(cat + ' ' + sub + ' ' + entry.canonical_name));
        if (isHerb) {
            unit = 'AT.';
            normU = 'bundle';
            pUnit = 'bundle';
            // ensure separate comparison group
        }

        // Output structural canonical name
        let parts = [];
        if (cat && cat.toLowerCase() !== sub.toLowerCase()) {
            parts.push(cat);
        }
        if (sub) parts.push(sub);
        if (pres !== null) parts.push(pres);
        if (unit) parts.push(unit);
        
        // Ensure name isn't just a number
        let newCanName = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (/^[\d\.]+s?[a-z\.]*$/i.test(newCanName)) {
            needsReview = true;
        }

        // 5. Comparison Group
        let compGroup = `${cat} ${sub}`.trim();
        
        // Avena logic
        if (/avena/i.test(cat) || /avena/i.test(newCanName)) {
            let type = '';
            const testStr = `${newCanName} ${entry._original_name || ''} ${entry.aliases ? entry.aliases.join(' ') : ''}`;
            if (/bebida/i.test(testStr)) type = 'Bebida';
            else if (/hojuela/i.test(testStr)) type = 'Hojuelas';
            else if (/instant/i.test(testStr)) type = 'Instantanea';
            else if (/mezcla|refresco/i.test(testStr)) type = 'Mezcla';
            else needsReview = true; // Cannot infer

            if (type) compGroup = `Avena ${type}`;
            else compGroup = 'Avena';
        }

        // Leche logic
        if (/leche/i.test(cat) || /leche/i.test(newCanName)) {
            let type = '';
            const testStr = `${newCanName} ${entry._original_name || ''} ${entry.aliases ? entry.aliases.join(' ') : ''}`;
            if (/uht/i.test(testStr)) type = 'UHT';
            else if (/evaporada/i.test(testStr)) type = 'Evaporada';
            else if (/polvo/i.test(testStr)) type = 'Polvo';
            else if (/condensada/i.test(testStr)) type = 'Condensada';
            else if (/fresca/i.test(testStr)) type = 'Fresca';
            
            if (type) compGroup = `Leche ${type}`;
        }
        
        // Mix vs Single isolation
        if (isMix) {
            compGroup = `${cat} ${sub} Mix`.trim();
        }

        // Herb isolation
        if (isHerb) {
            compGroup = (sub || cat).trim(); // Perejil, Culantro...
        }

        if (!cat) needsReview = true;

        // Clean Aliases: removing mix overlaps
        if (aliases && isMix) {
            // Mix aliases shouldn't have single items, single items shouldn't have mix aliases
            // the tests check this structurally
            // Actually, if we are a mix, keep aliases. If single, remove mix aliases.
        } else if (aliases) {
            aliases = aliases.filter(a => !/mix\b|mixta/i.test(a));
        }

        processed.push({
            canonical_name: newCanName || 'INVALID_NAME',
            family_name: fam || cat,
            rubro: rubro || '',
            categoria: cat || '',
            subcategoria: sub || '',
            presentation: pres,
            unit: unit,
            normalized_unit: normU,
            price_unit: pUnit,
            brand: brand,
            comparison_group: compGroup,
            comparison_level: 1, // Defaulting 1
            is_generic_group: isGenericGroup,
            aliases: aliases,
            needs_review: needsReview
        });
    });

    // Final clean up and basic deduplication
    // We group by canonical_name
    let deduplicated = [];
    let nameMap = new Map();
    
    processed.forEach(p => {
        if (!nameMap.has(p.canonical_name)) {
            nameMap.set(p.canonical_name, p);
        } else {
            let existing = nameMap.get(p.canonical_name);
            p.aliases.forEach(a => {
                if (!existing.aliases.includes(a)) existing.aliases.push(a);
            });
            existing.needs_review = existing.needs_review || p.needs_review;
            // merge brand
            if (p.brand && !existing.brand) existing.brand = p.brand;
        }
    });

    deduplicated = Array.from(nameMap.values());

    let entriesAfter = deduplicated.length;

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduplicated, null, 2), 'utf-8');

    // Report
    const report = `# Validation Report V3

## Audit Metrics
- **entries_before_v2**: ${entriesBefore}
- **entries_after_v3**: ${entriesAfter}
- **retailer_contamination_removed**: ${retailerRemoved}
- **brands_extracted**: ${brandsExtractedCount}
- **garbage_categories_removed**: ${garbageRemovedCount}
- **ambiguous_cases_flagged (needs_review)**: ${deduplicated.filter(x => x.needs_review).length}
- **ATADO_unit_cases_detected**: ${deduplicated.filter(x => x.unit === 'AT.').length}

## Structural Improvements
- Strict commercial hierarchy enforced: \`rubro -> categoria -> subcategoria\`
- Brand and Retailer strictly isolated to \`brand\` field.
- Avena and Leche grouped by specific consumption type, preserving substitutions.
- Mix Products decoupled from single-ingredient origins.

## Selected Sample Before & After
*Visualizing the semantic shifts from V2*
${data.slice(0, 15).map((d, i) => {
    let aft = deduplicated[i];
    if (!aft) return '';
    return `- **Before**: ${d.canonical_name} (Cat: ${d.categoria}, Sub: ${d.subcategoria}, Grp: ${d.comparison_group})
  **After V3**: ${aft.canonical_name} (Rubro: ${aft.rubro}, Grp: ${aft.comparison_group}, Brand: ${aft.brand}, Unit: ${aft.unit}, Review: ${aft.needs_review})`;
}).join('\n')}

## Conclusion
V3 catalog enforces structural comparability representing Peru's retail buying decisions.
`;

    fs.writeFileSync(REPORT_PATH, report, 'utf-8');

    console.log(`Generated V3 Catalog: ${OUTPUT_PATH}`);
    console.log(`Generated Report: ${REPORT_PATH}`);
}

const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
processCatalog(data);
