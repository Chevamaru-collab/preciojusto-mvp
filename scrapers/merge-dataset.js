/**
 * merge-dataset.js
 * Script para fusionar los CSV obtenidos de Browse.AI con el scraping de Puppeteer
 * garantizando la prioridad del dataset base de CSV y unificándolo todo
 * al formato histórico Browse.AI para el MVP.
 */

const fs = require('fs');
const path = require('path');

const ARROZ_CSV = path.join(__dirname, '..', 'Browse.ia - B.L_Arroz - 2026-03-06.csv');
const ACEITE_CSV = path.join(__dirname, '..', 'Browse.ia - B.L_Aceite - 2026-03-06.csv');
const SCRAPED_JS = path.join(__dirname, '..', 'data-scraped.js');
const OUTPUT_DATA = path.join(__dirname, '..', 'data.js');

// Helper para parsear CSV manual simple
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        let row = [];
        let cur = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(cur.trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        row.push(cur.trim());

        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j] || null;
        }
        results.push(obj);
    }
    return results;
}

function parseCurrency(str) {
    if (!str) return 0;
    const clean = str.replace(/[S/\.,]+/g, (match) => match === '.' ? '.' : '').replace('S', '').trim();
    return parseFloat(clean) || 0;
}

function parsePercentage(str) {
    if (!str) return null;
    return parseFloat(str.replace('%', ''));
}

function normalizeBrowseAI(row, catId) {
    // Transforma una fila CSV a la estructura JSON "rawData" requerida por app.js
    const precioOnline = parseCurrency(row['PRECIO ONLINE']);
    const precioRegular = parseCurrency(row['PRECIO REGULAR']);

    const obj = {
        fecha: row['FECHA'],
        super: row['SUPER'],
        item: row['ITEM'],
        categoria: catId,
        marca: row['MARCA N'] || row['MARCA'],
        tipo: row['TIPO'],
        clase: row['CLASE'] || null,
        precioOnline: precioOnline,
        precioRegular: precioRegular,
        descuento: parsePercentage(row['DESCUENTO %']),
        presentacion: parseFloat(row['PRESENTACION']) || 1,
        pack: parseInt(row['PACK']) || 1,
        vt: parseFloat(row['V.T']) || parseFloat(row['PRESENTACION']) || 1,
        um: row['UM'] || 'u',
        pxum: parseCurrency(row['P x UM']) || precioOnline
    };
    return obj;
}

async function main() {
    let browseData = [];

    // 1. Ingestar y parsear CSVs de Browse.AI
    if (fs.existsSync(ARROZ_CSV)) {
        const content = fs.readFileSync(ARROZ_CSV, 'utf8');
        const rows = parseCSV(content);
        const norm = rows.map(r => normalizeBrowseAI(r, 'Arroz'));
        browseData.push(...norm);
        console.log(`[CSV] Leídos ${norm.length} registros de Arroz.`);
    }

    if (fs.existsSync(ACEITE_CSV)) {
        const content = fs.readFileSync(ACEITE_CSV, 'utf8');
        const rows = parseCSV(content);
        const norm = rows.map(r => normalizeBrowseAI(r, 'Aceite'));
        browseData.push(...norm);
        console.log(`[CSV] Leídos ${norm.length} registros de Aceite.`);
    }

    // 2. Ingestar JSON scrapeado (Puppeteer)
    let scrapedData = [];
    if (fs.existsSync(SCRAPED_JS)) {
        const jsContent = fs.readFileSync(SCRAPED_JS, 'utf8');
        // Extraer el array JSON del string `const rawDataScraped = [...]`
        const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                scrapedData = JSON.parse(jsonMatch[0]);
                console.log(`[Puppeteer] Leídos ${scrapedData.length} registros scrapeados.`);
            } catch (e) {
                console.error("Error parseando scraped data JS:", e);
            }
        }
    }

    // 3. Mergear con prioridad Browse.AI
    // Clave primaria: super + item + fecha
    const mergedMap = new Map();

    // Insertamos primero las de Puppeteer
    for (const p of scrapedData) {
        // Puppeteer data might not have 'pack' if it's strictly the script format, ensure it matches
        p.pack = p.pack || 1;

        const key = `${p.super}|${p.item}|${p.fecha}`.toLowerCase();
        mergedMap.set(key, p);
    }

    let overridenCount = 0;

    // Insertamos las de Browse.AI, sobreescribiendo si hay colisión
    for (const b of browseData) {
        const key = `${b.super}|${b.item}|${b.fecha}`.toLowerCase();
        if (mergedMap.has(key)) {
            overridenCount++;
        }
        mergedMap.set(key, b);
    }

    const finalDataset = Array.from(mergedMap.values());
    console.log(`[Merge] Dataset final unificado: ${finalDataset.length} registros (Sobreescritos/Duplicados omitidos: ${overridenCount}).`);

    // 4. Exportar data.js (Única fuente de verdad)
    const header = `// PRECIO JUSTO — rawData\n// Base: Browse.AI + Puppeteer Scrapers\n// Generado: ${new Date().toISOString()}\n// Registros: ${finalDataset.length}\n`;
    const finalContent = `${header}const rawData = ${JSON.stringify(finalDataset, null, 2)};\n`;

    fs.writeFileSync(OUTPUT_DATA, finalContent, 'utf8');
    console.log(`✅ ¡Éxito! Dataset maestro generado en MVP/data.js`);
}

main();
