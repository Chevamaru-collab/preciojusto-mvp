const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Cookie de Lima
    await page.goto('https://www.metro.pe', { waitUntil: 'domcontentloaded' });
    await page.setCookie({ name: 'locationStore', value: '144', domain: '.metro.pe' });

    const url = 'https://www.metro.pe/search?q=arroz';
    console.log('Navigating to ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));

    // Handshake
    const btnElegir = await page.$('button.metroio-metroiocompo1app-0-x-shopselect__button');
    if (btnElegir) {
        console.log('Doing handshake...');
        await btnElegir.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.type('input.metroio-metroiocompo1app-0-x-email__input', 'test@test.com');
        await page.click('label.metroio-metroiocompo1app-0-x-auth__checkbox').catch(() => { });
        await page.click('button.metroio-metroiocompo1app-0-x-auth__button').catch(() => { });
        await new Promise(r => setTimeout(r, 3000));

        const optionsBtns = await page.$$('button.metroio-metroiocompo1app-0-x-topbaroptions__button');
        for (const btn of optionsBtns) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text && text.includes('Retiro en tienda')) { await btn.click(); break; }
        }
        await new Promise(r => setTimeout(r, 2000));

        await page.evaluate(() => {
            const sel = document.querySelector('select.metroio-metroiocompo1app-0-x-pickup__select');
            if (sel) {
                sel.value = Array.from(sel.options).find(o => o.value !== '' && o.value !== '0').value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await new Promise(r => setTimeout(r, 1500));
        await page.click('button.metroio-metroiocompo1app-0-x-pickup__button').catch(() => { });
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log('Handshake done. Re-navigating to query...');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 5000));

    // Scroll a bit
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));

    const c1 = await page.$$eval('div.vtex-search-result-3-x-galleryItem', e => e.length).catch(() => 0);
    const c2 = await page.$$eval('a.vtex-product-summary-2-x-clearLink', e => e.length).catch(() => 0);
    const c3 = await page.$$eval('section.vtex-product-summary-2-x-container', e => e.length).catch(() => 0);

    console.log(`galleryItem count: ${c1}`);
    console.log(`clearLink count: ${c2}`);
    console.log(`container count: ${c3}`);

    await browser.close();
})();
