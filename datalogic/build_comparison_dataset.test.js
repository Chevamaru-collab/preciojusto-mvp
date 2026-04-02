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

// ─── Matcher helpers for tests ────────────────────────────────────
const CANONICAL_ACEITE_09 = {
  canonical_name: 'Aceite Vegetal 0.9 LT',
  comparison_group: 'Aceite Vegetal',
  categoria: 'Aceite',
  subcategoria: 'Vegetal',
  presentation: 0.9,
  unit: 'LT',
  normalized_unit: 'liter',
  price_unit: 'liter'
};

const CANONICAL_ARROZ_075 = {
  canonical_name: 'Arroz Extra 0.75 KG',
  comparison_group: 'Arroz Extra',
  categoria: 'Arroz',
  subcategoria: 'Extra',
  presentation: 0.75,
  unit: 'KG',
  normalized_unit: 'kilogram',
  price_unit: 'kilogram'
};

const CANONICAL_AZUCAR_BLANCA_1 = {
  canonical_name: 'Azucar Blanca 1 KG',
  comparison_group: 'Azucar Blanca',
  categoria: 'Azucar Blanca',
  subcategoria: 'Blanca',
  presentation: 1,
  unit: 'KG',
  normalized_unit: 'kilogram',
  price_unit: 'kilogram'
};

const TEST_CATALOG = [];
const TEST_LOOKUP_ACEITE = new Map([
  ['Aceite Vegetal 0.9 LT', CANONICAL_ACEITE_09]
]);

const ALWAYS_MATCH_ACEITE = {
  match: ({ name }) => ({
    raw_name: name,
    candidates: [{ canonical_name: 'Aceite Vegetal 0.9 LT', score: 0.91 }],
    best_match: 'Aceite Vegetal 0.9 LT'
  })
};

const CATEGORY_MATCHER = {
  match: ({ name }) => {
    const n = String(name || '').toLowerCase();

    if (n.includes('arroz')) {
      return {
        raw_name: name,
        candidates: [{ canonical_name: 'Arroz Extra 0.75 KG', score: 0.92 }],
        best_match: 'Arroz Extra 0.75 KG'
      };
    }

    if (n.includes('azucar') || n.includes('azúcar')) {
      return {
        raw_name: name,
        candidates: [{ canonical_name: 'Azucar Blanca 1 KG', score: 0.92 }],
        best_match: 'Azucar Blanca 1 KG'
      };
    }

    return {
      raw_name: name,
      candidates: [{ canonical_name: 'Aceite Vegetal 0.9 LT', score: 0.91 }],
      best_match: 'Aceite Vegetal 0.9 LT'
    };
  }
};

const TEST_LOOKUP_MULTI = new Map([
  ['Aceite Vegetal 0.9 LT', CANONICAL_ACEITE_09],
  ['Arroz Extra 0.75 KG', CANONICAL_ARROZ_075],
  ['Azucar Blanca 1 KG', CANONICAL_AZUCAR_BLANCA_1]
]);


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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
  assert.strictEqual(groups.size, 1, 'Should produce exactly 1 group');
  const group = [...groups.values()][0];
  assert.strictEqual(group.storeMap.size, 3, 'Group should have 3 stores');
});

// ─── 2. Preserves different categories as separate groups ─────────
test('preserves different categories as separate groups', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'ACEITE PRIMOR BOTELLA 900 ML',
      categoria: 'Aceite',
      precioOnline: 5.4
    }),
    makeRow({
      super: 'Wong',
      item: 'ACEITE BELLS 0.9 LT',
      categoria: 'Aceite',
      precioOnline: 5.8
    }),
    makeRow({
      super: 'Metro',
      item: 'ARROZ COSTEÑO EXTRA 750 G',
      categoria: 'Arroz',
      tipo: 'Extra',
      presentacion: 750,
      um: 'g',
      precioOnline: 3.5
    }),
    makeRow({
      super: 'Wong',
      item: 'ARROZ PAISANA EXTRA 750 G',
      categoria: 'Arroz',
      tipo: 'Extra',
      presentacion: 750,
      um: 'g',
      precioOnline: 4.0
    }),
  ];
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_MULTI, CATEGORY_MATCHER);
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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
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
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_ACEITE, ALWAYS_MATCH_ACEITE);
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

  // Menestras semantic grouping assertions for categories
  const { normalizeCategoryLabel } = require('./build_comparison_dataset');
  assert.strictEqual(normalizeCategoryLabel('lentejas'), 'Menestras');
  assert.strictEqual(normalizeCategoryLabel('frijol-canario'), 'Menestras');
  assert.strictEqual(normalizeCategoryLabel('menestras'), 'Menestras');

  // Rows with variant categories should group together
  const rows = [
    makeRow({ super: 'Metro', categoria: 'azucar-blanca', tipo: 'Blanca', presentacion: 1, um: 'kg', precioOnline: 3.5 }),
    makeRow({ super: 'Wong', categoria: 'Azúcar Blanca', tipo: 'Blanca', presentacion: 1, um: 'kg', precioOnline: 3.8 }),
  ];
  const groups = buildComparisonGroups(rows, TEST_CATALOG, TEST_LOOKUP_MULTI, CATEGORY_MATCHER);
  assert.strictEqual(groups.size, 1, 'Variant category names should produce 1 group');
});

