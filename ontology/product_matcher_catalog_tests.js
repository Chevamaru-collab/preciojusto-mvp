/**
 * Product Matcher Catalog — Test Suite
 * 
 * Validates schema integrity, unit normalization, field consistency,
 * and canonical_name immutability for the matcher catalog.
 * 
 * Run: node ontology/product_matcher_catalog_tests.js
 */

const assert = require('assert');
const path = require('path');

// ─── Load data ───────────────────────────────────────────────
const catalogPath = path.join(__dirname, 'product_matcher_catalog_v1.json');
const canonicalPath = path.join(__dirname, 'canonical_products_final.json');

let catalog, canonical;
try {
  catalog = require(catalogPath);
} catch (e) {
  console.error('❌ Cannot load product_matcher_catalog_v1.json — run builder first.');
  process.exit(1);
}
try {
  canonical = require(canonicalPath);
} catch (e) {
  console.error('❌ Cannot load canonical_products_final.json.');
  process.exit(1);
}

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

// Unit normalization map (case-insensitive keys for lookup)
const UNIT_MAP = {
  'kg':  'kilogram',
  'g':   'gram',
  'gr':  'gram',
  'lt':  'liter',
  'l':   'liter',
  'ml':  'milliliter',
  'und': 'unit',
  'cm3': 'milliliter'
};

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY A — Schema Integrity
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST A: Schema Integrity ───');

const REQUIRED_FIELDS = [
  'canonical_name',
  'family_name',
  'categoria',
  'subcategoria',
  'presentation',
  'unit',
  'normalized_unit',
  'comparison_group',
  'price_unit'
];

test('All entries have exactly the required fields', () => {
  catalog.forEach((entry, i) => {
    REQUIRED_FIELDS.forEach(field => {
      assert.ok(
        field in entry,
        `Entry ${i} ("${entry.canonical_name || 'UNKNOWN'}") missing field "${field}"`
      );
    });
  });
});

test('Catalog has same count as canonical input', () => {
  assert.strictEqual(
    catalog.length,
    canonical.length,
    `Catalog has ${catalog.length} entries but canonical has ${canonical.length}`
  );
});

test('presentation is number or null', () => {
  catalog.forEach((entry, i) => {
    const p = entry.presentation;
    assert.ok(
      p === null || typeof p === 'number',
      `Entry ${i} ("${entry.canonical_name}") presentation is "${typeof p}" (${p}), expected number or null`
    );
  });
});

test('normalized_unit is string or null', () => {
  catalog.forEach((entry, i) => {
    const nu = entry.normalized_unit;
    assert.ok(
      nu === null || typeof nu === 'string',
      `Entry ${i} ("${entry.canonical_name}") normalized_unit is "${typeof nu}" (${nu}), expected string or null`
    );
  });
});

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY B — Unit Normalization
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST B: Unit Normalization ───');

test('Known units are normalized correctly', () => {
  catalog.forEach((entry, i) => {
    const unitLower = (entry.unit || '').toLowerCase();
    if (unitLower && UNIT_MAP[unitLower]) {
      assert.strictEqual(
        entry.normalized_unit,
        UNIT_MAP[unitLower],
        `Entry ${i} ("${entry.canonical_name}") unit="${entry.unit}" should normalize to "${UNIT_MAP[unitLower]}" but got "${entry.normalized_unit}"`
      );
    }
  });
});

test('Missing/empty unit normalizes to null (not "unit")', () => {
  catalog.forEach((entry, i) => {
    if (!entry.unit) {
      assert.strictEqual(
        entry.normalized_unit,
        null,
        `Entry ${i} ("${entry.canonical_name}") has missing/empty unit but normalized_unit is "${entry.normalized_unit}" instead of null`
      );
    }
  });
});

test('cm3 normalizes to milliliter', () => {
  const cm3Entries = catalog.filter(e => e.unit === 'cm3');
  cm3Entries.forEach(entry => {
    assert.strictEqual(
      entry.normalized_unit,
      'milliliter',
      `Entry "${entry.canonical_name}" with unit="cm3" should normalize to "milliliter" but got "${entry.normalized_unit}"`
    );
  });
});

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY C — family_name Correctness
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST C: family_name Correctness ───');

test('family_name equals [categoria, subcategoria].filter(Boolean).join(" ")', () => {
  catalog.forEach((entry, i) => {
    const expected = [entry.categoria, entry.subcategoria].filter(Boolean).join(' ');
    assert.strictEqual(
      entry.family_name,
      expected,
      `Entry ${i} ("${entry.canonical_name}") family_name="${entry.family_name}" expected="${expected}"`
    );
  });
});

test('family_name has no trailing/leading spaces', () => {
  catalog.forEach((entry, i) => {
    assert.strictEqual(
      entry.family_name,
      entry.family_name.trim(),
      `Entry ${i} ("${entry.canonical_name}") family_name has extra whitespace: "${entry.family_name}"`
    );
  });
});

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY D — comparison_group Consistency
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST D: comparison_group Consistency ───');

test('comparison_group equals family_name', () => {
  catalog.forEach((entry, i) => {
    assert.strictEqual(
      entry.comparison_group,
      entry.family_name,
      `Entry ${i} ("${entry.canonical_name}") comparison_group="${entry.comparison_group}" ≠ family_name="${entry.family_name}"`
    );
  });
});

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY E — price_unit Consistency
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST E: price_unit Consistency ───');

test('price_unit equals normalized_unit', () => {
  catalog.forEach((entry, i) => {
    assert.strictEqual(
      entry.price_unit,
      entry.normalized_unit,
      `Entry ${i} ("${entry.canonical_name}") price_unit="${entry.price_unit}" ≠ normalized_unit="${entry.normalized_unit}"`
    );
  });
});

// ═════════════════════════════════════════════════════════════
// TEST CATEGORY F — canonical_name Immutability
// ═════════════════════════════════════════════════════════════
console.log('\n─── TEST F: canonical_name Immutability ───');

test('Every canonical_name from input exists in output', () => {
  const catalogNames = new Set(catalog.map(e => e.canonical_name));
  canonical.forEach((entry, i) => {
    assert.ok(
      catalogNames.has(entry.canonical_name),
      `Canonical entry ${i} ("${entry.canonical_name}") is missing from matcher catalog`
    );
  });
});

test('Every canonical_name in output exists in input', () => {
  const canonicalNames = new Set(canonical.map(e => e.canonical_name));
  catalog.forEach((entry, i) => {
    assert.ok(
      canonicalNames.has(entry.canonical_name),
      `Catalog entry ${i} ("${entry.canonical_name}") does not exist in canonical input`
    );
  });
});

test('canonical_names are exactly identical (no modification)', () => {
  const inputNames = canonical.map(e => e.canonical_name).sort();
  const outputNames = catalog.map(e => e.canonical_name).sort();
  assert.deepStrictEqual(
    outputNames,
    inputNames,
    'Sorted canonical_name arrays do not match'
  );
});

// ─── Summary ─────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('═══════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
