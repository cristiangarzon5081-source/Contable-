/**
 * CONTABLE - Vista "Más"
 * Tabs: Metas de ahorro | Cuentas con saldo
 */

const MasView = (() => {
  let _tab = 'metas'; // 'metas' | 'cuentas'

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="mas-wrap fade-in">
        <div class="mas-tabs">
          <button class="mas-tab ${_tab === 'metas' ? 'active' : ''}" data-tab="metas">🎯 Metas</button>
          <button class="mas-tab ${_tab === 'cuentas' ? 'active' : ''}" data-tab="cuentas">🏦 Cuentas</button>
        </div>
        <div id="mas-content"><div class="empty-state"><div class="empty-icon">⏳</div></div></div>
      </div>
    `;
    document.querySelectorAll('.mas-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        document.querySelectorAll('.mas-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderContenido();
      });
    });
    await renderContenido();
  }

  async function renderContenido() {
    const el = document.getElementById('mas-content');
    if (!el) return;
    if (_tab === 'metas') await renderMetas(el);
    else await renderCuentas(el);
  }

  // ══ METAS DE AHORRO ═══════════════════════════════════════════
  async function renderMetas(el) {
    const metas = await DB.obtenerMetas();
    const activas = metas.filter(m => m.activa !== false);
    const cumplidas = metas.filter(m => m.activa === false);

    el.innerHTML = `
      <div class="metas-lista" id="metas-lista">
        ${activas.length ? activas.map(m => buildMetaCard(m)).join('') : `
          <div class="empty-state" style="padding:50px 0;">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">Sin metas aún</div>
            <p>Define una meta de ahorro y lleva el control de tu progreso</p>
          </div>`}
        ${cumplidas.length ? `
          <div class="section-title" style="margin-top:8px;">✅ Cumplidas</div>
          ${cumplidas.map(m => buildMetaCard(m, true)).join('')}
        ` : ''}
      </div>
      <button class="btn-nueva-meta" id="btn-nueva-meta">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nueva meta de ahorro
      </button>
    `;

    document.getElementById('btn-nueva-meta').addEventListener('click', () => abrirModalMeta(null));
    bindMetaEvents();
  }

  function buildMetaCard(meta, cumplida = false) {
    const pct = Math.min(100, meta.montoMeta > 0 ? Math.round((meta.montoAhorrado / meta.montoMeta) * 100) : 0);
    const falta = Math.max(0, meta.montoMeta - meta.montoAhorrado);
    const colorBarra = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : 'var(--yellow)';

    let diasLabel = '';
    if (meta.fechaLimite) {
      const hoy = new Date().toISOString().split('T')[0];
      const dias = Parser.diasEntre(hoy, meta.fechaLimite);
      if (dias > 0) diasLabel = `📅 ${dias} días restantes`;
      else if (dias === 0) diasLabel = `📅 ¡Hoy es el límite!`;
      else diasLabel = `⚠️ Venció hace ${Math.abs(dias)} días`;
    }

    return `
      <div class="meta-card ${cumplida ? 'meta-cumplida' : ''}" data-id="${meta.id}">
        <div class="meta-header">
          <span class="meta-emoji">${meta.emoji}</span>
          <div class="meta-info">
            <div class="meta-nombre">${meta.nombre}</div>
            ${diasLabel ? `<div class="meta-fecha">${diasLabel}</div>` : ''}
          </div>
          <div class="meta-acciones">
            ${!cumplida ? `<button class="meta-btn-abono" data-id="${meta.id}" title="Agregar ahorro">+</button>` : ''}
            <button class="meta-btn-edit" data-id="${meta.id}" title="Editar">✏️</button>
            <button class="meta-btn-del" data-id="${meta.id}" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="meta-montos">
          <span class="meta-ahorrado">${Parser.formatCOP(meta.montoAhorrado)}</span>
          <span class="meta-de"> de </span>
          <span class="meta-total">${Parser.formatCOP(meta.montoMeta)}</span>
          <span class="meta-pct" style="color:${colorBarra}">${pct}%</span>
        </div>
        <div class="meta-barra-wrap">
          <div class="meta-barra-fill" style="width:${pct}%;background:${colorBarra}"></div>
        </div>
        ${!cumplida && falta > 0 ? `<div class="meta-falta">Falta: <strong>${Parser.formatCOP(falta)}</strong></div>` : ''}
        ${pct >= 100 ? `<div class="meta-falta" style="color:var(--green)">🎉 ¡Meta cumplida!</div>` : ''}
      </div>
    `;
  }

  function bindMetaEvents() {
    // Abono
    document.querySelectorAll('.meta-btn-abono').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        abrirModalAbono(parseInt(btn.dataset.id));
      });
    });
    // Editar
    document.querySelectorAll('.meta-btn-edit').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const metas = await DB.obtenerMetas();
        const meta = metas.find(m => m.id === parseInt(btn.dataset.id));
        if (meta) abrirModalMeta(meta);
      });
    });
    // Eliminar
    document.querySelectorAll('.meta-btn-del').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta meta?')) {
          await DB.eliminarMeta(parseInt(btn.dataset.id));
          await renderContenido();
        }
      });
    });
  }

  // Modal crear/editar meta
  function abrirModalMeta(meta) {
    const modal = document.getElementById('modal-meta');
    document.getElementById('meta-titulo-modal').textContent = meta ? 'Editar meta' : 'Nueva meta';
    document.getElementById('meta-emoji-inp').value = meta?.emoji || '🎯';
    document.getElementById('meta-nombre-inp').value = meta?.nombre || '';
    document.getElementById('meta-monto-inp').value = meta ? Math.round(meta.montoMeta).toLocaleString('es-CO') : '';
    document.getElementById('meta-fecha-inp').value = meta?.fechaLimite || '';
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('meta-nombre-inp').focus(), 200);

    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');
    document.getElementById('meta-monto-inp').oninput = e => {
      let v = e.target.value.replace(/[^0-9]/g, '');
      if (v) e.target.value = parseInt(v).toLocaleString('es-CO');
    };

    const btn = document.getElementById('btn-guardar-meta');
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);
    document.getElementById('btn-guardar-meta').onclick = async () => {
      const nombre = document.getElementById('meta-nombre-inp').value.trim();
      const emoji  = document.getElementById('meta-emoji-inp').value.trim() || '🎯';
      const montoRaw = document.getElementById('meta-monto-inp').value.replace(/\./g,'').replace(/,/g,'');
      const montoMeta = parseFloat(montoRaw);
      const fechaLimite = document.getElementById('meta-fecha-inp').value || null;
      if (!nombre || !montoMeta) return;
      await DB.guardarMeta({
        ...(meta || {}), nombre, emoji, montoMeta, fechaLimite,
        montoAhorrado: meta?.montoAhorrado || 0, activa: true
      });
      modal.classList.add('hidden');
      await renderContenido();
    };
  }

  // Modal abonar a la meta
  function abrirModalAbono(metaId) {
    const modal = document.getElementById('modal-meta-abono');
    document.getElementById('meta-abono-inp').value = '';
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('meta-abono-inp').focus(), 200);
    modal.querySelector('.modal-backdrop').onclick = () => modal.classList.add('hidden');
    document.getElementById('meta-abono-inp').oninput = e => {
      let v = e.target.value.replace(/[^0-9]/g, '');
      if (v) e.target.value = parseInt(v).toLocaleString('es-CO');
    };
    const btn = document.getElementById('btn-guardar-meta-abono');
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);
    document.getElementById('btn-guardar-meta-abono').onclick = async () => {
      const raw = document.getElementById('meta-abono-inp').value.replace(/\./g,'').replace(/,/g,'');
      const monto = parseFloat(raw);
      if (!monto || monto <= 0) return;
      const metas = await DB.obtenerMetas();
      const meta = metas.find(m => m.id === metaId);
      if (!meta) return;
      const nuevoAhorrado = meta.montoAhorrado + monto;
      const cumplida = nuevoAhorrado >= meta.montoMeta;
      await DB.actualizarMeta(metaId, {
        montoAhorrado: nuevoAhorrado,
        activa: !cumplida
      });
      modal.classList.add('hidden');
      if (cumplida) mostrarToastMas('🎉 ¡Meta cumplida!');
      await renderContenido();
    };
  }

  function mostrarToastMas(msg) {
    let t = document.getElementById('contable-toast');
    if (!t) { t = document.createElement('div'); t.id = 'contable-toast'; t.className = 'contable-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2500);
  }

  // ══ CUENTAS CON SALDO ══════════════════════════════════════════
  async function renderCuentas(el) {
    const movimientos = await DB.obtenerMovimientos();
    const cuentas = {
      efectivo:       { label: 'Efectivo',      emoji: '💵', saldo: 0, movs: 0 },
      tarjeta_debito: { label: 'Tarjeta débito', emoji: '💳', saldo: 0, movs: 0 },
      tarjeta_credito:{ label: 'Tarjeta crédito',emoji: '💳', saldo: 0, movs: 0 },
      banco:          { label: 'Banco',          emoji: '🏦', saldo: 0, movs: 0 }
    };

    for (const m of movimientos) {
      const c = cuentas[m.cuenta];
      if (!c) continue;
      c.saldo += m.tipo === 'ingreso' ? m.monto : -m.monto;
      c.movs++;
    }

    const totalSaldo = Object.values(cuentas).reduce((s, c) => s + c.saldo, 0);
    const totalMovs  = Object.values(cuentas).reduce((s, c) => s + c.movs, 0);

    el.innerHTML = `
      <!-- Resumen total -->
      <div class="cuentas-total-card">
        <div class="cuentas-total-label">Saldo total registrado</div>
        <div class="cuentas-total-val ${totalSaldo >= 0 ? 'text-green' : 'text-red'}">${Parser.formatCOP(totalSaldo)}</div>
        <div class="cuentas-total-movs">${totalMovs} movimientos en total</div>
      </div>

      <!-- Tarjetas por cuenta -->
      <div class="cuentas-grid">
        ${Object.entries(cuentas).map(([slug, c]) => {
          const pct = totalMovs > 0 ? Math.round((c.movs / totalMovs) * 100) : 0;
          return `
            <div class="cuenta-card">
              <div class="cuenta-emoji">${c.emoji}</div>
              <div class="cuenta-label">${c.label}</div>
              <div class="cuenta-saldo ${c.saldo >= 0 ? 'text-green' : 'text-red'}">${Parser.formatCOP(c.saldo)}</div>
              <div class="cuenta-movs">${c.movs} movimientos · ${pct}% del total</div>
              <div class="cuenta-barra-wrap">
                <div class="cuenta-barra-fill" style="width:${pct}%;background:${c.saldo>=0?'var(--green)':'var(--red)'}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="cuentas-nota">
        💡 El saldo de cada cuenta se calcula automáticamente sumando todos los ingresos y restando todos los egresos registrados para esa cuenta.
      </div>
    `;
  }

  return { render };
})();
