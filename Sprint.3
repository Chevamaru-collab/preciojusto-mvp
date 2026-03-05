PRECIOJUSTO - SPRINT 3: SCRAPERS AUTOMÁTICOS
CONTEXTO PROYECTO
PrecioJusto MVP v2 funcionando con 93 productos hardcoded.
Necesitamos escalar a 200-400 productos reales de 4 supermercados.

Repo: https://github.com/Chevamaru-collab/preciojusto-mvp
Stack actual: Vanilla JS, LocalStorage, GitHub Pages

OBJETIVO SPRINT 3
Crear scrapers Puppeteer para automatizar obtención data precios de:

Wong (wong.pe)
Metro (metro.pe)
Plaza Vea (plazavea.com.pe)
Tottus (tottus.com.pe)
Categorías por scraper: Arroz, Aceite, Azúcar, Harina

ARQUITECTURA SCRAPERS
Estructura archivos
/scrapers
├── config.js (configuración común)
├── scraper-wong.js
├── scraper-metro.js
├── scraper-plazavea.js
├── scraper-tottus.js
├── run-all.js (ejecuta todos)
└── utils.js (funciones compartidas)

/data (output)
├── wong-arroz.json
├── wong-aceite.json
├── metro-arroz.json
├── metro-aceite.json
└── [etc...]

/logs
└── scrape-[fecha].log
CONFIGURACIÓN COMÚN
config.js
module.exports = {
  // Categorías a scrapear
  categorias: [
    { id: 'arroz', query: 'arroz', minItems: 30 },
    { id: 'aceite', query: 'aceite vegetal', minItems: 30 },
    { id: 'azucar', query: 'azúcar', minItems: 20 },
    { id: 'harina', query: 'harina', minItems: 20 }
  ],
  
  // Supermercados
  supermercados: {
    wong: {
      id: 'wong',
      nombre: 'Wong',
      baseUrl: 'https://www.wong.pe',
      searchUrl: 'https://www.wong.pe/search?q=',
      color: '#f5a623'
    },
    metro: {
      id: 'metro',
      nombre: 'Metro',
      baseUrl: 'https://www.metro.pe',
      searchUrl: 'https://www.metro.pe/search?q=',
      color: '#e84040'
    },
    plazavea: {
      id: 'plazavea',
      nombre: 'Plaza Vea',
      baseUrl: 'https://www.plazavea.com.pe',
      searchUrl: 'https://www.plazavea.com.pe/search?q=',
      color: '#00a651'
    },
    tottus: {
      id: 'tottus',
      nombre: 'Tottus',
      baseUrl: 'https://www.tottus.com.pe',
      searchUrl: 'https://www.tottus.com.pe/tottus-pe/search?q=',
      color: '#0066cc'
    }
  },
  
  // Puppeteer config
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    timeout: 30000,
    waitUntil: 'networkidle2'
  },
  
  // Rate limiting
  delays: {
    betweenRequests: 2000, // 2 seg entre requests
    betweenCategories: 5000, // 5 seg entre categorías
    scrollDelay: 1000 // 1 seg scroll
  }
};
UTILIDADES COMPARTIDAS
utils.js
const fs = require('fs');
const path = require('path');

const utils = {
  // Guardar JSON
  saveJSON(filename, data) {
    const filepath = path.join(__dirname, '../data', filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✓ Guardado: ${filename} (${data.length} productos)`);
  },
  
  // Logger
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMsg);
    
    // Guardar en archivo log
    const logFile = path.join(__dirname, '../logs', `scrape-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMsg + '\n');
  },
  
  // Esperar random delay
  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  },
  
  // Limpiar precio
  cleanPrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || null;
  },
  
  // Normalizar nombre producto
  cleanProductName(name) {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.-]/g, '');
  },
  
  // Extraer presentación del nombre
  extractPresentacion(name) {
    // Busca patrones: 1kg, 900ml, 1.8L, etc
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogramo)/i,
      /(\d+(?:\.\d+)?)\s*(?:lt|l|litro)/i,
      /(\d+)\s*(?:ml|mililitro)/i,
      /(\d+)\s*(?:gr|g|gramo)/i,
      /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(?:kg|lt|ml|g)/i // Twopack
    ];
    
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        if (match[2]) { // Twopack
          return { value: match[1], unit: match[0].split(/x|×/)[1].match(/kg|lt|ml|g/i)[0], pack: 2 };
        }
        return { value: match[1], unit: match[0].match(/kg|lt|ml|g/i)[0], pack: 1 };
      }
    }
    return null;
  },
  
  // Generar ID único producto
  generateProductId(super_id, nombre) {
    const clean = nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hash = clean.substring(0, 20);
    return `${super_id}_${hash}_${Date.now()}`;
  }
};

