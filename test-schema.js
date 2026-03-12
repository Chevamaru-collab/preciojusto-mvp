const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_JS_PATH = path.join(__dirname, 'data.js');

try {
    // Run the merge script to populate test data into data.js
    console.log("Running merge-sprint3.js to generate schema...");
    execSync('node scrapers/merge-sprint3.js', { stdio: 'inherit' });

    // Read the generated data.js
    if (!fs.existsSync(DATA_JS_PATH)) {
        throw new Error("data.js not found!");
    }
    
    const jsContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
    const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
         throw new Error("Could not parse JSON from data.js");
    }

    const data = JSON.parse(jsonMatch[0]);

    if (data.length === 0) {
        throw new Error("data.js is empty!");
    }

    // Pick the last item (should be recently added and have all fields)
    const item = data[data.length - 1];

    console.log("Validating schema for sample item:", item.item);

    const requiredFields = [
        'product_id', 'supermercado', 'rubro', 'categoria', 
        'tipo', 'presentacion', 'precio_x_presentacion', 
        'precio_x_um', 'um', 'precio_online', 'precio_regular', 
        'precio_tarjeta', 'descuento_publicado'
    ];

    for (const field of requiredFields) {
        if (!(field in item)) {
            throw new Error(`Missing required field in new schema: ${field}`);
        }
    }

    // Check specific logic
    assert.strictEqual(typeof item.product_id, 'string', "product_id should be string");
    assert.strictEqual(item.supermercado, item.super, "supermercado should match super (legacy)");
    assert.strictEqual(item.precio_x_um, item.pxum, "precio_x_um should match pxum");

    console.log("✅ All syntax tests and schema validations PASSED!");
} catch (e) {
    console.error("❌ Test FAILED:", e.message);
    process.exit(1);
}
