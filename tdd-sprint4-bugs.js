const fs = require('fs');
const { normalizePuppeteerItem } = require('./scrapers/merge-sprint3');

// Mock data structures to simulate the scraper's output
const mockItems = [
    {
        desc: "BUG 1: UM incorrecta en Arroz (Gran Reserva 5kg dice 'u' en vez de 'kg')",
        raw: {
            super: "plazavea",
            nombre: "Pack Arroz Extra Añejo VALLENORTE Gran Reserva Bolsa 5kg", // The prompt shows 'Pack Arroz... 5kg', maybe the user had pack? Actually user gave two rows: 'Pack Arroz Extra Añejo VALLENORTE Gran Reserva...' with 1 u, and 'Arroz Extra Añejo VALLENORTE Gran Reserva Bols...' with 1 u. Let's use the second.
            presentacion: { valor: 1, unidad: 'u' },
            precios: { online: 20.90, porUnidad: 20.90 }
        },
        catId: "arroz",
        expectations: { um: "kg", volumen_total: 5 }
    },
    {
        desc: "BUG 2: Pérdida de Especificidad (Arroz Extra Añejo Gran Reserva)",
        raw: {
            super: "plazavea",
            nombre: "Arroz Extra Añejo VALLENORTE Gran Reserva Bolsa 5kg",
            presentacion: { valor: 5, unidad: 'kg' },
            precios: { online: 20.90, porUnidad: 4.18 }
        },
        catId: "arroz",
        expectations: { tipo: "Extra Añejo Gran Reserva" }
    },
    {
        desc: "BUG 3: Fuga Avena -> Pan de Molde (Unión Multisemillas y Avena)",
        raw: {
            super: "plazavea",
            nombre: "Pan de Molde UNIÓN Multisemillas y Avena Bolsa 540g",
            presentacion: { valor: 0.54, unidad: 'kg' },
            precios: { online: 10.80, porUnidad: 20 }
        },
        catId: "avena",
        expectations: { categoria: "Pan de Molde", marca: "Unión", tipo: "Multisemilla y Avena" } // Wait, tipo logic for Pan is "Multisemilla", can we do "Multisemilla y Avena"?
    },
    {
        desc: "BUG 4: Fuga Avena -> Leche UHT Activavena",
        raw: {
            super: "plazavea",
            nombre: "Leche Activavena GLORIA UHT Niños Caja 180ml Paquete 6un",
            presentacion: { valor: 0.18, unidad: 'L' },
            precios: { online: 10.70, porUnidad: 59.44 }
        },
        catId: "avena",
        expectations: { categoria: "Leche Fresca", tipo: "UHT Activavena", volumen_total: 1.08, marca: "Gloria" }
    },
    {
        desc: "BUG 5: Nuevo subtipo Avena (Sin Gluten La Purita)",
        raw: {
            super: "plazavea",
            nombre: "Avena con Hojuela sin Gluten LA PURITA Bolsa 800g",
            presentacion: { valor: 0.8, unidad: 'kg' },
            precios: { online: 18.00, porUnidad: 22.50 }
        },
        catId: "avena",
        expectations: { tipo: "Sin Gluten", marca: "La Purita" }
    }
];

let failed = 0;
let passed = 0;

console.log("=== TDD: PRECIO JUSTO BUG REPRODUCER ===");

mockItems.forEach((test, idx) => {
    console.log(`\nTest ${idx + 1}: ${test.desc}`);
    const result = normalizePuppeteerItem(test.raw, test.catId);
    
    let currentFailed = false;
    for (const [key, expectedValue] of Object.entries(test.expectations)) {
        const actualValue = result[key];
        // For numbers, handle floating point issues
        if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
            if (Math.abs(expectedValue - actualValue) > 0.01) {
                console.error(`  [X] Failed '${key}'. Expected: ${expectedValue}, Got: ${actualValue}`);
                currentFailed = true;
            } else {
                console.log(`  [OK] '${key}' == ${actualValue}`);
            }
        } else {
            if (actualValue !== expectedValue) {
                console.error(`  [X] Failed '${key}'. Expected: '${expectedValue}', Got: '${actualValue}'`);
                currentFailed = true;
            } else {
                console.log(`  [OK] '${key}' == '${actualValue}'`);
            }
        }
    }
    if (currentFailed) failed++; else passed++;
});

console.log(`\n=== RESULTS: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) process.exit(1);
