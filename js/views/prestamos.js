/**
 * CONTABLE - Vista Préstamos
 */

const PrestamosView = (() => {
  let tabActual = 'activos';
  let prestamoAbonar = null;

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="prestamos-wrap fade-in">
        <div class="prestamo-tabs">
          <button class="prestamo-tab ${tabActual === 'activos' ? 'active' : ''}" data-tab="activos">Activos</button>
          <button class="prestamo-tab ${tabActual === 'historial' ? 'active' : ''}" data-tab="historial">Liquidados</button>
        </div>
        <div id="prestamos-lista"><div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div></div>
      </div>
    `;

    document.querySelectorAll('.prestamo-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabActual = btn.dataset.tab;
        document.querySelectorAll('.prestamo-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cargarPrestamos();
      });
    });

    await cargarPrestamos();
  }

  async function cargarPrestamos() {
    const estado = tabActual === 'activos' ? 'activo' : 'liquidado';
    try {
      const [prestamos, todosAbonos] = await Promise.all([
        DB.obtenerPrestamos({ estado }),
        DB.obtenerTodosAbonos()
      ]);
      renderPrestamos(prestamos, todosAbonos);
    } catch (e) {
      document.getElementById('prestamos-lista').innerHTML = '<div class="empty-state"><p>Error</p></div>';
    }
  }

  function renderPrestamos(prestamos, todosAbonos) {
    const lista = document.getElementById('prestamos-lista');
    if (!lista) return;

    if (!prestamos.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${tabActual === 'activos' ? '🤝' : '✅'}</div>
          <div class="empty-title">${tabActual === 'activos' ? 'Sin préstamos activos' : 'Sin préstamos liquidados'}</div>
          <p>${tabActual === 'activos' ? 'Registra un préstamo con el botón +' : 'Los préstamos pagados aparecerán aquí'}</p>
        </div>
        ${tabActual === 'activos' ? buildBtnNuevo() : ''}
      `;
      bindBtnNuevo();
      return;
    }

    // Separar deudas propias y de otros
    const debo = prestamos.filter(p => p.tipo === 'debo');
    const meDeben = prestamos.filter(p => p.tipo === 'me_deben');

    // Resumen
    let totalDebo = 0, totalMeDeben = 0;
    for (const p of prestamos) {
      const abonos = todosAbonos.filter(a => a.prestamo_id === p.id);
      const totalAbonado = abonos.reduce((s, a) => s + a.monto, 0);
      const saldo = Math.max(0, p.montoOriginal - totalAbonado);
      if (p.tipo === 'debo') totalDebo += saldo;
      else totalMeDeben += saldo;
    }

    let html = '';

    if (tabActual === 'activos') {
      html += `
        <div class="resumen-prestamos">
          <div class="resumen-prestamo-card">
            <div class="rp-label">Total yo debo</div>
            <div class="rp-val rp-debo">${Parser.formatCOP(totalDebo, true)}</div>
          </div>
          <div class="resumen-prestamo-card">
            <div class="rp-label">Total me deben</div>
            <div class="rp-val rp-deben">${Parser.formatCOP(totalMeDeben, true)}</div>
          </div>
        </div>
      `;
    }

    if (debo.length) {
      html += `<div class="section-title">Yo debo</div>`;
      html += debo.map(p => buildPrestamoCard(p, todosAbonos)).join('');
    }

    if (meDeben.length) {
      html += `<div class="section-title" style="margin-top:8px">Me deben</div>`;
      html += meDeben.map(p => buildPrestamoCard(p, todosAbonos)).join('');
    }

    if (tabActual === 'activos') html += buildBtnNuevo();

    lista.innerHTML = html;
    bindPrestamoEvents(prestamos, todosAbonos);
    bindBtnNuevo();
  }

  function buildPrestamoCard(p, todosAbonos) {
    const abonos = todosAbonos.filter(a => a.prestamo_id === p.id);
    const totalAbonado = abonos.reduce((s, a) => s + a.monto, 0);
    const saldoPendiente = Math.max(0, p.montoOriginal - totalAbonado);
    const porcentajePagado = Math.min(100, Math.round((totalAbonado / p.montoOriginal) * 100));
    const esDebo = p.tipo === 'debo';
    const hoy = new Date().toISOString().split('T')[0];
    let diasFin = null;
    if (p.fechaFin) {
      diasFin = Parser.diasEntre(hoy, p.fechaFin);
    }

    // Cálculo de cuota si tiene interés
    let cuotaInfo = '';
    if (p.interesMensual > 0 && p.numCuotas) {
      const calc = Parser.calcularPrestamo(p.montoOriginal, p.interesMensual, p.numCuotas);
      cuotaInfo = `<div class="det-item"><div class="det-label">Cuota mensual</div><div class="det-val">${Parser.formatCOP(calc.cuotaMensual)}</div></div>`;
    }

    const colorBarra = esDebo ? '#f87171' : '#34d399';

    return `
      <div class="prestamo-card" data-prestamo-id="${p.id}">
        <div class="prestamo-header">
          <div class="prestamo-avatar">${esDebo ? '🏦' : '👤'}</div>
          <div class="prestamo-info">
            <div class="prestamo-persona">${p.persona}</div>
            <span class="prestamo-tipo-badge ${esDebo ? 'badge-debo' : 'badge-me-deben'}">
              ${esDebo ? 'Yo debo' : 'Me deben'}
            </span>
            ${p.interesMensual > 0 ? `<span style="font-size:11px;color:var(--text3);margin-left:6px;">📈 ${p.interesMensual}% mensual</span>` : '<span style="font-size:11px;color:var(--text3);margin-left:6px;">Sin interés</span>'}
          </div>
          <div>
            <div class="prestamo-monto-total" style="color:${esDebo?'#f87171':'#34d399'}">${Parser.formatCOP(saldoPendiente, true)}</div>
            <div style="font-size:11px;color:var(--text3);text-align:right;">pendiente</div>
          </div>
        </div>

        <div class="prestamo-detalle">
          <div class="det-item">
            <div class="det-label">Monto original</div>
            <div class="det-val">${Parser.formatCOP(p.montoOriginal)}</div>
          </div>
          <div class="det-item">
            <div class="det-label">Abonado</div>
            <div class="det-val text-green">${Parser.formatCOP(totalAbonado)}</div>
          </div>
          ${cuotaInfo}
          ${p.numCuotas ? `<div class="det-item"><div class="det-label">Cuotas</div><div class="det-val">${p.numCuotas}</div></div>` : ''}
          ${p.fechaInicio ? `<div class="det-item"><div class="det-label">Inicio</div><div class="det-val">${p.fechaInicio}</div></div>` : ''}
          ${p.fechaFin ? `
            <div class="det-item">
              <div class="det-label">Vence</div>
              <div class="det-val ${diasFin !== null && diasFin <= 7 ? 'text-red' : ''}">
                ${p.fechaFin}${diasFin !== null && diasFin >= 0 ? ` (${diasFin}d)` : diasFin !== null ? ' ⚠️ Vencido' : ''}
              </div>
            </div>
          ` : ''}
          ${p.nota ? `<div class="det-item" style="grid-column:span 2"><div class="det-label">Nota</div><div class="det-val" style="font-size:13px">${p.nota}</div></div>` : ''}
        </div>

        <div class="prestamo-progress">
          <div class="prestamo-progress-labels">
            <span>Pagado ${porcentajePagado}%</span>
            <span>Falta ${Parser.formatCOP(saldoPendiente, true)}</span>
          </div>
          <div class="prestamo-progress-bar">
            <div class="prestamo-progress-fill" style="width:${porcentajePagado}%;background:${colorBarra}"></div>
          </div>
        </div>

        ${p.estado === 'activo' ? `
          <div class="prestamo-footer">
            <button class="btn-abono" data-abono="${p.id}">+ Registrar abono</button>
            <button class="btn-liquidar" data-liquidar="${p.id}">✅ Liquidar</button>
            <button class="btn-eliminar-prestamo" data-eliminar="${p.id}">🗑️</button>
          </div>
        ` : `
          <div style="padding:10px 14px;text-align:center;font-size:13px;color:var(--green)">✅ Préstamo liquidado</div>
        `}
      </div>
    `;
  }

  function buildBtnNuevo() {
    return `
      <button class="btn-nuevo-prestamo" id="btn-nuevo-prestamo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Registrar nuevo préstamo
      </button>
    `;
  }

  function bindBtnNuevo() {
    const btn = document.getElementById('btn-nuevo-prestamo');
    if (btn) btn.addEventListener('click', () => App.abrirModalPrestamo());
  }

  function bindPrestamoEvents(prestamos) {
    // Botón abono
    document.querySelectorAll('[data-abono]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.abono);
        const p = prestamos.find(x => x.id === id);
        if (!p) return;
        prestamoAbonar = p;
        abrirModalAbono(p);
      });
    });

    // Botón liquidar
    document.querySelectorAll('[data-liquidar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.liquidar);
        if (confirm('¿Marcar este préstamo como liquidado?')) {
          await DB.actualizarPrestamo(id, { estado: 'liquidado' });
          await cargarPrestamos();
        }
      });
    });

    // Botón eliminar
    document.querySelectorAll('[data-eliminar]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.eliminar);
        if (confirm('¿Eliminar este préstamo? Esta acción no se puede deshacer.')) {
          await DB.eliminarPrestamo(id);
          await cargarPrestamos();
        }
      });
    });
  }

  function abrirModalAbono(prestamo) {
    const modal = document.getElementById('modal-abono');
    document.getElementById('abono-titulo').textContent = `Abono a ${prestamo.persona}`;
    document.getElementById('abono-monto').value = '';
    document.getElementById('abono-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('abono-nota').value = '';
    modal.classList.remove('hidden');

    document.getElementById('btn-guardar-abono').onclick = async () => {
      const montoStr = document.getElementById('abono-monto').value.replace(/\./g, '').replace(/,/g, '.');
      const monto = parseFloat(montoStr);
      const fecha = document.getElementById('abono-fecha').value;
      const nota = document.getElementById('abono-nota').value;

      if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }

      await DB.agregarAbono({ prestamo_id: prestamo.id, monto, fecha, nota });
      modal.classList.add('hidden');
      await cargarPrestamos();
    };
  }

  return { render };
})();
