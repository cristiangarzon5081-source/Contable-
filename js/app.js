/**
 * CONTABLE - App principal
 * Orquesta la navegación, modales y lógica global
 */

const App = (() => {
  let vistaActual = 'dashboard';
  let tipoMovimiento = 'egreso';
  let tipoPrestamo = 'debo';

  const VIEWS = {
    dashboard: DashboardView,
    historial: HistorialView,
    prestamos: PrestamosView,
    estadisticas: EstadisticasView,
    categorias: CategoriasView
  };

  function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    setTimeout(() => {
      document.getElementById('splash').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
        navegarA('dashboard');
      }, 500);
    }, 1000);

    bindNav();
    bindModalEntrada();
    bindModalPrestamo();
    bindModalAbono();
    bindModalCategoria();
    bindFechaDefault();
    // Cargar categorías personalizadas al inicio para que el categorizador las use
    Parser.cargarCatsPersonalizadas().catch(() => {});
  }

  // ── NAVEGACIÓN ────────────────────────────────────────────────
  function navegarA(vista) {
    vistaActual = vista;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === vista);
    });
    VIEWS[vista].render();
  }

  function bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => navegarA(btn.dataset.view));
    });

    document.getElementById('btn-add').addEventListener('click', () => {
      if (vistaActual === 'prestamos') {
        abrirModalPrestamo();
      } else {
        abrirModalEntrada();
      }
    });
  }

  function bindFechaDefault() {
    const hoy = new Date().toISOString().split('T')[0];
    ['input-fecha', 'prestamo-fecha-inicio', 'abono-fecha'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = hoy;
    });
  }

  // ── MODAL ENTRADA ─────────────────────────────────────────────
  function abrirModalEntrada() {
    const modal = document.getElementById('modal-entrada');
    document.getElementById('input-monto').value = '';
    document.getElementById('input-descripcion').value = '';
    document.getElementById('input-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('select-cuenta').value = 'efectivo';
    ocultarCatDetectada();
    ocultarDesglose();
    setTipoMovimiento('egreso');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('input-monto').focus(), 300);
  }

  function cerrarModalEntrada() {
    document.getElementById('modal-entrada').classList.add('hidden');
    ocultarDesglose();
  }

  // ── DESGLOSE (compras mixtas) ─────────────────────────────────
  function mostrarDesglose() {
    const wrap = document.getElementById('desglose-wrap');
    wrap.classList.remove('hidden');
  }

  function ocultarDesglose() {
    const wrap = document.getElementById('desglose-wrap');
    if (wrap) wrap.classList.add('hidden');
    const items = document.getElementById('desglose-items');
    if (items) items.classList.add('hidden');
    const btn = document.getElementById('btn-desglose-toggle');
    if (btn) { btn.textContent = 'Sí, desglosar'; btn.classList.remove('activo'); }
    const lista = document.getElementById('desglose-lista');
    if (lista) lista.innerHTML = '';
    const resumen = document.getElementById('desglose-resumen');
    if (resumen) resumen.innerHTML = '';
  }

  function buildDesgloseItem(cats) {
    const div = document.createElement('div');
    div.className = 'desglose-item';
    const catOpts = cats.map(([slug, c]) =>
      `<option value="${slug}">${c.emoji} ${c.nombre}</option>`
    ).join('');
    div.innerHTML = `
      <select class="desglose-item-cat">${catOpts}</select>
      <input type="text" class="desglose-item-monto" placeholder="$0" inputmode="numeric" />
      <button class="desglose-item-del" title="Quitar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    // Formato monto
    div.querySelector('.desglose-item-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
      actualizarResumenDesglose();
    });
    div.querySelector('.desglose-item-del').addEventListener('click', () => {
      div.remove();
      actualizarResumenDesglose();
    });
    return div;
  }

  function actualizarResumenDesglose() {
    const montoRaw = document.getElementById('input-monto').value.replace(/\./g, '').replace(/,/g, '');
    const montoTotal = parseFloat(montoRaw) || 0;
    const items = document.querySelectorAll('.desglose-item');
    let suma = 0;
    items.forEach(item => {
      const v = item.querySelector('.desglose-item-monto').value.replace(/\./g, '').replace(/,/g, '');
      suma += parseFloat(v) || 0;
    });
    const resumen = document.getElementById('desglose-resumen');
    if (!resumen || montoTotal === 0) return;
    const diferencia = montoTotal - suma;
    const clase = Math.abs(diferencia) < 1 ? 'desglose-ok' : diferencia > 0 ? 'desglose-warn' : 'desglose-err';
    const msg = Math.abs(diferencia) < 1
      ? '✅ Total cuadra'
      : diferencia > 0
        ? `Faltan $${Math.round(diferencia).toLocaleString('es-CO')} por asignar`
        : `Excedes el total por $${Math.round(Math.abs(diferencia)).toLocaleString('es-CO')}`;
    resumen.innerHTML = `<span class="${clase}">${msg}</span>`;
  }

  function bindDesglose() {
    const btnToggle = document.getElementById('btn-desglose-toggle');
    const itemsWrap = document.getElementById('desglose-items');
    const lista = document.getElementById('desglose-lista');
    const btnAdd = document.getElementById('btn-desglose-add');
    if (!btnToggle) return;

    btnToggle.addEventListener('click', () => {
      const abierto = !itemsWrap.classList.contains('hidden');
      if (abierto) {
        itemsWrap.classList.add('hidden');
        btnToggle.textContent = 'Sí, desglosar';
        btnToggle.classList.remove('activo');
        lista.innerHTML = '';
      } else {
        itemsWrap.classList.remove('hidden');
        btnToggle.textContent = 'Cancelar';
        btnToggle.classList.add('activo');
        // Agregar dos ítems iniciales
        const cats = Object.entries(Parser.getCategoriasMerged()).filter(([s]) => s !== 'otros');
        lista.appendChild(buildDesgloseItem(cats));
        lista.appendChild(buildDesgloseItem(cats));
      }
    });

    btnAdd.addEventListener('click', () => {
      const cats = Object.entries(Parser.getCategoriasMerged()).filter(([s]) => s !== 'otros');
      lista.appendChild(buildDesgloseItem(cats));
    });
  }

  function setTipoMovimiento(tipo) {
    tipoMovimiento = tipo;
    document.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
  }

  // Muestra la categoría detectada debajo del campo de descripción
  function mostrarCatDetectada(cat) {
    const el = document.getElementById('cat-detectada');
    if (!el) return;
    const info = Parser.CATEGORIAS[cat] || Parser.CATEGORIAS.otros;
    const nombreCat = cat.charAt(0).toUpperCase() + cat.slice(1);

    el.className = `cat-detectada ${cat === 'otros' ? 'otros' : ''}`;
    el.innerHTML = `
      <span class="cat-detectada-emoji">${info.emoji}</span>
      <span class="cat-detectada-label">
        Categoría detectada: <strong>${nombreCat}</strong>
      </span>
    `;
    el.classList.remove('hidden');
    document.getElementById('input-descripcion').style.borderRadius = '12px 12px 0 0';
  }

  function ocultarCatDetectada() {
    const el = document.getElementById('cat-detectada');
    if (el) el.classList.add('hidden');
    const inp = document.getElementById('input-descripcion');
    if (inp) inp.style.borderRadius = '';
  }

  function bindModalEntrada() {
    const modal = document.getElementById('modal-entrada');
    modal.querySelector('.modal-backdrop').addEventListener('click', cerrarModalEntrada);

    // Selector de tipo
    modal.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.addEventListener('click', () => setTipoMovimiento(btn.dataset.tipo));
    });

    // Categorización automática en tiempo real mientras escribe
    const inputDesc = document.getElementById('input-descripcion');
    let catTimeout;
    inputDesc.addEventListener('input', () => {
      clearTimeout(catTimeout);
      const texto = inputDesc.value.trim();
      if (!texto) { ocultarCatDetectada(); ocultarDesglose(); return; }
      catTimeout = setTimeout(() => {
        const cat = Parser.categorizarAuto(texto);
        mostrarCatDetectada(cat);
        // Detectar si es lugar de compra mixta
        if (Parser.esLugarMixto(texto)) {
          mostrarDesglose();
        } else {
          ocultarDesglose();
        }
      }, 250);
    });

    // Formato de monto (puntos de miles automáticos)
    document.getElementById('input-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) {
        e.target.value = parseInt(val, 10).toLocaleString('es-CO');
      }
    });

    // Enter en descripción guarda
    inputDesc.addEventListener('keydown', e => {
      if (e.key === 'Enter') guardarMovimiento();
    });

    document.getElementById('btn-guardar').addEventListener('click', guardarMovimiento);
    bindDesglose();
  }

  async function guardarMovimiento() {
    const montoRaw = document.getElementById('input-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw);
    const descripcion = document.getElementById('input-descripcion').value.trim();
    const cuenta = document.getElementById('select-cuenta').value;
    const fecha = document.getElementById('input-fecha').value;

    if (!monto || monto <= 0) {
      vibrar();
      const inp = document.getElementById('input-monto');
      inp.style.outline = '2px solid var(--red)';
      setTimeout(() => inp.style.outline = '', 1500);
      return;
    }

    // Verificar si hay desglose activo
    const desgloseActivo = !document.getElementById('desglose-items').classList.contains('hidden');
    if (desgloseActivo) {
      await guardarConDesglose(monto, descripcion, cuenta, fecha);
      return;
    }

    // Sin desglose: guardado normal
    const categoria = Parser.categorizarAuto(descripcion) || 'otros';
    try {
      await DB.agregarMovimiento({ tipo: tipoMovimiento, monto, descripcion, categoria, cuenta, fecha });
      cerrarModalEntrada();
      navegarA(vistaActual);
    } catch (e) {
      alert('Error al guardar. Intenta de nuevo.');
    }
  }

  async function guardarConDesglose(montoTotal, descripcion, cuenta, fecha) {
    const items = document.querySelectorAll('.desglose-item');
    const movimientos = [];
    let sumaDesglose = 0;

    for (const item of items) {
      const catSlug = item.querySelector('.desglose-item-cat').value;
      const montoStr = item.querySelector('.desglose-item-monto').value.replace(/\./g, '').replace(/,/g, '');
      const monto = parseFloat(montoStr);
      if (!catSlug || !monto || monto <= 0) continue;
      movimientos.push({ catSlug, monto });
      sumaDesglose += monto;
    }

    if (!movimientos.length) {
      // No completó el desglose — guardar como uno solo
      const categoria = Parser.categorizarAuto(descripcion) || 'otros';
      await DB.agregarMovimiento({ tipo: tipoMovimiento, monto: montoTotal, descripcion, categoria, cuenta, fecha });
      cerrarModalEntrada();
      navegarA(vistaActual);
      return;
    }

    // Si la suma no cierra exactamente, agregar la diferencia en la primera categoría
    const diferencia = montoTotal - sumaDesglose;
    if (Math.abs(diferencia) > 1) {
      if (!confirm(`La suma del desglose ($${sumaDesglose.toLocaleString('es-CO')}) no coincide con el total ($${montoTotal.toLocaleString('es-CO')}). ¿Guardar de todas formas?`)) return;
    }

    // Guardar cada ítem como movimiento separado
    for (const mov of movimientos) {
      await DB.agregarMovimiento({
        tipo: tipoMovimiento,
        monto: mov.monto,
        descripcion: `${descripcion} — ${(Parser.getCategoriasMerged()[mov.catSlug]?.nombre || mov.catSlug)}`,
        categoria: mov.catSlug,
        cuenta,
        fecha
      });
    }

    cerrarModalEntrada();
    navegarA(vistaActual);
  }

  // ── MODAL PRÉSTAMO ────────────────────────────────────────────
  function abrirModalPrestamo() {
    const modal = document.getElementById('modal-prestamo');
    document.getElementById('prestamo-monto').value = '';
    document.getElementById('prestamo-persona').value = '';
    document.getElementById('prestamo-fecha-inicio').value = new Date().toISOString().split('T')[0];
    document.getElementById('prestamo-fecha-fin').value = '';
    document.getElementById('prestamo-interes').value = '';
    document.getElementById('prestamo-cuotas').value = '';
    document.getElementById('prestamo-nota').value = '';
    document.getElementById('prestamo-preview').classList.add('hidden');
    tipoPrestamo = 'debo';
    document.querySelectorAll('[data-prestamo]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.prestamo === 'debo');
    });
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('prestamo-monto').focus(), 300);
  }

  function cerrarModalPrestamo() {
    document.getElementById('modal-prestamo').classList.add('hidden');
  }

  function bindModalPrestamo() {
    const modal = document.getElementById('modal-prestamo');
    modal.querySelector('.modal-backdrop').addEventListener('click', cerrarModalPrestamo);

    modal.querySelectorAll('[data-prestamo]').forEach(btn => {
      btn.addEventListener('click', () => {
        tipoPrestamo = btn.dataset.prestamo;
        modal.querySelectorAll('[data-prestamo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('prestamo-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
      actualizarPreviewPrestamo();
    });

    ['prestamo-interes', 'prestamo-cuotas'].forEach(id => {
      document.getElementById(id).addEventListener('input', actualizarPreviewPrestamo);
    });

    document.getElementById('btn-guardar-prestamo').addEventListener('click', guardarPrestamo);
  }

  function actualizarPreviewPrestamo() {
    const montoRaw = document.getElementById('prestamo-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw);
    const interes = parseFloat(document.getElementById('prestamo-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('prestamo-cuotas').value) || 0;
    const preview = document.getElementById('prestamo-preview');

    if (!monto || monto <= 0) { preview.classList.add('hidden'); return; }

    const calc = Parser.calcularPrestamo(monto, interes, cuotas || null);
    let texto = `💰 Monto: <strong>${Parser.formatCOP(monto)}</strong><br>`;
    texto += interes > 0 ? `📈 Interés: ${interes}% mensual<br>` : `✅ Sin interés<br>`;

    if (cuotas > 0 && calc.cuotaMensual) {
      texto += `📅 ${cuotas} cuotas de <strong>${Parser.formatCOP(calc.cuotaMensual)}</strong><br>`;
      texto += calc.totalInteres > 0
        ? `💸 Total a pagar: ${Parser.formatCOP(calc.totalPagar)} (${Parser.formatCOP(calc.totalInteres)} en intereses)`
        : `✅ Total a pagar: ${Parser.formatCOP(calc.totalPagar)}`;
    }

    preview.innerHTML = texto;
    preview.classList.remove('hidden');
  }

  async function guardarPrestamo() {
    const montoRaw = document.getElementById('prestamo-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw);
    const persona = document.getElementById('prestamo-persona').value.trim();
    const fechaInicio = document.getElementById('prestamo-fecha-inicio').value;
    const fechaFin = document.getElementById('prestamo-fecha-fin').value;
    const interes = parseFloat(document.getElementById('prestamo-interes').value) || 0;
    const cuotas = parseInt(document.getElementById('prestamo-cuotas').value) || null;
    const nota = document.getElementById('prestamo-nota').value.trim();

    if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
    if (!persona) { alert('Ingresa el nombre de la persona o entidad'); return; }

    try {
      await DB.agregarPrestamo({
        tipo: tipoPrestamo, persona, montoOriginal: monto,
        interesMensual: interes, numCuotas: cuotas,
        fechaInicio, fechaFin: fechaFin || null, nota
      });
      cerrarModalPrestamo();
      navegarA('prestamos');
    } catch (e) {
      alert('Error al guardar préstamo');
    }
  }

  // ── MODAL ABONO ───────────────────────────────────────────────
  function bindModalAbono() {
    const modal = document.getElementById('modal-abono');
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    document.getElementById('abono-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    });
  }

  // ── MODAL CATEGORÍA ───────────────────────────────────────────
  function bindModalCategoria() {
    const modal = document.getElementById('modal-categoria');
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function vibrar() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  return { init, navegarA, abrirModalEntrada, abrirModalPrestamo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
