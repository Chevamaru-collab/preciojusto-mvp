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
