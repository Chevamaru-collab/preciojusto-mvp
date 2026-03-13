const fs = require('fs');

const rawContent = fs.readFileSync('data.js', 'utf8');
const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
const items = JSON.parse(jsonMatch[0]);

const changes = {
    new_rubros: [],
    duplicate_rubros: [],
    misclassified_products: [],
    recommended_mappings: []
};

// 1. Extract all rubros
const rubrosSet = new Set();
items.forEach(item => {
    if (item.rubro) rubrosSet.add(item.rubro.trim());
});
const allRubros = Array.from(rubrosSet);

// 2. Detect duplicates (ignoring case and accents)
const normalizedRubros = {};
allRubros.forEach(r => {
    const norm = r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!normalizedRubros[norm]) normalizedRubros[norm] = [];
    normalizedRubros[norm].push(r);
});

for (const [norm, arr] of Object.entries(normalizedRubros)) {
    if (arr.length > 1) {
        changes.duplicate_rubros.push({
            normalized: norm,
            variants: arr
        });
    }
}

// 3. Misclassifications and Mappings
// Detect pet food misclassified (e.g., as Arroz)
const petFood = items.filter(i => /pedigree|ricocan|dog chow|cat chow|whiskas/i.test(i.item));
petFood.forEach(p => {
    if (p.rubro !== 'Mascotas') {
        changes.misclassified_products.push({
            product_id: p.product_id,
            item: p.item,
            current_rubro: p.rubro,
            current_categoria: p.categoria,
            expected_rubro: 'Mascotas'
        });
        changes.recommended_mappings.push({
            product_id: p.product_id,
            item: p.item,
            recommended_hierarchy: "Mascotas"
        });
    }
});

// Detect Pan products misclassified (e.g., as Abarrotes) and set hierarchy
const panProducts = items.filter(i => /pan de molde/i.test(i.item) || i.categoria === 'Pan de Molde' || i.categoria === 'Pan' || i.categoria === 'pan-molde');
panProducts.forEach(p => {
    if (p.rubro !== 'Panadería') {
        changes.misclassified_products.push({
            product_id: p.product_id,
            item: p.item,
            current_rubro: p.rubro,
            current_categoria: p.categoria,
            expected_rubro: 'Panadería'
        });
    }
    
    // Check taxonomy rule: Panadería -> Pan -> Pan de molde
    changes.recommended_mappings.push({
        product_id: p.product_id,
        item: p.item,
        recommended_hierarchy: "Panadería → Pan → Pan de molde"
    });
});

// Detect new rubros not in standard list
const standardRubros = ["Abarrotes", "Carnes", "Lácteos", "Frescos", "Bebidas", "Limpieza", "Cuidado Personal"];
allRubros.forEach(r => {
    let isStandard = false;
    for (let std of standardRubros) {
        if (std.toLowerCase() === r.toLowerCase()) isStandard = true;
    }
    if (!isStandard) {
        changes.new_rubros.push(r);
    }
});

fs.writeFileSync('ontology_changes.json', JSON.stringify(changes, null, 2));
console.log("Done");
