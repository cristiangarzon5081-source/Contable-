/**
 * CONTABLE - Vista Estadísticas
 * Tabs: Semana / Mes / Año
 * Gráfico de pastel SVG interactivo
 */

const EstadisticasView = (() => {
  let _todos = [];
  let _presupuestos = [];
  let _tab = 'mes';
  let _tipoVista = 'egresos';   // ← 'egresos' | 'ingresos'
  let _añoSel = new Date().getFullYear();
  let _mesSel  = new Date().getMonth();
  let _semanaSel = 0;
  let _catPasteActiva = null;

  const COLORES = [
    '#f87171','#fb923c','#fbbf24','#34d399','#60a5fa',
    '#a78bfa','#f472b6','#67e8f9','#86efac','#fda4af',
    '#c4b5fd','#6ee7b7','#93c5fd','#fcd34d','#a5b4fc'
  ];

  // ── RENDER PRINCIPAL ──────────────────────────────────────────
  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="stats-wrap fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>`;
    try {
      [_todos, _presupuestos] = await Promise.all([
        DB.obtenerMovimientos(), DB.obtenerPresupuestos()
      ]);
      await Parser.cargarCatsPersonalizadas();
      if (!_todos.length) {
        container.innerHTML = `<div class="stats-wrap fade-in"><div class="empty-state">
          <div class="empty-icon">📊</div><div class="empty-title">Sin datos aún</div>
          <p>Registra movimientos para ver estadísticas</p></div></div>`;
        return;
      }
      pintarVista(container);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><p>Error al cargar</p></div>`;
    }
  }

  function pintarVista(container) {
    const años = getAñosDisponibles();
    if (!años.includes(_añoSel)) _añoSel = años[0];

    container.innerHTML = `
      <div class="stats-wrap fade-in">
        <!-- Tabs semana/mes/año -->
        <div class="stats-tabs-row">
          ${['semana','mes','año'].map(t => `
            <button class="stats-tab ${_tab === t ? 'active' : ''}" data-tab="${t}">
              ${t.charAt(0).toUpperCase() + t.slice(1)}
            </button>`).join('')}
        </div>

        <!-- Selector de período según tab -->
        <div class="stats-periodo-row" id="stats-periodo-row">
          ${buildSelectorPeriodo(años)}
        </div>

        <!-- Mini-selector Egresos / Ingresos -->
        <div class="stats-tipo-row">
          <button class="stats-tipo-btn ${_tipoVista === 'egresos' ? 'active egreso' : ''}" data-tipo="egresos">
            ↓ Egresos
          </button>
          <button class="stats-tipo-btn ${_tipoVista === 'ingresos' ? 'active ingreso' : ''}" data-tipo="ingresos">
            ↑ Ingresos
          </button>
        </div>

        <!-- Contenido dinámico -->
        <div id="stats-content"></div>
      </div>
    `;

    // Bindings de tabs
    container.querySelectorAll('.stats-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _catPasteActiva = null;
        pintarVista(container);
      });
    });

    // Bindings del mini-selector
    container.querySelectorAll('.stats-tipo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _tipoVista = btn.dataset.tipo;
        _catPasteActiva = null;
        // Actualizar estilos del toggle sin re-pintar toda la vista
        container.querySelectorAll('.stats-tipo-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tipo === _tipoVista);
          b.classList.toggle('egreso', b.dataset.tipo === 'egresos' && _tipoVista === 'egresos');
          b.classList.toggle('ingreso', b.dataset.tipo === 'ingresos' && _tipoVista === 'ingresos');
        });
        renderContenido();
      });
    });

    bindSelectorPeriodo(container, años);
    renderContenido();
  }

  // ── SELECTOR DE PERÍODO ───────────────────────────────────────
  function buildSelectorPeriodo(años) {
    if (_tab === 'semana') {
      const labels = getLabelsSemanales();
      return `<select class="stats-period-sel" id="sel-semana">
        ${labels.map((l, i) => `<option value="${i}" ${_semanaSel === i ? 'selected' : ''}>${l}</option>`).join('')}
      </select>`;
    }
    if (_tab === 'mes') {
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `
        <select class="stats-period-sel" id="sel-mes">
          ${meses.map((m, i) => `<option value="${i}" ${_mesSel === i ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="stats-period-sel" id="sel-año-mes">
          ${años.map(a => `<option value="${a}" ${_añoSel === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>`;
    }
    // año
    return `<select class="stats-period-sel" id="sel-año">
      ${años.map(a => `<option value="${a}" ${_añoSel === a ? 'selected' : ''}>${a}</option>`).join('')}
    </select>`;
  }

  function getLabelsSemanales() {
    const labels = [];
    for (let i = 0; i <= 7; i++) {
      const lunes = getLunesDeSemana(i);
      const dom   = new Date(lunes); dom.setDate(lunes.getDate() + 6);
      if (i === 0) labels.push(`Esta semana (${fmtDia(lunes)} – ${fmtDia(dom)})`);
      else labels.push(`${fmtDia(lunes)} – ${fmtDia(dom)}`);
    }
    return labels;
  }

  function fmtDia(d) {
    return `${d.getDate()} ${Parser.nombreMes(d.getMonth())}`;
  }

  function getLunesDeSemana(offsetSemanas) {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1) - offsetSemanas * 7);
    lunes.setHours(0,0,0,0);
    return lunes;
  }

  function bindSelectorPeriodo(container, años) {
    const selSem  = document.getElementById('sel-semana');
    const selMes  = document.getElementById('sel-mes');
    const selAñoM = document.getElementById('sel-año-mes');
    const selAño  = document.getElementById('sel-año');

    if (selSem)  selSem.onchange  = e => { _semanaSel = parseInt(e.target.value); renderContenido(); };
    if (selMes)  selMes.onchange  = e => { _mesSel  = parseInt(e.target.value); renderContenido(); };
    if (selAñoM) selAñoM.onchange = e => { _añoSel  = parseInt(e.target.value); renderContenido(); };
    if (selAño)  selAño.onchange  = e => { _añoSel  = parseInt(e.target.value); renderContenido(); };
  }

  // ── CONTENIDO SEGÚN TAB ───────────────────────────────────────
  function renderContenido() {
    const el = document.getElementById('stats-content');
    if (!el) return;
    if (_tab === 'semana') el.innerHTML = buildSemana();
    if (_tab === 'mes')    el.innerHTML = buildMes();
    if (_tab === 'año')    el.innerHTML = buildAño();
    bindCatItems();
    if (_tab !== 'semana') bindPastel();
  }

  // ══ TAB SEMANA ════════════════════════════════════════════════
  function buildSemana() {
    const lunes = getLunesDeSemana(_semanaSel);
    const dom   = new Date(lunes); dom.setDate(lunes.getDate() + 6);
    const desde = lunes.toISOString().split('T')[0];
    const hasta = dom.toISOString().split('T')[0];

    const tipo = _tipoVista === 'egresos' ? 'egreso' : 'ingreso';
    const movs = _todos.filter(m => m.fecha >= desde && m.fecha <= hasta);
    const principal = movs.filter(m => m.tipo === tipo).reduce((s,m) => s+m.monto, 0);
    const secundario = movs.filter(m => m.tipo !== tipo && m.tipo !== 'ninguno').reduce((s,m) => s+m.monto, 0);
    const labelPrincipal = _tipoVista === 'egresos' ? 'Egresos' : 'Ingresos';
    const labelSecundario = _tipoVista === 'egresos' ? 'Ingresos' : 'Egresos';
    const colorPrincipal = _tipoVista === 'egresos' ? 'text-red' : 'text-green';
    const colorSaldo = principal - secundario <= 0 ? 'text-green' : 'text-red';

    // Semana anterior
    const lunesAnt = getLunesDeSemana(_semanaSel + 1);
    const domAnt   = new Date(lunesAnt); domAnt.setDate(lunesAnt.getDate() + 6);
    const antPrincipal = _todos
      .filter(m => m.tipo === tipo && m.fecha >= lunesAnt.toISOString().split('T')[0] && m.fecha <= domAnt.toISOString().split('T')[0])
      .reduce((s,m) => s+m.monto, 0);
    const diff = principal - antPrincipal;
    const mejoro = _tipoVista === 'egresos' ? diff < 0 : diff > 0;

    // Por día
    const diasNombre = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const porDia = Array(7).fill(0);
    for (const m of movs.filter(m => m.tipo === tipo)) {
      const idx = (new Date(m.fecha + 'T12:00:00').getDay() + 6) % 7;
      porDia[idx] += m.monto;
    }
    const maxDia = Math.max(...porDia, 1);
    const barColor = _tipoVista === 'egresos' ? 'var(--red)' : 'var(--green)';

    const { porCat, totalCat } = calcularCategorias(movs.filter(m => m.tipo === tipo));
    const catOrdenadas = Object.entries(porCat).sort((a,b) => b[1]-a[1]);

    return `
      <div class="stats-resumen-cards">
        <div class="stat-card"><div class="stat-label">${labelPrincipal}</div><div class="stat-val ${colorPrincipal}">${Parser.formatCOP(principal)}</div></div>
        <div class="stat-card"><div class="stat-label">${labelSecundario}</div><div class="stat-val ${_tipoVista==='egresos'?'text-green':'text-red'}">${Parser.formatCOP(secundario)}</div></div>
        <div class="stat-card" style="grid-column:span 2"><div class="stat-label">Saldo semana</div><div class="stat-val ${colorSaldo}">${Parser.formatCOP(Math.abs(secundario-principal))} ${secundario>=principal?'a favor':'déficit'}</div></div>
      </div>

      ${antPrincipal > 0 ? `
        <div class="chart-wrap">
          <div class="stats-comp-banner ${mejoro ? 'mejor' : 'peor'}">
            ${mejoro ? (_tipoVista==='egresos'?'📉':'📈') : (_tipoVista==='egresos'?'📈':'📉')}
            ${_tipoVista === 'egresos'
              ? (mejoro ? `Gastaste <strong>${Parser.formatCOP(Math.abs(diff))}</strong> menos que la semana anterior`
                        : `Gastaste <strong>${Parser.formatCOP(Math.abs(diff))}</strong> más que la semana anterior`)
              : (mejoro ? `Recibiste <strong>${Parser.formatCOP(Math.abs(diff))}</strong> más que la semana anterior`
                        : `Recibiste <strong>${Parser.formatCOP(Math.abs(diff))}</strong> menos que la semana anterior`)}
          </div>
        </div>
      ` : ''}

      <div class="chart-wrap">
        <div class="chart-title">📅 ${labelPrincipal} por día</div>
        <div style="display:flex;gap:6px;align-items:flex-end;height:90px;">
          ${diasNombre.map((n, i) => {
            const h = maxDia > 0 ? Math.max(4, Math.round((porDia[i]/maxDia)*80)) : 4;
            const esMax = porDia[i] === Math.max(...porDia) && porDia[i] > 0;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;justify-content:flex-end;height:100%;">
              <div style="width:100%;height:${h}px;background:${esMax ? barColor : 'var(--bg3)'};border-radius:4px 4px 0 0;opacity:${esMax?1:0.5}"></div>
              <div style="font-size:10px;color:${esMax?'var(--text)':'var(--text3)'}">${n}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${catOrdenadas.length ? buildSeccionCategorias(catOrdenadas, totalCat, `${desde.slice(0,7)}`) : `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-icon">${_tipoVista==='egresos'?'💸':'💰'}</div>
          <p>Sin ${labelPrincipal.toLowerCase()} en esta semana</p>
        </div>`}
    `;
  }

  // ══ TAB MES ═══════════════════════════════════════════════════
  function buildMes() {
    const pref = `${_añoSel}-${String(_mesSel+1).padStart(2,'0')}`;
    const tipo = _tipoVista === 'egresos' ? 'egreso' : 'ingreso';
    const movsMes = _todos.filter(m => m.fecha.startsWith(pref));
    const principal  = movsMes.filter(m => m.tipo === tipo).reduce((s,m)=>s+m.monto,0);
    const secundario = movsMes.filter(m => m.tipo !== tipo).reduce((s,m)=>s+m.monto,0);
    const labelPrincipal = _tipoVista === 'egresos' ? 'Egresos' : 'Ingresos';
    const colorPrincipal = _tipoVista === 'egresos' ? 'text-red' : 'text-green';

    const diasTransc = _mesSel === new Date().getMonth() && _añoSel === new Date().getFullYear()
      ? new Date().getDate() : new Date(_añoSel, _mesSel+1, 0).getDate();
    const promDiario = diasTransc > 0 ? principal / diasTransc : 0;

    // Mes anterior
    const mesPrevMes = _mesSel === 0 ? 11 : _mesSel - 1;
    const mesPrevAño = _mesSel === 0 ? _añoSel - 1 : _añoSel;
    const prefPrev = `${mesPrevAño}-${String(mesPrevMes+1).padStart(2,'0')}`;
    const prevPrincipal = _todos.filter(m => m.fecha.startsWith(prefPrev) && m.tipo === tipo).reduce((s,m)=>s+m.monto,0);
    const pctCambio = prevPrincipal > 0 ? Math.round(((principal-prevPrincipal)/prevPrincipal)*100) : null;
    const mejoro = _tipoVista === 'egresos' ? (pctCambio !== null && pctCambio < 0) : (pctCambio !== null && pctCambio > 0);

    const { porCat, totalCat } = calcularCategorias(movsMes.filter(m => m.tipo === tipo));
    const catOrdenadas = Object.entries(porCat).sort((a,b) => b[1]-a[1]);

    return `
      <div class="stats-resumen-cards">
        <div class="stat-card">
          <div class="stat-label">${labelPrincipal}</div>
          <div class="stat-val ${colorPrincipal}">${Parser.formatCOP(principal)}</div>
          ${pctCambio !== null ? `<div class="stat-change ${mejoro?'stat-up':'stat-down'}">${pctCambio>=0?'▲':'▼'} ${Math.abs(pctCambio)}% vs anterior</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">${_tipoVista==='egresos'?'Ingresos':'Egresos'}</div>
          <div class="stat-val ${_tipoVista==='egresos'?'text-green':'text-red'}">${Parser.formatCOP(secundario)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Saldo</div>
          <div class="stat-val ${_tipoVista==='egresos'?(secundario-principal>=0?'text-green':'text-red'):(principal-secundario>=0?'text-green':'text-red')}">
            ${Parser.formatCOP(Math.abs(_tipoVista==='egresos'?secundario-principal:principal-secundario))}
          </div>
        </div>
        <div class="stat-card"><div class="stat-label">Prom/día</div><div class="stat-val">${Parser.formatCOP(promDiario)}</div></div>
      </div>

      ${catOrdenadas.length ? `
        ${buildPastelSVG(catOrdenadas, totalCat)}
        ${buildSeccionCategorias(catOrdenadas, totalCat, pref)}
      ` : `<div class="empty-state" style="padding:40px 0;"><div class="empty-icon">${_tipoVista==='egresos'?'💸':'💰'}</div><p>Sin ${labelPrincipal.toLowerCase()} en este mes</p></div>`}
    `;
  }

  // ══ TAB AÑO ═══════════════════════════════════════════════════
  function buildAño() {
    const tipo = _tipoVista === 'egresos' ? 'egreso' : 'ingreso';
    const labelPrincipal = _tipoVista === 'egresos' ? 'Egresos' : 'Ingresos';
    const colorBar = _tipoVista === 'egresos' ? 'var(--red)' : 'var(--green)';
    const movsAño = _todos.filter(m => m.fecha.startsWith(`${_añoSel}`));
    const principal  = movsAño.filter(m => m.tipo === tipo).reduce((s,m)=>s+m.monto,0);
    const secundario = movsAño.filter(m => m.tipo !== tipo).reduce((s,m)=>s+m.monto,0);

    // Por mes
    const meses = Array.from({length:12}, (_,i) => {
      const pref = `${_añoSel}-${String(i+1).padStart(2,'0')}`;
      const movsM = movsAño.filter(m => m.fecha.startsWith(pref));
      return {
        label: Parser.nombreMes(i), mes: i,
        principal: movsM.filter(m=>m.tipo===tipo).reduce((s,m)=>s+m.monto,0),
        secundario: movsM.filter(m=>m.tipo!==tipo).reduce((s,m)=>s+m.monto,0)
      };
    });

    const maxP = Math.max(...meses.map(m=>m.principal), 1);
    const mesMasAlto = [...meses].sort((a,b)=>b.principal-a.principal)[0];

    const { porCat, totalCat } = calcularCategorias(movsAño.filter(m => m.tipo === tipo));
    const catOrdenadas = Object.entries(porCat).sort((a,b) => b[1]-a[1]);

    return `
      <div class="stats-resumen-cards">
        <div class="stat-card"><div class="stat-label">${labelPrincipal} ${_añoSel}</div><div class="stat-val ${_tipoVista==='egresos'?'text-red':'text-green'}">${Parser.formatCOP(principal)}</div></div>
        <div class="stat-card"><div class="stat-label">${_tipoVista==='egresos'?'Ingresos':'Egresos'} ${_añoSel}</div><div class="stat-val ${_tipoVista==='egresos'?'text-green':'text-red'}">${Parser.formatCOP(secundario)}</div></div>
        <div class="stat-card"><div class="stat-label">Saldo anual</div><div class="stat-val ${secundario-principal>=0?'text-green':'text-red'}">${Parser.formatCOP(Math.abs(secundario-principal))}</div></div>
        <div class="stat-card"><div class="stat-label">Mes ${_tipoVista==='egresos'?'más caro':'más alto'}</div><div class="stat-val" style="font-size:14px">${mesMasAlto.principal>0?mesMasAlto.label:'-'}</div></div>
      </div>

      <!-- Barras mensuales -->
      <div class="chart-wrap">
        <div class="chart-title">${_tipoVista==='egresos'?'📉':'📈'} ${labelPrincipal} por mes — ${_añoSel}</div>
        <div style="display:flex;gap:2px;align-items:flex-end;height:100px;">
          ${meses.map(d => {
            const h = maxP > 0 ? Math.max(2, Math.round((d.principal/maxP)*88)) : 2;
            const esMesActual = d.mes === new Date().getMonth() && _añoSel === new Date().getFullYear();
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;justify-content:flex-end;height:100%;">
              <div style="width:100%;height:${h}px;background:${esMesActual?colorBar:colorBar+'66'};border-radius:2px 2px 0 0;"></div>
              <div style="font-size:9px;color:var(--text3)">${d.label}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Comparativo mensual -->
      <div class="chart-wrap">
        <div class="chart-title">📊 ${labelPrincipal} por mes</div>
        ${meses.filter(d => d.principal > 0).map(d => {
          const pct = maxP > 0 ? Math.round((d.principal/maxP)*100) : 0;
          const esMesActual = d.mes === new Date().getMonth() && _añoSel === new Date().getFullYear();
          return `<div class="comp-row">
            <div class="comp-mes" style="color:${esMesActual?'var(--text)':'var(--text2)'};font-weight:${esMesActual?'600':'400'}">${d.label}</div>
            <div class="comp-bar-wrap"><div class="comp-bar" style="width:${pct}%;background:${esMesActual?colorBar:'var(--bg3)'}"></div></div>
            <div class="comp-val" style="color:${esMesActual?colorBar:'var(--text2)'}">${Parser.formatCOP(d.principal)}</div>
          </div>`;
        }).join('')}
      </div>

      ${catOrdenadas.length ? `
        ${buildPastelSVG(catOrdenadas, totalCat)}
        ${buildSeccionCategorias(catOrdenadas, totalCat, `${_añoSel}`)}
      ` : `<div class="empty-state" style="padding:40px 0;"><div class="empty-icon">${_tipoVista==='egresos'?'💸':'💰'}</div><p>Sin ${labelPrincipal.toLowerCase()} en ${_añoSel}</p></div>`}
    `;
  }

  // ── GRÁFICO DE PASTEL SVG ─────────────────────────────────────
  function buildPastelSVG(catOrdenadas, total) {
    if (!catOrdenadas.length || total === 0) return '';
    const size = 200, cx = 100, cy = 100, r = 80, ri = 42; // donut
    const cats = Parser.getCategoriasMerged();

    // Calcular arcos
    let anguloAcum = -Math.PI / 2; // empezar desde arriba
    const sectores = catOrdenadas.slice(0, 10).map(([slug, monto], i) => {
      const pct = monto / total;
      const anguloInicio = anguloAcum;
      const anguloFin    = anguloAcum + pct * 2 * Math.PI;
      anguloAcum = anguloFin;
      const activo = _catPasteActiva === slug;
      const r2 = activo ? r + 8 : r;

      // Puntos del arco exterior
      const x1 = cx + r2 * Math.cos(anguloInicio);
      const y1 = cy + r2 * Math.sin(anguloInicio);
      const x2 = cx + r2 * Math.cos(anguloFin);
      const y2 = cy + r2 * Math.sin(anguloFin);
      // Puntos del arco interior (donut)
      const x3 = cx + ri * Math.cos(anguloFin);
      const y3 = cy + ri * Math.sin(anguloFin);
      const x4 = cx + ri * Math.cos(anguloInicio);
      const y4 = cy + ri * Math.sin(anguloInicio);

      const largeArc = pct > 0.5 ? 1 : 0;
      const path = `M ${x1} ${y1} A ${r2} ${r2} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${ri} ${ri} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return { slug, monto, pct, path, color: COLORES[i % COLORES.length], activo };
    });

    // Centro: mostrar info de la categoría activa o el total
    const infoC = _catPasteActiva
      ? (() => {
          const s = sectores.find(s => s.slug === _catPasteActiva);
          const info = cats[_catPasteActiva] || Parser.CATEGORIAS.otros;
          return s ? `<text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="20" dominant-baseline="middle">${info.emoji}</text>
            <text x="${cx}" y="${cy+10}" text-anchor="middle" font-size="10" fill="var(--text2)" dominant-baseline="middle">${Parser.formatCOP(s.monto, true)}</text>
            <text x="${cx}" y="${cy+24}" text-anchor="middle" font-size="9" fill="var(--text3)" dominant-baseline="middle">${Math.round(s.pct*100)}%</text>` : '';
        })()
      : `<text x="${cx}" y="${cy-8}" text-anchor="middle" font-size="10" fill="var(--text3)" dominant-baseline="middle">Total</text>
         <text x="${cx}" y="${cy+8}" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text)" dominant-baseline="middle">${Parser.formatCOP(total, true)}</text>`;

    return `
      <div class="chart-wrap">
        <div class="chart-title">🥧 Distribución de egresos <span style="font-size:11px;color:var(--text3);font-weight:400">Toca para ver detalle</span></div>
        <div class="pastel-container">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="pastel-svg" id="pastel-svg">
            ${sectores.map(s => `
              <path d="${s.path}" fill="${s.color}" opacity="${_catPasteActiva && !s.activo ? '0.4' : '1'}"
                class="pastel-sector" data-slug="${s.slug}"
                style="cursor:pointer;transition:opacity 0.2s;"/>
            `).join('')}
            ${infoC}
          </svg>
          <div class="pastel-leyenda">
            ${sectores.map(s => {
              const info = cats[s.slug] || Parser.CATEGORIAS.otros;
              return `<div class="pastel-ley-item ${_catPasteActiva===s.slug?'activo':''}" data-slug="${s.slug}">
                <span class="pastel-ley-dot" style="background:${s.color}"></span>
                <span class="pastel-ley-nombre">${info.emoji} ${info.nombre || s.slug}</span>
                <span class="pastel-ley-pct">${Math.round(s.pct*100)}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function bindPastel() {
    document.querySelectorAll('.pastel-sector, .pastel-ley-item').forEach(el => {
      el.addEventListener('click', () => {
        const slug = el.dataset.slug;
        _catPasteActiva = _catPasteActiva === slug ? null : slug;
        renderContenido();
      });
    });
  }

  // ── SECCIÓN CATEGORÍAS ────────────────────────────────────────
  function buildSeccionCategorias(catOrdenadas, total, prefPeriodo) {
    const cats = Parser.getCategoriasMerged();
    return `
      <div class="chart-wrap" id="cats-section">
        <div class="chart-title">🏷️ Por categoría
          <span style="font-size:11px;color:var(--text3);font-weight:400;margin-left:6px;">Toca para ver detalle</span>
        </div>
        <div class="cat-list">
          ${catOrdenadas.map(([slug, monto], idx) => {
            const info = cats[slug] || Parser.CATEGORIAS.otros;
            const pct = total > 0 ? Math.round((monto/total)*100) : 0;
            const color = COLORES[idx % COLORES.length];
            const activo = _catPasteActiva === slug;
            const presup = _presupuestos.find(p => p.categoriaSlug === slug);
            const pctPresup = presup ? Math.min(100, Math.round((monto/presup.monto)*100)) : null;
            const colorPresup = pctPresup === null ? null : pctPresup>=100?'var(--red)':pctPresup>=80?'var(--yellow)':'var(--green)';
            return `
              <div class="cat-item cat-item-tappable ${activo?'cat-activa':''}"
                data-cat="${slug}" data-mes="${prefPeriodo}">
                <div class="cat-header">
                  <div class="cat-name" style="font-weight:${activo?700:500}">
                    ${info.emoji} ${info.nombre || slug}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="cat-monto">
                      ${Parser.formatCOP(monto)}
                      <span style="font-size:11px;color:${presup?colorPresup:'var(--text3)'}"> ${pct}%</span>
                    </div>
                    ${_tab !== 'semana' && _tipoVista === 'egresos' ? `
                      <button class="btn-presupuesto-cat"
                        data-cat="${slug}" data-mes="${prefPeriodo}"
                        data-gasto="${monto}" data-nombre="${info.nombre||slug}">
                        ${presup ? '📊' : '＋'}
                      </button>` : ''}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
                <div class="cat-bar">
                  <div class="cat-fill" style="width:${pct}%;background:${color}"></div>
                </div>
                ${presup ? `
                  <div style="margin-top:5px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:3px;">
                      <span>Presupuesto: ${Parser.formatCOP(presup.monto)}</span>
                      <span style="color:${colorPresup}">${pctPresup>=100?'⚠️ Superado':`Falta ${Parser.formatCOP(presup.monto-monto)}`}</span>
                    </div>
                    <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                      <div style="height:100%;width:${pctPresup}%;background:${colorPresup};border-radius:2px;"></div>
                    </div>
                  </div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ── DETALLE DE CATEGORÍA ──────────────────────────────────────
  function bindCatItems() {
    document.querySelectorAll('.cat-item-tappable').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.btn-presupuesto-cat')) return;
        const slug = el.dataset.cat;
        const pref = el.dataset.mes;
        mostrarDetalleCat(slug, pref);
      });
    });

    document.querySelectorAll('.btn-presupuesto-cat').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        PresupuestosView.abrir(btn.dataset.cat, btn.dataset.nombre,
          btn.dataset.mes, parseFloat(btn.dataset.gasto)||0, renderContenido);
      });
    });
  }

  function mostrarDetalleCat(catSlug, prefPeriodo) {
    const container = document.getElementById('view-container');
    const cats = Parser.getCategoriasMerged();
    const info = cats[catSlug] || Parser.CATEGORIAS.otros;
    const cuentaLabels = { efectivo:'💵 Efectivo', tarjeta_debito:'💳 T. Débito', tarjeta_credito:'💳 T. Crédito', banco:'🏦 Banco' };

    // Filtrar movimientos según el prefijo del período
    const movs = _todos
      .filter(m => m.categoria === catSlug && m.tipo === 'egreso' && m.fecha.startsWith(prefPeriodo))
      .sort((a,b) => b.fecha.localeCompare(a.fecha));

    const total = movs.reduce((s,m) => s+m.monto, 0);

    // Calcular label del período
    let periodoLabel = prefPeriodo;
    if (/^\d{4}-\d{2}$/.test(prefPeriodo)) {
      const [y,m] = prefPeriodo.split('-');
      periodoLabel = `${Parser.nombreMesLargo(parseInt(m)-1)} ${y}`;
    } else if (/^\d{4}$/.test(prefPeriodo)) {
      periodoLabel = prefPeriodo;
    }

    container.innerHTML = `
      <div class="detalle-cat-wrap fade-in">
        <div class="detalle-cat-header">
          <button class="btn-volver" id="btn-volver-stats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Estadísticas
          </button>
        </div>
        <div class="detalle-cat-titulo">
          <span class="detalle-cat-emoji">${info.emoji}</span>
          <div>
            <div class="detalle-cat-nombre">${info.nombre || catSlug}</div>
            <div class="detalle-cat-mes">${periodoLabel}</div>
          </div>
        </div>
        <div class="detalle-cat-resumen">
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Total</div>
            <div class="detalle-resumen-val text-red">${Parser.formatCOP(total)}</div>
          </div>
          <div class="detalle-resumen-sep"></div>
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Registros</div>
            <div class="detalle-resumen-val">${movs.length}</div>
          </div>
          <div class="detalle-resumen-sep"></div>
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Promedio</div>
            <div class="detalle-resumen-val">${movs.length ? Parser.formatCOP(total/movs.length) : '$0'}</div>
          </div>
        </div>
        ${movs.length ? `
          <div class="section-title" style="margin-top:4px;">Movimientos</div>
          <div class="card" style="padding:0;overflow:hidden;margin:0 16px 16px;">
            ${movs.map(m => `
              <div class="mov-item">
                <div class="mov-icon" style="background:rgba(239,68,68,0.12)">${info.emoji}</div>
                <div class="mov-info">
                  <div class="mov-desc">${m.descripcion || info.nombre || catSlug}</div>
                  <div class="mov-meta">${Parser.fechaLegible(m.fecha)} · ${cuentaLabels[m.cuenta]||m.cuenta}</div>
                </div>
                <div class="mov-monto egreso">-${Parser.formatCOP(m.monto)}</div>
              </div>`).join('')}
          </div>` : `
          <div class="empty-state" style="padding:40px;">
            <div class="empty-icon">${info.emoji}</div><p>Sin movimientos en este período</p>
          </div>`}
      </div>
    `;

    document.getElementById('btn-volver-stats').addEventListener('click', () => pintarVista(container));
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function calcularCategorias(egresosArr) {
    const porCat = {};
    for (const m of egresosArr) {
      porCat[m.categoria] = (porCat[m.categoria] || 0) + m.monto;
    }
    const totalCat = Object.values(porCat).reduce((s,v) => s+v, 0);
    return { porCat, totalCat };
  }

  function getAñosDisponibles() {
    const años = new Set(_todos.map(m => parseInt(m.fecha.slice(0,4))));
    años.add(new Date().getFullYear());
    return [...años].sort((a,b) => b-a);
  }

  return { render };
})();
