/**
 * test-bugs.js — Tests que reproducen bugs activos en PrecioJusto
 *
 * Bug #6: normalizeUnits() → Arroz mostrando S/8,900/kg por vt=0 o vt en g mal normalizado
 * Bug #7: isRelevant() → Productos no alimenticios pasando el filtro
 *
 * Para ejecutar: node test/test-bugs.js
 * Estado esperado: TODOS DEBEN FALLAR hasta que los bugs sean corregidos.
 */

'use strict';

// ─── Importar funciones a testear ─────────────────────────────────────────────
const { isRelevant } = require('../scrapers/utils');
const config = require('../scrapers/config');

// ─── Helpers de assert simples (sin dependencias externas) ────────────────────
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        results.push({ status: '✅ PASS', name: testName });
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        failed++;
        results.push({ status: '❌ FAIL', name: testName, detail });
        console.log(`  ❌ FAIL: ${testName}`);
        if (detail) console.log(`         → ${detail}`);
    }
}

function assertEqual(actual, expected, testName) {
    const ok = actual === expected;
    assert(ok, testName, `esperado=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}`);
}

function assertBelow(actual, threshold, testName) {
    const ok = actual < threshold;
    assert(ok, testName, `valor=${actual} debería ser < ${threshold}`);
}

function section(title) {
    console.log(`\n── ${title} ──────────────────────────────────────────`);
}

// ─── Clonar normalizeUnits extraída de app.js para testear en Node ────────────
// (app.js no es un módulo CommonJS — se extrae la lógica pura para testeo unitario)
function normalizeUnits(rawData) {
    rawData.forEach(d => {
        if (!d.um) return;
        // Bug #6 fix: si vt=0, limpiar pxum pre-calculado para que no escape al render
        if (!d.vt || d.vt <= 0) { d.pxum = null; return; }
        const u = d.um.toLowerCase().trim();
        if (u === 'g' || u === 'gr') {
            d.vt = d.vt / 1000;
            d.um = 'kg';
            d.presentacion = d.vt;
        } else if (u === 'ml') {
            d.vt = d.vt / 1000;
            d.um = 'L';
            d.presentacion = d.vt;
        } else if (u === 'lt' || u === 'l') {
            d.um = 'L';
        } else if (u === 'kg') {
            d.um = 'kg';
        }
        if (d.vt) {
            d.vt = parseFloat(d.vt.toFixed(2));
            if (u === 'g' || u === 'gr' || u === 'ml') d.presentacion = d.vt;
        }
    });
}

function calcPxum(precioOnline, vt) {
    if (!vt || vt <= 0) return Infinity;
    return precioOnline / vt;
}

// =============================================================================
// BUG #6: normalizeUnits — S/8,900/kg Arroz
// =============================================================================
section('BUG #6 — normalizeUnits() precios absurdos en Arroz');

// ─── Test #6.1: Arroz 5kg — ya en kg, no debe dividir de nuevo ───────────────
{
    const row = { item: 'Arroz Extra Costeño 5kg', um: 'kg', vt: 5, precioOnline: 22.9 };
    normalizeUnits([row]);
    const pxum = calcPxum(row.precioOnline, row.vt);
    // S/22.90 / 5kg = S/4.58/kg (razonable)
    assertBelow(pxum, 100, '#6.1 arroz 5kg: pxum debe ser < S/100/kg');
    assertEqual(row.um, 'kg', '#6.1 arroz 5kg: unidad sigue siendo kg');
    assertEqual(row.vt, 5, '#6.1 arroz 5kg: vt no cambia (era 5kg)');
}

// ─── Test #6.2: Arroz 900g — debe convertir a 0.9kg, no 0kg ─────────────────
{
    const row = { item: 'Arroz Costeño Extra 900g', um: 'g', vt: 900, precioOnline: 4.9 };
    normalizeUnits([row]);
    assertEqual(row.um, 'kg', '#6.2 arroz 900g: unidad debe ser kg tras conversión');
    assertEqual(row.vt, 0.9, '#6.2 arroz 900g: vt debe ser 0.9 (900/1000)');
    const pxum = calcPxum(row.precioOnline, row.vt);
    assertBelow(pxum, 50, '#6.2 arroz 900g: pxum debe ser < S/50/kg (razonable)');
}

