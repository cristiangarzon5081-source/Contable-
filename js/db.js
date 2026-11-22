/**
 * CONTABLE - Base de datos local (IndexedDB via wrapper nativo)
 * Almacena todo localmente en el dispositivo
 */

const DB = (() => {
  const DB_NAME = 'contable_db';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    movimientos: 'movimientos',
    prestamos: 'prestamos',
    abonos: 'abonos'
  };

  function open() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        // Movimientos (ingresos/egresos)
        if (!d.objectStoreNames.contains(STORES.movimientos)) {
          const s = d.createObjectStore(STORES.movimientos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('fecha', 'fecha');
          s.createIndex('tipo', 'tipo');
          s.createIndex('categoria', 'categoria');
          s.createIndex('cuenta', 'cuenta');
        }
        // Préstamos
        if (!d.objectStoreNames.contains(STORES.prestamos)) {
          const s = d.createObjectStore(STORES.prestamos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('tipo', 'tipo'); // debo | me_deben
          s.createIndex('estado', 'estado'); // activo | liquidado
          s.createIndex('persona', 'persona');
        }
        // Abonos de préstamos
        if (!d.objectStoreNames.contains(STORES.abonos)) {
          const s = d.createObjectStore(STORES.abonos, { keyPath: 'id', autoIncrement: true });
          s.createIndex('prestamo_id', 'prestamo_id');
          s.createIndex('fecha', 'fecha');
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
      tipo: data.tipo,           // 'ingreso' | 'egreso'
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
      const store = tx(STORES.movimientos);
      const req = store.openCursor(null, 'prev');
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
        } else {
          resolve(result);
        }
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
        const mov = { ...e.target.result, ...data };
        const r2 = store.put(mov);
        r2.onsuccess = () => resolve();
        r2.onerror = err => reject(err);
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  // ── PRÉSTAMOS ─────────────────────────────────────────────────
  async function agregarPrestamo(data) {
    await open();
    const p = {
      tipo: data.tipo,             // 'debo' | 'me_deben'
      persona: data.persona,
      montoOriginal: data.montoOriginal,
      interesMensual: data.interesMensual || 0,
      numCuotas: data.numCuotas || null,
      fechaInicio: data.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: data.fechaFin || null,
      nota: data.nota || '',
      estado: 'activo',
      creadoEn: Date.now()
    };
    return promisify(tx(STORES.prestamos, 'readwrite').add(p));
  }

  async function obtenerPrestamos(filtros = {}) {
    await open();
    return new Promise((resolve, reject) => {
      const store = tx(STORES.prestamos);
      const req = store.openCursor(null, 'prev');
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
        const p = { ...e.target.result, ...data };
        const r2 = store.put(p);
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
    const a = {
      prestamo_id: data.prestamo_id,
      monto: data.monto,
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      nota: data.nota || '',
      creadoEn: Date.now()
    };
    return promisify(tx(STORES.abonos, 'readwrite').add(a));
  }

  async function obtenerAbonos(prestamo_id) {
    await open();
    return new Promise((resolve, reject) => {
      const store = tx(STORES.abonos);
      const index = store.index('prestamo_id');
      const req = index.getAll(prestamo_id);
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

  return {
    agregarMovimiento, obtenerMovimientos, eliminarMovimiento, editarMovimiento,
    agregarPrestamo, obtenerPrestamos, actualizarPrestamo, eliminarPrestamo,
    agregarAbono, obtenerAbonos, obtenerTodosAbonos
  };
})();
