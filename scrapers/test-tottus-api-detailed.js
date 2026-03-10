const fs = require('fs');

async function testTottusApiDetailed(queryTerm) {
    console.log(`Testing Tottus Next.js API for "${queryTerm}"`);

    const baseHeaders = {
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

    try {
        console.log("1. Performing warmup GET to get session cookies...");
        const warmup = await fetch('https://www.tottus.com.pe', { headers: baseHeaders });
        const cookiesArray = warmup.headers.getSetCookie ? warmup.headers.getSetCookie() : [];
        
        let cookieStr = '';
        for (let c of cookiesArray) {
            cookieStr += c.split(';')[0] + '; ';
        }
        baseHeaders['cookie'] = cookieStr;
        console.log(`Got cookies: ${cookieStr ? 'Yes' : 'No'}`);

        console.log("2. Hitting search API...");
        const endpoint = `https://www.tottus.com.pe/s/browse/v1/search/pe?Ntt=${encodeURIComponent(queryTerm)}&page=1&source=web&isAndes=true&site=to_com`;
        
        const res = await fetch(endpoint, {
            method: 'GET',
            headers: baseHeaders
        });

        console.log(`HTTP Status: ${res.status}`);
        
        if (!res.ok) {
            console.error('Failed to fetch data');
            const txt = await res.text();
            console.log("Response text:", txt.substring(0, 500));
            return;
        }

        const json = await res.json();
        const results = json.data?.results;

        if (results && results.length > 0) {
            console.log(`Success! Found ${results.length} items`);
            console.log('Sample item:', JSON.stringify(results[0].displayName));
        } else {
            console.log("No items found. Response:", JSON.stringify(json).substring(0, 500));
        }

    } catch (e) {
        console.error('Exception during fetch:', e);
    }
}

testTottusApiDetailed('arroz');
