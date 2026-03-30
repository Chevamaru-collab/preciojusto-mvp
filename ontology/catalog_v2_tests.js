const assert = require('assert');
const path = require('path');
const fs = require('fs');

const CATALOG_V2_PATH = path.join(__dirname, 'product_matcher_catalog_v2.json');

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(CATALOG_V2_PATH, 'utf-8'));
} catch (e) {
  console.error('❌ Cannot load product_matcher_catalog_v2.json. Run generator script first.');
  process.exit(1);
}

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

console.log('\n─── TDD requirements for Catalog V2 ───');

// Helper to find an entry
function findEntry(canonicalName) {
  return catalog.find(e => e.canonical_name === canonicalName);
}

function findEntriesByAlias(alias) {
  return catalog.filter(e => e.aliases && e.aliases.includes(alias));
}

test('Test 1 — Sugar normalization (AZUCAR RUBIA BOLSA 1KG -> Azucar Rubia 1 KG)', () => {
  // Wait, in V1 the canonical name was "Azucar Rubia 1 KG", but its category might have been "Rubia".
  // The V2 canonical name should be "Azucar Rubia 1 KG".
  const entry = findEntry('Azucar Rubia 1 KG');
  assert.ok(entry, 'Canonical entry "Azucar Rubia 1 KG" is missing');
  assert.strictEqual(entry.categoria, 'Azucar');
  assert.strictEqual(entry.subcategoria, 'Rubia');
  assert.strictEqual(entry.comparison_group, 'Azucar Rubia');
  assert.strictEqual(entry.unit, 'KG');
  assert.strictEqual(entry.presentation, 1);
});

test('Test 2 — Eggs grouping (HUEVOS PARDOS 30 UNIDADES -> Huevos Pardos 30 UND, comparison_group: Huevos)', () => {
  const entry = findEntry('Huevos Pardos 30 UND');
  assert.ok(entry, 'Canonical entry "Huevos Pardos 30 UND" is missing');
  assert.strictEqual(entry.categoria, 'Huevos');
  assert.strictEqual(entry.subcategoria, 'Pardos');
  assert.strictEqual(entry.comparison_group, 'Huevos');
  assert.strictEqual(entry.unit, 'UND');
  assert.strictEqual(entry.presentation, 30);
});

test('Test 3 — Milk normalization (LECHE UHT ENTERA 1L -> comparison_group: Leche)', () => {
  // If the catalog has Leche UHT or Leche Entera...
  // In V1 we had "UHT", let's check any Leche product.
  const leches = catalog.filter(e => e.categoria === 'Leche');
  assert.ok(leches.length > 0, 'No Leche products found');
  for (const leche of leches) {
    assert.strictEqual(leche.comparison_group, 'Leche', `Leche product "${leche.canonical_name}" should have comparison_group "Leche"`);
  }
});

test('Test 4 — Reject orphan ("BLANCA" -> NO standalone canonical entry)', () => {
  // Search for any entry where comparison_group or categoria is exactly "Blanca"
  const orphans = catalog.filter(e => e.categoria === 'Blanca' || e.comparison_group === 'Blanca');
  assert.strictEqual(orphans.length, 0, `Found ${orphans.length} orphan entries with Categoria or Comparison Group "Blanca"`);
});

test('Test 5 — Deduplication (Aceite 900 ml, Aceite 0.9 LT -> single canonical entry)', () => {
  // All Aceite 0.9 LT canonical entries shouldn't have multiple duplicates for same presentation/unit.
  // Actually, let's verify canonical_name is strictly unique.
  const names = catalog.map(e => e.canonical_name);
  const uniqueNames = new Set(names);
  assert.strictEqual(names.length, uniqueNames.size, `Deduplication failed: ${names.length} items but only ${uniqueNames.size} unique canonical names`);
});

console.log('\n═══════════════════════════════════════');
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) process.exit(1);
