/**
 * CONTABLE - Editar movimiento + Presupuestos por categoría
 */

// ── EDITAR MOVIMIENTO ─────────────────────────────────────────────
const EditarMovView = (() => {
  let _movActual = null;
  let _catEditada = null;
  let _onGuardado = null;

  function abrir(mov, onGuardado) {
    _movActual = mov;
    _catEditada = mov.categoria;
    _onGuardado = onGuardado;

    const modal = document.getElementById('modal-editar-mov');

    // Tipo
    document.querySelectorAll('[data-edit-tipo]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.editTipo === mov.tipo);
    });

    // Monto
    document.getElementById('edit-monto').value = Math.round(mov.monto).toLocaleString('es-CO');

    // Descripción
    document.getElementById('edit-descripcion').value = mov.descripcion || '';

    // Categoría
    renderCatDisplay(mov.categoria);

    // Cuenta
    document.getElementById('edit-cuenta').value = mov.cuenta || 'efectivo';

    // Fecha
    document.getElementById('edit-fecha').value = mov.fecha;

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('edit-monto').focus(), 200);

    // Bindings únicos (reemplazar anteriores)
    bindEditar();
  }

  function renderCatDisplay(catSlug) {
    const cats = Parser.getCategoriasMerged();
    const info = cats[catSlug] || Parser.CATEGORIAS.otros;
    const el = document.getElementById('edit-cat-display');
    el.innerHTML = `
      <span class="cat-detectada-emoji">${info.emoji}</span>
      <span class="cat-detectada-label">Categoría: <strong>${info.nombre || catSlug}</strong></span>
    `;
    el.className = `cat-detectada ${catSlug === 'otros' ? 'otros' : ''}`;
    el.onclick = () => {
      // Reutilizar el selector de categorías global de App
      App._abrirCatSelector(catSlug, nuevaCat => {
        _catEditada = nuevaCat;
        renderCatDisplay(nuevaCat);
      });
    };
  }

  function bindEditar() {
    const modal = document.getElementById('modal-editar-mov');

    // Reemplazar listeners existentes clonando el botón
    const btnGuardar = document.getElementById('btn-guardar-edicion');
    const btnNuevo = btnGuardar.cloneNode(true);
    btnGuardar.parentNode.replaceChild(btnNuevo, btnGuardar);
    btnNuevo.addEventListener('click', guardar);

    // Tipo
    modal.querySelectorAll('[data-edit-tipo]').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('[data-edit-tipo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    // Monto formato
    document.getElementById('edit-monto').oninput = e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    };

    // Backdrop
    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');
  }

  async function guardar() {
    const modal = document.getElementById('modal-editar-mov');
    const tipoBtn = modal.querySelector('[data-edit-tipo].active');
    const tipo = tipoBtn ? tipoBtn.dataset.editTipo : _movActual.tipo;
    const montoRaw = document.getElementById('edit-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw);
    const descripcion = document.getElementById('edit-descripcion').value.trim();
    const cuenta = document.getElementById('edit-cuenta').value;
    const fecha = document.getElementById('edit-fecha').value;

    if (!monto || monto <= 0) {
      document.getElementById('edit-monto').style.outline = '2px solid var(--red)';
      setTimeout(() => document.getElementById('edit-monto').style.outline = '', 1500);
      return;
    }

    await DB.editarMovimiento(_movActual.id, { tipo, monto, descripcion, categoria: _catEditada, cuenta, fecha });
    modal.classList.add('hidden');
    if (_onGuardado) _onGuardado();
  }

  return { abrir };
})();

// ── PRESUPUESTOS ──────────────────────────────────────────────────
const PresupuestosView = (() => {
  let _catSlug = null;
  let _catNombre = null;
  let _mes = null;
  let _onGuardado = null;

  function abrir(catSlug, catNombre, mes, gastoActual, onGuardado) {
    _catSlug = catSlug;
    _catNombre = catNombre;
    _mes = mes;
    _onGuardado = onGuardado;

    document.getElementById('presupuesto-titulo').textContent = `Presupuesto — ${catNombre}`;
    document.getElementById('presupuesto-subtitulo').textContent =
      `Llevas ${Parser.formatCOP(gastoActual)} gastado este mes en esta categoría.`;

    // Cargar presupuesto existente si hay
    DB.obtenerPresupuestos().then(presupuestos => {
      const existente = presupuestos.find(p => p.categoriaSlug === catSlug && p.mes === mes)
        || presupuestos.find(p => p.categoriaSlug === catSlug && p.mes === 'todos');
      document.getElementById('presupuesto-monto').value =
        existente ? Math.round(existente.monto).toLocaleString('es-CO') : '';
    });

    const modal = document.getElementById('modal-presupuesto');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('presupuesto-monto').focus(), 200);

    // Formato monto
    document.getElementById('presupuesto-monto').oninput = e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    };

    // Backdrop
    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');

    // Botón guardar
    const btn = document.getElementById('btn-guardar-presupuesto');
    const btnNuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(btnNuevo, btn);
    btnNuevo.addEventListener('click', guardar);
  }

  async function guardar() {
    const montoRaw = document.getElementById('presupuesto-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw) || 0;

    if (monto === 0) {
      await DB.eliminarPresupuesto(_catSlug, _mes);
    } else {
      await DB.guardarPresupuesto(_catSlug, monto, _mes);
    }

    document.getElementById('modal-presupuesto').classList.add('hidden');
    if (_onGuardado) _onGuardado();
  }

  return { abrir };
})();
