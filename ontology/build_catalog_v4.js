/**
 * build_catalog_v4.js
 *
 * Derives product_matcher_catalog_v4.json from V3.2 by:
 *   1. Replacing generic Avena stubs with typed entries that carry
 *      semantic_tokens and exclusion_tokens for alias-aware scoring.
 *   2. Adding a Leche Evaporada anchor entry in KG so the density
 *      bridge in the engine has a counterpart to score against.
 *
 * Run: node ontology/build_catalog_v4.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH  = path.join(__dirname, 'product_matcher_catalog_v3_2.json');
const OUTPUT_PATH = path.join(__dirname, 'product_matcher_catalog_v4.json');

const catalog = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

// ─── Avena typed definitions ──────────────────────────────────────────────────
// Each entry replaces the generic null-presentation V3.2 stub.
// semantic_tokens  = all surface forms the engine should match (union scored)
// exclusion_tokens = hard veto: if scraped name contains ANY of these, skip
const AVENA_ENTRIES = [
    {
        canonical_name:   'Avena Hojuelas 0.5 KG',
        family_name:      'Avena Hojuelas',
        rubro:            'Desayuno',
        categoria:        'Avena',
        subcategoria:     'Hojuelas',
        presentation:     0.5,
        unit:             'KG',
        normalized_unit:  'kilogram',
        price_unit:       'kilogram',
        brand:            null,
        comparison_group: 'Avena Hojuelas',
        comparison_level: 1,
        is_generic_group: false,
        semantic_tokens:  ['avena', 'hojuela', 'hojuelas', 'tradicional', 'entera', 'precocida', 'integral', 'clasica', 'quinua'],
        exclusion_tokens: ['instantanea', 'instant', 'rapida', 'bebida', 'drink', 'leche'],
        needs_review:     false
    },
    {
        canonical_name:   'Avena Hojuelas 1 KG',
        family_name:      'Avena Hojuelas',
        rubro:            'Desayuno',
        categoria:        'Avena',
        subcategoria:     'Hojuelas',
        presentation:     1,
        unit:             'KG',
        normalized_unit:  'kilogram',
        price_unit:       'kilogram',
        brand:            null,
        comparison_group: 'Avena Hojuelas',
        comparison_level: 1,
        is_generic_group: false,
        semantic_tokens:  ['avena', 'hojuela', 'hojuelas', 'tradicional', 'entera', 'precocida', 'integral', 'clasica', 'quinua'],
        exclusion_tokens: ['instantanea', 'instant', 'rapida', 'bebida', 'drink', 'leche'],
        needs_review:     false
    },
    {
        canonical_name:   'Avena Instantanea 0.5 KG',
        family_name:      'Avena Instantanea',
        rubro:            'Desayuno',
        categoria:        'Avena',
        subcategoria:     'Instantanea',
        presentation:     0.5,
        unit:             'KG',
        normalized_unit:  'kilogram',
        price_unit:       'kilogram',
        brand:            null,
        comparison_group: 'Avena Instantanea',
        comparison_level: 1,
        is_generic_group: false,
        semantic_tokens:  ['avena', 'instantanea', 'instant', 'rapida', 'rapido'],
        exclusion_tokens: ['hojuela', 'bebida', 'drink', 'leche'],
        needs_review:     false
    },
    {
        canonical_name:   'Bebida de Avena 0.2 LT',
        family_name:      'Bebida de Avena',
        rubro:            'Desayuno',
        categoria:        'Avena',
        subcategoria:     'Bebida',
        presentation:     0.2,
        unit:             'LT',
        normalized_unit:  'liter',
        price_unit:       'liter',
        brand:            null,
        comparison_group: 'Bebida de Avena',
        comparison_level: 1,
        is_generic_group: false,
        semantic_tokens:  ['avena', 'bebida', 'drink', 'leche'],
        exclusion_tokens: ['hojuela', 'instantanea', 'instant', 'rapida'],
        needs_review:     false
    }
];

// Leche Evaporada KG anchor — mirrors lata (can) presentation in KG
// Lets the engine score "Leche Gloria 400g" (0.4 KG) without needing density conversion
const LECHE_EVAPORADA_KG_ENTRY = {
    canonical_name:   'Leche Evaporada 0.4 KG',
    family_name:      'Leche Evaporada',
    rubro:            'Lácteos',
    categoria:        'Leche',
    subcategoria:     'Evaporada',
    presentation:     0.4,
    unit:             'KG',
    normalized_unit:  'kilogram',
    price_unit:       'kilogram',
    brand:            null,
    comparison_group: 'Leche Evaporada',
    comparison_level: 1,
    is_generic_group: false,
    semantic_tokens:  ['leche', 'evaporada', 'evap', 'lata', 'concentrada', 'reconstituid'],
    exclusion_tokens: ['condensada', 'polvo', 'uht', 'fresca'],
    needs_review:     false
};

// ─── Build result ─────────────────────────────────────────────────────────────

// 1. Drop generic null-presentation Avena stubs from V3.2
const AVENA_GROUPS_TO_REPLACE = new Set(['Avena Hojuelas', 'Avena Instantanea', 'Bebida de Avena']);
let removedAvena = 0;
let result = catalog.filter(item => {
    if (AVENA_GROUPS_TO_REPLACE.has(item.comparison_group) && item.presentation === null) {
        removedAvena++;
        return false;
    }
    return true;
});

// 2. Inject typed Avena entries
result = result.concat(AVENA_ENTRIES);

// 3. Inject Leche Evaporada KG anchor
result.push(LECHE_EVAPORADA_KG_ENTRY);

// 4. Write
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');

console.log('V4 generado correctamente');
console.log('Input V3.2:            ', catalog.length);
console.log('Removed Avena stubs:   ', removedAvena);
console.log('Added Avena typed:     ', AVENA_ENTRIES.length);
console.log('Added Leche anchor:    1');
console.log('Output V4:             ', result.length);
console.log('Archivo:               ', OUTPUT_PATH);
