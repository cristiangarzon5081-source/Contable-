/**
 * CONTABLE - Vista Dashboard
 */

const DashboardView = (() => {
  let periodoActual = 'mes';

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="dashboard-wrap fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>';

    try {
      const [movimientos, prestamos, todosAbonos, presupuestos] = await Promise.all([
        DB.obtenerMovimientos(),
        DB.obtenerPrestamos({ estado: 'activo' }),
        DB.obtenerTodosAbonos(),
        DB.obtenerPresupuestos()
      ]);
      const html = await buildDashboard(movimientos, prestamos, todosAbonos, presupuestos);
      container.innerHTML = html;
      bindEvents(movimientos, prestamos);
    } catch (e) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Error al cargar datos</p></div>';
    }
  }

  async function buildDashboard(movimientos, prestamos, todosAbonos, presupuestos = []) {
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
    const alertas = generarAlertas(movimientos, prestamos, todosAbonos, proy, presupuestos);

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
              <div class="saldo-sub-val">${Parser.formatCOP(ingresos)}</div>
            </div>
            <div class="saldo-sub-item">
              <div class="saldo-sub-label">↓ Egresos</div>
              <div class="saldo-sub-val">${Parser.formatCOP(egresos)}</div>
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

        <!-- Resumen semanal inteligente -->
        ${periodoActual === 'semana' ? buildResumenSemanal(movimientos) : ''}

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

  function buildResumenSemanal(movimientos) {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=dom
    // Lunes de esta semana
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    lunes.setHours(0,0,0,0);
    // Lunes de la semana pasada
    const lunesPasado = new Date(lunes);
    lunesPasado.setDate(lunes.getDate() - 7);
    const domingoPassado = new Date(lunes);
    domingoPassado.setDate(lunes.getDate() - 1);

    const fechaHoy = hoy.toISOString().split('T')[0];
    const fechaLunes = lunes.toISOString().split('T')[0];
    const fechaLunesPasado = lunesPasado.toISOString().split('T')[0];
    const fechaDomingoPassado = domingoPassado.toISOString().split('T')[0];

    // Movimientos de esta semana y la pasada
    const estaSemana = movimientos.filter(m => m.fecha >= fechaLunes && m.fecha <= fechaHoy);
    const semanaPassada = movimientos.filter(m => m.fecha >= fechaLunesPasado && m.fecha <= fechaDomingoPassado);

    const egresosEsta = estaSemana.filter(m => m.tipo === 'egreso').reduce((s,m) => s+m.monto, 0);
    const ingresosEsta = estaSemana.filter(m => m.tipo === 'ingreso').reduce((s,m) => s+m.monto, 0);
    const egresosPasada = semanaPassada.filter(m => m.tipo === 'egreso').reduce((s,m) => s+m.monto, 0);

    // Comparativa con semana anterior
    const diff = egresosEsta - egresosPasada;
    const pctDiff = egresosPasada > 0 ? Math.round(Math.abs(diff / egresosPasada) * 100) : null;
    const mejoro = diff < 0;

    // Día con más gastos esta semana
    const porDia = {};
    const diasNombre = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    for (const m of estaSemana.filter(m => m.tipo === 'egreso')) {
      const d = new Date(m.fecha + 'T12:00:00');
      const key = m.fecha;
      if (!porDia[key]) porDia[key] = { total: 0, nombre: diasNombre[d.getDay()], fecha: m.fecha };
      porDia[key].total += m.monto;
    }
    const diasOrdenados = Object.values(porDia).sort((a,b) => b.total - a.total);
    const diaMasCaro = diasOrdenados[0];

    // Top 3 categorías esta semana
    const porCat = {};
    for (const m of estaSemana.filter(m => m.tipo === 'egreso')) {
      porCat[m.categoria] = (porCat[m.categoria] || 0) + m.monto;
    }
    const topCats = Object.entries(porCat).sort((a,b) => b[1]-a[1]).slice(0,3);

    // Promedio diario esta semana
    const diasTranscurridos = Math.max(1, diaSemana === 0 ? 7 : diaSemana);
    const promDiario = egresosEsta / diasTranscurridos;

    // Días restantes de la semana
    const diasRestantes = diaSemana === 0 ? 0 : 7 - diaSemana;

    const cats = Parser.getCategoriasMerged();

    return `
      <div class="resumen-semanal">
        <div class="rs-header">
          <span class="rs-titulo">📅 Resumen de la semana</span>
          <span class="rs-fecha">${Parser.fechaLegible(fechaLunes)} – ${Parser.fechaLegible(fechaHoy)}</span>
        </div>

        <!-- Totales -->
        <div class="rs-totales">
          <div class="rs-total-item">
            <div class="rs-total-label">Egresos</div>
            <div class="rs-total-val text-red">${Parser.formatCOP(egresosEsta)}</div>
          </div>
          <div class="rs-sep"></div>
          <div class="rs-total-item">
            <div class="rs-total-label">Ingresos</div>
            <div class="rs-total-val text-green">${Parser.formatCOP(ingresosEsta)}</div>
          </div>
          <div class="rs-sep"></div>
          <div class="rs-total-item">
            <div class="rs-total-label">Prom/día</div>
            <div class="rs-total-val">${Parser.formatCOP(promDiario)}</div>
          </div>
        </div>

        <!-- Comparativa semana anterior -->
        ${egresosPasada > 0 ? `
          <div class="rs-comparativa ${mejoro ? 'mejor' : 'peor'}">
            <span class="rs-comp-icono">${mejoro ? '📉' : '📈'}</span>
            <span class="rs-comp-texto">
              ${mejoro
                ? `Gastaste ${Parser.formatCOP(Math.abs(diff))} <strong>menos</strong> que la semana pasada`
                : `Gastaste ${Parser.formatCOP(Math.abs(diff))} <strong>más</strong> que la semana pasada`
              }
              ${pctDiff !== null ? `<span class="rs-comp-pct">(${pctDiff}%)</span>` : ''}
            </span>
          </div>
        ` : `
          <div class="rs-comparativa neutral">
            <span class="rs-comp-icono">📊</span>
            <span class="rs-comp-texto">Sin datos de la semana anterior para comparar</span>
          </div>
        `}

        <!-- Día más caro -->
        ${diaMasCaro ? `
          <div class="rs-insight">
            <span class="rs-insight-icono">💸</span>
            <span>El <strong>${diaMasCaro.nombre}</strong> fue tu día más costoso: ${Parser.formatCOP(diaMasCaro.total)}</span>
          </div>
        ` : ''}

        <!-- Top categorías -->
        ${topCats.length ? `
          <div class="rs-cats">
            <div class="rs-cats-titulo">Dónde más gastaste</div>
            ${topCats.map(([slug, monto], i) => {
              const info = cats[slug] || Parser.CATEGORIAS.otros;
              const pct = egresosEsta > 0 ? Math.round((monto/egresosEsta)*100) : 0;
              const colores = ['#f87171','#fb923c','#fbbf24'];
              return `
                <div class="rs-cat-item">
                  <span class="rs-cat-emoji">${info.emoji}</span>
                  <div class="rs-cat-info">
                    <div class="rs-cat-nombre">${info.nombre || slug}</div>
                    <div class="rs-cat-bar-wrap">
                      <div class="rs-cat-bar" style="width:${pct}%;background:${colores[i]}"></div>
                    </div>
                  </div>
                  <span class="rs-cat-monto">${Parser.formatCOP(monto)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Días restantes -->
        ${diasRestantes > 0 ? `
          <div class="rs-insight">
            <span class="rs-insight-icono">⏳</span>
            <span>Quedan <strong>${diasRestantes} días</strong> de semana. A este ritmo cerrarás en ${Parser.formatCOP(egresosEsta + promDiario * diasRestantes)}.</span>
          </div>
        ` : `
          <div class="rs-insight">
            <span class="rs-insight-icono">✅</span>
            <span>Semana cerrada. Total gastado: <strong>${Parser.formatCOP(egresosEsta)}</strong></span>
          </div>
        `}
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
          <div class="rp-val rp-debo">${Parser.formatCOP(totalDebo)}</div>
        </div>
        <div class="resumen-prestamo-card">
          <div class="rp-label">Me deben</div>
          <div class="rp-val rp-deben">${Parser.formatCOP(totalMeDeben)}</div>
        </div>
      </div>
    `;
  }

  function generarAlertas(movimientos, prestamos, todosAbonos, proy, presupuestos = []) {
    const alertas = [];
    const hoy = new Date().toISOString().split('T')[0];
    const prefMes = new Date().toISOString().slice(0, 7);

    if (proy.egresosMes > proy.ingresosMes && proy.ingresosMes > 0) {
      alertas.push({ tipo: 'danger', icono: '🔴',
        mensaje: `Tus egresos (${Parser.formatCOP(proy.egresosMes)}) superan tus ingresos del mes (${Parser.formatCOP(proy.ingresosMes)}).`
      });
    }
    if (proy.proyeccionSaldo < 0 && proy.ingresosMes > 0) {
      alertas.push({ tipo: 'warn', icono: '⚡',
        mensaje: `Al ritmo actual terminarás el mes con déficit de ${Parser.formatCOP(Math.abs(proy.proyeccionSaldo))}.`
      });
    }
    // Alertas de presupuesto
    for (const presup of presupuestos) {
      const mes = presup.mes === 'todos' ? prefMes : presup.mes;
      if (mes !== prefMes) continue;
      const gastado = movimientos
        .filter(m => m.tipo === 'egreso' && m.categoria === presup.categoriaSlug && m.fecha.startsWith(prefMes))
        .reduce((s, m) => s + m.monto, 0);
      const pct = Math.round((gastado / presup.monto) * 100);
      const cats = Parser.getCategoriasMerged();
      const info = cats[presup.categoriaSlug] || Parser.CATEGORIAS.otros;
      if (pct >= 100) {
        alertas.push({ tipo: 'danger', icono: '🚨',
          mensaje: `${info.emoji} Superaste el presupuesto de ${info.nombre || presup.categoriaSlug}: ${Parser.formatCOP(gastado)} / ${Parser.formatCOP(presup.monto)}.`
        });
      } else if (pct >= 80) {
        alertas.push({ tipo: 'warn', icono: '⚠️',
          mensaje: `${info.emoji} Llevas el ${pct}% del presupuesto de ${info.nombre || presup.categoriaSlug} (${Parser.formatCOP(gastado)} / ${Parser.formatCOP(presup.monto)}).`
        });
      }
    }
    for (const p of prestamos) {
      if (p.fechaFin) {
        const dias = Parser.diasEntre(hoy, p.fechaFin);
        if (dias >= 0 && dias <= 7) {
          alertas.push({ tipo: 'warn', icono: '📅',
            mensaje: `Préstamo con ${p.persona} vence en ${dias === 0 ? 'hoy' : dias + ' días'} (${Parser.formatCOP(p.montoOriginal)}).`
          });
        }
      }
    }
    if (proy.ingresosMes === 0 && proy.egresosMes > 0) {
      alertas.push({ tipo: 'info', icono: '💡',
        mensaje: 'No tienes ingresos registrados este mes. ¿Recibiste tu pago?'
      });
    }
    return alertas.slice(0, 4);
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
        <div class="mov-monto ${m.tipo}">${m.tipo === 'ingreso' ? '+' : '-'}${Parser.formatCOP(m.monto)}</div>
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
