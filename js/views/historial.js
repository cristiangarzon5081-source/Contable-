/**
 * CONTABLE - Vista Historial
 */

const HistorialView = (() => {
  let filtroTipo = 'todos';
  let filtroCuenta = 'todas';
  let busqueda = '';
  let movSeleccionado = null;

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="historial-wrap fade-in">
        <div class="search-bar">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="search-input" id="search-input" placeholder="Buscar movimiento..." value="${busqueda}" />
        </div>
        <div class="filtros-row" id="filtros-tipo">
          ${['todos','ingreso','egreso'].map(t =>
            `<button class="filtro-chip ${filtroTipo === t ? 'active' : ''}" data-tipo="${t}">
              ${t === 'todos' ? 'Todos' : t === 'ingreso' ? '↑ Ingresos' : '↓ Egresos'}
            </button>`
          ).join('')}
          <button class="filtro-chip ${filtroCuenta !== 'todas' ? 'active' : ''}" id="btn-filtro-cuenta">
            🏦 ${filtroCuenta === 'todas' ? 'Todas' : filtroCuenta}
          </button>
        </div>
        <div id="lista-movimientos"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>
      </div>
    `;

    bindInputEvents();
    await cargarMovimientos();
  }

  async function cargarMovimientos() {
    try {
      const filtros = {};
      if (filtroTipo !== 'todos') filtros.tipo = filtroTipo;
      if (filtroCuenta !== 'todas') filtros.cuenta = filtroCuenta;
      if (busqueda) filtros.q = busqueda;

      const movimientos = await DB.obtenerMovimientos(filtros);
      renderLista(movimientos);
    } catch (e) {
      document.getElementById('lista-movimientos').innerHTML =
        '<div class="empty-state"><p>Error al cargar</p></div>';
    }
  }

  function renderLista(movimientos) {
    const container = document.getElementById('lista-movimientos');
    if (!movimientos.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Sin resultados</div>
          <p>Intenta con otro filtro o búsqueda</p>
        </div>
      `;
      return;
    }

    // Agrupar por fecha
    const grupos = {};
    for (const m of movimientos) {
      const fecha = m.fecha;
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(m);
    }

    // Total del período visible
    const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

    let html = `
      <div class="card card-sm" style="margin:0 16px 12px; display:flex; gap:12px; align-items:center;">
        <div style="flex:1; text-align:center;">
          <div style="font-size:11px;color:var(--text3)">Ingresos</div>
          <div style="font-size:15px;font-weight:700;color:var(--green)">${Parser.formatCOP(totalIngresos, true)}</div>
        </div>
        <div style="width:1px;height:30px;background:var(--border)"></div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:11px;color:var(--text3)">Egresos</div>
          <div style="font-size:15px;font-weight:700;color:var(--red)">${Parser.formatCOP(totalEgresos, true)}</div>
        </div>
        <div style="width:1px;height:30px;background:var(--border)"></div>
        <div style="flex:1; text-align:center;">
          <div style="font-size:11px;color:var(--text3)">Saldo</div>
          <div style="font-size:15px;font-weight:700;color:${totalIngresos-totalEgresos>=0?'var(--green)':'var(--red)'}">${Parser.formatCOP(totalIngresos - totalEgresos, true)}</div>
        </div>
      </div>
    `;

    for (const fecha of Object.keys(grupos).sort().reverse()) {
      const items = grupos[fecha];
      const totalDia = items.reduce((s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0);
      html += `
        <div class="grupo-fecha">
          <div class="grupo-label" style="display:flex;justify-content:space-between;padding-right:16px;">
            <span>${Parser.fechaLegible(fecha)}</span>
            <span style="color:${totalDia>=0?'var(--green)':'var(--red)'}">${totalDia>=0?'+':''}${Parser.formatCOP(totalDia, true)}</span>
          </div>
          <div class="card" style="padding:0;overflow:hidden;">
            ${items.map(m => buildMovItem(m)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
    bindMovItems();
  }

  function buildMovItem(m) {
    const cat = Parser.CATEGORIAS[m.categoria] || Parser.CATEGORIAS.otros;
    const cuentaLabel = { efectivo: 'Efectivo', tarjeta_debito: 'T. Débito', tarjeta_credito: 'T. Crédito', banco: 'Banco' };
    return `
      <div class="mov-item" data-id="${m.id}">
        <div class="mov-icon" style="background:${m.tipo === 'ingreso' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}">
          ${cat.emoji}
        </div>
        <div class="mov-info">
          <div class="mov-desc">${m.descripcion || cat.emoji + ' ' + m.categoria}</div>
          <div class="mov-meta">${cuentaLabel[m.cuenta] || m.cuenta} · ${m.categoria}</div>
        </div>
        <div class="mov-monto ${m.tipo}">${m.tipo === 'ingreso' ? '+' : '-'}${Parser.formatCOP(m.monto)}</div>
      </div>
      <div class="mov-item-detail" id="detail-${m.id}">
        <div style="font-size:13px;color:var(--text2);margin-bottom:8px;">
          ${m.descripcion ? `<strong>${m.descripcion}</strong><br>` : ''}
          Categoría: ${cat.emoji} ${m.categoria} · Cuenta: ${cuentaLabel[m.cuenta] || m.cuenta}<br>
          Fecha: ${m.fecha}
        </div>
        <div class="detail-actions">
          <button class="btn-detail btn-delete" data-delete="${m.id}">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }

  function bindMovItems() {
    document.querySelectorAll('.mov-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const detail = document.getElementById(`detail-${id}`);
        if (!detail) return;
        const abierto = detail.classList.contains('open');
        // Cerrar todos
        document.querySelectorAll('.mov-item-detail.open').forEach(d => d.classList.remove('open'));
        if (!abierto) detail.classList.add('open');
      });
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.delete);
        if (confirm('¿Eliminar este movimiento?')) {
          await DB.eliminarMovimiento(id);
          await cargarMovimientos();
        }
      });
    });
  }

  function bindInputEvents() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', e => {
        clearTimeout(timeout);
        busqueda = e.target.value;
        timeout = setTimeout(cargarMovimientos, 300);
      });
    }

    document.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.addEventListener('click', () => {
        filtroTipo = btn.dataset.tipo;
        document.querySelectorAll('[data-tipo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cargarMovimientos();
      });
    });

    const btnCuenta = document.getElementById('btn-filtro-cuenta');
    if (btnCuenta) {
      btnCuenta.addEventListener('click', () => {
        const cuentas = ['todas', 'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'banco'];
        const idx = cuentas.indexOf(filtroCuenta);
        filtroCuenta = cuentas[(idx + 1) % cuentas.length];
        const labels = { todas: 'Todas', efectivo: 'Efectivo', tarjeta_debito: 'T. Débito', tarjeta_credito: 'T. Crédito', banco: 'Banco' };
        btnCuenta.textContent = '🏦 ' + labels[filtroCuenta];
        btnCuenta.classList.toggle('active', filtroCuenta !== 'todas');
        cargarMovimientos();
      });
    }
  }

  return { render };
})();
