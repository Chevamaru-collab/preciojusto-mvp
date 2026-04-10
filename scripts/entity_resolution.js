/**
 * entity_resolution.js
 *
 * ROLE: Specialist in Data Entity Resolution and Retail Analytics (LatAm Market).
 *
 * Executes a strict 1:1 mapping between:
 *   - INPUT  : data/master-data.json   (Raw Scraper Output)
 *   - CATALOG: ontology/product_matcher_catalog_v4.json (Canonical Source of Truth)
 *
 * Output: scripts/entity_resolution_output.json
 *
 * Run: node scripts/entity_resolution.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT         = path.join(__dirname, '..');
const RAW_PATH     = path.join(ROOT, 'data', 'master-data.json');
const CATALOG_PATH = path.join(ROOT, 'ontology', 'product_matcher_catalog_v4.json');
const OUTPUT_PATH  = path.join(__dirname, 'entity_resolution_output.json');

// ─── Constants ───────────────────────────────────────────────────────────────

/** Standard measured item categories (catalog-managed, sold by weight/volume) */
const STANDARD_MEASURED_CATEGORIES = new Set([
  'arroz', 'aceite', 'azucar-blanca', 'azucar-rubia', 'harina',
  'avena', 'fideos', 'huevos', 'leche-evaporada', 'leche-fresca',
  'mantequilla', 'lentejas', 'frijol-canario', 'pan-molde'
]);

/** Fresh retail item categories (sold by bundle/unit at the counter) */
const FRESH_RETAIL_CATEGORIES = new Set([
  'pollo', 'verduras', 'frutas', 'hierbas', 'vegetales'
]);

/** Fresh units — only these are valid for fresh items */
const FRESH_UNITS  = new Set(['atado', 'manojo', 'und', 'paquete', 'at.', 'bundle']);

/** Standard units (weight / volume) */
const STANDARD_UNITS = new Set(['kg', 'lt', 'g', 'ml', 'l', 'gr', 'lts', 'kgs']);

/** Unit normalisation map: raw token → canonical token */
const UNIT_NORM = {
  kg: 'kg', kilo: 'kg', kgs: 'kg', kilogram: 'kg',
  lt: 'lt', litro: 'lt', lts: 'lt', liter: 'lt', l: 'lt',
  und: 'und', unidad: 'und', un: 'und', pza: 'und', unit: 'unit',
  g: 'g', gr: 'g', grs: 'g',
  ml: 'ml', cc: 'ml', cm3: 'ml',
  atado: 'atado', 'at.': 'atado', bundle: 'atado',
  manojo: 'manojo',
  paquete: 'paquete',
};

/** Unit conversion to base (kg for mass, lt for volume) */
const UNIT_TO_BASE = {
  kg: 1, kgs: 1, kilo: 1, kilogram: 1,
  g: 1 / 1000, gr: 1 / 1000, grs: 1 / 1000,
  lt: 1, lts: 1, litro: 1, liter: 1, l: 1,
  ml: 1 / 1000, cc: 1 / 1000, cm3: 1 / 1000,
  und: 1, un: 1, pza: 1, unit: 1,
};

/** Normalised base unit name */
const UNIT_NORMALIZED = {
  kg: 'kilogram', kgs: 'kilogram', kilo: 'kilogram', kilogram: 'kilogram',
  g: 'kilogram', gr: 'kilogram', grs: 'kilogram',
  lt: 'liter', lts: 'liter', litro: 'liter', liter: 'liter', l: 'liter',
  ml: 'liter', cc: 'liter', cm3: 'liter',
  und: 'unit', un: 'unit', pza: 'unit', unit: 'unit',
  atado: 'bundle', 'at.': 'bundle', bundle: 'bundle',
  manojo: 'bundle',
  paquete: 'bundle',
};

/** Packaging / presentation noise tokens to strip */
const NOISE_TOKENS = new Set([
  'bolsa', 'paquete', 'pack', 'unidad', 'caja', 'lata',
  'sachet', 'sobre', 'frasco', 'tarro', 'barra', 'bandeja',
  'display', 'sixpack', 'tripack', 'doypack', 'botella', 'bidón',
  'x', 'de', 'en', 'con', 'para', 'al', 'el', 'la', 'los', 'las', 'del', 'y'
]);