module.exports = utils;
SCRAPER WONG
scraper-wong.js
Selectores específicos Wong:

const SELECTORS = {
  productCard: '.product-card, .shelf-product',
  productName: '.product-name, h3, .product-title',
  priceOnline: '.price-online, .offer-price, .sale-price',
  priceRegular: '.price-regular, .old-price, .was-price',
  productLink: 'a.product-link, a[href*="/p/"]',
  loadMoreBtn: '.load-more, .show-more',
  noResults: '.no-results, .empty-state'
};
Implementación:

const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

class WongScraper {
  constructor() {
    this.superId = 'wong';
    this.baseUrl = config.supermercados.wong.searchUrl;
    this.browser = null;
    this.page = null;
  }
  
  async init() {
    utils.log('Inicializando Wong scraper...', 'info');
    this.browser = await puppeteer.launch(config.puppeteer);
    this.page = await this.browser.newPage();
    
    // User agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
  }
  
  async scrapeCategory(categoria) {
    utils.log(`Wong: Scraping ${categoria.id}...`, 'info');
    
    const url = this.baseUrl + encodeURIComponent(categoria.query);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar productos carguen
    await this.page.waitForSelector(SELECTORS.productCard, { timeout: 10000 }).catch(() => {
      utils.log(`Wong: No productos encontrados para ${categoria.id}`, 'warn');
      return [];
    });
    
    // Scroll para lazy loading
    await this.autoScroll();
    
    // Extraer productos
    const productos = await this.page.evaluate((selectors, superId, categoriaId) => {
      const cards = Array.from(document.querySelectorAll(selectors.productCard));
      
      return cards.map(card => {
        try {
          const nombre = card.querySelector(selectors.productName)?.innerText?.trim() || '';
          const precioOnlineEl = card.querySelector(selectors.priceOnline);
          const precioRegularEl = card.querySelector(selectors.priceRegular);
          
          if (!nombre || !precioOnlineEl) return null;
          
          return {
            nombre: nombre,
            precioOnline: precioOnlineEl.innerText.trim(),
            precioRegular: precioRegularEl?.innerText?.trim() || null,
            super: superId,
            categoria: categoriaId,
            scraped: new Date().toISOString()
          };
        } catch (e) {
          return null;
        }
      }).filter(p => p !== null);
    }, SELECTORS, this.superId, categoria.id);
    
    // Limpiar y normalizar
    const cleaned = productos
      .map(p => this.normalizeProduct(p))
      .filter(p => p !== null)
      .slice(0, categoria.minItems * 2); // 2x por si algunos se filtran después
    
    utils.log(`Wong: Encontrados ${cleaned.length} productos de ${categoria.id}`, 'info');
    
    return cleaned;
  }
  
