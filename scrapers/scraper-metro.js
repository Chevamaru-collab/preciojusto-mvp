/**
 * scraper-metro.js — Scraper Metro.pe (GRAPHQL FETCH BYPASS)
 * PrecioJusto Sprint 3
 *
 * ESTRATEGIA: API DIRECTA (Sin Puppeteer/Navegador)
 * Metro usa 'vtex.search-graphql' a través de GET Persisted Queries.
 * Simulamos esta petición pura vía Node-Fetch usando el Hash nativo.
 */

const fs = require('fs');
const config = require('./config');
const utils = require('./utils');

class MetroScraper {
    constructor() {
        this.superId = 'metro';
        // Cookies de sesión de tienda Lima obtenidas por ingeniería inversa
        this.baseHeaders = {
            "accept": "*/*",
            "content-type": "application/json",
            "cookie": "locationStore=144;", // 144 = Metro Angelica Gamarra (Lima)
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        };
        // Persisted Query Hash detectado en producción Metro (Mar 2026)
        this.sha256Hash = "31d3fa494df1fc41efef6d16dd96a96e6911b8aed7a037868699a1f3f4d365de";
        this.bindingId = "893de73e-7d5d-4f4e-9c7a-a32f1b2d77cb";
    }

    async init() {
        utils.log('=== Iniciando Metro Scraper (Fetch API Bypass) ===', 'info');
    }

    async scrapeCategory(categoria) {
        utils.log(`Metro: API fetch [${categoria.id}] ("${categoria.query}")...`, 'info');

        let rawProducts = [];
        const limit = 50; // Productos por página en VTEX
        // Calcular cuantas páginas sacar para alcanzar el minItems (suele ser 20 o 40)
        const totalPaginas = Math.ceil((categoria.minItems * 2) / limit);

        for (let page = 0; page < totalPaginas; page++) {
            const from = page * limit;
            const to = from + limit - 1;

            utils.log(`  -> Metro [${categoria.id}] Pág ${page + 1}: index ${from} - ${to}`, 'info');

            // Parámetros dinámicos de VTEX Search
            const variables = {
                "hideUnavailableItems": true,
                "skusFilter": "ALL",
                "simulationBehavior": "default",
                "installmentCriteria": "MAX_WITHOUT_INTEREST",
                "productOriginVtex": false,
                "map": "ft",
                "query": categoria.query,
                "orderBy": "OrderByPriceASC",
                "from": from,
                "to": to,
                "selectedFacets": [{ "key": "ft", "value": categoria.query }],
                "fullText": categoria.query,
                "facetsBehavior": "Static",
                "categoryTreeBehavior": "default",
                "withFacets": false,
                "variant": "null-null"
            };

            const extensions = {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": this.sha256Hash,
                    "sender": "vtex.store-resources@0.x",
                    "provider": "vtex.search-graphql@0.x"
                },
                "variables": Buffer.from(JSON.stringify(variables)).toString('base64')
            };

            const endpoint = `https://www.metro.pe/_v/segment/graphql/v1?workspace=master&maxAge=short&appsEtag=remove&domain=store&locale=es-PE&__bindingId=${this.bindingId}&operationName=productSearchV3&variables=%7B%7D&extensions=${encodeURIComponent(JSON.stringify(extensions))}`;

            try {
                const res = await fetch(endpoint, {
                    method: 'GET',
                    headers: this.baseHeaders
                });

                if (!res.ok) {
                    utils.log(`  Metro API error: HTTP ${res.status}`, 'error');
                    break;
                }

                const json = await res.json();
                const productsArray = json.data?.productSearch?.products || [];

                if (productsArray.length === 0) {
                    utils.log(`  Metro API: No hay más resultados en pág ${page + 1}`, 'warn');
                    break;
                }

                rawProducts = rawProducts.concat(productsArray);

                // Anti-ban delay interno entre paginaciones
                await utils.randomDelay(1500, 3000);

            } catch (e) {
                utils.log(`  Metro API Crash: ${e.message}`, 'error');
                break;
            }
        }

        if (rawProducts.length === 0) return [];

        // Mapeo VTEX JSON -> Modelo MVP
        const cleaned = rawProducts.map(p => {
            try {
                // Buscamos precio del seller principal '1'
                let p1 = null;
                let p2 = null;

                if (p.items && p.items.length > 0) {
                    const seller = p.items[0].sellers.find(s => s.sellerId === "1" || s.sellerDefault);
                    if (seller && seller.commertialOffer) {
                        p1 = seller.commertialOffer.Price;
                        p2 = seller.commertialOffer.ListPrice;
                    }
                }

                if (!p.productName || p1 === null || p1 === 0) return null;

                return utils.normalizeProduct({
                    nombre: p.productName,
                    precioOnline: 'S/ ' + p1,
                    precioRegular: p2 && p2 > p1 ? ('S/ ' + p2) : null,
                    categoria: categoria.id,
                    scraped: new Date().toISOString()
                }, this.superId);
            } catch (e) { return null; }
        }).filter(Boolean);

        // Deduplicar
        const deduplicated = Array.from(new Map(cleaned.map(item => [item.id, item])).values());
        utils.log(`Metro [${categoria.id}]: ${deduplicated.length} productos parseados vía API`, 'ok');

        return deduplicated;
    }

    async scrapeAll() {
        await this.init();
        const allData = {};

        for (const categoria of config.categorias) {
            try {
                const productos = await this.scrapeCategory(categoria);
                allData[categoria.id] = productos;
                utils.saveJSON(`metro-${categoria.id}.json`, productos);

                await utils.randomDelay(
                    config.delays.betweenCategories,
                    config.delays.betweenCategories + 2000
                );
            } catch (e) {
                utils.log(`Metro FATAL [${categoria.id}]: ${e.message}`, 'error');
                allData[categoria.id] = [];
            }
        }

        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Metro API completado: ${total} productos totales ===`, 'ok');
        return allData;
    }
}

module.exports = MetroScraper;

if (require.main === module) {
    (async () => {
        const scraper = new MetroScraper();
        await scraper.scrapeAll();
    })();
}
