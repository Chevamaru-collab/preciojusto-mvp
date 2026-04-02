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

// Menestras semantic logic tests
test('TEST 9: "Lentejas" exists in catalog under Menestras struct', function () {
  const row = catalog.find(x => x.comparison_group === 'Lentejas');
  assert.ok(row, 'Lentejas should exist');
  assert.strictEqual(row.categoria, 'Menestras', 'Lentejas must reside under Menestras categoria');
});

test('TEST 10: "Frijol Canario" exists in catalog under Menestras struct', function () {
  const row = catalog.find(x => x.comparison_group === 'Frijol Canario');
  assert.ok(row, 'Frijol Canario should exist');
  assert.strictEqual(row.categoria, 'Menestras', 'Frijol Canario must reside under Menestras categoria');
});

// Unknown monolith logic tests
test('TEST 11: Unknown monolith avoided', function () {
  const unknowns = catalog.filter(x => x.canonical_name === 'Unknown');
  // There should be 1 or 0 hard-unknown, but it should not absorb "Empacados"
  const empacadosInsideUnknown = unknowns.some(u => u.family_name === 'Empacados');
  assert.strictEqual(empacadosInsideUnknown, false, 'Empacados must not be absorbed into an Unknown monolith');
});

test('TEST 12: Recoverable garbage keeps identity', function () {
  const row = catalog.find(x => x.canonical_name === 'Empacados');
  assert.ok(row, 'Empacados should emerge as its own distinct entry');
  assert.strictEqual(row.needs_review, true, 'Recoverable cases must keep needs_review=true');
});

test('TEST 13: Hard-unknown remains traceable', function () {
  const row = catalog.find(x => x.canonical_name === 'Unknown');
  // If there are true hard-unknowns, they stay Unknown. In the mock they might not exist.
  // We just ensure if it exists, it stays reviewable.
  if (row) {
      assert.strictEqual(row.needs_review, true, 'Hard-unknowns must remain reviewable');
  }
});

// Mantequilla Ssal typo contamination tests
test('TEST 14: "Ssal" does not exist anywhere in canonical_name or comparison_group', function () {
  const contaminated = catalog.filter(x =>
    (x.canonical_name && x.canonical_name.includes('Ssal')) ||
    (x.comparison_group && x.comparison_group.includes('Ssal'))
  );
  assert.strictEqual(contaminated.length, 0, 'No entry should contain the typo "Ssal"');
});

test('TEST 15: "Mantequilla Sin Sal" exists as a valid comparison group', function () {
  const row = catalog.find(x => x.comparison_group === 'Mantequilla Sin Sal');
  assert.ok(row, '"Mantequilla Sin Sal" comparison group must exist');
});

test('TEST 16: "Mantequilla Sal" entries remain intact and unmodified', function () {
  const rows = catalog.filter(x => x.comparison_group === 'Mantequilla Sal');
  assert.ok(rows.length > 0, '"Mantequilla Sal" entries must still exist');
  rows.forEach(r => {
    assert.ok(!r.canonical_name.includes('Ssal'), '"Mantequilla Sal" must not contain "Ssal"');
    assert.ok(!r.canonical_name.includes('Sin Sal'), '"Mantequilla Sal" must not be affected by Sin Sal rename');
  });
});

// Spreparar typo contamination tests
test('TEST 17: "Spreparar" does not exist anywhere in canonical_name or comparison_group', function () {
  const contaminated = catalog.filter(x =>
    (x.canonical_name && x.canonical_name.includes('Spreparar')) ||
    (x.comparison_group && x.comparison_group.includes('Spreparar'))
  );
  assert.strictEqual(contaminated.length, 0, 'No entry should contain the typo "Spreparar"');
});

test('TEST 18: "Sin Preparar" form appears as a valid group', function () {
  const row = catalog.find(x => x.comparison_group && x.comparison_group.includes('Sin Preparar'));
  assert.ok(row, 'A "Sin Preparar" comparison group must exist');
});

test('TEST 19: Refresco family survives and carries "Sin Preparar" after fix', function () {
  // In V3.2 the contaminated items live under Refresco (not Harina)
  const refresco = catalog.filter(x => x.comparison_group && x.comparison_group.startsWith('Refresco'));
  assert.ok(refresco.length > 0, 'Refresco entries must still exist');
  const refrescoSinPreparar = refresco.filter(x => x.comparison_group.includes('Sin Preparar'));
  assert.ok(refrescoSinPreparar.length > 0, 'Refresco Sin Preparar group must exist after fix');
  // No Refresco entry should still carry the typo
  const refrescoSpreparar = refresco.filter(x => x.comparison_group.includes('Spreparar'));
  assert.strictEqual(refrescoSpreparar.length, 0, 'No Refresco entry should still carry "Spreparar"');
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed.');

if (failed > 0) {
  process.exit(1);
}
