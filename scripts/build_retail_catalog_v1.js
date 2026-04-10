// 60-Outbound/build_retail_catalog_v1.js
// Prototipo de Generación de Catálogo Retail v1.0 (Precio Justo)
// SSOT: 3.3.1 | Normalización NFD Integrada
const fs = require('fs');
const path = require('path');

const RETAIL_ENTRIES_TEMPLATE = [
  { canonical_name: "Arroz Extra 5 kg", aliases: ["Arroz Faraon 5kg", "Arroz Costeño 5kg"], category: "arroz", value: 5.0, unit: "kg", retail_unit: "kg", comparison_group: "arroz-extra-5kg" },
  { canonical_name: "Arroz Superior 5 kg", aliases: ["Arroz Paisana 5kg", "Arroz Tottus 5kg"], category: "arroz", value: 5.0, unit: "kg", retail_unit: "kg", comparison_group: "arroz-sup-5kg" },
  { canonical_name: "Leche Evaporada 400g", aliases: ["Leche Gloria Azul", "Leche Ideal", "Leche Laive"], category: "leche", value: 0.4, unit: "kg", retail_unit: "kg", comparison_group: "leche-evap-400g" },
  { canonical_name: "Leche Sin Lactosa 400g", aliases: ["Leche Gloria Morada", "Leche Laive SL"], category: "leche", value: 0.4, unit: "kg", retail_unit: "kg", comparison_group: "leche-sl-400g" },
  { canonical_name: "Fideo Spaguetti 450g", aliases: ["Spaguetti Molitalia", "Spaguetti Don Vittorio"], category: "fideos", value: 0.45, unit: "kg", retail_unit: "kg", comparison_group: "fideo-spaguetti-450g" },
  { canonical_name: "Fideo Tornillo 450g", aliases: ["Tornillo Nicolini", "Tornillo Lavaggi"], category: "fideos", value: 0.45, unit: "kg", retail_unit: "kg", comparison_group: "fideo-tornillo-450g" },
  { canonical_name: "Pan Molde Blanco 480g", aliases: ["Pan Bimbo Blanco", "Pan Union Blanco"], category: "pan-molde", value: 0.48, unit: "kg", retail_unit: "kg", comparison_group: "pan-blanco-480g" },
  { canonical_name: "Huevos Pardos x 30", aliases: ["Huevo La Calera 30", "Huevo San Fernando 30"], category: "huevos", value: 30, unit: "und", retail_unit: "und", comparison_group: "huevos-30" },
  { canonical_name: "Aceite Vegetal 1 LT", aliases: ["Aceite Primor", "Aceite Cil", "Aceite Tottus"], category: "aceite", value: 1.0, unit: "lt", retail_unit: "lt", comparison_group: "aceite-veg-1lt" },
  { canonical_name: "Pollo Entero con Menudencia", aliases: ["Pollo San Fernando", "Pollo Redondos"], category: "pollo", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "pollo-entero" },
  { canonical_name: "Pechuga de Pollo c/h", aliases: ["Pechuga Especial", "Filete de Pechuga"], category: "pollo", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "pechuga-pollo" },
  { canonical_name: "Frijol Canario 1 kg", aliases: ["Frijol Costeño", "Frijol Paisana"], category: "frijol", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "frijol-canario-1kg" },
  { canonical_name: "Lenteja 1 kg", aliases: ["Lenteja Bebe", "Lenteja Costeño"], category: "lentejas", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "lenteja-1kg" },
  { canonical_name: "Avena en Hojuelas 500g", aliases: ["Avena Quaker", "Avena 3 Ositos"], category: "avena", value: 0.5, unit: "kg", retail_unit: "kg", comparison_group: "avena-500g" },
  { canonical_name: "Mantequilla con Sal 200g", aliases: ["Mantequilla Gloria", "Mantequilla Laive"], category: "mantequilla", value: 0.2, unit: "kg", retail_unit: "kg", comparison_group: "mantequilla-200g" },
  { canonical_name: "Detergente Polvo 1 kg", aliases: ["Detergente Ace", "Detergente Bolivar"], category: "limpieza", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "detergente-1kg" },
  { canonical_name: "Papel Higiénico x 12", aliases: ["Papel Suave", "Papel Elite"], category: "hogar", value: 12, unit: "und", retail_unit: "und", comparison_group: "papel-12" },
  { canonical_name: "Azúcar Rubia 1 kg", aliases: ["Azúcar Dulfina", "Azúcar Paramonga"], category: "azucar", value: 1.0, unit: "kg", retail_unit: "kg", comparison_group: "azucar-rubia-1kg" },
  { canonical_name: "Yogurt Bebible 1 LT", aliases: ["Yogurt Gloria", "Yogurt Laive"], category: "lacteos", value: 1.0, unit: "lt", retail_unit: "lt", comparison_group: "yogurt-1lt" },
  { canonical_name: "Atún en Trozos 170g", aliases: ["Atún Florida", "Atún Real"], category: "conservas", value: 0.17, unit: "kg", retail_unit: "kg", comparison_group: "atun-170g" }
];

function buildCatalog() {
  const outputFilePath = path.join(__dirname, 'PRODUCT-CATALOG-v4-retail.json');
  const catalog = [];
  const ids = new Set();

  RETAIL_ENTRIES_TEMPLATE.forEach(entry => {
    // 1. Validar campos obligatorios
    if (!entry.canonical_name || !entry.unit || entry.value === undefined) {
      console.warn(`[SKIP] Entrada incompleta: ${entry.canonical_name}`);
      return;
    }

    // 2. Generar canonical_id (Normalización NFD para remover tildes y diacríticos)
    const id = entry.canonical_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // 3. Validar duplicados
    if (ids.has(id)) {
      console.error(`[ERROR] ID Duplicado: ${id}`);
      return;
    }

    ids.add(id);
    catalog.push({
      canonical_id: id,
      ...entry
    });
  });

  const finalOutput = {
    metadata: {
      version: "1.0.0",
      ssot_version: "3.3.1",
      last_update: new Date().toISOString(),
      entries_count: catalog.length,
      status: "PROTOTYPE"
    },
    catalog: catalog
  };

  fs.writeFileSync(outputFilePath, JSON.stringify(finalOutput, null, 2));
  console.log(`[SUCCESS] Catalogo Retail generado con ${catalog.length} entradas.`);
  console.log(`[PATH] ${outputFilePath}`);
}

buildCatalog();
