/**
 * CONTABLE - Base de datos local (IndexedDB)
 * Almacena todo localmente en el dispositivo
 */

const DB = (() => {
  const DB_NAME = 'contable_db';
  const DB_VERSION = 2;          // ← subimos versión para agregar store categorias
  let db = null;

  const STORES = {
    movimientos: 'movimientos',
    prestamos: 'prestamos',
    abonos: 'abonos',
    categorias: 'categorias',
    presupuestos: 'presupuestos'
  };

  function open() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, 3); // versión 3

      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORES.movimientos)) {
          const s = d.createObjectStore(STORES.movimientos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('fecha', 'fecha'); s.createIndex('tipo', 'tipo');
          s.createIndex('categoria', 'categoria'); s.createIndex('cuenta', 'cuenta');
        }
        if (!d.objectStoreNames.contains(STORES.prestamos)) {
          const s = d.createObjectStore(STORES.prestamos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('tipo', 'tipo'); s.createIndex('estado', 'estado'); s.createIndex('persona', 'persona');
        }
        if (!d.objectStoreNames.contains(STORES.abonos)) {
          const s = d.createObjectStore(STORES.abonos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('prestamo_id', 'prestamo_id'); s.createIndex('fecha', 'fecha');
        }
        if (!d.objectStoreNames.contains(STORES.categorias)) {
          const s = d.createObjectStore(STORES.categorias, { keyPath: 'slug' });
          s.createIndex('tipo', 'tipo');
        }
        // Presupuestos: { slug (categoria), monto, mes ('2026-11' o 'todos') }
        if (!d.objectStoreNames.contains(STORES.presupuestos)) {
          d.createObjectStore(STORES.presupuestos, { keyPath: 'id' });
          // id = slug + '_' + mes  ej: 'alimentacion_2026-11' o 'alimentacion_todos'
        }
      };

      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  function tx(store, mode = 'readonly') {
    return db.transaction(store, mode).objectStore(store);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  // ── MOVIMIENTOS ──────────────────────────────────────────────
  async function agregarMovimiento(data) {
    await open();
    const mov = {
      tipo: data.tipo,
      monto: data.monto,
      descripcion: data.descripcion || '',
      categoria: data.categoria || 'otros',
      cuenta: data.cuenta || 'efectivo',
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      creadoEn: Date.now()
    };
    return promisify(tx(STORES.movimientos, 'readwrite').add(mov));
  }

  async function obtenerMovimientos(filtros = {}) {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.movimientos).openCursor(null, 'prev');
      const result = [];
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const m = cursor.value;
          let pass = true;
          if (filtros.tipo && m.tipo !== filtros.tipo) pass = false;
          if (filtros.categoria && m.categoria !== filtros.categoria) pass = false;
          if (filtros.cuenta && m.cuenta !== filtros.cuenta) pass = false;
          if (filtros.desde && m.fecha < filtros.desde) pass = false;
          if (filtros.hasta && m.fecha > filtros.hasta) pass = false;
          if (filtros.q) {
            const q = filtros.q.toLowerCase();
            if (!m.descripcion.toLowerCase().includes(q) && !m.categoria.toLowerCase().includes(q)) pass = false;
          }
          if (pass) result.push(m);
          cursor.continue();
        } else resolve(result);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function eliminarMovimiento(id) {
    await open();
    return promisify(tx(STORES.movimientos, 'readwrite').delete(id));
  }

  async function editarMovimiento(id, data) {
    await open();
    const store = tx(STORES.movimientos, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = e => {
        const r2 = store.put({ ...e.target.result, ...data });
        r2.onsuccess = () => resolve();
        r2.onerror = err => reject(err);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  // ── PRÉSTAMOS ─────────────────────────────────────────────────
  async function agregarPrestamo(data) {
    await open();
    return promisify(tx(STORES.prestamos, 'readwrite').add({
      tipo: data.tipo, persona: data.persona,
      montoOriginal: data.montoOriginal, interesMensual: data.interesMensual || 0,
      numCuotas: data.numCuotas || null, fechaInicio: data.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: data.fechaFin || null, nota: data.nota || '',
      estado: 'activo', creadoEn: Date.now()
    }));
  }

  async function obtenerPrestamos(filtros = {}) {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.prestamos).openCursor(null, 'prev');
      const result = [];
      req.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          const p = cursor.value;
          let pass = true;
          if (filtros.tipo && p.tipo !== filtros.tipo) pass = false;
          if (filtros.estado && p.estado !== filtros.estado) pass = false;
          if (pass) result.push(p);
          cursor.continue();
        } else resolve(result);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function actualizarPrestamo(id, data) {
    await open();
    const store = tx(STORES.prestamos, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = e => {
        const r2 = store.put({ ...e.target.result, ...data });
        r2.onsuccess = () => resolve();
        r2.onerror = err => reject(err);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function eliminarPrestamo(id) {
    await open();
    return promisify(tx(STORES.prestamos, 'readwrite').delete(id));
  }

  // ── ABONOS ────────────────────────────────────────────────────
  async function agregarAbono(data) {
    await open();
    return promisify(tx(STORES.abonos, 'readwrite').add({
      prestamo_id: data.prestamo_id, monto: data.monto,
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      nota: data.nota || '', creadoEn: Date.now()
    }));
  }

  async function obtenerAbonos(prestamo_id) {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.abonos).index('prestamo_id').getAll(prestamo_id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function obtenerTodosAbonos() {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.abonos).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  // ── CATEGORÍAS PERSONALIZADAS ─────────────────────────────────
  /**
   * Guarda o actualiza una categoría personalizada.
   * Si es una categoría base (definida en CATEGORIAS del parser),
   * guarda solo el override (emoji/nombre), sin tocar las palabras clave base.
   * Si es nueva, guarda todo.
   *
   * Estructura:
   * { slug, nombre, emoji, tipo, palabras: [], esPersonalizada: bool, creadoEn }
   */
  async function guardarCategoria(data) {
    await open();
    const cat = {
      slug: data.slug,
      nombre: data.nombre,
      emoji: data.emoji,
      tipo: data.tipo || 'egreso',         // 'egreso' | 'ingreso' | 'ambos'
      palabras: data.palabras || [],
      esPersonalizada: data.esPersonalizada !== false,
      creadoEn: data.creadoEn || Date.now()
    };
    return promisify(tx(STORES.categorias, 'readwrite').put(cat));
  }

  async function obtenerCategorias() {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.categorias).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function eliminarCategoria(slug) {
    await open();
    return promisify(tx(STORES.categorias, 'readwrite').delete(slug));
  }

  // ── PRESUPUESTOS ──────────────────────────────────────────────
  async function guardarPresupuesto(categoriaSlug, monto, mes = 'todos') {
    await open();
    const id = `${categoriaSlug}_${mes}`;
    return promisify(tx(STORES.presupuestos, 'readwrite').put({ id, categoriaSlug, monto, mes }));
  }

  async function obtenerPresupuestos() {
    await open();
    return new Promise((resolve, reject) => {
      const req = tx(STORES.presupuestos).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function eliminarPresupuesto(categoriaSlug, mes = 'todos') {
    await open();
    return promisify(tx(STORES.presupuestos, 'readwrite').delete(`${categoriaSlug}_${mes}`));
  }

  return {
    agregarMovimiento, obtenerMovimientos, eliminarMovimiento, editarMovimiento,
    agregarPrestamo, obtenerPrestamos, actualizarPrestamo, eliminarPrestamo,
    agregarAbono, obtenerAbonos, obtenerTodosAbonos,
    guardarCategoria, obtenerCategorias, eliminarCategoria,
    guardarPresupuesto, obtenerPresupuestos, eliminarPresupuesto
  };
})();
