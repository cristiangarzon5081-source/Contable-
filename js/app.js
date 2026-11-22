/**
 * CONTABLE - App principal
 */

const App = (() => {
  let vistaActual = 'dashboard';
  let tipoMovimiento = 'egreso';
  let tipoPrestamo = 'debo';
  // Estado del panel multi-producto
  let _productosDetectados = []; // Array de { texto, categoria, emoji, nombre, monto }
  let _modoMulti = false;

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
      if (vistaActual === 'prestamos') abrirModalPrestamo();
      else abrirModalEntrada();
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
    resetMulti();
    setTipoMovimiento('egreso');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('input-monto').focus(), 300);
  }

  function cerrarModalEntrada() {
    document.getElementById('modal-entrada').classList.add('hidden');
    resetMulti();
  }

  function setTipoMovimiento(tipo) {
    tipoMovimiento = tipo;
    document.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
  }

  // ── INDICADOR DE CATEGORÍA ÚNICA ─────────────────────────────
  function mostrarCatDetectada(cat) {
    const el = document.getElementById('cat-detectada');
    if (!el) return;
    const info = (Parser.getCategoriasMerged()[cat] || Parser.CATEGORIAS.otros);
    const nombreCat = info.nombre || (cat.charAt(0).toUpperCase() + cat.slice(1));
    el.className = `cat-detectada ${cat === 'otros' ? 'otros' : ''}`;
    el.innerHTML = `
      <span class="cat-detectada-emoji">${info.emoji}</span>
      <span class="cat-detectada-label">Categoría detectada: <strong>${nombreCat}</strong></span>
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

  // ── PANEL MULTI-PRODUCTO ──────────────────────────────────────
  /**
   * Cuando el usuario escribe algo con múltiples productos de distintas
   * categorías ("3 mangos y 1 camiseta"), aparece este panel.
   * Muestra cada producto con su categoría detectada y un campo de monto.
   * El usuario solo pone los montos — la categoría ya está asignada.
   */
  function resetMulti() {
    _modoMulti = false;
    _productosDetectados = [];
    const panel = document.getElementById('multi-panel');
    if (panel) panel.classList.add('hidden');
    // Restaurar label del botón guardar
    const btnGuardar = document.getElementById('btn-guardar');
    if (btnGuardar) btnGuardar.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Guardar
    `;
  }

  function activarModoMulti(productos) {
    _modoMulti = true;
    _productosDetectados = productos.map(p => ({ ...p, monto: 0 }));

    const panel = document.getElementById('multi-panel');
    ocultarCatDetectada(); // Ocultar el indicador de categoría única

    // Construir el panel
    panel.innerHTML = `
      <div class="multi-header">
        <span class="multi-titulo">📦 Detecté ${productos.length} productos — pon el valor de cada uno</span>
      </div>
      <div class="multi-lista" id="multi-lista">
        ${productos.map((p, i) => `
          <div class="multi-item" data-index="${i}">
            <div class="multi-item-left">
              <span class="multi-item-emoji">${p.emoji}</span>
              <div class="multi-item-info">
                <div class="multi-item-texto">${p.texto}</div>
                <div class="multi-item-cat">${p.nombre}</div>
              </div>
            </div>
            <div class="multi-item-monto-wrap">
              <span class="multi-currency">$</span>
              <input
                type="text"
                class="multi-monto-input"
                data-index="${i}"
                placeholder="0"
                inputmode="numeric"
                autocomplete="off"
              />
            </div>
          </div>
        `).join('')}
      </div>
      <div class="multi-footer" id="multi-footer">
        <span class="multi-total-label">Total asignado:</span>
        <span class="multi-total-val" id="multi-total-val">$0</span>
      </div>
    `;

    panel.classList.remove('hidden');

    // Bindings de los inputs de monto
    panel.querySelectorAll('.multi-monto-input').forEach(inp => {
      inp.addEventListener('input', e => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
        const idx = parseInt(e.target.dataset.index);
        _productosDetectados[idx].monto = parseInt(val || '0', 10);
        actualizarTotalMulti();
      });
    });

    // NO hacemos focus() aquí — robaría el foco del input de descripción
    // y quitaría el teclado mientras el usuario sigue escribiendo.

    // Cambiar label del botón guardar
    document.getElementById('btn-guardar').innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Guardar ${productos.length} movimientos
    `;
  }

  function actualizarTotalMulti() {
    const suma = _productosDetectados.reduce((s, p) => s + (p.monto || 0), 0);
    const el = document.getElementById('multi-total-val');
    if (!el) return;

    // Comparar con el monto total ingresado arriba
    const montoRaw = document.getElementById('input-monto').value.replace(/\./g, '').replace(/,/g, '');
    const montoTotal = parseFloat(montoRaw) || 0;

    el.textContent = Parser.formatCOP(suma);
    const footer = document.getElementById('multi-footer');
    if (!footer) return;

    if (montoTotal > 0) {
      const diff = montoTotal - suma;
      if (Math.abs(diff) < 1) {
        footer.className = 'multi-footer ok';
        footer.innerHTML = `<span>✅ Total cuadra: ${Parser.formatCOP(suma)}</span>`;
      } else if (diff > 0) {
        footer.className = 'multi-footer warn';
        footer.innerHTML = `<span>Faltan <strong>${Parser.formatCOP(diff)}</strong> por asignar (total: ${Parser.formatCOP(montoTotal)})</span>`;
      } else {
        footer.className = 'multi-footer err';
        footer.innerHTML = `<span>⚠️ Excedes por <strong>${Parser.formatCOP(Math.abs(diff))}</strong> (total: ${Parser.formatCOP(montoTotal)})</span>`;
      }
    } else {
      footer.className = 'multi-footer';
      footer.innerHTML = `<span class="multi-total-label">Total asignado:</span> <span class="multi-total-val">${Parser.formatCOP(suma)}</span>`;
    }
  }

  function bindModalEntrada() {
    const modal = document.getElementById('modal-entrada');
    modal.querySelector('.modal-backdrop').addEventListener('click', cerrarModalEntrada);

    // Selector de tipo
    modal.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.addEventListener('click', () => setTipoMovimiento(btn.dataset.tipo));
    });

    // Categorización automática en tiempo real
    const inputDesc = document.getElementById('input-descripcion');
    let catTimeout;
    inputDesc.addEventListener('input', () => {
      clearTimeout(catTimeout);
      const texto = inputDesc.value.trim();
      if (!texto) {
        ocultarCatDetectada();
        resetMulti();
        return;
      }
      // 800ms de espera — no se dispara mientras sigues escribiendo
      catTimeout = setTimeout(() => {
        // ¿Contiene múltiples productos de distintas categorías?
        if (Parser.esCompraMultiple(texto)) {
          const productos = Parser.analizarProductos(texto);
          activarModoMulti(productos);
        } else {
          resetMulti();
          const cat = Parser.categorizarAuto(texto);
          mostrarCatDetectada(cat);
        }
      }, 350);
    });

    // Formato de monto
    document.getElementById('input-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
      if (_modoMulti) actualizarTotalMulti();
    });

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

    // Modo multi-producto
    if (_modoMulti && _productosDetectados.length > 0) {
      await guardarMultiProducto(descripcion, cuenta, fecha, monto);
      return;
    }

    // Modo simple
    const categoria = Parser.categorizarAuto(descripcion) || 'otros';
    try {
      await DB.agregarMovimiento({ tipo: tipoMovimiento, monto, descripcion, categoria, cuenta, fecha });
      cerrarModalEntrada();
      navegarA(vistaActual);
    } catch (e) {
      alert('Error al guardar. Intenta de nuevo.');
    }
  }

  async function guardarMultiProducto(descripcion, cuenta, fecha, montoTotal) {
    // Filtrar solo los que tienen monto > 0
    const conMonto = _productosDetectados.filter(p => p.monto > 0);
    const sinMonto = _productosDetectados.filter(p => !p.monto || p.monto <= 0);

    if (!conMonto.length) {
      // Ningún monto ingresado → guardar como uno solo con categoría del primero
      const cat = _productosDetectados[0]?.categoria || 'otros';
      await DB.agregarMovimiento({ tipo: tipoMovimiento, monto: montoTotal, descripcion, categoria: cat, cuenta, fecha });
      cerrarModalEntrada();
      navegarA(vistaActual);
      return;
    }

    // Guardar los que tienen monto
    for (const p of conMonto) {
      await DB.agregarMovimiento({
        tipo: tipoMovimiento,
        monto: p.monto,
        descripcion: p.texto,
        categoria: p.categoria,
        cuenta,
        fecha
      });
    }

    // Si hay productos sin monto y la suma no cierra, guardar la diferencia como "otros"
    const sumaAsignada = conMonto.reduce((s, p) => s + p.monto, 0);
    const diferencia = montoTotal - sumaAsignada;
    if (diferencia > 1 && sinMonto.length > 0) {
      // Repartir la diferencia en los productos sin monto
      const montoPorItem = Math.floor(diferencia / sinMonto.length);
      for (let i = 0; i < sinMonto.length; i++) {
        const p = sinMonto[i];
        const m = i === sinMonto.length - 1 ? diferencia - montoPorItem * i : montoPorItem;
        if (m > 0) {
          await DB.agregarMovimiento({
            tipo: tipoMovimiento,
            monto: m,
            descripcion: p.texto,
            categoria: p.categoria,
            cuenta,
            fecha
          });
        }
      }
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
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('abono-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    });
  }

  // ── MODAL CATEGORÍA ───────────────────────────────────────────
  function bindModalCategoria() {
    const modal = document.getElementById('modal-categoria');
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function vibrar() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  return { init, navegarA, abrirModalEntrada, abrirModalPrestamo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