/** Known brand tokens — ignored during matching */
const BRAND_TOKENS = new Set([
  'faraon', 'faraón', 'costeño', 'costeno', 'paisana', 'vallenorte',
  'tottus', 'wong', 'metro', 'plazavea', 'plaza', 'vea',
  'primor', 'bells', 'cocinero', 'gloria', 'laive', 'nestle',
  'ideal', 'donofrio', 'costa', 'winters', 'alicorp',
  'sayon', 'molitalia', 'benoti', 'fleischmann', 'nicolini', 'anita',
  'blanca', 'flor'
]);

/** Category mapping from scraper categoria → catalog categoria (lowercase) */
const SCRAPER_TO_CATALOG_CAT = {
  'arroz':          'Arroz',
  'aceite':         'Aceite',
  'azucar-blanca':  'Azucar',
  'azucar-rubia':   'Azucar',
  'harina':         'Harina',
  'avena':          'Avena',
  'fideos':         'Fideos',
  'pollo':          'Pollo',
  'huevos':         'Huevos',
  'leche-evaporada': 'Leche',
  'leche-fresca':   'Leche',
  'mantequilla':    'Mantequilla',
  'lentejas':       'Lentejas',
  'frijol-canario': 'Frijol',
  'pan-molde':      'Pan',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Remove diacritics / accent marks */
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalise text: remove diacritics → lowercase → trim */
function normalizeText(str) {
  if (typeof str !== 'string') return '';
  return removeDiacritics(str).toLowerCase().trim();
}

/** Derive canonical_id from canonical_name (slug) */
function toCanonicalId(name) {
  return removeDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Parse value + unit from raw name string */
function parsePresentationFromName(name) {
  const norm = normalizeText(name);
  // Matches: "750 g", "5 kg", "900ml", "1.5 lt", "0.9 l"
  const regex = /(\d+(?:\.\d+)?)\s*(ml|cc|cm3|lts?|litros?|kgs?|kilos?|grs?|g|und|un|pza|kg|atado|manojo|paquete)\b/i;
  const m = norm.match(regex);
  if (!m) return { value: null, rawUnit: null };
  return { value: parseFloat(m[1]), rawUnit: m[2].toLowerCase() };
}

/** Convert raw value+unit to base unit (kg or lt or 'unit') */
function toBaseUnit(value, rawUnit) {
  if (value == null) return { baseValue: null, baseUnit: null };
  const factor = UNIT_TO_BASE[rawUnit] ?? 1;
  const baseUnit = UNIT_NORMALIZED[rawUnit] ?? rawUnit;
  return { baseValue: +(value * factor).toFixed(6), baseUnit };
}

/** Classify item into STANDARD_MEASURED_ITEMS | FRESH_RETAIL_ITEMS | NON_STANDARD_ITEM */
function classifyItem(scraperCategoria, unit) {
  const cat = (scraperCategoria || '').toLowerCase();
  if (STANDARD_MEASURED_CATEGORIES.has(cat)) return 'STANDARD_MEASURED_ITEMS';
  if (FRESH_RETAIL_CATEGORIES.has(cat))      return 'FRESH_RETAIL_ITEMS';
  if (unit && FRESH_UNITS.has(unit))          return 'FRESH_RETAIL_ITEMS';
  return 'NON_STANDARD_ITEM';
}

/** Jaccard similarity between two string arrays */
function jaccard(a, b) {
  if (!a.length && !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

/** Tokenise a string for fuzzy matching (strips noise, brands, digits) */
function tokenise(str) {
  return normalizeText(str)
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 0 && !NOISE_TOKENS.has(t) && !BRAND_TOKENS.has(t) && !/^\d+$/.test(t));
}

/** Normalise a catalog unit string (upper-cased) to our standard lowercase */
function normCatalogUnit(u) {
  if (!u) return null;
  return UNIT_NORM[u.toLowerCase()] ?? u.toLowerCase();
}

/** Build the catalog unit in the same 'base' space as scraped items */
function catalogBaseUnit(entry) {
  const uNorm = normCatalogUnit(entry.unit);
  return UNIT_NORMALIZED[uNorm] ?? uNorm;
}

// ─── Catalog Loading ─────────────────────────────────────────────────────────

function loadCatalog(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return raw.map((entry, idx) => {
    const canonical_id = toCanonicalId(entry.canonical_name);
    const catUnit = normCatalogUnit(entry.unit);
    const catBaseUnit = UNIT_NORMALIZED[catUnit] ?? catUnit;

    // Catalog presentation already in proper base unit (KG, LT, UND)
    // Convert if necessary (catalog stores KG/LT directly)
    const factor = UNIT_TO_BASE[catUnit] ?? 1;
    const basePresValue = entry.presentation != null
      ? +(entry.presentation * factor).toFixed(6)
      : null;

    // Pre-tokenise canonical_name + aliases + semantic_tokens
    const canonTokens   = tokenise(entry.canonical_name);
    const familyTokens  = entry.family_name ? tokenise(entry.family_name) : [];
    const semanticToks  = Array.isArray(entry.semantic_tokens) ? entry.semantic_tokens.map(t => normalizeText(t)) : [];

    // All alias strings (normalised)
    const aliasStrings  = Array.isArray(entry.aliases) ? entry.aliases.map(a => normalizeText(a)) : [];
    const aliasTokenSets = aliasStrings.map(a => tokenise(a));

    const allTokens = Array.from(new Set([...canonTokens, ...familyTokens, ...semanticToks]));

    return {
      ...entry,
      canonical_id,
      _catUnit: catUnit,
      _catBaseUnit: catBaseUnit,
      _catBasePresValue: basePresValue,
      _tokens: allTokens,
      _aliasStrings: aliasStrings,
      _aliasTokenSets: aliasTokenSets,
      _idx: idx,
    };
  });
}

// ─── Raw Data Flattening ──────────────────────────────────────────────────────

function flattenRawData(masterData) {
  const items = [];
  const supermercados = masterData.supermercados || {};
  for (const [superName, categories] of Object.entries(supermercados)) {
    for (const [catName, products] of Object.entries(categories)) {
      for (const product of products) {
        items.push({ ...product, _superName: superName, _catName: catName });
      }
    }
  }
  return items;
}

// ─── Normaliser for a Single Raw Item ────────────────────────────────────────

function normaliseRawItem(item) {
  const rawName  = item.nombre || '';
  const normName = normalizeText(rawName);

  // Prefer explicit presentación fields, fall back to name-parsed values
  let value   = item.presentacion?.valor ?? null;
  let rawUnit = item.presentacion?.unidad ?? null;

  if (rawUnit) rawUnit = normalizeText(rawUnit);

  // If not present in scraper fields, try to parse from name
  if (value == null || rawUnit == null) {
    const parsed = parsePresentationFromName(rawName);
    if (value   == null) value   = parsed.value;
    if (rawUnit == null) rawUnit = parsed.rawUnit;
  }

  const { baseValue, baseUnit } = toBaseUnit(value, rawUnit);
  const normUnit   = UNIT_NORM[rawUnit] ?? rawUnit;
  const itemClass  = classifyItem(item.categoria, normUnit);
  const nameTokens = tokenise(rawName);

  // Extract brand: typically the FIRST ALL-CAPS word in the nombre
  const brandMatch = rawName.match(/^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{1,20}?)(?:\s+[A-Z][a-z]|\s+[a-z])/);
  const detectedBrand = brandMatch ? brandMatch[1].trim() : null;

  // Product base = name tokens minus brand tokens
  const productBaseTokens = nameTokens.filter(t => !BRAND_TOKENS.has(t));

  return {
    raw_id:        item.id,
    raw_name:      rawName,
    norm_name:     normName,
    categoria:     item.categoria,
    super:         item.super || item._superName,
    parsed_value:  value,
    parsed_unit:   normUnit,
    base_value:    baseValue,
    base_unit:     baseUnit,
    item_class:    itemClass,
    detected_brand: detectedBrand,
    name_tokens:   nameTokens,
    product_base_tokens: productBaseTokens,
  };
}

// ─── Matching Cascade ─────────────────────────────────────────────────────────

const CONFIDENCE = {
  EXACT_ALIAS:   1.00,
  STRUCTURED:    0.95,
  FUZZY_HIGH_CAT:  0.90,
  FUZZY_HIGH_FALL: 0.85,
  FUZZY_MID:     0.85,
};

/**
 * Check freshness mismatch rules.
 * Returns { ok: true } if match is fine, or { ok: false, reason } if blocked.
 */
function checkFreshRules(normed, candidate) {
  if (normed.item_class !== 'FRESH_RETAIL_ITEMS') return { ok: true };

  const rawFreshUnit = normed.parsed_unit;
  const catFreshUnit = normCatalogUnit(candidate.unit);

  // If the raw item is fresh, the catalog entry must also be fresh (bundle)
  if (!FRESH_UNITS.has(catFreshUnit) && STANDARD_UNITS.has(catFreshUnit || '')) {
    return { ok: false, reason: 'weight_vs_bundle' };
  }

  // Matching fresh units must be identical
  if (FRESH_UNITS.has(rawFreshUnit) && rawFreshUnit !== catFreshUnit) {
    return { ok: false, reason: 'unit_conflict' };
  }

  if (!rawFreshUnit) {
    return { ok: false, reason: 'unknown_unit' };
  }

  return { ok: true };
}

/**
 * Level 1 — Exact / Alias match.
 * Compares normalised raw_name against canonical_name and all alias strings.
 */
function level1Match(normed, catalog) {
  const normRaw = normed.norm_name;
  for (const entry of catalog) {
    if (normalizeText(entry.canonical_name) === normRaw) {
      return { entry, method: 'exact_alias', matched_alias: entry.canonical_name, score: CONFIDENCE.EXACT_ALIAS };
    }
    for (const alias of entry._aliasStrings) {
      if (alias === normRaw) {
        return { entry, method: 'exact_alias', matched_alias: alias, score: CONFIDENCE.EXACT_ALIAS };
      }
    }
  }
  return null;
}

/**
 * Level 2 — Structured match: product_base + value + unit (ignoring brand).
 * Requires same base unit AND same normalised presentation value.
 */
function level2Match(normed, catalog) {
  if (normed.base_value == null) return null;

  const candidates = [];
  for (const entry of catalog) {
    // Unit must match (base unit compatibility)
    if (entry._catBaseUnit !== normed.base_unit) continue;
    // Presentation value must match (within 1%)
    if (entry._catBasePresValue == null) continue;
    const ratio = normed.base_value / entry._catBasePresValue;
    if (ratio < 0.99 || ratio > 1.01) continue;

    // Product base token overlap
    const tokOvlap = jaccard(normed.product_base_tokens, entry._tokens);
    if (tokOvlap > 0) {
      candidates.push({ entry, tokOvlap });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.tokOvlap - a.tokOvlap);
  const best = candidates[0];
  if (best.tokOvlap >= 0.3) {
    return { entry: best.entry, method: 'structured', matched_alias: null, score: CONFIDENCE.STRUCTURED };
  }
  return null;
}

/**
 * Level 3 — Fuzzy High: Jaccard similarity > 0.90.
 * With or without category match (different scores).
 */
function level3Match(normed, catalog) {
  const scraperCat = SCRAPER_TO_CATALOG_CAT[normed.categoria] || null;
  let best = null;
  let bestScore = -Infinity;

  for (const entry of catalog) {
    // Unit collision block: base units must match
    if (normed.base_value != null && entry._catBasePresValue != null) {
      if (entry._catBaseUnit !== normed.base_unit) continue;
      const ratio = normed.base_value / entry._catBasePresValue;
      if (ratio < 0.99 || ratio > 1.01) continue;
    }

    const sim = jaccard(normed.name_tokens, entry._tokens);
    if (sim <= 0.90) continue;

    const catMatch = scraperCat && entry.categoria === scraperCat;
    const confidence = catMatch ? CONFIDENCE.FUZZY_HIGH_CAT : CONFIDENCE.FUZZY_HIGH_FALL;

    const adjusted = catMatch ? sim : sim - 0.05;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      best = { entry, sim, catMatch, confidence };
    }
  }

  if (!best) return null;
  return {
    entry: best.entry,
    method: 'fuzzy',
    matched_alias: null,
    score: best.confidence,
    raw_sim: best.sim,
  };
}

/**
 * Level 4 — Fuzzy Mid: Jaccard similarity 0.85–0.90.
 * Valid ONLY if unit AND category match perfectly.
 */
function level4Match(normed, catalog) {
  const scraperCat = SCRAPER_TO_CATALOG_CAT[normed.categoria] || null;
  let best = null;
  let bestSim = -Infinity;

  for (const entry of catalog) {
    // Category must match
    if (!scraperCat || entry.categoria !== scraperCat) continue;

    // Unit must match exactly (base unit)
    if (entry._catBaseUnit !== normed.base_unit) continue;

    // Presentation must match (within 1%)
    if (normed.base_value != null && entry._catBasePresValue != null) {
      const ratio = normed.base_value / entry._catBasePresValue;
      if (ratio < 0.99 || ratio > 1.01) continue;
    }

    const sim = jaccard(normed.name_tokens, entry._tokens);
    if (sim < 0.85 || sim > 0.90) continue;

    if (sim > bestSim) {
      bestSim = sim;
      best = entry;
    }
  }

  if (!best) return null;
  return {
    entry: best,
    method: 'fuzzy',
    matched_alias: null,
    score: CONFIDENCE.FUZZY_MID,
    raw_sim: bestSim,
  };
}

// ─── Main Resolver ────────────────────────────────────────────────────────────

function resolveItem(normed, catalog) {
  // NON_STANDARD_ITEM → immediate MANUAL_REVIEW
  if (normed.item_class === 'NON_STANDARD_ITEM') {
    return buildResult(normed, null, 'MANUAL_REVIEW', null, null);
  }

  // Cascade
  let hit = level1Match(normed, catalog) || level2Match(normed, catalog) ||
            level3Match(normed, catalog) || level4Match(normed, catalog);

  if (!hit) {
    return buildResult(normed, null, 'MANUAL_REVIEW', null, null);
  }

  // Fresh item gating
  if (normed.item_class === 'FRESH_RETAIL_ITEMS') {
    const freshCheck = checkFreshRules(normed, hit.entry);
    if (!freshCheck.ok) {
      return buildResult(normed, null, 'MANUAL_REVIEW', hit, freshCheck.reason);
    }
  }

  // Standard vs Fresh block: never auto-match weight unit to bundle unit
  const catBaseUnit = hit.entry._catBaseUnit;
  if (normed.base_unit === 'kilogram' && catBaseUnit === 'bundle') {
    return buildResult(normed, null, 'MANUAL_REVIEW', hit, 'weight_vs_bundle');
  }
  if (normed.base_unit === 'bundle' && catBaseUnit === 'kilogram') {
    return buildResult(normed, null, 'MANUAL_REVIEW', hit, 'weight_vs_bundle');
  }

  return buildResult(normed, hit.entry, 'AUTO_MATCH', hit, null);
}

function buildResult(normed, matchedEntry, status, hit, freshMismatch) {
  // Determine unit_type and retail_unit
  let unit_type   = 'standard';
  let retail_unit = normed.parsed_unit || null;

  if (normed.item_class === 'FRESH_RETAIL_ITEMS' || FRESH_UNITS.has(retail_unit)) {
    unit_type = 'fresh';
  }

  // Top candidate list for debug
  let match_candidates = [];
  if (hit) {
    match_candidates = [{
      canonical_name: hit.entry.canonical_name,
      score: hit.score ?? null,
    }];
  }

  return {
    raw_id:           normed.raw_id,
    canonical_id:     matchedEntry ? matchedEntry.canonical_id   : null,
    confidence_score: hit ? (hit.score ?? 0)          : 0,
    match_method:     hit ? hit.method                           : 'none',
    status,
    unit_type,
    retail_unit,
    fresh_mismatch_type: freshMismatch ?? null,
    debug: {
      raw_name:        normed.raw_name,
      parsed_value:    normed.parsed_value,
      parsed_unit:     normed.parsed_unit,
      matched_alias:   hit ? (hit.matched_alias ?? null) : null,
      match_candidates,
    },
  };
}

// ─── Ambiguity & Reporting ────────────────────────────────────────────────────

function computeAmbiguity(normed, catalog) {
  if (normed.item_class === 'NON_STANDARD_ITEM') return [];
  const scraperCat = SCRAPER_TO_CATALOG_CAT[normed.categoria] || null;

  const allScored = catalog
    .map(entry => {
      const sim = jaccard(normed.name_tokens, entry._tokens);
      if (sim === 0) return null;
      const catMatch = scraperCat && entry.categoria === scraperCat;
      return { canonical_name: entry.canonical_name, sim, catMatch };
    })
    .filter(Boolean)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5);

  return allScored;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

function run() {
  console.log('Loading master-data.json ...');
  const masterData = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));

  console.log('Loading product_matcher_catalog_v4.json ...');
  const catalog = loadCatalog(CATALOG_PATH);
  console.log(`  → ${catalog.length} catalog entries loaded.`);

  const rawItems = flattenRawData(masterData);
  console.log(`  → ${rawItems.length} raw items to resolve.`);

  const mappings = [];
  let autoMatchCount = 0;
  let manualCount    = 0;
  let freshCount     = 0;
  let noCandidate    = [];

  // Track raw_id → canonical_id uniqueness (1:1 rule)
  const usedRawIds = new Map();

  // For ambiguity tracking: raw_id → scored candidates (top 5)
  const ambiguityMap = new Map();

  for (const item of rawItems) {
    if (usedRawIds.has(item.id)) {
      // Duplicate raw_id — skip (shouldn't happen in well-formed data)
      continue;
    }
    usedRawIds.set(item.id, true);

    const normed = normaliseRawItem(item);

    if (normed.item_class === 'FRESH_RETAIL_ITEMS') freshCount++;

    const result = resolveItem(normed, catalog);

    if (result.status === 'AUTO_MATCH') autoMatchCount++;
    else {
      manualCount++;
      if (!result.canonical_id && result.debug.match_candidates.length === 0) {
        noCandidate.push(result.raw_id);
      }
    }

    // Compute ambiguity scores for top 5 candidates
    const topCandidates = computeAmbiguity(normed, catalog);
    if (topCandidates.length >= 2) {
      // Ambiguity = difference between 1st and 2nd score (smaller = more ambiguous)
      const gap = topCandidates[0].sim - (topCandidates[1]?.sim ?? 0);
      ambiguityMap.set(result.raw_id, {
        raw_name: normed.raw_name,
        gap,
        top5: topCandidates,
        matched: result.canonical_id,
        score: result.confidence_score,
      });
    }

    // Inject top5 into debug
    result.debug.match_candidates = topCandidates;

    mappings.push(result);
  }

  const totalRecords = rawItems.length;
  const matchRate    = totalRecords > 0 ? +(autoMatchCount / totalRecords).toFixed(4) : 0;

  // Top 10 most ambiguous matches (smallest gap between candidates 1 and 2)
  const top10Ambiguous = [...ambiguityMap.values()]
    .filter(a => a.matched) // only among resolved
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 10)
    .map(a => ({
      raw_name:       a.raw_name,
      matched:        a.matched,
      score:          a.score,
      gap_score:      +a.gap.toFixed(4),
      top_candidates: a.top5,
    }));

  const output = {
    execution_stats: {
      timestamp:      new Date().toISOString(),
      total_records:  totalRecords,
      auto_match:     autoMatchCount,
      manual_review:  manualCount,
      match_rate:     matchRate,
      fresh_items_count: freshCount,
      no_candidate_raw_ids: noCandidate,
    },
    reporting: {
      top10_ambiguous_matches: top10Ambiguous,
      raw_ids_with_no_candidate: noCandidate,
    },
    mappings,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // ─── Console Summary ─────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PrecioJusto Entity Resolution — Execution Complete  ');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Timestamp       : ${output.execution_stats.timestamp}`);
  console.log(`  Total records   : ${totalRecords}`);
  console.log(`  AUTO_MATCH      : ${autoMatchCount}  (${(matchRate * 100).toFixed(1)}%)`);
  console.log(`  MANUAL_REVIEW   : ${manualCount}  (${((1 - matchRate) * 100).toFixed(1)}%)`);
  console.log(`  Fresh items     : ${freshCount}`);
  console.log(`  No-candidate IDs: ${noCandidate.length}`);
  console.log(`  Output          : ${OUTPUT_PATH}`);
  console.log('══════════════════════════════════════════════════════');

  console.log('\n  Top 10 Most Ambiguous Matches:');
  top10Ambiguous.forEach((a, i) => {
    console.log(`  ${i + 1}. [gap=${a.gap_score}] "${a.raw_name}"`);
    console.log(`     → matched: ${a.matched}  (score: ${a.score})`);
    if (a.top_candidates.length >= 2) {
      console.log(`     rivals: ${a.top_candidates.slice(0, 3).map(c => `${c.canonical_name}(${c.sim.toFixed(2)})`).join(', ')}`);
    }
  });

  if (noCandidate.length > 0) {
    console.log(`\n  ⚠ Raw IDs with no catalog candidate (first 20):`);
    noCandidate.slice(0, 20).forEach(id => console.log(`    - ${id}`));
    if (noCandidate.length > 20) {
      console.log(`    ... and ${noCandidate.length - 20} more (see output JSON).`);
    }
  }

  console.log('\n  Done.\n');
}

run();
