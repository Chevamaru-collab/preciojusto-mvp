// ============================================================
// PRECIO JUSTO - OBSERVATORIO DE PRECIOS · app.js
// ============================================================

// ---- CONFIG: SUPERMERCADOS ----
const SUPERMERCADOS = {
    Metro: { id: 'Metro', nombre: 'Metro', color: '#e84040', cssClass: 'metro', activo: true },
    Wong: { id: 'Wong', nombre: 'Wong', color: '#f5a623', cssClass: 'wong', activo: true },
    Tottus: { id: 'Tottus', nombre: 'Tottus', color: '#0066cc', cssClass: 'tottus', activo: false },
    PlazaVea: { id: 'PlazaVea', nombre: 'Plaza Vea', color: '#00a651', cssClass: 'plazavea', activo: true }
};
function activeSupers() { return Object.values(SUPERMERCADOS).filter(s => s.activo); }

// ---- STATE ----
let filters = { super: 'Todos', tipo: 'Todos', categoria: 'Todos', marca: 'Todos', presentacion: 'Todos' };
let tableData = [];
let sortMode = 'fecha';
let searchQuery = '';

// ---- HELPERS ----
function parseDate(str) {
    const parts = str.split('/');
    if (parts.length < 3) return new Date(0);
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
}
function fmtSoles(n) {
    return 'S/ ' + parseFloat(n).toFixed(2);
}
function superClass(s) {
    return SUPERMERCADOS[s]?.cssClass || s.toLowerCase();
}
function prodKeyFn(d) {
    return `${d.tipo}|${d.clase || 'N/A'}|${d.presentacion}${d.um || 'u'}`;
}
function getFiltered(data) {
    return data.filter(d => {
        if (filters.categoria !== 'Todos' && d.categoria !== filters.categoria) return false;
        if (filters.super !== 'Todos' && d.super !== filters.super) return false;
        if (filters.tipo !== 'Todos' && d.tipo !== filters.tipo) return false;
        if (filters.marca !== 'Todos' && d.marca !== filters.marca) return false;
        if (filters.presentacion !== 'Todos' && String(d.presentacion) !== filters.presentacion) return false;
        return true;
    });
}
function updateTipoOptions() {
    const cat = filters.categoria;
    const el = document.getElementById('filter-tipo');
    const label = document.getElementById('filter-tipo-label');
    let opts = [];
    if (cat === 'Aceite') {
        opts = [
            { v: 'Todos', l: 'Todos los tipos' }, { v: 'Vegetal', l: 'Vegetal' },
            { v: 'De Oliva', l: 'Oliva' }, { v: 'De Girasol', l: 'Girasol' }, { v: 'De Cártamo', l: 'Cártamo' }
        ];
        if (label) label.textContent = 'Tipo de Aceite';
    } else if (cat === 'Arroz') {
        opts = [
            { v: 'Todos', l: 'Todos los tipos' }, { v: 'Extra', l: 'Extra' },
            { v: 'Extra Añejo', l: 'Extra Añejo' }, { v: 'Añejo Extra', l: 'Añejo Extra' },
            { v: 'Superior', l: 'Superior' }, { v: 'Integral', l: 'Integral' }, { v: 'Gran Reserva', l: 'Gran Reserva' }
        ];
        if (label) label.textContent = 'Tipo de Arroz';
    } else {
        // Todos: show combined types from both categories
        opts = [
            { v: 'Todos', l: 'Todos los tipos' },
            { v: 'Vegetal', l: 'Aceite Vegetal' }, { v: 'De Oliva', l: 'Aceite Oliva' },
            { v: 'De Girasol', l: 'Aceite Girasol' }, { v: 'De Cártamo', l: 'Aceite Cártamo' },
            { v: 'Extra', l: 'Arroz Extra' }, { v: 'Extra Añejo', l: 'Arroz Extra Añejo' },
            { v: 'Añejo Extra', l: 'Arroz Añejo Extra' }, { v: 'Superior', l: 'Arroz Superior' },
            { v: 'Integral', l: 'Arroz Integral' }, { v: 'Gran Reserva', l: 'Arroz Gran Reserva' }
        ];
        if (label) label.textContent = 'Tipo de Producto';
    }
    if (el) el.innerHTML = opts.map(o =>
        `<option value="${o.v}"${filters.tipo === o.v ? ' selected' : ''}>${o.l}</option>`
    ).join('');
}
function updateMarcaOptions() {
    const base = rawData.filter(d => {
        if (filters.categoria !== 'Todos' && d.categoria !== filters.categoria) return false;
        if (filters.super !== 'Todos' && d.super !== filters.super) return false;
        if (filters.tipo !== 'Todos' && d.tipo !== filters.tipo) return false;
        return true;
    });
    const marcas = [...new Set(base.map(d => d.marca).filter(Boolean))].sort();
    const el = document.getElementById('filter-marca');
    if (!el) return;
    el.innerHTML = [
        `<option value="Todos"${filters.marca === 'Todos' ? ' selected' : ''}>Todas las marcas</option>`,
        ...marcas.map(m => `<option value="${m}"${filters.marca === m ? ' selected' : ''}>${m}</option>`)
    ].join('');
}
function updatePresentacionOptions() {
    const base = rawData.filter(d => {
        if (filters.categoria !== 'Todos' && d.categoria !== filters.categoria) return false;
        if (filters.super !== 'Todos' && d.super !== filters.super) return false;
        if (filters.tipo !== 'Todos' && d.tipo !== filters.tipo) return false;
        if (filters.marca !== 'Todos' && d.marca !== filters.marca) return false;
        return true;
    });
    const pres = [...new Set(base.map(d => `${d.presentacion}|${d.um}`))].sort((a, b) => parseFloat(a) - parseFloat(b));
    const el = document.getElementById('filter-pres');
    if (!el) return;
    el.innerHTML = [
        `<option value="Todos"${filters.presentacion === 'Todos' ? ' selected' : ''}>Todas las presentaciones</option>`,
        ...pres.map(p => {
            const [val, um] = p.split('|');
            return `<option value="${val}"${filters.presentacion === val ? ' selected' : ''}>${val} ${um}</option>`;
        })
    ].join('');
}
function getLatest(data) {
    const sorted = [...data].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
    const maxDate = sorted[0]?.fecha;
    return data.filter(d => d.fecha === maxDate);
}

