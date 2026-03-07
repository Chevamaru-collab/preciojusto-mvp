const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('--- TEST VTEX GRAPHQL DIRECTO METRO ---');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // El subagent reportó que Metro usa el endpoint vtex.search-graphql
    // Vamos a escuchar la red, interceptar el payload XHR de productSearchV3

    let graphqlRequests = 0;

    // Capturador de respuestas GRaphQL
    page.on('response', async (res) => {
        if (res.url().includes('graphql') && res.request().method() === 'POST') {
            try {
                const reqData = JSON.parse(res.request().postData() || '{}');
                // Target the specific query "productSearchV3"
                if (reqData && reqData.query && reqData.query.includes('productSearchV3')) {
                    graphqlRequests++;
                    const json = await res.json();
                    const prods = json.data?.productSearch?.products || [];
                    console.log(`[VTEX] Intercepted productSearchV3: Obtenidos ${prods.length} productos crudos!`);

                    if (prods.length > 0) {
                        fs.writeFileSync('test-metro-graphql-output.json', JSON.stringify(prods, null, 2));
                        console.log('-> Dump guardado en test-metro-graphql-output.json');
                    }
                }
            } catch (e) { /* silent fail for other graphQL operations */ }
        }
    });

    console.log('Navegando y ejecutando bypass nativo...');
    await page.goto('https://www.metro.pe/search?q=arroz', { waitUntil: 'domcontentloaded' });

    // Trigger Modal
    let btnTrigger = null;
    try {
        btnTrigger = await page.$('button.metroio-metroiocompo1app-0-x-shopselect__button');
        if (!btnTrigger) {
            btnTrigger = await page.$('.metroio-metroiocompo1app-0-x-shopselect__address span');
        }
    } catch (e) { }

    if (btnTrigger) {
        await btnTrigger.click();
        await page.waitForSelector('input.metroio-metroiocompo1app-0-x-email__input', { timeout: 10000 });
        await page.type('input.metroio-metroiocompo1app-0-x-email__input', 'test@test.com');
        await page.click('label.metroio-metroiocompo1app-0-x-auth__checkbox').catch(() => { });
        await page.click('button.metroio-metroiocompo1app-0-x-auth__button').catch(() => { });
        await new Promise(r => setTimeout(r, 2000));

        const optionsBtns = await page.$$('button.metroio-metroiocompo1app-0-x-topbaroptions__button');
        for (const btn of optionsBtns) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text && text.includes('Retiro en tienda')) { await btn.click(); break; }
        }
        await new Promise(r => setTimeout(r, 1500));

        await page.evaluate(() => {
            const sel = document.querySelector('select.metroio-metroiocompo1app-0-x-pickup__select');
            if (sel) {
                sel.value = Array.from(sel.options).find(o => o.value !== '' && o.value !== '0').value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await new Promise(r => setTimeout(r, 1000));
        await page.click('button.metroio-metroiocompo1app-0-x-pickup__button').catch(() => { });
        console.log('Handshake ok. Esperando carga de grid (red)...');
    }

    // Darle tiempo a la página a cargar los fetches GraphQL
    await new Promise(r => setTimeout(r, 10000));

    // Forzamos un trigger a la barra de búsqueda si no cargó inicialmente
    if (graphqlRequests === 0) {
        console.log('Forzando reload local vía barra search...');
        const searchInput = await page.$('input[placeholder*="Buscar"]');
        if (searchInput) {
            await searchInput.click();
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 10000));
        }
    }

    await browser.close();
    console.log(`Test GraphQL completado. Requests válidos: ${graphqlRequests}`);
})();
