/**
 * import-history.js — Normalizador e integrador de CSV histórico
 * Escrito para PrecioJusto MVP
 * 
 * PROPÓSITO:
 * Transforma archivos CSV de 4 años de historia (compras de pastelería) 
 * al schema JSON unificado y normalizado del MVP de PrecioJusto, permitiendo
 * trazar tendencias históricas.
 */

const fs = require('fs');
const readline = require('readline');

// Diccionario de reglas heurísticas para mapear insumos crudos a categorías del MVP
const CATEGORY_MAP = {
    // Insumo -> Categoría MVP, Subtipo, Unidad Ideal
    "harina": { cat: "harina", tipo: "Trigo", um: "kg" },
    "azucar": { cat: "azucar-blanca", tipo: "Blanca", um: "kg" },
    "azúcar": { cat: "azucar-blanca", tipo: "Blanca", um: "kg" },
    "rubia": { cat: "azucar-rubia", tipo: "Rubia", um: "kg" },
    "mantequilla": { cat: "mantequilla", tipo: "Vaca", um: "kg" },
    "leche": { cat: "leche", tipo: "Evaporada", um: "lt" },
    "huevo": { cat: "huevos", tipo: "Pardos", um: "u" }
};

// 1. Fase de Limpieza de Moneda S/ 14.50 -> 14.5
function cleanCsvPrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = priceStr.toString().replace(/[^\d,\.]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

// 2. Fase de Fechas -> ISO
// Asume múltiples formatos potenciales (DD-MM-YYYY, YYYY/MM/DD, etc)
function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    dateStr = dateStr.trim();
    
    // Intento 1: DD/MM/YYYY o DD-MM-YYYY
    const partsEU = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (partsEU) {
        let year = parseInt(partsEU[3]);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(partsEU[2]) - 1, parseInt(partsEU[1])).toISOString();
    }

    // Intento Libre:
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) return fallback.toISOString();

    return new Date().toISOString(); // Fallback absoluto
}

// 3. Extracción de Pesos "Harina 50Kg" -> 50
function extractWeightFromDesc(desc) {
    const p = desc.toLowerCase();
    let match = p.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|g|gr|gramos?|lt|litros?|ml|u|und|unidades?)/i);
    if (match) {
        let val = parseFloat(match[1]);
        let rawUm = match[2];
        let um = 'u';
        if (rawUm.includes('k')) um = 'kg';
        else if (rawUm.match(/^g/)) um = 'g';
        else if (rawUm.includes('l')) um = 'lt';
        else if (rawUm === 'ml') um = 'ml';
        
        return { valor: val, unidad: um, pack: 1 };
    }
    // Default 1 kilo si no dice (Ajustar según contexto real)
    return { valor: 1, unidad: 'kg', pack: 1 };
}

// 4. Mapeo NLP de Categoría (Básico)
function mapToCategory(desc) {
    const dLower = desc.toLowerCase();
    for (const [kw, meta] of Object.entries(CATEGORY_MAP)) {
        if (dLower.includes(kw)) {
            // Verificar overrides (ej. Azúcar rubia vs franca)
            if (kw === "azucar" || kw === "azúcar") {
                if (dLower.includes("rubia") || dLower.includes("morena")) return CATEGORY_MAP["rubia"];
            }
            return meta;
        }
    }
    return { cat: "otros", tipo: "N/A", um: "u" }; // Categoría por defecto
}

async function processHistoryCSV(csvFilePath, outputJsonPath) {
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Error: Archivo no encontrado - ${csvFilePath}`);
        return;
    }

    const fileStream = fs.createReadStream(csvFilePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const normalizedRecords = [];
    let isHeader = true;
    let headers = [];

    // Formato asumnido del CSV del usuario:
    // Fecha, Proveedor/Lugar, Producto, CantidadComprada, TotalPagado ...

    for await (const line of rl) {
        const columns = line.split(';').map(c => c.trim().replace(/^"|"$/g, '')); // Soporta separador por comas o punto y coma
        const realCols = columns.length > 1 ? columns : line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

        if (isHeader) {
            headers = realCols.map(h => h.toLowerCase());
            isHeader = false;
            console.log("Headers detectados:", headers);
            continue;
        }

        if (realCols.length < 3) continue;

        // MAPEO DINÁMICO DE COLUMNAS (Adivinar en base a nombres comunes)
        const d_idx = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
        const p_idx = headers.findIndex(h => h.includes('prov') || h.includes('super') || h.includes('lugar'));
        const i_idx = headers.findIndex(h => h.includes('prod') || h.includes('desc') || h.includes('insumo') || h.includes('item'));
        const ttl_idx = headers.findIndex(h => h.includes('total') || h.includes('monto') || h.includes('precio'));
        
        const rawDate = d_idx >= 0 ? realCols[d_idx] : '';
        const rawSuper = p_idx >= 0 ? realCols[p_idx] : 'Mayorista/Local';
        const rawItem = i_idx >= 0 ? realCols[i_idx] : 'Insumo Desconocido';
        const rawTotal = ttl_idx >= 0 ? realCols[ttl_idx] : 0;

        const dateIso = parseDate(rawDate);
        const itemDesc = rawItem;
        const totalPaid = cleanCsvPrice(rawTotal);

        if (!totalPaid) continue;

        const catMeta = mapToCategory(itemDesc);
        const presentacion = extractWeightFromDesc(itemDesc);

        // pxum: calcular en base a la estandarización interna (todo a kilo o litro)
        let divisor = presentacion.valor;
        if (presentacion.unidad === 'g' || presentacion.unidad === 'ml') divisor = divisor / 1000;
        
        const pxum = divisor > 0 ? parseFloat((totalPaid / divisor).toFixed(2)) : totalPaid;

        const id = `hist_${catMeta.cat}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

        normalizedRecords.push({
            id: id,
            nombre: itemDesc,
            categoria: catMeta.cat,
            super: rawSuper,
            precios: {
                online: totalPaid,
                regular: null,
                tarjeta: null,
                tarjetaDesc: null,
                porUnidad: pxum,
                porUnidadTarjeta: null
            },
            presentacion: presentacion,
            descuento: 0,
            descuentoTarjeta: null,
            timestamp: dateIso
        });
    }

    // Convertir el UTC a un string "D/M/YYYY" usado por el MVP si lo preferimos así en data.js,
    // O mantenerlo como fecha ISO y la vista del frontend lo convertirá. En este caso mantenemos
    // retrocompatibilidad agregando el campo 'fecha' estático.
    const finalData = normalizedRecords.map(r => {
        const d = new Date(r.timestamp);
        r.fecha = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        return r;
    });

    console.log(`Procesamiento exitoso. ${finalData.length} registros históricos normalizados.`);
    
    fs.writeFileSync(outputJsonPath, JSON.stringify(finalData, null, 2), 'utf8');
    console.log(`Archivo guardado: ${outputJsonPath}`);
}

// Si se ejecuta directo por terminal ej: node import-history.js ./miscompras.csv
if (require.main === module) {
    const inputArg = process.argv[2];
    const outputArg = process.argv[3] || './historical-data-normalized.json';
    
    if (!inputArg) {
        console.log("Uso: node import-history.js <ruta_al_csv_raw> [ruta_salida_json]");
    } else {
        processHistoryCSV(inputArg, outputArg);
    }
}

module.exports = {
    processHistoryCSV
};
