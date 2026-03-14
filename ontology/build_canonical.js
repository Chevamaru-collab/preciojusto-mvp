/**
 * Canonical Product Builder for PrecioJusto v1
 * Reconstructs canonical product catalog from BD-Insumos.csv
 * 
 * Run: node ontology/build_canonical.js
 * Test: node ontology/canonical_products_tests.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// KNOWN BRANDS LIST
// ============================================
const KNOWN_BRANDS = [
  'ARO', 'BELLS', 'PRIMOR', 'COCINERO', 'NICOLINI', 'DELEI', 'TRIA',
  'CIL', 'SAO', 'FRIOL', 'MIRASOL', 'COSTEÑO', 'METRO', 'WONG',
  'TOTTUS', 'MAKRO', 'GLORIA', 'LAIVE', 'NESTLE', 'BONLE', 'BAZO VELARDE',
  'LA MESA', 'ANCHOR', 'PURA VIDA', 'NEGRITA', 'FLEISCHMAN', 'FLEISCHMANN',
  'NEGUSA', 'DULFINA', 'FRATELLO', 'PARAMONGA', 'CASA GRANDE', 'SAN JACINTO',
  'CARTAVIO', 'MAXIMA', 'GRANEL', 'SELLO DE ORO', 'LA DANESA', 'PRIMAVERA',
  'SWISS', 'DANLAC', 'BLANCA FLOR', 'MOLITALIA', 'FAVORITA', 'GRANO DE ORO',
  'LA CALERA', 'DI PERUGIA', 'SELVA ALTA', 'MONTE PALOMO', 'WINTERS', 'WINTER',
  'ROMEX', 'BADIA', 'KARIÑO', 'UNIVERSAL', 'SAN JORGE', 'FIELD',
  'OREO', 'AMBROSOLI', 'M&M', 'TROLLI', 'NESTLE', 'SPITZE',
  'ROCOPLAST', 'PAMELA', 'PAMOLSA', 'HIKARO', 'MONICA',
  'EL FRUTERO', 'LA FLORENCIA', 'SIEMBRA', 'FRESCOPE', 'VAKIMU',
  'ALACENA', 'PHILADELPHIA', 'DELICE', 'MAYERLI', 'GOOLBITT',
  'CORDILLERA', 'JOF SAC', 'JOFSAC', 'STAR CHEMICAL',
  'DON MAMINO', 'GRUPO ONCE', 'CARMELITAS', 'BIMBO',
  'HUERTOS DEL EDEN', 'LA REYNA', 'BARCIDDA', 'PENNANT',
  'EMSAL', 'TNZ', 'BRAEDT', 'BREADT', 'BRAED', 'CASA EUROPA', 'SUIZA',
  'RASIL', 'LINCE', 'D\'ROBLES', 'VILLA NATURA',
  'RAMA', 'FAMOSA', 'TROPICAL', 'FRATELO',
  '3 OSITOS', 'GRANO DE ORO', 'SANTA CATALINA',
  'SAN LUIS', 'ARICA', 'C & Co.', 'COUSINE & CO.',
  'MAURIPAN', 'PASTINDUSTRIA', 'MAREGUTHIS',
  'HUERTO ALAMEIN', 'VENTURO',
  'LA P\'TITE FRANCE'
];

// ============================================
// GENERIC / ADJECTIVE-ONLY NAMES
// ============================================
const GENERIC_NAMES = [
  'polvo', 'vegetal', 'blanca', 'blanco', 'grande', 'regular',
  'entero', 'entera', 'roja', 'rojo', 'negra', 'negro',
  'salada', 'salado', 'seca', 'seco', 'dulce',
  'varios', 'varias', 'extra', 'mini', 'especial',
  'crema', 'gel', 'nacarado', 'griego', 'italiano',
  'fuerte', 'cremosita', 'picado',
  // Qualifier-only categorías that need sub_rubro context
  'preparada', 'spreparar', 'industrial',
  'pardos', 'rosados', 'corral', 'codorniz',
  'rubia', 'finita', 'chancaca',
  'condensada', 'evaporada', 'polvo',
  'bitter', 'leche', 'instantaneo',
  'quimico'
];

// Non-product item patterns (expenses, adjustments, etc.)
const NON_PRODUCT_PATTERNS = [
  /^gastos?\s+varios/i,
  /^ajuste/i,
  /^descuento/i,
  /^comisi[oó]n/i,
  /^servicio\s+de/i,
  /^gasto\s+/i,
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Split a Sub Categoría that may contain mixed text+presentation.
 * E.g., "Vegetal x 5Lt" → { subcategoria: "Vegetal", presentation: "5", unit: "Lt" }
 */
