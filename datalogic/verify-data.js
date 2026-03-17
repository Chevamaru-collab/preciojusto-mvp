const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'normalized_dataset.json');
const rawData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log(`1. Total records: ${rawData.length}`);

const supers = [...new Set(rawData.map(p => p.supermercado))];
console.log(`2. Supermarkets present:`);
console.log(supers);

const cats = [...new Set(rawData.map(p => p.categoria))];
console.log(`3. Categories present:`);
console.log(cats);