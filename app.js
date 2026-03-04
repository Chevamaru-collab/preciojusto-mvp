// ============================================================
// PRECIO JUSTO - OBSERVATORIO DE PRECIOS · app.js
// ============================================================

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
    return s.toLowerCase();
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
    if (cat === 'Todos' || cat === 'Aceite') {
        opts = [
            { v: 'Todos', l: 'Todos los tipos' }, { v: 'Vegetal', l: 'Vegetal' },
            { v: 'De Oliva', l: 'Oliva' }, { v: 'De Girasol', l: 'Girasol' }, { v: 'De Cártamo', l: 'Cártamo' }
        ];
        if (label) label.textContent = 'Tipo de Aceite';
    } else {
        opts = [
            { v: 'Todos', l: 'Todos los tipos' }, { v: 'Extra', l: 'Extra' },
            { v: 'Extra Añejo', l: 'Extra Añejo' }, { v: 'Añejo Extra', l: 'Añejo Extra' },
            { v: 'Superior', l: 'Superior' }, { v: 'Integral', l: 'Integral' }, { v: 'Gran Reserva', l: 'Gran Reserva' }
        ];
        if (label) label.textContent = 'Tipo de Arroz';
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
    // Active class only for chip buttons (Categoría y Supermercado)
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

    // Get all unique dates from rawData
    const dates = [...new Set(rawData.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a));
    if (!dates.length) return;

    const latestDateStr = dates[0];
    const latestDate = parseDate(latestDateStr);
    const now = new Date();
    
    // Reset hours for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let displayDate = '';
    if (latestDate.getTime() === today.getTime()) {
        displayDate = 'hoy';
    } else if (latestDate.getTime() === yesterday.getTime()) {
        displayDate = 'ayer';
    } else {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        displayDate = `el ${latestDate.getDate()} de ${months[latestDate.getMonth()]}`;
    }

    el.innerHTML = `<span class="badge-dot"></span>Actualizado ${displayDate}`;
}

// ---- HERO STATS ----
function renderHeroStats(data) {
    const dates = [...new Set(data.map(d => d.fecha))];
    const prods = [...new Set(data.map(d => d.item))];
    const withDisc = data.filter(d => d.descuento !== null && d.descuento < 0);
    const avgDisc = withDisc.length ? (withDisc.reduce((s, d) => s + Math.abs(d.descuento), 0) / withDisc.length).toFixed(1) : 0;
    const el = document.getElementById('hero-stats');
    el.innerHTML = `
    <div class="hero-stat"><div class="hero-stat-value">${dates.length}</div><div class="hero-stat-label">Días monitoreados</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${prods.length}</div><div class="hero-stat-label">Productos únicos</div></div>
    <div class="hero-stat"><div class="hero-stat-value">2</div><div class="hero-stat-label">Supermercados</div></div>
    <div class="hero-stat"><div class="hero-stat-value">${avgDisc}%</div><div class="hero-stat-label">Descuento promedio</div></div>
  `;
}

// ---- KPI CARDS ----
function renderKPIs(data) {
    const latest = getLatest(data);
    const isArroz = filters.categoria === 'Arroz';
    const um = isArroz ? 'kg' : 'Lt';

    // Precio más barato — usa fecha más reciente
    const cheapestLatest = latest.filter(d => d.pxum).length
        ? latest.filter(d => d.pxum).reduce((m, d) => d.pxum < m.pxum ? d : m, latest.filter(d => d.pxum)[0])
        : null;
    const minPxum = cheapestLatest ? cheapestLatest.pxum : 0;
    const cheapestSuperLabel = (filters.super === 'Todos' && cheapestLatest)
        ? ` · ${cheapestLatest.super}` : '';

    // Mayor descuento — SOLO fecha más reciente
    const withDiscLatest = latest.filter(d => d.descuento !== null && d.descuento < 0);
    const maxDisc = withDiscLatest.length
        ? withDiscLatest.reduce((m, d) => d.descuento < m.descuento ? d : m, withDiscLatest[0])
        : { descuento: 0, item: 'Sin ofertas hoy' };

    const avgPxum = latest.length ? (latest.reduce((s, d) => s + (d.pxum || 0), 0) / latest.length).toFixed(2) : 0;
    const totalObs = data.length;

    // Rango de fechas dinámico
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

    const prodKey = d => `${d.tipo}|${d.clase || 'N/A'}|${d.presentacion}${d.um || 'u'}`;
    const byProd = {};
    recent.forEach(d => {
        const k = prodKey(d);
        if (!byProd[k]) byProd[k] = {};
        if (!byProd[k][d.super] || d.pxum < byProd[k][d.super].pxum) byProd[k][d.super] = d;
    });

    const compared = Object.entries(byProd).filter(([, supers]) => supers['Metro'] && supers['Wong']);
    if (!compared.length) return null;

    const [, bestSupers] = compared.reduce((maxPair, curr) => {
        const [, cs] = curr;
        const [, ms] = maxPair;
        return Math.abs(cs['Metro'].pxum - cs['Wong'].pxum) > Math.abs(ms['Metro'].pxum - ms['Wong'].pxum)
            ? curr : maxPair;
    });
    return { metro: bestSupers['Metro'], wong: bestSupers['Wong'] };
}

