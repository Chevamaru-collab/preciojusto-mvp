const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting network interception on Wong.pe...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const requests = [];

    await page.setRequestInterception(true);

    page.on('request', request => {
        const url = request.url();
        const type = request.resourceType();
        const method = request.method();
        
        if (type === 'xhr' || type === 'fetch') {
            // Log GraphQL, VTEX API or catalog calls
            if (url.includes('graphql') || url.includes('/api/') || url.includes('products') || url.includes('search')) {
                requests.push({
                    url,
                    method,
                    headers: request.headers(),
                    postData: request.postData()
                });
                console.log(`[${method}] Detected: ${url.split('?')[0]}`);
            }
        }
        
        // Abort heavy assets to speed up
        if (['image', 'media', 'font', 'stylesheet'].includes(type) || url.includes('google-analytics')) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        console.log('Navigating to Wong search for "arroz"...');
        // Usamos la URL de búsqueda directa
        await page.goto('https://www.wong.pe/arroz?map=ft', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log('Scrolling to trigger lazy loads...');
        for(let i=0; i<3; i++) {
            await page.evaluate(() => window.scrollBy(0, 1500));
            await new Promise(r => setTimeout(r, 1500));
        }
        
    } catch (e) {
        console.error('Navigation error:', e.message);
    }

    fs.writeFileSync('wong-network-log.json', JSON.stringify(requests, null, 2));
    console.log(`Saved ${requests.length} interesting requests to wong-network-log.json`);

    await browser.close();
})();