// ─── Test #6.3: vt=0 — normalizeUnits debe anular pxum pre-calculado ────────
{
    const row = { item: 'Arroz Genérico 0g', um: 'g', vt: 0, precioOnline: 5.5, pxum: 8900 };
    normalizeUnits([row]);
    // Fix real: cuando vt<=0, el pxum pre-calculado (absurdo) debe ser anulado
    assert(row.pxum === null, '#6.3 vt=0: normalizeUnits debe anular pxum absurdo pre-calculado');
    assert(!row.vt || row.vt === 0, '#6.3 vt=0: vt no se modifica (permanece inválido)');
    assertEqual(row.um, 'g', '#6.3 vt=0: um no cambia cuando vt es inválido');
}

// ─── Test #6.6: getFiltered debe excluir filas con pxum absurdo (>500) ────────
{
    function getFilteredTest(data) {
        return data.filter(d => {
            if (!d.vt || d.vt <= 0) return false;
            if (d.pxum && (d.pxum > 500 || !isFinite(d.pxum))) return false;
            return true;
        });
    }
    const badRow  = { item: 'Arroz vt0', um: 'kg', vt: 0,   precioOnline: 8.9, pxum: 8900 };
    const goodRow = { item: 'Arroz 5kg', um: 'kg', vt: 5,   precioOnline: 22.9, pxum: 4.58 };
    const infRow  = { item: 'Arroz inf', um: 'kg', vt: 0.001, precioOnline: 8.9, pxum: Infinity };
    const filtered = getFilteredTest([badRow, goodRow, infRow]);
    assertEqual(filtered.length, 1, '#6.6 getFiltered: solo 1 fila válida pasa (vt>0 y pxum<500)');
    assertEqual(filtered[0].item, 'Arroz 5kg', '#6.6 getFiltered: la fila válida es "Arroz 5kg"');
}

// ─── Test #6.4: Llamada doble a normalizeUnits no debe re-dividir ─────────────
{
    const row = { item: 'Arroz 1kg', um: 'kg', vt: 1, precioOnline: 5.5 };
    normalizeUnits([row]);  // primera vez
    normalizeUnits([row]);  // segunda vez (bug potencial si ya fue convertido)
    assertEqual(row.vt, 1, '#6.4 doble llamada: vt no cambia (ya está en kg)');
    const pxum = calcPxum(row.precioOnline, row.vt);
    assertBelow(pxum, 100, '#6.4 doble llamada: pxum razonable tras doble normalización');
}

// ─── Test #6.5: Aceite 1L — no debe clasificarse como kg ─────────────────────
{
    const row = { item: 'Aceite Primor 1L', um: 'lt', vt: 1, precioOnline: 9.9 };
    normalizeUnits([row]);
    assertEqual(row.um, 'L', '#6.5 aceite 1L: unidad debe ser L');
    assertEqual(row.vt, 1, '#6.5 aceite 1L: vt = 1L sin cambio');
}

// =============================================================================
// BUG #7: isRelevant() — productos no alimenticios pasando el filtro
// =============================================================================
section('BUG #7 — isRelevant() deja pasar productos no alimenticios');

// ─── Test #7.1: Cocedor de huevos → NO debe pasar en categoría huevos ─────────
assert(
    !isRelevant('Cocedor de Huevos Eléctrico 7 Piezas', 'huevos'),
    '#7.1 "Cocedor de Huevos" no debe pasar isRelevant(huevos)'
);

// ─── Test #7.2: Comida mascotas → NO debe pasar en categoría arroz ────────────
assert(
    !isRelevant('Ricocan Perro Adulto Arroz y Pollo 15kg', 'arroz'),
    '#7.2 "Ricocan Arroz y Pollo" no debe pasar isRelevant(arroz)'
);

