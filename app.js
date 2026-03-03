// ============================================================
// PRECIO JUSTO - OBSERVATORIO DE PRECIOS · app.js
// ============================================================

// ---- STATE ----
let filters = { super: 'Todos', tipo: 'Todos', categoria: 'Todos' };
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
        return true;
    });
}
function updateTipoChips() {
    const cat = filters.categoria;
    const tipoEl = document.getElementById('filter-tipo');
    const label = document.getElementById('filter-tipo-label');
    let chips = [];
    if (cat === 'Todos' || cat === 'Aceite') {
        chips = [
            { v: 'Todos', l: 'Todos' }, { v: 'Vegetal', l: 'Vegetal' }, { v: 'De Oliva', l: 'Oliva' },
            { v: 'De Girasol', l: 'Girasol' }, { v: 'De Cártamo', l: 'Cártamo' }
        ];
        if (label) label.textContent = 'Tipo de Aceite';
    } else {
        chips = [
            { v: 'Todos', l: 'Todos' }, { v: 'Extra', l: 'Extra' }, { v: 'Extra Añejo', l: 'Extra Añejo' },
            { v: 'Superior', l: 'Superior' }, { v: 'Integral', l: 'Integral' }, { v: 'Gran Reserva', l: 'Gran Reserva' }
        ];
        if (label) label.textContent = 'Tipo de Arroz';
    }
    if (tipoEl) {
        tipoEl.innerHTML = chips.map(c =>
            `<button class="chip${filters.tipo === c.v ? ' active' : ''}" data-value="${c.v}" onclick="setFilter('tipo','${c.v}',this)">${c.l}</button>`
        ).join('');
    }
}
function getLatest(data) {
    const sorted = [...data].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
    const maxDate = sorted[0]?.fecha;
    return data.filter(d => d.fecha === maxDate);
}

// ---- FILTER TOGGLE ----
window.setFilter = function (dim, value, el) {
    filters[dim] = value;
    // reset tipo when category changes
    if (dim === 'categoria') { filters.tipo = 'Todos'; updateTipoChips(); }
    el.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderAll();
};

// ---- RENDER ALL ----
function renderAll() {
    const filtered = getFiltered(rawData);
    renderHeroStats(filtered);
    renderKPIs(filtered);
    renderTrendChart(filtered);
    renderTypeChart(filtered);
    renderDiscountChart(filtered);
    renderCompare(filtered);
    renderDeals(filtered);
    renderTable(filtered);
}

// ---- HERO STATS ----
function renderHeroStats(data) {
    const latestDate = [...data].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha))[0]?.fecha || '--';
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
    const sorted = [...data].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
    const latest = getLatest(sorted);
    const isArroz = filters.categoria === 'Arroz';
    const um = isArroz ? 'kg' : 'Lt';

    const cheapestLatest = latest.length ? latest.reduce((m, d) => d.pxum < m.pxum ? d : m, latest[0]) : null;
    const minPxum = cheapestLatest ? cheapestLatest.pxum : 0;
    const maxDisc = data.filter(d => d.descuento).reduce((m, d) => d.descuento < m.descuento ? d : m, { descuento: 0, item: 'N/A' });
    const avgPxum = latest.length ? (latest.reduce((s, d) => s + d.pxum, 0) / latest.length).toFixed(2) : 0;
    const totalObs = data.length;
    const icon = isArroz ? '🌾' : '🛢️';
    const catLabel = isArroz ? 'Arroz' : 'Aceite Vegetal';

    const container = document.getElementById('kpi-grid');
    container.innerHTML = `
    <div class="kpi-card blue">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-label">${catLabel} más barato / ${um}</div>
      <div class="kpi-value">${fmtSoles(minPxum)} <span>/ ${um}</span></div>
      <div class="kpi-sub">Precio online más reciente</div>
      <div class="kpi-badge down">🏆 Mejor precio</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-icon">💰</div>
      <div class="kpi-label">Mayor Descuento</div>
      <div class="kpi-value">${Math.abs(maxDisc.descuento || 0).toFixed(1)} <span>%</span></div>
      <div class="kpi-sub" style="max-width:200px;line-height:1.4">${(maxDisc.item || '').substring(0, 40)}...</div>
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
      <div class="kpi-sub">Feb 16 – Mar 2, 2026</div>
    </div>
  `;
}

