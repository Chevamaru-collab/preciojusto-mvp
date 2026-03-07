/**
 * config.js — Configuración central scrapers PrecioJusto
 * 15 categorías canasta INEI × 4 supermercados
 */

module.exports = {

  // ─── 15 Categorías Canasta INEI ───────────────────────────────────────────
  categorias: [
    { id: 'arroz', query: 'arroz', minItems: 20, unidad: 'kg' },
    { id: 'aceite', query: 'aceite vegetal', minItems: 20, unidad: 'lt' },
    { id: 'azucar', query: 'azucar', minItems: 15, unidad: 'kg' },
    { id: 'harina', query: 'harina', minItems: 15, unidad: 'kg' },
    { id: 'fideos', query: 'fideos pasta', minItems: 20, unidad: 'kg' },
    { id: 'pan', query: 'pan molde', minItems: 15, unidad: 'u' },
    { id: 'leche', query: 'leche', minItems: 20, unidad: 'lt' },
    { id: 'huevos', query: 'huevos', minItems: 10, unidad: 'u' },
    { id: 'pollo', query: 'pollo', minItems: 15, unidad: 'kg' },
    { id: 'carne', query: 'carne res', minItems: 15, unidad: 'kg' },
    { id: 'pescado', query: 'pescado', minItems: 15, unidad: 'kg' },
    { id: 'menestras', query: 'menestras lentejas', minItems: 15, unidad: 'kg' },
    { id: 'verduras', query: 'verduras vegetales', minItems: 15, unidad: 'kg' },
    { id: 'frutas', query: 'frutas manzana', minItems: 15, unidad: 'kg' },
    { id: 'condimentos', query: 'sal pimienta condimentos', minItems: 10, unidad: 'u' }
  ],

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
      color: '#f5a623'
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
