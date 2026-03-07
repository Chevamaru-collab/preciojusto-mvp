/**
 * scraper-wong.js — Scraper Wong.pe (CLASSIC DOM SCRAPING)
 * PrecioJusto Sprint 3
 * 
 * ESTRATEGIA: Carga Completa del DOM (Fallback a prueba de balas)
 * VTEX Wong ha parchado las llamadas Headless GraphQL y SSR sin firma.
 * Cargamos la web como un humano real, esperamos los contenedores de los items
 * y extraemos del DOM.
 */

const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

class WongScraper {
    constructor() {
        this.superId = 'wong';
        this.browser = null;
        this.page = null;
    }

    async init() {
        utils.log('=== Iniciando Wong Scraper (Classic DOM) ===', 'info');
        this.browser = await puppeteer.launch(config.puppeteer);
        this.page = await this.browser.newPage();

        await this.page.setUserAgent(utils.getRandomUserAgent(config.userAgents));
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Establecer ubicación antes de navegar para saltar el Modal
        await this.page.goto('https://www.wong.pe', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.setCookie({ name: 'locationStore', value: '38', domain: '.wong.pe' });

        // Bloquear assets pesados y scripts de tracking para mejorar velocidad
        await this.page.setRequestInterception(true);
        this.page.on('request', req => {
            const url = req.url().toLowerCase();
            const type = req.resourceType();

            if (['image', 'media', 'font', 'stylesheet'].includes(type) ||
                url.includes('google-analytics') ||
                url.includes('facebook') ||
                url.includes('datadoghq')) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    async scrapeCategory(categoria) {
        utils.log(`Wong: DOM Parse [${categoria.id}] ("${categoria.query}")...`, 'info');

        const url = config.supermercados.wong.searchUrl + encodeURIComponent(categoria.query) + '&map=ft';
        let rawProducts = [];

        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Detectar si no hay resultados antes de esperar en vano
            const voidCheck = await this.page.evaluate(() => {
                return !!document.querySelector('.vtex-search-result-3-x-notFound');
            });
            if (voidCheck) {
                utils.log(`Wong [${categoria.id}]: Sin resultados`, 'warn');
                return [];
            }

            // Wong VTEX usa los clásicos selectores de contenedor
            const itemSelector = '[class*="vtex-search-result-3-x-galleryItem"] article, [class*="vtex-product-summary-2-x-container"]';

            // Esperar que el react hidrate los productos
            utils.log(`Wong [${categoria.id}]: Esperando catálogo...`, 'info');
            await this.page.waitForSelector(itemSelector, { timeout: 30000 });

            // Iteración de Paginas / Scroll Infinito
            let previousCount = 0;
            let currentCount = 0;
            let staleRounds = 0;

            for (let i = 0; i < 6; i++) {
                currentCount = await this.page.evaluate((selSelector) => {
                    return document.querySelectorAll(selSelector).length;
                }, itemSelector);

                // Evaluar y extraer contenido en el marco de la página
                const extracted = await this.page.evaluate((selSelector) => {
                    const cards = Array.from(document.querySelectorAll(selSelector));
                    return cards.map(c => {
                        const nombre = c.querySelector('h3, [class*="productBrand"], [class*="brandName"]')?.innerText;
                        const precioOnlineBlock = c.querySelector('[class*="sellingPrice"]');
                        const precioRegularBlock = c.querySelector('[class*="listPrice"]');

                        if (nombre && precioOnlineBlock) {
                            return {
                                nombre: nombre.trim(),
                                precioOnline: precioOnlineBlock.innerText.trim(),
                                precioRegular: precioRegularBlock ? precioRegularBlock.innerText.trim() : null
                            };
                        }
                        return null;
                    }).filter(Boolean);
                }, itemSelector);

                // Acumular unificando por Set de Nombres
                rawProducts = extracted;

                // Scroll para trigerear carga lazy
                await utils.scrollNTimes(this.page, 3, 1000);

                // VTEX a veces tiene un botón Mostrar Más
                try {
                    const btnMore = await this.page.$('.vtex-search-result-3-x-buttonShowMore button');
                    if (btnMore) {
                        utils.log(`  Wong [${categoria.id}]: Click Load More`, 'info');
                        await btnMore.click();
                        await utils.randomDelay(1500, 2500);
                    }
                } catch (e) { }

                // Corte si llegamos a la cuota o no cargan más
                if (currentCount >= categoria.minItems * 2) {
                    utils.log(`  Wong [${categoria.id}]: Captura completa (${currentCount} items)`, 'ok');
                    break;
                }

                if (currentCount === previousCount) {
                    staleRounds++;
                    if (staleRounds >= 2) break;
                } else {
                    staleRounds = 0;
                }

                previousCount = currentCount;
            }

        } catch (e) {
            utils.log(`Wong ERROR [${categoria.id}]: ${e.message}`, 'error');
            // Si timeoutió, quizás se cargó la mitad del DOM
        }

        if (rawProducts.length === 0) return [];

        const cleaned = rawProducts.map(p => {
            return utils.normalizeProduct({
                ...p,
                categoria: categoria.id,
                scraped: new Date().toISOString()
            }, this.superId);
        }).filter(Boolean);

        const deduplicated = Array.from(new Map(cleaned.map(item => [item.id, item])).values());

        // Limitar porque no queremos sobrepasar excesivamente el minItems
        const finalProducts = deduplicated.slice(0, categoria.minItems * 3);

        utils.log(`Wong [${categoria.id}]: ${finalProducts.length} productos renderizados`, 'ok');
        return finalProducts;
    }

    async scrapeAll() {
        await this.init();
        const allData = {};

        for (const categoria of config.categorias) {
            try {
                const productos = await this.scrapeCategory(categoria);
                allData[categoria.id] = productos;
                utils.saveJSON(`wong-${categoria.id}.json`, productos);

                await utils.randomDelay(
                    config.delays.betweenCategories,
                    config.delays.betweenCategories + 1000
                );
            } catch (e) {
                utils.log(`Wong FATAL [${categoria.id}]: ${e.message}`, 'error');
                allData[categoria.id] = [];
            }
        }

        await this.browser.close();
        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Wong Classic Parsing completado: ${total} productos totales ===`, 'ok');
        return allData;
    }
}

module.exports = WongScraper;

if (require.main === module) {
    (async () => {
        const scraper = new WongScraper();
        await scraper.scrapeAll();
    })();
}