function insightCardHTML(metro, wong) {
    const metroWins = metro.pxum <= wong.pxum;
    const winner = metroWins ? metro : wong;
    const loser = metroWins ? wong : metro;
    const winnerName = metroWins ? 'Metro' : 'Wong';
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
        <div class="insight-compare-row ${metroWins ? 'insight-winner-row' : ''}">
          <span class="insight-super-name"><span class="super-dot metro"></span>Metro</span>
          <span class="insight-price-sm ${metroWins ? 'winner' : 'loser'}">${fmtSoles(metro.pxum)}<small>/${um}</small></span>
        </div>
        <div class="insight-compare-row ${!metroWins ? 'insight-winner-row' : ''}">
          <span class="insight-super-name"><span class="super-dot wong"></span>Wong</span>
          <span class="insight-price-sm ${!metroWins ? 'winner' : 'loser'}">${fmtSoles(wong.pxum)}<small>/${um}</small></span>
        </div>
        <div class="insight-savings">↓ Ahorras ${fmtSoles(savings)} / ${um}</div>
      </div>`;
}

function renderInsightHero(data) {
    const el = document.getElementById('insight-card');
    if (!el) return;

    if (filters.categoria === 'Todos') {
        const aceiteInsight = buildBestInsight(data.filter(d => d.categoria === 'Aceite'));
        const arrozInsight  = buildBestInsight(data.filter(d => d.categoria === 'Arroz'));

        if (!aceiteInsight && !arrozInsight) {
            el.className = 'insight-card';
            el.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Sin datos comparables disponibles</p>';
            return;
        }
        el.className = 'insight-card insight-card--dual';
        el.innerHTML = [
            aceiteInsight ? `<div class="insight-panel">${insightCardHTML(aceiteInsight.metro, aceiteInsight.wong)}</div>` : '',
            arrozInsight  ? `<div class="insight-panel">${insightCardHTML(arrozInsight.metro,  arrozInsight.wong)}</div>`  : ''
        ].join('');
    } else {
        const insight = buildBestInsight(data);
        el.className = 'insight-card';
        if (!insight) {
            el.innerHTML = '<p style="color:var(--text3);text-align:center;padding:24px">Sin datos comparables disponibles</p>';
            return;
        }
        el.innerHTML = insightCardHTML(insight.metro, insight.wong);
    }
}

// ---- COMPARE GRID ----
function renderCompare(data) {
    // Use last 3 days to capture both Metro and Wong data
    const sortedDates = [...new Set(data.map(d => d.fecha))].sort((a, b) => parseDate(b) - parseDate(a));
    const recentDates = new Set(sortedDates.slice(0, 3));
    const recent = data.filter(d => recentDates.has(d.fecha));

    // Group by tipo+clase+presentacion for comparison
    const prodKey = d => `${d.tipo}|${d.clase || 'N/A'}|${d.presentacion}${d.um || 'u'}`;
    const byProd = {};
    recent.forEach(d => {
        const k = prodKey(d);
        if (!byProd[k]) byProd[k] = {};
        if (!byProd[k][d.super] || d.pxum < byProd[k][d.super].pxum) {
            byProd[k][d.super] = d;
        }
    });

    // Only show products with data from both supermarkets
    const compared = Object.entries(byProd).filter(([, supers]) => supers['Metro'] && supers['Wong']);
    const container = document.getElementById('compare-grid');

    if (!compared.length) {
        container.innerHTML = '<p style="color:var(--text3);grid-column:1/-1">No hay productos comparables en ambos supers para la fecha seleccionada.</p>';
        return;
    }

    container.innerHTML = compared.slice(0, 9).map(([, supers]) => {
        const metro = supers['Metro'];
        const wong = supers['Wong'];
        const metroWins = metro.pxum <= wong.pxum;
        const isArrozItem = metro.categoria === 'Arroz';
        const icon = isArrozItem ? '🌾' : '🛢️';
        const sizeLabel = `${metro.presentacion} ${metro.um || (isArrozItem ? 'kg' : 'L')}`;
        const unit = metro.um || (isArrozItem ? 'kg' : 'Lt');
        return `
      <div class="compare-card">
        <div class="compare-product">${icon} ${metro.tipo} ${metro.clase ? '· ' + metro.clase : ''} · ${sizeLabel}</div>
        <div class="compare-row">
          <div class="compare-super">
            <div class="super-dot metro"></div> Metro
            ${metroWins ? '<span class="winner-badge">+ barato</span>' : ''}
          </div>
          <div class="compare-prices">
            <div class="compare-pxum ${metroWins ? 'winner' : 'loser'}">${fmtSoles(metro.pxum)}<span style="font-size:11px;font-weight:400;color:var(--text3)">/${unit}</span></div>
            <div class="compare-label">${fmtSoles(metro.precioOnline)} online</div>
          </div>
        </div>
        <div class="compare-row">
          <div class="compare-super">
            <div class="super-dot wong"></div> Wong
            ${!metroWins ? '<span class="winner-badge">+ barato</span>' : ''}
          </div>
          <div class="compare-prices">
            <div class="compare-pxum ${!metroWins ? 'winner' : 'loser'}">${fmtSoles(wong.pxum)}<span style="font-size:11px;font-weight:400;color:var(--text3)">/${unit}</span></div>
            <div class="compare-label">${fmtSoles(wong.precioOnline)} online</div>
          </div>
        </div>
      </div>
    `;
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

    const latestDate = latest[0]?.fecha || '';
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
        ['Metro', 'Wong'].forEach(s => {
            const deals = withDisc.filter(d => d.super === s);
            if (!deals.length) return;
            html += `
            <div class="deals-super-section">
              <div class="deals-super-header ${s.toLowerCase()}">${s}</div>
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

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    updateTipoOptions();
    updateMarcaOptions();
    updatePresentacionOptions();
    renderAll();
    setupNav();
    setupHamburger();
});
