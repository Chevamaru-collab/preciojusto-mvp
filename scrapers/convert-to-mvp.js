/**
 * convert-to-mvp.js
 * Convierte los JSONs del scraper al formato rawData del MVP app.js
 * 
 * Formato entrada (scraper):
 *   { id, nombre, categoria, super, precios:{online, regular, porUnidad},
 *     presentacion:{valor, unidad, pack}, descuento, timestamp }
 *
 * Formato salida (app.js rawData):
 *   { fecha, super, item, categoria, marca, tipo, clase,
 *     precioOnline, precioRegular, descuento, vt, um, pxum }
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MVP_DIR = path.join(__dirname, '..');


// Mapa super: scraper id → app nombre
const SUPER_MAP = {
    'wong': 'Wong',
    'metro': 'Metro',
    'plazavea': 'Plaza Vea',
    'tottus': 'Tottus'
};

// Mapa categoría: scraper id → app nombre
const CAT_MAP = {
    'arroz': 'Arroz',
    'aceite': 'Aceite',
    'azucar': 'Azucar',
    'harina': 'Harina',
    'fideos': 'Fideos',
    'pan': 'Pan',
    'leche': 'Leche',
    'huevos': 'Huevos',
    'pollo': 'Pollo',
    'carne': 'Carne',
    'pescado': 'Pescado',
    'menestras': 'Menestras',
    'verduras': 'Verduras',
    'frutas': 'Frutas',
    'condimentos': 'Condimentos'
};

// Filtro de relevancia por categoría:
// El nombre del producto debe contener AL MENOS UNA keyword.
// Evita que productos irrelevantes aparezcan en categorías de alimentos.
const RELEVANCE_KEYWORDS = {
    'arroz': ['arroz'],
    'aceite': ['aceite', 'oil'],
    'azucar': ['azúcar', 'azucar'],
    'harina': ['harina'],
    'fideos': ['fideos', 'pasta', 'spaghetti', 'tallarín', 'tallarin', 'macarron'],
    'pan': ['pan molde', 'pan de', 'pan integral', 'sandwich', 'tostada'],
    'leche': ['leche', 'lácteo', 'lacteo', 'milk', 'yogur', 'queso'],
    'huevos': ['huevo', 'egg'],
    'pollo': ['pollo', 'chicken', 'pecho de'],
    'carne': ['carne', 'res', 'vacuno', 'ternera', 'bistec', 'chuleta'],
    'pescado': ['pescado', 'salmon', 'salmón', 'tilapia', 'atún', 'atun', 'jurel', 'trucha'],
    'menestras': ['lenteja', 'frejol', 'frijol', 'garbanzo', 'pallares', 'menestra', 'arveja', 'habas'],
    'verduras': ['zanahoria', 'cebolla', 'tomate', 'lechuga', 'brocoli', 'brócoli', 'espinaca', 'verdura', 'vegetal'],
    'frutas': ['manzana', 'naranja', 'plátano', 'platano', 'pera', 'uva', 'fresa', 'fruta', 'mandarina', 'durazno', 'piña'],
    'condimentos': ['sal ', 'sal,', 'pimienta', 'condimento', 'oregano', 'orégano', 'ají', 'sazón', 'sazon', 'cúrcuma', 'comino']
};

const EXCLUDE_KEYWORDS = {
    'arroz': ['yogurt', 'sazonador', 'leche', 'galleta', 'alimento para', 'mascota', 'perro', 'gato', 'deli arroz'],
    'aceite': ['aceitera', 'motor', 'corporal', 'masaje', 'esencia', 'spray']
};

function isRelevant(nombre, catId) {
    const keywords = RELEVANCE_KEYWORDS[catId];
    if (!keywords) return true;
    const nb = nombre.toLowerCase();

    // Validar inclusión requerida
    const hasKeyword = keywords.some(k => nb.includes(k.toLowerCase()));
    if (!hasKeyword) return false;

    // Validar exclusiones forzadas (evitar falsos positivos)
    const excludes = EXCLUDE_KEYWORDS[catId];
    if (excludes) {
        const isExcluded = excludes.some(k => nb.includes(k.toLowerCase()));
        if (isExcluded) return false;
    }

    return true;
}

// Fecha hoy en formato DD/M/YYYY (mismo que data.js)
function todayStr() {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// Extraer marca del nombre del producto
function extractMarca(nombre) {
    // Marcas conocidas peruanas
    const marcas = [
        'Costeño', 'Mochica', 'Faraón', 'Tottus', 'Bell\'s', 'Bells',
        'Paisana', 'Vallenorte', 'Doña Isolina', 'Rímac', 'La Preferida',
        'Primor', 'Cil', 'Capri', 'Sello de Oro', 'Dorina', 'Friol',
        'Gloria', 'Laive', 'Pura Vida', 'Anchor', 'Bonle', 'Miami',
        'Wong', 'Metro', 'Eco', 'Molitalia', 'Don Victorio', 'Cayetano',
        'Nicolini', 'Lavaggi', 'Buli', 'Alianza', 'Maximo',
        'San Fernando', 'La Molina', 'Redondos', 'Benedetti'
    ];
    const nb = nombre.toLowerCase();
    for (const m of marcas) {
        if (nb.includes(m.toLowerCase())) return m;
    }
    // Primer token si parece marca (capitalizado)
    const tokens = nombre.split(' ');
    if (tokens[0] && /^[A-ZÁÉÍÓÚ]/.test(tokens[0]) && tokens[0].length > 2) {
        return tokens[0];
    }
    return null;
}

// Extraer tipo del nombre (Extra, Superior, Integral, Vegetal, Oliva, etc.)
function extractTipo(nombre, categoria) {
    const nb = nombre.toLowerCase();
    if (categoria === 'Arroz') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('gran reserva')) return 'Gran Reserva';
        if (nb.includes('añejo extra') || nb.includes('anejo extra')) return 'Añejo Extra';
        if (nb.includes('extra añejo') || nb.includes('extra anejo')) return 'Extra Añejo';
        if (nb.includes('extra')) return 'Extra';
        if (nb.includes('superior')) return 'Superior';
        return 'Extra'; // default arroz
    }
    if (categoria === 'Aceite') {
        if (nb.includes('oliva')) return 'De Oliva';
        if (nb.includes('girasol')) return 'De Girasol';
        if (nb.includes('cártamo') || nb.includes('cartamo')) return 'De Cártamo';
        return 'Vegetal'; // default aceite
    }
    // Otras categorías — retornar el primer descriptor útil
    const words = ['molida', 'entera', 'fresca', 'congelada', 'filetes', 'bolsa', 'caja'];
    for (const w of words) {
        if (nb.includes(w)) return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return categoria;
}

// Convertir producto del scraper al formato rawData del MVP
function convertProduct(prod, catId) {
    const categoria = CAT_MAP[catId] || catId;
    const superNombre = SUPER_MAP[prod.super] || prod.super;
    const fecha = todayStr();

    const precioOnline = prod.precios?.online || 0;
    const precioRegular = prod.precios?.regular || 0;
    const pxum = prod.precios?.porUnidad || precioOnline;

    // Presentación
    const pres = prod.presentacion;
    const vt = pres?.valor || 1;
    const um = pres?.unidad || 'u';

    const marca = extractMarca(prod.nombre);
    const tipo = extractTipo(prod.nombre, categoria);

    // Descuento: el scraper ya lo calcula
    const descuento = prod.descuento ? -Math.abs(prod.descuento) : null;

    return {
        fecha,
        super: superNombre,
        item: prod.nombre,
        categoria,
        marca,
        tipo,
        clase: null,
        precioOnline,
        precioRegular: precioRegular || 0,
        descuento: descuento !== 0 ? descuento : null,
        presentacion: vt,   // ← requerido por prodKeyFn para comparativas entre supers
        vt,
        um,
        pxum: parseFloat((pxum || precioOnline).toFixed(2))
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.includes('master'));
    console.log(`Procesando ${files.length} archivos JSON...`);

    const allConverted = [];

    for (const file of files) {
        const filepath = path.join(DATA_DIR, file);
        let products;
        try {
            products = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
            console.warn(`  Error leyendo ${file}: ${e.message}`);
            continue;
        }

        if (!Array.isArray(products) || products.length === 0) continue;

        // Extraer categoría id del nombre del archivo: "wong-arroz.json" → "arroz"
        const parts = file.replace('.json', '').split('-');
        const catId = parts.slice(1).join('-'); // soporte para "menestras-lentejas"

        const converted = products
            .filter(p => isRelevant(p.nombre || '', catId)) // ← filtro relevancia estricto
            .map(p => convertProduct(p, catId))
            .filter(p => {
                // Sanity check
                if (p.precioOnline <= 0) return false;
                if (p.pxum < 1.00 || p.pxum > 50.00) return false;
                return true;
            });
        const skipped = products.length - converted.length;
        allConverted.push(...converted);
        console.log(`  ✓ ${file}: ${converted.length} productos${skipped > 0 ? ` (${skipped} irrelevantes descartados)` : ''}`);
    }

    console.log(`\nTotal convertidos: ${allConverted.length} productos`);

    // Generar data-scraped.js en el MVP/
    const outputPath = path.join(MVP_DIR, 'data-scraped.js');
    const header = `// PRECIO JUSTO — rawDataScraped\n// Generado: ${new Date().toISOString()}\n// Registros: ${allConverted.length}\n// Fuente: scrapers automáticos\n`;
    const content = `${header}const rawDataScraped = ${JSON.stringify(allConverted, null, 2)};\n`;
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`\n✅ Generado: MVP/data-scraped.js (${allConverted.length} registros)`);

    // Stats por super
    const bySuper = {};
    allConverted.forEach(p => { bySuper[p.super] = (bySuper[p.super] || 0) + 1; });
    console.log('Por super:', JSON.stringify(bySuper));

    // Stats por categoría
    const byCat = {};
    allConverted.forEach(p => { byCat[p.categoria] = (byCat[p.categoria] || 0) + 1; });
    console.log('Por categoría:', JSON.stringify(byCat));
}

main();
