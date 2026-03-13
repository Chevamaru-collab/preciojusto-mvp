const fs = require('fs');
const path = require('path');
const config = require('./scrapers/config');

const DATA_JS_PATH = path.join(__dirname, 'data.js');

function extractMarca(nombre) {
    const marcas = [
        'Costeño', 'Mochica', 'Faraón', 'Tottus', 'Bell\'s', 'Bells',
        'Paisana', 'Vallenorte', 'Valle Norte', 'Doña Isolina', 'Rímac', 'La Preferida',
        'Primor', 'Cil', 'Capri', 'Sello de Oro', 'Dorina', 'Friol',
        'Gloria', 'Laive', 'Pura Vida', 'Anchor', 'Bonle', 'Miami',
        'Wong', 'Metro', 'Cuisine & Co', 'Eco', 'Molitalia', 'Don Victorio', 'Cayetano',
        'Nicolini', 'Lavaggi', 'Buli', 'Alianza', 'Maximo',
        'San Fernando', 'La Molina', 'Redondos', 'Benedetti', 'Gran Chalán', 'Mizu', 'Huella Verde', 
        'Inverni', 'Miyabi-Mai', 'Bárcidda', 'Kellogg\'s', 'Ricocan', 'Pedigree', 'Campomar', 'Florida',
        'Compass', 'Wesson', 'Spread', 'Pam', 'Olivos del Sur', 'Sao', 'Bimbo', 'Pyc', 'Unión', 'Bodega', 'Oléico'
    ];
    const nb = nombre.toLowerCase();
    for (const m of marcas) {
        if (nb.includes(m.toLowerCase())) return m;
    }
    
    const blacklistedGenericFirstWords = [
        'pack', 'twopack', 'sixpack', 'tripack', 'precio', 'promo', 'dato',
        'bolsa', 'caja', 'el', 'la', 'los', 'las', 'un', 'una', 'con', 'sin', 'surtido',
        'oferta', 'super', 'mega', 'mini', 'maxi', 'extra'
    ];

    const tokens = nombre.split(' ');
    if (tokens[0] && /^[A-ZÁÉÍÓÚ]/.test(tokens[0]) && tokens[0].length > 2) {
        const potentialBrand = tokens[0].toLowerCase();
        if (!blacklistedGenericFirstWords.includes(potentialBrand)) {
            return tokens[0];
        }
    }
    return 'Genérico';
}