// ---- TREND CHART ----
let trendChartInst = null;
function renderTrendChart(data) {
    const isArroz = filters.categoria === 'Arroz';
    const um = isArroz ? 'kg' : 'Lt';
    const tipoActivo = filters.tipo;

    let chartData;
    if (isArroz) {
        // For arroz: use all 5kg bags of the selected tipo (or all if Todos)
        chartData = data.filter(d => d.categoria === 'Arroz' && d.presentacion === 5);
    } else if (tipoActivo !== 'Todos') {
        // Specific tipo selected (e.g. Oliva, Girasol) — use all items of that tipo
        chartData = data.filter(d => d.tipo === tipoActivo);
    } else {
        // categoria=Todos: Arroz usa S/Kg y Aceite usa S/Lt — no son comparables en la misma escala.
        // Mostramos solo Aceite Vegetal como referencia del mercado.
        chartData = data.filter(d => d.categoria === 'Aceite' && d.tipo === 'Vegetal');
    }

    const allDates = [...new Set(chartData.map(d => d.fecha))].sort((a, b) => parseDate(a) - parseDate(b));

    function getDailyMin(superName, dates, data) {
        return dates.map(date => {
            const items = data.filter(d => d.super === superName && d.fecha === date);
            if (!items.length) return null;
            return Math.min(...items.map(d => d.pxum));
        });
    }

    const metroVals = getDailyMin('Metro', allDates, chartData);
    const wongVals = getDailyMin('Wong', allDates, chartData);

    const labels = allDates.map(d => {
        const p = d.split('/');
        return `${p[0]}/${p[1]}`;
    });

    document.getElementById('trend-legend').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#e84040"></div>Metro</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f5a623"></div>Wong</div>
  `;
    const title = document.querySelector('.chart-card--wide .chart-title');
    if (title) title.textContent = isArroz ? 'Precio x Kg — Metro vs Wong' : 'Precio x Litro — Metro vs Wong';

    const desc = document.querySelector('#tendencias .section-desc');
    if (desc) {
        if (isArroz) desc.textContent = 'Evolución del precio por kg (S/ x Kg) en el tiempo';
        else if (filters.categoria === 'Todos') desc.textContent = 'Aceite Vegetal · S/ x Litro (selecciona "Aceite" o "Arroz" para ver todos los tipos)';
        else desc.textContent = `${tipoActivo === 'Todos' ? 'Todos los tipos' : tipoActivo} · Evolución del precio por litro (S/ x Lt)`;
    }

    if (!allDates.length) {
        if (trendChartInst) trendChartInst.destroy(); trendChartInst = null; return;
    }

    const ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChartInst) trendChartInst.destroy();
    trendChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Metro', data: metroVals, borderColor: '#e84040', backgroundColor: 'rgba(232,64,64,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#e84040', pointRadius: 4, pointHoverRadius: 6, spanGaps: true },
                { label: 'Wong', data: wongVals, borderColor: '#f5a623', backgroundColor: 'rgba(245,166,35,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#f5a623', pointRadius: 4, pointHoverRadius: 6, spanGaps: true }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2235', borderColor: '#2d3b55', borderWidth: 1,
                    titleColor: '#8892a4', bodyColor: '#f0f4ff',
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: S/ ${ctx.parsed.y?.toFixed(2)} / ${um}` }
                }
            },
            scales: {
                x: { ticks: { color: '#5a6480', font: { size: 11 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#5a6480', font: { size: 11 }, callback: v => 'S/' + v.toFixed(2) }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });
}

// ---- TYPE CHART (donut) ----
let typeChartInst = null;
function renderTypeChart(data) {
    // Dedup por item (no por fecha) para que tipos con scrapes esporádicos no desaparezcan
    const seenItems = new Set();
    const counts = {};
    [...data]
        .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha))
        .forEach(d => {
            if (seenItems.has(d.item)) return;
            seenItems.add(d.item);
            const t = d.tipo || 'Otro';
            counts[t] = (counts[t] || 0) + 1;
        });
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const colors = ['#4f8ef7', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

    const chartTitleEl = document.querySelector('#typeChart')?.closest('.chart-card')?.querySelector('.chart-title');
    if (chartTitleEl) {
        chartTitleEl.textContent = filters.categoria === 'Arroz' ? 'Distribución por Tipo de Arroz'
            : filters.categoria === 'Aceite' ? 'Distribución por Tipo de Aceite'
            : 'Distribución por Tipo';
    }

    const ctx = document.getElementById('typeChart').getContext('2d');
    if (typeChartInst) typeChartInst.destroy();
    typeChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#111827', borderWidth: 3,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#8892a4', font: { size: 11 }, padding: 12, boxWidth: 10, boxHeight: 10 }
                },
                tooltip: {
                    backgroundColor: '#1a2235', borderColor: '#2d3b55', borderWidth: 1,
                    bodyColor: '#f0f4ff',
                }
            }
        }
    });
}

