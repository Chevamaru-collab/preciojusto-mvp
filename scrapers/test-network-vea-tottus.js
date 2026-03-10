const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting network interception on Plaza Vea and Tottus...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let requestsPlazaVea = [];
    let requestsTottus = [];
    let target = 'plazavea';

    await page.setRequestInterception(true);

    page.on('request', request => {
        const url = request.url();
        const type = request.resourceType();
        const method = request.method();
        
        if (type === 'xhr' || type === 'fetch') {
            if (url.includes('graphql') || url.includes('/api/') || url.includes('search') || url.includes('products') || url.includes('query')) {
                const reqData = {
                    url,
                    method,
                    headers: request.headers(),
                    postData: request.postData()
                };
                if (target === 'plazavea') requestsPlazaVea.push(reqData);
                else requestsTottus.push(reqData);
            }
        }
        
        if (['image', 'media', 'font', 'stylesheet'].includes(type) || url.includes('google-analytics')) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        console.log('Navigating to Plaza Vea search for "fideos"...');
        await page.goto('https://www.plazavea.com.pe/fideos/pastas-y-fideos/abarrotes', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log('Scrolling to trigger lazy loads...');
        for(let i=0; i<3; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1000));
        }
        fs.writeFileSync('plazavea-network-log.json', JSON.stringify(requestsPlazaVea, null, 2));
        console.log(`Saved ${requestsPlazaVea.length} interesting requests for Plaza Vea.`);

        // Switch to Tottus
        target = 'tottus';
        console.log('Navigating to Tottus search for "arroz"...');
        await page.goto('https://tottus.falabella.com.pe/tottus-pe/category/cat2210170/Arroz', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log('Scrolling to trigger lazy loads...');
        for(let i=0; i<3; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1000));
        }
        fs.writeFileSync('tottus-network-log.json', JSON.stringify(requestsTottus, null, 2));
        console.log(`Saved ${requestsTottus.length} interesting requests for Tottus.`);

    } catch (e) {
        console.error('Navigation error:', e.message);
    }

    await browser.close();
})();