// ─── 10. Matcher integration: groups by canonical_name ───────────
test('groups rows by matcher best_match instead of heuristic key', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'ACEITE PRIMOR BOTELLA 900 ML',
      categoria: 'Aceite',
      tipo: 'Vegetal',
      presentacion: 900,
      um: 'ml',
      precioOnline: 5.4
    }),
    makeRow({
      super: 'Wong',
      item: 'ACEITE BELLS 0.9 LT',
      categoria: 'Aceite',
      tipo: 'Vegetal',
      presentacion: 0.9,
      um: 'lt',
      precioOnline: 5.8
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map([
    ['Aceite Vegetal 0.9 LT', {
      canonical_name: 'Aceite Vegetal 0.9 LT',
      comparison_group: 'Aceite Vegetal',
      categoria: 'Aceite',
      subcategoria: 'Vegetal',
      presentation: 0.9,
      unit: 'LT',
      normalized_unit: 'liter',
      price_unit: 'liter'
    }]
  ]);

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [{ canonical_name: 'Aceite Vegetal 0.9 LT', score: 0.91 }],
      best_match: 'Aceite Vegetal 0.9 LT'
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  assert.strictEqual(groups.size, 1, 'Rows with same canonical match should produce one group');

  const output = formatOutput(groups, 2);
  assert.strictEqual(output.length, 1, 'Output should contain one canonical group');
});

// ─── 11. Matcher integration: excludes rows without best_match ────
test('excludes rows when matcher returns no best_match', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'PRODUCTO RARO SIN MATCH',
      categoria: 'Aceite',
      tipo: 'Vegetal',
      presentacion: 900,
      um: 'ml',
      precioOnline: 5.4
    }),
    makeRow({
      super: 'Wong',
      item: 'OTRO PRODUCTO RARO SIN MATCH',
      categoria: 'Aceite',
      tipo: 'Vegetal',
      presentacion: 900,
      um: 'ml',
      precioOnline: 5.8
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map();

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [],
      best_match: null
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  assert.strictEqual(groups.size, 0, 'Rows without canonical match should be excluded');
});

// ─── 12. Matcher integration: keeps cheapest price per store ──────
test('keeps cheapest price per store inside the same canonical group', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'ACEITE PRIMOR BOTELLA 900 ML',
      precioOnline: 6.4,
      presentacion: 900,
      um: 'ml'
    }),
    makeRow({
      super: 'Metro',
      item: 'ACEITE PRIMOR BOTELLA 900 ML',
      precioOnline: 5.9,
      presentacion: 900,
      um: 'ml'
    }),
    makeRow({
      super: 'Wong',
      item: 'ACEITE BELLS 0.9 LT',
      precioOnline: 5.8,
      presentacion: 0.9,
      um: 'lt'
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map([
    ['Aceite Vegetal 0.9 LT', {
      canonical_name: 'Aceite Vegetal 0.9 LT',
      comparison_group: 'Aceite Vegetal',
      categoria: 'Aceite',
      subcategoria: 'Vegetal',
      presentation: 0.9,
      unit: 'LT',
      normalized_unit: 'liter',
      price_unit: 'liter'
    }]
  ]);

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [{ canonical_name: 'Aceite Vegetal 0.9 LT', score: 0.91 }],
      best_match: 'Aceite Vegetal 0.9 LT'
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  const group = [...groups.values()][0];

  assert.strictEqual(group.storeMap.size, 2, 'Should keep one entry per store');
  assert.strictEqual(group.storeMap.get('Metro'), 5.9, 'Should keep cheapest Metro price');
  assert.strictEqual(group.storeMap.get('Wong'), 5.8, 'Should keep Wong price');
});

