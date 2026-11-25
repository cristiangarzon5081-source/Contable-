/**
 * CONTABLE - App principal
 */

const App = (() => {
  let vistaActual = 'dashboard';
  let tipoMovimiento = 'egreso';
  let tipoPrestamo = 'debo';
  // Estado del panel multi-producto
  let _productosDetectados = [];
  let _modoMulti = false;
  // Override de categoría en modo simple (persiste al pasar a modo multi)
  let _simpleCatOverride = null; // { slug, emoji, nombre }
  let _simpleTextoAnterior = ''; // texto del producto cuando el usuario corrigió
  // Callback para cuando el usuario elige una categoría en el selector
  let _catSelectorCallback = null;

  const VIEWS = {
    dashboard:   DashboardView,
    historial:   HistorialView,
    prestamos:   PrestamosView,
    estadisticas: EstadisticasView,
    categorias:  CategoriasView,
    mas:         MasView
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
    bindCatSelector();
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
    document.getElementById('input-descripcion').value = '';
    document.getElementById('input-monto').value = '';
    document.getElementById('input-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('select-cuenta').value = 'efectivo';
    ocultarCatDetectada();
    resetMulti();
    _simpleCatOverride = null;
    _simpleTextoAnterior = '';
    setTipoMovimiento('egreso');
    document.getElementById('modal-entrada').classList.remove('hidden');
    setTimeout(() => document.getElementById('input-descripcion').focus(), 300);
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

  // ── INDICADOR CATEGORÍA ÚNICA (modo simple) ──────────────────
  function mostrarCatDetectada(cat) {
    const el = document.getElementById('cat-detectada');
    if (!el) return;
    const info = Parser.getCategoriasMerged()[cat] || Parser.CATEGORIAS.otros;
    const nombreCat = info.nombre || cat;
    el.className = `cat-detectada ${cat === 'otros' ? 'otros' : ''}`;
    el.innerHTML = `
      <span class="cat-detectada-emoji">${info.emoji}</span>
      <span class="cat-detectada-label">Categoría: <strong>${nombreCat}</strong></span>
    `;
    el.classList.remove('hidden');
    document.getElementById('input-descripcion').style.borderRadius = '12px 12px 0 0';

    // Al tocar → abrir selector para corregir
    el.onclick = () => {
      abrirCatSelector(cat, nuevaCat => {
        const info2 = Parser.getCategoriasMerged()[nuevaCat] || Parser.CATEGORIAS.otros;
        // Guardar en DOM (para guardarMovimiento modo simple)
        el.dataset.catOverride = nuevaCat;
        el.querySelector('.cat-detectada-emoji').textContent = info2.emoji;
        el.querySelector('strong').textContent = info2.nombre || nuevaCat;
        // Guardar en estado (para cuando pase a modo multi)
        _simpleCatOverride = { slug: nuevaCat, emoji: info2.emoji, nombre: info2.nombre || nuevaCat };
        _simpleTextoAnterior = document.getElementById('input-descripcion').value.trim();
      });
    };
  }

  function ocultarCatDetectada() {
    const el = document.getElementById('cat-detectada');
    if (el) { el.classList.add('hidden'); el.dataset.catOverride = ''; el.onclick = null; }
    const inp = document.getElementById('input-descripcion');
    if (inp) inp.style.borderRadius = '';
  }

  // ── SELECTOR DE CATEGORÍA ─────────────────────────────────────
  function bindCatSelector() {
    const modal = document.getElementById('modal-cat-selector');
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
      modal.classList.add('hidden');
      _catSelectorCallback = null;
    });
  }

  function abrirCatSelector(catActual, callback) {
    _catSelectorCallback = callback;
    const cats = Parser.getCategoriasMerged();
    const lista = document.getElementById('cat-selector-lista');
    lista.innerHTML = Object.entries(cats)
      .filter(([slug]) => slug !== 'otros')
      .concat([['otros', cats.otros]])
      .map(([slug, c]) => `
        <div class="cat-selector-item ${slug === catActual ? 'selected' : ''}" data-slug="${slug}">
          <span class="cat-selector-emoji">${c.emoji}</span>
          <span class="cat-selector-nombre">${c.nombre || slug}</span>
        </div>
      `).join('');

    lista.querySelectorAll('.cat-selector-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('modal-cat-selector').classList.add('hidden');
        if (_catSelectorCallback) _catSelectorCallback(item.dataset.slug);
        _catSelectorCallback = null;
      });
    });

    document.getElementById('modal-cat-selector').classList.remove('hidden');
  }

  // ── MODO MULTI-PRODUCTO ───────────────────────────────────────
  function resetMulti() {
    _modoMulti = false;
    _productosDetectados = [];
    const panel = document.getElementById('multi-panel');
    if (panel) panel.classList.add('hidden');
    // Restaurar campo de monto
    const montoWrap = document.getElementById('monto-wrap');
    if (montoWrap) montoWrap.classList.remove('auto-calculado');
    const montoLabel = document.getElementById('monto-auto-label');
    if (montoLabel) montoLabel.classList.add('hidden');
    const inputMonto = document.getElementById('input-monto');
    if (inputMonto) { inputMonto.readOnly = false; }
    // Restaurar botón guardar
    const btn = document.getElementById('btn-guardar');
    if (btn) btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>Guardar`;
  }

  // Limpia fragmento para comparación: quita conjunciones y artículos iniciales
  function limpiarFragmento(texto) {
    return Parser.normalizar(texto)
      .replace(/^(y |e |mas |también |tambien |además |ademas |compre |compré |un |una |unos |unas |el |la |los |las )/i, '')
      .trim();
  }

  function activarModoMulti(productosNuevos) {
    _modoMulti = true;

    // ── ENFOQUE: nunca tocar ítems que ya están en el panel ──────
    //
    // En lugar de intentar reconciliar listas (que falla por variaciones
    // de texto), simplemente:
    // 1. Mantener TODOS los ítems que ya existen en _productosDetectados
    // 2. Agregar solo los que son genuinamente nuevos (no estaban antes)
    //
    // Para detectar "nuevo": si ningún ítem existente contiene
    // el texto limpio del producto nuevo como substring, es nuevo.

    if (_productosDetectados.length === 0) {
      // Primera vez — aplicar override simple si existe, luego cargar todo
      let overrideSimpleAplicado = false;
      _productosDetectados = productosNuevos.map(p => {
        if (!overrideSimpleAplicado && _simpleCatOverride) {
          const limpio = limpiarFragmento(p.texto);
          const anteriorLimpio = limpiarFragmento(_simpleTextoAnterior);
          if (anteriorLimpio.includes(limpio) || limpio.includes(anteriorLimpio)) {
            overrideSimpleAplicado = true;
            return { ...p, categoria: _simpleCatOverride.slug, emoji: _simpleCatOverride.emoji, nombre: _simpleCatOverride.nombre, monto: 0 };
          }
        }
        return { ...p, monto: 0 };
      });
    } else {
      // Ya hay ítems — solo agregar los nuevos, nunca modificar los existentes
      const claveExistentes = _productosDetectados.map(p => limpiarFragmento(p.texto));

      for (const pNuevo of productosNuevos) {
        const limpioNuevo = limpiarFragmento(pNuevo.texto);
        // ¿Algún ítem existente ya cubre este producto?
        const yaExiste = claveExistentes.some(clave =>
          clave === limpioNuevo ||
          clave.includes(limpioNuevo) ||
          limpioNuevo.includes(clave)
        );
        if (!yaExiste) {
          _productosDetectados.push({ ...pNuevo, monto: 0 });
          claveExistentes.push(limpioNuevo);
        }
      }
    }

    _simpleCatOverride = null;
    _simpleTextoAnterior = '';
    ocultarCatDetectada();

    // Bloquear el campo de monto — se calcula automático
    const montoWrap = document.getElementById('monto-wrap');
    montoWrap.classList.add('auto-calculado');
    document.getElementById('input-monto').value = '$0';
    document.getElementById('input-monto').readOnly = true;
    document.getElementById('monto-auto-label').classList.remove('hidden');

    // Construir el panel usando _productosDetectados (ya con correcciones),
    // NO con productosNuevos del parser
    const panel = document.getElementById('multi-panel');
    panel.innerHTML = `
      <div class="multi-header">
        <span class="multi-titulo">📦 ${_productosDetectados.length} productos — agrega el valor de cada uno</span>
      </div>
      <div id="multi-lista">
        ${_productosDetectados.map((p, i) => buildMultiItem(p, i)).join('')}
      </div>
    `;
    panel.classList.remove('hidden');

    bindMultiItemEvents();

    // Cambiar botón
    document.getElementById('btn-guardar').innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>Guardar ${_productosDetectados.length} movimientos`;
  }

  function buildMultiItem(p, i) {
    return `
      <div class="multi-item" data-index="${i}">
        <div class="multi-item-left">
          <span class="multi-item-emoji">${p.emoji}</span>
          <div class="multi-item-info">
            <div class="multi-item-texto">${p.texto}</div>
            <button class="multi-item-cat-btn" data-index="${i}" title="Tocar para cambiar categoría">
              ${p.nombre} ✎
            </button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="multi-item-monto-wrap">
            <span class="multi-currency">$</span>
            <input type="text" class="multi-monto-input" data-index="${i}"
              placeholder="0" inputmode="numeric" autocomplete="off" />
          </div>
          <button class="multi-item-del" data-index="${i}" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function bindMultiItemEvents() {
    const panel = document.getElementById('multi-panel');

    // Inputs de monto
    panel.querySelectorAll('.multi-monto-input').forEach(inp => {
      inp.addEventListener('input', e => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
        const idx = parseInt(e.target.dataset.index);
        _productosDetectados[idx].monto = parseInt(val || '0', 10);
        recalcularTotalMulti();
      });
    });

    // Botones de cambio de categoría
    panel.querySelectorAll('.multi-item-cat-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const catActual = _productosDetectados[idx].categoria;
        abrirCatSelector(catActual, nuevaCat => {
          const info = Parser.getCategoriasMerged()[nuevaCat] || Parser.CATEGORIAS.otros;
          _productosDetectados[idx].categoria = nuevaCat;
          _productosDetectados[idx].emoji = info.emoji;
          _productosDetectados[idx].nombre = info.nombre || nuevaCat;
          const item = panel.querySelector(`.multi-item[data-index="${idx}"]`);
          if (item) {
            item.querySelector('.multi-item-emoji').textContent = info.emoji;
            item.querySelector('.multi-item-cat-btn').textContent = `${info.nombre || nuevaCat} ✎`;
          }
        });
      });
    });

    // Botones eliminar ítem
    panel.querySelectorAll('.multi-item-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        _productosDetectados.splice(idx, 1);
        // Reconstruir el panel con los índices actualizados
        const lista = document.getElementById('multi-lista');
        lista.innerHTML = _productosDetectados.map((p, i) => buildMultiItem(p, i)).join('');
        // Actualizar header y botón
        panel.querySelector('.multi-titulo').textContent =
          `📦 ${_productosDetectados.length} productos — agrega el valor de cada uno`;
        document.getElementById('btn-guardar').innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>Guardar ${_productosDetectados.length} movimientos`;
        // Si queda 1 solo ítem, volver a modo simple
        if (_productosDetectados.length <= 1) {
          if (_productosDetectados.length === 1) {
            resetMulti();
            mostrarCatDetectada(_productosDetectados[0]?.categoria || 'otros');
          } else {
            resetMulti();
          }
          return;
        }
        recalcularTotalMulti();
        bindMultiItemEvents(); // re-bind con índices actualizados
      });
    });
  }

  function recalcularTotalMulti() {
    const suma = _productosDetectados.reduce((s, p) => s + (p.monto || 0), 0);
    const inputMonto = document.getElementById('input-monto');
    inputMonto.value = suma > 0 ? suma.toLocaleString('es-CO') : '';
  }

  function bindModalEntrada() {
    const modal = document.getElementById('modal-entrada');
    modal.querySelector('.modal-backdrop').addEventListener('click', cerrarModalEntrada);

    // Selector de tipo
    modal.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.addEventListener('click', () => setTipoMovimiento(btn.dataset.tipo));
    });

    // Campo de descripción: detectar en tiempo real
    const inputDesc = document.getElementById('input-descripcion');
    let catTimeout;
    inputDesc.addEventListener('input', () => {
      clearTimeout(catTimeout);
      const texto = inputDesc.value.trim();
      if (!texto) {
        ocultarCatDetectada();
        resetMulti();
        _simpleCatOverride = null;
        _simpleTextoAnterior = '';
        return;
      }

      catTimeout = setTimeout(() => {
        // Si el usuario ya corrigió la categoría manualmente, no sobreescribir
        const catEl = document.getElementById('cat-detectada');
        const yaCorregida = catEl && catEl.dataset.catOverride && catEl.dataset.catOverride !== '';

        if (Parser.esCompraMultiple(texto)) {
          // En modo multi siempre re-analizamos (el usuario puede corregir cada ítem)
          const productos = Parser.analizarProductos(texto);
          activarModoMulti(productos);
        } else {
          resetMulti();
          // Solo actualizar el indicador si el usuario NO lo ha corregido manualmente
          if (!yaCorregida) {
            const cat = Parser.categorizarAuto(texto);
            mostrarCatDetectada(cat);
          }
          // Si ya lo corrigió, dejamos el indicador como está
        }
      }, 800);
    });

    // Campo de monto (solo en modo simple)
    document.getElementById('input-monto').addEventListener('input', e => {
      if (_modoMulti) return; // En modo multi está bloqueado
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    });

    inputDesc.addEventListener('keydown', e => {
      if (e.key === 'Enter') guardarMovimiento();
    });
    document.getElementById('btn-guardar').addEventListener('click', guardarMovimiento);
  }

  async function guardarMovimiento() {
    const descripcion = document.getElementById('input-descripcion').value.trim();
    const cuenta = document.getElementById('select-cuenta').value;
    const fecha = document.getElementById('input-fecha').value;

    // ── MODO MULTI ────────────────────────────────────────────
    if (_modoMulti && _productosDetectados.length > 0) {
      const conMonto = _productosDetectados.filter(p => p.monto > 0);
      if (!conMonto.length) {
        vibrar();
        // Enfocar el primer campo de monto sin quitar el teclado
        const primerInput = document.querySelector('.multi-monto-input');
        if (primerInput) primerInput.focus();
        return;
      }
      for (const p of conMonto) {
        await DB.agregarMovimiento({
          tipo: tipoMovimiento, monto: p.monto,
          descripcion: p.texto, categoria: p.categoria, cuenta, fecha
        });
      }
      cerrarModalEntrada();
      navegarA(vistaActual);
      return;
    }

    // ── MODO SIMPLE ───────────────────────────────────────────
    const montoRaw = document.getElementById('input-monto').value.replace(/\./g, '').replace(/,/g, '');
    const monto = parseFloat(montoRaw);

    if (!monto || monto <= 0) {
      vibrar();
      const inp = document.getElementById('input-monto');
      inp.style.outline = '2px solid var(--red)';
      setTimeout(() => inp.style.outline = '', 1500);
      inp.focus();
      return;
    }

    // Usar la categoría corregida si el usuario la cambió manualmente
    const catEl = document.getElementById('cat-detectada');
    const catOverride = catEl?.dataset?.catOverride;
    const categoria = catOverride || Parser.categorizarAuto(descripcion) || 'otros';

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
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('abono-monto').addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val) e.target.value = parseInt(val, 10).toLocaleString('es-CO');
    });
  }

  // ── MODAL CATEGORÍA ───────────────────────────────────────────
  function bindModalCategoria() {
    const modal = document.getElementById('modal-categoria');
    if (modal) modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function vibrar() {
    if (navigator.vibrate) navigator.vibrate(50);
  }

  return { init, navegarA, abrirModalEntrada, abrirModalPrestamo, _abrirCatSelector: abrirCatSelector };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