// ---- USER MANAGER ----
const UserManager = {
    KEY: 'pj_user',
    get() { return JSON.parse(localStorage.getItem(this.KEY) || 'null'); },
    save(u) { localStorage.setItem(this.KEY, JSON.stringify(u)); },
    create(nombre) {
        const u = {
            id: 'u_' + Date.now(),
            nombre: nombre.trim(),
            created: new Date().toISOString(),
            listas: [{ id: 'l0', nombre: 'Mi Lista', items: [] }]
        };
        this.save(u);
        return u;
    }
};

// ---- LISTA MANAGER ----
const ListaManager = {
    getLista() { return UserManager.get()?.listas?.[0] || { items: [] }; },
    saveLista(lista) {
        const u = UserManager.get();
        if (!u) return;
        u.listas[0] = lista;
        UserManager.save(u);
    },
    addItem(prodKey, nombre, categoria, um) {
        if (!UserManager.get()) { showWelcomeModal(); return; }
        const lista = this.getLista();
        const existing = lista.items.find(i => i.prodKey === prodKey);
        if (existing) { existing.cantidad++; }
        else { lista.items.push({ prodKey, nombre, categoria, um, cantidad: 1 }); }
        this.saveLista(lista);
        this.renderSidebar();
        this.updateBadge();
        // Flash feedback on button
        const btn = document.querySelector(`.btn-add-lista[data-prod-key="${encodeURIComponent(prodKey)}"]`);
        if (btn) {
            btn.textContent = '✓ Agregado';
            btn.classList.add('added');
            setTimeout(() => { btn.textContent = '+ Mi Lista'; btn.classList.remove('added'); }, 1400);
        }
    },
    removeItem(prodKey) {
        const lista = this.getLista();
        lista.items = lista.items.filter(i => i.prodKey !== prodKey);
        this.saveLista(lista);
        this.renderSidebar();
        this.updateBadge();
    },
    changeQty(prodKey, delta) {
        const lista = this.getLista();
        const item = lista.items.find(i => i.prodKey === prodKey);
        if (!item) return;
        item.cantidad = Math.max(0, item.cantidad + delta);
        if (item.cantidad === 0) lista.items = lista.items.filter(i => i.prodKey !== prodKey);
        this.saveLista(lista);
        this.renderSidebar();
        this.updateBadge();
    },
    getLatestPxum(prodKey, superNombre) {
        const matches = rawData.filter(d => prodKeyFn(d) === prodKey && d.super === superNombre && d.pxum);
        if (!matches.length) return null;
        matches.sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
        return matches[0].pxum;
    },
    calcularTotales() {
        const lista = this.getLista();
        const totales = {};
        activeSupers().forEach(s => {
            totales[s.nombre] = lista.items.reduce((sum, item) => {
                const price = this.getLatestPxum(item.prodKey, s.nombre);
                return sum + (price !== null ? price * item.cantidad : 0);
            }, 0);
        });
        return totales;
    },
    updateBadge() {
        const lista = this.getLista();
        const count = lista.items.reduce((s, i) => s + i.cantidad, 0);
        const badge = document.getElementById('lista-count');
        if (badge) { badge.textContent = count; badge.style.display = count ? 'inline-block' : 'none'; }
    },
    renderSidebar() {
        const lista = this.getLista();
        const body = document.getElementById('lista-body');
        const footer = document.getElementById('lista-footer');
        if (!body || !footer) return;

        if (!lista.items.length) {
            body.innerHTML = '<p class="lista-empty">Tu lista está vacía.<br>Agrega productos desde "¿Dónde comprar más barato?"</p>';
            footer.innerHTML = '';
            return;
        }

        body.innerHTML = lista.items.map(item => `
            <div class="lista-item">
                <div class="lista-item-info">
                    <div class="lista-item-nombre">${item.nombre}</div>
                    <div class="lista-item-cat">${item.categoria} · ${item.um}/u</div>
                </div>
                <div class="lista-item-controls">
                    <button class="lista-qty-btn" data-key="${encodeURIComponent(item.prodKey)}" onclick="ListaManager.changeQty(decodeURIComponent(this.dataset.key), -1)">−</button>
                    <span class="lista-qty-val">${item.cantidad}</span>
                    <button class="lista-qty-btn" data-key="${encodeURIComponent(item.prodKey)}" onclick="ListaManager.changeQty(decodeURIComponent(this.dataset.key), 1)">+</button>
                    <button class="lista-remove-btn" data-key="${encodeURIComponent(item.prodKey)}" onclick="ListaManager.removeItem(decodeURIComponent(this.dataset.key))">✕</button>
                </div>
            </div>`).join('');

        const totales = this.calcularTotales();
        const entries = Object.entries(totales).filter(([, t]) => t > 0).sort((a, b) => a[1] - b[1]);

        if (!entries.length) {
            footer.innerHTML = '<p class="lista-empty" style="padding:12px 0">Sin precios disponibles para los productos de tu lista.</p>';
            return;
        }

        const [, mejorTotal] = entries[0];
        footer.innerHTML = `
            <div class="lista-totales">
                <div class="lista-totales-title">¿Dónde comprar?</div>
                ${entries.map(([superNombre, total], i) => {
            const isMejor = i === 0;
            const diff = i > 0 ? `+${fmtSoles(total - mejorTotal)}` : '';
            const s = SUPERMERCADOS[superNombre];
            return `
                        <div class="lista-total-row${isMejor ? ' lista-mejor' : ''}">
                            <div class="lista-total-super">
                                <span class="super-dot ${s?.cssClass || ''}"></span>
                                ${superNombre}
                                ${isMejor ? '<span class="lista-mejor-badge">✓ Mejor opción</span>' : ''}
                            </div>
                            <div class="lista-total-precio">
                                ${fmtSoles(total)}
                                ${diff ? `<small class="lista-total-diff">${diff}</small>` : ''}
                            </div>
                        </div>`;
        }).join('')}
                <div class="lista-totales-note">* Precio estimado por unidad × cantidad</div>
            </div>`;
    }
};