// ─── 13. Matcher integration: output includes canonical metadata ──
test('output includes canonical metadata fields', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'ACEITE PRIMOR BOTELLA 900 ML',
      precioOnline: 5.4,
      presentacion: 900,
      um: 'ml'
    }),
    makeRow({
      super: 'Wong',
      item: 'ACEITE BELLS 0.9 LT',
      precioOnline: 5.8,
      presentacion: 0.9,
      um: 'lt'
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map([
    ['Aceite Vegetal 0.9 LT', {
      canonical_name: 'Aceite Vegetal 0.9 LT',
      comparison_group: 'Aceite Vegetal',
      categoria: 'Aceite',
      subcategoria: 'Vegetal',
      presentation: 0.9,
      unit: 'LT',
      normalized_unit: 'liter',
      price_unit: 'liter'
    }]
  ]);

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [{ canonical_name: 'Aceite Vegetal 0.9 LT', score: 0.91 }],
      best_match: 'Aceite Vegetal 0.9 LT'
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  const output = formatOutput(groups, 2);

  assert.strictEqual(output.length, 1);
  assert.strictEqual(output[0].canonical_name, 'Aceite Vegetal 0.9 LT');
  assert.strictEqual(output[0].comparison_group, 'Aceite Vegetal');
  assert.strictEqual(output[0].price_unit, 'liter');
});

// ─── 14. Matcher integration: rejects bogus heuristic groups ──────
test('does not produce bogus heuristic groups like Pollo 1lt when there is no canonical match', () => {
  const rows = [
    makeRow({
      super: 'Plaza Vea',
      item: 'POLLO EXTRAÑO 1 LT',
      categoria: 'Pollo',
      tipo: 'Pollo',
      presentacion: 1,
      um: 'lt',
      precioOnline: 32.9
    }),
    makeRow({
      super: 'Wong',
      item: 'POLLO EXTRAÑO 1 LT',
      categoria: 'Pollo',
      tipo: 'Pollo',
      presentacion: 1,
      um: 'lt',
      precioOnline: 42.5
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map();

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [],
      best_match: null
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  const output = formatOutput(groups, 2);

  assert.strictEqual(groups.size, 0, 'No canonical match means no group');
  assert.strictEqual(output.length, 0, 'Bogus heuristic product should not reach output');
});


// ─── 15. Matcher integration: uses comparison_group for Avena category ─
test('uses comparison_group for Avena category output', () => {
  const rows = [
    makeRow({
      super: 'Metro',
      item: 'AVENA 3 OSITOS BOLSA 500 G',
      categoria: 'Avena',
      tipo: 'Avena',
      presentacion: 500,
      um: 'g',
      precioOnline: 4.5
    }),
    makeRow({
      super: 'Wong',
      item: 'AVENA 3 OSITOS BOLSA 500 G',
      categoria: 'Avena',
      tipo: 'Avena',
      presentacion: 500,
      um: 'g',
      precioOnline: 4.8
    })
  ];

  const fakeCatalog = [];
  const fakeLookup = new Map([
    ['Avena Hojuelas 500 G', {
      canonical_name: 'Avena Hojuelas 500 G',
      comparison_group: 'Avena Hojuelas',
      categoria: 'Avena',
      subcategoria: 'Hojuelas',
      presentation: 0.5,
      unit: 'KG',
      normalized_unit: 'kilogram',
      price_unit: 'kilogram'
    }]
  ]);

  const fakeMatcher = {
    match: ({ name }) => ({
      raw_name: name,
      candidates: [{ canonical_name: 'Avena Hojuelas 500 G', score: 0.95 }],
      best_match: 'Avena Hojuelas 500 G'
    })
  };

  const groups = buildComparisonGroups(rows, fakeCatalog, fakeLookup, fakeMatcher);
  const output = formatOutput(groups, 2);

  assert.strictEqual(output.length, 1, 'Should output one combined group');
  assert.strictEqual(output[0].category, 'Avena Hojuelas', 'Should use comparison_group as the final category instead of Avena');
});


// ─── Summary ──────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
