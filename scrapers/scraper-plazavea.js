/**
 * scraper-plazavea.js — Scraper PlazaVea.com.pe
 * PrecioJusto Sprint 3
 *
 * Plataforma: VTEX Custom (clases .Showcase*)
 * Selectores: VERIFICADOS en DOM real (6 Mar 2026)
 *
 * PARTICULARIDAD: Usa clases propias ".Showcase" (no las clases VTEX estándar).
 *                 Cookie popup #onetrust-accept-btn-handler.
 *                 Precio regular = .Showcase__oldPrice (tachado)
 *                 Precio venta = .Showcase__salePrice
 */

const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

// ─── Selectores DOM Plaza Vea ─────────────────────────────────────────────────
// VERIFICADOS: Inspeccionados en vivo en plazavea.com.pe/search?q=arroz (6 Mar 2026)
// Plataforma: VTEX Custom con clases .Showcase
const SELECTORS = {
    // Cookie consent popup
    cookieBtn: [
        '#onetrust-accept-btn-handler',
        '.cookie-accept',
        '[id*="cookie"] button',
        'button[class*="accept"]'
    ],

    // Tarjeta de producto — usa clase .Showcase
    productCard: [
        '.Showcase',
        '[class*="Showcase__"]:not([class*="Showcase__name"]):not([class*="Showcase__price"])',
        '[class*="vtex-search-result-3-x-galleryItem"]',
        '[class*="galleryItem"]',
        'article'
    ],
    // Nombre del producto
    productName: [
        '.Showcase__name',
        '[class*="Showcase__name"]',
        '[class*="vtex-product-summary-2-x-productNameContainer"]',
        '[class*="productNameContainer"]',
        'h3', 'h2'
    ],
    // Precio de venta / online
    priceOnline: [
        '.Showcase__salePrice',
        '.Showcase__sellingPrice',
        '[class*="Showcase__salePrice"]',
        '[class*="Showcase__sellingPrice"]',
        '[class*="sellingPriceValue"]',
        '[class*="sellingPrice"]'
    ],
    // Precio regular tachado
    priceRegular: [
        '.Showcase__oldPrice',
        '[class*="Showcase__oldPrice"]',
        '[class*="Showcase__listPrice"]',
        '[class*="listPriceValue"]',
        'del span'
    ]
};

class PlazaVeaScraper {
    constructor() {
        this.superId = 'plazavea';
        this.browser = null;
        this.page = null;
        this._cookieDismissed = false;
        this._detectedSelectors = {};
    }

    async init() {
        utils.log('=== Iniciando Plaza Vea Scraper ===', 'info');
        this.browser = await puppeteer.launch(config.puppeteer);
        this.page = await this.browser.newPage();

        await this.page.setUserAgent(utils.getRandomUserAgent(config.userAgents));
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Plaza Vea: NO bloqueamos imágenes para asegurar render correcto
    }

    async dismissCookiePopup() {
        if (this._cookieDismissed) return;
        for (const sel of SELECTORS.cookieBtn) {
            try {
                await this.page.waitForSelector(sel, { timeout: 3000 });
                await this.page.click(sel);
                this._cookieDismissed = true;
                utils.log('Plaza Vea: cookie popup cerrado', 'ok');
                await utils.randomDelay(500, 1000);
                return;
            } catch (e) { /* intentar siguiente */ }
        }
        this._cookieDismissed = true; // no había popup
    }

    async findSelector(selectorList, cacheKey) {
        if (typeof selectorList === 'string') return selectorList;
        if (this._detectedSelectors[cacheKey]) return this._detectedSelectors[cacheKey];

        for (const sel of selectorList) {
            try {
                const count = await this.page.$$eval(sel, els => els.length);
                if (count > 0) {
                    utils.log(`  PlazaVea selector [${cacheKey}]: "${sel}" → ${count}`, 'ok');
                    this._detectedSelectors[cacheKey] = sel;
                    return sel;
                }
            } catch (e) { /* continuar */ }
        }
        return null;
    }

    async scrapeCategory(categoria) {
        utils.log(`Plaza Vea: scraping [${categoria.id}]...`, 'info');

        const url = config.supermercados.plazavea.searchUrl + encodeURIComponent(categoria.query);

        try {
            // networkidle0 = espera hasta que no haya requests en vuelo
            await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
            await this.dismissCookiePopup();
            await utils.randomDelay(config.delays.pageLoad, config.delays.pageLoad + 2000);

            const cardSel = await this.findSelector(SELECTORS.productCard, 'card');
            if (!cardSel) {
                utils.log(`Plaza Vea: sin productos para [${categoria.id}]`, 'warn');
                return [];
            }

            const nameSel = await this.findSelector(SELECTORS.productName, 'name') || 'h3';
            const p1Sel = await this.findSelector(SELECTORS.priceOnline, 'p1') || null;
            const p2Sel = await this.findSelector(SELECTORS.priceRegular, 'p2') || null;

            // Plaza Vea carga mas lento — scroll pausado
            await utils.scrollNTimes(this.page, 4, 2500);

            const productos = await this.page.evaluate((cardS, nameS, p1S, p2S, superId, catId) => {
                const cards = Array.from(document.querySelectorAll(cardS));
                return cards.map(card => {
                    try {
                        const nombre = card.querySelector(nameS)?.innerText?.trim() || '';
                        const p1El = p1S ? card.querySelector(p1S) : null;
                        const p2El = p2S ? card.querySelector(p2S) : null;
                        if (!nombre || !p1El) return null;
                        return {
                            nombre,
                            precioOnline: p1El.innerText.trim(),
                            precioRegular: p2El?.innerText?.trim() || null,
                            categoria: catId,
                            scraped: new Date().toISOString()
                        };
                    } catch (e) { return null; }
                }).filter(Boolean);
            }, cardSel, nameSel, p1Sel, p2Sel, this.superId, categoria.id);

            const cleaned = productos
                .map(p => utils.normalizeProduct(p, this.superId))
                .filter(Boolean)
                .slice(0, categoria.minItems * 3);

            utils.log(`Plaza Vea [${categoria.id}]: ${cleaned.length} productos`, cleaned.length > 0 ? 'ok' : 'warn');
            return cleaned;

        } catch (e) {
            utils.log(`Plaza Vea ERROR [${categoria.id}]: ${e.message}`, 'error');
            return [];
        }
    }

    async scrapeAll() {
        await this.init();
        const allData = {};

        for (const categoria of config.categorias) {
            try {
                const productos = await this.scrapeCategory(categoria);
                allData[categoria.id] = productos;
                utils.saveJSON(`plazavea-${categoria.id}.json`, productos);
                // Plaza Vea más lento — delay extra
                await utils.randomDelay(
                    config.delays.betweenCategories + 3000,
                    config.delays.betweenCategories + 6000
                );
            } catch (e) {
                utils.log(`Plaza Vea FATAL [${categoria.id}]: ${e.message}`, 'error');
                allData[categoria.id] = [];
            }
        }

        await this.browser.close();
        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Plaza Vea completado: ${total} productos totales ===`, 'ok');
        return allData;
    }
}

module.exports = PlazaVeaScraper;

if (require.main === module) {
    (async () => {
        const scraper = new PlazaVeaScraper();
        await scraper.scrapeAll();
    })();
}
