/**
 * utils.js — Utilidades compartidas scrapers PrecioJusto
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// ─── Asegurar carpetas existen ────────────────────────────────────────────────
function ensureDirs() {
    [DATA_DIR, LOGS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
ensureDirs();

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}`;

    // Console con colores
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', ok: '\x1b[32m' };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}${logMsg}${reset}`);

    // Archivo log diario
    const logFile = path.join(LOGS_DIR, `scrape-${new Date().toISOString().split('T')[0]}.log`);
    try {
        fs.appendFileSync(logFile, logMsg + '\n');
    } catch (e) {
        // silencioso si no puede escribir
    }
}

// ─── Guardar JSON ─────────────────────────────────────────────────────────────
function saveJSON(filename, data) {
    const filepath = path.join(DATA_DIR, filename);

    // [INDUSTRIAL-SHIELD] Si es el catálogo maestro, sacamos snapshot antes de chancar
    if (filename === 'master-data.json' && fs.existsSync(filepath)) {
        // Timestamp alta resolución (YYYY-MM-DD_HHmmss) para Lima GMT-5
        const dateStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Lima' })
            .replace(' ', '_')
            .replace(/:/g, '')
            .substring(0, 15);
        
        const histDir = path.join(DATA_DIR, '..', 'HistoricData');
        if (!fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });
        
        const backupPath = path.join(histDir, `${dateStr}_master-data.json`);
        fs.copyFileSync(filepath, backupPath);
        log(`[SHIELD] Snapshot histórico creado: ${dateStr}_master-data.json`, 'ok');
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    const count = data.stats?.total || (Array.isArray(data) ? data.length : 0);
    log(`Guardado: ${filename} (${count} items)`, 'ok');
}

// ─── Cargar JSON (si existe) ──────────────────────────────────────────────────
function loadJSON(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

// ─── Random delay ─────────────────────────────────────────────────────────────
async function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Limpiar precio ───────────────────────────────────────────────────────────
function cleanPrice(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return null;
    // Eliminar todo excepto dígitos y punto/coma → convertir coma a punto
    const cleaned = priceStr
        .replace(/[^\d,\.]/g, '')
        .replace(',', '.');
    const value = parseFloat(cleaned);
    return isNaN(value) || value <= 0 ? null : value;
}

// ─── Limpiar nombre producto ──────────────────────────────────────────────────
function cleanProductName(name) {
    if (!name) return '';
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 120); // troncar nombres muy largos
}

// ─── Extraer presentación del nombre ─────────────────────────────────────────
function extractPresentacion(name) {
    if (!name) return null;

    const patterns = [
        // Twopack / multipack: "2 x 1kg", "4x900ml"
        { re: /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|kilo|g(?:r)?|lt?|ml)/i, type: 'pack' },
        // Kg
        { re: /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gramo)?s?)/i, unit: 'kg' },
        // Litros
        { re: /(\d+(?:[.,]\d+)?)\s*(?:lt?|litros?)/i, unit: 'lt' },
        // ml
        { re: /(\d+)\s*ml/i, unit: 'ml' },
        // Gramos
        { re: /(\d+(?:[.,]\d+)?)\s*(?:gr?|gramos?)/i, unit: 'g' },
        // Unidades
        { re: /(\d+)\s*(?:und?|unidades?|u\b)/i, unit: 'u' }
    ];

    for (const p of patterns) {
        const m = name.match(p.re);
        if (!m) continue;

        if (p.type === 'pack') {
            const qty = parseFloat(m[1]);
            const value = parseFloat(m[2].replace(',', '.'));
            const unit = m[3].toLowerCase().replace('kilo', 'kg').replace('gr', 'g');
            return { value, unit, pack: qty };
        }

        const value = parseFloat(m[1].replace(',', '.'));
        return { value, unit: p.unit, pack: 1 };
    }

    return null;
}

// ─── Calcular precio por UM ────────────────────────────────────────────────────
function calcPrecioPorUM(precio, presentacion) {
    if (!presentacion) return precio;

    const val = parseFloat(presentacion.value);
    const pack = presentacion.pack || 1;

    if (!val || val <= 0) return precio;

    let divisor = val * pack;

    // Normalizar a kg o lt
    if (presentacion.unit === 'ml') divisor = (val / 1000) * pack;
    if (presentacion.unit === 'g') divisor = (val / 1000) * pack;

    const result = precio / divisor;
    return isNaN(result) || !isFinite(result) ? precio : parseFloat(result.toFixed(2));
}

// ─── Generar ID único producto ────────────────────────────────────────────────
function generateProductId(superId, nombre) {
    const clean = nombre.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const ts = Date.now().toString(36);
    return `${superId}_${clean}_${ts}`;
}

// ─── Normalizar producto (común a todos los scrapers) ────────────────────────
function normalizeProduct(raw, superId) {
    try {
        const precioOnline = cleanPrice(raw.precioOnline);
        const precioRegular = cleanPrice(raw.precioRegular);

        if (!precioOnline || precioOnline <= 0) return null;
        if (!raw.nombre || raw.nombre.trim().length < 3) return null;

        const nombre = cleanProductName(raw.nombre);
        const presentacion = extractPresentacion(nombre);
        const porUnidad = calcPrecioPorUM(precioOnline, presentacion);

        const descuento = (precioRegular && precioRegular > precioOnline)
            ? Math.round(((precioRegular - precioOnline) / precioRegular) * 100)
            : null; // null en lugar de 0 para ser consistente

        const precioTarjeta = cleanPrice(raw.precioTarjeta);
        const descuentoTarjeta = (precioRegular && precioTarjeta && precioRegular > precioTarjeta)
            ? Math.round(((precioRegular - precioTarjeta) / precioRegular) * 100)
            : null;
        
        const pxumTarjeta = precioTarjeta ? calcPrecioPorUM(precioTarjeta, presentacion) : null;

        return {
            id: generateProductId(superId, nombre),
            nombre,
            categoria: raw.categoria,
            super: superId,
            precios: {
                online: parseFloat(precioOnline.toFixed(2)),
                regular: precioRegular ? parseFloat(precioRegular.toFixed(2)) : null,
                tarjeta: precioTarjeta ? parseFloat(precioTarjeta.toFixed(2)) : null,
                tarjetaDesc: precioTarjeta && raw.tarjetaDesc ? raw.tarjetaDesc : null,
                porUnidad,
                porUnidadTarjeta: pxumTarjeta
            },
            presentacion: presentacion ? {
                valor: presentacion.value,
                unidad: presentacion.unit,
                pack: presentacion.pack
            } : null,
            descuento,
            descuentoTarjeta,
            timestamp: raw.scraped || new Date().toISOString()
        };
    } catch (e) {
        log(`Error normalizando producto [${superId}]: ${e.message}`, 'error');
        return null;
    }
}

// ─── Auto-scroll página completa ─────────────────────────────────────────────
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 600;
            const maxScrolls = 25; // límite seguridad

            let scrollCount = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrollCount++;

                if (totalHeight >= scrollHeight - 1200 || scrollCount >= maxScrolls) {
                    clearInterval(timer);
                    resolve();
                }
            }, 1000); // 1000ms entre scrolls — VTEX necesita tiempo para lazy-load
        });
    });
}

// ─── Scroll progresivo N veces ────────────────────────────────────────────────
async function scrollNTimes(page, n = 3, delayMs = 2000) {
    for (let i = 0; i < n; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await randomDelay(delayMs - 500, delayMs + 500);
    }
}

// ─── Elegir user agent aleatorio ──────────────────────────────────────────────
function getRandomUserAgent(agents) {
    return agents[Math.floor(Math.random() * agents.length)];
}

// ─── Relevancia de Producto ──────────────────────────────────────────────────
function isRelevant(nombre, catId) {
    if (!nombre) return false;
    const nb = nombre.toLowerCase();

    // 1. Validar exclusiones GLOBALES primero
    if (config.globalExcludeKeywords) {
        const isGlobalExcluded = config.globalExcludeKeywords.some(k => nb.includes(k.toLowerCase()));
        if (isGlobalExcluded) return false;
    }

    // 2. Validar inclusiones por categoría
    const keywords = config.relevanceKeywords?.[catId];
    if (keywords) {
        const hasKeyword = keywords.some(k => nb.includes(k.toLowerCase()));
        if (!hasKeyword) return false;
    }

    // 3. Validar exclusiones forzadas por categoría
    const excludes = config.excludeKeywords?.[catId];
    if (excludes) {
        const isExcluded = excludes.some(k => nb.includes(k.toLowerCase()));
        if (isExcluded) return false;
    }

    return true;
}

module.exports = {
    log,
    saveJSON,
    loadJSON,
    randomDelay,
    cleanPrice,
    cleanProductName,
    extractPresentacion,
    calcPrecioPorUM,
    generateProductId,
    normalizeProduct,
    autoScroll,
    scrollNTimes,
    getRandomUserAgent,
    isRelevant,
    DATA_DIR,
    LOGS_DIR
};