  normalizeProduct(producto) {
    try {
      const precioOnline = utils.cleanPrice(producto.precioOnline);
      const precioRegular = utils.cleanPrice(producto.precioRegular);
      const presentacion = utils.extractPresentacion(producto.nombre);
      
      if (!precioOnline || precioOnline <= 0) return null;
      
      // Calcular precio por unidad
      let precioUM = precioOnline;
      if (presentacion) {
        const valor = parseFloat(presentacion.value);
        const pack = presentacion.pack || 1;
        
        if (presentacion.unit.match(/ml/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2); // a litros
        } else if (presentacion.unit.match(/g/i) && !presentacion.unit.match(/kg/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2); // a kg
        } else {
          precioUM = (precioOnline / (valor * pack)).toFixed(2);
        }
      }
      
      return {
        id: utils.generateProductId(producto.super, producto.nombre),
        nombre: utils.cleanProductName(producto.nombre),
        categoria: producto.categoria,
        super: producto.super,
        precios: {
          online: parseFloat(precioOnline.toFixed(2)),
          regular: precioRegular ? parseFloat(precioRegular.toFixed(2)) : null,
          porUnidad: parseFloat(precioUM)
        },
        presentacion: presentacion ? {
          valor: presentacion.value,
          unidad: presentacion.unit,
          pack: presentacion.pack
        } : null,
        descuento: precioRegular && precioOnline < precioRegular 
          ? Math.round(((precioRegular - precioOnline) / precioRegular) * 100)
          : 0,
        timestamp: producto.scraped
      };
    } catch (e) {
      utils.log(`Error normalizando producto Wong: ${e.message}`, 'error');
      return null;
    }
  }
  
  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight - 1000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
  }
  
  async scrapeAll() {
    await this.init();
    
    const allData = {};
    
    for (const categoria of config.categorias) {
      try {
        const productos = await this.scrapeCategory(categoria);
        allData[categoria.id] = productos;
        
        // Guardar JSON individual
        utils.saveJSON(`wong-${categoria.id}.json`, productos);
        
        // Delay entre categorías
        await utils.randomDelay(config.delays.betweenCategories, config.delays.betweenCategories + 2000);
      } catch (e) {
        utils.log(`Error scraping Wong ${categoria.id}: ${e.message}`, 'error');
      }
    }
    
    await this.browser.close();
    utils.log('Wong scraper completado', 'info');
    
    return allData;
  }
}

// Export
module.exports = WongScraper;

// Si ejecuta directo
if (require.main === module) {
  (async () => {
    const scraper = new WongScraper();
    await scraper.scrapeAll();
  })();
}
SCRAPER METRO
scraper-metro.js
Diferencias vs Wong:

Metro usa lazy loading diferente
Estructura HTML distinta
Rate limiting más estricto
const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

const SELECTORS = {
  productCard: '.product-item, .vtex-product-summary',
  productName: '.vtex-product-summary-2-x-productBrand, .product-name',
  priceOnline: '.vtex-product-price-1-x-sellingPrice, .price-selling',
  priceRegular: '.vtex-product-price-1-x-listPrice, .price-list',
  productImage: 'img.vtex-product-summary-2-x-imageNormal'
};

class MetroScraper {
  constructor() {
    this.superId = 'metro';
    this.baseUrl = config.supermercados.metro.searchUrl;
    this.browser = null;
    this.page = null;
  }
  
