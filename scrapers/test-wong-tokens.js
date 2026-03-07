const puppeteer = require('puppeteer');

(async () => {
    console.log('Test Extractor VTEX (__RUNTIME__) Wong...');
    const browser = await puppeteer.launch({ headless: false }); // headled para que no bloquee antibot
    const page = await browser.newPage();

    await page.goto('https://www.wong.pe', { waitUntil: 'networkidle2', timeout: 60000 });

    const vtexData = await page.evaluate(() => {
        let binding = null;
        let seg = null;
        try {
            if (window.__RUNTIME__) {
                binding = window.__RUNTIME__.bindingId;
                seg = window.__RUNTIME__.segmentToken;
            }
        } catch (e) { }
        return { binding, seg };
    });

    console.log('vtexData:', vtexData);

    await browser.close();
})();