// ---- FILTER TOGGLE ----
window.setFilter = function (dim, value, el) {
    filters[dim] = value;
    if (dim === 'categoria') {
        filters.tipo = 'Todos'; filters.marca = 'Todos'; filters.presentacion = 'Todos';
        updateTipoOptions(); updateMarcaOptions(); updatePresentacionOptions();
    } else if (dim === 'tipo') {
        filters.marca = 'Todos'; filters.presentacion = 'Todos';
        updateMarcaOptions(); updatePresentacionOptions();
    } else if (dim === 'marca') {
        filters.presentacion = 'Todos';
        updatePresentacionOptions();
    }
    if (el && el.tagName === 'BUTTON') {
        el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
    }
    updateFilterBadge();
    renderAll();
};
window.clearFilters = function () {
    filters = { super: 'Todos', tipo: 'Todos', categoria: 'Todos', marca: 'Todos', presentacion: 'Todos' };
    document.querySelectorAll('#filter-cat .chip, #filter-super .chip').forEach(c => {
        c.classList.toggle('active', c.dataset.value === 'Todos');
    });
    updateTipoOptions(); updateMarcaOptions(); updatePresentacionOptions();
    updateFilterBadge();
    renderAll();
};

// ---- RENDER ALL ----
function renderAll() {
    ['compare-grid', 'deals-grid', 'insight-card'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('section-refresh'); void el.offsetWidth; el.classList.add('section-refresh'); }
    });
    const filtered = getFiltered(rawData);
    renderHeroStats(filtered);
    renderKPIs(filtered);
    renderInsightHero(filtered);
    renderCompare(filtered);
    renderDeals(filtered);
    renderTable(filtered);
    updateLastUpdateBadge();
}