  async init() {
    utils.log('Inicializando Metro scraper...', 'info');
    this.browser = await puppeteer.launch(config.puppeteer);
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Block images para más rápido (opcional)
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      if (req.resourceType() === 'image') {
        req.abort();
      } else {
        req.continue();
      }
    });
  }
  
  async scrapeCategory(categoria) {
    utils.log(`Metro: Scraping ${categoria.id}...`, 'info');
    
    const url = this.baseUrl + encodeURIComponent(categoria.query);
    
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Metro carga dinámico - esperar
      await this.page.waitForSelector(SELECTORS.productCard, { timeout: 15000 });
      
      // Scroll progresivo para cargar más
      await this.scrollAndWait(3); // 3 scrolls
      
      const productos = await this.page.evaluate((selectors, superId, categoriaId) => {
        const cards = Array.from(document.querySelectorAll(selectors.productCard));
        
        return cards.map(card => {
          try {
            const nombre = card.querySelector(selectors.productName)?.innerText?.trim() || '';
            const precioOnlineEl = card.querySelector(selectors.priceOnline);
            const precioRegularEl = card.querySelector(selectors.priceRegular);
            
            if (!nombre || !precioOnlineEl) return null;
            
            return {
              nombre: nombre,
              precioOnline: precioOnlineEl.innerText.trim(),
              precioRegular: precioRegularEl?.innerText?.trim() || null,
              super: superId,
              categoria: categoriaId,
              scraped: new Date().toISOString()
            };
          } catch (e) {
            return null;
          }
        }).filter(p => p !== null);
      }, SELECTORS, this.superId, categoria.id);
      
      const cleaned = productos
        .map(p => this.normalizeProduct(p))
        .filter(p => p !== null)
        .slice(0, categoria.minItems * 2);
      
      utils.log(`Metro: Encontrados ${cleaned.length} productos de ${categoria.id}`, 'info');
      return cleaned;
      
    } catch (e) {
      utils.log(`Error Metro ${categoria.id}: ${e.message}`, 'error');
      return [];
    }
  }
  
  normalizeProduct(producto) {
    // Misma lógica que Wong
    try {
      const precioOnline = utils.cleanPrice(producto.precioOnline);
      const precioRegular = utils.cleanPrice(producto.precioRegular);
      const presentacion = utils.extractPresentacion(producto.nombre);
      
      if (!precioOnline || precioOnline <= 0) return null;
      
      let precioUM = precioOnline;
      if (presentacion) {
        const valor = parseFloat(presentacion.value);
        const pack = presentacion.pack || 1;
        
        if (presentacion.unit.match(/ml/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else if (presentacion.unit.match(/g/i) && !presentacion.unit.match(/kg/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else {
          precioUM = (precioOnline / (valor * pack)).toFixed(2);
        }
      }
      
      return {
        id: utils.generateProductId(producto.super, producto.nombre),
        nombre: utils.cleanProductName(producto.nombre),
        categoria: producto.categoria,
        super: producto.super,
        precios: {
          online: parseFloat(precioOnline.toFixed(2)),
          regular: precioRegular ? parseFloat(precioRegular.toFixed(2)) : null,
          porUnidad: parseFloat(precioUM)
        },
        presentacion: presentacion ? {
          valor: presentacion.value,
          unidad: presentacion.unit,
          pack: presentacion.pack
        } : null,
        descuento: precioRegular && precioOnline < precioRegular 
          ? Math.round(((precioRegular - precioOnline) / precioRegular) * 100)
          : 0,
        timestamp: producto.scraped
      };
    } catch (e) {
      return null;
    }
  }
  
  async scrollAndWait(times) {
    for (let i = 0; i < times; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await utils.randomDelay(1500, 2500);
    }
  }
  
  async scrapeAll() {
    await this.init();
    const allData = {};
    
    for (const categoria of config.categorias) {
      try {
        const productos = await this.scrapeCategory(categoria);
        allData[categoria.id] = productos;
        utils.saveJSON(`metro-${categoria.id}.json`, productos);
        await utils.randomDelay(config.delays.betweenCategories, config.delays.betweenCategories + 3000);
      } catch (e) {
        utils.log(`Error Metro ${categoria.id}: ${e.message}`, 'error');
      }
    }
    
    await this.browser.close();
    utils.log('Metro scraper completado', 'info');
    return allData;
  }
}

module.exports = MetroScraper;

if (require.main === module) {
  (async () => {
    const scraper = new MetroScraper();
    await scraper.scrapeAll();
  })();
}
SCRAPER PLAZA VEA
scraper-plazavea.js
Particularidades Plaza Vea:

Sitio más lento
Popup inicial cookies
Estructura similar a Metro (VTEX)
const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

const SELECTORS = {
  productCard: '.vtex-search-result-3-x-galleryItem, .product-card',
  productName: '.vtex-product-summary-2-x-productNameContainer',
  priceOnline: '.vtex-product-price-1-x-sellingPriceValue',
  priceRegular: '.vtex-product-price-1-x-listPriceValue',
  cookieBtn: '.cookie-accept, #onetrust-accept-btn-handler'
};

class PlazaVeaScraper {
  constructor() {
    this.superId = 'plazavea';
    this.baseUrl = config.supermercados.plazavea.searchUrl;
    this.browser = null;
    this.page = null;
  }
  
  async init() {
    utils.log('Inicializando Plaza Vea scraper...', 'info');
    this.browser = await puppeteer.launch(config.puppeteer);
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }
  
  async dismissCookiePopup() {
    try {
      await this.page.waitForSelector(SELECTORS.cookieBtn, { timeout: 3000 });
      await this.page.click(SELECTORS.cookieBtn);
      await utils.randomDelay(500, 1000);
    } catch (e) {
      // No popup o ya cerrado
    }
  }
  
  async scrapeCategory(categoria) {
    utils.log(`Plaza Vea: Scraping ${categoria.id}...`, 'info');
    
    const url = this.baseUrl + encodeURIComponent(categoria.query);
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 40000 });
      await this.dismissCookiePopup();
      
      await this.page.waitForSelector(SELECTORS.productCard, { timeout: 15000 });
      await this.scrollAndWait(4);
      
      const productos = await this.page.evaluate((selectors, superId, categoriaId) => {
        const cards = Array.from(document.querySelectorAll(selectors.productCard));
        
        return cards.map(card => {
          try {
            const nombre = card.querySelector(selectors.productName)?.innerText?.trim() || '';
            const precioOnlineEl = card.querySelector(selectors.priceOnline);
            const precioRegularEl = card.querySelector(selectors.priceRegular);
            
            if (!nombre || !precioOnlineEl) return null;
            
            return {
              nombre: nombre,
              precioOnline: precioOnlineEl.innerText.trim(),
              precioRegular: precioRegularEl?.innerText?.trim() || null,
              super: superId,
              categoria: categoriaId,
              scraped: new Date().toISOString()
            };
          } catch (e) {
            return null;
          }
        }).filter(p => p !== null);
      }, SELECTORS, this.superId, categoria.id);
      
      const cleaned = productos
        .map(p => this.normalizeProduct(p))
        .filter(p => p !== null)
        .slice(0, categoria.minItems * 2);
      
      utils.log(`Plaza Vea: Encontrados ${cleaned.length} productos de ${categoria.id}`, 'info');
      return cleaned;
      
    } catch (e) {
      utils.log(`Error Plaza Vea ${categoria.id}: ${e.message}`, 'error');
      return [];
    }
  }
  
  normalizeProduct(producto) {
    // Misma lógica normalización
    try {
      const precioOnline = utils.cleanPrice(producto.precioOnline);
      const precioRegular = utils.cleanPrice(producto.precioRegular);
      const presentacion = utils.extractPresentacion(producto.nombre);
      
      if (!precioOnline || precioOnline <= 0) return null;
      
      let precioUM = precioOnline;
      if (presentacion) {
        const valor = parseFloat(presentacion.value);
        const pack = presentacion.pack || 1;
        
        if (presentacion.unit.match(/ml/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else if (presentacion.unit.match(/g/i) && !presentacion.unit.match(/kg/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else {
          precioUM = (precioOnline / (valor * pack)).toFixed(2);
        }
      }
      
      return {
        id: utils.generateProductId(producto.super, producto.nombre),
        nombre: utils.cleanProductName(producto.nombre),
        categoria: producto.categoria,
        super: producto.super,
        precios: {
          online: parseFloat(precioOnline.toFixed(2)),
          regular: precioRegular ? parseFloat(precioRegular.toFixed(2)) : null,
          porUnidad: parseFloat(precioUM)
        },
        presentacion: presentacion ? {
          valor: presentacion.value,
          unidad: presentacion.unit,
          pack: presentacion.pack
        } : null,
        descuento: precioRegular && precioOnline < precioRegular 
          ? Math.round(((precioRegular - precioOnline) / precioRegular) * 100)
          : 0,
        timestamp: producto.scraped
      };
    } catch (e) {
      return null;
    }
  }
  
  async scrollAndWait(times) {
    for (let i = 0; i < times; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await utils.randomDelay(2000, 3000);
    }
  }
  
  async scrapeAll() {
    await this.init();
    const allData = {};
    
    for (const categoria of config.categorias) {
      try {
        const productos = await this.scrapeCategory(categoria);
        allData[categoria.id] = productos;
        utils.saveJSON(`plazavea-${categoria.id}.json`, productos);
        await utils.randomDelay(config.delays.betweenCategories + 2000, config.delays.betweenCategories + 5000);
      } catch (e) {
        utils.log(`Error Plaza Vea ${categoria.id}: ${e.message}`, 'error');
      }
    }
    
    await this.browser.close();
    utils.log('Plaza Vea scraper completado', 'info');
    return allData;
  }
}

module.exports = PlazaVeaScraper;

if (require.main === module) {
  (async () => {
    const scraper = new PlazaVeaScraper();
    await scraper.scrapeAll();
  })();
}
SCRAPER TOTTUS
scraper-tottus.js
const puppeteer = require('puppeteer');
const config = require('./config');
const utils = require('./utils');

const SELECTORS = {
  productCard: '.product-item, .shelf-item',
  productName: '.product-name, .product-title',
  priceOnline: '.price-tag, .price-best-price',
  priceRegular: '.price-list, .old-price',
  loadMore: '.show-more, .load-more-products'
};

class TottusScraper {
  constructor() {
    this.superId = 'tottus';
    this.baseUrl = config.supermercados.tottus.searchUrl;
    this.browser = null;
    this.page = null;
  }
  
  async init() {
    utils.log('Inicializando Tottus scraper...', 'info');
    this.browser = await puppeteer.launch(config.puppeteer);
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }
  
  async scrapeCategory(categoria) {
    utils.log(`Tottus: Scraping ${categoria.id}...`, 'info');
    
    const url = this.baseUrl + encodeURIComponent(categoria.query);
    
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForSelector(SELECTORS.productCard, { timeout: 10000 });
      
      // Tottus: click "ver más" si existe
      await this.clickLoadMore();
      
      await this.scrollAndWait(3);
      
      const productos = await this.page.evaluate((selectors, superId, categoriaId) => {
        const cards = Array.from(document.querySelectorAll(selectors.productCard));
        
        return cards.map(card => {
          try {
            const nombre = card.querySelector(selectors.productName)?.innerText?.trim() || '';
            const precioOnlineEl = card.querySelector(selectors.priceOnline);
            const precioRegularEl = card.querySelector(selectors.priceRegular);
            
            if (!nombre || !precioOnlineEl) return null;
            
            return {
              nombre: nombre,
              precioOnline: precioOnlineEl.innerText.trim(),
              precioRegular: precioRegularEl?.innerText?.trim() || null,
              super: superId,
              categoria: categoriaId,
              scraped: new Date().toISOString()
            };
          } catch (e) {
            return null;
          }
        }).filter(p => p !== null);
      }, SELECTORS, this.superId, categoria.id);
      
      const cleaned = productos
        .map(p => this.normalizeProduct(p))
        .filter(p => p !== null)
        .slice(0, categoria.minItems * 2);
      
      utils.log(`Tottus: Encontrados ${cleaned.length} productos de ${categoria.id}`, 'info');
      return cleaned;
      
    } catch (e) {
      utils.log(`Error Tottus ${categoria.id}: ${e.message}`, 'error');
      return [];
    }
  }
  
  async clickLoadMore() {
    try {
      const loadMoreBtn = await this.page.$(SELECTORS.loadMore);
      if (loadMoreBtn) {
        await loadMoreBtn.click();
        await utils.randomDelay(2000, 3000);
      }
    } catch (e) {
      // No hay botón o error
    }
  }
  
  normalizeProduct(producto) {
    try {
      const precioOnline = utils.cleanPrice(producto.precioOnline);
      const precioRegular = utils.cleanPrice(producto.precioRegular);
      const presentacion = utils.extractPresentacion(producto.nombre);
      
      if (!precioOnline || precioOnline <= 0) return null;
      
      let precioUM = precioOnline;
      if (presentacion) {
        const valor = parseFloat(presentacion.value);
        const pack = presentacion.pack || 1;
        
        if (presentacion.unit.match(/ml/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else if (presentacion.unit.match(/g/i) && !presentacion.unit.match(/kg/i)) {
          precioUM = (precioOnline / ((valor / 1000) * pack)).toFixed(2);
        } else {
          precioUM = (precioOnline / (valor * pack)).toFixed(2);
        }
      }
      
      return {
        id: utils.generateProductId(producto.super, producto.nombre),
        nombre: utils.cleanProductName(producto.nombre),
        categoria: producto.categoria,
        super: producto.super,
        precios: {
          online: parseFloat(precioOnline.toFixed(2)),
          regular: precioRegular ? parseFloat(precioRegular.toFixed(2)) : null,
          porUnidad: parseFloat(precioUM)
        },
        presentacion: presentacion ? {
          valor: presentacion.value,
          unidad: presentacion.unit,
          pack: presentacion.pack
        } : null,
        descuento: precioRegular && precioOnline < precioRegular 
          ? Math.round(((precioRegular - precioOnline) / precioRegular) * 100)
          : 0,
        timestamp: producto.scraped
      };
    } catch (e) {
      return null;
    }
  }
  
  async scrollAndWait(times) {
    for (let i = 0; i < times; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await utils.randomDelay(1500, 2500);
    }
  }
  
  async scrapeAll() {
    await this.init();
    const allData = {};
    
    for (const categoria of config.categorias) {
      try {
        const productos = await this.scrapeCategory(categoria);
        allData[categoria.id] = productos;
        utils.saveJSON(`tottus-${categoria.id}.json`, productos);
        await utils.randomDelay(config.delays.betweenCategories, config.delays.betweenCategories + 2000);
      } catch (e) {
        utils.log(`Error Tottus ${categoria.id}: ${e.message}`, 'error');
      }
    }
    
    await this.browser.close();
    utils.log('Tottus scraper completado', 'info');
    return allData;
  }
}

module.exports = TottusScraper;

if (require.main === module) {
  (async () => {
    const scraper = new TottusScraper();
    await scraper.scrapeAll();
  })();
}
ORCHESTRATOR - RUN ALL
run-all.js
const WongScraper = require('./scraper-wong');
const MetroScraper = require('./scraper-metro');
const PlazaVeaScraper = require('./scraper-plazavea');
const TottusScraper = require('./scraper-tottus');
const utils = require('./utils');
const fs = require('fs');
const path = require('path');

class MasterScraper {
  constructor() {
    this.scrapers = [
      new WongScraper(),
      new MetroScraper(),
      new PlazaVeaScraper(),
      new TottusScraper()
    ];
  }
  
  async runAll() {
    utils.log('=== INICIO SCRAPING TODOS LOS SUPERMERCADOS ===', 'info');
    const startTime = Date.now();
    
    const results = {
      timestamp: new Date().toISOString(),
      supermercados: {},
      stats: {
        total: 0,
        porSuper: {},
        porCategoria: {}
      }
    };
    
    for (const scraper of this.scrapers) {
      try {
        utils.log(`\n--- Iniciando ${scraper.superId.toUpperCase()} ---`, 'info');
        const data = await scraper.scrapeAll();
        
        results.supermercados[scraper.superId] = data;
        
        // Stats
        let totalSuper = 0;
        Object.keys(data).forEach(cat => {
          totalSuper += data[cat].length;
          results.stats.porCategoria[cat] = (results.stats.porCategoria[cat] || 0) + data[cat].length;
        });
        
        results.stats.porSuper[scraper.superId] = totalSuper;
        results.stats.total += totalSuper;
        
        utils.log(`${scraper.superId}: ${totalSuper} productos totales`, 'info');
        
        // Delay entre supermercados
        await utils.randomDelay(10000, 15000);
        
      } catch (e) {
        utils.log(`ERROR CRÍTICO scraping ${scraper.superId}: ${e.message}`, 'error');
      }
    }
    
    // Consolidar todo en 1 JSON master
    this.saveMasterJSON(results);
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    utils.log(`\n=== SCRAPING COMPLETADO en ${duration} minutos ===`, 'info');
    utils.log(`Total productos: ${results.stats.total}`, 'info');
    
    return results;
  }
  
  saveMasterJSON(results) {
    const filepath = path.join(__dirname, '../data', 'master-data.json');
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    utils.log('Master JSON guardado: data/master-data.json', 'info');
  }
}

// Ejecutar
if (require.main === module) {
  (async () => {
    const master = new MasterScraper();
    await master.runAll();
  })();
}

module.exports = MasterScraper;
PACKAGE.JSON
{
  "name": "preciojusto-scrapers",
  "version": "1.0.0",
  "description": "Scrapers automáticos precios supermercados Lima",
  "main": "run-all.js",
  "scripts": {
    "scrape": "node scrapers/run-all.js",
    "scrape:wong": "node scrapers/scraper-wong.js",
    "scrape:metro": "node scrapers/scraper-metro.js",
    "scrape:plazavea": "node scrapers/scraper-plazavea.js",
    "scrape:tottus": "node scrapers/scraper-tottus.js",
    "test": "node test/test-scraper.js"
  },
  "dependencies": {
    "puppeteer": "^21.0.0"
  },
  "devDependencies": {},
  "author": "PrecioJusto",
  "license": "MIT"
}
INSTALACIÓN & USO
Setup inicial
# Instalar dependencias
npm install

# Crear directorios
mkdir -p data logs

# Test scraper individual
npm run scrape:wong

# Ejecutar todos
npm run scrape
Output esperado
data/
├── wong-arroz.json (30-50 productos)
├── wong-aceite.json (30-50 productos)
├── metro-arroz.json
├── metro-aceite.json
├── plazavea-arroz.json
├── tottus-arroz.json
└── master-data.json (consolidado)

Total: 200-400 productos
INTEGRACIÓN CON APP
Cargar data en app.js
// app.js - reemplazar productos hardcoded

async function loadProductosFromJSON() {
  try {
    const response = await fetch('data/master-data.json');
    const masterData = await response.json();
    
    // Consolidar productos de todos supers
    const productos = [];
    Object.keys(masterData.supermercados).forEach(superId => {
      const superData = masterData.supermercados[superId];
      Object.keys(superData).forEach(categoria => {
        productos.push(...superData[categoria]);
      });
    });
    
    console.log(`Cargados ${productos.length} productos de ${masterData.timestamp}`);
    return productos;
    
  } catch (e) {
    console.error('Error cargando data:', e);
    return []; // Fallback a hardcoded si falla
  }
}

// Inicializar app
(async () => {
  const productosData = await loadProductosFromJSON();
  inicializarApp(productosData);
})();
AUTOMATIZACIÓN GITHUB ACTIONS
.github/workflows/scrape-daily.yml
name: Scrape Precios Diario

on:
  schedule:
    - cron: '0 6 * * *' # 6am Perú daily
  workflow_dispatch: # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd scrapers
          npm install
      
      - name: Run scrapers
        run: npm run scrape
      
      - name: Commit data
        run: |
          git config user.name "PrecioJusto Bot"
          git config user.email "bot@preciojusto.pe"
          git add data/*.json
          git commit -m "Update precios $(date +'%Y-%m-%d')" || echo "No changes"
          git push
TESTING & QA
test/test-scraper.js
const WongScraper = require('../scrapers/scraper-wong');
const utils = require('../scrapers/utils');

async function testWong() {
  console.log('Testing Wong scraper...\n');
  
  const scraper = new WongScraper();
  await scraper.init();
  
  // Test 1 categoría
  const productos = await scraper.scrapeCategory({ id: 'arroz', query: 'arroz', minItems: 10 });
  
  console.log(`\nResultados: ${productos.length} productos`);
  console.log('Sample producto:', JSON.stringify(productos[0], null, 2));
  
  // Validaciones
  const tests = {
    'Tiene productos': productos.length > 0,
    'Producto tiene precio': productos[0].precios.online > 0,
    'Producto tiene nombre': productos[0].nombre.length > 0,
    'Precio por unidad calculado': productos[0].precios.porUnidad > 0,
    'Tiene timestamp': !!productos[0].timestamp
  };
  
  console.log('\n--- Test Results ---');
  Object.keys(tests).forEach(test => {
    console.log(`${tests[test] ? '✓' : '✗'} ${test}`);
  });
  
  await scraper.browser.close();
}

testWong();
MONITOREO & LOGS
Verificar scraping exitoso
# Ver logs
cat logs/scrape-2026-03-04.log

# Verificar data generada
ls -lh data/

# Validar JSON
node -e "console.log(require('./data/master-data.json').stats)"
TROUBLESHOOTING
Si scraper falla:
Selectores cambiaron:

Inspeccionar sitio web
Actualizar SELECTORS en scraper correspondiente
Rate limiting:

Aumentar delays en config.js
Usar proxies (avanzado)
Timeout:

Aumentar timeout en config.puppeteer
Mejorar internet
Captcha:

Agregar delays más largos
Cambiar user agent
Considerar servicios anti-captcha ($$)
CRITERIOS ÉXITO SPRINT 3
✅ 4 scrapers funcionales (Wong, Metro, Plaza Vea, Tottus)
✅ 200+ productos totales generados
✅ JSONs organizados por super y categoría
✅ master-data.json consolidado
✅ Integración con app.js funcionando
✅ GitHub Actions automatización configurada
✅ Tests pasando
✅ Logs guardándose correctamente

PRÓXIMOS PASOS POST-SPRINT 3
Normalización avanzada:

Detectar marcas automáticamente
Matching productos entre supers (mismo producto diferentes nombres)
Data quality:

Validaciones más estrictas
Deduplicación productos
Performance:

Scraping paralelo
Caching inteligente
Alertas:

Notificación si scraper falla
Email cuando ofertas >30% descuento
PREGUNTAS PARA CLAUDE CODE
¿Empezamos con Wong scraper primero o setup completo?
¿Necesitas acceso a sitios web para inspeccionar selectores?
¿Prefieres crear todos scrapers juntos o iterativamente?
¿Tienes dudas sobre alguna implementación específica?
READY TO START SCRAPING?

Confirma que entiendes el scope y empecemos con scraper Wong.
