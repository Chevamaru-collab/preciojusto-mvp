const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('master'));

const results = {};
files.forEach(file => {
  const parts = file.replace('.json', '').split('-');
  const superName = parts[0];
  const cat = parts.slice(1).join('-');
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  
  if (!results[cat]) {
      results[cat] = { metro: 0, wong: 0, plazavea: 0, tottus: 0 };
  }
  
  results[cat][superName] = items.length;
});

// Calculate Totals per Supermarket
const totals = { metro: 0, wong: 0, plazavea: 0, tottus: 0 };

console.log('| Categoría | Metro | Wong | Plaza Vea | Tottus | Total |');
console.log('|---|---|---|---|---|---|');

const sortedCats = Object.keys(results).sort();

for (const cat of sortedCats) {
  const c = results[cat];
  const catTotal = c.metro + c.wong + c.plazavea + c.tottus;
  
  totals.metro += c.metro;
  totals.wong += c.wong;
  totals.plazavea += c.plazavea;
  totals.tottus += c.tottus;
  
  console.log(`| ${cat} | ${c.metro} | ${c.wong} | ${c.plazavea} | ${c.tottus} | ${catTotal} |`);
}

console.log('|---|---|---|---|---|---|');
console.log(`| **TOTALES** | **${totals.metro}** | **${totals.wong}** | **${totals.plazavea}** | **${totals.tottus}** | **${totals.metro + totals.wong + totals.plazavea + totals.tottus}** |`);
