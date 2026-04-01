const assert = require('assert');
const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'product_matcher_catalog_v3_2.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

console.log('catalog_v3_2 tests\n');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  OK ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL ' + name);
    console.log('    ' + err.message);
    failed++;
  }
}

function findByGroup(group) {
  return catalog.find(x => x.comparison_group === group);
}

test('TEST 1: "Avena Hojuelas" exists as its own group', function () {
  const row = findByGroup('Avena Hojuelas');
  assert.ok(row, 'Avena Hojuelas should exist');
});

test('TEST 2: "Avena Instantanea" exists as its own group', function () {
  const row = findByGroup('Avena Instantanea');
  assert.ok(row, 'Avena Instantanea should exist');
});

test('TEST 3: "Bebida de Avena" exists as its own group', function () {
  const row = findByGroup('Bebida de Avena');
  assert.ok(row, 'Bebida de Avena should exist');
});

test('TEST 4: No alias of "bebida" appears inside hojuelas', function () {
  const row = findByGroup('Avena Hojuelas');
  assert.ok(row, 'Group must exist to test aliases');
  if (Array.isArray(row.aliases)) {
    const hasBebida = row.aliases.some(a => a.toLowerCase().includes('bebida') || a.toLowerCase().includes('drink') || a.toLowerCase().includes('leche'));
    assert.strictEqual(hasBebida, false, 'Hojuelas must not contain bebida aliases');
  }
});

test('TEST 5: No alias of "instantanea" appears inside bebida', function () {
  const row = findByGroup('Bebida de Avena');
  assert.ok(row, 'Group must exist to test aliases');
  if (Array.isArray(row.aliases)) {
    const hasInstant = row.aliases.some(a => a.toLowerCase().includes('instant') || a.toLowerCase().includes('instantánea') || a.toLowerCase().includes('instantanea'));
    assert.strictEqual(hasInstant, false, 'Bebida must not contain instantanea aliases');
  }
});

test('TEST 6: Existing categories (Leche, Huevos) still exist', function () {
  const leche = catalog.find(x => x.comparison_group && x.comparison_group.includes('Leche'));
  assert.ok(leche, 'Leche category should still exist');

  const huevos = catalog.find(x => x.comparison_group && x.comparison_group.includes('Huevos'));
  assert.ok(huevos, 'Huevos category should still exist');
});

test('TEST 7: No generic "Avena" group remains', function () {
  const generic = findByGroup('Avena');
  assert.strictEqual(generic, undefined, 'Generic "Avena" group should be completely removed');
});

test('TEST 8: Isolation of aliases between types', function () {
  const allHojuelas = catalog.filter(x => x.comparison_group === 'Avena Hojuelas');
  const allInstantanea = catalog.filter(x => x.comparison_group === 'Avena Instantanea');
  
  allHojuelas.forEach(h => {
      if (h.aliases) {
          assert.ok(!h.aliases.some(a => a.toLowerCase().includes('instant')), 'Hojuelas has instant alias');
      }
  });

  allInstantanea.forEach(i => {
      if (i.aliases) {
          assert.ok(!i.aliases.some(a => a.toLowerCase().includes('hojuela')), 'Instantanea has hojuelas alias');
      }
  });
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed.');

if (failed > 0) {
  process.exit(1);
}
