const fs = require('fs');

try {
    console.log("-> Start local dump reading...");
    const html = fs.readFileSync('test-wong-debug.html', 'utf-8');

    // Extracción pura con substring manual para esquivar JSDOM
    const marker = 'data-varname="__STATE__"';
    let sIdx = html.indexOf(marker);
    if (sIdx === -1) {
        console.log("No hallado __STATE__");
        return;
    }

    // Buscar la apertura de script
    const scriptStart = html.indexOf('<script>', sIdx);
    const contentStart = scriptStart + 8;
    const scriptEnd = html.indexOf('</script>', contentStart);

    const jsonStr = html.substring(contentStart, scriptEnd).trim();
    const stateJSON = JSON.parse(jsonStr);

    const keys = Object.keys(stateJSON);
    console.log(`\n=== WONG SSR DUMP ANALYZER ===\nTotal keys: ${keys.length}`);

    const productKeys = keys.filter(k => k.startsWith('Product:'));
    console.log(`\nProductos Encontrados: ${productKeys.length}`);
    if (productKeys.length === 0) return;

    const p1Key = productKeys[0];
    const p1Data = stateJSON[p1Key];
    console.log(`\n[PRODUCT 1]: ${p1Data.productName}`);
    console.log(`CacheId: ${p1Data.cacheId}`);
    console.log(`ProductId: ${p1Data.productId}`);

    console.log(`\nBuscando dependencias vinculadas...`);
    // Escaneo brutal
    const linkKeys = keys.filter(k =>
        k.includes(p1Data.productId) ||
        (p1Data.cacheId && k.includes(p1Data.cacheId)) ||
        k.startsWith(p1Key)
    );

    console.log(`Llaves relacionadas a obj principal (${linkKeys.length}):`);
    linkKeys.forEach(lk => {
        if (lk.toLowerCase().includes('offer') || lk.toLowerCase().includes('price')) {
            console.log(` -> [HIT PRECIO] ${lk} = ${JSON.stringify(stateJSON[lk])}`);
        } else {
            console.log(` -> ${lk.substring(0, 80)}...`);
        }
    });

} catch (e) {
    console.error("Error analizando dump offline:", e);
}
