const fs = require('fs');
const path = require('path');

const v3Path = path.join(__dirname, 'product_matcher_catalog_v3.json');
const overridesPath = path.join(__dirname, 'catalog_v3_1_overrides.json');
const outputPath = path.join(__dirname, 'product_matcher_catalog_v3_1.json');
const reportPath = path.join(__dirname, 'validation_report_v3_1.md');

const v3 = JSON.parse(fs.readFileSync(v3Path, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

function textIncludes(text, match) {
    if (!text || !match) return false;
    return String(text).toLowerCase().includes(String(match).toLowerCase());
}

function matchesRule(item, rule) {
    if (textIncludes(item.canonical_name, rule.match)) return true;
    if (textIncludes(item.family_name, rule.match)) return true;

    if (Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
            if (textIncludes(alias, rule.match)) return true;
        }
    }

    return false;
}

function hasMixSignal(text) {
    const t = String(text || '').toLowerCase();
    return (
        t.includes('mix') ||
        t.includes('berries') ||
        t.includes('+') ||
        t.includes('mixt') ||
        t.includes('ensalada')
    );
}

function itemHasMixSignal(item) {
    if (hasMixSignal(item.canonical_name)) return true;
    if (hasMixSignal(item.family_name)) return true;

    if (Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
            if (hasMixSignal(alias)) return true;
        }
    }

    return false;
}

function cleanMixAliases(aliases) {
    if (!Array.isArray(aliases)) return [];
    return aliases.filter(function (a) {
        const t = String(a || '').toLowerCase();
        return !t.includes('mix') && !t.includes('+') && !t.includes('berries');
    });
}

function buildSingleCanonical(updated) {
    const pres =
        updated.presentation === null || updated.presentation === undefined
            ? ''
            : ' ' + updated.presentation;

    const unit = updated.unit ? ' ' + updated.unit : '';
    const sub = updated.subcategoria ? ' ' + updated.subcategoria : '';

    return (updated.categoria + sub + pres + unit).trim();
}

function applyOverride(item, rule) {
    const updated = { ...item };

    if (rule.action === 'force_mix') {
        updated.canonical_name = rule.canonical_name;
        updated.family_name = rule.subcategoria;
        updated.rubro = rule.rubro;
        updated.categoria = rule.categoria;
        updated.subcategoria = rule.subcategoria;
        updated.comparison_group = rule.comparison_group;
        updated.aliases = Array.isArray(updated.aliases) ? updated.aliases : [];
        updated.needs_review = false;
        return updated;
    }

    if (rule.action === 'force_single') {
        updated.rubro = rule.rubro;
        updated.categoria = rule.categoria;
        updated.subcategoria = rule.subcategoria;
        updated.comparison_group = rule.comparison_group;
        updated.aliases = cleanMixAliases(updated.aliases);
        updated.canonical_name = buildSingleCanonical(updated);
        updated.family_name = updated.subcategoria || updated.categoria;
        return updated;
    }

    return updated;
}

let result = [];
let overridesApplied = 0;
let autoMixNormalized = 0;

for (const item of v3) {
    let updated = { ...item };
    let matchedMixRule = false;
    let wasForcedMix = false;

    // Primero: prioridad absoluta a reglas de MIX
    for (const rule of overrides) {
        if (matchesRule(updated, rule)) {
            if (rule.action === 'force_mix') {
                updated = applyOverride(updated, rule);
                overridesApplied++;
                matchedMixRule = true;
                wasForcedMix = true;
                break;
            }
        }
    }

    // Luego: solo si no hubo force_mix, aplicar otras reglas
    if (!matchedMixRule) {
        for (const rule of overrides) {
            if (matchesRule(updated, rule)) {
                updated = applyOverride(updated, rule);
                overridesApplied++;
            }
        }
    }

    // Regla automática defensiva:
    // si sigue teniendo señal de mix pero no quedó como mix explícito,
    // lo marcamos para revisión.
    if (!wasForcedMix && itemHasMixSignal(updated)) {
        const isDeclaredMix =
            textIncludes(updated.subcategoria, 'mix') ||
            textIncludes(updated.comparison_group, 'mix') ||
            textIncludes(updated.canonical_name, 'mix');

        if (!isDeclaredMix) {
            updated.needs_review = true;
            autoMixNormalized++;
        }
    }

    result.push(updated);
}

// Deduplicación simple por canonical + presentation + unit
const dedupMap = new Map();

for (const item of result) {
    const key = [
        item.canonical_name || '',
        item.presentation === null || item.presentation === undefined ? '' : item.presentation,
        item.unit || ''
    ].join('||');

    if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
    } else {
        const existing = dedupMap.get(key);

        const mergedAliases = Array.from(
            new Set([...(existing.aliases || []), ...(item.aliases || [])])
        );

        existing.aliases = mergedAliases;
        existing.needs_review = existing.needs_review || item.needs_review;
        dedupMap.set(key, existing);
    }
}

const finalCatalog = Array.from(dedupMap.values());

fs.writeFileSync(outputPath, JSON.stringify(finalCatalog, null, 2), 'utf8');

const report = [
    '# Validation Report V3.1',
    '',
    '## Metrics',
    '- input_v3_entries: ' + v3.length,
    '- output_v3_1_entries: ' + finalCatalog.length,
    '- overrides_applied: ' + overridesApplied,
    '- auto_mix_review_flags: ' + autoMixNormalized,
    '',
    '## Scope',
    '- Repair pass only for MIX vs single-product contamination',
    '- No full catalog redesign performed',
    '',
    '## Expected outcomes',
    '- Mix products isolated from single-fruit products',
    '- Aguaymanto cleaned from mix aliases',
    '- Known healthy records preserved'
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');

console.log('V3.1 generado correctamente');
console.log('Input V3:', v3.length);
console.log('Output V3.1:', finalCatalog.length);
console.log('Overrides applied:', overridesApplied);
console.log('Auto mix review flags:', autoMixNormalized);
console.log('Archivo:', outputPath);
console.log('Reporte:', reportPath);