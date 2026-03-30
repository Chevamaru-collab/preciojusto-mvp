const assert = require('assert');
const path = require('path');
const fs = require('fs');

const CATALOG_V3_PATH = path.join(__dirname, 'product_matcher_catalog_v3.json');

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(CATALOG_V3_PATH, 'utf-8'));
} catch (e) {
  console.error('❌ Cannot load product_matcher_catalog_v3.json. Run generator script first.');
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

console.log('\n─── TDD requirements for Catalog V3 ───');

// 1. Retailer removal
test('Test 1 — Retailer Contamination Removal', () => {
  const retailers = ['Tottus', 'Wong', 'Metro', 'Plaza Vea'];
  catalog.forEach(entry => {
    retailers.forEach(retailer => {
      const matchRegex = new RegExp(`\\b${retailer}\\b`, 'i');
      assert.ok(!matchRegex.test(entry.categoria), `Retailer found in categoria: ${entry.categoria}`);
      assert.ok(!matchRegex.test(entry.subcategoria), `Retailer found in subcategoria: ${entry.subcategoria}`);
      assert.ok(!matchRegex.test(entry.family_name), `Retailer found in family_name: ${entry.family_name}`);
      assert.ok(!matchRegex.test(entry.comparison_group), `Retailer found in comparison_group: ${entry.comparison_group}`);
    });
  });
});

// 2. Brand extraction
test('Test 2 — Brand Extraction', () => {
    // If Bells existed previously, it should be cleanly in brand
    const bellsEntries = catalog.filter(e => e.brand === 'Bells');
    if (bellsEntries.length > 0) {
        bellsEntries.forEach(entry => {
            const hasBellsInCoreFields = /Bells/i.test(entry.categoria) ||
                                         /Bells/i.test(entry.subcategoria) ||
                                         /Bells/i.test(entry.comparison_group);
            assert.ok(!hasBellsInCoreFields, `Brand "Bells" mistakenly kept in core fields for ${entry.canonical_name}`);
        });
    }
});

// 3. Avena split
test('Test 3 — Avena Split Logic', () => {
    const avenaEntries = catalog.filter(e => /avena/i.test(e.categoria) || /avena/i.test(e.canonical_name));
    
    // Check that we don't have a single giant "Avena" group if there are distinct types
    let groups = new Set(avenaEntries.map(e => e.comparison_group));
    // Valid sub-types if they exist: Hojuelas, Instantanea, Bebida, Mezcla. If we have more than 1, they must be separate.
    // If there is just plain 'Avena', we allow it if needs_review is true.
    avenaEntries.forEach(entry => {
       if (entry.comparison_group === 'Avena' && avenaEntries.find(e => /hojuela/i.test(e.canonical_name))) {
           if (!/hojuela|instant/i.test(entry.canonical_name)) {
               assert.ok(entry.needs_review, `Ambiguous Avena item should be flagged for review: ${entry.canonical_name}`);
           }
       }
       if (/bebida/i.test(entry.canonical_name) && /avena/i.test(entry.canonical_name)) {
           assert.ok(/bebida/i.test(entry.comparison_group), `Bebida de avena should be isolated in comparison group: ${entry.comparison_group}`);
       }
    });
});

// 4. Leche split
test('Test 4 — Leche Split Logic', () => {
    const lecheEntries = catalog.filter(e => /leche/i.test(e.categoria) || /leche/i.test(e.canonical_name));
    lecheEntries.forEach(entry => {
        if (/UHT/i.test(entry.canonical_name)) {
            assert.ok(/UHT/i.test(entry.comparison_group), `Leche UHT must preserve type split in comparison group. Found: ${entry.comparison_group}`);
        }
        if (/Evaporada/i.test(entry.canonical_name)) {
            assert.ok(/Evaporada/i.test(entry.comparison_group), `Leche Evaporada must preserve type split. Found: ${entry.comparison_group}`);
        }
        if (/Polvo/i.test(entry.canonical_name)) {
            assert.ok(/Polvo/i.test(entry.comparison_group), `Leche Polvo must preserve type split. Found: ${entry.comparison_group}`);
        }
    });
});

// 5. Fruit mix vs single fruit separation
test('Test 5 — Mix vs Single Separation (Mix Berries)', () => {
    const mixes = catalog.filter(e => /mix/i.test(e.canonical_name) || /mixta/i.test(e.canonical_name) || /ensalada/i.test(e.canonical_name));
    
    mixes.forEach(mix => {
        // Find single ingredient products that might have been merged
        const singleFruit = catalog.find(e => e.categoria === mix.categoria && e.canonical_name !== mix.canonical_name && !/mix/i.test(e.canonical_name));
        if (singleFruit) {
             assert.notStrictEqual(mix.comparison_group, singleFruit.comparison_group, `Mix product "${mix.canonical_name}" shares group with single product "${singleFruit.canonical_name}"`);
             // Check aliases don't intertwine
             if (singleFruit.aliases) {
                assert.ok(!singleFruit.aliases.some(a => /mix/i.test(a)), `Single fruit ${singleFruit.canonical_name} has mix as alias.`);
             }
        }
    });
});

// 6. ATADO handling
test('Test 6 — ATADO Handling (Perejil, Culantro, Albahaca)', () => {
   const herbs = catalog.filter(e => /perejil/i.test(e.canonical_name) || /culantro/i.test(e.canonical_name) || /albahaca/i.test(e.canonical_name));
   
   herbs.forEach(herb => {
       // Look for atado representation if applicable based on the original data. In Peru, these are practically always ATADO.
       if (/AT\./i.test(herb.unit) || /ATADO|AT\\./i.test(herb.canonical_name) || herb.unit === 'AT.') {
           assert.strictEqual(herb.unit, 'AT.', `Herb ${herb.canonical_name} must use AT. unit instead of ${herb.unit}`);
           assert.strictEqual(herb.normalized_unit, 'bundle', `Herb ${herb.canonical_name} must have normalized_unit 'bundle' instead of ${herb.normalized_unit}`);
           assert.strictEqual(herb.price_unit, 'bundle', `Herb ${herb.canonical_name} must have price_unit 'bundle' instead of ${herb.price_unit}`);
       }
   });
});

// 7. Garbage category removal
test('Test 7 — Garbage Category Removal', () => {
  const garbageCats = ['Varios', 'Envasado', 'Empacados'];
  catalog.forEach(entry => {
    assert.ok(!garbageCats.includes(entry.categoria), `Garbage category "${entry.categoria}" found in ${entry.canonical_name}`);
  });
});

// 8. Invalid empty category rejection
test('Test 8 — Invalid Entry Rejection', () => {
  catalog.forEach(entry => {
    assert.ok(entry.categoria && entry.categoria.trim() !== '', `Empty product category in ${entry.canonical_name}`);
    assert.ok(entry.rubro && entry.rubro.trim() !== '', `Empty product rubro in ${entry.canonical_name}`);
    
    // Check purely numeric names
    assert.ok(!/^\d+(\.\d+)?[a-z]*$/i.test(entry.canonical_name.trim()), `Identity is just a number/unit: ${entry.canonical_name}`);
  });
});


console.log('\n═══════════════════════════════════════');
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) process.exit(1);
