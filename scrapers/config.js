/**
 * config.js — Configuración central scrapers PrecioJusto
 * 15 categorías canasta INEI × 4 supermercados
 */

module.exports = {

  // ─── 15 Categorías Canasta INEI ───────────────────────────────────────────
  categorias: [
    { id: 'arroz', query: 'arroz', minItems: 20, unidad: 'kg' },
    { id: 'aceite', query: 'aceite vegetal', minItems: 20, unidad: 'lt' },
    { id: 'azucar-blanca', query: 'azucar blanca', minItems: 15, unidad: 'kg' },
    { id: 'azucar-rubia', query: 'azucar rubia', minItems: 15, unidad: 'kg' },
    { id: 'harina', query: 'harina', minItems: 15, unidad: 'kg' },
    { id: 'avena', query: 'avena', minItems: 15, unidad: 'kg' },
    { id: 'fideos', query: 'fideos pasta', minItems: 20, unidad: 'kg' },
    { id: 'pollo', query: 'pollo', minItems: 15, unidad: 'kg' },
    { id: 'huevos', query: 'huevos', minItems: 10, unidad: 'u' },
    { id: 'leche-evaporada', query: 'leche evaporada', minItems: 20, unidad: 'lt' },
    { id: 'leche-fresca', query: 'leche fresca', minItems: 20, unidad: 'lt' },
    { id: 'mantequilla', query: 'mantequilla', minItems: 15, unidad: 'kg' },
    { id: 'lentejas', query: 'lentejas', minItems: 15, unidad: 'kg' },
    { id: 'frijol-canario', query: 'frijol canario', minItems: 15, unidad: 'kg' },
    { id: 'pan-molde', query: 'pan molde', minItems: 15, unidad: 'u' }
  ],

  relevanceKeywords: {
    'arroz': ['arroz'],
    'aceite': ['aceite', 'oil'],
    'azucar-blanca': ['azúcar blanca', 'azucar blanca', 'blanca'],
    'azucar-rubia': ['azúcar rubia', 'azucar rubia', 'rubia'],
    'harina': ['harina'],
    'avena': ['avena', 'hojuelas'],
    'fideos': ['fideos', 'pasta', 'spaghetti', 'tallarín', 'tallarin', 'macarron'],
    'pollo': ['pollo', 'chicken', 'pecho de'],
    'huevos': ['huevo', 'egg'],
    'leche-evaporada': ['evaporada'],
    'leche-fresca': ['fresca', 'uht', 'entera'],
    'mantequilla': ['mantequilla', 'butter'],
    'lentejas': ['lenteja'],
    'frijol-canario': ['frejol canario', 'frijol canario', 'canario'],
    'pan-molde': ['pan molde', 'pan de molde', 'sandwich']
  },
  
  globalExcludeKeywords: [
    'ricocan', 'ricocat', 'supercat', 'mimaskot', 'dog-chow', 'cat-chow',
    'perro', 'gato', 'mascota', 'canina', 'felina', 'cachorro', 'gatito',
    'mouse pad', 'juguete', 'tv', 'celular', 'colchon', 'colchón', 'libreria',
    'adorno', 'decorativo', 'regalo',
    'shampoo', 'detergente', 'ventilador', 'jabon', 'jabón', 'mascarilla',
    'crema', 'acondicionador', 'suavizante', 'lavadora', 'insecticida'
  ],

  excludeKeywords: {
    'arroz': ['yogurt', 'sazonador', 'leche', 'galleta', 'alimento para', 'deli arroz', 'vinagre', 'lunch', 'molde'],
    'aceite': ['aceitera', 'motor', 'corporal', 'masaje', 'esencia', 'spray', 'oliva', 'atún', 'atun', 'filete', 'anchoveta', 'campomar', 'pescado', 'lomo', 'lomito', 'grated', 'bonito'],
    'azucar-blanca': ['rubia', 'impalpable', 'coco', 'gaseosa', 'bebida', 'energizante', 'sixpack', 'twopack', 'pack', 'jugo', 'refresco'],
    'azucar-rubia': ['blanca', 'impalpable', 'coco', 'gaseosa', 'bebida', 'energizante', 'sixpack', 'twopack', 'pack', 'jugo', 'refresco'],
    'harina': ['preparada', 'pescado', 'maca', 'sopa'],
    'huevos': ['pascua', 'decorativo', 'adorno', 'chocolate', 'cocedor', 'eléctrico', 'electrico', 'cosmético', 'cosmetico', 'fideos', 'fetuccini', 'tagliatelle', 'pasta', 'tallarin', 'gomita', 'gragea'],
    'leche-evaporada': ['fresca', 'polvo', 'condensada', 'crema', 'bebida', 'formula', 'fórmula', 'mezcla', 'chocolatada'],
    'leche-fresca': ['polvo', 'avena', 'chocolate', 'saborizada', 'soya', 'almendra', 'condensada'],
    'mantequilla': ['margarina', 'mani', 'maní', 'galleta', 'galletas', 'canchita'],
    'lentejas': ['pascua', 'chocolate', 'grageas', 'caramelo', 'gomita', 'sopa', 'hamburguesa'],
    'frijol-canario': ['castilla', 'rojo', 'negro', 'panamito', 'soya', 'pallar', 'palo'],
    'pan-molde': ['paneton', 'panetón', 'bizcocho', 'tostada', 'rallado', 'pita', 'hamburguesa', 'hot dog', 'ciabatta', 'frances'],
    'pollo': ['higado', 'hígado', 'corazon', 'corazón', 'patillas', 'molleja', 'pescuezo', 'patas', 'patita', 'sangrecita', 'jamonada', 'pate', 'paté', 'hot dog', 'chorizo', 'salchicha', 'menudencia', 'hamburguesa', 'nuggets'],
    'carne': ['mondongo', 'higado', 'hígado', 'corazon', 'corazón', 'panceta', 'hueso', 'patas', 'orejas', 'rabo', 'chicharron', 'chicharrón', 'chorizo', 'salchicha', 'hamburguesa', 'albóndiga'],
    'pescado': ['mondongo', 'patas', 'corazon', 'molleja', 'anillos', 'mariscos', 'mixtura', 'langostino'],
    'fideos': ['sopa', 'instantanea', 'instantánea', 'aji-no-men', 'ramen', 'sazonador'],
    'frijol-canario': ['castilla', 'rojo', 'negro', 'panamito', 'soya', 'pallar', 'palo'],
    'avena': ['bebida', 'refresco', 'galleta']
  },


  // ─── Supermercados ────────────────────────────────────────────────────────
  supermercados: {
    wong: {
      id: 'wong',
      nombre: 'Wong',
      baseUrl: 'https://www.wong.pe',
      // VTEX: /search?q= solo da 3 resultados sin sesión.
      // URL categoría directa (/arroz) funciona con 160 productos sin sesión.
      // Para búsquedas generales usar ?_q=&map=ft con término de categoría.
      searchUrl: 'https://www.wong.pe/',
      color: '#f5a623',
      activo: true
    },
    metro: {
      id: 'metro',
      nombre: 'Metro',
      baseUrl: 'https://www.metro.pe',
      searchUrl: 'https://www.metro.pe/search?q=',
      color: '#e84040',
      activo: true
    },
    plazavea: {
      id: 'plazavea',
      nombre: 'Plaza Vea',
      baseUrl: 'https://www.plazavea.com.pe',
      // FIX: /search?q= cargaba promociones destacadas (refrigeradoras, celulares).
      // /busca?ft= es el endpoint VTEX correcto → 68 productos de arroz confirmados.
      searchUrl: 'https://www.plazavea.com.pe/search/?_query=',
      color: '#00a651',
      activo: true
    },
    tottus: {
      id: 'tottus',
      nombre: 'Tottus',
      baseUrl: 'https://www.tottus.com.pe',
      searchUrl: 'https://www.tottus.com.pe/tottus-pe/search?q=',
      color: '#0066cc',
      activo: true
    }
  },

  // ─── Puppeteer ────────────────────────────────────────────────────────────
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    defaultViewport: { width: 1920, height: 1080 },
    timeout: 30000
  },

  // ─── Delays (ms) ─────────────────────────────────────────────────────────
  delays: {
    betweenRequests: 2000,
    betweenCategories: 5000,
    betweenSupers: 12000,
    scrollDelay: 1000,
    pageLoad: 3000
  },

  // ─── User Agents (rotados) ────────────────────────────────────────────────
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
  ]
};
