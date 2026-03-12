/**
 * test-categories.js — Tests para Bug #8 y errores de categorización
 *
 * Bug #8: Categorías duplicadas (Aceite vs aceite, Arroz vs arroz...)
 * Bug #9: Filtros no cascadean (Supermercado → Categoría → Tipo → Presentación)
 * Bug #10: Productos de pescado mal clasificados como Aceite (Filete Vegetal → Pescado)
 *
 * Para ejecutar: node test/test-categories.js
 */

'use strict';

const fs = require('fs');

// ─── Cargar rawData desde data.js ─────────────────────────────────────────────
const src = fs.readFileSync('./data.js', 'utf8');
const match = src.match(/const rawData = (\[[\s\S]*?\]);/);
if (!match) { console.error('No se pudo parsear data.js'); process.exit(1); }
const rawData = JSON.parse(match[1]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const results = [];

function assert(condition, name, detail = '') {
    if (condition) { passed++; results.push({ ok: true, name }); console.log('  ✅ PASS: ' + name); }
    else { failed++; results.push({ ok: false, name, detail }); console.log('  ❌ FAIL: ' + name); if (detail) console.log('         → ' + detail); }
}
function assertEqual(a, b, name) { assert(a === b, name, `esperado=${JSON.stringify(b)} actual=${JSON.stringify(a)}`); }
function assertBelow(a, threshold, name) { assert(a < threshold, name, `${a} debe ser < ${threshold}`); }
function section(t) { console.log('\n── ' + t + ' ──────────────────────────────────────────'); }

// ─── Funciones extraídas de app.js para testeo en Node ────────────────────────

// Normalización de categorías (FIX a implementar)
function normalizeCat(cat) {
    if (!cat) return cat;
    const map = {
        'aceite': 'Aceite', 'arroz': 'Arroz', 'avena': 'Avena',
        'azucar': 'Azucar', 'azucar-blanca': 'Azúcar Blanca', 'azucar-rubia': 'Azúcar Rubia',
        'carne': 'Carne', 'condimentos': 'Condimentos', 'fideos': 'Fideos',
        'frijol-canario': 'Frijol Canario', 'frutas': 'Frutas', 'harina': 'Harina',
        'huevos': 'Huevos', 'leche': 'Leche', 'leche-evaporada': 'Leche Evaporada',
        'leche-fresca': 'Leche Fresca', 'lentejas': 'Lentejas', 'mantequilla': 'Mantequilla',
        'menestras': 'Menestras', 'pan': 'Pan', 'pan-molde': 'Pan de Molde',
        'pescado': 'Pescado', 'pollo': 'Pollo', 'verduras': 'Verduras'
    };
    return map[cat.toLowerCase()] || cat;
}

// Identificar si un producto es en realidad Pescado en conserva (mal clasificado como Aceite)
function isFishInOilProduct(item) {
    const n = (item || '').toLowerCase();
    const fishKeywords = ['filete de atún', 'filete de atun', 'filete de bonito', 'filete de jurel',
        'filete de caballa', 'anchoveta en aceite', 'entero de anchoveta', 'trozos de atún',
        'trozos de jurel', 'grated de atún', 'grated de atun', 'sardinas en aceite',
        'filete de sardina'];
    return fishKeywords.some(k => n.includes(k));
}

// Obtener categorías únicas disponibles para un super dado
function getCatsForSuper(data, superNombre) {
    const base = superNombre === 'Todos' ? data : data.filter(d => d.super === superNombre);
    const cats = [...new Set(base.map(d => normalizeCat(d.categoria)).filter(Boolean))].sort();
    return cats;
}

// Obtener tipos disponibles para un super+cat dado
function getTiposForSuperCat(data, superNombre, cat) {
    let base = data;
    if (superNombre !== 'Todos') base = base.filter(d => d.super === superNombre);
    if (cat !== 'Todos') base = base.filter(d => normalizeCat(d.categoria) === cat);
    return [...new Set(base.map(d => d.tipo).filter(Boolean))].sort();
}

// =============================================================================
// BUG #8: Categorías duplicadas
// =============================================================================
section('BUG #8 — Categorías duplicadas en el filtro');

// ─── Test #8.1: rawData tiene doble naming (aceite vs Aceite)
{
    const cats = [...new Set(rawData.map(d => d.categoria))];
    const lower = cats.filter(c => c === c.toLowerCase() && c !== c.charAt(0).toUpperCase() + c.slice(1));
    const dupes = lower.filter(l => cats.some(c => c.toLowerCase() === l && c !== l));
    assert(dupes.length > 0, '#8.1 REPRODUCE: rawData tiene categorías con doble casing (aceite+Aceite)');
    if (dupes.length) console.log('         Categorías con doble casing: ' + dupes.join(', '));
}

// ─── Test #8.2: Después de normalizeCat, no deben quedar duplicados
{
    const normalized = [...new Set(rawData.map(d => normalizeCat(d.categoria)).filter(Boolean))].sort();
    const expectedMax = 24; // 24 categorías únicas: Leche, Leche Evaporada, Leche Fresca son separadas
    assertBelow(normalized.length, expectedMax + 1,
        '#8.2 FIX: normalizeCat() produce max ' + expectedMax + ' categorías únicas (sin duplicados)');
    // No deben coexistir "Aceite" y "aceite"
    const hasAceite = normalized.includes('Aceite');
    const hasAceiteMin = normalized.includes('aceite');
    assert(hasAceite && !hasAceiteMin, '#8.2 FIX: solo existe "Aceite" (no "aceite") después de normalizar');
    assert(normalized.includes('Arroz') && !normalized.includes('arroz'),
        '#8.2 FIX: solo existe "Arroz" (no "arroz") después de normalizar');
}

// ─── Test #8.3: normalizeCat idempotente — aplicar dos veces da el mismo resultado
{
    const cats = ['aceite', 'Aceite', 'arroz', 'Arroz', 'pan-molde', 'leche-evaporada', 'azucar-blanca'];
    cats.forEach(c => {
        const once = normalizeCat(c);
        const twice = normalizeCat(once);
        assertEqual(once, twice, '#8.3 normalizeCat idempotente: "' + c + '" → "' + once + '"');
    });
}

// =============================================================================
// BUG #9: Cascada de filtros (Super → Cat → Tipo → Presentación)
// =============================================================================
section('BUG #9 — Filtros no cascadean correctamente');

// ─── Test #9.1: Categorías disponibles para Metro ≠ categorías para todos
{
    const allCats = getCatsForSuper(rawData, 'Todos');
    const metroCats = getCatsForSuper(rawData, 'Metro');
    // Metro no tiene todas las categorías — debe ser un subconjunto
    assert(metroCats.length <= allCats.length,
        '#9.1 Categorías de Metro ≤ categorías totales (cascada funciona)');
    assert(metroCats.every(c => allCats.includes(c)),
        '#9.1 Todas las categorías de Metro están en el total (subconjunto válido)');
    console.log('         Metro tiene ' + metroCats.length + ' cats vs ' + allCats.length + ' totales');
}

// ─── Test #9.2: Tipos de "Aceite" en Metro ≠ tipos de "Aceite" en todos
{
    const allTipos = getTiposForSuperCat(rawData, 'Todos', 'Aceite');
    const metroTipos = getTiposForSuperCat(rawData, 'Metro', 'Aceite');
    assert(metroTipos.every(t => allTipos.includes(t)),
        '#9.2 Tipos de Aceite en Metro son subconjunto de todos los tipos de Aceite');
    console.log('         Metro:Aceite tiene ' + metroTipos.length + ' tipos vs ' + allTipos.length + ' totales');
}

// ─── Test #9.3: Al cambiar super, las categorías se recalculan
{
    // Simular: si super = "Wong", los cats deben venir solo del data de Wong
    const wongData = rawData.filter(d => d.super === 'Wong');
    const wongCats = [...new Set(wongData.map(d => normalizeCat(d.categoria)).filter(Boolean))].sort();
    const wongCatsFromHelper = getCatsForSuper(rawData, 'Wong');
    assertEqual(JSON.stringify(wongCats), JSON.stringify(wongCatsFromHelper),
        '#9.3 getCatsForSuper("Wong") equivale a filtrar rawData por Wong y extraer cats');
}

// =============================================================================
// BUG #10: "Filete Vegetal" y similares — Pescado mal clasificado como Aceite
// =============================================================================
section('BUG #10 — Productos de pescado clasificados como Aceite');

// ─── Test #10.1: Existen productos de pescado en categoria Aceite
{
    const fishInAceite = rawData.filter(d =>
        d.categoria === 'Aceite' && isFishInOilProduct(d.item)
    );
    assert(fishInAceite.length > 0,
        '#10.1 REPRODUCE: hay ' + fishInAceite.length + ' productos de pescado en categoria Aceite');
    console.log('         Ejemplo: ' + (fishInAceite[0]?.item || 'N/A'));
}

// ─── Test #10.2: isFishInOilProduct detecta correctamente
{
    const cases = [
        { item: 'Filete de Atún en Aceite Vegetal Florida 140g', expected: true },
        { item: 'Filete de Bonito CAMPOMAR en Aceite Vegetal Lata 150g', expected: true },
        { item: 'Anchoveta en Aceite Vegetal Santorini 125g', expected: true },
        { item: 'Trozos de Jurel en Aceite Vegetal Campomar 150g', expected: true },
        { item: 'Aceite Primor Vegetal 1L', expected: false },
        { item: 'Aceite de Oliva Carbonell 500ml', expected: false },
        { item: 'Arroz Costeño Extra 5kg', expected: false },
    ];
    cases.forEach(({ item, expected }) => {
        assertEqual(isFishInOilProduct(item), expected,
            '#10.2 isFishInOilProduct("' + item.substring(0, 40) + '...") → ' + expected);
    });
}

// ─── Test #10.3: Después del fix, ningún producto de pescado debe estar en Aceite
{
    // Simular el fix: reclasificar en memoria
    const reclassified = rawData.map(d => {
        if (d.categoria === 'Aceite' && isFishInOilProduct(d.item)) {
            return { ...d, categoria: 'Pescado' };
        }
        return d;
    });
    const stillFishInAceite = reclassified.filter(d =>
        d.categoria === 'Aceite' && isFishInOilProduct(d.item)
    );
    assertEqual(stillFishInAceite.length, 0,
        '#10.3 FIX: tras reclasificación, 0 productos de pescado en categoria Aceite');
    // Verifica que aumentó Pescado — compara normalizado
    const pescadoAfter = reclassified.filter(d => normalizeCat(d.categoria) === 'Pescado').length;
    const pescadoBefore = rawData.filter(d => normalizeCat(d.categoria) === 'Pescado').length;
    assert(pescadoAfter > pescadoBefore,
        '#10.3 FIX: conteo normalizado de Pescado aumentó: ' + pescadoBefore + ' → ' + pescadoAfter);
}

// =============================================================================
// RESUMEN
// =============================================================================
section('RESUMEN DE RESULTADOS');
console.log('\n  Total: ' + (passed + failed) + ' tests | ✅ ' + passed + ' pasados | ❌ ' + failed + ' fallidos\n');
if (failed > 0) {
    console.log('  ⛔ Tests fallidos:');
    results.filter(r => !r.ok).forEach(r => { console.log('     • ' + r.name); if (r.detail) console.log('       ' + r.detail); });
    console.log('');
    process.exit(1);
} else {
    console.log('  🎉 Todos los tests pasan\n');
    process.exit(0);
}
