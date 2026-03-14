/**
 * Product Matcher Engine v1 — Test Suite
 *
 * Validates parsing, unit normalization, scoring, and end-to-end matching
 * against the live product_matcher_catalog_v1.json.
 *
 * Run: node ontology/product_matcher_engine_tests.js
 */

const assert = require('assert');
const path = require('path');

const engine = require('./product_matcher_engine');

// ─── Helpers ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
  }
}

// ─── Load catalog once ───────────────────────────────────────
const catalog = engine.loadCatalog(
  path.join(__dirname, 'product_matcher_catalog_v1.json')
);

// ═════════════════════════════════════════════════════════════
// TEST A — parseScrapedName
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST A: parseScrapedName ───');

test('Extracts presentation and unit from "ACEITE PRIMOR BOTELLA 900 ML"', () => {
  const r = engine.parseScrapedName('ACEITE PRIMOR BOTELLA 900 ML');
  assert.strictEqual(r.presentation, 900);
  assert.strictEqual(r.unit, 'ml');
  assert.strictEqual(r.normalizedUnit, 'liter');
  assert.strictEqual(r.normalizedPresentation, 0.9);
});

test('Strips noise tokens (botella) and brand tokens (primor)', () => {
  const r = engine.parseScrapedName('ACEITE PRIMOR BOTELLA 900 ML');
  assert.ok(!r.tokens.includes('primor'), 'brand "primor" should be stripped');
  assert.ok(!r.tokens.includes('botella'), 'noise "botella" should be stripped');
  assert.ok(r.tokens.includes('aceite'), 'product token "aceite" should remain');
});

test('Parses "ACEITE 0.9 LT" correctly', () => {
  const r = engine.parseScrapedName('ACEITE 0.9 LT');
  assert.strictEqual(r.presentation, 0.9);
  assert.strictEqual(r.unit, 'lt');
  assert.strictEqual(r.normalizedUnit, 'liter');
  assert.strictEqual(r.normalizedPresentation, 0.9);
  assert.deepStrictEqual(r.tokens, ['aceite']);
});

test('Parses "AZUCAR 1 KG" correctly', () => {
  const r = engine.parseScrapedName('AZUCAR 1 KG');
  assert.strictEqual(r.presentation, 1);
  assert.strictEqual(r.unit, 'kg');
  assert.strictEqual(r.normalizedUnit, 'kilogram');
  assert.strictEqual(r.normalizedPresentation, 1);
  assert.deepStrictEqual(r.tokens, ['azucar']);
});

test('Parses "LECHE 1 LT" correctly', () => {
  const r = engine.parseScrapedName('LECHE 1 LT');
  assert.strictEqual(r.presentation, 1);
  assert.strictEqual(r.unit, 'lt');
  assert.strictEqual(r.normalizedUnit, 'liter');
  assert.strictEqual(r.normalizedPresentation, 1);
  assert.deepStrictEqual(r.tokens, ['leche']);
});

test('Parses "HUEVOS 30 UND" correctly', () => {
  const r = engine.parseScrapedName('HUEVOS 30 UND');
  assert.strictEqual(r.presentation, 30);
  assert.strictEqual(r.unit, 'und');
  assert.strictEqual(r.normalizedUnit, 'unit');
  assert.strictEqual(r.normalizedPresentation, 30);
  assert.deepStrictEqual(r.tokens, ['huevos']);
});

// ═════════════════════════════════════════════════════════════
// TEST B — normalizeUnit
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST B: normalizeUnit ───');

test('900 ml → 0.9 liter', () => {
  const r = engine.normalizeUnit(900, 'ml');
  assert.strictEqual(r.normalizedValue, 0.9);
  assert.strictEqual(r.normalizedUnit, 'liter');
});

test('1000 g → 1 kilogram', () => {
  const r = engine.normalizeUnit(1000, 'g');
  assert.strictEqual(r.normalizedValue, 1);
  assert.strictEqual(r.normalizedUnit, 'kilogram');
});

