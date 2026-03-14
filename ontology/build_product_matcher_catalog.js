/**
 * Product Matcher Catalog Builder
 * 
 * Transforms canonical_products_final.json into a matcher-ready catalog
 * for the PrecioJusto Product Matcher Engine.
 * 
 * Input:  ontology/canonical_products_final.json
 * Output: ontology/product_matcher_catalog_v1.json
 * 
 * Run: node ontology/build_product_matcher_catalog.js
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────
const INPUT_PATH = path.join(__dirname, 'canonical_products_final.json');
const OUTPUT_PATH = path.join(__dirname, 'product_matcher_catalog_v1.json');
const SUMMARY_PATH = path.join(__dirname, 'product_matcher_catalog_summary.md');

// Case-insensitive unit normalization map
const UNIT_NORMALIZATION = {
  'kg':  'kilogram',
  'g':   'gram',
  'gr':  'gram',
  'lt':  'liter',
  'l':   'liter',
  'ml':  'milliliter',
  'und': 'unit',
  'cm3': 'milliliter'
};

// ─── Load input ──────────────────────────────────────────────
console.log('📖 Reading canonical_products_final.json...');
const canonical = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
console.log(`   Found ${canonical.length} canonical products.`);

// ─── Anomaly tracking ────────────────────────────────────────
let missingUnitCount = 0;
let missingPresentationCount = 0;
let emptySubcategoriaCount = 0;
const normalizedUnitDistribution = {};
const anomalies = [];

// ─── Transform ───────────────────────────────────────────────
console.log('🔄 Transforming to matcher catalog...');

const catalog = canonical.map((entry, i) => {
  // Unit normalization — robust check for null, undefined, ''
  let normalizedUnit = null;

  if (!entry.unit) {
    // Missing/empty unit → null (incomplete data, NOT "unit")
    missingUnitCount++;
    anomalies.push(`Entry ${i}: "${entry.canonical_name}" has missing unit`);
  } else {
    const key = entry.unit.toLowerCase();
    normalizedUnit = UNIT_NORMALIZATION[key] || null;
    if (!normalizedUnit) {
      anomalies.push(`Entry ${i}: "${entry.canonical_name}" has unknown unit "${entry.unit}"`);
    }
  }

  // Track normalized_unit distribution
  const nuKey = normalizedUnit || '(null)';
  normalizedUnitDistribution[nuKey] = (normalizedUnitDistribution[nuKey] || 0) + 1;

  // Presentation — parse to number or null (Rule 3)
  let presentation = null;
  if (entry.presentation && entry.presentation !== '') {
    const parsed = parseFloat(entry.presentation);
    presentation = isNaN(parsed) ? null : parsed;
    if (isNaN(parsed)) {
      anomalies.push(`Entry ${i}: "${entry.canonical_name}" has unparseable presentation "${entry.presentation}"`);
    }
  } else {
    missingPresentationCount++;
    anomalies.push(`Entry ${i}: "${entry.canonical_name}" has empty presentation`);
  }

  // Subcategoria tracking
  if (!entry.subcategoria) {
    emptySubcategoriaCount++;
  }

  // family_name — safe construction (Rule 4)
  const familyName = [entry.categoria, entry.subcategoria].filter(Boolean).join(' ');

  return {
    canonical_name: entry.canonical_name,
    family_name: familyName,
    categoria: entry.categoria,
    subcategoria: entry.subcategoria,
    presentation: presentation,
    unit: entry.unit || '',	// preserve original; default empty string for null/undefined
    normalized_unit: normalizedUnit,
    comparison_group: familyName,
    price_unit: normalizedUnit
  };
});

// ─── Write catalog ───────────────────────────────────────────
console.log('💾 Writing product_matcher_catalog_v1.json...');
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`   ✅ Generated ${catalog.length} matcher catalog entries.`);

// ─── Write summary report ────────────────────────────────────
console.log('📝 Writing product_matcher_catalog_summary.md...');

const unitDistLines = Object.entries(normalizedUnitDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([unit, count]) => `| ${unit} | ${count} |`)
  .join('\n');

const anomalyLines = anomalies.length > 0
  ? anomalies.map(a => `- ${a}`).join('\n')
  : '- None detected';

const summary = `# Product Matcher Catalog v1 — Summary Report

**Generated**: ${new Date().toISOString()}

## Metrics

| Metric | Value |
|--------|-------|
| Total canonical products processed | ${canonical.length} |
| Matcher catalog entries generated | ${catalog.length} |
| Missing unit count | ${missingUnitCount} |
| Missing presentation count | ${missingPresentationCount} |
| Empty subcategoria count | ${emptySubcategoriaCount} |

## Normalized Unit Distribution

| Normalized Unit | Count |
|-----------------|-------|
${unitDistLines}

## Detected Anomalies

${anomalyLines}
`;

fs.writeFileSync(SUMMARY_PATH, summary, 'utf-8');
console.log('   ✅ Summary report written.');
console.log('\n🎉 Product Matcher Catalog build complete!');
