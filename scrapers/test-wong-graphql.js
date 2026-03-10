const fs = require('fs');

const WONG_BINDING_ID = '5a9c2294-7ff1-4e02-984e-1d27cd4aa89e';
const WONG_SHA256 = '31d3fa494df1fc41efef6d16dd96a96e6911b8aed7a037868699a1f3f4d365de';

async function testWongGraphQL(queryTerm) {
    const variables = {
        hideUnavailableItems: true,
        skusFilter: "ALL",
        simulationBehavior: "default",
        installmentCriteria: "MAX_WITHOUT_INTEREST",
        productOriginVtex: false,
        map: "ft",
        query: queryTerm,
        orderBy: "OrderByScoreDESC",
        from: 0,
        to: 15,
        selectedFacets: [{ key: "ft", value: queryTerm }],
        fullText: queryTerm,
        facetsBehavior: "Static",
        categoryTreeBehavior: "default",
        withFacets: false,
        variant: "null-null"
    };

    const variablesBase64 = Buffer.from(JSON.stringify(variables)).toString('base64');
    
    // El tenant para Wong en las cabeceras fue 'wongio'
    const segmentToken = Buffer.from(JSON.stringify({
        campaigns: null,
        channel: "70",
        priceTables: null,
        regionId: null,
        utm_campaign: null,
        utm_source: null,
        utmi_campaign: null,
        currencyCode: "PEN",
        currencySymbol: "S/",
        countryCode: "PER",
        cultureInfo: "es-PE",
        channelPrivacy: "public"
    })).toString('base64');


    const urlObj = new URL('https://www.wong.pe/_v/segment/graphql/v1');
    urlObj.searchParams.append('workspace', 'master');
    urlObj.searchParams.append('maxAge', 'short');
    urlObj.searchParams.append('appsEtag', 'remove');
    urlObj.searchParams.append('domain', 'store');
    urlObj.searchParams.append('locale', 'es-PE');
    urlObj.searchParams.append('__bindingId', WONG_BINDING_ID);
    urlObj.searchParams.append('operationName', 'productSearchV3');
    urlObj.searchParams.append('variables', '{}');
    urlObj.searchParams.append('extensions', JSON.stringify({
        persistedQuery: {
            version: 1,
            sha256Hash: WONG_SHA256,
            sender: 'vtex.store-resources@0.x',
            provider: 'vtex.search-graphql@0.x'
        },
        variables: variablesBase64
    }));

    console.log(`Fetching from: ${urlObj.toString()}`);

    try {
        const response = await fetch(urlObj.toString(), {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'es-419,es;q=0.9',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Enviar la cookie minimal
                'cookie': `vtex_segment=${segmentToken};`
            }
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        const products = data?.data?.productSearch?.products || [];
        
        console.log(`Success! Found ${products.length} products for query "${queryTerm}".`);
        if (products.length > 0) {
            console.log('Sample product:', JSON.stringify({
                name: products[0].productName,
                brand: products[0].brand,
                price: products[0].priceRange?.sellingPrice?.lowPrice || 'N/A'
            }, null, 2));
        } else {
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testWongGraphQL('arroz');