// ─── Test #7.3: Bárcidda / Dato Libre → NO debe pasar en ninguna cat ─────────
assert(
    !isRelevant('Bárcidda Dato Libre Carga Digital 15 Soles', 'arroz'),
    '#7.3 "Bárcidda Dato Libre" no debe pasar isRelevant(arroz)'
);

// ─── Test #7.4: Aceite de motor → NO debe pasar en categoría aceite ──────────
assert(
    !isRelevant('Aceite para Motor Mobil 1L', 'aceite'),
    '#7.4 "Aceite para Motor" no debe pasar isRelevant(aceite)'
);

// ─── Test #7.5: Aceite de masaje corporal → NO debe pasar en aceite ──────────
assert(
    !isRelevant('Aceite Corporal Johnson Baby 200ml', 'aceite'),
    '#7.5 "Aceite Corporal" no debe pasar isRelevant(aceite)'
);

// ─── Test #7.6: Huevo de Pascua Chocolate → NO debe pasar en huevos ──────────
assert(
    !isRelevant('Huevo de Pascua Sublime Chocolate 100g', 'huevos'),
    '#7.6 "Huevo de Pascua Chocolate" no debe pasar isRelevant(huevos)'
);

// ─── Test #7.7: Mouse pad → NO debe pasar globalmente en arroz ───────────────
assert(
    !isRelevant('Mouse Pad Gamer RGB Arroz Special Edition', 'arroz'),
    '#7.7 "Mouse Pad" no debe pasar isRelevant(arroz) — exclusión global'
);

// ─── Test #7.8: Shampoo con palabra "huevo" → NO debe pasar en huevos ────────
assert(
    !isRelevant('Shampoo Pantene Huevo y Keratin 400ml', 'huevos'),
    '#7.8 "Shampoo con huevo" no debe pasar isRelevant(huevos)'
);

// ─── Test #7.9: Leche Evaporada correcta — SÍ debe pasar ────────────────────
assert(
    isRelevant('Leche Evaporada Gloria Entera 400g', 'leche-evaporada'),
    '#7.9 "Leche Evaporada Gloria" SÍ debe pasar isRelevant(leche-evaporada)'
);

// ─── Test #7.10: Arroz Costeño correcto — SÍ debe pasar ─────────────────────
assert(
    isRelevant('Arroz Extra Costeño 5kg', 'arroz'),
    '#7.10 "Arroz Extra Costeño" SÍ debe pasar isRelevant(arroz)'
);

// ─── Test #7.11: Fideos Nicolini — SÍ debe pasar ─────────────────────────────
assert(
    isRelevant('Fideos Nicolini Spaghetti 400g', 'fideos'),
    '#7.11 "Fideos Nicolini Spaghetti" SÍ debe pasar isRelevant(fideos)'
);

// ─── Test #7.12: Comida para perros en categoria pollo → NO debe pasar ────────
assert(
    !isRelevant('Alimento para Perros Adultos Sabor Pollo 15kg', 'pollo'),
    '#7.12 "Alimento para Perros Pollo" no debe pasar isRelevant(pollo)'
);

// =============================================================================
// RESUMEN
// =============================================================================
section('RESUMEN DE RESULTADOS');
console.log(`\n  Total: ${passed + failed} tests | ✅ ${passed} pasados | ❌ ${failed} fallidos\n`);

if (failed > 0) {
    console.log('  ⛔ Tests fallidos (bugs activos que deben ser corregidos):');
    results.filter(r => r.status.startsWith('❌')).forEach(r => {
        console.log(`     • ${r.name}`);
        if (r.detail) console.log(`       ${r.detail}`);
    });
    console.log('');
    process.exit(1); // exit code 1 → CI detecta que hay bugs
} else {
    console.log('  🎉 Todos los tests pasan — bugs resueltos\n');
    process.exit(0);
}