// ---- LAST UPDATE BADGE ----
function updateLastUpdateBadge() {
    const el = document.getElementById('last-update-badge');
    if (!el) return;
    const dates = [...new Set(rawData.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a));
    if (!dates.length) return;
    const latestDate = parseDate(dates[0]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let displayDate = '';
    if (latestDate.getTime() === today.getTime()) {
        displayDate = 'hoy'; el.classList.remove('warning');
    } else if (latestDate.getTime() === yesterday.getTime()) {
        displayDate = 'ayer'; el.classList.add('warning');
    } else {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        displayDate = `el ${latestDate.getDate()} de ${months[latestDate.getMonth()]}`;
        el.classList.add('warning');
    }
    el.innerHTML = `<span class="badge-dot"></span>Actualizado ${displayDate}`;
}

// ---- HERO STATS ----
function renderHeroStats(data) {
    const dates = [...new Set(data.map(d => d.fecha))];
    const prods = [...new Set(data.map(d => d.item))];

    // Best discount per supermarket
    const bestDiscPerSuper = activeSupers().map(s => {
        const deals = data.filter(d => d.super === s.nombre && d.descuento !== null && d.descuento < 0);
        if (!deals.length) return null;
        const best = deals.reduce((m, d) => d.descuento < m.descuento ? d : m, deals[0]);
        return { nombre: s.nombre, descuento: Math.abs(best.descuento) };
    }).filter(Boolean);

    const bestDiscLabel = bestDiscPerSuper.length
        ? bestDiscPerSuper.map(s => `${s.nombre} ${s.descuento.toFixed(0)}%`).join(' · ')
        : 'Sin ofertas';

    const el = document.getElementById('hero-stats');
    el.innerHTML = `
    <div class="hero-stat"><div class="hero-stat-value">${dates.length}</div><div class="hero-stat-label">Días monitoreados</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${prods.length}</div><div class="hero-stat-label">Productos únicos</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${activeSupers().length}</div><div class="hero-stat-label">Supermercados</div></div>
    <div class="hero-stat hero-stat--deals">
      <div class="hero-stat-value">🏷️</div>
      <div class="hero-stat-label">Mejor descuento</div>
      <div class="hero-stat-deals">${bestDiscLabel}</div>
    </div>
  `;
}

// ---- KPI CARDS ----
function renderKPIs(data) {
    const latest = getLatest(data);
    const isArroz = filters.categoria === 'Arroz';
    const um = isArroz ? 'kg' : 'Lt';

    const cheapestLatest = latest.filter(d => d.pxum).length
        ? latest.filter(d => d.pxum).reduce((m, d) => d.pxum < m.pxum ? d : m, latest.filter(d => d.pxum)[0])
        : null;
    const minPxum = cheapestLatest ? cheapestLatest.pxum : 0;
    const cheapestSuperLabel = (filters.super === 'Todos' && cheapestLatest) ? ` · ${cheapestLatest.super}` : '';

    const withDiscLatest = latest.filter(d => d.descuento !== null && d.descuento < 0);
    const maxDisc = withDiscLatest.length
        ? withDiscLatest.reduce((m, d) => d.descuento < m.descuento ? d : m, withDiscLatest[0])
        : { descuento: 0, item: 'Sin ofertas hoy' };

    const avgPxum = latest.length ? (latest.reduce((s, d) => s + (d.pxum || 0), 0) / latest.length).toFixed(2) : 0;
    const totalObs = data.length;
    const allFechas = [...new Set(data.map(d => d.fecha))].sort((a, b) => parseDate(a) - parseDate(b));
    const rangoFechas = allFechas.length > 1
        ? `${allFechas[0]} – ${allFechas[allFechas.length - 1]}`
        : (allFechas[0] || '');

    const icon = isArroz ? '🌾' : '🛢️';
    const catLabel = isArroz ? 'Arroz' : 'Aceite';
    const container = document.getElementById('kpi-grid');
    container.innerHTML = `
    <div class="kpi-card blue">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-label">${catLabel} más barato / ${um}</div>
      <div class="kpi-value">${fmtSoles(minPxum)} <span>/ ${um}</span></div>
      <div class="kpi-sub">Precio online más reciente${cheapestSuperLabel}</div>
      <div class="kpi-badge down">🏆 Mejor precio</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-icon">💰</div>
      <div class="kpi-label">Mayor Descuento Hoy</div>
      <div class="kpi-value">${Math.abs(maxDisc.descuento || 0).toFixed(1)} <span>%</span></div>
      <div class="kpi-sub" style="max-width:200px;line-height:1.4">${(maxDisc.item || '').substring(0, 45)}</div>
    </div>
    <div class="kpi-card yellow">
      <div class="kpi-icon">📊</div>
      <div class="kpi-label">Precio Promedio / ${um} (más reciente)</div>
      <div class="kpi-value">${fmtSoles(avgPxum)} <span>/ ${um}</span></div>
      <div class="kpi-sub">Todos los tipos de ${catLabel.toLowerCase()}</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-icon">📋</div>
      <div class="kpi-label">Observaciones Registradas</div>
      <div class="kpi-value">${totalObs} <span>registros</span></div>
      <div class="kpi-sub">${rangoFechas}</div>
    </div>
  `;
}

// ---- INSIGHT HERO ----
function buildBestInsight(data) {
    const sortedDates = [...new Set(data.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a));
    const recentDates = new Set(sortedDates.slice(0, 3));
    const recent = data.filter(d => recentDates.has(d.fecha));

    const byProd = {};
    recent.forEach(d => {
        const k = prodKeyFn(d);
        if (!byProd[k]) byProd[k] = {};
        if (!byProd[k][d.super] || d.pxum < byProd[k][d.super].pxum) byProd[k][d.super] = d;
    });

    const superNames = activeSupers().map(s => s.nombre);
    const compared = Object.entries(byProd).filter(([, supers]) =>
        superNames.filter(n => supers[n]).length >= 2
    );
    if (!compared.length) return null;

    let maxDiff = -1, bestEntry = null;
    compared.forEach(([, supers]) => {
        const prices = superNames.filter(n => supers[n]).map(n => supers[n].pxum);
        const diff = Math.max(...prices) - Math.min(...prices);
        if (diff > maxDiff) { maxDiff = diff; bestEntry = supers; }
    });
    return bestEntry;
}

function insightCardHTML(supers) {
    const superNames = activeSupers().map(s => s.nombre).filter(n => supers[n]);
    superNames.sort((a, b) => supers[a].pxum - supers[b].pxum);
    const winner = supers[superNames[0]];
    const winnerName = superNames[0];
    const loser = supers[superNames[superNames.length - 1]];
    const savings = loser.pxum - winner.pxum;
    const um = winner.um || 'Lt';
    const icon = winner.categoria === 'Arroz' ? '🌾' : '🛢️';
    return `
      <div class="insight-left">
        <div class="insight-label">🏆 Mayor diferencia · ${winner.categoria}</div>
        <div class="insight-product">${icon} ${winner.tipo}${winner.clase ? ' ' + winner.clase : ''} · ${winner.presentacion} ${um}</div>
        <div class="insight-price">${fmtSoles(winner.pxum)}<span class="insight-um">/ ${um}</span></div>
        <div class="insight-super-badge insight-${winnerName.toLowerCase()}">${winnerName} más barato</div>
      </div>
      <div class="insight-right">
        ${superNames.map(n => {
        const isWinner = n === winnerName;
        return `
            <div class="insight-compare-row ${isWinner ? 'insight-winner-row' : ''}">
              <span class="insight-super-name"><span class="super-dot ${superClass(n)}"></span>${n}</span>
              <span class="insight-price-sm ${isWinner ? 'winner' : 'loser'}">${fmtSoles(supers[n].pxum)}<small>/${um}</small></span>
            </div>`;
    }).join('')}
        <div class="insight-savings">↓ Ahorras ${fmtSoles(savings)} / ${um}</div>
      </div>`;
}

function renderInsightHero(data) {
    const el = document.getElementById('insight-card');
    if (!el) return;

    if (filters.categoria === 'Todos') {
        const aceiteInsight = buildBestInsight(data.filter(d => d.categoria === 'Aceite'));
        const arrozInsight = buildBestInsight(data.filter(d => d.categoria === 'Arroz'));

        if (!aceiteInsight && !arrozInsight) {
            el.className = 'insight-card';
            el.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Sin datos comparables disponibles</p>';
            return;
        }
        el.className = 'insight-card insight-card--dual';
        el.innerHTML = [
            aceiteInsight ? `<div class="insight-panel">${insightCardHTML(aceiteInsight)}</div>` : '',
            arrozInsight ? `<div class="insight-panel">${insightCardHTML(arrozInsight)}</div>` : ''
        ].join('');
    } else {
        const insight = buildBestInsight(data);
        el.className = 'insight-card';
        if (!insight) {
            el.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Sin datos comparables disponibles</p>';
            return;
        }
        el.innerHTML = insightCardHTML(insight);
    }
}

// ---- COMPARE GRID ----
function renderCompare(data) {
    const sortedDates = [...new Set(data.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a));
    const recentDates = new Set(sortedDates.slice(0, 3));
    const recent = data.filter(d => recentDates.has(d.fecha));

    const byProd = {};
    recent.forEach(d => {
        const k = prodKeyFn(d);
        if (!byProd[k]) byProd[k] = {};
        if (!byProd[k][d.super] || d.pxum < byProd[k][d.super].pxum) byProd[k][d.super] = d;
    });

    const superNames = activeSupers().map(s => s.nombre);
    const compared = Object.entries(byProd).filter(([, supers]) =>
        superNames.filter(n => supers[n]).length >= 2
    );
    const container = document.getElementById('compare-grid');

    if (!compared.length) {
        container.innerHTML = '<p style="color:var(--text3);grid-column:1/-1">No hay productos comparables en ambos supers para la fecha seleccionada.</p>';
        return;
    }

    container.innerHTML = compared.slice(0, 9).map(([key, supers]) => {
        const available = superNames.filter(n => supers[n]);
        available.sort((a, b) => supers[a].pxum - supers[b].pxum);
        const winner = supers[available[0]];
        const isArrozItem = winner.categoria === 'Arroz';
        const icon = isArrozItem ? '🌾' : '🛢️';
        const sizeLabel = `${winner.presentacion} ${winner.um || (isArrozItem ? 'kg' : 'L')}`;
        const unit = winner.um || (isArrozItem ? 'kg' : 'Lt');
        const displayNombre = `${winner.marca ? winner.marca + ' ' : ''}${winner.tipo}${winner.clase ? ' ' + winner.clase : ''} ${sizeLabel}`;
        return `
      <div class="compare-card">
        <div class="compare-product">${icon} ${displayNombre}</div>
        ${available.map(n => {
            const d = supers[n];
            const isWinner = n === available[0];
            const s = SUPERMERCADOS[n];
            return `
        <div class="compare-row">
          <div class="compare-super">
            <div class="super-dot ${s?.cssClass || ''}"></div> ${n}
            ${isWinner ? '<span class="winner-badge">+ barato</span>' : ''}
          </div>
          <div class="compare-prices">
            <div class="compare-pxum ${isWinner ? 'winner' : 'loser'}">${fmtSoles(d.pxum)}<span style="font-size:11px;font-weight:400;color:var(--text3)">/${unit}</span></div>
            <div class="compare-label">${fmtSoles(d.precioOnline)} online</div>
          </div>
        </div>`;
        }).join('')}
        <button class="btn-add-lista" data-prod-key="${encodeURIComponent(key)}" data-nombre="${displayNombre}" data-categoria="${winner.categoria}" data-um="${unit}" onclick="window.addToLista(this)">+ Mi Lista</button>
      </div>`;
    }).join('');
}

// ---- DEALS ----
function renderDeals(data) {
    const latest = getLatest(data);
    const withDisc = [...latest]
        .filter(d => d.descuento !== null && d.descuento <= -10)
        .sort((a, b) => a.descuento - b.descuento);

    const container = document.getElementById('deals-grid');
    if (!withDisc.length) {
        container.innerHTML = '<p style="color:var(--text3)">No se encontraron ofertas con los filtros seleccionados.</p>';
        return;
    }

    const latestDate = [...new Set(rawData.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a))[0] || '';
    const dealsSub = document.getElementById('deals-date');
    if (dealsSub) dealsSub.textContent = latestDate ? `Datos al ${latestDate}` : '';

    const showGroups = filters.super === 'Todos';

    function dealCard(d) {
        return `
        <div class="deal-card">
          <div class="deal-badge">${Math.abs(d.descuento).toFixed(0)}% OFF</div>
          ${!showGroups ? `<div class="deal-super ${superClass(d.super)}">${d.super}</div>` : ''}
          <div class="deal-name">${d.item}</div>
          <div class="deal-prices">
            <div class="deal-online">${fmtSoles(d.precioOnline)}</div>
            ${d.precioRegular > 0 ? `<div class="deal-regular">${fmtSoles(d.precioRegular)}</div>` : ''}
          </div>
          <div class="deal-pxum">${fmtSoles(d.pxum)} / ${d.um}</div>
        </div>`;
    }

    if (showGroups) {
        let html = '';
        activeSupers().forEach(s => {
            const deals = withDisc.filter(d => d.super === s.nombre);
            if (!deals.length) return;
            html += `
            <div class="deals-super-section">
              <div class="deals-super-header ${s.cssClass}">${s.nombre}</div>
              <div class="deals-sub-grid">${deals.map(dealCard).join('')}</div>
            </div>`;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = withDisc.map(dealCard).join('');
    }
}

// ---- TABLE ----
window.filterTable = function () {
    searchQuery = document.getElementById('search-input').value.toLowerCase();
    renderTable(getFiltered(rawData));
};
window.sortTable = function () {
    sortMode = document.getElementById('sort-select').value;
    renderTable(getFiltered(rawData));
};

function renderTable(data) {
    let rows = [...data];
    if (searchQuery) {
        rows = rows.filter(d => d.item.toLowerCase().includes(searchQuery) || d.super.toLowerCase().includes(searchQuery) || d.tipo.toLowerCase().includes(searchQuery));
    }
    if (sortMode === 'fecha') rows.sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
    else if (sortMode === 'precio-asc') rows.sort((a, b) => a.precioOnline - b.precioOnline);
    else if (sortMode === 'precio-desc') rows.sort((a, b) => b.precioOnline - a.precioOnline);
    else if (sortMode === 'pxum-asc') rows.sort((a, b) => a.pxum - b.pxum);
    else if (sortMode === 'pxum-desc') rows.sort((a, b) => b.pxum - a.pxum);

    tableData = rows;
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = rows.map(d => `
    <tr>
      <td>${d.fecha}</td>
      <td><span class="td-super"><span class="td-super-dot ${superClass(d.super)}"></span>${d.super}</span></td>
      <td class="td-product">${d.item}</td>
      <td><span class="tipo-badge">${d.tipo || '—'}</span></td>
      <td class="td-precio">${fmtSoles(d.precioOnline)}</td>
      <td style="color:var(--text3)">${d.precioRegular > 0 ? fmtSoles(d.precioRegular) : '—'}</td>
      <td class="td-desc ${d.descuento && d.descuento < 0 ? 'positive' : ''}">${d.descuento !== null ? Math.abs(d.descuento).toFixed(1) + '%' : '—'}</td>
      <td style="color:var(--text2)">${d.vt} ${d.um}</td>
      <td class="td-pxum">${fmtSoles(d.pxum)}<span style="font-size:11px;font-weight:400;color:var(--text3)">/${d.um}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:32px">No se encontraron resultados</td></tr>';
}

// ---- NAV HIGHLIGHT ----
function setupNav() {
    const links = document.querySelectorAll('.nav-link');
    const sections = ['resumen', 'comparar', 'tabla'];
    window.addEventListener('scroll', () => {
        let cur = 'resumen';
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el && window.scrollY >= el.offsetTop - 120) cur = id;
        });
        links.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === '#' + cur);
        });
    });
}

// ---- SUPER CHIPS (dynamic from SUPERMERCADOS) ----
function setupSuperChips() {
    const container = document.getElementById('filter-super');
    if (!container) return;
    container.innerHTML = `
        <button class="chip active" data-value="Todos" onclick="setFilter('super','Todos',this)">Todos</button>
        ${activeSupers().map(s =>
        `<button class="chip" data-value="${s.nombre}" onclick="setFilter('super','${s.nombre}',this)">${s.nombre}</button>`
    ).join('')}`;
}

// ---- FILTERS TOGGLE ----
window.toggleFilters = function () {
    const panel = document.getElementById('filters-panel');
    const btn = document.getElementById('filters-toggle-btn');
    if (!panel) return;
    const isOpen = panel.classList.toggle('open');
    if (btn) btn.classList.toggle('panel-open', isOpen);
};

function updateFilterBadge() {
    const active = ['super', 'tipo', 'categoria', 'marca', 'presentacion'].filter(k => filters[k] !== 'Todos').length;
    const badge = document.getElementById('filter-count-badge');
    const btn = document.getElementById('filters-toggle-btn');
    if (badge) { badge.textContent = active; badge.style.display = active ? 'inline-block' : 'none'; }
    if (btn) btn.classList.toggle('has-active', active > 0);
}

// ---- HAMBURGER MENU ----
function setupHamburger() {
    const btn = document.getElementById('hamburger-btn');
    const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
        nav.setAttribute('aria-hidden', !isOpen);
    });
    window.addEventListener('scroll', closeMobileNav);
}
window.closeMobileNav = function () {
    const btn = document.getElementById('hamburger-btn');
    const nav = document.getElementById('mobile-nav');
    if (nav) nav.classList.remove('open');
    if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', false); }
};

// ---- USER / WELCOME MODAL ----
function showWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) modal.classList.add('visible');
    setTimeout(() => document.getElementById('user-name-input')?.focus(), 100);
}
function hideWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    if (modal) modal.classList.remove('visible');
}
window.submitWelcome = function () {
    const input = document.getElementById('user-name-input');
    const nombre = input?.value?.trim();
    if (!nombre) {
        input?.classList.add('shake');
        setTimeout(() => input?.classList.remove('shake'), 600);
        return;
    }
    UserManager.create(nombre);
    hideWelcomeModal();
    renderGreeting();
    ListaManager.updateBadge();
};
function renderGreeting() {
    const user = UserManager.get();
    const el = document.getElementById('user-greeting');
    if (el) {
        el.textContent = user ? `Hola, ${user.nombre}` : '';
        el.classList.toggle('has-user', !!user);
    }
}
function initUser() {
    if (!UserManager.get()) {
        showWelcomeModal();
    } else {
        renderGreeting();
        ListaManager.updateBadge();
    }
}

// ---- LISTA SIDEBAR ----
window.toggleLista = function () {
    const sidebar = document.getElementById('lista-sidebar');
    const overlay = document.getElementById('lista-overlay');
    if (!sidebar) return;
    if (!UserManager.get()) { showWelcomeModal(); return; }
    const isOpen = !sidebar.classList.contains('open');
    if (isOpen) {
        ListaManager.renderSidebar();
        // Small delay so renderSidebar DOM is ready before the transition starts
        requestAnimationFrame(() => {
            sidebar.style.transform = '';
            sidebar.style.transition = '';
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('visible');
        });
    } else {
        sidebar.style.transform = '';
        sidebar.style.transition = '';
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('visible');
    }
};
window.closeLista = function () {
    const sidebar = document.getElementById('lista-sidebar');
    if (sidebar) { sidebar.classList.remove('open'); sidebar.style.transform = ''; sidebar.style.transition = ''; }
    document.getElementById('lista-overlay')?.classList.remove('visible');
};
window.addToLista = function (btn) {
    const prodKey = decodeURIComponent(btn.dataset.prodKey);
    const nombre = btn.dataset.nombre;
    const categoria = btn.dataset.categoria;
    const um = btn.dataset.um;
    ListaManager.addItem(prodKey, nombre, categoria, um);
};

// ---- INIT ----
function initSwipeSidebar() {
    const sidebar = document.getElementById('lista-sidebar');
    if (!sidebar) return;
    let startX = 0, startY = 0, dragging = false;
    sidebar.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        dragging = false;
        sidebar.style.transition = 'none';
    }, { passive: true });
    sidebar.addEventListener('touchmove', e => {
        const dx = e.touches[0].clientX - startX;
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (!dragging && dy > 10) { sidebar.style.transition = ''; return; }
        if (dx > 0) { dragging = true; sidebar.style.transform = `translateX(${dx}px)`; }
    }, { passive: true });
    sidebar.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        sidebar.style.transition = '';
        sidebar.style.transform = '';
        if (dx > 80) { closeLista(); }
        dragging = false;
    }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
    // Merge datos scrapeados con datos históricos
    // rawData viene de data.js (503 registros históricos Browse.AI)
    // rawDataScraped viene de data-scraped.js (productos scrapeados hoy)
    if (typeof rawDataScraped !== 'undefined' && Array.isArray(rawDataScraped)) {
        // Agregar los datos del scraper al rawData global
        rawDataScraped.forEach(p => rawData.push(p));
        console.log(`[PrecioJusto] Datos scrapeados cargados: ${rawDataScraped.length} productos`);
        console.log(`[PrecioJusto] Total rawData: ${rawData.length} registros`);
    }
    setupSuperChips();
    updateTipoOptions();
    updateMarcaOptions();
    updatePresentacionOptions();
    renderAll();
    setupNav();
    setupHamburger();
    initUser();
    initSwipeSidebar();
    document.getElementById('user-name-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') window.submitWelcome();
    });
});