function extractTipo(nombre, categoria) {
    const nb = nombre.toLowerCase();

    // 1. GLOBAL COMBO INTERCEPTION FOR ALL 15 CATEGORIES
    if (nb.includes(' + ') || nb.includes(' gratis ') || nb.includes(' pack ') || nb.includes('tripack') || nb.includes('sixpack') || nb.includes('twopack') || nb.includes(' combo ')) {
        return 'Combo/Pack';
    }
    
    // 2. SPECIFIC CATEGORY TYPING
    if (categoria === 'Arroz' || categoria === 'arroz') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('gran reserva')) return 'Gran Reserva';
        if (nb.includes('japónico') || nb.includes('japonico') || nb.includes('jap??nico')) return 'Japónico';
        
        const tieneAnejo = nb.includes('añejo') || nb.includes('anejo');
        const tieneSuperior = nb.includes('superior');
        const tieneExtra = nb.includes('extra');

        if (tieneAnejo && tieneSuperior) return 'Superior Añejo';
        if (tieneAnejo && tieneExtra) return 'Añejo Extra';
        if (tieneAnejo) return 'Añejo';
        if (tieneSuperior) return 'Superior';
        if (tieneExtra) return 'Extra';
        
        return 'Extra'; 
    }
    if (categoria === 'Aceite' || categoria === 'aceite') {
        if (nb.includes('oliva')) return 'De Oliva';
        if (nb.includes('girasol')) return 'De Girasol';
        if (nb.includes('cártamo') || nb.includes('cartamo')) return 'De Cártamo';
        if (nb.includes('soja') || nb.includes('soya')) return 'De Soya';
        if (nb.includes('canola')) return 'De Canola';
        if (nb.includes('maíz') || nb.includes('maiz')) return 'De Maíz';
        if (nb.includes('ajonjolí') || nb.includes('ajonjoli') || nb.includes('sésamo') || nb.includes('sesamo')) return 'De Ajonjolí';
        if (nb.includes('coco')) return 'De Coco';
        if (nb.includes('mezcla')) return 'Mezcla';
        return 'Vegetal';
    }
    if (categoria === 'Fideos' || categoria === 'fideos') {
        if (nb.includes('spaghetti') || nb.includes('espagueti')) return 'Spaghetti';
        if (nb.includes('tallarí') || nb.includes('tallari')) return 'Tallarín';
        if (nb.includes('cabello')) return 'Cabello de Ángel';
        if (nb.includes('canuto')) return 'Canuto';
        if (nb.includes('codito')) return 'Codito';
        if (nb.includes('tornillo')) return 'Tornillo';
        if (nb.includes('corbata')) return 'Corbata';
        if (nb.includes('macarró') || nb.includes('macarro')) return 'Macarrón';
        if (nb.includes('integral')) return 'Integral';
        return 'Pasta Larga'; 
    }
    if (categoria === 'Carne' || categoria === 'carne') {
        if (nb.includes('molida')) return 'Molida';
        if (nb.includes('bisteck') || nb.includes('bistec')) return 'Bisteck';
        if (nb.includes('guiso')) return 'Guiso';
        if (nb.includes('churrasco')) return 'Churrasco';
        if (nb.includes('lomo')) return 'Lomo';
        if (nb.includes('asado')) return 'Asado';
        if (nb.includes('sancochado')) return 'Sancochado';
        return 'Cortes Variados';
    }
    if (categoria === 'Pollo' || categoria === 'pollo') {
        if (nb.includes('entero') || nb.includes('entera')) return 'Entero';
        if (nb.includes('pechuga')) return 'Pechuga';
        if (nb.includes('pierna')) return 'Pierna';
        if (nb.includes('encuentro')) return 'Encuentro';
        if (nb.includes('filete')) return 'Filete';
        if (nb.includes('milanesa')) return 'Milanesa';
        return 'Cortes Variados';
    }
    if (categoria === 'Pan de Molde' || categoria === 'pan-molde' || categoria === 'Pan' || categoria === 'pan') {
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('blanco')) return 'Blanco';
        if (nb.includes('multigranos')) return 'Multigranos';
        if (nb.includes('avena')) return 'Con Avena';
        if (nb.includes('semillas') || nb.includes('multisemilla') || nb.includes('linaza')) return 'Multisemilla';
        if (nb.includes('pita')) return 'Pita';
        if (nb.includes('hamburguesa') || nb.includes('hot dog') || nb.includes('pancho')) return 'Hamburguesa/Hot Dog';
        if (nb.includes('ciabatta') || nb.includes('francés') || nb.includes('frances') || nb.includes('baguette')) return 'Ciabatta/Francés';
        if (nb.includes('sin borde')) return 'Sin Borde';
        return 'Regular';
    }
    if (categoria === 'Leche Fresca' || categoria === 'leche-fresca' || categoria === 'Leche' || categoria === 'leche-evaporada') {
        if (nb.includes('deslactosada')) return 'Deslactosada';
        if (nb.includes('light')) return 'Light';
        if (nb.includes('entera')) return 'Entera';
        if (nb.includes('evaporada')) return 'Evaporada';
        if (nb.includes('fresca') || nb.includes('uht')) return 'Fresca';
        if (nb.includes('mezcla') || nb.includes('láctea') || nb.includes('lactea')) return 'Mezcla Láctea';
        return 'Entera';
    }
    if (categoria === 'Huevos' || categoria === 'huevos') {
        if (nb.includes('codorniz')) return 'Codorniz';
        if (nb.includes('rosado') || nb.includes('pardo')) return 'Rosado';
        if (nb.includes('blanco')) return 'Blanco';
        return 'Rosado'; 
    }
    if (categoria === 'Azúcar Blanca' || categoria === 'azucar-blanca') return 'Blanca';
    if (categoria === 'Azúcar Rubia' || categoria === 'azucar-rubia') return 'Rubia';
    if (categoria === 'Avena' || categoria === 'avena') {
        if (nb.includes('entera') || nb.includes('tradicional')) return 'Tradicional';
        if (nb.includes('instantánea') || nb.includes('instantanea') || nb.includes('precocida')) return 'Instantánea';
        if (nb.includes('maca')) return 'Con Maca';
        if (nb.includes('kiwicha') || nb.includes('quinua')) return 'Multicereal';
        return 'Clásica';
    }
    if (categoria === 'Mantequilla' || categoria === 'mantequilla') {
        if (nb.includes('con sal')) return 'Con Sal';
        if (nb.includes('sin sal')) return 'Sin Sal';
        return 'Regular';
    }
    if (categoria === 'Lentejas' || categoria === 'lentejas' || categoria === 'Frijol Canario' || categoria === 'frijol-canario' || categoria === 'Menestras' || categoria === 'menestras') {
        if (nb.includes('lenteja') || nb.includes('lentejón') || nb.includes('lentejon')) return 'Lentejas';
        if (nb.includes('garbanzo')) return 'Garbanzos';
        if (nb.includes('frijol') || nb.includes('frejol') || nb.includes('canario') || nb.includes('castilla') || nb.includes('panamito') || nb.includes('palo') || nb.includes('negro')) return 'Frijoles';
        if (nb.includes('pallar')) return 'Pallares';
        if (nb.includes('arveja') || nb.includes('alverja')) return 'Arvejas';
        if (nb.includes('trigo')) return 'Trigo';
        if (nb.includes('soya')) return 'Soya';
        if (nb.includes('quinua')) return 'Quinua';
        if (nb.includes('maíz') || nb.includes('maiz') || nb.includes('mote') || nb.includes('cancha')) return 'Maíz';
        return 'Menestras Variadas';
    }
    if (categoria === 'Harina' || categoria === 'harina') {
        if (nb.includes('preparada')) return 'Preparada';
        if (nb.includes('sin preparar')) return 'Sin Preparar';
        if (nb.includes('integral')) return 'Integral';
        if (nb.includes('maíz') || nb.includes('maiz')) return 'De Maíz';
        return 'Sin Preparar';
    }

    // Default Fallback
    const words = ['filetes', 'congelada', 'fresca'];
    for (const w of words) {
        if (nb.includes(w)) return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return 'Regular';
}

function performRefineAll() {
    console.log('Reading data.js...');
    const jsContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
    const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
         console.error('Could not parse data.js');
         return;
    }

    let items = JSON.parse(jsonMatch[0]);
    let initialCount = items.length;
    let comboCount = 0;
    
    // ZERO DELETION POLICY: We only transform, we do not filter.
    // Recompute everything with upgraded logic
    items.forEach(d => {
        d.tipo = extractTipo(d.item, d.categoria);
        d.marca = extractMarca(d.item);
        if (d.tipo === 'Combo/Pack') comboCount++;
    });

    console.log(`Global Clean complete (Zero Deletion).`);
    console.log(`Total rows processed: ${items.length}`);
    console.log(`Combos isolated into unique type: ${comboCount}`);

    const header = `// PRECIO JUSTO — rawData\n// Base: Browse.AI + Puppeteer Scrapers\n// Generado: ${new Date().toISOString()}\n// Registros: ${items.length}\n`;
    const finalContent = `${header}const rawData = ${JSON.stringify(items, null, 2)};\n`;

    fs.writeFileSync(DATA_JS_PATH, finalContent, 'utf8');
    console.log('data.js successfully transformed without dropping data!');
}

performRefineAll();
