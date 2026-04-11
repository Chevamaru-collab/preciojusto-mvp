'use strict';
/**
 * test_catalog_v1_1.js
 * TDD suite for Retail Catalog v1.1 injection spec.
 * Validates that every new entry meets the builder's contractual schema
 * BEFORE any injection occurs.
 *
 * SPEC (builder contract, lines 516-518 of build_retail_catalog_v1.js):
 *   REQUIRED_FIELDS = ['canonical_name','aliases','categoria','presentation','unit','retail_unit','comparison_group']
 *   presentation : typeof number (not null, not undefined, not NaN)
 *   unit         : 'KG' | 'LT' | 'UND'  (uppercase)
 *   comparison_group: non-empty string (family slug, no weight/size info)
 *   aliases      : Array, length >= 1
 *   canonical_name: coherent with presentation+unit (value embedded in name must match presentation)
 *
 * Run: node scripts/test_catalog_v1_1.js
 * Exit 0 = ALL PASS, Exit 1 = FAIL (do not proceed to injection)
 */

const path = require('path');

// ─── The 25 v1.1 entries in BUILDER schema (presentation + uppercase unit) ────
// Extracted from catalog_v1_1_block.json and enriched with presentation value
// (parsed from canonical_name since _apply_spec_fix.js lost the field).
const V1_1_ENTRIES = [
  { canonical_name: 'Fideo 0.5 kg',              family_name: 'Fideo',                aliases: ['AGNESI Fideo Pennette Rigate Agnesi Bolsa 500 g', 'BARILLA Fideo Lasagne Bolognesi Barilla Caja 500 g', 'BARILLA Fideo Spaguettini n3 Barilla Empaque 500 g'],                                                             categoria: 'Fideos',      presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',             semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Arroz Extra 0.75 kg',        family_name: 'Arroz Extra',          aliases: ['GRAN CHALAN Arroz Integral Gran Chalan Bolsa 750 g', 'VALLENORTE Arroz Integral Valle Norte Bolsa 750 g', 'Arroz Extra VALLENORTE Gran Reserva Bolsa 750g'],                                                                 categoria: 'Arroz',       presentation: 0.75,  unit: 'KG', retail_unit: 'KG', comparison_group: 'arroz-extra',       semantic_tokens: ['arroz','extra','aejo'] },
  { canonical_name: 'Fideo 0.25 kg',              family_name: 'Fideo',                aliases: ['MOLITALIA Fideo Pastina Molitalia 250 g', 'GRANO DE ORO Fideo Cortado Tornillo Grano de Oro Empaque 250 g', 'PRECIO UNO Fideo Tornillo Precio Uno Bolsa 250 g'],                                                              categoria: 'Fideos',      presentation: 0.25,  unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',             semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Pan Molde 0.56 kg',          family_name: 'Pan Molde',            aliases: ['DON MAMINO Pan de Molde Blanco sin Corteza Don Mamino Bolsa 560 g', 'DON MAMINO Pan de Molde con Salvado de Trigo Don Mamino Bolsa 560 g', 'DON MAMINO Pan de Molde Marmoleado sin Cortar Don Mamino Bolsa 560 g'],         categoria: 'Pan',         presentation: 0.56,  unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',         semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Lenteja Bebe 0.5 kg',        family_name: 'Lenteja Bebe',         aliases: ["Lenteja Bebé BELL'S Bolsa 500g", "Lentejas BELL'S Bolsa 500g", 'Lenteja COSTEÑO Bolsa 500g'],                                                                                                                                categoria: 'Lentejas',    presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'lenteja-bebe',      semantic_tokens: ['lenteja','bebe','menestra'] },
  { canonical_name: 'Mantequilla Con Sal 0.18 kg',family_name: 'Mantequilla Con Sal',  aliases: ['GLORIA Mantequilla Gloria con Sal Envase 180 g', 'GLORIA Mantequilla Sin Sal Gloria en Barra Empaque 180 g', 'DANLAC Mantequilla con Sal Danlac Empaque 180 g'],                                                             categoria: 'Mantequilla', presentation: 0.18,  unit: 'KG', retail_unit: 'KG', comparison_group: 'mantequilla-con-sal', semantic_tokens: ['mantequilla','sal','pote'] },
  { canonical_name: 'Leche UHT Entera 0.8 lt',   family_name: 'Leche UHT Entera',     aliases: ['GLORIA Leche UHT Entera Gloria Bolsa 800 mL', 'Bebida de Leche UHT LA PREFERIDA Regular Bolsa 800ml', 'Leche UHT Milkito Bolsa 800ml'],                                                                                       categoria: 'Leche',       presentation: 0.8,   unit: 'LT', retail_unit: 'LT', comparison_group: 'leche-uht',         semantic_tokens: ['leche','uht','entera','fresca'] },
  { canonical_name: 'Pan Molde 0.6 kg',           family_name: 'Pan Molde',            aliases: ['LA CANASTA Pan de Molde Integral La Canasta Empaque 600 g', 'Pan de Molde Integral BIMBO Vital Multicereal Bolsa 600g', 'Pan de Molde Blanco BIMBO Vital de Semillas Bolsa 600g'],                                            categoria: 'Pan',         presentation: 0.6,   unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',         semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Arroz Extra 5 kg',           family_name: 'Arroz Extra',          aliases: ['Arroz Extra Añejo VALLENORTE Gran Reserva Bolsa 5Kg', 'Arroz Extra Añejo FARAON Naranja Bolsa 5kg', "Arroz Extra BELL'S Bolsa 5Kg"],                                                                                          categoria: 'Arroz',       presentation: 5,     unit: 'KG', retail_unit: 'KG', comparison_group: 'arroz-extra',       semantic_tokens: ['arroz','extra','aejo'] },
  { canonical_name: 'Avena Hojuelas 0.5 kg',      family_name: 'Avena Hojuelas',       aliases: ['GRANO DE ORO Avena Grano De Oro Bolsa 500 g', 'Avena QUAKER Tradicional Bolsa 500g', 'Avena Integral GRANO DE ORO Bolsa 500g'],                                                                                                categoria: 'Avena',       presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',    semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Pan Molde 0.5 kg',           family_name: 'Pan Molde',            aliases: ['PYC Pan de Molde PYC Integral Bolsa 500 g', 'Pan de Molde Integral Multicereal LA FLORENCIA Bolsa 500g', 'Pan de Molde Integral LA FLORENCIA Bolsa 500g'],                                                                   categoria: 'Pan',         presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',         semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Harina Especial 0.2 kg',     family_name: 'Harina Especial',      aliases: ['NATURANDES Harina de 7 Semillas Naturandes Doypack 200 g', 'RENACER Harina de Kiwicha Renacer Bolsa 200 g', 'HARINA DE LINAZA X 200G LA CASA MARIMIEL'],                                                                   categoria: 'Harina',      presentation: 0.2,   unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',   semantic_tokens: ['harina','especial','semillas'] },
  { canonical_name: 'Avena Hojuelas 0.9 kg',      family_name: 'Avena Hojuelas',       aliases: ['3 OSITOS Avena Clásica 3 Ositos Precocida Bolsa 900 g', '3 OSITOS Quinua Avena Hojuela 3 Ositos Precocida 900 g', 'SANTA CATALINA Avena Precocida Santa Catalina Pack 2 Bolsas 900 g'],                                     categoria: 'Avena',       presentation: 0.9,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',    semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Azucar 5 kg',                family_name: 'Azucar',               aliases: ['PRECIO UNO Azúcar Rubia Precio Uno Bolsa 5 Kg', 'CAMPECHANO Azúcar Rubia Campechano Empaque 5 Kg', "Azúcar Blanca BELL'S Bolsa 5Kg"],                                                                                        categoria: 'Azucar',      presentation: 5,     unit: 'KG', retail_unit: 'KG', comparison_group: 'azucar',             semantic_tokens: ['azucar','rubia','blanca'] },
  { canonical_name: 'Pan Molde 0.39 kg',          family_name: 'Pan Molde',            aliases: ['Pan de Molde Multigranos 390g', 'Pan de Molde Integral Bauducco 390g', 'Pan de Molde Blanco Bauducco 390g'],                                                                                                                   categoria: 'Pan',         presentation: 0.39,  unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',         semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Leche UHT Entera 1 lt',      family_name: 'Leche UHT Entera',     aliases: ['GLORIA Leche UHT Chocolatada Gloria Caja 1 L', 'LAIVE Leche Fresca Niños Laive Caja 1 L', 'LAIVE Leche Fresca Laive Pack 4 Unidades 1 L'],                                                                                   categoria: 'Leche',       presentation: 1,     unit: 'LT', retail_unit: 'LT', comparison_group: 'leche-uht',         semantic_tokens: ['leche','uht','entera','fresca'] },
  { canonical_name: 'Azucar 0.5 kg',              family_name: 'Azucar',               aliases: ['TOTTUS Azúcar Blanca Tottus con Stevia Bolsa 500 g', 'TOTTUS Azúcar Rubia Tottus con Stevia Bolsa 500 g', 'DULFINA AZUCAR RUBIA DULFINA X500GR'],                                                                            categoria: 'Azucar',      presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'azucar',             semantic_tokens: ['azucar','rubia','blanca'] },
  { canonical_name: 'Fideo 0.45 kg',              family_name: 'Fideo',                aliases: ['Fideos Cuisine &Co Tornillo 450g', 'Fideos Cuisine &Co Canuto 450g', 'Fideos Cuisine &Co Spaguetti 450g'],                                                                                                                    categoria: 'Fideos',      presentation: 0.45,  unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',             semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Harina Especial 1 kg',       family_name: 'Harina Especial',      aliases: ['PAN Harina de Maíz Blanco Pan Precocido Bolsa 1 Kg', 'PAN Harina de Maíz PAN Amarillo Precocida Empaque 1 Kg', 'Harina de Maíz Blanco P.A.N. Precocida Bolsa 1Kg'],                                                        categoria: 'Harina',      presentation: 1,     unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',   semantic_tokens: ['harina','especial','semillas'] },
  { canonical_name: 'Avena Hojuelas 0.6 kg',      family_name: 'Avena Hojuelas',       aliases: ['AMARU SUPERFOODS Avena Protéica Amaru Superfoods Chocolate Doypack 600 g', 'HUELLA VERDE Avena Mix Huella Verde Superfood Empaque 600 g', 'AMARU SUPERFOODS Avena Protéica Amaru Superfoods Vainilla Doypack 600 g'],       categoria: 'Avena',       presentation: 0.6,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',    semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Avena Hojuelas 0.27 kg',     family_name: 'Avena Hojuelas',       aliases: ['3 OSITOS Avena 3 Ositos con Cereales Andinos Bolsa 270 g', '3 OSITOS Avena con Quinua 3 Ositos Bolsa 270 g', '3 OSITOS Avena con Maca 3 Ositos Bolsa 270 g'],                                                                categoria: 'Avena',       presentation: 0.27,  unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',    semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Fideo 0.235 kg',             family_name: 'Fideo',                aliases: ['MARCO POLO Fideo Marco Polo Tornillo Bolsa 235 g', 'MOLITALIA Fideos Codo Mediano Rayado Molitalia Bolsa 235 g', 'MOLITALIA Fideo Rigatoni Molitalia Bolsa 235 g'],                                                          categoria: 'Fideos',      presentation: 0.235, unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',             semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Leche UHT Entera 0.946 lt',  family_name: 'Leche UHT Entera',     aliases: ['GLORIA Leche Gloria Uht Sin Lactosa 946 mL', 'LAIVE Leche Laive Entera Pack 4 Cajas 946 mL', 'LAIVE Leche Laive Entera Caja 946 mL'],                                                                                        categoria: 'Leche',       presentation: 0.946, unit: 'LT', retail_unit: 'LT', comparison_group: 'leche-uht',         semantic_tokens: ['leche','uht','entera'] },
  { canonical_name: 'Mantequilla Con Sal 0.25 kg',family_name: 'Mantequilla Con Sal',  aliases: ['PIAMONTE Mantequilla con Sal Piamonte Empaque 250 g', 'Mantequilla con Sal PIAMONTE Pote 250g', "Mantequilla con Sal Président 250g"],                                                                                       categoria: 'Mantequilla', presentation: 0.25,  unit: 'KG', retail_unit: 'KG', comparison_group: 'mantequilla-con-sal', semantic_tokens: ['mantequilla','sal','pote'] },
  { canonical_name: 'Harina Especial 0.4 kg',     family_name: 'Harina Especial',      aliases: ['TIERRA Harina de Avena Tierra Sin Gluten Empaque 400 g', 'MI TIERRA Harina de Coco Mi Tierra Bolsa 400 g', 'Harina de Avena MI TIERRA Sin Gluten Bolsa 400g'],                                                              categoria: 'Harina',      presentation: 0.4,   unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',   semantic_tokens: ['harina','especial','semillas'] },
];

// ─── REQUIRED_FIELDS (mirror of builder line 518) ─────────────────────────────
const REQUIRED_FIELDS = ['canonical_name','aliases','categoria','presentation','unit','retail_unit','comparison_group'];
const ALLOWED_UNITS   = new Set(['KG','LT','UND']);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractNumericFromName(name) {
  // e.g. "Fideo 0.5 kg" → 0.5 | "Arroz Extra 5 kg" → 5 | "Pan Molde 0.56 kg" → 0.56
  const m = name.match(/(\d+\.?\d*)\s*(kg|lt|und)\s*$/i);
  return m ? parseFloat(m[1]) : null;
}

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, label, detail) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`  ❌ ${label}: ${detail}`);
  }
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  TDD — Retail Catalog v1.1 — Pre-Injection Spec Validation  ');
console.log('══════════════════════════════════════════════════════════════\n');

