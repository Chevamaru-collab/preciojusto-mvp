/**
 * scraper-wong.js — Scraper Wong.pe (GRAPHQL FETCH BYPASS)
 * PrecioJusto Sprint 3
 * 
 * ESTRATEGIA: API DIRECTA (Sin Puppeteer/Navegador)
 * Wong usa 'vtex.search-graphql' a través de GET Persisted Queries.
 * Simulamos esta petición pura vía Node-Fetch (nativo en Node >= 18) usando el Hash nativo.
 */

const fs = require('fs');
const config = require('./config');
const utils = require('./utils');

class WongScraper {
    constructor() {
        this.superId = 'wong';
        const segmentToken = Buffer.from(JSON.stringify({
            campaigns: null,
            channel: "70",
            priceTables: null,
            regionId: null,
            utm_campaign: null,
            utm_source: null,
            utmi_campaign: null,
            currencyCode: "PEN",
            currencySymbol: "S/",
            countryCode: "PER",
            cultureInfo: "es-PE",
            channelPrivacy: "public"
        })).toString('base64');

        this.baseHeaders = {
            "accept": "*/*",
            "accept-language": "es-419,es;q=0.9",
            "content-type": "application/json",
            "cookie": `vtex_segment=${segmentToken};`,
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        // Persisted Query Hash detectado en producción Wong (Mar 2026)
        this.sha256Hash = "31d3fa494df1fc41efef6d16dd96a96e6911b8aed7a037868699a1f3f4d365de";
        this.bindingId = "5a9c2294-7ff1-4e02-984e-1d27cd4aa89e";
    }

    async init() {
        utils.log('=== Iniciando Wong Scraper (Fetch API Bypass) ===', 'info');
    }

    async scrapeCategory(categoria) {
        utils.log(`Wong: API fetch [${categoria.id}] ("${categoria.query}")...`, 'info');

        let rawProducts = [];
        const limit = 50; 
        const totalPaginas = Math.ceil((categoria.minItems * 2) / limit);

        for (let page = 0; page < totalPaginas; page++) {
            const from = page * limit;
            const to = from + limit - 1;

            utils.log(`  -> Wong [${categoria.id}] Pág ${page + 1}: index ${from} - ${to}`, 'info');

            const variables = {
                "hideUnavailableItems": true,
                "skusFilter": "ALL",
                "simulationBehavior": "default",
                "installmentCriteria": "MAX_WITHOUT_INTEREST",
                "productOriginVtex": false,
                "map": "ft",
                "query": categoria.query,
                "orderBy": "OrderByScoreDESC",
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

            const urlObj = new URL('https://www.wong.pe/_v/segment/graphql/v1');
            urlObj.searchParams.append('workspace', 'master');
            urlObj.searchParams.append('maxAge', 'short');
            urlObj.searchParams.append('appsEtag', 'remove');
            urlObj.searchParams.append('domain', 'store');
            urlObj.searchParams.append('locale', 'es-PE');
            urlObj.searchParams.append('__bindingId', this.bindingId);
            urlObj.searchParams.append('operationName', 'productSearchV3');
            urlObj.searchParams.append('variables', '{}');
            urlObj.searchParams.append('extensions', JSON.stringify(extensions));

            try {
                const res = await fetch(urlObj.toString(), {
                    method: 'GET',
                    headers: this.baseHeaders
                });

                if (!res.ok) {
                    utils.log(`  Wong API error: HTTP ${res.status}`, 'error');
                    break;
                }

                const json = await res.json();
                const productsArray = json.data?.productSearch?.products || [];

                if (productsArray.length === 0) {
                    utils.log(`  Wong API: No hay más resultados en pág ${page + 1}`, 'warn');
                    break;
                }

                rawProducts = rawProducts.concat(productsArray);

                await utils.randomDelay(800, 1500);

                if (rawProducts.length >= categoria.minItems * 2) {
                    break;
                }
            } catch (e) {
                utils.log(`  Wong ERROR request: ${e.message}`, 'error');
                break;
            }
        }

        if (rawProducts.length === 0) {
            utils.log(`Wong [${categoria.id}]: Sin resultados válidos`, 'warn');
            return [];
        }

        const cleaned = rawProducts.map(p => {
            const nombre = p.productName;
            const precioRef = p.priceRange?.sellingPrice?.lowPrice;

            if (!nombre) return null;
            if (precioRef === null || precioRef === undefined) return null;

            if (!utils.isRelevant(nombre, categoria.id)) return null;

            return utils.normalizeProduct({
                nombre: nombre.trim(),
                precioOnline: precioRef.toString(),
                precioRegular: p.priceRange?.listPrice?.highPrice?.toString() || null,
                categoria: categoria.id,
                scraped: new Date().toISOString()
            }, this.superId);
        }).filter(Boolean);

        const deduplicated = Array.from(new Map(cleaned.map(item => [item.id, item])).values());
        const finalProducts = deduplicated.slice(0, Math.ceil(categoria.minItems * 1.5));

        utils.log(`Wong [${categoria.id}]: ${finalProducts.length} productos procesados (Deduplicados/Filtro. Relevancia)`, 'ok');
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

        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Wong API Parsing completado: ${total} productos totales ===`, 'ok');
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
