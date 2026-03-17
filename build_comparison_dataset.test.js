/**
 * build_comparison_dataset.test.js
 * 
 * TDD tests for the comparison dataset builder.
 * Uses Node.js built-in assert — no external dependencies.
 * 
 * Run: node build_comparison_dataset.test.js
 */

const assert = require('assert');
const {
  normalizeUnit,
  normalizeCategory,
  normalizeTipo,
  parsePresentacion,
  hasValidPrice,
  hasValidPresentacion,
  isComboOrPack,
  buildComparisonGroups,
  formatOutput,
  buildProductName,
} = require('./build_comparison_dataset');

// ─── Helper: create a minimal valid row ────────────────────────────
function makeRow(overrides = {}) {
  return {
    fecha: '10/3/2026',
    super: 'Metro',
    item: 'Test Product 900ml',
    categoria: 'Aceite',
    marca: 'TestBrand',
    tipo: 'Vegetal',
    clase: null,
    precioOnline: 5.4,
    presentacion: 900,
    um: 'ml',
    pack: 1,
    supermercado: 'Metro',
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\nbuild_comparison_dataset tests\n');

// ─── 1. Groups comparable products from different stores ──────────
test('groups comparable products from different stores into one entry', () => {
  const rows = [
    makeRow({ super: 'Metro', precioOnline: 5.4 }),
    makeRow({ super: 'Wong', precioOnline: 5.8 }),
    makeRow({ super: 'Tottus', precioOnline: 5.6 }),
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 1, 'Should produce exactly 1 group');
  const group = [...groups.values()][0];
  assert.strictEqual(group.storeMap.size, 3, 'Group should have 3 stores');
});

// ─── 2. Preserves different categories as separate groups ─────────
test('preserves different categories as separate groups', () => {
  const rows = [
    makeRow({ super: 'Metro', categoria: 'Aceite', precioOnline: 5.4 }),
    makeRow({ super: 'Wong', categoria: 'Aceite', precioOnline: 5.8 }),
    makeRow({ super: 'Metro', categoria: 'Arroz', tipo: 'Extra', presentacion: 750, um: 'g', precioOnline: 3.5 }),
    makeRow({ super: 'Wong', categoria: 'Arroz', tipo: 'Extra', presentacion: 750, um: 'g', precioOnline: 4.0 }),
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 2, 'Should produce 2 groups (Aceite + Arroz)');
  const output = formatOutput(groups, 2);
  assert.strictEqual(output.length, 2);
  const categories = output.map(g => g.category);
  assert.ok(categories.includes('Aceite'));
  assert.ok(categories.includes('Arroz'));
});

// ─── 3. Computes best_price correctly ─────────────────────────────
test('computes best_price correctly', () => {
  const rows = [
    makeRow({ super: 'Metro', precioOnline: 7.0 }),
    makeRow({ super: 'Wong', precioOnline: 5.2 }),
    makeRow({ super: 'Tottus', precioOnline: 6.0 }),
  ];
  const groups = buildComparisonGroups(rows);
  const output = formatOutput(groups, 2);
  assert.strictEqual(output.length, 1);
  assert.strictEqual(output[0].best_price, 5.2);
});

// ─── 4. Computes best_store correctly ─────────────────────────────
test('computes best_store correctly', () => {
  const rows = [
    makeRow({ super: 'Metro', precioOnline: 7.0 }),
    makeRow({ super: 'Wong', precioOnline: 5.2 }),
    makeRow({ super: 'Tottus', precioOnline: 6.0 }),
  ];
  const groups = buildComparisonGroups(rows);
  const output = formatOutput(groups, 2);
  assert.strictEqual(output[0].best_store, 'Wong');
});

// ─── 5. Ignores rows with invalid/missing price ───────────────────
test('ignores rows with invalid/missing price', () => {
  const rows = [
    makeRow({ super: 'Metro', precioOnline: 5.4 }),
    makeRow({ super: 'Wong', precioOnline: null }),      // null price
    makeRow({ super: 'Tottus', precioOnline: 0 }),       // zero price
    makeRow({ super: 'Plaza Vea', precioOnline: -3 }),   // negative price
    makeRow({ super: 'Plaza Vea', precioOnline: undefined }), // undefined
  ];
  const groups = buildComparisonGroups(rows);
  // Only Metro has valid price → 1 group with 1 store
  const group = [...groups.values()][0];
  assert.strictEqual(group.storeMap.size, 1);
  assert.strictEqual(group.storeMap.get('Metro'), 5.4);
});

// ─── 6. Normalizes units consistently ─────────────────────────────
test('normalizes units consistently (Lt→lt, Kg→kg, l→lt)', () => {
  assert.strictEqual(normalizeUnit('Lt'), 'lt');
  assert.strictEqual(normalizeUnit('Kg'), 'kg');
  assert.strictEqual(normalizeUnit('l'), 'lt');
  assert.strictEqual(normalizeUnit('ML'), 'ml');
  assert.strictEqual(normalizeUnit('ml'), 'ml');
  assert.strictEqual(normalizeUnit('u'), 'u');

  // Rows with different unit casing should group together
  const rows = [
    makeRow({ super: 'Metro', um: 'Lt', presentacion: 1, precioOnline: 5.4 }),
    makeRow({ super: 'Wong', um: 'lt', presentacion: 1, precioOnline: 5.8 }),
    makeRow({ super: 'Tottus', um: 'l', presentacion: 1, precioOnline: 6.0 }),
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 1, 'Different unit casings should produce 1 group');
});

// ─── 7. Excludes Combo/Pack products ──────────────────────────────
test('excludes Combo/Pack products', () => {
  const rows = [
    makeRow({ super: 'Metro', tipo: 'Combo/Pack', precioOnline: 16.5 }),
    makeRow({ super: 'Wong', tipo: 'Combo/Pack', precioOnline: 17.0 }),
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 0, 'Combo/Pack rows should be excluded');
});

// ─── 8. Excludes single-store groups from output ──────────────────
test('excludes single-store groups from output', () => {
  const rows = [
    makeRow({ super: 'Metro', precioOnline: 5.4 }),
    // Only 1 store for this product → should be excluded from output
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 1, 'Group exists internally');
  const output = formatOutput(groups, 2);
  assert.strictEqual(output.length, 0, 'Single-store groups should not appear in output');
});

// ─── 9. Handles category normalization ────────────────────────────
test('handles category normalization (azucar-blanca → azucar blanca)', () => {
  assert.strictEqual(normalizeCategory('azucar-blanca'), 'azucar blanca');
  assert.strictEqual(normalizeCategory('Azúcar Blanca'), 'azucar blanca');
  assert.strictEqual(normalizeCategory('Azucar'), 'azucar');
  assert.strictEqual(normalizeCategory('ARROZ'), 'arroz');
  assert.strictEqual(normalizeCategory('leche-evaporada'), 'leche evaporada');

  // Rows with variant categories should group together
  const rows = [
    makeRow({ super: 'Metro', categoria: 'azucar-blanca', tipo: 'Blanca', presentacion: 1, um: 'kg', precioOnline: 3.5 }),
    makeRow({ super: 'Wong', categoria: 'Azúcar Blanca', tipo: 'Blanca', presentacion: 1, um: 'kg', precioOnline: 3.8 }),
  ];
  const groups = buildComparisonGroups(rows);
  assert.strictEqual(groups.size, 1, 'Variant category names should produce 1 group');
});

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