function splitSubcategoria(raw) {
  if (!raw || !raw.trim()) {
    return { subcategoria: '', presentation: '', unit: '' };
  }

  const s = raw.trim();

  // Pattern: "Text x <number><unit>" e.g. "Vegetal x 5Lt", "Vegetal x 0.9Lt"
  const mixedPattern = /^(.+?)\s*x\s*(\d+\.?\d*)\s*([A-Za-z]+)\.?$/;
  let m = s.match(mixedPattern);
  if (m) {
    return {
      subcategoria: m[1].trim(),
      presentation: m[2],
      unit: m[3].replace(/\.$/, '')
    };
  }

  // Pattern: pure "<number><unit>" e.g. "5Kg", "946 Ml", "200 gr", "1 Kg"
  const pureQtyPattern = /^(\d+\.?\d*)\s*([A-Za-z]+)\.?$/;
  m = s.match(pureQtyPattern);
  if (m) {
    return {
      subcategoria: '',
      presentation: m[1],
      unit: m[2].replace(/\.$/, '')
    };
  }

  // Pattern: "<number> <unit>" with possible trailing text like "50 kg."
  const qtyUnitPattern = /^(\d+\.?\d*)\s+(kg|gr|g|lt|ml|und|cm3)\.?$/i;
  m = s.match(qtyUnitPattern);
  if (m) {
    return {
      subcategoria: '',
      presentation: m[1],
      unit: m[2].replace(/\.$/, '')
    };
  }

  // No split needed - return as subcategoria only
  return { subcategoria: s, presentation: '', unit: '' };
}

/**
 * Check if a name is too generic to stand alone as a canonical_name.
 */
function isGenericName(name) {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  // Single-word generic
  if (GENERIC_NAMES.includes(trimmed)) return true;
  // Check if it's a single word that's an adjective
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && GENERIC_NAMES.includes(words[0])) return true;
  return false;
}

/**
 * Detect brand from Item text and/or Marca field.
 * Returns the detected brand string or ''.
 */
