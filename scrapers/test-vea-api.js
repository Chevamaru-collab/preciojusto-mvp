const fs = require('fs');

async function testPlazaVeaApi(queryTerm) {
    const endpoint = `https://www.plazavea.com.pe/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(queryTerm)}&O=OrderByScoreDESC&_from=0&_to=49`;
    
    console.log(`Fetching: ${endpoint}`);
    
    try {
        const res = await fetch(endpoint, {
            method: 'GET',
            headers: {
                "accept": "application/json",
                "accept-language": "es-419,es;q=0.9",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "referer": "https://www.plazavea.com.pe/"
            }
        });
        
        if(!res.ok) {
            console.error(`Error HTTP: ${res.status}`);
            return;
        }
        
        const data = await res.json();
        
        console.log(`Success! Found ${data.length} products for "${queryTerm}"`);
        if(data.length > 0) {
            console.log('Sample product:', JSON.stringify({
                name: data[0].productName,
                brand: data[0].brand,
                price: data[0].items[0]?.sellers[0]?.commertialOffer?.Price || 'N/A'
            }, null, 2));
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testPlazaVeaApi('fideos');
