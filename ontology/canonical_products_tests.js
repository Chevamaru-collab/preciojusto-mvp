/**
 * Semantic Reconstruction Test Suite for Canonical Product Builder
 * TDD tests for the canonical product reconstruction logic.
 * Run: node ontology/canonical_products_tests.js
 */

const {
  splitSubcategoria,
  buildCanonicalName,
  detectBrand,
  isGenericName,
  reconstructProduct
} = require('./build_canonical.js');

let passed = 0;
let failed = 0;
const failures = [];

function assert(testName, actual, expected) {
  if (typeof expected === 'object' && expected !== null) {
    const match = Object.keys(expected).every(k => {
      if (expected[k] === actual[k]) return true;
      if (String(expected[k]) === String(actual[k])) return true;
      return false;
    });
    if (match) {
      passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      failed++;
      const diff = Object.keys(expected)
        .filter(k => String(expected[k]) !== String(actual[k]))
        .map(k => `    ${k}: expected="${expected[k]}" got="${actual[k]}"`)
        .join('\n');
      failures.push({ testName, diff });
      console.log(`  ❌ ${testName}`);
      console.log(diff);
    }
  } else {
    if (String(actual) === String(expected)) {
      passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      failed++;
      failures.push({ testName, diff: `    expected="${expected}" got="${actual}"` });
      console.log(`  ❌ ${testName}: expected="${expected}" got="${actual}"`);
    }
  }
}

// ===========================================
// A. COMPLETE SEMANTIC RECONSTRUCTION
// ===========================================
console.log('\n📋 A. COMPLETE SEMANTIC RECONSTRUCTION');

assert('Canela en Polvo from structured fields',
  buildCanonicalName({
    categoria: 'Especias', subcategoria: 'Polvo',
    presentation: '1', unit: 'KG',
    item: 'Canela en Polvo x Kg'
  }),
  'Canela en Polvo 1 KG'
);

assert('Aceite Vegetal from structured fields',
  buildCanonicalName({
    categoria: 'Aceite', subcategoria: 'Vegetal',
    presentation: '5', unit: 'LT',
    item: 'Aceite Bells x 5 Lt.'
  }),
  'Aceite Vegetal 5 LT'
);

assert('Azucar Blanca from structured fields',
  buildCanonicalName({
    categoria: 'Blanca', subcategoria: '5Kg',
    presentation: '5', unit: 'KG',
    item: 'Azucar Blanca ARO x 5kg.'
  }),
  'Azucar Blanca 5 KG'
);

assert('Harina Preparada from structured fields',
  buildCanonicalName({
    categoria: 'Preparada', subcategoria: '1 Kg',
    presentation: '1', unit: 'KG',
    item: 'Harina Preparada NICOLINI x 1 kg.',
    sub_rubro: 'Harina'
  }),
  'Harina Preparada 1 KG'
);

assert('Huevos Pardos from structured fields',
  buildCanonicalName({
    categoria: 'Pardos', subcategoria: '30 und',
    presentation: '30', unit: 'UND',
    item: 'Huevos pardos LA CALERA x 30 und'
  }),
  'Huevos Pardos 30 UND'
);

// ===========================================
// A2. BRAND DETECTION
// ===========================================
console.log('\n📋 A2. BRAND DETECTION');

assert('Detect brand BELLS from Marca field',
  detectBrand('Aceite Bells x 5 Lt.', 'BELLS'),
  'BELLS'
);

assert('Detect brand PRIMOR from Item when Marca empty',
  detectBrand('Aceite Vegetal PRIMOR x 1 Galon', ''),
  'PRIMOR'
);

assert('Detect brand NEGUSA from Item',
  detectBrand('Chocochips NEGUSA x kg.', 'NEGUSA'),
  'NEGUSA'
);

assert('No brand in generic item',
  detectBrand('Canela en Polvo x Kg', ''),
  ''
);

// ===========================================
// B. SPLIT MIXED SUBCATEGORY
// ===========================================
console.log('\n📋 B. SPLIT MIXED SUBCATEGORY');

assert('Split "Vegetal x 5Lt"',
  splitSubcategoria('Vegetal x 5Lt'),
  { subcategoria: 'Vegetal', presentation: '5', unit: 'Lt' }
);

assert('Split "1 Kg"',
  splitSubcategoria('1 Kg'),
  { subcategoria: '', presentation: '1', unit: 'Kg' }
);

assert('Split "5Kg"',
  splitSubcategoria('5Kg'),
  { subcategoria: '', presentation: '5', unit: 'Kg' }
);

assert('Split "946 Ml"',
  splitSubcategoria('946 Ml'),
  { subcategoria: '', presentation: '946', unit: 'Ml' }
);