// ---- DISCOUNT CHART (bar) ----
let discChartInst = null;
function renderDiscountChart(data) {
    const withDisc = data.filter(d => d.descuento !== null && d.descuento < 0);
    const subtitleEl = document.getElementById('discount-chart-sub');
    const bySuper = {};
    withDisc.forEach(d => {
        if (!bySuper[d.super]) bySuper[d.super] = [];
        bySuper[d.super].push(Math.abs(d.descuento));
    });
    const supers = Object.keys(bySuper);

    if (!supers.length) {
        if (discChartInst) discChartInst.destroy(); discChartInst = null;
        if (subtitleEl) subtitleEl.textContent = 'No hay productos en oferta para el filtro seleccionado.';
        return;
    }

    if (subtitleEl) subtitleEl.textContent = `Promedio entre los ${withDisc.length} productos en oferta (precio online vs. regular)`;

    const avgs = supers.map(s => (bySuper[s].reduce((a, b) => a + b, 0) / bySuper[s].length).toFixed(1));
    const colors = supers.map(s => s === 'Metro' ? '#e84040' : '#f5a623');

    const ctx = document.getElementById('discountChart').getContext('2d');
    if (discChartInst) discChartInst.destroy();
    discChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: supers,
            datasets: [{
                label: 'Descuento Promedio %',
                data: avgs,
                backgroundColor: colors,
                borderRadius: 8, borderSkipped: false,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2235', borderColor: '#2d3b55', borderWidth: 1,
                    bodyColor: '#f0f4ff',
                    callbacks: { label: c => {
                        const n = bySuper[c.label]?.length || 0;
                        return ` ${c.parsed.y}% prom. sobre ${n} producto${n !== 1 ? 's' : ''} en oferta`;
                    }}
                }
            },
            scales: {
                x: { ticks: { color: '#8892a4' }, grid: { display: false } },
                y: {
                    ticks: { color: '#5a6480', callback: v => v + '%' },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            }
        }
    });
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
    const compared = Object.entries(byProd).filter(([k, supers]) => supers['Metro'] && supers['Wong']);
    const container = document.getElementById('compare-grid');

    if (!compared.length) {
        container.innerHTML = '<p style="color:var(--text3);grid-column:1/-1">No hay productos comparables en ambos supers para la fecha seleccionada.</p>';
        return;
    }

    container.innerHTML = compared.slice(0, 9).map(([k, supers]) => {
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
    const withDisc = data.filter(d => d.descuento !== null && d.descuento <= -10);
    const sorted = [...withDisc].sort((a, b) => a.descuento - b.descuento).slice(0, 8);
    const container = document.getElementById('deals-grid');
    if (!sorted.length) {
        container.innerHTML = '<p style="color:var(--text3)">No se encontraron ofertas con los filtros seleccionados.</p>';
        return;
    }
    container.innerHTML = sorted.map(d => `
    <div class="deal-card">
      <div class="deal-badge">${Math.abs(d.descuento).toFixed(0)}% OFF</div>
      <div class="deal-super ${superClass(d.super)}">${d.super}</div>
      <div class="deal-name">${d.item}</div>
      <div class="deal-prices">
        <div class="deal-online">${fmtSoles(d.precioOnline)}</div>
        ${d.precioRegular > 0 ? `<div class="deal-regular">${fmtSoles(d.precioRegular)}</div>` : ''}
      </div>
      <div class="deal-pxum">${fmtSoles(d.pxum)} / ${d.um} · ${d.fecha}</div>
    </div>
  `).join('');
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
    const sections = ['resumen', 'tendencias', 'comparar', 'tabla'];
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
    renderAll();
    setupNav();
    setupHamburger();
});
