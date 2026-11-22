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
    estadisticas: EstadisticasView
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
    bindFechaDefault();
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
    setTipoMovimiento('egreso');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('input-monto').focus(), 300);
  }

  function cerrarModalEntrada() {
    document.getElementById('modal-entrada').classList.add('hidden');
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
      if (!texto) { ocultarCatDetectada(); return; }
      catTimeout = setTimeout(() => {
        const cat = Parser.categorizarAuto(texto);
        mostrarCatDetectada(cat);
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

    // La categoría se detecta automáticamente — el usuario no elige nada
    const categoria = Parser.categorizarAuto(descripcion) || 'otros';

    try {
      await DB.agregarMovimiento({ tipo: tipoMovimiento, monto, descripcion, categoria, cuenta, fecha });
      cerrarModalEntrada();
      navegarA(vistaActual);
    } catch (e) {
      alert('Error al guardar. Intenta de nuevo.');
    }
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

  // ── UTILS ─────────────────────────────────────────────────────
  function vibrar() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  return { init, navegarA, abrirModalEntrada, abrirModalPrestamo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