test('500 gr → 0.5 kilogram', () => {
  const r = engine.normalizeUnit(500, 'gr');
  assert.strictEqual(r.normalizedValue, 0.5);
  assert.strictEqual(r.normalizedUnit, 'kilogram');
});

test('1 kg → 1 kilogram', () => {
  const r = engine.normalizeUnit(1, 'kg');
  assert.strictEqual(r.normalizedValue, 1);
  assert.strictEqual(r.normalizedUnit, 'kilogram');
});

test('1 lt → 1 liter', () => {
  const r = engine.normalizeUnit(1, 'lt');
  assert.strictEqual(r.normalizedValue, 1);
  assert.strictEqual(r.normalizedUnit, 'liter');
});

test('250 cm3 → 0.25 liter', () => {
  const r = engine.normalizeUnit(250, 'cm3');
  assert.strictEqual(r.normalizedValue, 0.25);
  assert.strictEqual(r.normalizedUnit, 'liter');
});

test('30 und → 30 unit', () => {
  const r = engine.normalizeUnit(30, 'und');
  assert.strictEqual(r.normalizedValue, 30);
  assert.strictEqual(r.normalizedUnit, 'unit');
});

// ═════════════════════════════════════════════════════════════
// TEST C — Jaccard Similarity
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST C: Jaccard Similarity ───');

test('Identical sets → 1.0', () => {
  assert.strictEqual(engine.jaccardSimilarity(['aceite'], ['aceite']), 1);
});

test('Disjoint sets → 0.0', () => {
  assert.strictEqual(engine.jaccardSimilarity(['aceite'], ['leche']), 0);
});

test('Partial overlap computes correctly', () => {
  const score = engine.jaccardSimilarity(['aceite', 'vegetal'], ['aceite', 'oliva']);
  // intersection = {aceite}, union = {aceite, vegetal, oliva} → 1/3
  assert.ok(Math.abs(score - 1 / 3) < 0.001, `Expected ~0.333, got ${score}`);
});

// ═════════════════════════════════════════════════════════════
// TEST D — Presentation Similarity
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST D: Presentation Similarity ───');

test('Equal values → 1.0', () => {
  assert.strictEqual(engine.presentationSimilarity(0.9, 0.9), 1);
});

test('0.9 vs 1 → 0.9', () => {
  assert.strictEqual(engine.presentationSimilarity(0.9, 1), 0.9);
});

test('Null values → 0', () => {
  assert.strictEqual(engine.presentationSimilarity(null, 1), 0);
  assert.strictEqual(engine.presentationSimilarity(1, null), 0);
});

// ═════════════════════════════════════════════════════════════
// TEST E — End-to-End Matching (Required Test Cases)
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST E: End-to-End Matching ───');

test('ACEITE 900 ML → matches Aceite Vegetal 0.9 LT (or similar Aceite)', () => {
  const result = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  assert.ok(result.best_match, 'Should find a best match');
  assert.ok(
    result.best_match.toLowerCase().includes('aceite'),
    `Best match should contain "aceite", got: "${result.best_match}"`
  );
  assert.ok(result.candidates.length > 0, 'Should have candidates');
  assert.ok(result.candidates[0].score > 0.5, `Score should be > 0.5, got ${result.candidates[0].score}`);
  console.log(`     → best_match: "${result.best_match}" (score: ${result.candidates[0].score})`);
});

test('ACEITE 0.9 LT → matches Aceite Vegetal 0.9 LT (same or better as 900 ML)', () => {
  const result = engine.match({ name: 'ACEITE 0.9 LT' }, catalog);
  assert.ok(result.best_match, 'Should find a best match');
  assert.ok(
    result.best_match.toLowerCase().includes('aceite'),
    `Best match should contain "aceite", got: "${result.best_match}"`
  );
  // Verify the top match has presentation 0.9 and unit LT
  const topCandidate = result.candidates[0];
  assert.ok(topCandidate.score > 0.5, `Score should be > 0.5, got ${topCandidate.score}`);
  console.log(`     → best_match: "${result.best_match}" (score: ${topCandidate.score})`);
});