function detectBrand(item, marca) {
  // If Marca field has a value, use it directly
  if (marca && marca.trim()) {
    const m = marca.trim();
    // Check if it's in our known brands list (case-insensitive)
    for (const brand of KNOWN_BRANDS) {
      if (m.toUpperCase() === brand.toUpperCase()) return brand;
    }
    // Even if not in list, return if it looks like a proper noun
    return m;
  }

  // Try to detect brand from Item text
  if (!item) return '';
  const itemUpper = item.toUpperCase();
  for (const brand of KNOWN_BRANDS) {
    // Check if brand appears as a distinct word in the item name
    const regex = new RegExp('\\b' + escapeRegex(brand) + '\\b', 'i');
    if (regex.test(item)) {
      return brand;
    }
  }

  return '';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract useful context from an Item name for enrichment.
 * Tries to get the product noun + qualifier from the Item.
 */
function extractProductContext(item) {
  if (!item) return '';
  // Remove brand names
  let cleaned = item;
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp('\\b' + escapeRegex(brand) + '\\b', 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  // Remove quantity patterns like "x 5 Lt.", "x 1 kg.", "x 500gr"
  cleaned = cleaned.replace(/\s*x\s*[\d.]+\s*[A-Za-z]*\.?\s*/gi, ' ');
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]+$/, '');
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Build canonical_name from structured fields.
 * Falls back to item_original for enrichment when fields are insufficient.
 */
function buildCanonicalName(fields) {
  const { categoria, subcategoria, presentation, unit, item, sub_rubro } = fields;

  let splitResult = splitSubcategoria(subcategoria || '');
  let subcat = splitResult.subcategoria;
  let pres = presentation || splitResult.presentation;
  let u = unit || splitResult.unit;

  // Try to build name from structured fields
  let nameParts = [];

  // Is subcategoria generic by itself?
  const subcatIsGeneric = isGenericName(subcat);
  const catIsGeneric = isGenericName(categoria);

  if (categoria && !catIsGeneric) {
    nameParts.push(categoria);
    if (subcat && !subcatIsGeneric) {
      nameParts.push(subcat);
    } else if (subcat && subcatIsGeneric) {
      nameParts.push(subcat);
    }
  } else if (categoria && catIsGeneric) {
    // categoria is generic - need context from sub_rubro or item
    // Try sub_rubro first
    if (sub_rubro && !isGenericName(sub_rubro)) {
      nameParts.push(sub_rubro);
      nameParts.push(categoria);
    } else if (item) {
      // Extract from item
      const context = extractProductContext(item);
      if (context) {
        // Parse first meaningful words from context
        const contextWords = context.split(/\s+/);
        // Find where the generic word appears in context
        const genIdx = contextWords.findIndex(w =>
          GENERIC_NAMES.includes(w.toLowerCase())
        );
        if (genIdx > 0) {
          // Include words before the generic word + the generic word
          nameParts.push(contextWords.slice(0, genIdx + 1).join(' '));
        } else {
          nameParts.push(context);
        }
      } else {
        nameParts.push(categoria);
      }
    } else {
      nameParts.push(categoria);
    }
  } else if (subcat && !subcatIsGeneric) {
    nameParts.push(subcat);
  } else if (item) {
    // No categoria or subcategoria, use item context
    const context = extractProductContext(item);
    if (context) nameParts.push(context);
  }

  // If subcategoria is generic and we already have a base noun, add it
  if (subcatIsGeneric && subcat && nameParts.length > 0) {
    const lastName = nameParts[nameParts.length - 1].toLowerCase();
    if (!lastName.includes(subcat.toLowerCase())) {
      // Check if the enriched context from item already includes the qualifier
      // e.g., "Canela en Polvo" already has "Polvo"
      const fullName = nameParts.join(' ').toLowerCase();
      if (!fullName.includes(subcat.toLowerCase())) {
        nameParts.push(subcat);
      }
    }
  }

  // Special case: when categoria is generic (like "Blanca" for Azucar)
  // and sub_rubro gives the noun
  if (nameParts.length > 0 && catIsGeneric && sub_rubro && !isGenericName(sub_rubro)) {
    // Check if sub_rubro is in the name already
    const fullName = nameParts.join(' ').toLowerCase();
    if (!fullName.includes(sub_rubro.toLowerCase())) {
      nameParts.unshift(sub_rubro);
    }
  }

  // Special handling: if Categoria is 'Especias', extract the specific spice from Item
  if (item && nameParts.length > 0) {
    const candidateName = nameParts.join(' ');
    if (candidateName.toLowerCase().includes('especias')) {
      // Try to find the actual spice name from the item
      const spicePatterns = [
        { regex: /canela/i, name: 'Canela' },
        { regex: /jengibre/i, name: 'Jengibre' },
        { regex: /clavo/i, name: 'Clavo de Olor' },
        { regex: /vainilla/i, name: 'Vainilla' },
        { regex: /sal\b/i, name: 'Sal' },
      ];
      for (const sp of spicePatterns) {
        if (sp.regex.test(item)) {
          let spiceName;
          // If subcat already contains the spice name (e.g., "Jengibre en Polvo"), use it directly
          if (subcat && subcat.toLowerCase().includes(sp.name.toLowerCase())) {
            spiceName = subcat;
          } else {
            spiceName = sp.name;
            if (subcat && subcat.toLowerCase() !== sp.name.toLowerCase()) {
              if (subcat.toLowerCase() === 'polvo') spiceName += ' en Polvo';
              else if (subcat.toLowerCase() === 'raja') spiceName += ' en Raja';
              else if (subcat.toLowerCase().includes('escencia') || subcat.toLowerCase().includes('vainilla')) spiceName += ' ' + subcat;
              else spiceName += ' ' + subcat;
            }
          }
          return titleCase(spiceName) + (pres ? ' ' + pres : '') + (u ? ' ' + u : '');
        }
      }
    }
    // If Categoria is 'Envasado' (generic for fruits), try to get the fruit name from Item
    if (candidateName.toLowerCase().startsWith('envasado') && item) {
      const context = extractProductContext(item);
      if (context && !isGenericName(context)) {
        return titleCase(context) + (pres ? ' ' + pres : '') + (u ? ' ' + u : '');
      }
    }
  }

  // If nameParts are still generic, try harder with item
  let joined = nameParts.join(' ');
  if (isGenericName(joined) && item) {
    const context = extractProductContext(item);
    if (context && !isGenericName(context)) {
      joined = context;
    }
  }

  // Remove any brand names that crept into the name
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp('\\b' + escapeRegex(brand) + '\\b', 'gi');
    joined = joined.replace(regex, '');
  }
  joined = joined.replace(/\s+/g, ' ').trim();

  // Add presentation and unit
  if (pres) joined += ' ' + pres;
  if (u) joined += ' ' + u;

  return titleCase(joined.trim());
}

