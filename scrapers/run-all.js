/**
 * run-all.js — Maestro Orquestador PrecioJusto Sprint 3
 * 
 * Ejecuta sincronamente: Metro, PlazaVea, Tottus, Wong.
 */

const utils = require('./utils');
const config = require('./config');

const MetroScraper = require('./scraper-metro');
const WongScraper = require('./scraper-wong');
const PlazaVeaScraper = require('./scraper-plazavea');
const TottusScraper = require('./scraper-tottus');

async function runAll() {
    utils.log('\n======================================================', 'info');
    utils.log('      PRECIOJUSTO SPRINT 3 — SCRAPER ORCHESTRATOR      ', 'info');
    utils.log(`      Objetivo: 4 Supers × ${config.categorias.length} Categorías INEI        `, 'info');
    utils.log('======================================================\n', 'info');

    const startTime = Date.now();
    const supermercadosToRun = ['tottus', 'plazavea', 'metro', 'wong'];
    const consolidado = {
        stats: {
            fechaGeneracion: new Date().toISOString(),
            duracionEjecucionMs: 0,
            total: 0,
            porSuper: {},
            porCategoria: {}
        },
        supermercados: {}
    };

    for (const superId of supermercadosToRun) {
        if (!config.supermercados[superId]?.activo) {
            utils.log(`\n⏭️ Saltando ${superId} (Inactivo en config.js)`, 'warn');
            continue;
        }

        utils.log(`\n[▶] INICIANDO SCRAPE MASSIVO: ${superId.toUpperCase()}`, 'info');

        let scraperInstance;
        switch (superId) {
            case 'metro': scraperInstance = new MetroScraper(); break;
            case 'wong': scraperInstance = new WongScraper(); break;
            case 'plazavea': scraperInstance = new PlazaVeaScraper(); break;
            case 'tottus': scraperInstance = new TottusScraper(); break;
        }

        try {
            const superData = await scraperInstance.scrapeAll();
            consolidado.supermercados[superId] = {};
            let superTotal = 0;

            for (const catId in superData) {
                const prods = superData[catId];
                consolidado.supermercados[superId][catId] = prods;
                superTotal += prods.length;
                consolidado.stats.porCategoria[catId] = (consolidado.stats.porCategoria[catId] || 0) + prods.length;
            }

            consolidado.stats.porSuper[superId] = superTotal;
            consolidado.stats.total += superTotal;

            utils.log(`[✔] FINALIZADO ${superId.toUpperCase()} — Total extraído: ${superTotal} prods`, 'ok');
            await utils.randomDelay(config.delays.betweenSupermarkets, config.delays.betweenSupermarkets + 2000);

        } catch (error) {
            utils.log(`[✖] FATAL ERROR en ${superId}: ${error.message}`, 'error');
            consolidado.stats.porSuper[superId] = 0;
        }
    }

    const totalTime = Date.now() - startTime;
    consolidado.stats.duracionEjecucionMs = totalTime;
    consolidado.stats.duracionFormato = `${Math.floor(totalTime / 60000)}m ${((totalTime % 60000) / 1000).toFixed(0)}s`;

    utils.log('\n======================================================', 'info');
    utils.log('                   REPORTE FINAL                      ', 'info');
    utils.log('======================================================', 'info');
    utils.log(`  Tiempo Total: ${consolidado.stats.duracionFormato}`, 'info');
    utils.log(`  Catálogo: ${consolidado.stats.total} productos`, 'info');
    console.table(consolidado.stats.porSuper);

    // Guardar para MVP en "master-data.json"
    utils.saveJSON('master-data.json', consolidado);
    utils.log(`\n💾 Archivo consolidado guardado en /data/master-data.json`, 'ok');

    return consolidado;
}

if (require.main === module) {
    runAll().catch(e => {
        utils.log(`CRASH MAESTRO: ${e.message}`, 'error');
        process.exit(1);
    });
}
