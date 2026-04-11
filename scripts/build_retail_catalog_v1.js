/**
 * build_retail_catalog_v1.js
 *
 * Genera PRODUCT-CATALOG-v4-retail.json como catálogo separado del retail
 * para mejorar el match rate contra master-data.json.
 *
 * Cambios respecto al prototipo original:
 *   1. canonical_id usa guión bajo (_) — misma convención que entity_resolution.js
 *   2. Output en ontology/ para que entity_resolution.js pueda cargarlo
 *   3. Output es array plano (no { catalog: [...] }), compatible con loadCatalog()
 *   4. Campos mapeados a los nombres que entity_resolution.js consume:
 *      value → presentation, category → categoria (con capitalización correcta)
 *   5. Añade semantic_tokens opcionales para mejorar matching
 *   6. Validación completa: campo obligatorio + duplicado + logging claro
 *
 * Run:  node scripts/build_retail_catalog_v1.js
 * Output: ontology/PRODUCT-CATALOG-v4-retail.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT        = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'ontology', 'PRODUCT-CATALOG-v4-retail.json');

// ─── Convención canónica de ID ─────────────────────────────────────────────────
// IMPORTANTE: debe ser idéntica a toCanonicalId() en entity_resolution.js
// Separador: guión bajo (_). NO usar guiones (-).
function toCanonicalId(name) {
  return name
    .normalize('NFD')              // NFD para separar diacríticos
    .replace(/[\u0300-\u036f]/g, '') // eliminar diacríticos (tildes, ü, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // todo no-alfanumérico → _ (igual que entity_resolution.js)
    .replace(/^_|_$/g, '');        // trim guiones bajos extremos
}

// ─── Validación inline de la función toCanonicalId ───────────────────────────
// Corre al inicio del proceso para detectar regresiones de inmediato.
function runSelfTest() {
  const cases = [
    { input: 'Azúcar Rubia 1 kg',       expected: 'azucar_rubia_1_kg'       },
    { input: 'Atún en Trozos 170g',     expected: 'atun_en_trozos_170g'     },
    { input: 'Faraón Arroz Extra 5 kg', expected: 'faraon_arroz_extra_5_kg' },
    { input: 'Leche Evaporada 400g',    expected: 'leche_evaporada_400g'    },
    { input: 'Pan Molde Blanco 480g',   expected: 'pan_molde_blanco_480g'   },
  ];

  let passed = 0;
  let failed = 0;
  for (const { input, expected } of cases) {
    const got = toCanonicalId(input);
    if (got === expected) {
      passed++;
    } else {
      console.error(`[SELF-TEST FAIL] toCanonicalId("${input}") = "${got}" (esperado: "${expected}")`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`[SELF-TEST] ${failed} prueba(s) fallaron — abortar.`);
    process.exit(1);
  }
  console.log(`[SELF-TEST] OK — ${passed} casos pasados.`);
}

// ─── Entradas Retail ──────────────────────────────────────────────────────────
//
// Campos obligatorios por entrada:
//   canonical_name  : string — nombre canónico sin marca
//   aliases         : string[] — variantes de nombre (marcas, presentaciones alt.)
//   categoria       : string — debe coincidir con SCRAPER_TO_CATALOG_CAT keys en entity_resolution.js
//                              (capitalización exacta: "Arroz", "Azucar", "Fideos", etc.)
//   presentation    : number — valor numérico de presentación (en la unidad indicada)
//   unit            : string — "KG", "LT", "UND" (mayúsculas, igual que catalog v4)
//   retail_unit     : string — unidad en la que se compara el precio al consumidor
//   comparison_group: string — grupo de comparación (slug, sin acentos)
//
// Campos opcionales:
//   semantic_tokens : string[] — tokens adicionales para mejorar el matching Jaccard
//   family_name     : string — nombre de familia (para matching de fuzzy)
//
// NOTA: NO incluir marcas en canonical_name. Las marcas van solo en aliases.
//
const RETAIL_ENTRIES_TEMPLATE = [

  // ── Arroz ──────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Arroz Extra 5 KG',
    family_name:      'Arroz Extra',
    aliases:          ['Arroz Faraon 5kg', 'Arroz Costeno 5kg', 'Arroz Bells 5kg', 'Arroz Vallennorte 5kg'],
    categoria:        'Arroz',
    presentation:     5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Arroz Extra',
    semantic_tokens:  ['arroz', 'extra', 'aejo'],
  },
  {
    canonical_name:   'Arroz Superior 5 KG',
    family_name:      'Arroz Superior',
    aliases:          ['Arroz Paisana 5kg', 'Arroz Tottus Superior 5kg', 'Arroz Costeno Superior'],
    categoria:        'Arroz',
    presentation:     5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Arroz Superior',
    semantic_tokens:  ['arroz', 'superior'],
  },
  {
    canonical_name:   'Arroz Extra 750 g',
    family_name:      'Arroz Extra',
    aliases:          ['Arroz Extra Bolsa 750g', 'Arroz Costeno Extra 750g', 'Arroz Faraon 750g'],
    categoria:        'Arroz',
    presentation:     0.75,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Arroz Extra',
    semantic_tokens:  ['arroz', 'extra', 'aejo'],
  },
  {
    canonical_name:   'Arroz Integral 1 KG',
    family_name:      'Arroz Integral',
    aliases:          ['Arroz Integral Costeno', 'Arroz Integral Paisana', 'Arroz Integral Vallennorte'],
    categoria:        'Arroz',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Arroz Integral',
    semantic_tokens:  ['arroz', 'integral'],
  },

  // ── Aceite ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Aceite Vegetal 1 LT',
    family_name:      'Aceite Vegetal',
    aliases:          ['Aceite Primor 1lt', 'Aceite Cil 1lt', 'Aceite Tottus Vegetal 1lt', 'Aceite Deleite 1lt'],
    categoria:        'Aceite',
    presentation:     1,
    unit:             'LT',
    retail_unit:      'LT',
    comparison_group: 'Aceite Vegetal',
    semantic_tokens:  ['aceite', 'vegetal', 'soya', 'girasol'],
  },
  {
    canonical_name:   'Aceite Vegetal 0.9 LT',
    family_name:      'Aceite Vegetal',
    aliases:          ['Aceite Primor 900ml', 'Aceite Vegetal 900ml', 'Aceite Tonderoa 900ml'],
    categoria:        'Aceite',
    presentation:     0.9,
    unit:             'LT',
    retail_unit:      'LT',
    comparison_group: 'Aceite Vegetal',
    semantic_tokens:  ['aceite', 'vegetal'],
  },
  {
    canonical_name:   'Aceite Vegetal 5 LT',
    family_name:      'Aceite Vegetal',
    aliases:          ['Aceite Primor Bidón 5lt', 'Aceite Cocinero 5lt', 'Aceite Bells 5lt'],
    categoria:        'Aceite',
    presentation:     5,
    unit:             'LT',
    retail_unit:      'LT',
    comparison_group: 'Aceite Vegetal',
    semantic_tokens:  ['aceite', 'vegetal', 'bidon'],
  },

  // ── Azúcar ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Azucar Rubia 1 KG',
    family_name:      'Azucar Rubia',
    aliases:          ['Azucar Dulfina 1kg', 'Azucar Paramonga 1kg', 'Azucar Costeno Rubia', 'Azucar Rubia Bells'],
    categoria:        'Azucar',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Azucar Rubia',
    semantic_tokens:  ['azucar', 'rubia', 'morena'],
  },
  {
    canonical_name:   'Azucar Blanca 1 KG',
    family_name:      'Azucar Blanca',
    aliases:          ['Azucar Blanca Bells 1kg', 'Azucar Blanca Dulfina 1kg', 'Azucar Refinada 1kg'],
    categoria:        'Azucar',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Azucar Blanca',
    semantic_tokens:  ['azucar', 'blanca', 'refinada'],
  },
  {
    canonical_name:   'Azucar Blanca 5 KG',
    family_name:      'Azucar Blanca',
    aliases:          ['Azucar Blanca Bells 5kg', 'Azucar Blanca Costeno 5kg'],
    categoria:        'Azucar',
    presentation:     5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Azucar Blanca',
    semantic_tokens:  ['azucar', 'blanca', 'refinada'],
  },

  // ── Harina ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Harina Sin Preparar 1 KG',
    family_name:      'Harina',
    aliases:          ['Harina Favorita 1kg', 'Harina Molitalia 1kg', 'Harina Blanca Flor 1kg', 'Harina Nicolini 1kg'],
    categoria:        'Harina',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Harina Sin Preparar',
    semantic_tokens:  ['harina', 'trigo', 'sin', 'preparar'],
  },
  {
    canonical_name:   'Harina Sin Preparar 500 g',
    family_name:      'Harina',
    aliases:          ['Harina Favorita 500g', 'Harina Molitalia 500g'],
    categoria:        'Harina',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Harina Sin Preparar',
    semantic_tokens:  ['harina', 'trigo', 'sin', 'preparar'],
  },

  // ── Avena ──────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Avena Hojuelas 500 g',
    family_name:      'Avena Hojuelas',
    aliases:          ['Avena Quaker 500g', 'Avena 3 Ositos 500g', 'Avena Grano de Oro 500g', 'Avena Bells 500g'],
    categoria:        'Avena',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Avena Hojuelas',
    semantic_tokens:  ['avena', 'hojuelas', 'tradicional', 'clasica'],
  },
  {
    canonical_name:   'Avena Hojuelas 1 KG',
    family_name:      'Avena Hojuelas',
    aliases:          ['Avena Quaker 1kg', 'Avena 3 Ositos 1kg', 'Avena Bells 1kg'],
    categoria:        'Avena',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Avena Hojuelas',
    semantic_tokens:  ['avena', 'hojuelas', 'tradicional'],
  },
  {
    canonical_name:   'Avena Instantanea 160 g',
    family_name:      'Avena Instantanea',
    aliases:          ['Avena Quaker Instantanea', 'Avena Santa Catalina Precocida', 'Avena Instantanea 3 Ositos'],
    categoria:        'Avena',
    presentation:     0.16,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Avena Instantanea',
    semantic_tokens:  ['avena', 'instantanea', 'precocida', 'rapida'],
  },

  // ── Fideos ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Fideo Spaghetti 500 g',
    family_name:      'Fideo Spaghetti',
    aliases:          ['Spaghetti Molitalia 500g', 'Spaghetti Don Vittorio 500g', 'Fideo Nicolini Spaghetti', 'Spaghetti Barilla 500g'],
    categoria:        'Fideos',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Fideo Spaghetti',
    semantic_tokens:  ['fideo', 'spaghetti', 'tallarin', 'spaguetti'],
  },
  {
    canonical_name:   'Fideo Tornillo 500 g',
    family_name:      'Fideo Tornillo',
    aliases:          ['Tornillo Nicolini 500g', 'Tornillo Molitalia 500g', 'Fideo Tornillo Grano de Oro'],
    categoria:        'Fideos',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Fideo Tornillo',
    semantic_tokens:  ['fideo', 'tornillo', 'fusilli'],
  },
  {
    canonical_name:   'Fideo Canuto 500 g',
    family_name:      'Fideo Canuto',
    aliases:          ['Canuto Molitalia 500g', 'Canuto Precision Uno', 'Fideo Canuto Rayadao'],
    categoria:        'Fideos',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Fideo Canuto',
    semantic_tokens:  ['fideo', 'canuto', 'macarron', 'penne'],
  },

  // ── Pan Molde ──────────────────────────────────────────────────────────────
  {
    canonical_name:   'Pan Molde Blanco 480 g',
    family_name:      'Pan Molde Blanco',
    aliases:          ['Pan Bimbo Blanco 480g', 'Pan Union Blanco', 'Pan PYC Blanco', 'Pan Molde La Canasta Blanco'],
    categoria:        'Pan',
    presentation:     0.48,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Pan Molde Blanco',
    semantic_tokens:  ['pan', 'molde', 'blanco', 'sandwich'],
  },
  {
    canonical_name:   'Pan Molde Integral 480 g',
    family_name:      'Pan Molde Integral',
    aliases:          ['Pan Bimbo Integral 480g', 'Pan Union Integral', 'Pan Molde Integral Tottus'],
    categoria:        'Pan',
    presentation:     0.48,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Pan Molde Integral',
    semantic_tokens:  ['pan', 'molde', 'integral', 'multisemilla'],
  },

  // ── Huevos ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Huevos Pardos x 30',
    family_name:      'Huevos Pardos',
    aliases:          ['Huevo La Calera x30', 'Huevo San Fernando x30', 'Huevos Pardos Avivel 30', 'Huevos Artisan 30'],
    categoria:        'Huevos',
    presentation:     30,
    unit:             'UND',
    retail_unit:      'UND',
    comparison_group: 'Huevos Pardos x30',
    semantic_tokens:  ['huevo', 'pardo', 'bandeja', '30'],
  },
  {
    canonical_name:   'Huevos Pardos x 15',
    family_name:      'Huevos Pardos',
    aliases:          ['Huevo La Calera x15', 'Huevos San Fernando x15', 'Huevos Pardos Bolsa 15'],
    categoria:        'Huevos',
    presentation:     15,
    unit:             'UND',
    retail_unit:      'UND',
    comparison_group: 'Huevos Pardos x15',
    semantic_tokens:  ['huevo', 'pardo', '15'],
  },
  {
    canonical_name:   'Huevos Blancos x 12',
    family_name:      'Huevos Blancos',
    aliases:          ['Huevos Blancos La Calera x12', 'Huevos Blancos San Fernando'],
    categoria:        'Huevos',
    presentation:     12,
    unit:             'UND',
    retail_unit:      'UND',
    comparison_group: 'Huevos Blancos x12',
    semantic_tokens:  ['huevo', 'blanco', '12'],
  },

  // ── Leche Evaporada ────────────────────────────────────────────────────────
  {
    canonical_name:   'Leche Evaporada Entera 400 g',
    family_name:      'Leche Evaporada',
    aliases:          ['Leche Gloria Azul 400g', 'Leche Ideal 400g', 'Leche Laive Evaporada 400g', 'Leche Tottus Evaporada 400g'],
    categoria:        'Leche',
    presentation:     0.4,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Leche Evaporada',
    semantic_tokens:  ['leche', 'evaporada', 'entera', 'lata'],
  },
  {
    canonical_name:   'Leche Evaporada Light 400 g',
    family_name:      'Leche Evaporada',
    aliases:          ['Leche Gloria Light 400g', 'Leche Laive Light 400g', 'Leche Gloria Zero 400g'],
    categoria:        'Leche',
    presentation:     0.4,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Leche Evaporada Light',
    semantic_tokens:  ['leche', 'evaporada', 'light', 'descremada', 'cero'],
  },
  {
    canonical_name:   'Leche Evaporada Sin Lactosa 400 g',
    family_name:      'Leche Evaporada',
    aliases:          ['Leche Gloria Sin Lactosa Morada 400g', 'Leche Laive Sin Lactosa 400g'],
    categoria:        'Leche',
    presentation:     0.4,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Leche Evaporada Sin Lactosa',
    semantic_tokens:  ['leche', 'evaporada', 'sin', 'lactosa'],
  },

  // ── Leche Fresca / UHT ─────────────────────────────────────────────────────
  {
    canonical_name:   'Leche UHT Entera 1 LT',
    family_name:      'Leche UHT',
    aliases:          ['Leche Gloria UHT 1lt', 'Leche Laive UHT Entera 1lt', 'Leche Fresca UHT'],
    categoria:        'Leche',
    presentation:     1,
    unit:             'LT',
    retail_unit:      'LT',
    comparison_group: 'Leche UHT Entera',
    semantic_tokens:  ['leche', 'uht', 'entera', 'fresca'],
  },

  // ── Mantequilla ───────────────────────────────────────────────────────────
  {
    canonical_name:   'Mantequilla Con Sal 200 g',
    family_name:      'Mantequilla',
    aliases:          ['Mantequilla Gloria Pote 200g', 'Mantequilla Laive 200g', 'Mantequilla Zanetti 200g'],
    categoria:        'Mantequilla',
    presentation:     0.2,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Mantequilla Con Sal',
    semantic_tokens:  ['mantequilla', 'sal', 'pote', 'barra'],
  },
  {
    canonical_name:   'Mantequilla Sin Sal 200 g',
    family_name:      'Mantequilla',
    aliases:          ['Mantequilla Gloria Sin Sal 200g', 'Mantequilla Laive Sin Sal 200g'],
    categoria:        'Mantequilla',
    presentation:     0.2,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Mantequilla Sin Sal',
    semantic_tokens:  ['mantequilla', 'sin', 'sal'],
  },

  // ── Lentejas ──────────────────────────────────────────────────────────────
  {
    canonical_name:   'Lenteja Bebe 500 g',
    family_name:      'Lenteja',
    aliases:          ['Lenteja Bebe Costeno 500g', 'Lenteja Tottus 500g', 'Lenteja Bells 500g', 'Lenteja Vallenorte 500g'],
    categoria:        'Lentejas',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Lenteja Bebe',
    semantic_tokens:  ['lenteja', 'bebe', 'menestra'],
  },
  {
    canonical_name:   'Lenteja 1 KG',
    family_name:      'Lenteja',
    aliases:          ['Lenteja Costeno 1kg', 'Lenteja Vallenorte 1kg', 'Lenteja Bella 1kg'],
    categoria:        'Lentejas',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Lenteja Bebe',
    semantic_tokens:  ['lenteja', 'menestra'],
  },

  // ── Frijol Canario ────────────────────────────────────────────────────────
  {
    canonical_name:   'Frijol Canario 500 g',
    family_name:      'Frijol Canario',
    aliases:          ['Frijol Canario Costeno 500g', 'Frijol Canario Bells 500g', 'Frijol Canario Tesoro del Campo'],
    categoria:        'Frijol',
    presentation:     0.5,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Frijol Canario',
    semantic_tokens:  ['frijol', 'canario', 'menestra'],
  },
  {
    canonical_name:   'Frijol Canario 1 KG',
    family_name:      'Frijol Canario',
    aliases:          ['Frijol Canario Costeno 1kg', 'Frijol Canario Paisana 1kg', 'Frijol Canario Precision Uno'],
    categoria:        'Frijol',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Frijol Canario',
    semantic_tokens:  ['frijol', 'canario', 'menestra'],
  },

  // ── Pollo ─────────────────────────────────────────────────────────────────
  {
    canonical_name:   'Pollo Entero Con Menudencia KG',
    family_name:      'Pollo Entero',
    aliases:          ['Pollo San Fernando Entero', 'Pollo Redondos Entero', 'Pollo Tottus Fresco Entero'],
    categoria:        'Pollo',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Pollo Entero',
    semantic_tokens:  ['pollo', 'entero', 'menudencia', 'fresco'],
  },
  {
    canonical_name:   'Pechuga De Pollo KG',
    family_name:      'Pechuga Pollo',
    aliases:          ['Pechuga Especial Pollo', 'Filete Pechuga Pollo', 'Pechuga San Fernando', 'Pechuga Pollo Tottus'],
    categoria:        'Pollo',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Pechuga Pollo',
    semantic_tokens:  ['pollo', 'pechuga', 'filete', 'especial'],
  },
  {
    canonical_name:   'Pierna De Pollo KG',
    family_name:      'Pierna Pollo',
    aliases:          ['Pierna Pollo San Fernando', 'Pierna Pollo Tottus', 'Pierna Con Encuentro'],
    categoria:        'Pollo',
    presentation:     1,
    unit:             'KG',
    retail_unit:      'KG',
    comparison_group: 'Pierna Pollo',
    semantic_tokens:  ['pollo', 'pierna', 'muslo'],
  },

  // ── v1.1 Expansión — 25 entradas (TDD PASS 2026-04-11) ────────────────────
  // Fuente: gap_analysis_report.json → spec_validator → test_catalog_v1_1.js
  // Bug fix: presentation (number) restaurado desde canonical_name
  { canonical_name: 'Fideo 0.5 kg',               family_name: 'Fideo',                aliases: ['AGNESI Fideo Pennette Rigate Agnesi Bolsa 500 g', 'BARILLA Fideo Lasagne Bolognesi Barilla Caja 500 g', 'BARILLA Fideo Spaguettini n3 Barilla Empaque 500 g'],                                                           categoria: 'Fideos',      presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',              semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Arroz Extra 0.75 kg',         family_name: 'Arroz Extra',          aliases: ['GRAN CHALAN Arroz Integral Gran Chalan Bolsa 750 g', 'VALLENORTE Arroz Integral Valle Norte Bolsa 750 g', 'Arroz Extra VALLENORTE Gran Reserva Bolsa 750g'],                                                               categoria: 'Arroz',       presentation: 0.75,  unit: 'KG', retail_unit: 'KG', comparison_group: 'arroz-extra',        semantic_tokens: ['arroz','extra','aejo'] },
  { canonical_name: 'Fideo 0.25 kg',               family_name: 'Fideo',                aliases: ['MOLITALIA Fideo Pastina Molitalia 250 g', 'GRANO DE ORO Fideo Cortado Tornillo Grano de Oro Empaque 250 g', 'PRECIO UNO Fideo Tornillo Precio Uno Bolsa 250 g'],                                                            categoria: 'Fideos',      presentation: 0.25,  unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',              semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Pan Molde 0.56 kg',           family_name: 'Pan Molde',            aliases: ['DON MAMINO Pan de Molde Blanco sin Corteza Don Mamino Bolsa 560 g', 'DON MAMINO Pan de Molde con Salvado de Trigo Don Mamino Bolsa 560 g', 'DON MAMINO Pan de Molde Marmoleado sin Cortar Don Mamino Bolsa 560 g'],       categoria: 'Pan',         presentation: 0.56,  unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',          semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Lenteja Bebe 0.5 kg',         family_name: 'Lenteja Bebe',         aliases: ["Lenteja Bebé BELL'S Bolsa 500g", "Lentejas BELL'S Bolsa 500g", 'Lenteja COSTEÑO Bolsa 500g'],                                                                                                                              categoria: 'Lentejas',    presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'lenteja-bebe',       semantic_tokens: ['lenteja','bebe','menestra'] },
  { canonical_name: 'Mantequilla Con Sal 0.18 kg', family_name: 'Mantequilla Con Sal',  aliases: ['GLORIA Mantequilla Gloria con Sal Envase 180 g', 'GLORIA Mantequilla Sin Sal Gloria en Barra Empaque 180 g', 'DANLAC Mantequilla con Sal Danlac Empaque 180 g'],                                                           categoria: 'Mantequilla', presentation: 0.18,  unit: 'KG', retail_unit: 'KG', comparison_group: 'mantequilla-con-sal', semantic_tokens: ['mantequilla','sal','pote'] },
  { canonical_name: 'Leche UHT Entera 0.8 lt',    family_name: 'Leche UHT Entera',     aliases: ['GLORIA Leche UHT Entera Gloria Bolsa 800 mL', 'Bebida de Leche UHT LA PREFERIDA Regular Bolsa 800ml', 'Leche UHT Milkito Bolsa 800ml'],                                                                                     categoria: 'Leche',       presentation: 0.8,   unit: 'LT', retail_unit: 'LT', comparison_group: 'leche-uht',          semantic_tokens: ['leche','uht','entera','fresca'] },
  { canonical_name: 'Pan Molde 0.6 kg',            family_name: 'Pan Molde',            aliases: ['LA CANASTA Pan de Molde Integral La Canasta Empaque 600 g', 'Pan de Molde Integral BIMBO Vital Multicereal Bolsa 600g', 'Pan de Molde Blanco BIMBO Vital de Semillas Bolsa 600g'],                                          categoria: 'Pan',         presentation: 0.6,   unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',          semantic_tokens: ['pan','molde','blanco','sandwich'] },
  // NOTE: 'Arroz Extra 5 KG' already in v1.0 (canonical_id = arroz_extra_5_kg) — skipped
  { canonical_name: 'Avena Hojuelas 0.5 kg',       family_name: 'Avena Hojuelas',       aliases: ['GRANO DE ORO Avena Grano De Oro Bolsa 500 g', 'Avena QUAKER Tradicional Bolsa 500g', 'Avena Integral GRANO DE ORO Bolsa 500g'],                                                                                              categoria: 'Avena',       presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',     semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Pan Molde 0.5 kg',            family_name: 'Pan Molde',            aliases: ['PYC Pan de Molde PYC Integral Bolsa 500 g', 'Pan de Molde Integral Multicereal LA FLORENCIA Bolsa 500g', 'Pan de Molde Integral LA FLORENCIA Bolsa 500g'],                                                                  categoria: 'Pan',         presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',          semantic_tokens: ['pan','molde','blanco','sandwich'] },
  { canonical_name: 'Harina Especial 0.2 kg',      family_name: 'Harina Especial',      aliases: ['NATURANDES Harina de 7 Semillas Naturandes Doypack 200 g', 'RENACER Harina de Kiwicha Renacer Bolsa 200 g', 'HARINA DE LINAZA X 200G LA CASA MARIMIEL'],                                                                 categoria: 'Harina',      presentation: 0.2,   unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',    semantic_tokens: ['harina','especial','semillas'] },
  { canonical_name: 'Avena Hojuelas 0.9 kg',       family_name: 'Avena Hojuelas',       aliases: ['3 OSITOS Avena Clásica 3 Ositos Precocida Bolsa 900 g', '3 OSITOS Quinua Avena Hojuela 3 Ositos Precocida 900 g', 'SANTA CATALINA Avena Precocida Santa Catalina Pack 2 Bolsas 900 g'],                                   categoria: 'Avena',       presentation: 0.9,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',     semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Azucar 5 kg',                 family_name: 'Azucar',               aliases: ['PRECIO UNO Azúcar Rubia Precio Uno Bolsa 5 Kg', 'CAMPECHANO Azúcar Rubia Campechano Empaque 5 Kg', "Azúcar Blanca BELL'S Bolsa 5Kg"],                                                                                      categoria: 'Azucar',      presentation: 5,     unit: 'KG', retail_unit: 'KG', comparison_group: 'azucar',              semantic_tokens: ['azucar','rubia','blanca'] },
  { canonical_name: 'Pan Molde 0.39 kg',           family_name: 'Pan Molde',            aliases: ['Pan de Molde Multigranos 390g', 'Pan de Molde Integral Bauducco 390g', 'Pan de Molde Blanco Bauducco 390g'],                                                                                                                  categoria: 'Pan',         presentation: 0.39,  unit: 'KG', retail_unit: 'KG', comparison_group: 'pan-molde',          semantic_tokens: ['pan','molde','blanco','sandwich'] },
  // NOTE: 'Leche UHT Entera 1 LT' already exists in v1.0 (same canonical_id) — skipped
  { canonical_name: 'Azucar 0.5 kg',               family_name: 'Azucar',               aliases: ['TOTTUS Azúcar Blanca Tottus con Stevia Bolsa 500 g', 'TOTTUS Azúcar Rubia Tottus con Stevia Bolsa 500 g', 'DULFINA AZUCAR RUBIA DULFINA X500GR'],                                                                          categoria: 'Azucar',      presentation: 0.5,   unit: 'KG', retail_unit: 'KG', comparison_group: 'azucar',              semantic_tokens: ['azucar','rubia','blanca'] },
  { canonical_name: 'Fideo 0.45 kg',               family_name: 'Fideo',                aliases: ['Fideos Cuisine &Co Tornillo 450g', 'Fideos Cuisine &Co Canuto 450g', 'Fideos Cuisine &Co Spaguetti 450g'],                                                                                                                   categoria: 'Fideos',      presentation: 0.45,  unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',              semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Harina Especial 1 kg',        family_name: 'Harina Especial',      aliases: ['PAN Harina de Maíz Blanco Pan Precocido Bolsa 1 Kg', 'PAN Harina de Maíz PAN Amarillo Precocida Empaque 1 Kg', 'Harina de Maíz Blanco P.A.N. Precocida Bolsa 1Kg'],                                                      categoria: 'Harina',      presentation: 1,     unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',    semantic_tokens: ['harina','especial','semillas'] },
  { canonical_name: 'Avena Hojuelas 0.6 kg',       family_name: 'Avena Hojuelas',       aliases: ['AMARU SUPERFOODS Avena Protéica Amaru Superfoods Chocolate Doypack 600 g', 'HUELLA VERDE Avena Mix Huella Verde Superfood Empaque 600 g', 'AMARU SUPERFOODS Avena Protéica Amaru Superfoods Vainilla Doypack 600 g'],     categoria: 'Avena',       presentation: 0.6,   unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',     semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Avena Hojuelas 0.27 kg',      family_name: 'Avena Hojuelas',       aliases: ['3 OSITOS Avena 3 Ositos con Cereales Andinos Bolsa 270 g', '3 OSITOS Avena con Quinua 3 Ositos Bolsa 270 g', '3 OSITOS Avena con Maca 3 Ositos Bolsa 270 g'],                                                              categoria: 'Avena',       presentation: 0.27,  unit: 'KG', retail_unit: 'KG', comparison_group: 'avena-hojuelas',     semantic_tokens: ['avena','hojuelas','precocida'] },
  { canonical_name: 'Fideo 0.235 kg',              family_name: 'Fideo',                aliases: ['MARCO POLO Fideo Marco Polo Tornillo Bolsa 235 g', 'MOLITALIA Fideos Codo Mediano Rayado Molitalia Bolsa 235 g', 'MOLITALIA Fideo Rigatoni Molitalia Bolsa 235 g'],                                                         categoria: 'Fideos',      presentation: 0.235, unit: 'KG', retail_unit: 'KG', comparison_group: 'fideo',              semantic_tokens: ['fideo','spaghetti','tallarin','pasta'] },
  { canonical_name: 'Leche UHT Entera 0.946 lt',  family_name: 'Leche UHT Entera',     aliases: ['GLORIA Leche Gloria Uht Sin Lactosa 946 mL', 'LAIVE Leche Laive Entera Pack 4 Cajas 946 mL', 'LAIVE Leche Laive Entera Caja 946 mL'],                                                                                      categoria: 'Leche',       presentation: 0.946, unit: 'LT', retail_unit: 'LT', comparison_group: 'leche-uht',          semantic_tokens: ['leche','uht','entera'] },
  { canonical_name: 'Mantequilla Con Sal 0.25 kg', family_name: 'Mantequilla Con Sal',  aliases: ['PIAMONTE Mantequilla con Sal Piamonte Empaque 250 g', 'Mantequilla con Sal PIAMONTE Pote 250g', "Mantequilla con Sal Président 250g"],                                                                                     categoria: 'Mantequilla', presentation: 0.25,  unit: 'KG', retail_unit: 'KG', comparison_group: 'mantequilla-con-sal', semantic_tokens: ['mantequilla','sal','pote'] },
  { canonical_name: 'Harina Especial 0.4 kg',      family_name: 'Harina Especial',      aliases: ['TIERRA Harina de Avena Tierra Sin Gluten Empaque 400 g', 'MI TIERRA Harina de Coco Mi Tierra Bolsa 400 g', 'Harina de Avena MI TIERRA Sin Gluten Bolsa 400g'],                                                            categoria: 'Harina',      presentation: 0.4,   unit: 'KG', retail_unit: 'KG', comparison_group: 'harina-especial',    semantic_tokens: ['harina','especial','semillas'] },
];

// ─── Campos obligatorios que DEBE tener cada entrada ─────────────────────────
const REQUIRED_FIELDS = [
  'canonical_name', 'aliases', 'categoria', 'presentation', 'unit', 'retail_unit', 'comparison_group',
];

// ─── Constructor ─────────────────────────────────────────────────────────────

function buildCatalog() {
  console.log('[BUILD] Iniciando generación de PRODUCT-CATALOG-v4-retail.json ...');

  const catalog = [];
  const seenIds = new Set();
  let skipped   = 0;

  for (const entry of RETAIL_ENTRIES_TEMPLATE) {
    // 1. Validar campos obligatorios
    const missing = REQUIRED_FIELDS.filter(f => entry[f] === undefined || entry[f] === null || entry[f] === '');
    if (missing.length > 0) {
      console.warn(`[SKIP] Entrada con campos faltantes (${missing.join(', ')}): "${entry.canonical_name || '(sin nombre)'}"`);
      skipped++;
      continue;
    }

    // 2. Generar canonical_id con convención guión bajo (igual que entity_resolution.js)
    const canonical_id = toCanonicalId(entry.canonical_name);

    if (!canonical_id) {
      console.error(`[ERROR] canonical_id vacío para: "${entry.canonical_name}"`);
      skipped++;
      continue;
    }

    // 3. Detectar duplicados
    if (seenIds.has(canonical_id)) {
      console.error(`[ERROR] ID duplicado: "${canonical_id}" (canonical_name: "${entry.canonical_name}")`);
      skipped++;
      continue;
    }

    seenIds.add(canonical_id);

    // 4. Construir entrada compatible con entity_resolution.js
    //    El campo "presentation" es lo que loadCatalog() usa para calcular _catBasePresValue.
    //    El campo "categoria" debe coincidir con los valores de SCRAPER_TO_CATALOG_CAT.
    catalog.push({
      canonical_id,
      canonical_name:   entry.canonical_name,
      family_name:      entry.family_name     || entry.canonical_name,
      categoria:        entry.categoria,        // capitalización exacta (e.g. "Arroz", "Azucar")
      presentation:     entry.presentation,     // nombre correcto para entity_resolution.js
      unit:             entry.unit,             // "KG", "LT", "UND" en mayúsculas
      retail_unit:      entry.retail_unit,
      comparison_group: entry.comparison_group,
      aliases:          Array.isArray(entry.aliases) ? entry.aliases : [],
      semantic_tokens:  Array.isArray(entry.semantic_tokens) ? entry.semantic_tokens : [],
    });
  }

  // 5. Output: array plano — compatible con loadCatalog() en entity_resolution.js
  //    entity_resolution.js hace: JSON.parse(fs.readFileSync(..., 'utf8')).map(...)
  //    Por tanto NO envolver en { catalog: [...] }
  const sortedCatalog = catalog.sort((a, b) =>
    a.canonical_id.localeCompare(b.canonical_id)
  );

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedCatalog, null, 2), 'utf8');

  // 6. Resumen en consola
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PrecioJusto — Retail Catalog Build Complete         ');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Entradas generadas : ${catalog.length}`);
  console.log(`  Entradas omitidas  : ${skipped}`);
  console.log(`  Categorías         : ${[...new Set(catalog.map(e => e.categoria))].sort().join(', ')}`);
  console.log(`  Output             : ${OUTPUT_PATH}`);
  console.log('══════════════════════════════════════════════════════\n');

  // 7. Muestra IDs generados para inspección rápida
  console.log('  IDs generados (sample):');
  sortedCatalog.slice(0, 10).forEach(e =>
    console.log(`    ${e.canonical_id}  ←  "${e.canonical_name}"`)
  );
  if (sortedCatalog.length > 10) {
    console.log(`    ... y ${sortedCatalog.length - 10} más.`);
  }
  console.log('');
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────
runSelfTest();
buildCatalog();
