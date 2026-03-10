/**
 * scraper-plazavea.js — Scraper PlazaVea.com.pe (REST API BYPASS)
 * PrecioJusto Sprint 3.2
 *
 * ESTRATEGIA: API DIRECTA (VTEX REST)
 * Plaza Vea expone su endpoint público `api/catalog_system/pub/products/search`.
 * Simulamos esta petición pura vía Node-Fetch para evadir Puppeteer y timeouts.
 */

const fs = require('fs');
const config = require('./config');
const utils = require('./utils');

class PlazaVeaScraper {
    constructor() {
        this.superId = 'plazavea';
        this.baseHeaders = {
            "accept": "application/json",
            "accept-language": "es-419,es;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "referer": "https://www.plazavea.com.pe/"
        };
    }

    async init() {
        utils.log('=== Iniciando Plaza Vea Scraper (Fetch API Bypass) ===', 'info');
    }

    async scrapeCategory(categoria) {
        utils.log(`Plaza Vea: API fetch [${categoria.id}] ("${categoria.query}")...`, 'info');

        let rawProducts = [];
        const limit = 50; 
        const totalPaginas = Math.ceil((categoria.minItems * 2) / limit);

        for (let page = 0; page < totalPaginas; page++) {
            const from = page * limit;
            const to = from + limit - 1;

            utils.log(`  -> Plaza Vea [${categoria.id}] Pág ${page + 1}: index ${from} - ${to}`, 'info');

            // El querystring para buscar
            // Plaza Vea VTEX usa &O=OrderByScoreDESC y _from/_to
            const endpoint = `https://www.plazavea.com.pe/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(categoria.query)}&O=OrderByScoreDESC&_from=${from}&_to=${to}`;

            try {
                const res = await fetch(endpoint, {
                    method: 'GET',
                    headers: this.baseHeaders
                });

                if (!res.ok) {
                    utils.log(`  Plaza Vea API error: HTTP ${res.status}`, 'error');
                    break;
                }

                const productsArray = await res.json();

                if (!Array.isArray(productsArray) || productsArray.length === 0) {
                    utils.log(`  Plaza Vea API: No hay más resultados en pág ${page + 1}`, 'warn');
                    break;
                }

                rawProducts = rawProducts.concat(productsArray);

                await utils.randomDelay(800, 1500);

                if (rawProducts.length >= categoria.minItems * 2) {
                    break;
                }
            } catch (e) {
                utils.log(`  Plaza Vea ERROR request: ${e.message}`, 'error');
                break;
            }
        }

        if (rawProducts.length === 0) {
            utils.log(`Plaza Vea [${categoria.id}]: Sin resultados válidos`, 'warn');
            return [];
        }

        const cleaned = rawProducts.map(p => {
            const nombre = p.productName;
            
            // VTEX REST Search Schema
            // Los precios viven dentro de items[X].sellers[Y].commertialOffer
            const seller = p.items?.[0]?.sellers?.[0];
            const offer = seller?.commertialOffer;
            
            const precioRef = offer?.Price;
            const precioRegular = offer?.ListPrice;

            if (!nombre) return null;
            if (precioRef === null || precioRef === undefined || precioRef <= 0) return null;

            if (!utils.isRelevant(nombre, categoria.id)) return null;

            return utils.normalizeProduct({
                nombre: nombre.trim(),
                precioOnline: precioRef.toString(),
                precioRegular: (precioRegular && precioRegular > precioRef) ? precioRegular.toString() : null,
                categoria: categoria.id,
                scraped: new Date().toISOString(),
                // Metadata util pero opcional
                marca: p.brand
            }, this.superId);
        }).filter(Boolean);

        const deduplicated = Array.from(new Map(cleaned.map(item => [item.id, item])).values());
        const finalProducts = deduplicated.slice(0, Math.ceil(categoria.minItems * 1.5));

        utils.log(`Plaza Vea [${categoria.id}]: ${finalProducts.length} productos procesados (Deduplicados/Filtro. Relevancia)`, 'ok');
        return finalProducts;
    }

    async scrapeAll() {
        await this.init();
        const allData = {};

        for (const categoria of config.categorias) {
            try {
                const productos = await this.scrapeCategory(categoria);
                allData[categoria.id] = productos;
                utils.saveJSON(`plazavea-${categoria.id}.json`, productos);

                await utils.randomDelay(
                    config.delays.betweenCategories,
                    config.delays.betweenCategories + 1000
                );
            } catch (e) {
                utils.log(`Plaza Vea FATAL [${categoria.id}]: ${e.message}`, 'error');
                allData[categoria.id] = [];
            }
        }

        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Plaza Vea API Parsing completado: ${total} productos totales ===`, 'ok');
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
