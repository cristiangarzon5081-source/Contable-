/**
 * CONTABLE - Vista Estadísticas
 * Las categorías del mes son tappables → muestra detalle de movimientos
 */

const EstadisticasView = (() => {
  let _todosMovimientos = [];
  let _presupuestos = [];

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="estadisticas-wrap fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>`;
    try {
      [_todosMovimientos, _presupuestos] = await Promise.all([
        DB.obtenerMovimientos(),
        DB.obtenerPresupuestos()
      ]);
      await Parser.cargarCatsPersonalizadas();
      container.innerHTML = buildEstadisticas(_todosMovimientos);
      bindCatItems();
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Error al cargar estadísticas</p></div>';
    }
  }

  // ── VISTA PRINCIPAL ───────────────────────────────────────────
  function buildEstadisticas(movimientos) {
    if (!movimientos.length) {
      return `<div class="estadisticas-wrap fade-in">
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-title">Sin datos aún</div>
          <p>Registra movimientos para ver estadísticas</p>
        </div></div>`;
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // Últimos 6 meses
    const datosMeses = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(añoActual, mesActual - i, 1);
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();
      const pref = `${año}-${String(mes + 1).padStart(2, '0')}`;
      const movsM = movimientos.filter(m => m.fecha.startsWith(pref));
      datosMeses.push({
        label: Parser.nombreMes(mes),
        ingresos: movsM.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
        egresos: movsM.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0),
        mes, año
      });
    }

    const mesHoy = datosMeses[datosMeses.length - 1];
    const mesPasado = datosMeses[datosMeses.length - 2];

    const cambioIngresos = mesPasado.ingresos > 0
      ? Math.round(((mesHoy.ingresos - mesPasado.ingresos) / mesPasado.ingresos) * 100) : null;
    const cambioEgresos = mesPasado.egresos > 0
      ? Math.round(((mesHoy.egresos - mesPasado.egresos) / mesPasado.egresos) * 100) : null;

    // Categorías del mes
    const prefMes = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}`;
    const egresosDelMes = movimientos.filter(m => m.fecha.startsWith(prefMes) && m.tipo === 'egreso');
    const totalEgresosMes = egresosDelMes.reduce((s, m) => s + m.monto, 0);

    const porCategoria = {};
    for (const m of egresosDelMes) {
      if (!porCategoria[m.categoria]) porCategoria[m.categoria] = 0;
      porCategoria[m.categoria] += m.monto;
    }
    const catOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

    const maxEgreso = Math.max(...datosMeses.map(d => d.egresos), 1);
    const maxIngreso = Math.max(...datosMeses.map(d => d.ingresos), 1);
    const promDiario = hoy.getDate() > 0 ? mesHoy.egresos / hoy.getDate() : 0;

    // Día con más gastos
    const hace30 = new Date(hoy.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const ultimos30 = movimientos.filter(m => m.fecha >= hace30 && m.tipo === 'egreso');
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    for (const m of ultimos30) porDia[new Date(m.fecha + 'T12:00:00').getDay()] += m.monto;
    const diasNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const maxDia = Math.max(...porDia, 1);
    const diaMax = porDia.indexOf(Math.max(...porDia));

    const porCuenta = {};
    for (const m of movimientos) { porCuenta[m.cuenta] = (porCuenta[m.cuenta] || 0) + 1; }
    const cuentaMasUsada = Object.entries(porCuenta).sort((a, b) => b[1] - a[1])[0];
    const cuentaLabels = { efectivo: 'Efectivo', tarjeta_debito: 'T. Débito', tarjeta_credito: 'T. Crédito', banco: 'Banco' };

    const colores = ['#f87171','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#67e8f9','#86efac','#fda4af'];

    return `
      <div class="estadisticas-wrap fade-in">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Ingresos ${Parser.nombreMes(mesActual)}</div>
            <div class="stat-val text-green">${Parser.formatCOP(mesHoy.ingresos)}</div>
            ${cambioIngresos !== null ? `<div class="stat-change ${cambioIngresos >= 0 ? 'stat-up' : 'stat-down'}">${cambioIngresos >= 0 ? '▲' : '▼'} ${Math.abs(cambioIngresos)}% vs mes ant.</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-label">Egresos ${Parser.nombreMes(mesActual)}</div>
            <div class="stat-val text-red">${Parser.formatCOP(mesHoy.egresos)}</div>
            ${cambioEgresos !== null ? `<div class="stat-change ${cambioEgresos <= 0 ? 'stat-up' : 'stat-down'}">${cambioEgresos >= 0 ? '▲' : '▼'} ${Math.abs(cambioEgresos)}% vs mes ant.</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-label">Promedio diario</div>
            <div class="stat-val">${Parser.formatCOP(promDiario)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cuenta favorita</div>
            <div class="stat-val" style="font-size:15px">${cuentaMasUsada ? cuentaLabels[cuentaMasUsada[0]] || cuentaMasUsada[0] : '-'}</div>
          </div>
        </div>

        <!-- Gráfico 6 meses -->
        <div class="chart-wrap">
          <div class="chart-title">📈 Ingresos vs Egresos (6 meses)</div>
          <div style="display:flex;gap:10px;margin-bottom:8px;">
            <span style="font-size:12px;display:flex;align-items:center;gap:4px;color:var(--text2)">
              <span style="width:10px;height:10px;border-radius:2px;background:var(--green);display:inline-block"></span>Ingresos
            </span>
            <span style="font-size:12px;display:flex;align-items:center;gap:4px;color:var(--text2)">
              <span style="width:10px;height:10px;border-radius:2px;background:var(--red);display:inline-block"></span>Egresos
            </span>
          </div>
          <div style="display:flex;gap:4px;align-items:flex-end;height:110px;">
            ${datosMeses.map(d => {
              const hI = maxIngreso > 0 ? Math.max(4, Math.round((d.ingresos / maxIngreso) * 90)) : 4;
              const hE = maxEgreso > 0 ? Math.max(4, Math.round((d.egresos / maxEgreso) * 90)) : 4;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;justify-content:flex-end;height:100%;">
                <div style="width:100%;display:flex;gap:1px;align-items:flex-end;justify-content:center;flex:1;">
                  <div style="flex:1;height:${hI}px;background:var(--green);border-radius:3px 3px 0 0;opacity:0.85"></div>
                  <div style="flex:1;height:${hE}px;background:var(--red);border-radius:3px 3px 0 0;opacity:0.85"></div>
                </div>
                <div style="font-size:10px;color:var(--text3)">${d.label}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        // Categorías del mes — TAPPABLES + PRESUPUESTO
        ${catOrdenadas.length ? `
          <div class="chart-wrap">
            <div class="chart-title">🏷️ Egresos por categoría — ${Parser.nombreMesLargo(mesActual)}
              <span style="font-size:11px;color:var(--text3);font-weight:400;margin-left:6px;">Toca para ver detalle</span>
            </div>
            <div class="cat-list">
              ${catOrdenadas.map(([cat, monto], idx) => {
                const cats = Parser.getCategoriasMerged();
                const info = cats[cat] || Parser.CATEGORIAS.otros;
                const pct = totalEgresosMes > 0 ? Math.round((monto / totalEgresosMes) * 100) : 0;
                const color = colores[idx % colores.length];
                const numMovs = egresosDelMes.filter(m => m.categoria === cat).length;
                // Presupuesto de esta categoría
                const presup = _presupuestos.find(p => p.categoriaSlug === cat && (p.mes === prefMes || p.mes === 'todos'));
                const pctPresup = presup ? Math.min(100, Math.round((monto / presup.monto) * 100)) : null;
                const colorPresup = pctPresup === null ? null : pctPresup >= 100 ? 'var(--red)' : pctPresup >= 80 ? 'var(--yellow)' : 'var(--green)';
                return `
                  <div class="cat-item cat-item-tappable" data-cat="${cat}" data-mes="${prefMes}">
                    <div class="cat-header">
                      <div class="cat-name">${info.emoji} ${info.nombre || cat}
                        <span style="font-size:11px;color:var(--text3);margin-left:4px;">(${numMovs})</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="cat-monto">${Parser.formatCOP(monto)}
                          ${presup ? `<span style="font-size:11px;color:${colorPresup};margin-left:4px;">${pctPresup}%</span>` : `<span style="font-size:11px;color:var(--text3)"> ${pct}%</span>`}
                        </div>
                        <button class="btn-presupuesto-cat" data-cat="${cat}" data-mes="${prefMes}"
                          data-gasto="${monto}" data-nombre="${info.nombre || cat}"
                          title="${presup ? 'Editar presupuesto' : 'Definir presupuesto'}">
                          ${presup ? '📊' : '＋'}
                        </button>
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
                          <span style="color:${colorPresup}">${pctPresup >= 100 ? '⚠️ Superado' : `Falta ${Parser.formatCOP(presup.monto - monto)}`}</span>
                        </div>
                        <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                          <div style="height:100%;width:${pctPresup}%;background:${colorPresup};border-radius:2px;transition:width 0.5s;"></div>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Día de la semana -->
        <div class="chart-wrap">
          <div class="chart-title">📅 Gastos por día de semana (últimos 30 días)</div>
          <div class="bar-chart">
            ${diasNombre.map((nombre, idx) => {
              const h = maxDia > 0 ? Math.max(4, Math.round((porDia[idx] / maxDia) * 85)) : 4;
              const esMax = idx === diaMax && porDia[idx] > 0;
              return `<div class="bar-item">
                <div class="bar-fill" style="height:${h}px;background:${esMax ? 'var(--accent)' : 'var(--bg3)'};border-radius:4px 4px 0 0"></div>
                <div class="bar-label" style="color:${esMax ? 'var(--accent2)' : 'var(--text3)'}">${nombre}</div>
              </div>`;
            }).join('')}
          </div>
          ${porDia[diaMax] > 0 ? `<div style="margin-top:8px;font-size:12px;color:var(--text3)">💡 Gastas más los <strong style="color:var(--accent2)">${diasNombre[diaMax]}</strong></div>` : ''}
        </div>

        <!-- Comparativo egresos -->
        <div class="chart-wrap">
          <div class="chart-title">📊 Comparativo de egresos</div>
          ${datosMeses.map(d => {
            const pct = maxEgreso > 0 ? Math.round((d.egresos / maxEgreso) * 100) : 0;
            const esMesActual = d.mes === mesActual && d.año === añoActual;
            return `<div class="comp-row">
              <div class="comp-mes" style="color:${esMesActual ? 'var(--text)' : 'var(--text2)'};font-weight:${esMesActual ? '600' : '400'}">${d.label}${d.año !== añoActual ? ' ' + d.año : ''}</div>
              <div class="comp-bar-wrap"><div class="comp-bar" style="width:${pct}%;background:${esMesActual ? 'var(--red)' : 'var(--bg3)'}"></div></div>
              <div class="comp-val" style="color:${esMesActual ? 'var(--red)' : 'var(--text2)'}">${Parser.formatCOP(d.egresos)}</div>
            </div>`;
          }).join('')}
        </div>

        <div class="section-sep"></div>
      </div>
    `;
  }

  // ── DETALLE DE CATEGORÍA ──────────────────────────────────────
  function bindCatItems() {
    document.querySelectorAll('.cat-item-tappable').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.btn-presupuesto-cat')) return;
        mostrarDetalleCat(el.dataset.cat, el.dataset.mes);
      });
    });

    document.querySelectorAll('.btn-presupuesto-cat').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        PresupuestosView.abrir(
          btn.dataset.cat,
          btn.dataset.nombre,
          btn.dataset.mes,
          parseFloat(btn.dataset.gasto) || 0,
          () => render()
        );
      });
    });
  }

  function mostrarDetalleCat(catSlug, mesPref) {
    const container = document.getElementById('view-container');
    const cats = Parser.getCategoriasMerged();
    const info = cats[catSlug] || Parser.CATEGORIAS.otros;

    // Filtrar movimientos de esta categoría en este mes
    const movs = _todosMovimientos
      .filter(m => m.categoria === catSlug && m.fecha.startsWith(mesPref))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const total = movs.reduce((s, m) => s + m.monto, 0);
    const cuentaLabels = { efectivo: '💵 Efectivo', tarjeta_debito: '💳 T. Débito', tarjeta_credito: '💳 T. Crédito', banco: '🏦 Banco' };
    const [año, mes] = mesPref.split('-');
    const mesNombre = Parser.nombreMesLargo(parseInt(mes) - 1) + ' ' + año;

    container.innerHTML = `
      <div class="detalle-cat-wrap fade-in">
        <!-- Header con botón volver -->
        <div class="detalle-cat-header">
          <button class="btn-volver" id="btn-volver-stats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Estadísticas
          </button>
        </div>

        <!-- Título de categoría -->
        <div class="detalle-cat-titulo">
          <span class="detalle-cat-emoji">${info.emoji}</span>
          <div>
            <div class="detalle-cat-nombre">${info.nombre || catSlug}</div>
            <div class="detalle-cat-mes">${mesNombre}</div>
          </div>
        </div>

        <!-- Resumen -->
        <div class="detalle-cat-resumen">
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Total gastado</div>
            <div class="detalle-resumen-val text-red">${Parser.formatCOP(total)}</div>
          </div>
          <div class="detalle-resumen-sep"></div>
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Movimientos</div>
            <div class="detalle-resumen-val">${movs.length}</div>
          </div>
          <div class="detalle-resumen-sep"></div>
          <div class="detalle-resumen-item">
            <div class="detalle-resumen-label">Promedio</div>
            <div class="detalle-resumen-val">${movs.length ? Parser.formatCOP(total / movs.length) : '$0'}</div>
          </div>
        </div>

        <!-- Lista de movimientos -->
        ${movs.length ? `
          <div class="section-title" style="margin-top:4px;">Movimientos</div>
          <div class="card" style="padding:0;overflow:hidden;margin:0 16px 16px;">
            ${movs.map(m => `
              <div class="mov-item">
                <div class="mov-icon" style="background:rgba(239,68,68,0.12); font-size:18px;">
                  ${info.emoji}
                </div>
                <div class="mov-info">
                  <div class="mov-desc">${m.descripcion || info.nombre || catSlug}</div>
                  <div class="mov-meta">${Parser.fechaLegible(m.fecha)} · ${cuentaLabels[m.cuenta] || m.cuenta}</div>
                </div>
                <div class="mov-monto egreso">-${Parser.formatCOP(m.monto)}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state" style="padding:40px;">
            <div class="empty-icon">${info.emoji}</div>
            <p>Sin movimientos en ${mesNombre}</p>
          </div>
        `}
      </div>
    `;

    document.getElementById('btn-volver-stats').addEventListener('click', () => {
      container.innerHTML = buildEstadisticas(_todosMovimientos);
      bindCatItems();
    });
  }

  return { render };
})();