assert('Keep "#8 - Blanco" as-is (not a qty pattern)',
  splitSubcategoria('#8 - Blanco'),
  { subcategoria: '#8 - Blanco', presentation: '', unit: '' }
);

assert('Split "Vegetal x 1Lt."',
  splitSubcategoria('Vegetal x 1Lt.'),
  { subcategoria: 'Vegetal', presentation: '1', unit: 'Lt' }
);

assert('Split "Vegetal x 0.9Lt"',
  splitSubcategoria('Vegetal x 0.9Lt'),
  { subcategoria: 'Vegetal', presentation: '0.9', unit: 'Lt' }
);

assert('Split "200 gr"',
  splitSubcategoria('200 gr'),
  { subcategoria: '', presentation: '200', unit: 'gr' }
);

assert('Keep "Crema" as text-only subcategoria',
  splitSubcategoria('Crema'),
  { subcategoria: 'Crema', presentation: '', unit: '' }
);

// ===========================================
// C. AVOID GENERIC OUTPUT
// ===========================================
console.log('\n📋 C. AVOID GENERIC OUTPUT');

assert('"Polvo" alone is generic',
  isGenericName('Polvo'), true
);

assert('"Blanca" alone is generic',
  isGenericName('Blanca'), true
);

assert('"Vegetal" alone is generic',
  isGenericName('Vegetal'), true
);

assert('"Canela en Polvo" is NOT generic',
  isGenericName('Canela en Polvo'), false
);

assert('"Aceite Vegetal" is NOT generic',
  isGenericName('Aceite Vegetal'), false
);

assert('Generic subcategoria enriched with parent Categoria',
  buildCanonicalName({
    categoria: 'Especias', subcategoria: 'Polvo',
    presentation: '0.4536', unit: 'KG',
    item: 'Canela en Polvo BADIA x 453.60gr',
    sub_rubro: 'Abarrotes'
  }),
  'Canela en Polvo 0.4536 KG'
);

// ===========================================
// D. REMOVE COMMERCIAL NOISE
// ===========================================
console.log('\n📋 D. REMOVE COMMERCIAL NOISE');

const productD1 = reconstructProduct({
  item: 'Aceite Bells x 5 Lt.',
  rubro: 'Insumos',
  sub_rubro: 'Abarrotes',
  categoria: 'Aceite',
  subcategoria: 'Vegetal x 5Lt',
  cantidad: '5',
  um: 'LT',
  marca: 'BELLS'
});
assert('Brand removed from canonical, preserved in brand_detected',
  { canonical_name: productD1.canonical_name, brand_detected: productD1.brand_detected },
  { canonical_name: 'Aceite Vegetal 5 LT', brand_detected: 'BELLS' }
);

const productD2 = reconstructProduct({
  item: 'Aceite Vegetal PRIMOR x 1 Galon',
  rubro: 'Insumos',
  sub_rubro: 'Abarrotes',
  categoria: 'Aceite',
  subcategoria: 'Vegetal x 5Lt',
  cantidad: '5',
  um: 'LT',
  marca: 'PRIMOR'
});
assert('PRIMOR stripped, brand_detected = PRIMOR',
  { canonical_name: productD2.canonical_name, brand_detected: productD2.brand_detected },
  { canonical_name: 'Aceite Vegetal 5 LT', brand_detected: 'PRIMOR' }
);

// ===========================================
// E. FLAG AMBIGUOUS CASES
// ===========================================
console.log('\n📋 E. FLAG AMBIGUOUS CASES');

const productE1 = reconstructProduct({
  item: '',
  rubro: 'Insumos',
  sub_rubro: '',
  categoria: '',
  subcategoria: '',
  cantidad: '',
  um: '',
  marca: ''
});
assert('Empty row flagged for review',
  productE1.needs_review, true
);

const productE2 = reconstructProduct({
  item: 'Maracuya x kg.',
  rubro: 'Insumos',
  sub_rubro: 'Frutas',
  categoria: 'Maracuya',
  subcategoria: '',
  cantidad: '1',
  um: 'KG',
  marca: ''
});
assert('Maracuya without presentation is NOT flagged (fruit sold by kg)',
  productE2.needs_review, false
);

const productE3 = reconstructProduct({
  item: 'Gastos Varios (MA) - Fruta',
  rubro: 'Insumos',
  sub_rubro: 'Frutas',
  categoria: 'Varios',
  subcategoria: '',
  cantidad: '',
  um: '',
  marca: ''
});
assert('Gastos Varios flagged for review (not a real product)',
  productE3.needs_review, true
);

// ===========================================
// SUMMARY
// ===========================================
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => {
    console.log(`  ❌ ${f.testName}`);
    console.log(f.diff);
  });
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
