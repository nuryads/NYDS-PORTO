(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const raw = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  // Galeri publik menampilkan karya dengan visible !== false; draft tetap tersedia di editor.
  const publicWorks = raw.filter(item => item.visible !== false);
  const projects = [...publicWorks].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  const categories = Array.isArray(window.PORTFOLIO_CATEGORIES) ? window.PORTFOLIO_CATEGORIES : [];
  const catMap = new Map(categories.map(item => [item.id, item]));
  const grid = document.getElementById('project-grid');
  const filterBox = document.getElementById('gallery-filters');
  const search = document.getElementById('gallery-search');
  const sort = document.getElementById('gallery-sort');
  const counter = document.getElementById('gallery-counter');
  const empty = document.getElementById('empty-gallery');
  const state = {category: 'all', term: '', sort: 'curated', limit: 18, shown: [], current: null, imageIndex: 0, previousFocus: null};
  const loadMore = document.getElementById('gallery-load-more');

  const el = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };

  function renderFilters() {
    filterBox.replaceChildren();
    [{id: 'all', name: 'All projects'}, ...categories].forEach(category => {
      const count = category.id === 'all' ? projects.length : projects.filter(item => item.category === category.id).length;
      const button = el('button', 'filter-button' + (state.category === category.id ? ' active' : ''));
      button.type = 'button';
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(state.category === category.id));
      button.append(document.createTextNode(category.name));
      button.append(el('small', '', String(count)));
      button.addEventListener('click', () => {
        state.category = category.id;
        state.limit = 18;
        renderFilters();
        renderProjects();
      });
      filterBox.append(button);
    });
  }

  function makeCard(project) {
    const article = el('article', 'project-card');
    const button = el('button', 'project-card-button');
    button.type = 'button';
    button.setAttribute('aria-label', `Lihat detail proyek ${project.title}`);
    const frame = el('div', 'card-image');
    const image = el('img');
    const cover = project.images?.[0];
    image.src = cover?.thumb || cover?.src || '';
    image.alt = cover?.alt || project.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    frame.append(image);
    frame.append(el('span', 'card-cat', catMap.get(project.category)?.short || project.category));
    if (project.ai) frame.append(el('span','card-ai', '✦ AI-assisted'));
    frame.append(el('span', 'card-hover-arrow', '↗'));
    const info = el('div', 'card-info');
    const text = el('div');
    text.append(el('h3', '', project.title));
    text.append(el('p', '', project.subtitle));
    info.append(text, el('span', '', '↗'));
    button.append(frame, info);
    button.addEventListener('click', () => openModal(project));
    article.append(button);
    return article;
  }

  function getProjects() {
    const text = state.term.trim().toLowerCase();
    const found = projects.filter(item => {
      const matchesCategory = state.category === 'all' || item.category === state.category;
      const allText = [item.title, item.subtitle, item.description, ...(item.tags || []), catMap.get(item.category)?.name || ''].join(' ').toLowerCase();
      return matchesCategory && (!text || allText.includes(text));
    });
    if (state.sort === 'title') found.sort((a, b) => a.title.localeCompare(b.title, 'id'));
    if (state.sort === 'title-desc') found.sort((a, b) => b.title.localeCompare(a.title, 'id'));
    return found;
  }

  function renderProjects() {
    const filtered = getProjects();
    state.shown = filtered;
    const displayed = filtered.slice(0, state.limit);
    grid.replaceChildren(...displayed.map(makeCard));
    empty.hidden = filtered.length !== 0;
    grid.hidden = !filtered.length;
    loadMore.hidden = filtered.length <= state.limit;
    loadMore.textContent = `Tampilkan karya lainnya (${filtered.length - displayed.length} tersisa) ↓`;
    counter.textContent = `Menampilkan ${displayed.length} dari ${filtered.length} karya (${projects.length} publik)`;
    document.getElementById('work-count').textContent = String(projects.length);
  }

  search.addEventListener('input', e => { state.term = e.target.value; state.limit = 18; renderProjects(); });
  sort.addEventListener('change', e => { state.sort = e.target.value; state.limit = 18; renderProjects(); });
  loadMore.addEventListener('click', () => { state.limit += 18; renderProjects(); });
  document.getElementById('reset-gallery').addEventListener('click', () => {
    state.category = 'all'; state.term = ''; state.sort = 'curated'; state.limit = 18;
    search.value = ''; sort.value = 'curated'; renderFilters(); renderProjects();
  });

  const modal = document.getElementById('project-modal');
  const modalImg = document.getElementById('modal-image');
  const thumbnails = document.getElementById('modal-thumbnails');
  const prev = document.getElementById('modal-prev');
  const next = document.getElementById('modal-next');
  const closeButton = document.getElementById('modal-close');

  function setImage(index) {
    const images = state.current?.images || [];
    if (!images.length) return;
    state.imageIndex = (index + images.length) % images.length;
    const image = images[state.imageIndex];
    modalImg.src = image.src;
    document.getElementById('modal-open-image').href = image.src;
    modalImg.alt = image.alt || image.caption || state.current.title;
    document.getElementById('modal-image-index').textContent = `${String(state.imageIndex + 1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}`;
    thumbnails.replaceChildren(...images.map((pic, i) => {
      const button = el('button', i === state.imageIndex ? 'active' : '');
      button.type = 'button';
      button.setAttribute('aria-label', `Tampilkan gambar ${i + 1}: ${pic.caption || ''}`);
      button.setAttribute('aria-pressed', String(i === state.imageIndex));
      const im = el('img'); im.src = pic.thumb || pic.src; im.alt = pic.caption || `Gambar ${i+1}`;
      im.loading = 'lazy';
      button.append(im);
      button.addEventListener('click', () => setImage(i));
      return button;
    }));
    thumbnails.hidden = images.length <= 1;
    prev.hidden = images.length <= 1;
    next.hidden = images.length <= 1;
    document.getElementById('modal-image-index').hidden = images.length <= 1;
  }

  function openModal(project) {
    if (modal.hidden) state.previousFocus = document.activeElement;
    state.current = project;
    document.getElementById('modal-title').textContent = project.title;
    document.getElementById('modal-category').textContent = (catMap.get(project.category)?.name || project.category).toUpperCase();
    document.getElementById('modal-subtitle').textContent = project.subtitle;
    document.getElementById('modal-description').textContent = project.description;
    document.getElementById('modal-role').textContent = project.role;
    document.getElementById('modal-process').textContent = project.process;
    document.getElementById('modal-ai-note').hidden = !project.ai;
    const tools = document.getElementById('modal-tools');
    tools.replaceChildren(...(project.tools || []).map(tool => el('span', '', tool)));
    setImage(0);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-info').scrollTop = 0;
    modal.querySelector('.modal-content').scrollTop = 0;
    closeButton.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalImg.removeAttribute('src');
    state.current = null;
    if (state.previousFocus && typeof state.previousFocus.focus === 'function') state.previousFocus.focus();
  }

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target.dataset.closeModal === 'true') closeModal(); });
  prev.addEventListener('click', () => setImage(state.imageIndex - 1));
  next.addEventListener('click', () => setImage(state.imageIndex + 1));
  document.getElementById('modal-next-project').addEventListener('click', () => {
    const group = state.shown.length ? state.shown : projects;
    const currentIndex = group.findIndex(item => item.id === state.current?.id);
    openModal(group[(currentIndex + 1) % group.length]);
  });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') setImage(state.imageIndex + 1);
    if (e.key === 'ArrowLeft') setImage(state.imageIndex - 1);
    if (e.key === 'Tab') {
      const focusables = [...modal.querySelectorAll('button:not([hidden])')].filter(item => item.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Navigation mobile
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  function setMenu(open) {
    mobileNav.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  }
  menuBtn.addEventListener('click', () => setMenu(mobileNav.hidden));
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });

  // Entrance animation only when JS works; show everything to users who prefer less motion.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, {threshold: .12});
    reveals.forEach(node => observer.observe(node));
  } else {
    reveals.forEach(node => node.classList.add('visible'));
  }

  renderFilters();
  renderProjects();
})();
