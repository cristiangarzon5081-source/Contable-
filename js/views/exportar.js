/**
 * CONTABLE - Exportar e Importar datos
 */

const ExportarView = (() => {
  let _tabActual = 'exportar'; // 'exportar' | 'importar'

  function abrir(tabInicial = 'exportar') {
    _tabActual = tabInicial;
    const modal = document.getElementById('modal-exportar');
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('export-hasta').value = hoy;
    document.getElementById('export-desde').value = hoy.slice(0, 7) + '-01';

    renderTabs();
    if (_tabActual === 'exportar') actualizarPreview();

    modal.classList.remove('hidden');

    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');

    // Tab buttons
    modal.querySelectorAll('.exp-tab').forEach(btn => {
      btn.onclick = () => {
        _tabActual = btn.dataset.tab;
        renderTabs();
        if (_tabActual === 'exportar') actualizarPreview();
      };
    });
  }

  function renderTabs() {
    const modal = document.getElementById('modal-exportar');
    modal.querySelectorAll('.exp-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === _tabActual);
    });
    document.getElementById('exp-panel-exportar').classList.toggle('hidden', _tabActual !== 'exportar');
    document.getElementById('exp-panel-importar').classList.toggle('hidden', _tabActual !== 'importar');

    if (_tabActual === 'exportar') bindExportar();
    if (_tabActual === 'importar') bindImportar();
  }

  // ── BINDINGS EXPORTAR ───────────────────────────────────────────
  function bindExportar() {
    ['btn-export-csv','btn-export-xlsx','btn-export-txt'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const nuevo = btn.cloneNode(true);
      btn.parentNode.replaceChild(nuevo, btn);
    });

    document.getElementById('export-periodo').onchange = () => {
      const p = document.getElementById('export-periodo').value;
      document.getElementById('export-rango-custom').classList.toggle('hidden', p !== 'personalizado');
      actualizarPreview();
    };
    document.getElementById('export-desde').onchange = actualizarPreview;
    document.getElementById('export-hasta').onchange = actualizarPreview;
    document.getElementById('export-inc-movimientos').onchange = actualizarPreview;
    document.getElementById('export-inc-prestamos').onchange = actualizarPreview;

    document.getElementById('btn-export-csv').onclick = () => exportar('csv');
    document.getElementById('btn-export-xlsx').onclick = () => exportar('xlsx');
    document.getElementById('btn-export-txt').onclick = () => exportar('txt');

    // Mostrar/ocultar el botón xlsx según disponibilidad de SheetJS
    const btnXlsx = document.getElementById('btn-export-xlsx');
    if (btnXlsx) btnXlsx.style.display = (typeof XLSX !== 'undefined') ? '' : 'none';
  }

  // ── BINDINGS IMPORTAR ────────────────────────────────────────────
  function bindImportar() {
    const zona = document.getElementById('import-drop-zone');
    const inputFile = document.getElementById('import-file-input');
    if (!zona || !inputFile) return;

    // Reemplazar para evitar listeners duplicados
    const zonaNew = zona.cloneNode(true);
    zona.parentNode.replaceChild(zonaNew, zona);
    const inputNew = inputFile.cloneNode(true);
    inputFile.parentNode.replaceChild(inputNew, inputFile);

    document.getElementById('import-drop-zone').onclick = () =>
      document.getElementById('import-file-input').click();

    document.getElementById('import-file-input').onchange = e => {
      const file = e.target.files[0];
      if (file) leerArchivoCSV(file);
    };

    // Drag & drop
    document.getElementById('import-drop-zone').ondragover = e => {
      e.preventDefault();
      e.currentTarget.classList.add('drag-over');
    };
    document.getElementById('import-drop-zone').ondragleave = e => {
      e.currentTarget.classList.remove('drag-over');
    };
    document.getElementById('import-drop-zone').ondrop = e => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) leerArchivoCSV(file);
    };

    const btnConfirmar = document.getElementById('btn-importar-confirmar');
    if (btnConfirmar) {
      const nuevo = btnConfirmar.cloneNode(true);
      btnConfirmar.parentNode.replaceChild(nuevo, btnConfirmar);
      document.getElementById('btn-importar-confirmar').onclick = confirmarImportacion;
    }
  }

  // ── IMPORTAR CSV ─────────────────────────────────────────────────
  let _importPreview = [];

  function leerArchivoCSV(file) {
    if (!file.name.match(/\.(csv|txt|xlsx)$/i)) {
      mostrarToast('⚠️ Selecciona un archivo .csv o .xlsx');
      return;
    }

    // Archivo Excel
    if (file.name.match(/\.xlsx$/i)) {
      if (typeof XLSX === 'undefined') {
        mostrarToast('⚠️ Importar Excel requiere conexión a internet');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          // Convertir cada hoja a CSV y procesar
          let csvTotal = '';
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
            // Usar el nombre de hoja como encabezado de sección
            if (sheetName.toLowerCase().includes('movimiento')) {
              csvTotal += 'MOVIMIENTOS\n' + csv + '\n\n';
            } else if (sheetName.toLowerCase().includes('pr')) {
              csvTotal += 'PRÉSTAMOS\n' + csv + '\n\n';
            }
          }
          procesarCSV(csvTotal);
        } catch (err) {
          mostrarToast('⚠️ No se pudo leer el archivo Excel');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // CSV / TXT
    const reader = new FileReader();
    reader.onload = e => {
      let texto = e.target.result;
      if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
      procesarCSV(texto);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function procesarCSV(texto) {
    const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    _importPreview = [];
    let seccion = null;
    let headers = [];

    for (const linea of lineas) {
      const upper = linea.toUpperCase();
      if (upper.startsWith('MOVIMIENTOS'))                           { seccion = 'movimientos'; headers = []; continue; }
      if (upper.startsWith('PR') && upper.includes('STAMOS'))       { seccion = 'prestamos';   headers = []; continue; }
      if (upper.startsWith('RESUMEN') || upper.startsWith('TOTAL')) continue;
      if (!seccion) continue;

      const cols = parsearLineaCSV(linea);
      if (!cols.length) continue;

      if (!headers.length) {
        if (!/^\d{4}-\d{2}-\d{2}/.test(cols[0]) && isNaN(cols[0].replace(',','.'))) {
          headers = cols.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim());
          continue;
        }
      }

      if (seccion === 'movimientos') {
        const mov = parsearFilaMovimiento(cols, headers);
        if (mov) _importPreview.push({ tipo: 'movimiento', datos: mov });
      } else {
        const pre = parsearFilaPrestamo(cols, headers);
        if (pre) _importPreview.push({ tipo: 'prestamo', datos: pre });
      }
    }
    mostrarPreviewImportacion();
  }

  function parsearLineaCSV(linea) {
    const sep = linea.includes(';') ? ';' : ',';
    const cols = [];
    let enComillas = false, actual = '';
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (enComillas && linea[i+1] === '"') { actual += '"'; i++; }
        else enComillas = !enComillas;
      } else if (c === sep && !enComillas) {
        cols.push(actual.trim()); actual = '';
      } else { actual += c; }
    }
    cols.push(actual.trim());
    return cols;
  }

  function parsearFilaMovimiento(cols, headers) {
    const get = (nombre, pos) => {
      if (headers.length) {
        const idx = headers.findIndex(h => h.includes(nombre));
        return idx >= 0 ? (cols[idx] || '').trim() : (cols[pos] || '').trim();
      }
      return (cols[pos] || '').trim();
    };
    const fecha      = get('fecha', 0);
    const tipoRaw    = get('tipo', 1).toLowerCase();
    const descripcion = get('descripci', 2);
    const categoriaRaw = get('categor', 3).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const montoRaw   = get('monto', 4).replace(/\./g,'').replace(',','.');
    const cuentaRaw  = get('cuenta', 5).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
    const monto = parseFloat(montoRaw);
    if (!monto || monto <= 0) return null;

    const tipo = tipoRaw.includes('ingreso') ? 'ingreso' : 'egreso';
    const cuentaMap = { 'efectivo':'efectivo','tarjeta debito':'tarjeta_debito','t. debito':'tarjeta_debito',
      'tarjeta credito':'tarjeta_credito','t. credito':'tarjeta_credito','banco':'banco' };
    const cuenta = cuentaMap[cuentaRaw] || 'efectivo';

    const cats = Parser.getCategoriasMerged();
    let categoria = 'otros';
    for (const [slug, info] of Object.entries(cats)) {
      const nombre = (info.nombre || slug).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (nombre === categoriaRaw || slug === categoriaRaw.replace(/ /g,'_')) { categoria = slug; break; }
    }
    if (categoria === 'otros') categoria = Parser.categorizarAuto(descripcion) || 'otros';

    return { tipo, monto, descripcion, categoria, cuenta, fecha };
  }

  function parsearFilaPrestamo(cols, headers) {
    const get = (nombre, pos) => {
      if (headers.length) {
        const idx = headers.findIndex(h => h.includes(nombre));
        return idx >= 0 ? (cols[idx] || '').trim() : (cols[pos] || '').trim();
      }
      return (cols[pos] || '').trim();
    };
    const persona    = get('persona', 0);
    const tipoRaw    = get('tipo', 1).toLowerCase();
    const montoRaw   = get('monto', 2).replace(/\./g,'').replace(',','.');
    const interesRaw = get('inter', 3).replace(',','.');
    const estadoRaw  = get('estado', 4).toLowerCase();
    const fechaInicio = get('inicio', 5);
    const fechaFin   = get('fin', 6);
    const nota       = get('nota', 7);

    if (!persona) return null;
    const monto = parseFloat(montoRaw);
    if (!monto || monto <= 0) return null;

    return {
      persona, montoOriginal: monto,
      tipo: tipoRaw.includes('debo') ? 'debo' : 'me_deben',
      estado: estadoRaw.includes('liquid') ? 'liquidado' : 'activo',
      interesMensual: parseFloat(interesRaw) || 0,
      fechaInicio: /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) ? fechaInicio : new Date().toISOString().split('T')[0],
      fechaFin: /^\d{4}-\d{2}-\d{2}$/.test(fechaFin) ? fechaFin : null,
      nota: nota || '', numCuotas: null
    };
  }

  function mostrarPreviewImportacion() {
    const preview = document.getElementById('import-preview');
    if (!preview) return;

    if (!_importPreview.length) {
      preview.innerHTML = `<div class="import-preview-vacio">⚠️ No se encontraron datos válidos. Asegúrate de que el archivo fue exportado desde Contable.</div>`;
      const btn = document.getElementById('btn-importar-confirmar');
      if (btn) btn.classList.add('hidden');
      return;
    }

    const movs = _importPreview.filter(r => r.tipo === 'movimiento');
    const pres = _importPreview.filter(r => r.tipo === 'prestamo');
    const muestra = _importPreview.slice(0, 5);
    const cats = Parser.getCategoriasMerged();

    preview.innerHTML = `
      <div class="import-stats">
        <div class="import-stat"><span class="import-stat-num">${movs.length}</span><span class="import-stat-label">Movimientos</span></div>
        <div class="import-stat"><span class="import-stat-num">${pres.length}</span><span class="import-stat-label">Préstamos</span></div>
      </div>
      <div class="import-muestra">
        ${muestra.map(r => {
          if (r.tipo === 'movimiento') {
            const m = r.datos;
            const info = cats[m.categoria] || Parser.CATEGORIAS.otros;
            return `<div class="import-row">
              <span>${info.emoji}</span>
              <span class="import-row-desc">${m.descripcion || m.categoria}</span>
              <span class="import-row-monto ${m.tipo}">${m.tipo==='ingreso'?'+':'-'}${Parser.formatCOP(m.monto)}</span>
              <span class="import-row-fecha">${m.fecha}</span>
            </div>`;
          } else {
            const p = r.datos;
            return `<div class="import-row">
              <span>🤝</span>
              <span class="import-row-desc">${p.persona}</span>
              <span class="import-row-monto">${Parser.formatCOP(p.montoOriginal)}</span>
              <span class="import-row-fecha">${p.tipo==='debo'?'Yo debo':'Me deben'}</span>
            </div>`;
          }
        }).join('')}
        ${_importPreview.length > 5 ? `<div style="font-size:12px;color:var(--text3);padding:6px 0;">...y ${_importPreview.length-5} registros más</div>` : ''}
      </div>
    `;
    const btn = document.getElementById('btn-importar-confirmar');
    if (btn) btn.classList.remove('hidden');
  }

  async function confirmarImportacion() {
    if (!_importPreview.length) return;
    const btn = document.getElementById('btn-importar-confirmar');
    btn.textContent = 'Importando...'; btn.disabled = true;
    let importados = 0;
    for (const r of _importPreview) {
      try {
        if (r.tipo === 'movimiento') await DB.agregarMovimiento(r.datos);
        else await DB.agregarPrestamo(r.datos);
        importados++;
      } catch(e) {}
    }
    document.getElementById('modal-exportar').classList.add('hidden');
    _importPreview = [];
    mostrarToast(`✅ ${importados} registros importados`);
    if (typeof App !== 'undefined') App.navegarA('historial');
  }

  function getRango() {
    const periodo = document.getElementById('export-periodo').value;
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];

    switch (periodo) {
      case 'mes_actual': {
        const desde = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
        return { desde, hasta: fechaHoy };
      }
      case 'mes_anterior': {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const desde = d.toISOString().split('T')[0];
        const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0];
        return { desde, hasta };
      }
      case 'semana': {
        const dia = hoy.getDay();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
        return { desde: lunes.toISOString().split('T')[0], hasta: fechaHoy };
      }
      case 'año': {
        return { desde: `${hoy.getFullYear()}-01-01`, hasta: fechaHoy };
      }
      case 'personalizado': {
        return {
          desde: document.getElementById('export-desde').value,
          hasta: document.getElementById('export-hasta').value
        };
      }
      default: return { desde: null, hasta: null }; // todo
    }
  }

  // ── PREVIEW ─────────────────────────────────────────────────────
  async function actualizarPreview() {
    const { desde, hasta } = getRango();
    const incMov = document.getElementById('export-inc-movimientos').checked;
    const incPres = document.getElementById('export-inc-prestamos').checked;

    let total = 0;
    if (incMov) {
      const movs = await DB.obtenerMovimientos();
      total += movs.filter(m =>
        (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)
      ).length;
    }
    if (incPres) {
      const pres = await DB.obtenerPrestamos();
      total += pres.length;
    }

    const rangoTexto = desde
      ? `${Parser.fechaLegible(desde)} → ${Parser.fechaLegible(hasta)}`
      : 'Todo el historial';

    document.getElementById('export-preview').innerHTML = `
      <div class="export-preview-info">
        📋 <strong>${total}</strong> registros · ${rangoTexto}
      </div>
    `;
  }

  // ── EXPORTAR ────────────────────────────────────────────────────
  async function exportar(formato) {
    const { desde, hasta } = getRango();
    const incMov = document.getElementById('export-inc-movimientos').checked;
    const incPres = document.getElementById('export-inc-prestamos').checked;
    const cats = Parser.getCategoriasMerged();
    const cuentaLabels = { efectivo: 'Efectivo', tarjeta_debito: 'Tarjeta débito', tarjeta_credito: 'Tarjeta crédito', banco: 'Banco' };

    let movimientos = [];
    let prestamos = [];

    if (incMov) {
      const todos = await DB.obtenerMovimientos();
      movimientos = todos.filter(m =>
        (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)
      ).sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    if (incPres) {
      prestamos = await DB.obtenerPrestamos();
    }

    if (formato === 'csv') {
      generarCSV(movimientos, prestamos, cats, cuentaLabels, desde, hasta);
    } else if (formato === 'xlsx') {
      generarXLSX(movimientos, prestamos, cats, cuentaLabels, desde, hasta);
    } else {
      generarTexto(movimientos, prestamos, cats, cuentaLabels, desde, hasta);
    }
  }

  // ── CSV ──────────────────────────────────────────────────────────
  function generarCSV(movimientos, prestamos, cats, cuentaLabels, desde, hasta) {
    const BOM = '\uFEFF'; // Para que Excel reconozca UTF-8
    const sep = ';';      // Punto y coma: compatible con Excel en español

    let csv = BOM;

    if (movimientos.length) {
      csv += 'MOVIMIENTOS\n';
      csv += ['Fecha','Tipo','Descripción','Categoría','Monto','Cuenta'].join(sep) + '\n';
      for (const m of movimientos) {
        const info = cats[m.categoria] || Parser.CATEGORIAS.otros;
        const fila = [
          m.fecha,
          m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
          `"${(m.descripcion || '').replace(/"/g, '""')}"`,
          `"${info.nombre || m.categoria}"`,
          Math.round(m.monto).toString().replace('.', ','),
          cuentaLabels[m.cuenta] || m.cuenta
        ];
        csv += fila.join(sep) + '\n';
      }
      csv += '\n';
    }

    if (prestamos.length) {
      csv += 'PRÉSTAMOS\n';
      csv += ['Persona','Tipo','Monto original','Interés %','Estado','Fecha inicio','Fecha fin','Nota'].join(sep) + '\n';
      for (const p of prestamos) {
        const fila = [
          `"${p.persona}"`,
          p.tipo === 'debo' ? 'Yo debo' : 'Me deben',
          Math.round(p.montoOriginal).toString().replace('.', ','),
          (p.interesMensual || 0).toString().replace('.', ','),
          p.estado === 'activo' ? 'Activo' : 'Liquidado',
          p.fechaInicio || '',
          p.fechaFin || '',
          `"${(p.nota || '').replace(/"/g, '""')}"`
        ];
        csv += fila.join(sep) + '\n';
      }
    }

    // Generar resumen al final
    if (movimientos.length) {
      const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s,m) => s+m.monto, 0);
      const egresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s,m) => s+m.monto, 0);
      csv += '\nRESUMEN\n';
      csv += `Total ingresos${sep}${Math.round(ingresos)}\n`;
      csv += `Total egresos${sep}${Math.round(egresos)}\n`;
      csv += `Saldo${sep}${Math.round(ingresos - egresos)}\n`;
    }

    // Descargar
    const nombre = `contable_${desde || 'todo'}_${hasta || 'hoy'}.csv`;
    descargarArchivo(csv, nombre, 'text/csv;charset=utf-8;');
    document.getElementById('modal-exportar').classList.add('hidden');
  }

  // ── XLSX ─────────────────────────────────────────────────────────
  function generarXLSX(movimientos, prestamos, cats, cuentaLabels, desde, hasta) {
    if (typeof XLSX === 'undefined') {
      mostrarToast('⚠️ Excel no disponible sin conexión. Usa CSV.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Movimientos ──────────────────────────────────────
    if (movimientos.length) {
      const filas = [
        ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Cuenta']
      ];
      for (const m of movimientos) {
        const info = cats[m.categoria] || Parser.CATEGORIAS.otros;
        filas.push([
          m.fecha,
          m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
          m.descripcion || '',
          info.nombre || m.categoria,
          Math.round(m.monto),
          cuentaLabels[m.cuenta] || m.cuenta
        ]);
      }
      // Fila vacía + resumen al final
      filas.push([]);
      const ingresos = movimientos.filter(m=>m.tipo==='ingreso').reduce((s,m)=>s+m.monto,0);
      const egresos  = movimientos.filter(m=>m.tipo==='egreso').reduce((s,m)=>s+m.monto,0);
      filas.push(['Total ingresos', '', '', '', Math.round(ingresos), '']);
      filas.push(['Total egresos',  '', '', '', Math.round(egresos),  '']);
      filas.push(['Saldo',          '', '', '', Math.round(ingresos-egresos), '']);

      const ws = XLSX.utils.aoa_to_sheet(filas);

      // Ancho de columnas
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    }

    // ── Hoja 2: Préstamos ────────────────────────────────────────
    if (prestamos.length) {
      const filas = [
        ['Persona', 'Tipo', 'Monto original', 'Interés %', 'Estado', 'Fecha inicio', 'Fecha fin', 'Nota']
      ];
      for (const p of prestamos) {
        filas.push([
          p.persona,
          p.tipo === 'debo' ? 'Yo debo' : 'Me deben',
          Math.round(p.montoOriginal),
          p.interesMensual || 0,
          p.estado === 'activo' ? 'Activo' : 'Liquidado',
          p.fechaInicio || '',
          p.fechaFin || '',
          p.nota || ''
        ]);
      }
      const ws2 = XLSX.utils.aoa_to_sheet(filas);
      ws2['!cols'] = [{ wch: 20 },{ wch: 12 },{ wch: 16 },{ wch: 10 },{ wch: 12 },{ wch: 14 },{ wch: 14 },{ wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Préstamos');
    }

    // ── Hoja 3: Resumen por categoría ───────────────────────────
    if (movimientos.length) {
      const porCat = {};
      for (const m of movimientos.filter(m=>m.tipo==='egreso')) {
        const info = cats[m.categoria] || Parser.CATEGORIAS.otros;
        const nombre = info.nombre || m.categoria;
        porCat[nombre] = (porCat[nombre] || 0) + m.monto;
      }
      const filasRes = [['Categoría', 'Total egresos', '% del total']];
      const totalEg = Object.values(porCat).reduce((s,v)=>s+v,0);
      Object.entries(porCat).sort((a,b)=>b[1]-a[1]).forEach(([nombre, monto]) => {
        filasRes.push([nombre, Math.round(monto), totalEg>0?Math.round((monto/totalEg)*100)+'%':'0%']);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(filasRes);
      ws3['!cols'] = [{ wch: 22 },{ wch: 16 },{ wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Por categoría');
    }

    const nombre = `contable_${desde||'todo'}_${hasta||'hoy'}.xlsx`;
    XLSX.writeFile(wb, nombre);
    document.getElementById('modal-exportar').classList.add('hidden');
  }
  async function generarTexto(movimientos, prestamos, cats, cuentaLabels, desde, hasta) {
    const hoy = new Date().toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });
    let txt = `📊 CONTABLE — Reporte financiero\n`;
    txt += `Generado el ${hoy}\n`;
    if (desde) txt += `Período: ${Parser.fechaLegible(desde)} → ${Parser.fechaLegible(hasta)}\n`;
    txt += `${'─'.repeat(40)}\n\n`;

    if (movimientos.length) {
      const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s,m) => s+m.monto, 0);
      const egresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s,m) => s+m.monto, 0);

      txt += `💰 RESUMEN\n`;
      txt += `  Ingresos:  ${Parser.formatCOP(ingresos)}\n`;
      txt += `  Egresos:   ${Parser.formatCOP(egresos)}\n`;
      txt += `  Saldo:     ${Parser.formatCOP(ingresos - egresos)}\n\n`;

      // Agrupar por fecha
      const grupos = {};
      for (const m of movimientos) {
        if (!grupos[m.fecha]) grupos[m.fecha] = [];
        grupos[m.fecha].push(m);
      }

      txt += `📋 DETALLE\n`;
      for (const fecha of Object.keys(grupos).sort().reverse()) {
        txt += `\n${Parser.fechaGrupo(fecha)}\n`;
        for (const m of grupos[fecha]) {
          const info = cats[m.categoria] || Parser.CATEGORIAS.otros;
          const signo = m.tipo === 'ingreso' ? '+' : '-';
          const desc = m.descripcion || info.nombre || m.categoria;
          txt += `  ${signo}${Parser.formatCOP(m.monto).padStart(14)}  ${info.emoji} ${desc}\n`;
        }
      }
      txt += '\n';
    }

    if (prestamos.length) {
      txt += `${'─'.repeat(40)}\n`;
      txt += `🤝 PRÉSTAMOS\n\n`;
      const debo    = prestamos.filter(p => p.tipo === 'debo' && p.estado === 'activo');
      const meDeben = prestamos.filter(p => p.tipo === 'me_deben' && p.estado === 'activo');
      if (debo.length) {
        txt += `Yo debo:\n`;
        for (const p of debo) {
          txt += `  · ${p.persona}: ${Parser.formatCOP(p.montoOriginal)}`;
          if (p.interesMensual) txt += ` (${p.interesMensual}% mensual)`;
          txt += '\n';
        }
        txt += '\n';
      }
      if (meDeben.length) {
        txt += `Me deben:\n`;
        for (const p of meDeben) {
          txt += `  · ${p.persona}: ${Parser.formatCOP(p.montoOriginal)}\n`;
        }
      }
    }

    // Intentar compartir nativo (Web Share API) o copiar al portapapeles
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Reporte Contable', text: txt });
        document.getElementById('modal-exportar').classList.add('hidden');
        return;
      } catch (e) { /* usuario canceló o no disponible */ }
    }

    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(txt);
      mostrarToast('✅ Texto copiado al portapapeles');
    } catch (e) {
      // Último fallback: descargar como .txt
      descargarArchivo(txt, 'contable_reporte.txt', 'text/plain;charset=utf-8;');
    }
    document.getElementById('modal-exportar').classList.add('hidden');
  }

  // ── UTILS ────────────────────────────────────────────────────────
  function descargarArchivo(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function mostrarToast(mensaje) {
    let toast = document.getElementById('contable-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'contable-toast';
      toast.className = 'contable-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  return { abrir };
})();
