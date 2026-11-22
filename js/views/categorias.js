/**
 * CONTABLE - Vista Categorías
 * Permite ver, editar (nombre/emoji) y crear categorías.
 * Las categorías base no se pueden eliminar, solo editar.
 * Las personalizadas se pueden eliminar.
 */

const CategoriasView = (() => {
  let tabActual = 'egreso'; // 'egreso' | 'ingreso'

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="categorias-view fade-in">
        <div class="cats-header">
          <div class="cats-tabs">
            <button class="cats-tab ${tabActual === 'egreso' ? 'active' : ''}" data-tab="egreso">Egresos</button>
            <button class="cats-tab ${tabActual === 'ingreso' ? 'active' : ''}" data-tab="ingreso">Ingresos</button>
          </div>
        </div>
        <div id="cats-lista">
          <div class="empty-state"><div class="empty-icon">⏳</div><p>Cargando...</p></div>
        </div>
        <button class="btn-nueva-cat" id="btn-nueva-cat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva categoría
        </button>
        <p class="cats-hint">Toca cualquier categoría para editar su nombre o emoji.</p>
      </div>
    `;

    document.querySelectorAll('.cats-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabActual = btn.dataset.tab;
        document.querySelectorAll('.cats-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cargarLista();
      });
    });

    document.getElementById('btn-nueva-cat').addEventListener('click', () => abrirModalCat(null));

    await cargarLista();
  }

  async function cargarLista() {
    await Parser.cargarCatsPersonalizadas();
    const merged = Parser.getCategoriasMerged();
    const personalizadas = await DB.obtenerCategorias();
    const slugsPersonalizados = new Set(personalizadas.map(c => c.slug));

    const lista = document.getElementById('cats-lista');
    if (!lista) return;

    // Filtrar por tab
    const filtradas = Object.entries(merged).filter(([slug, cat]) => {
      if (slug === 'otros') return false; // "Otros" siempre existe, no se muestra en la lista editable
      const tipo = cat.tipo || 'egreso';
      if (tabActual === 'egreso') return tipo === 'egreso' || tipo === 'ambos';
      if (tabActual === 'ingreso') return tipo === 'ingreso' || tipo === 'ambos';
      return true;
    });

    if (!filtradas.length) {
      lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No hay categorías en esta sección</p></div>`;
      return;
    }

    lista.innerHTML = filtradas.map(([slug, cat]) => {
      const esPersonalizada = slugsPersonalizados.has(slug) && !Object.keys(CATEGORIAS).includes(slug);
      const esEditadaBase = slugsPersonalizados.has(slug) && Object.keys(CATEGORIAS).includes(slug);
      return `
        <div class="cat-row" data-slug="${slug}">
          <div class="cat-row-emoji">${cat.emoji}</div>
          <div class="cat-row-info">
            <div class="cat-row-nombre">${cat.nombre}</div>
            <div class="cat-row-badge">
              ${esPersonalizada ? '<span class="badge-personalizada">Personalizada</span>' : ''}
              ${esEditadaBase ? '<span class="badge-editada">Editada</span>' : ''}
              ${!esPersonalizada && !esEditadaBase ? '<span class="badge-base">Predefinida</span>' : ''}
            </div>
          </div>
          <div class="cat-row-actions">
            <button class="cat-btn-edit" data-slug="${slug}" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            ${esPersonalizada ? `
              <button class="cat-btn-delete" data-slug="${slug}" title="Eliminar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Bind editar
    lista.querySelectorAll('.cat-btn-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const slug = btn.dataset.slug;
        const merged = Parser.getCategoriasMerged();
        abrirModalCat({ slug, ...merged[slug] });
      });
    });

    // Bind eliminar
    lista.querySelectorAll('.cat-btn-delete').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const slug = btn.dataset.slug;
        const merged = Parser.getCategoriasMerged();
        const nombre = merged[slug]?.nombre || slug;
        if (confirm(`¿Eliminar la categoría "${nombre}"?\nLos movimientos con esta categoría quedarán como "Otros".`)) {
          await DB.eliminarCategoria(slug);
          Parser.invalidarCache();
          await cargarLista();
        }
      });
    });
  }

  // ── MODAL EDITAR / CREAR ──────────────────────────────────────
  function abrirModalCat(cat) {
    // cat = null → nueva; cat = objeto → editar
    const esNueva = !cat;
    const esBase = cat && Object.keys(CATEGORIAS).includes(cat.slug);

    const modal = document.getElementById('modal-categoria');
    document.getElementById('modal-cat-titulo').textContent = esNueva ? 'Nueva categoría' : 'Editar categoría';
    document.getElementById('cat-edit-emoji').value = cat?.emoji || '📦';
    document.getElementById('cat-edit-nombre').value = cat?.nombre || '';
    document.getElementById('cat-edit-tipo').value = cat?.tipo || 'egreso';
    document.getElementById('cat-edit-palabras').value = (cat?.palabras || []).join(', ');
    document.getElementById('cat-edit-slug-display').textContent = cat?.slug ? `ID: ${cat.slug}` : '';

    // Si es categoría base, el tipo y el slug no se cambian
    document.getElementById('cat-edit-tipo').disabled = esBase;
    document.getElementById('cat-edit-palabras-hint').textContent = esBase
      ? 'Agrega palabras clave adicionales separadas por coma (las originales se mantienen).'
      : 'Palabras clave para detección automática, separadas por coma.';

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('cat-edit-nombre').focus(), 200);

    document.getElementById('btn-guardar-cat').onclick = () => guardarCat(cat, esBase);
  }

  async function guardarCat(catOriginal, esBase) {
    const emoji = document.getElementById('cat-edit-emoji').value.trim() || '📦';
    const nombre = document.getElementById('cat-edit-nombre').value.trim();
    const tipo = document.getElementById('cat-edit-tipo').value;
    const palabrasRaw = document.getElementById('cat-edit-palabras').value;
    const palabras = palabrasRaw.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);

    if (!nombre) {
      document.getElementById('cat-edit-nombre').style.outline = '2px solid var(--red)';
      setTimeout(() => document.getElementById('cat-edit-nombre').style.outline = '', 1500);
      return;
    }

    const slug = catOriginal?.slug || Parser.slugify(nombre);

    try {
      await DB.guardarCategoria({
        slug,
        nombre,
        emoji,
        tipo: esBase ? (catOriginal?.tipo || 'egreso') : tipo,
        palabras,
        esPersonalizada: !esBase,
        creadoEn: catOriginal?.creadoEn || Date.now()
      });
      Parser.invalidarCache();
      document.getElementById('modal-categoria').classList.add('hidden');
      await cargarLista();
    } catch (e) {
      alert('Error al guardar. Intenta de nuevo.');
    }
  }

  return { render };
})();
