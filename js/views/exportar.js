/**
 * CONTABLE - Exportar datos
 * Genera CSV (para Excel) o texto plano (para compartir por WhatsApp, etc.)
 */

const ExportarView = (() => {

  function abrir() {
    const modal = document.getElementById('modal-exportar');
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('export-hasta').value = hoy;
    document.getElementById('export-desde').value = hoy.slice(0, 7) + '-01';
    actualizarPreview();
    modal.classList.remove('hidden');

    // Bindings (reemplazar clonando para evitar duplicados)
    ['btn-export-csv','btn-export-txt'].forEach(id => {
      const btn = document.getElementById(id);
      const nuevo = btn.cloneNode(true);
      btn.parentNode.replaceChild(nuevo, btn);
    });

    document.getElementById('modal-exportar').querySelector('.modal-backdrop').onclick =
      () => modal.classList.add('hidden');

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
    document.getElementById('btn-export-txt').onclick = () => exportar('txt');
  }

  // ── RANGO DE FECHAS ─────────────────────────────────────────────
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

  // ── TEXTO PLANO (para compartir) ─────────────────────────────────
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
