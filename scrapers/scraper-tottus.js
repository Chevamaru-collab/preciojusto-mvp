/**
 * scraper-tottus.js — Scraper Tottus.com.pe (API NEXT.JS BYPASS)
 * PrecioJusto Sprint 3
 *
 * ESTRATEGIA: API DIRECTA (Sin Puppeteer)
 * Extraemos un endpoint oculto del payload GET en /s/browse/v1/search/pe.
 * Evita bloqueos de Cloudflare por dom-scraping y reduce el tiempo a ~2 segundos.
 */

const config = require('./config');
const utils = require('./utils');

class TottusScraper {
    constructor() {
        this.superId = 'tottus';
        this.baseHeaders = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "es-PE,es;q=0.9",
            "content-type": "application/json",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Google Chrome\";v=\"132\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-ch-app-name": "Next.js",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        };
    }

    async init() {
        utils.log('=== Iniciando Tottus Scraper (NextJS API Fetch Bypass) ===', 'info');
        // Tottus.pe pide una sesión local/cookie inicial si somos severos.
        // Haremos un warmup GET a la home solo para extraer cookies Set-Cookie
        try {
            utils.log("Tottus: Solicitando cookies iniciales...", 'info');
            const warmup = await fetch('https://www.tottus.com.pe', { headers: this.baseHeaders });
            const cookiesArray = warmup.headers.getSetCookie ? warmup.headers.getSetCookie() : [];

            // Juntar cookies
            let cookieStr = '';
            for (let c of cookiesArray) {
                cookieStr += c.split(';')[0] + '; ';
            }
            this.baseHeaders['cookie'] = cookieStr;
        } catch (e) { /* ignore warmup */ }
    }

    async scrapeCategory(categoria) {
        utils.log(`Tottus: Fetch API [${categoria.id}] ("${categoria.query}")...`, 'info');

        let rawProducts = [];
        const maxPages = 3;

        for (let page = 1; page <= maxPages; page++) {
            utils.log(`  -> Tottus [${categoria.id}] Pág ${page}`, 'info');

            // API endpoint mapeado desde DevTools network
            const endpoint = `https://www.tottus.com.pe/s/browse/v1/search/pe?Ntt=${encodeURIComponent(categoria.query)}&page=${page}&source=web&isAndes=true&site=to_com`;

            try {
                const res = await fetch(endpoint, {
                    method: 'GET',
                    headers: this.baseHeaders
                });

                if (!res.ok) {
                    utils.log(`  Tottus API error: HTTP ${res.status}`, 'error');
                    break;
                }

                const json = await res.json();
                const productsArray = json.data?.results || [];

                if (productsArray.length === 0) {
                    utils.log(`  Tottus: Fin de resultados en pág ${page}`, 'warn');
                    break;
                }

                rawProducts = rawProducts.concat(productsArray);

                // Si llegamos a la couta, break
                if (rawProducts.length >= categoria.minItems * 2) break;

                await utils.randomDelay(1000, 2000);

            } catch (e) {
                utils.log(`  Tottus API Crash: ${e.message}`, 'error');
                break;
            }
        }

        if (rawProducts.length === 0) return [];

        // Parsear el modelo complejo JSON de Tottus Next.js
        const cleaned = rawProducts.map(p => {
            try {
                let p1 = null;
                let p2 = null;

                // Buscar precio online en el array de prices
                if (p.prices && Array.isArray(p.prices)) {
                    // En Tottus: internetPrice es el preferido. cmrPrice omitido.
                    const inet = p.prices.find(pr => pr.type === 'internetPrice' || pr.type === 'normalPrice');
                    const norm = p.prices.find(pr => pr.type === 'normalPrice' && pr.crossed === true);

                    if (inet && inet.price && inet.price.length > 0) {
                        p1 = inet.price[0];
                    }
                    if (norm && norm.price && norm.price.length > 0) {
                        p2 = norm.price[0];
                    }
                }

                if (!p.displayName || p1 === null) return null;

                // Añadir marca si la tiene
                const brandPrefix = p.brand ? `${p.brand} ` : '';

                return utils.normalizeProduct({
                    nombre: brandPrefix + p.displayName,
                    precioOnline: 'S/ ' + p1,
                    precioRegular: p2 && p2 > p1 ? ('S/ ' + p2) : null,
                    categoria: categoria.id,
                    scraped: new Date().toISOString()
                }, this.superId);

            } catch (e) { return null; }
        }).filter(Boolean);

        const deduplicated = Array.from(new Map(cleaned.map(item => [item.id, item])).values());

        // Limitar
        const finalProducts = deduplicated.slice(0, categoria.minItems * 3);

        utils.log(`Tottus [${categoria.id}]: ${finalProducts.length} productos parseados vía API GET`, 'ok');
        return finalProducts;
    }

    async scrapeAll() {
        await this.init();
        const allData = {};

        for (const categoria of config.categorias) {
            try {
                const productos = await this.scrapeCategory(categoria);
                allData[categoria.id] = productos;
                utils.saveJSON(`tottus-${categoria.id}.json`, productos);

                await utils.randomDelay(
                    config.delays.betweenCategories,
                    config.delays.betweenCategories + 1000
                );
            } catch (e) {
                utils.log(`Tottus FATAL [${categoria.id}]: ${e.message}`, 'error');
                allData[categoria.id] = [];
            }
        }

        const total = Object.values(allData).reduce((s, arr) => s + arr.length, 0);
        utils.log(`=== Tottus API NextJS completado: ${total} productos totales ===`, 'ok');
        return allData;
    }
}

module.exports = TottusScraper;

if (require.main === module) {
    (async () => {
        const scraper = new TottusScraper();
        await scraper.scrapeAll();
    })();
}
