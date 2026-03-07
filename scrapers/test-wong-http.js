const https = require('https');
const options = {
    hostname: 'www.wong.pe',
    path: '/search?q=arroz&map=ft',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': 'locationStore=38'
    }
};

const req = https.request(options, res => {
    let rawData = '';
    res.on('data', chunk => { rawData += chunk; });
    res.on('end', () => {
        const marker = 'data-varname="__STATE__"';
        const sIdx = rawData.indexOf(marker);
        if (sIdx === -1) {
            console.log("STATE NOT FOUND IN THE HTML. Wong might be demanding Javascript execution.");
            return;
        }

        // Extract JSON
        const scriptStart = rawData.indexOf('<script>', sIdx);
        const scriptEnd = rawData.indexOf('</script>', scriptStart);
        const jsonStr = rawData.substring(scriptStart + 8, scriptEnd).trim();

        fs.writeFileSync('wong-state-sample.json', jsonStr);
        console.log("State written to wong-state-sample.json (Length: " + jsonStr.length + ")");
    });
});
req.end();
const fs = require('fs');
