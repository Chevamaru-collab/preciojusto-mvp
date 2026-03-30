const assert = require('assert');
const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'product_matcher_catalog_v3_1.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

function findByCanonical(name) {
  return catalog.find(function (x) {
    return x.canonical_name === name;
  });
}

console.log('catalog_v3_1 tests\n');

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

test('Mix Berries exists as its own canonical identity', function () {
  var row = findByCanonical('Frutas Mix Berries');
  assert.ok(row, 'Frutas Mix Berries should exist');
  assert.strictEqual(row.subcategoria, 'Mix Berries');
  assert.strictEqual(row.comparison_group, 'Frutas Mix Berries');
});

test('Aguaymanto exists as single-fruit identity', function () {
  var row =
    findByCanonical('Frutas Aguaymanto 0.2 KG') ||
    findByCanonical('Frutas Aguaymanto 0.25 KG');

  assert.ok(row, 'Frutas Aguaymanto single-fruit entry should exist');
  assert.ok(
    row.subcategoria === 'Aguaymanto' || row.subcategoria === 'Aguaymantos',
    'Aguaymanto subcategoria should be normalized closely enough'
  );
});

test('No single-fruit aguaymanto entry may keep mix aliases', function () {
  var bad = catalog.filter(function (x) {
    return (
      x.subcategoria === 'Aguaymanto' &&
      Array.isArray(x.aliases) &&
      x.aliases.some(function (a) {
        return a.indexOf('+') !== -1 || a.toLowerCase().indexOf('mix') !== -1;
      })
    );
  });

  assert.strictEqual(
    bad.length,
    0,
    'Aguaymanto single-fruit entries must not keep mix aliases'
  );
});

test('No mix entry may be aliased as a single-fruit product', function () {
  var bad = catalog.filter(function (x) {
    return (
      x.subcategoria !== 'Mix Berries' &&
      Array.isArray(x.aliases) &&
      x.aliases.some(function (a) {
        return a.toLowerCase().indexOf('mix berries') !== -1;
      })
    );
  });

  assert.strictEqual(
    bad.length,
    0,
    'Mix Berries must not live as alias under single-fruit entities'
  );
});

test('Known healthy entries remain valid', function () {
  var albahaca = findByCanonical('Albahaca AT.');
  assert.ok(albahaca, 'Albahaca AT. should still exist');

  var acelga = findByCanonical('Acelga 0.3 KG');
  assert.ok(acelga, 'Acelga 0.3 KG should still exist');

  var lecheUht = catalog.find(function (x) {
    return x.comparison_group === 'Leche UHT';
  });
  assert.ok(lecheUht, 'Leche UHT should still exist');

  var lecheEvap = catalog.find(function (x) {
    return x.comparison_group === 'Leche Evaporada';
  });
  assert.ok(lecheEvap, 'Leche Evaporada should still exist');
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed.');

if (failed > 0) {
  process.exit(1);
}