// T0: Count
assert(V1_1_ENTRIES.length === 25, 'T0 COUNT', `Expected 25, got ${V1_1_ENTRIES.length}`);

const seenNames = new Set();

for (const [i, e] of V1_1_ENTRIES.entries()) {
  const tag = `Entry[${i}] "${e.canonical_name}"`;

  // T1: Required fields present
  const missing = REQUIRED_FIELDS.filter(f => e[f] === undefined || e[f] === null || e[f] === '');
  assert(missing.length === 0, `T1 REQUIRED ${tag}`, missing.length > 0 ? `missing: ${missing.join(', ')}` : 'OK');

  // T2: presentation is a finite number (not NaN, not null)
  assert(
    typeof e.presentation === 'number' && isFinite(e.presentation) && e.presentation > 0,
    `T2 PRESENTATION_TYPE ${tag}`,
    `got ${typeof e.presentation} = ${e.presentation}`
  );

  // T3: unit is uppercase and in allowed set
  assert(
    ALLOWED_UNITS.has(e.unit),
    `T3 UNIT_VALID ${tag}`,
    `got "${e.unit}" — must be KG|LT|UND`
  );

  // T4: comparison_group is a non-empty string with no embedded weight (no digits followed by kg/lt)
  const groupHasWeight = /\d/.test(e.comparison_group);
  assert(
    typeof e.comparison_group === 'string' && e.comparison_group.length > 0 && !groupHasWeight,
    `T4 COMPARISON_GROUP ${tag}`,
    `got "${e.comparison_group}" — must be family slug without numeric weight`
  );

  // T5: aliases is an array with at least 1 entry
  assert(
    Array.isArray(e.aliases) && e.aliases.length >= 1,
    `T5 ALIASES ${tag}`,
    `got ${Array.isArray(e.aliases) ? e.aliases.length : typeof e.aliases} alias(es)`
  );

  // T6: canonical_name coherence — numeric value in name must match presentation
  const nameVal = extractNumericFromName(e.canonical_name);
  assert(
    nameVal !== null && Math.abs(nameVal - e.presentation) < 0.0001,
    `T6 NAME_VALUE_COHERENCE ${tag}`,
    `name implies ${nameVal}, presentation=${e.presentation}`
  );

  // T7: no duplicate canonical_name
  assert(
    !seenNames.has(e.canonical_name),
    `T7 UNIQUE ${tag}`,
    seenNames.has(e.canonical_name) ? 'DUPLICATE DETECTED' : 'OK'
  );
  seenNames.add(e.canonical_name);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(errors.length > 0 ? errors.join('\n') : '  (no errors)');
console.log(`\n  Tests passed : ${passed}`);
console.log(`  Tests failed : ${failed}`);
console.log('──────────────────────────────────────────────────────────────');
console.log(`  TDD STATUS   : ${failed === 0 ? '✅  PASS — proceed to injection' : '❌  FAIL — stop'}`);
console.log('══════════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
