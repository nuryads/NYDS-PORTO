(() => {
  'use strict';
  const CAT = Array.isArray(window.PORTFOLIO_CATEGORIES) ? window.PORTFOLIO_CATEGORIES : [];
  const START = JSON.parse(JSON.stringify(window.PORTFOLIO_PROJECTS || []));
  const DRAFT_KEY = 'nuryadi-portfolio-organizer-draft-final-86-v1';
  let items = JSON.parse(JSON.stringify(START));
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) items = parsed;
    }
  } catch (error) { /* Browser may block localStorage for file:// */ }
  const $ = id => document.getElementById(id);
  const catName = id => CAT.find(cat => cat.id === id)?.name || id;
  const txt = (tag, text, classname) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (classname) e.className = classname;
    return e;
  };
  const toast = message => {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toast.timeout); toast.timeout = setTimeout(() => $('toast').hidden = true, 5000);
  };
  const saveDraft = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(items)); } catch(error){} };
  const normalizeOrders = () => items.forEach((item, index) => item.order = (index + 1) * 10);

  function populateCategories() {
    [$('category-filter'), $('new-category'), $('edit-category')].forEach(select => {
      CAT.forEach(cat => {
        const opt = document.createElement('option'); opt.value = cat.id; opt.textContent = cat.name;
        select.append(opt);
      });
    });
  }

  function visibleItems() {
    const category = $('category-filter').value;
    const status = $('visibility-filter').value;
    const search = $('search-project').value.trim().toLowerCase();
    return items.filter(item => (category === 'all' || item.category === category) && (status === 'all' || (status === 'public' ? item.visible !== false : item.visible === false)) && (!search || item.title.toLowerCase().includes(search) || item.id.toLowerCase().includes(search)));
  }
  function shift(id, dir) {
    const shown = visibleItems();
    const visualIndex = shown.findIndex(item => item.id === id);
    const target = shown[visualIndex + dir];
    if (!target) return;
    const a = items.findIndex(item => item.id === id);
    const b = items.findIndex(item => item.id === target.id);
    [items[a], items[b]] = [items[b], items[a]];
    normalizeOrders(); saveDraft(); render();
  }
  function moveTo(id, beforeId) {
    if (!id || !beforeId || id === beforeId) return;
    const from = items.findIndex(item => item.id === id);
    if (from < 0) return;
    const [moving] = items.splice(from, 1);
    const to = items.findIndex(item => item.id === beforeId);
    items.splice(to, 0, moving);
    normalizeOrders(); saveDraft(); render();
  }
  let dragging = '';
  function makeCard(project) {
    const card = txt('article', '', 'organizer-card');
    card.draggable = true; card.dataset.id = project.id;
    if (project.visible === false) card.classList.add('is-draft');
    const cover = txt('img');
    cover.src = project.images?.[0]?.thumb || project.images?.[0]?.src || '';
    cover.alt = project.title;
    const detail = txt('div','', 'card-detail');
    detail.append(txt('span',catName(project.category)+(project.ai ? ' · AI-assisted' : '')+(project.visible === false ? ' · DRAFT (tidak tampil)' : ''),'mini-tag'));
    detail.append(txt('h3',project.title));
    detail.append(txt('p',`${project.images?.length || 0} gambar · ${project.subtitle || 'Tanpa subjudul'}`));
    const actions = txt('div','', 'card-actions');
    for (const [symbol, label, handler] of [
      ['↑','Naik',() => shift(project.id,-1)],
      ['↓','Turun',() => shift(project.id,1)],
      ['Edit','Edit proyek',() => openEdit(project.id)]
    ]) {
      const button = txt('button',symbol,symbol === 'Edit' ? 'edit-btn' : '');
      button.type = 'button'; button.setAttribute('aria-label',label+' '+project.title);
      button.addEventListener('click', handler); actions.append(button);
    }
    detail.append(actions);
    card.append(cover, detail,txt('span','⠿','drag-handle'));
    card.addEventListener('dragstart', event => {
      dragging = project.id;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', project.id);
    });
    card.addEventListener('dragend', () => { dragging = ''; card.classList.remove('dragging'); document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target')); });
    card.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; card.classList.add('drop-target'); });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', event => { event.preventDefault(); card.classList.remove('drop-target'); moveTo(dragging || event.dataTransfer.getData('text/plain'), project.id); });
    return card;
  }
  function render() {
    const shown = visibleItems();
    $('organizer-list').replaceChildren(...shown.map(makeCard));
    $('visible-count').textContent = `(${shown.length} dari ${items.length})`;
    $('count-pill').textContent = `${items.length} PROJECTS`;
    $('no-items').hidden = shown.length > 0;
  }

  function exportFile() {
    normalizeOrders();
    const content = '// Portfolio data — hasil ekspor Gallery Organizer.\nwindow.PORTFOLIO_CATEGORIES = ' + JSON.stringify(CAT,null,2) + ';\n\nwindow.PORTFOLIO_PROJECTS = ' + JSON.stringify(items,null,2) + ';\n';
    const blob = new Blob([content],{type:'text/javascript;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'portfolio-data.js';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('File portfolio-data.js telah diunduh. Ganti file lama dengan file ini di repository GitHub agar perubahan tampil online.');
  }

  let editingId = null;
  let editingPhotos = [];
  const dialog = $('edit-dialog');
  function openEdit(id) {
    const project = items.find(item => item.id === id);
    if (!project) return;
    editingId = id;
    editingPhotos = JSON.parse(JSON.stringify(project.images || []));
    $('edit-title').value = project.title;
    $('edit-category').value = project.category;
    $('edit-subtitle').value = project.subtitle || '';
    $('edit-description').value = project.description || '';
    $('edit-role').value = project.role || '';
    $('edit-process').value = project.process || '';
    $('edit-tools').value = (project.tools || []).join(', ');
    $('edit-tags').value = (project.tags || []).join(', ');
    $('edit-ai').checked = !!project.ai;
    $('edit-featured').checked = !!project.featured;
    $('edit-visible').checked = project.visible !== false;
    renderPhotos(); dialog.showModal();
  }
  function renderPhotos() {
    const list = $('photo-list');
    list.replaceChildren(...editingPhotos.map((photo, index) => {
      const row = txt('div','', 'photo-row');
      const preview = txt('img'); preview.src = photo.thumb || photo.src || ''; preview.alt = photo.alt || photo.caption || 'Preview gambar';
      const fields = txt('div','', 'photo-fields');
      const pathLabel = txt('label','Path file gambar');
      const path = txt('input'); path.value = photo.src || ''; path.placeholder = 'assets/images/nama.webp';
      path.addEventListener('input', () => { if (photo.src !== path.value) { photo.src = path.value; delete photo.thumb; } });
      path.addEventListener('change', () => { preview.src = photo.src; });
      pathLabel.append(path);
      const captionLabel = txt('label','Keterangan gambar');
      const captionInput = txt('input'); captionInput.value = photo.caption || ''; captionInput.placeholder = 'Contoh: Motif tampak depan';
      captionInput.addEventListener('input', () => { photo.caption = captionInput.value; photo.alt = captionInput.value; });
      captionLabel.append(captionInput);
      fields.append(pathLabel, captionLabel);
      const actions = txt('div','', 'photo-actions');
      const configs = [
        ['↑','Naikkan gambar', () => swapPhoto(index,-1)],
        ['↓','Turunkan gambar', () => swapPhoto(index,1)],
        ['✕','Hapus gambar', () => { if (editingPhotos.length <= 1) { toast('Setiap proyek perlu minimal satu gambar.'); return; } editingPhotos.splice(index,1); renderPhotos(); }],
      ];
      configs.forEach(([symbol,label,fn],i) => {
        const button = txt('button',symbol,i===2?'remove-photo':'');
        button.type='button';button.title=label;button.setAttribute('aria-label',label);button.addEventListener('click',fn); actions.append(button);
      });
      row.append(preview,fields,actions); return row;
    }));
  }
  function swapPhoto(i, dir) {
    const j = i + dir; if (j < 0 || j >= editingPhotos.length) return;
    [editingPhotos[i], editingPhotos[j]] = [editingPhotos[j], editingPhotos[i]];
    renderPhotos();
  }
  function closeEditor() { dialog.close(); editingId = null; editingPhotos = []; }
  $('edit-form').addEventListener('submit', event => {
    event.preventDefault();
    const project = items.find(item => item.id === editingId); if (!project) return;
    if (!editingPhotos.length || editingPhotos.some(photo => !photo.src.trim())) { toast('Isi path gambar untuk semua foto sebelum menyimpan.'); return; }
    project.title = $('edit-title').value.trim();
    project.category = $('edit-category').value;
    project.subtitle = $('edit-subtitle').value.trim();
    project.description = $('edit-description').value.trim();
    project.role = $('edit-role').value.trim();
    project.process = $('edit-process').value.trim();
    project.tools = $('edit-tools').value.split(',').map(s=>s.trim()).filter(Boolean);
    project.tags = $('edit-tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    project.ai = $('edit-ai').checked;
    project.featured = $('edit-featured').checked;
    project.visible = $('edit-visible').checked;
    project.images = editingPhotos;
    saveDraft(); closeEditor();render();toast('Perubahan disimpan di browser. Unduh data galeri agar siap di-upload ke GitHub.');
  });
  $('close-dialog').addEventListener('click',closeEditor);
  $('add-photo').addEventListener('click', () => { editingPhotos.push({src:'',caption:'',alt:''});renderPhotos(); });
  $('delete-project').addEventListener('click', () => {
    const p=items.find(item=>item.id===editingId);
    if (p && confirm(`Hapus proyek "${p.title}" dari daftar galeri? File gambarnya tidak ikut terhapus.`)) {
      items=items.filter(item=>item.id!==editingId);normalizeOrders();saveDraft();closeEditor();render();toast('Proyek dihapus dari galeri lokal. Unduh file data untuk mempublikasikan perubahan.');
    }
  });
  $('add-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = $('new-title').value.trim(); const image=$('new-path').value.trim();
    if (!title || !image) return;
    const id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,5);
    items.push({id,title,category:$('new-category').value,subtitle:'New project',description:'Tambahkan deskripsi proyek di editor.',role:'Graphic design',tools:[],images:[{src:image,caption:title,alt:title}],process:'Tambahkan detail proses kreatif di editor.',featured:false,ai:false,visible:true,tags:[],order:(items.length+1)*10});
    saveDraft();$('add-form').reset();$('category-filter').value='all';$('search-project').value='';render();toast('Proyek ditambahkan. Pastikan gambar sudah ada di assets/images/ dan edit keterangan lengkapnya.');
  });
  $('reset-data').addEventListener('click', () => {
    if (!confirm('Kembalikan semua proyek ke versi portfolio-data.js yang sedang terpasang? Draft lokal akan hilang.')) return;
    items=JSON.parse(JSON.stringify(START));
    try{localStorage.removeItem(DRAFT_KEY);}catch(error){}
    $('category-filter').value='all'; $('visibility-filter').value='all'; $('search-project').value=''; render(); toast('Draft lokal dikembalikan ke data awal.');
  });
  $('export-data').addEventListener('click',exportFile);
  $('export-data-bottom').addEventListener('click',exportFile);
  $('category-filter').addEventListener('change',render);
  $('visibility-filter').addEventListener('change',render);
  $('search-project').addEventListener('input',render);
  populateCategories();render();
})();
