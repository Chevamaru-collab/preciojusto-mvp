/**
 * PrecioJusto — Product Matcher Engine v1
 *
 * Matches raw scraped product names to canonical products from
 * product_matcher_catalog_v1.json for cross-supermarket price comparison.
 *
 * Usage:
 *   const matcher = require('./product_matcher_engine');
 *   const result = matcher.match({ name: 'ACEITE PRIMOR BOTELLA 900 ML', price: 8.9, supermarket: 'Metro' });
 *
 * Run standalone:
 *   node ontology/product_matcher_engine.js "ACEITE PRIMOR BOTELLA 900 ML"
 */

const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────

/** Noise tokens — packaging and presentation words to strip before scoring */
const NOISE_TOKENS = new Set([
  'botella', 'bolsa', 'paquete', 'pack', 'unidad', 'caja',
  'lata', 'sachet', 'sobre', 'frasco', 'tarro', 'barra',
  'bandeja', 'display', 'sixpack', 'tripack', 'doypack',
  'x', 'de', 'en', 'con', 'para', 'al', 'el', 'la', 'los', 'las', 'del', 'y'
]);

/** Known brand tokens to strip — they shouldn't influence matching */
const BRAND_TOKENS = new Set([
  'primor', 'bells', 'cocinero', 'gloria', 'laive', 'nestle',
  'ideal', 'donofrio', 'costa', 'winters', 'alicorp', 'tottus',
  'wong', 'metro', 'plaza', 'vea', 'sayon', 'molitalia',
  'benoti', 'fleischmann', 'nicolini', 'anita', 'blanca flor'
]);

/** Unit aliases → normalized unit name */
const UNIT_ALIASES = {
  'ml': 'liter',
  'cc': 'liter',
  'cm3': 'liter',
  'lt': 'liter',
  'l': 'liter',
  'lts': 'liter',
  'g': 'kilogram',
  'gr': 'kilogram',
  'grs': 'kilogram',
  'kg': 'kilogram',
  'kgs': 'kilogram',
  'und': 'unit',
  'un': 'unit',
  'pza': 'unit'
};

/** Conversion factor to base unit (liter, kilogram, unit) */
const UNIT_CONVERSION = {
  'ml': 1 / 1000,
  'cc': 1 / 1000,
  'cm3': 1 / 1000,
  'lt': 1,
  'l': 1,
  'lts': 1,
  'g': 1 / 1000,
  'gr': 1 / 1000,
  'grs': 1 / 1000,
  'kg': 1,
  'kgs': 1,
  'und': 1,
  'un': 1,
  'pza': 1
};

/** Scoring weights */
const WEIGHT_TOKEN = 0.50;
const WEIGHT_PRESENTATION = 0.30;
const WEIGHT_UNIT = 0.20;

// ─── Parsing ─────────────────────────────────────────────────

/**
 * Parse a raw scraped product name into tokens, presentation value, and unit.
 *
 * @param {string} name  Raw product name, e.g. "ACEITE PRIMOR BOTELLA 900 ML"
 * @returns {{ tokens: string[], presentation: number|null, unit: string|null, normalizedUnit: string|null, normalizedPresentation: number|null }}
 */
function parseScrapedName(name) {
  const raw = name.trim();

  // Extract presentation + unit pattern: number followed by unit abbreviation
  // Handles: "900 ML", "0.9 LT", "1.5 KG", "30 UND", "900ML" (no space)
  const presentationRegex = /(\d+(?:\.\d+)?)\s*(ml|cc|cm3|lt|lts|l|g|gr|grs|kg|kgs|und|un|pza)\b/i;
  const match = raw.match(presentationRegex);

  let presentation = null;
  let unit = null;
  let normalizedUnit = null;
  let normalizedPresentation = null;
  let nameWithoutPresentation = raw;

  if (match) {
    presentation = parseFloat(match[1]);
    unit = match[2].toLowerCase();
    normalizedUnit = UNIT_ALIASES[unit] || null;
    const conversionFactor = UNIT_CONVERSION[unit] || 1;
    normalizedPresentation = +(presentation * conversionFactor).toFixed(6);
    // Remove the matched presentation+unit from the name for tokenization
    nameWithoutPresentation = raw.replace(match[0], ' ');
  }

  // Tokenize: lowercase, split on non-alpha, filter noise and brands
  const allTokens = nameWithoutPresentation
    .toLowerCase()
    .split(/[^a-záéíóúñü]+/)
    .filter(t => t.length > 0);

  const tokens = allTokens.filter(t => !NOISE_TOKENS.has(t) && !BRAND_TOKENS.has(t));

  return {
    tokens,
    presentation,
    unit,
    normalizedUnit,
    normalizedPresentation
  };
}

// ─── Catalog Loading & Tokenization ──────────────────────────

/**
 * Tokenize a canonical_name for comparison.
 * Extracts only alphabetic tokens, lowercased, noise/brands stripped.
 *
 * @param {string} canonicalName
 * @returns {string[]}
 */
function tokenizeCanonical(canonicalName) {
  return canonicalName
    .toLowerCase()
    .split(/[^a-záéíóúñü]+/)
    .filter(t => t.length > 0 && !NOISE_TOKENS.has(t) && !BRAND_TOKENS.has(t))
    // Also remove numeric-only tokens (presentation values embedded in canonical names)
    .filter(t => !/^\d+$/.test(t));
}

