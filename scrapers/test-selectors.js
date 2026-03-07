/**
 * test-selectors.js — Validador de selectores DOM en tiempo real
 * PrecioJusto Sprint 3
 *
 * Uso: node test-selectors.js [super] [categoria]
 *   node test-selectors.js wong              → test Wong, categoría "arroz"
 *   node test-selectors.js metro aceite      → test Metro, categoría "aceite"
 *   node test-selectors.js plazavea          → test Plaza Vea
 *   node test-selectors.js tottus            → test Tottus
 *
 * Este script DEBE ejecutarse con headless: false para inspección visual.
 * Output: lista de selectores que funcionan + primeros 3 productos extraídos.
 */

const puppeteer = require('puppeteer');
const config = require('./config');

const SUPER_ID = process.argv[2] || 'wong';
const CAT_ID = process.argv[3] || 'arroz';

const SUPER_URLS = {
    wong: 'https://www.wong.pe/search?q=',
    metro: 'https://www.metro.pe/search?q=',
    plazavea: 'https://www.plazavea.com.pe/search?q=',
    tottus: 'https://www.tottus.com.pe/tottus-pe/search?q='
};

// Selectores candidatos para inspección
const CANDIDATE_SELECTORS = [
    // Product cards
    'article',
    '[class*="product-card"]',
    '[class*="ProductCard"]',
    '[class*="product-item"]',
    '[class*="shelf-item"]',
    '[class*="shelf-product"]',
    '[class*="galleryItem"]',
    '[class*="vtex-product-summary"]',
    '[data-testid*="product"]',

    // Names
    'h2', 'h3',
    '[class*="product-name"]',
    '[class*="productName"]',
    '[class*="productBrand"]',
    '[class*="nameWrapper"]',

    // Prices
    '[class*="sellingPrice"]',
    '[class*="selling-price"]',
    '[class*="spotPrice"]',
    '[class*="best-price"]',
    '[class*="price-best"]',
    '[class*="price-tag"]',
    '[class*="activePrice"]',
    '[class*="listPrice"]',
    '[class*="list-price"]',
    '[class*="old-price"]',
    '[class*="wasPrice"]'
];

async function testSelectors() {
    const superCfg = config.supermercados[SUPER_ID];
    if (!superCfg) {
        console.error(`Super "${SUPER_ID}" no encontrado. Opciones: wong, metro, plazavea, tottus`);
        process.exit(1);
    }

    const categoria = config.categorias.find(c => c.id === CAT_ID) || config.categorias[0];
    const url = SUPER_URLS[SUPER_ID] + encodeURIComponent(categoria.query);

    console.log('\n════════════════════════════════════════');
    console.log(`  TEST SELECTORES — ${SUPER_ID.toUpperCase()}`);
    console.log(`  URL: ${url}`);
    console.log(`  Categoría: ${categoria.id} ("${categoria.query}")`);
    console.log('════════════════════════════════════════\n');

    // headless: false para ver la página
    const browser = await puppeteer.launch({
        ...config.puppeteer,
        headless: false,
        slowMo: 50
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`Navegando a ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // Scroll para cargar lazy content
    await page.evaluate(async () => {
        await new Promise(r => setTimeout(r, 2000));
        for (let i = 0; i < 4; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 1000));
        }
        window.scrollTo(0, 0);
    });

    console.log('\n--- SELECTORES ENCONTRADOS ---\n');

    const results = {};
    for (const sel of CANDIDATE_SELECTORS) {
        try {
            const count = await page.$$eval(sel, els => els.length);
            if (count > 0) {
                results[sel] = count;
                console.log(`  ✓ "${sel}" → ${count} elementos`);
            }
        } catch (e) { /* no match */ }
    }

    console.log('\n--- INTENTO EXTRACCIÓN PRODUCTOS ---\n');

    // Buscar el selector de card más probable
    const cardCandidates = Object.entries(results)
        .filter(([sel]) => sel.includes('product') || sel === 'article')
        .sort(([, a], [, b]) => a - b); // menor = más específico

    if (cardCandidates.length === 0) {
        console.log('  ✗ No se encontraron selectores de product card.');
        console.log('  → Abrir DevTools en la página y copiar las clases manualmente.');
    } else {
        for (const [cardSel, count] of cardCandidates.slice(0, 3)) {
            console.log(`\n  Intentando card selector: "${cardSel}" (${count} elementos)`);

            try {
                const sample = await page.evaluate((sel) => {
                    const cards = Array.from(document.querySelectorAll(sel)).slice(0, 3);
                    return cards.map(card => ({
                        textos: Array.from(card.querySelectorAll('*'))
                            .filter(el => el.children.length === 0 && el.innerText?.trim())
                            .slice(0, 5)
                            .map(el => `[${el.className || el.tagName}]: ${el.innerText.trim()}`),
                        clases: card.className.split(' ').filter(c => c.length > 2).slice(0, 8).join(', ')
                    }));
                }, cardSel);

                sample.forEach((prod, i) => {
                    console.log(`\n    Producto ${i + 1}:`);
                    console.log(`    Clases card: ${prod.clases}`);
                    prod.textos.forEach(t => console.log(`      ${t}`));
                });
            } catch (e) {
                console.log(`    Error: ${e.message}`);
            }
        }
    }

    console.log('\n════════════════════════════════════════');
    console.log('» Actualiza los SELECTORS en scraper-' + SUPER_ID + '.js con los que funcionaron');
    console.log('» Luego ejecuta: node scraper-' + SUPER_ID + '.js');
    console.log('════════════════════════════════════════\n');

    // Mantener browser abierto 30s para inspección manual
    console.log('Browser abierto 30 segundos para inspección manual...');
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
}

testSelectors().catch(e => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