function titleCase(str) {
  if (!str) return '';
  // Capitalize first letter of each word, preserve some words lowercase
  const lower = ['de', 'del', 'en', 'x', 'y', 'al', 'la', 'las', 'los', 'el', 'con', 'sin', 'para', 'por'];
  return str.split(/\s+/).map((word, i) => {
    if (i > 0 && lower.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    if (word.length === 0) return word;
    // Preserve all-caps abbreviations (KG, LT, UND, etc.)
    if (/^[A-Z]{2,}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Full product reconstruction from raw row data.
 */
function reconstructProduct(row) {
  const {
    item = '', rubro = '', sub_rubro = '', categoria = '',
    subcategoria = '', cantidad = '', um = '', marca = ''
  } = row;

  // Detect brand
  const brand_detected = detectBrand(item, marca);

  // Split subcategoria
  const split = splitSubcategoria(subcategoria);
  let finalSubcategoria = split.subcategoria || '';
  const finalPresentation = cantidad || split.presentation || '';
  const finalUnit = um || split.unit || '';

  // Deduplicate: if categoria and subcategoria are identical, clear subcategoria
  if (categoria && finalSubcategoria && categoria.toLowerCase() === finalSubcategoria.toLowerCase()) {
    finalSubcategoria = '';
  }

  // Check if this is a non-product entry
  let needs_review = false;
  let review_reason = '';

  const isNonProduct = NON_PRODUCT_PATTERNS.some(p => p.test(item));
  if (isNonProduct) {
    needs_review = true;
    review_reason = 'Non-product entry (expense, adjustment, or generic)';
  }

  // Check if we have enough data to build a name
  if (!item && !categoria && !subcategoria) {
    needs_review = true;
    review_reason = 'Empty or insufficient data for reconstruction';
  }

  // Build canonical name
  const canonical_name = buildCanonicalName({
    categoria, subcategoria,
    presentation: finalPresentation,
    unit: finalUnit,
    item, sub_rubro
  });

  // Final validation
  if (!canonical_name || canonical_name.trim().length < 3) {
    needs_review = true;
    review_reason = review_reason || 'Canonical name too short or empty after reconstruction';
  }

  if (!needs_review && isGenericName(canonical_name.replace(/\s*\d+.*$/, ''))) {
    needs_review = true;
    review_reason = 'Canonical name still generic after reconstruction';
  }

  return {
    canonical_name: canonical_name || '',
    sub_rubro: sub_rubro || '',
    categoria: categoria || '',
    subcategoria: finalSubcategoria,
    presentation: finalPresentation,
    unit: finalUnit,
    item_original: item,
    brand_detected: brand_detected || '',
    needs_review,
    review_reason
  };
}

// ============================================
// CSV PARSING
// ============================================

/**
 * Parse a CSV line handling quoted fields.
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ============================================
// MAIN EXECUTION
// ============================================

function main() {
  const csvPath = path.join(__dirname, '..', 'datasets', 'BD-Insumos.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log('📊 CSV Header:', header.slice(0, 12).join(' | '));

  // Column indices
  const colMap = {
    item: header.indexOf('Items'),
    precio: header.indexOf('Precio'),
    proveedor: header.indexOf('Proveedor'),
    rubro: header.indexOf('Rubro'),
    sub_rubro: header.indexOf('Sub Rubro'),
    categoria: header.indexOf('Categoria'),
    subcategoria: header.indexOf('Sub Categoria'),
    cantidad: header.indexOf('Cantidad'),
    um: header.indexOf('UM'),
    clase: header.indexOf('Clase'),
    marca: header.indexOf('Marca'),
  };

  console.log('📋 Column mapping:', JSON.stringify(colMap, null, 2));

  // Process rows
  const allProducts = [];
  const reviewProducts = [];
  let totalRows = 0;
  let filteredOut = 0;
  let emptyRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { emptyRows++; continue; }

    const cols = parseCSVLine(line);
    const rubro = (cols[colMap.rubro] || '').trim();
    const item = (cols[colMap.item] || '').trim();

    // Skip empty rows
    if (!item && !rubro) { emptyRows++; continue; }

    totalRows++;

    // Filter: only Insumos domain for PrecioJusto v1
    if (rubro !== 'Insumos') {
      filteredOut++;
      continue;
    }

    const row = {
      item,
      rubro,
      sub_rubro: (cols[colMap.sub_rubro] || '').trim(),
      categoria: (cols[colMap.categoria] || '').trim(),
      subcategoria: (cols[colMap.subcategoria] || '').trim(),
      cantidad: (cols[colMap.cantidad] || '').trim(),
      um: (cols[colMap.um] || '').trim(),
      marca: (cols[colMap.marca] || '').trim(),
    };

    const product = reconstructProduct(row);

    if (product.needs_review) {
      reviewProducts.push(product);
    } else {
      allProducts.push(product);
    }
  }

  // Deduplicate by canonical_name (keep first occurrence per unique name)
  const seen = new Map();
  const deduped = [];
  for (const p of allProducts) {
    const key = p.canonical_name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, p);
      deduped.push(p);
    }
  }

  // ---- Output files ----

  // 1. canonical_products_final.json
  const finalPath = path.join(__dirname, 'canonical_products_final.json');
  fs.writeFileSync(finalPath, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`\n✅ canonical_products_final.json: ${deduped.length} products`);

  // 2. canonical_products_review.csv
  const reviewPath = path.join(__dirname, 'canonical_products_review.csv');
  const csvHeader = 'canonical_name,sub_rubro,categoria,subcategoria,presentation,unit,item_original,brand_detected,needs_review,review_reason';
  const csvRows = reviewProducts.map(p =>
    [p.canonical_name, p.sub_rubro, p.categoria, p.subcategoria,
     p.presentation, p.unit, `"${(p.item_original || '').replace(/"/g, '""')}"`,
     p.brand_detected, p.needs_review, `"${p.review_reason}"`
    ].join(',')
  );
  fs.writeFileSync(reviewPath, [csvHeader, ...csvRows].join('\n'), 'utf-8');
  console.log(`✅ canonical_products_review.csv: ${reviewProducts.length} rows`);

  // 3. canonical_products_tests.json (export test cases)
  const testCases = generateTestCasesJSON();
  const testsPath = path.join(__dirname, 'canonical_products_tests.json');
  fs.writeFileSync(testsPath, JSON.stringify(testCases, null, 2), 'utf-8');
  console.log(`✅ canonical_products_tests.json: ${testCases.length} test cases`);

  // 4. canonical_products_summary.md
  const ambiguityPatterns = {};
  reviewProducts.forEach(p => {
    const reason = p.review_reason || 'Unknown';
    ambiguityPatterns[reason] = (ambiguityPatterns[reason] || 0) + 1;
  });

  const summary = `# Canonical Products Reconstruction Summary

**Generated**: ${new Date().toISOString()}
**Source**: BD-Insumos.csv

## Metrics

| Metric | Count |
|--------|-------|
| Total rows in CSV | ${totalRows + emptyRows} |
| Non-empty rows | ${totalRows} |
| Filtered out (non-Insumos) | ${filteredOut} |
| Insumos rows processed | ${totalRows - filteredOut} |
| Canonical products (high-confidence) | ${deduped.length} |
| Duplicates removed | ${allProducts.length - deduped.length} |
| Rows sent to review | ${reviewProducts.length} |

## Ambiguity Patterns

${Object.entries(ambiguityPatterns).map(([reason, count]) =>
  `- **${reason}**: ${count} rows`
).join('\n')}

## Sub-Rubro Distribution (Final Products)

${(() => {
  const dist = {};
  deduped.forEach(p => { dist[p.sub_rubro || '(empty)'] = (dist[p.sub_rubro || '(empty)'] || 0) + 1; });
  return Object.entries(dist).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- **${k}**: ${v} products`).join('\n');
})()}
`;

  const summaryPath = path.join(__dirname, 'canonical_products_summary.md');
  fs.writeFileSync(summaryPath, summary, 'utf-8');
  console.log(`✅ canonical_products_summary.md generated`);

  console.log('\n📊 Summary:');
  console.log(`  Total rows: ${totalRows}`);
  console.log(`  Filtered out: ${filteredOut}`);
  console.log(`  Insumos processed: ${totalRows - filteredOut}`);
  console.log(`  High-confidence: ${deduped.length}`);
  console.log(`  Needs review: ${reviewProducts.length}`);
}

function generateTestCasesJSON() {
  return [
    {
      category: 'A. Complete Semantic Reconstruction',
      tests: [
        {
          input: { categoria: 'Especias', subcategoria: 'Polvo', presentation: '1', unit: 'KG', item: 'Canela en Polvo x Kg' },
          expected_canonical_name: 'Canela en Polvo 1 KG'
        },
        {
          input: { categoria: 'Aceite', subcategoria: 'Vegetal x 5Lt', cantidad: '5', um: 'LT', item: 'Aceite Bells x 5 Lt.' },
          expected_canonical_name: 'Aceite Vegetal 5 LT'
        },
        {
          input: { categoria: 'Blanca', subcategoria: '5Kg', cantidad: '5', um: 'KG', item: 'Azucar Blanca ARO x 5kg.', sub_rubro: 'Azucar' },
          expected_canonical_name: 'Azucar Blanca 5 KG'
        }
      ]
    },
    {
      category: 'A2. Brand Detection',
      tests: [
        { input: { item: 'Aceite Bells x 5 Lt.', marca: 'BELLS' }, expected_brand: 'BELLS' },
        { input: { item: 'Aceite Vegetal PRIMOR x 1 Galon', marca: '' }, expected_brand: 'PRIMOR' },
        { input: { item: 'Canela en Polvo x Kg', marca: '' }, expected_brand: '' }
      ]
    },
    {
      category: 'B. Split Mixed Subcategory',
      tests: [
        { input: 'Vegetal x 5Lt', expected: { subcategoria: 'Vegetal', presentation: '5', unit: 'Lt' } },
        { input: '1 Kg', expected: { subcategoria: '', presentation: '1', unit: 'Kg' } },
        { input: '#8 - Blanco', expected: { subcategoria: '#8 - Blanco', presentation: '', unit: '' } }
      ]
    },
    {
      category: 'C. Avoid Generic Output',
      tests: [
        { name: 'Polvo', is_generic: true },
        { name: 'Blanca', is_generic: true },
        { name: 'Canela en Polvo', is_generic: false }
      ]
    },
    {
      category: 'D. Remove Commercial Noise',
      tests: [
        {
          input: { item: 'Aceite Bells x 5 Lt.', categoria: 'Aceite', subcategoria: 'Vegetal x 5Lt', cantidad: '5', um: 'LT', marca: 'BELLS' },
          expected_canonical_name: 'Aceite Vegetal 5 LT',
          expected_brand_detected: 'BELLS'
        }
      ]
    },
    {
      category: 'E. Flag Ambiguous Cases',
      tests: [
        { input: { item: '', categoria: '', subcategoria: '' }, expected_needs_review: true },
        {
          input: { item: 'Gastos Varios (MA) - Fruta', categoria: 'Varios', subcategoria: '' },
          expected_needs_review: true
        }
      ]
    }
  ];
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    splitSubcategoria,
    buildCanonicalName,
    detectBrand,
    isGenericName,
    reconstructProduct,
    parseCSVLine
  };
}

// Run main only when executed directly
if (require.main === module) {
  main();
}