/**
 * Load and preprocess the matcher catalog.
 * Adds a `_tokens` field with precomputed canonical name tokens.
 *
 * @param {string} [catalogPath]  Path to product_matcher_catalog_v1.json
 * @returns {object[]}
 */
function loadCatalog(catalogPath) {
  const filePath = catalogPath || path.join(__dirname, 'product_matcher_catalog_v1.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Precompute tokens + normalized presentation for each entry
  return data.map(entry => {
    const tokens = tokenizeCanonical(entry.canonical_name);

    // Compute normalized presentation for the catalog entry
    let normalizedPresentation = entry.presentation;
    if (entry.presentation != null && entry.unit) {
      const unitLower = entry.unit.toLowerCase();
      const factor = UNIT_CONVERSION[unitLower];
      if (factor != null) {
        normalizedPresentation = +(entry.presentation * factor).toFixed(6);
      }
    }

    return {
      ...entry,
      _tokens: tokens,
      _normalizedPresentation: normalizedPresentation
    };
  });
}

// ─── Scoring ─────────────────────────────────────────────────

/**
 * Jaccard similarity between two token arrays.
 * |intersection| / |union|
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number} 0..1
 */
function jaccardSimilarity(a, b) {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Presentation similarity.
 * Returns 1.0 if both values are equal; decays based on the ratio between them.
 * Returns 0 if either value is null.
 *
 * @param {number|null} a  Normalized scraped presentation
 * @param {number|null} b  Normalized catalog presentation
 * @returns {number} 0..1
 */
function presentationSimilarity(a, b) {
  if (a == null || b == null) return 0;
  if (a === 0 && b === 0) return 1;
  if (a === 0 || b === 0) return 0;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return ratio;
}

/**
 * Compute match score for a single catalog candidate.
 *
 * @param {object} parsed  Output of parseScrapedName
 * @param {object} entry   Catalog entry with _tokens and _normalizedPresentation
 * @returns {number} 0..1
 */
function scoreCandidate(parsed, entry) {
  // Token match (Jaccard)
  const tokenScore = jaccardSimilarity(parsed.tokens, entry._tokens);

  // Presentation match (ratio similarity after normalization)
  const presScore = presentationSimilarity(
    parsed.normalizedPresentation,
    entry._normalizedPresentation
  );

  // Unit compatibility: 1 if same normalized unit, 0 otherwise
  let unitScore = 0;
  if (parsed.normalizedUnit && entry.normalized_unit) {
    unitScore = parsed.normalizedUnit === entry.normalized_unit ? 1 : 0;
  } else if (!parsed.normalizedUnit && !entry.normalized_unit) {
    // Both have no unit — compatible
    unitScore = 1;
  }

  return +(tokenScore * WEIGHT_TOKEN + presScore * WEIGHT_PRESENTATION + unitScore * WEIGHT_UNIT).toFixed(4);
}

// ─── Main Matching ───────────────────────────────────────────

/**
 * Match a scraped product against the catalog.
 *
 * @param {object} scrapedProduct  { name, price?, supermarket? }
 * @param {object[]} [catalog]     Preloaded catalog (if not provided, loads from disk)
 * @param {number} [topN=3]       Number of top candidates to return
 * @returns {{ raw_name: string, candidates: object[], best_match: string|null }}
 */
function match(scrapedProduct, catalog, topN = 3) {
  if (!catalog) {
    catalog = loadCatalog();
  }

  const parsed = parseScrapedName(scrapedProduct.name);

  // Score all candidates with token-overlap guard
  let scored = catalog
    .map(entry => {

      // Prevent matches with zero token overlap
      const tokenOverlap = jaccardSimilarity(parsed.tokens, entry._tokens);
      if (tokenOverlap === 0) return null;

      const score = scoreCandidate(parsed, entry);

      return {
        canonical_name: entry.canonical_name,
        family_name: entry.family_name,
        score
      };
    })
    .filter(Boolean);

  // Remove weak matches
  scored = scored.filter(c => c.score >= 0.55);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top N
  const candidates = scored.slice(0, topN);

  return {
    raw_name: scrapedProduct.name,
    candidates,
    best_match: candidates.length > 0 ? candidates[0].canonical_name : null
  };
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  parseScrapedName,
  normalizeUnit: (value, unit) => {
    const u = unit.toLowerCase();
    const normalizedUnit = UNIT_ALIASES[u] || null;
    const factor = UNIT_CONVERSION[u] || 1;
    const normalizedValue = +(value * factor).toFixed(6);
    return { normalizedValue, normalizedUnit };
  },
  tokenizeCanonical,
  jaccardSimilarity,
  presentationSimilarity,
  scoreCandidate,
  loadCatalog,
  match,
  // Expose constants for testing
  NOISE_TOKENS,
  BRAND_TOKENS,
  UNIT_ALIASES,
  UNIT_CONVERSION
};

// ─── CLI ─────────────────────────────────────────────────────

if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.log('Usage: node product_matcher_engine.js "ACEITE PRIMOR BOTELLA 900 ML"');
    process.exit(1);
  }

  console.log('Loading catalog...');
  const catalog = loadCatalog();
  console.log(`Loaded ${catalog.length} catalog entries.\n`);

  const result = match({ name }, catalog);
  console.log(JSON.stringify(result, null, 2));
}
