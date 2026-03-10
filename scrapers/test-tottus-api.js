const fs = require('fs');

async function testTottusApi(queryTerm) {
    // Tottus uses Falabella's backend (BFF)
    // The structure is heavily obfuscated with contextId and widgetsUUID in the network log
    // Let's try to hit the search autocomplete endpoint first, which is usually open
    const searchEndpoint = `https://www.falabella.com.pe/s/browse/v1/search/es?str=${encodeURIComponent(queryTerm)}&zone=LEG_TOTTUS_CASTOR_3,TOTTUS_STA_ANITA_12,912_SAN_ISIDRO_1`;
    
    console.log(`Fetching: ${searchEndpoint}`);
    
    try {
        const res = await fetch(searchEndpoint, {
            method: 'GET',
            headers: {
                "accept": "application/json",
                "accept-language": "es-419,es;q=0.9",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "referer": "https://www.tottus.com.pe/"
            }
        });
        
        if(!res.ok) {
            console.error(`Error HTTP: ${res.status}`);
            return;
        }
        
        const data = await res.json();
        
        console.log(`Success! Found Search Data`);
        if(data && data.data && data.data.results) {
             console.log(`Direct products found from search: ${data.data.results.length}`);
             if(data.data.results.length > 0) {
                 const p = data.data.results[0];
                 console.log('Sample product:', JSON.stringify({
                    name: p.displayName,
                    brand: p.brand,
                    price: p.prices ? p.prices[0]?.price[0] : 'N/A'
                 }, null, 2));
             }
        } else {
             console.log(JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testTottusApi('arroz');
