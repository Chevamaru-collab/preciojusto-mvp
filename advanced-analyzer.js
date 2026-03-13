const fs = require('fs');
const path = require('path');

const DATA_JS_PATH = path.join(__dirname, 'data.js');

function analyzeGlobal() {
    const jsContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
    const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
         console.error('Could not parse data.js');
         return;
    }

    const items = JSON.parse(jsonMatch[0]);
    const categories = {};
    let comboCount = 0;
    const combos = [];
    const panVsMolde = { pan: 0, molde: 0 };

    items.forEach(d => {
        const cat = d.categoria;
        if (!categories[cat]) {
            categories[cat] = { tipos: new Set(), marcas: new Set(), count: 0 };
        }
        
        categories[cat].count++;
        categories[cat].tipos.add(d.tipo);
        categories[cat].marcas.add(d.marca);

        if (cat.toLowerCase().includes('pan')) {
            if (cat === 'pan-molde' || cat === 'Pan de Molde') panVsMolde.molde++;
            else panVsMolde.pan++;
        }

        // Detect combo products
        const nameMatch = d.item.toLowerCase();
        if (nameMatch.includes(' + ') || nameMatch.includes(' gratis ') || nameMatch.includes(' pack ') || / \d+[\s]?(unidades|un|u)\b/.test(nameMatch)) {
            comboCount++;
            if (combos.length < 15) combos.push(d.item);
        }
    });

    console.log('--- DEEP CATEGORY ANALYSIS ---');
    for (const cat in categories) {
        console.log(`\n[${cat.toUpperCase()}] (${categories[cat].count} items)`);
        console.log(`Tipos:`, Array.from(categories[cat].tipos).join(', '));
        console.log(`Marcas (Sample):`, Array.from(categories[cat].marcas).slice(0, 5).join(', '));
    }

    console.log('\n--- COMBO PRODUCTS DETECTED ---');
    console.log(`Total Combos/Packs detected: ${comboCount}`);
    console.log('Sample Combos:');
    combos.forEach(c => console.log(' - ' + c));

    console.log('\n--- PAN VS PAN DE MOLDE ---');
    console.log(`Pan count: ${panVsMolde.pan}`);
    console.log(`Pan de Molde count: ${panVsMolde.molde}`);
}

analyzeGlobal();
