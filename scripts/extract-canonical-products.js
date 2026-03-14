const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../datasets/BD-Insumos.csv");
const outputPath = path.join(__dirname, "../ontology/canonical_products.json");

const csv = fs.readFileSync(inputPath, "utf8").split("\n");

const headers = csv[0].split(",");
const rows = csv.slice(1);

const canonical = {};

rows.forEach(row => {

  const cols = row.split(",");

  if (cols.length < 5) return;

  const rubro = cols[0]?.trim();
  const subrubro = cols[1]?.trim();
  const categoria = cols[2]?.trim();
  const subcategoria = cols[3]?.trim();
  const item = cols[4]?.trim();
  const um = cols[5]?.trim();

  if (!item) return;

  // SOLO INSUMOS ALIMENTARIOS
  if (subcategoria !== "Insumos") return;

  const key = item.toLowerCase();

  if (!canonical[key]) {
    canonical[key] = {
      canonical_name: item,
      rubro,
      category: categoria,
      subcategory: subcategoria,
      unit: um
    };
  }

});

const result = Object.values(canonical);

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log("Canonical food products generated:", result.length);