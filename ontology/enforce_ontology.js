const fs = require('fs');
const path = require('path');

// Paths
const DATA_PATH = path.join(__dirname, '..', 'data.js');
const CHANGES_PATH = path.join(__dirname, 'ontology_changes.json');
const OUTPUT_DATASET = path.join(__dirname, '..', 'normalized_dataset.json');
const OUTPUT_CORRECTIONS = path.join(__dirname, 'corrections_applied.json');

// Load inputs
const rawDataMatch = fs.readFileSync(DATA_PATH, 'utf8').match(/\[[\s\S]*\]/);
const rawDataset = JSON.parse(rawDataMatch[0]);

const changes = JSON.parse(
    fs.readFileSync(CHANGES_PATH, 'utf8')
);

// Dictionaries for fast lookup
const corrections = {};
const mappings = {};

// Deduplicate corrections
changes.misclassified_products.forEach(change => {
    corrections[change.product_id] = change;
});

// Deduplicate recommended mappings
changes.recommended_mappings.forEach(mapping => {
    mappings[mapping.product_id] = mapping;
});

let appliedCorrectionsNum = 0;

// Valid rubros
const validRubrosArr = [
    "Abarrotes",
    "Carnes",
    "Lácteos",
    "Frescos",
    "Bebidas",
    "Limpieza",
    "Cuidado Personal",
    "Mascotas",
    "Panadería"
].concat(changes.new_rubros || []);

const validRubrosSet = new Set(validRubrosArr);
const CATEGORY_CANONICAL = {
    'aceite': 'Aceite',
    'arroz': 'Arroz',
    'azucar': 'Azúcar Blanca',
    'azucar-blanca': 'Azúcar Blanca',
    'azucar-rubia': 'Azúcar Rubia',
    'condimentos': 'Condimentos',
    'fideos': 'Fideos',
    'frijol-canario': 'Frijol Canario',
    'frutas': 'Frutas',
    'harina': 'Harina',
    'huevos': 'Huevos',
    'leche': 'Leche',
    'leche-fresca': 'Leche Fresca',
    'leche-evaporada': 'Leche Evaporada',
    'lentejas': 'Lentejas',
    'mantequilla': 'Mantequilla',
    'menestras': 'Menestras',
    'pan': 'Pan',
    'pan-molde': 'Pan de Molde',
    'pollo': 'Pollo',
    'verduras': 'Verduras',
    'avena': 'Avena',
    'cereales_oculto': 'Cereales_Oculto',
    'comida_preparada_oculta': 'Comida_Preparada_Oculta'
};

function normalizeCategoria(cat) {
    if (!cat) return cat;

    const normalized = cat
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/_/g, '-');

    return CATEGORY_CANONICAL[normalized] || cat;
}
// Normalize dataset
const normalizedDataset = rawDataset.map(item => {

    let updated = false;

    let rubro = item.rubro ? item.rubro.trim() : "";
    let categoria = normalizeCategoria(item.categoria)
    let tipo = item.tipo;
    let presentacion = item.presentacion;

    if (item.product_id) {

        // Apply rubro corrections
        if (corrections[item.product_id]) {
            rubro = corrections[item.product_id].expected_rubro;
            updated = true;
        }

        // Apply hierarchy mappings
        if (mappings[item.product_id]) {

            const hierarchy = mappings[item.product_id].recommended_hierarchy.split(' → ');

            if (hierarchy.length === 1) {
                rubro = hierarchy[0];
            }

            if (hierarchy.length === 2) {
                rubro = hierarchy[0];
                tipo = hierarchy[1];
            }

            if (hierarchy.length >= 3) {
                rubro = hierarchy[0];
                tipo = hierarchy[2];
            }

            updated = true;
        }
    }

    if (updated) {
        appliedCorrectionsNum++;
    }

    // Normalize rubro against valid taxonomy
    validRubrosSet.forEach(valid => {

        const normValid = valid
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const normRubro = rubro
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (normValid === normRubro) {
            rubro = valid;
        }
    });

    return {
    ...item,
    rubro: rubro,
    categoria: categoria,
    tipo: tipo
};
});


// Validation
let validationErrors = 0;

normalizedDataset.forEach(item => {

    if (!item.rubro) {
        console.error(`Item without rubro: ${item.product_id}`);
        validationErrors++;
    }

    if (!validRubrosSet.has(item.rubro)) {
        console.error(`Invalid rubro taxonomy for ${item.product_id}: ${item.rubro}`);
        validationErrors++;
    }
});

if (validationErrors > 0) {
    console.error(`Validation failed with ${validationErrors} errors.`);
} else {
    console.log("Validation passed automatically.");
}

// Save normalized dataset
fs.writeFileSync(
    OUTPUT_DATASET,
    JSON.stringify(normalizedDataset, null, 2)
);

// Save applied corrections
const correctionsAppliedList = [];

Object.values(corrections).forEach(c => correctionsAppliedList.push(c));

Object.values(mappings).forEach(m => {

    if (!correctionsAppliedList.find(c => c.product_id === m.product_id)) {
        correctionsAppliedList.push(m);
    }
});

fs.writeFileSync(
    OUTPUT_CORRECTIONS,
    JSON.stringify({
        total_applied: appliedCorrectionsNum,
        changes: correctionsAppliedList
    }, null, 2)
);

console.log('Dataset normalization completed.');