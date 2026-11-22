/**
 * CONTABLE - Vista Dashboard
 */

const DashboardView = (() => {
  let periodoActual = 'mes';

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="dashboard-wrap fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>';

    try {
      const [movimientos, prestamos, todosAbonos] = await Promise.all([
        DB.obtenerMovimientos(),
        DB.obtenerPrestamos({ estado: 'activo' }),
        DB.obtenerTodosAbonos()
      ]);

      const html = await buildDashboard(movimientos, prestamos, todosAbonos);
      container.innerHTML = html;
      bindEvents(movimientos, prestamos);
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Error al cargar datos</p></div>';
    }
  }

  async function buildDashboard(movimientos, prestamos, todosAbonos) {
    const { desde, hasta } = Parser.getRangoFecha(periodoActual);
    const movsFiltrados = movimientos.filter(m =>
      (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)
    );

    const ingresos = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const egresos = movsFiltrados.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
    const saldo = ingresos - egresos;

    // Proyección mes
    const proy = Parser.proyectarMes(movimientos);

    // Salud financiera
    let saludClass = 'salud-verde', saludText = '✅ Finanzas saludables', saludIcon = '✅';
    if (saldo < 0) { saludClass = 'salud-rojo'; saludText = '⚠️ Gastos superan ingresos'; }
    else if (egresos > ingresos * 0.8) { saludClass = 'salud-amarillo'; saludText = '⚡ Gastos elevados'; }

    // Alertas inteligentes
    const alertas = generarAlertas(movimientos, prestamos, todosAbonos, proy);

    // Movimientos recientes (últimos 5)
    const recientes = movimientos.slice(0, 5);

    // Labels de período
    const labeles = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', año: 'Este año' };

    return `
      <div class="dashboard-wrap fade-in">
        <!-- Tarjeta de saldo principal -->
        <div class="saldo-card">
          <div class="saldo-label">${labeles[periodoActual]}</div>
          <div class="saldo-monto ${saldo < 0 ? 'negativo' : ''}">${Parser.formatCOP(Math.abs(saldo))}</div>
          <div class="saldo-sub">
            <div class="saldo-sub-item">
              <div class="saldo-sub-label">↑ Ingresos</div>
              <div class="saldo-sub-val">${Parser.formatCOP(ingresos, true)}</div>
            </div>
            <div class="saldo-sub-item">
              <div class="saldo-sub-label">↓ Egresos</div>
              <div class="saldo-sub-val">${Parser.formatCOP(egresos, true)}</div>
            </div>
          </div>
          <div class="salud-badge ${saludClass}">${saludText}</div>
        </div>

        <!-- Período tabs -->
        <div class="periodo-tabs" id="periodo-tabs">
          ${['hoy','semana','mes','año'].map(p =>
            `<button class="periodo-tab ${p === periodoActual ? 'active' : ''}" data-periodo="${p}">
              ${p.charAt(0).toUpperCase() + p.slice(1)}
            </button>`
          ).join('')}
        </div>

        <!-- Proyección del mes -->
        ${periodoActual === 'mes' ? buildProyeccion(proy) : ''}

        <!-- Alertas -->
        ${alertas.length ? `
          <div class="section-title">Alertas</div>
          <div class="alertas-wrap">
            ${alertas.map(a => `
              <div class="alerta alerta-${a.tipo}">
                <span class="alerta-icon">${a.icono}</span>
                <span>${a.mensaje}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Préstamos activos resumen -->
        ${buildResumenPrestamos(prestamos, todosAbonos)}

        <!-- Movimientos recientes -->
        <div class="section-title" style="margin-top:8px;">Últimos movimientos</div>
        ${recientes.length ? recientes.map(m => buildMovItem(m)).join('') : `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-title">Sin movimientos aún</div>
            <p>Toca el + para registrar tu primer movimiento</p>
          </div>
        `}
        <div class="section-sep"></div>
      </div>
    `;
  }

  function buildProyeccion(proy) {
    const { proyeccionSaldo, ingresosMes, proyeccionEgresos, porcentajeMes, diasRestantes } = proy;
    const positivo = proyeccionSaldo >= 0;
    const porcentajeUsado = ingresosMes > 0 ? Math.min(100, Math.round((proy.egresosMes / ingresosMes) * 100)) : 0;

    return `
      <div class="proyeccion-card">
        <div class="proyeccion-title">📊 Proyección al fin de mes</div>
        <div class="proyeccion-val ${positivo ? 'text-green' : 'text-red'}">
          ${positivo ? '+' : ''}${Parser.formatCOP(proyeccionSaldo)}
        </div>
        <div class="proyeccion-desc">
          Si sigues a este ritmo, ${positivo ? 'te sobrarán' : 'tendrás déficit de'} 
          ${Parser.formatCOP(Math.abs(proyeccionSaldo))} al final del mes.
          Quedan ${diasRestantes} días.
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${porcentajeMes}%; background:${positivo ? 'var(--green)' : 'var(--red)'}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--text3)">
          <span>Día ${new Date().getDate()}</span>
          <span>${porcentajeMes}% del mes</span>
          <span>Día ${new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()}</span>
        </div>
      </div>
    `;
  }

  function buildResumenPrestamos(prestamos, todosAbonos) {
    if (!prestamos.length) return '';

    let totalDebo = 0, totalMeDeben = 0;
    for (const p of prestamos) {
      const abonos = todosAbonos.filter(a => a.prestamo_id === p.id);
      const totalAbonado = abonos.reduce((s, a) => s + a.monto, 0);
      const saldo = p.montoOriginal - totalAbonado;
      if (p.tipo === 'debo') totalDebo += saldo;
      else totalMeDeben += saldo;
    }

    return `
      <div class="section-title" style="margin-top:8px;">Préstamos activos</div>
      <div class="resumen-prestamos">
        <div class="resumen-prestamo-card">
          <div class="rp-label">Yo debo</div>
          <div class="rp-val rp-debo">${Parser.formatCOP(totalDebo, true)}</div>
        </div>
        <div class="resumen-prestamo-card">
          <div class="rp-label">Me deben</div>
          <div class="rp-val rp-deben">${Parser.formatCOP(totalMeDeben, true)}</div>
        </div>
      </div>
    `;
  }

  function generarAlertas(movimientos, prestamos, todosAbonos, proy) {
    const alertas = [];
    const hoy = new Date().toISOString().split('T')[0];

    // Alerta: gastos superan ingresos este mes
    if (proy.egresosMes > proy.ingresosMes && proy.ingresosMes > 0) {
      alertas.push({
        tipo: 'danger',
        icono: '🔴',
        mensaje: `Tus egresos (${Parser.formatCOP(proy.egresosMes, true)}) superan tus ingresos del mes (${Parser.formatCOP(proy.ingresosMes, true)}).`
      });
    }

    // Alerta: proyección negativa
    if (proy.proyeccionSaldo < 0 && proy.ingresosMes > 0) {
      alertas.push({
        tipo: 'warn',
        icono: '⚡',
        mensaje: `Al ritmo actual terminarás el mes con déficit de ${Parser.formatCOP(Math.abs(proy.proyeccionSaldo), true)}.`
      });
    }

    // Alerta: préstamos próximos a vencer
    for (const p of prestamos) {
      if (p.fechaFin) {
        const dias = Parser.diasEntre(hoy, p.fechaFin);
        if (dias >= 0 && dias <= 7) {
          alertas.push({
            tipo: 'warn',
            icono: '📅',
            mensaje: `Préstamo con ${p.persona} vence en ${dias === 0 ? 'hoy' : dias + ' días'} (${Parser.formatCOP(p.montoOriginal, true)}).`
          });
        }
      }
    }

    // Alerta: sin ingresos registrados este mes
    if (proy.ingresosMes === 0 && proy.egresosMes > 0) {
      alertas.push({
        tipo: 'info',
        icono: '💡',
        mensaje: 'No tienes ingresos registrados este mes. ¿Recibiste tu pago?'
      });
    }

    return alertas.slice(0, 3);
  }

  function buildMovItem(m) {
    const cat = Parser.CATEGORIAS[m.categoria] || Parser.CATEGORIAS.otros;
    return `
      <div class="mov-item">
        <div class="mov-icon" style="background:${m.tipo === 'ingreso' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}">
          ${cat.emoji}
        </div>
        <div class="mov-info">
          <div class="mov-desc">${m.descripcion || m.categoria}</div>
          <div class="mov-meta">${Parser.fechaLegible(m.fecha)} · ${m.cuenta}</div>
        </div>
        <div class="mov-monto ${m.tipo}">${m.tipo === 'ingreso' ? '+' : '-'}${Parser.formatCOP(m.monto, true)}</div>
      </div>
    `;
  }

  function bindEvents(movimientos, prestamos) {
    // Tabs de período
    document.querySelectorAll('.periodo-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        periodoActual = btn.dataset.periodo;
        render();
      });
    });
  }

  return { render };
})();