test('ACEITE 900 ML and ACEITE 0.9 LT should produce same best_match', () => {
  const r1 = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  const r2 = engine.match({ name: 'ACEITE 0.9 LT' }, catalog);
  assert.strictEqual(
    r1.best_match,
    r2.best_match,
    `900 ML matched "${r1.best_match}" but 0.9 LT matched "${r2.best_match}" — should be identical`
  );
});

test('AZUCAR 1 KG → matches an Azucar entry with 1 KG', () => {
  const result = engine.match({ name: 'AZUCAR 1 KG' }, catalog);
  assert.ok(result.best_match, 'Should find a best match');
  assert.ok(
    result.best_match.toLowerCase().includes('azucar'),
    `Best match should contain "azucar", got: "${result.best_match}"`
  );
  assert.ok(result.candidates[0].score > 0.5, `Score should be > 0.5, got ${result.candidates[0].score}`);
  console.log(`     → best_match: "${result.best_match}" (score: ${result.candidates[0].score})`);
});

test('LECHE 1 LT → matches a Lacteos/Leche/UHT/Evaporada entry', () => {
  const result = engine.match({ name: 'LECHE 1 LT' }, catalog);
  assert.ok(result.best_match, 'Should find a best match');
  assert.ok(result.candidates.length > 0, 'Should have candidates');
  // "Leche" should match catalog entries with "leche" in canonical_name or related products
  assert.ok(result.candidates[0].score > 0, `Score should be > 0, got ${result.candidates[0].score}`);
  console.log(`     → best_match: "${result.best_match}" (score: ${result.candidates[0].score})`);
});

test('HUEVOS 30 UND → matches a Huevos entry with 30 UND', () => {
  const result = engine.match({ name: 'HUEVOS 30 UND' }, catalog);
  assert.ok(result.best_match, 'Should find a best match');
  assert.ok(
    result.best_match.toLowerCase().includes('huevos'),
    `Best match should contain "huevos", got: "${result.best_match}"`
  );
  assert.ok(result.candidates[0].score > 0.5, `Score should be > 0.5, got ${result.candidates[0].score}`);
  console.log(`     → best_match: "${result.best_match}" (score: ${result.candidates[0].score})`);
});

// ═════════════════════════════════════════════════════════════
// TEST F — Output Structure
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST F: Output Structure ───');

test('Output has raw_name, candidates[], and best_match', () => {
  const result = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  assert.ok('raw_name' in result, 'Missing raw_name');
  assert.ok('candidates' in result, 'Missing candidates');
  assert.ok('best_match' in result, 'Missing best_match');
  assert.ok(Array.isArray(result.candidates), 'candidates should be an array');
});

test('Each candidate has canonical_name, family_name, and score', () => {
  const result = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  result.candidates.forEach((c, i) => {
    assert.ok('canonical_name' in c, `Candidate ${i} missing canonical_name`);
    assert.ok('family_name' in c, `Candidate ${i} missing family_name`);
    assert.ok('score' in c, `Candidate ${i} missing score`);
    assert.ok(typeof c.score === 'number', `Candidate ${i} score should be a number`);
  });
});

test('Candidates are sorted by score descending', () => {
  const result = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  for (let i = 1; i < result.candidates.length; i++) {
    assert.ok(
      result.candidates[i - 1].score >= result.candidates[i].score,
      `Candidate ${i - 1} (score=${result.candidates[i - 1].score}) should be >= candidate ${i} (score=${result.candidates[i].score})`
    );
  }
});

test('Returns at most 3 candidates by default', () => {
  const result = engine.match({ name: 'ACEITE 900 ML' }, catalog);
  assert.ok(result.candidates.length <= 3, `Expected <= 3 candidates, got ${result.candidates.length}`);
});

test('raw_name matches input name', () => {
  const result = engine.match({ name: 'ACEITE PRIMOR BOTELLA 900 ML' }, catalog);
  assert.strictEqual(result.raw_name, 'ACEITE PRIMOR BOTELLA 900 ML');
});

// ─── Summary ─────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('═══════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
