const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data.js');
const jsContent = fs.readFileSync(dataFile, 'utf8');

// data.js has "const rawData = [ ... ];"
// To evaluate it safely without module.exports
const jsonMatch = jsContent.match(/\[[\s\S]*\]/);
const rawData = JSON.parse(jsonMatch[0]);

console.log(`1. Total records: ${rawData.length}`);

const supers = [...new Set(rawData.map(p => p.super))];
console.log(`2. Supermarkets present:`);
console.log(supers);

const cats = [...new Set(rawData.map(p => p.categoria))];
console.log(`3. Categories present:`);
console.log(cats);
