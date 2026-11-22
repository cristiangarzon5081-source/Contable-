/**
 * CONTABLE - Vista Estadísticas
 */

const EstadisticasView = (() => {

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="estadisticas-wrap fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>`;

    try {
      const movimientos = await DB.obtenerMovimientos();
      const html = buildEstadisticas(movimientos);
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><p>Error al cargar estadísticas</p></div>';
    }
  }

  function buildEstadisticas(movimientos) {
    if (!movimientos.length) {
      return `
        <div class="estadisticas-wrap fade-in">
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-title">Sin datos aún</div>
            <p>Registra movimientos para ver estadísticas</p>
          </div>
        </div>
      `;
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    // Datos de los últimos 6 meses
    const datosMeses = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(añoActual, mesActual - i, 1);
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();
      const prefijo = `${año}-${String(mes + 1).padStart(2, '0')}`;
      const movsM = movimientos.filter(m => m.fecha.startsWith(prefijo));
      datosMeses.push({
        label: Parser.nombreMes(mes),
        ingresos: movsM.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
        egresos: movsM.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0),
        mes, año
      });
    }

    // Mes actual stats
    const mesHoy = datosMeses[datosMeses.length - 1];
    const mesPasado = datosMeses[datosMeses.length - 2];

    const cambioIngresos = mesPasado.ingresos > 0
      ? Math.round(((mesHoy.ingresos - mesPasado.ingresos) / mesPasado.ingresos) * 100)
      : null;
    const cambioEgresos = mesPasado.egresos > 0
      ? Math.round(((mesHoy.egresos - mesPasado.egresos) / mesPasado.egresos) * 100)
      : null;

    // Categorías del mes actual
    const prefMes = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}`;
    const egresosDelMes = movimientos.filter(m => m.fecha.startsWith(prefMes) && m.tipo === 'egreso');
    const totalEgresosMes = egresosDelMes.reduce((s, m) => s + m.monto, 0);

    const porCategoria = {};
    for (const m of egresosDelMes) {
      if (!porCategoria[m.categoria]) porCategoria[m.categoria] = 0;
      porCategoria[m.categoria] += m.monto;
    }
    const catOrdenadas = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    // Comparativo mensual (egresos)
    const maxEgreso = Math.max(...datosMeses.map(d => d.egresos), 1);
    const maxIngreso = Math.max(...datosMeses.map(d => d.ingresos), 1);

    // Promedio diario este mes
    const diasTranscurridos = hoy.getDate();
    const promDiario = diasTranscurridos > 0 ? mesHoy.egresos / diasTranscurridos : 0;

    // Día de la semana con más gastos (últimos 30 días)
    const hace30 = new Date(hoy.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const ultimos30 = movimientos.filter(m => m.fecha >= hace30 && m.tipo === 'egreso');
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    const contDia = [0, 0, 0, 0, 0, 0, 0];
    for (const m of ultimos30) {
      const d = new Date(m.fecha + 'T12:00:00').getDay();
      porDia[d] += m.monto;
      contDia[d]++;
    }
    const diasNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const maxDia = Math.max(...porDia, 1);
    const diaMaxGasto = porDia.indexOf(Math.max(...porDia));

    // Cuenta más usada
    const porCuenta = {};
    for (const m of movimientos) {
      if (!porCuenta[m.cuenta]) porCuenta[m.cuenta] = 0;
      porCuenta[m.cuenta]++;
    }
    const cuentaMasUsada = Object.entries(porCuenta).sort((a, b) => b[1] - a[1])[0];
    const cuentaLabels = { efectivo: 'Efectivo', tarjeta_debito: 'T. Débito', tarjeta_credito: 'T. Crédito', banco: 'Banco' };

    return `
      <div class="estadisticas-wrap fade-in">
        <!-- Stats rápidos -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Ingresos ${Parser.nombreMes(mesActual)}</div>
            <div class="stat-val text-green">${Parser.formatCOP(mesHoy.ingresos, true)}</div>
            ${cambioIngresos !== null ? `<div class="stat-change ${cambioIngresos >= 0 ? 'stat-up' : 'stat-down'}">${cambioIngresos >= 0 ? '▲' : '▼'} ${Math.abs(cambioIngresos)}% vs mes anterior</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-label">Egresos ${Parser.nombreMes(mesActual)}</div>
            <div class="stat-val text-red">${Parser.formatCOP(mesHoy.egresos, true)}</div>
            ${cambioEgresos !== null ? `<div class="stat-change ${cambioEgresos <= 0 ? 'stat-up' : 'stat-down'}">${cambioEgresos >= 0 ? '▲' : '▼'} ${Math.abs(cambioEgresos)}% vs mes anterior</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-label">Gasto promedio diario</div>
            <div class="stat-val">${Parser.formatCOP(promDiario, true)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cuenta favorita</div>
            <div class="stat-val" style="font-size:15px">${cuentaMasUsada ? cuentaLabels[cuentaMasUsada[0]] || cuentaMasUsada[0] : '-'}</div>
          </div>
        </div>

        <!-- Gráfico ingresos vs egresos 6 meses -->
        <div class="chart-wrap">
          <div class="chart-title">📈 Ingresos vs Egresos (6 meses)</div>
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <span style="font-size:12px;display:flex;align-items:center;gap:4px;color:var(--text2)"><span style="width:10px;height:10px;border-radius:2px;background:var(--green);display:inline-block"></span>Ingresos</span>
            <span style="font-size:12px;display:flex;align-items:center;gap:4px;color:var(--text2)"><span style="width:10px;height:10px;border-radius:2px;background:var(--red);display:inline-block"></span>Egresos</span>
          </div>
          <div style="display:flex;gap:4px;align-items:flex-end;height:110px;">
            ${datosMeses.map(d => {
              const hI = maxIngreso > 0 ? Math.max(4, Math.round((d.ingresos / maxIngreso) * 90)) : 4;
              const hE = maxEgreso > 0 ? Math.max(4, Math.round((d.egresos / maxEgreso) * 90)) : 4;
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;justify-content:flex-end;height:100%;">
                  <div style="width:100%;display:flex;gap:1px;align-items:flex-end;justify-content:center;flex:1;">
                    <div style="flex:1;height:${hI}px;background:var(--green);border-radius:3px 3px 0 0;opacity:0.85"></div>
                    <div style="flex:1;height:${hE}px;background:var(--red);border-radius:3px 3px 0 0;opacity:0.85"></div>
                  </div>
                  <div style="font-size:10px;color:var(--text3)">${d.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Categorías del mes -->
        ${catOrdenadas.length ? `
          <div class="chart-wrap">
            <div class="chart-title">🏷️ Egresos por categoría — ${Parser.nombreMesLargo(mesActual)}</div>
            <div class="cat-list">
              ${catOrdenadas.map(([cat, monto]) => {
                const info = Parser.CATEGORIAS[cat] || Parser.CATEGORIAS.otros;
                const pct = totalEgresosMes > 0 ? Math.round((monto / totalEgresosMes) * 100) : 0;
                const colores = ['#f87171','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6'];
                const color = colores[catOrdenadas.findIndex(c => c[0] === cat) % colores.length];
                return `
                  <div class="cat-item">
                    <div class="cat-header">
                      <div class="cat-name">${info.emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
                      <div class="cat-monto">${Parser.formatCOP(monto, true)} <span style="font-size:11px;color:var(--text3)">${pct}%</span></div>
                    </div>
                    <div class="cat-bar"><div class="cat-fill" style="width:${pct}%;background:${color}"></div></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Día de la semana con más gastos -->
        <div class="chart-wrap">
          <div class="chart-title">📅 Gastos por día de semana (últimos 30 días)</div>
          <div class="bar-chart">
            ${diasNombre.map((nombre, idx) => {
              const h = maxDia > 0 ? Math.max(4, Math.round((porDia[idx] / maxDia) * 85)) : 4;
              const esMax = idx === diaMaxGasto && porDia[idx] > 0;
              return `
                <div class="bar-item">
                  <div class="bar-fill" style="height:${h}px;background:${esMax ? 'var(--accent)' : 'var(--bg3)'};border-radius:4px 4px 0 0"></div>
                  <div class="bar-label" style="color:${esMax ? 'var(--accent2)' : 'var(--text3)'}">${nombre}</div>
                </div>
              `;
            }).join('')}
          </div>
          ${porDia[diaMaxGasto] > 0 ? `<div style="margin-top:8px;font-size:12px;color:var(--text3)">💡 Gastas más los <strong style="color:var(--accent2)">${diasNombre[diaMaxGasto]}</strong></div>` : ''}
        </div>

        <!-- Comparativo mensual egresos -->
        <div class="chart-wrap">
          <div class="chart-title">📊 Comparativo de egresos</div>
          ${datosMeses.map(d => {
            const pct = maxEgreso > 0 ? Math.round((d.egresos / maxEgreso) * 100) : 0;
            const esMesActual = d.mes === mesActual && d.año === añoActual;
            return `
              <div class="comp-row">
                <div class="comp-mes" style="color:${esMesActual ? 'var(--text)' : 'var(--text2)'};font-weight:${esMesActual ? '600' : '400'}">${d.label} ${d.año !== añoActual ? d.año : ''}</div>
                <div class="comp-bar-wrap">
                  <div class="comp-bar" style="width:${pct}%;background:${esMesActual ? 'var(--red)' : 'var(--bg3)'}"></div>
                </div>
                <div class="comp-val" style="color:${esMesActual ? 'var(--red)' : 'var(--text2)'}">${Parser.formatCOP(d.egresos, true)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="section-sep"></div>
      </div>
    `;
  }

  return { render };
})();
