const fs = require('fs');
const path = require('path');
const dataDir = path.join('c:\\dev\\repos\\preciojusto-mvp', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('master'));

const results = {};
files.forEach(file => {
  const parts = file.replace('.json', '').split('-');
  const superName = parts[0];
  const cat = parts.slice(1).join('-');
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  if (!results[cat]) results[cat] = { metro: 0, wong: 0 };
  results[cat][superName] = items.length;
});

console.log('| Categoría | Metro | Wong | Total |');
console.log('|---|---|---|---|');
for (const [cat, counts] of Object.entries(results)) {
  console.log(`| ${cat} | ${counts.metro} | ${counts.wong} | ${counts.metro + counts.wong} |`);
}
