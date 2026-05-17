/* ============================================
   INFINITY SCRIPTS — script.js v3 (FIXED)
   Semua DOM refs di dalam fungsi, bukan global
   ============================================ */
'use strict';

// ===== STATE GLOBAL =====
let allScripts = [];
let filteredScripts = [];
let favorites = JSON.parse(localStorage.getItem('is_favorites') || '[]');
let currentCategory = 'all';
let searchQuery = '';
let currentBannerSlide = 0;
let bannerInterval;
let musicPlaying = false;

// ===== INIT SETELAH LOAD =====
window.addEventListener('load', () => {
  initSplashParticles();
  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initApp();
    }, 500);
  }, 2800);
});

function initApp() {
  initBgParticles();
  initNavigation();
  initBanner();
  initTheme();
  initSearch();
  initFab();
  initMusicPlayer();
  initFakeStats();
  animateLiveText();
  initModalListeners();
  initEventModalListeners();
  initAnimeModalListeners();
  loadScripts();
  loadEvents();
  initAnimeDayTabs();
  initAnimeViewToggle();
  animateSkillBars();
}

// ===== NAVIGATION =====
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      if (page === 'profile') animateSkillBars();
      if (page === 'anime') loadAnimeSchedule();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ===== LOAD SCRIPTS =====
async function loadScripts() {
  const scriptsGrid = document.getElementById('scripts-grid');
  const trendingGrid = document.getElementById('trending-grid');
  showSkeletons(scriptsGrid, 6);
  showSkeletons(trendingGrid, 3);
  try {
    const res = await fetch('scripts.json?v=' + Date.now());
    if (!res.ok) throw new Error('fail');
    allScripts = await res.json();
  } catch(e) {
    allScripts = [];
    showToast('Gagal memuat scripts.json', 'error');
  }
  const statTotal = document.getElementById('stat-total');
  if (statTotal) statTotal.textContent = allScripts.length;
  filteredScripts = [...allScripts];
  renderTrending();
  renderScripts();
  updateFavBadge();
}

// ===== RENDER TRENDING =====
function renderTrending() {
  const trendingGrid = document.getElementById('trending-grid');
  const trendingHeader = document.getElementById('trending-header');
  const trending = allScripts.filter(s => s.trending).slice(0, 6);
  trendingGrid.innerHTML = '';
  if (trending.length === 0) { trendingHeader.classList.add('hidden'); return; }
  trendingHeader.classList.remove('hidden');
  trending.forEach((s, i) => trendingGrid.appendChild(createCard(s, i)));
}

// ===== RENDER SCRIPTS =====
function renderScripts() {
  const scriptsGrid = document.getElementById('scripts-grid');
  const emptyState = document.getElementById('empty-state');
  let result = [...allScripts];
  if (currentCategory !== 'all') result = result.filter(s => s.kategori === currentCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(s =>
      s.nama.toLowerCase().includes(q) ||
      s.deskripsi.toLowerCase().includes(q) ||
      s.kategori.toLowerCase().includes(q)
    );
  }
  filteredScripts = result;
  scriptsGrid.innerHTML = '';
  if (result.length === 0) { emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden');
  result.forEach((s, i) => {
    const card = createCard(s, i);
    card.style.animationDelay = (i * 0.05) + 's';
    scriptsGrid.appendChild(card);
  });
}

// ===== CREATE CARD =====
function createCard(script, index) {
  const isFav = favorites.includes(script.id);
  const div = document.createElement('div');
  div.className = 'script-card';
  div.setAttribute('data-id', script.id);
  div.innerHTML = `
    <div class="card-thumb">
      <img src="${script.thumbnail}" alt="${escHtml(script.nama)}" loading="lazy"
        onerror="this.parentElement.innerHTML='<div class=\\'card-thumb-placeholder\\'><i class=\\'fa-brands fa-whatsapp\\'></i></div>'" />
      <div class="card-overlay"><span class="card-overlay-text">Lihat Detail →</span></div>
      <span class="card-status ${script.status.toLowerCase()}">${script.status}</span>
      <div class="card-badges">
        ${script.trending ? '<span class="badge-trending">🔥 HOT</span>' : ''}
        ${script.baru ? '<span class="badge-new">NEW</span>' : ''}
      </div>
    </div>
    <div class="card-body">
      <div class="card-cat">${script.kategori}</div>
      <div class="card-name">${escHtml(script.nama)}</div>
      <div class="card-desc">${escHtml(script.deskripsi)}</div>
      <div class="card-meta">
        <span class="rating"><i class="fa-solid fa-star"></i>${script.rating}</span>
        <span><i class="fa-solid fa-eye"></i>${formatViews(script.views)}</span>
      </div>
    </div>
    <button class="card-fav ${isFav ? 'active' : ''}" data-id="${script.id}" title="Favorite">
      <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
    </button>`;
  div.addEventListener('click', (e) => {
    if (e.target.closest('.card-fav')) return;
    openModal(script);
  });
  div.querySelector('.card-fav').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(script.id, div.querySelector('.card-fav'));
  });
  return div;
}

// ===== SCRIPT MODAL =====
function openModal(script) {
  const overlay  = document.getElementById('modal-overlay');
  const img      = document.getElementById('modal-img');
  const name     = document.getElementById('modal-name');
  const desc     = document.getElementById('modal-desc');
  const cat      = document.getElementById('modal-cat');
  const rating   = document.getElementById('modal-rating');
  const views    = document.getElementById('modal-views');
  const trend    = document.getElementById('modal-trend');
  const tIcon    = document.getElementById('modal-trend-icon');
  const sBadge   = document.getElementById('modal-status-badge');
  const nBadge   = document.getElementById('modal-new-badge');
  const link     = document.getElementById('modal-link');
  const ytBtn    = document.getElementById('modal-yt-btn');
  const favBtn   = document.getElementById('modal-fav-btn');

  if (!overlay) return;

  img.src = script.thumbnail;
  img.onerror = () => {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'%3E%3Crect fill='%230d0d1f' width='400' height='225'/%3E%3Ctext y='120' x='200' text-anchor='middle' font-size='60' fill='%2300d4ff'%3E📱%3C/text%3E%3C/svg%3E";
  };

  name.textContent    = script.nama;
  desc.textContent    = script.deskripsi;
  cat.textContent     = script.kategori;
  rating.textContent  = script.rating + ' ★';
  views.textContent   = formatViews(script.views) + ' views';
  trend.textContent   = script.trending ? 'Trending' : 'Normal';
  tIcon.style.color   = script.trending ? '#ff6b35' : 'var(--text3)';

  sBadge.textContent  = script.status;
  sBadge.className    = 'status-badge ' + script.status.toLowerCase();

  script.baru ? nBadge.classList.remove('hidden') : nBadge.classList.add('hidden');
  link.href = script.link || '#';

  if (script.linkyt && script.linkyt.trim() !== '') {
    ytBtn.href = script.linkyt;
    ytBtn.classList.remove('hidden');
  } else {
    ytBtn.classList.add('hidden');
  }

  const isFav = favorites.includes(script.id);
  favBtn.className = 'btn-fav-modal' + (isFav ? ' active' : '');
  favBtn.innerHTML  = `<i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>`;
  favBtn.onclick = () => {
    toggleFavorite(script.id, favBtn, true);
    const nowFav = favorites.includes(script.id);
    favBtn.className = 'btn-fav-modal' + (nowFav ? ' active' : '');
    favBtn.innerHTML = `<i class="fa-${nowFav ? 'solid' : 'regular'} fa-heart"></i>`;
  };

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  script.views = (script.views || 0) + 1;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function initModalListeners() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeEventModal(); closeAnimeModal(); } });
}

// ===== FAVORITES =====
function toggleFavorite(id, btn, skipRender = false) {
  const idx = favorites.indexOf(id);
  if (idx === -1) {
    favorites.push(id);
    btn.classList.add('active');
    btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    showToast('Ditambahkan ke favorit ❤️', 'success');
  } else {
    favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    showToast('Dihapus dari favorit', 'info');
  }
  localStorage.setItem('is_favorites', JSON.stringify(favorites));
  updateFavBadge();
  if (!skipRender) renderScripts();
}

function updateFavBadge() {
  const el = document.getElementById('fav-count');
  if (!el) return;
  if (favorites.length > 0) { el.textContent = favorites.length; el.classList.remove('hidden'); }
  else { el.classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const favBtnTop = document.getElementById('fav-btn');
  if (favBtnTop) favBtnTop.addEventListener('click', () => {
    if (favorites.length === 0) { showToast('Belum ada script favorit', 'info'); return; }
    currentCategory = 'all';
    document.getElementById('search-input').value = '';
    searchQuery = '';
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-cat="all"]').classList.add('active');
    const grid = document.getElementById('scripts-grid');
    grid.innerHTML = '';
    allScripts.filter(s => favorites.includes(s.id)).forEach((s,i) => grid.appendChild(createCard(s,i)));
    document.getElementById('trending-grid').innerHTML = '';
    document.getElementById('empty-state').classList.add('hidden');
    showToast(`${favorites.length} script favorit`, 'success');
    scrollToScripts();
  });
});

// ===== CATEGORIES =====
document.addEventListener('DOMContentLoaded', () => {
  const cats = document.getElementById('categories');
  if (cats) cats.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    document.getElementById('search-input').value = '';
    searchQuery = '';
    document.getElementById('clear-search').classList.add('hidden');
    renderScripts();
    renderTrending();
  });
});

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  renderScripts();
  scrollToScripts();
}
window.filterCategory = filterCategory;

// ===== SEARCH =====
function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('clear-search');
  if (!input) return;
  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clear.classList.toggle('hidden', !searchQuery);
    renderScripts();
  });
  clear.addEventListener('click', () => {
    input.value = ''; searchQuery = '';
    clear.classList.add('hidden');
    renderScripts(); input.focus();
  });
}

// ===== BANNER =====
function initBanner() {
  const slides = document.querySelectorAll('.banner-slide');
  const dotsEl = document.getElementById('banner-dots');
  if (!dotsEl) return;
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'banner-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goBanner(i));
    dotsEl.appendChild(dot);
  });
  bannerInterval = setInterval(() => goBanner((currentBannerSlide + 1) % slides.length), 4000);
}
function goBanner(idx) {
  const slides = document.querySelectorAll('.banner-slide');
  currentBannerSlide = idx;
  const track = document.getElementById('banner-track');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d,i) => d.classList.toggle('active', i === idx));
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('is_theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light-mode');
  updateThemeIcon();
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('is_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    updateThemeIcon();
    showToast(document.body.classList.contains('light-mode') ? '☀️ Light mode' : '🌙 Dark mode', 'info');
  });
}
function updateThemeIcon() {
  const icon = document.querySelector('#theme-toggle i');
  if (icon) icon.className = document.body.classList.contains('light-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ===== FAB =====
function initFab() {
  const fab = document.getElementById('fab');
  if (!fab) return;
  window.addEventListener('scroll', () => fab.classList.toggle('visible', window.scrollY > 200));
  fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== MUSIC PLAYER =====
function initMusicPlayer() {
  const btn  = document.getElementById('music-toggle');
  const disc = document.getElementById('music-disc');
  const wave = document.getElementById('music-wave');
  if (!btn) return;
  btn.addEventListener('click', () => {
    musicPlaying = !musicPlaying;
    btn.innerHTML = `<i class="fa-solid fa-${musicPlaying ? 'pause' : 'play'}"></i>`;
    disc.classList.toggle('spinning', musicPlaying);
    wave.classList.toggle('playing', musicPlaying);
    showToast(musicPlaying ? '🎵 Musik diputar' : '⏸ Musik dijeda', 'info');
  });
}

// ===== FAKE STATS =====
function initFakeStats() {
  const el = document.getElementById('visitor-count');
  if (!el) return;
  let v = Math.floor(Math.random() * 200) + 50;
  el.textContent = v;
  setInterval(() => {
    v += Math.floor(Math.random() * 5) - 2;
    if (v < 10) v = 10;
    el.textContent = v;
  }, 3000);
}

// ===== LIVE TEXT =====
const liveMessages = [
  '🔥 Infinity MD baru saja didownload oleh user dari Jakarta',
  '⚡ AI Assistant Bot trending hari ini dengan 500+ downloads',
  '💎 Panel Infinity mendapat update fitur baru!',
  '🎉 50.000 pengguna aktif telah bergabung',
  '📦 Script Tools Master baru ditambahkan ke koleksi',
  '🚀 Server online — semua script tersedia',
  '💡 Gunakan filter kategori untuk menemukan script lebih cepat',
  '⭐ Rating rata-rata script: 4.8/5.0',
];
let liveIdx = 0;
function animateLiveText() {
  const el = document.getElementById('live-text');
  if (!el) return;
  function update() {
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = liveMessages[liveIdx % liveMessages.length]; el.style.opacity = '1'; liveIdx++; }, 300);
  }
  update();
  setInterval(update, 5000);
}

// ===== SKILL BARS =====
function animateSkillBars() {
  setTimeout(() => {
    document.querySelectorAll('.skill-fill').forEach(b => { b.style.width = b.dataset.w + '%'; });
  }, 300);
}

// ===== SKELETON =====
function showSkeletons(container, count) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="script-card skeleton-card">
        <div class="card-thumb sk-thumb skeleton"></div>
        <div class="card-body">
          <div class="sk-line skeleton" style="margin-bottom:8px;height:8px;width:40%"></div>
          <div class="sk-line skeleton" style="margin-bottom:6px;height:12px"></div>
          <div class="sk-line skeleton short" style="height:8px"></div>
        </div>
      </div>`;
  }
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const icons = { success: 'circle-check', error: 'circle-xmark', info: 'circle-info' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-${icons[type]}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ===== UTILS =====
function formatViews(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
function scrollToScripts() {
  const el = document.getElementById('scripts-anchor');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}
window.scrollToScripts = scrollToScripts;
function escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===========================
// EVENT SYSTEM
// ===========================
let allEvents = [];
let currentEventType = 'all';
let eventSearchQuery = '';

async function loadEvents() {
  try {
    const res = await fetch('event.json?v=' + Date.now());
    if (!res.ok) throw new Error('fail');
    allEvents = await res.json();
  } catch(e) { allEvents = []; }
  renderEvents();
  updateEventNavBadge();
}

function updateEventNavBadge() {
  const badge = document.getElementById('event-nav-badge');
  if (!badge) return;
  const n = allEvents.filter(e => e.baru && e.aktif).length;
  if (n > 0) { badge.textContent = n; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }
}

function renderEvents() {
  const statEl  = document.getElementById('stat-event-total');
  const active  = allEvents.filter(e => e.aktif);
  if (statEl) statEl.textContent = active.length;

  let filtered = active;
  if (currentEventType !== 'all') filtered = filtered.filter(e => e.tipe === currentEventType);
  if (eventSearchQuery) {
    const q = eventSearchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.nama.toLowerCase().includes(q) ||
      e.deskripsi.toLowerCase().includes(q) ||
      e.tipe.toLowerCase().includes(q) ||
      (e.penyelenggara||'').toLowerCase().includes(q)
    );
  }

  const featuredWrap = document.getElementById('featured-event-wrap');
  const featured = filtered.filter(e => e.featured);
  if (featured.length > 0 && currentEventType === 'all' && !eventSearchQuery) {
    featuredWrap.innerHTML = renderFeaturedSection(featured);
    featuredWrap.querySelectorAll('.featured-event-card').forEach((card, i) => {
      card.addEventListener('click', () => openEventModal(featured[i]));
    });
  } else {
    featuredWrap.innerHTML = '';
  }

  const list    = document.getElementById('event-list');
  const emptyEl = document.getElementById('event-empty');
  const nonFeat = (currentEventType !== 'all' || eventSearchQuery) ? filtered : filtered.filter(e => !e.featured);
  list.innerHTML = '';
  if (nonFeat.length === 0 && featured.length === 0) { emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  nonFeat.forEach((ev, i) => list.appendChild(createEventCard(ev, i)));
}

function renderFeaturedSection(featured) {
  const cards = featured.map(ev => {
    const cls = `chip-${ev.tipe}`;
    const icon = getTypeIcon(ev.tipe);
    const thumb = ev.thumbnail
      ? `<img src="${ev.thumbnail}" alt="${escHtml(ev.nama)}" onerror="this.parentElement.innerHTML='<div class=\\'featured-thumb-placeholder\\'>${getTypeEmoji(ev.tipe)}</div>'">`
      : `<div class="featured-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
    const anggota  = ev.anggota ? `<span><i class="fa-solid fa-users"></i> ${ev.anggota}</span>` : '';
    const penyelng = ev.penyelenggara ? `<span><i class="fa-solid fa-user-tie"></i> ${ev.penyelenggara}</span>` : '';
    return `
      <div class="featured-event-card">
        <div class="featured-thumb">${thumb}<div class="featured-thumb-overlay"></div>${ev.baru?'<div class="new-chip">NEW</div>':''}<div class="feat-star-badge"><i class="fa-solid fa-star"></i> Featured</div></div>
        <div class="featured-inner">
          <div class="featured-type-chip ${cls}"><i class="${icon}"></i> ${ev.tipe}</div>
          <div class="featured-title">${escHtml(ev.nama)}</div>
          <div class="featured-desc">${escHtml(ev.deskripsi)}</div>
          <div class="featured-footer">
            <div class="featured-meta">${anggota}${penyelng}</div>
            <button class="featured-btn"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${ev.label_btn||'Buka'}</button>
          </div>
        </div>
      </div>`;
  }).join('');
  return `<div class="featured-event-section"><div class="featured-label"><i class="fa-solid fa-star"></i> Featured Event</div>${cards}</div>`;
}

function createEventCard(ev, index) {
  const div = document.createElement('div');
  div.className = 'event-card';
  div.style.animationDelay = (index * 0.06) + 's';
  const cls  = `chip-${ev.tipe}`;
  const icon = getTypeIcon(ev.tipe);
  const meta = ev.anggota || ev.penyelenggara || ev.tipe;
  const thumb = ev.thumbnail
    ? `<img src="${ev.thumbnail}" alt="${escHtml(ev.nama)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'event-card-thumb-placeholder\\'>${getTypeEmoji(ev.tipe)}</div>'">`
    : `<div class="event-card-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
  div.innerHTML = `
    <div class="event-card-thumb">${thumb}${ev.baru?'<div class="event-new-chip">NEW</div>':''}</div>
    <div class="event-card-body">
      <div>
        <div class="event-card-top">
          <div class="event-card-name">${escHtml(ev.nama)}</div>
          <span class="event-type-chip ${cls}"><i class="${icon}"></i> ${ev.tipe}</span>
        </div>
        <div class="event-card-desc">${escHtml(ev.deskripsi)}</div>
      </div>
      <div class="event-card-footer">
        <div class="event-card-meta"><i class="fa-solid fa-info-circle"></i> ${meta}</div>
        <button class="event-card-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${ev.label_btn||'Buka'}</button>
      </div>
    </div>`;
  div.addEventListener('click', (e) => {
    if (e.target.closest('.event-card-btn')) { window.open(ev.link, '_blank'); return; }
    openEventModal(ev);
  });
  div.querySelector('.event-card-btn').addEventListener('click', (e) => {
    e.stopPropagation(); window.open(ev.link, '_blank');
  });
  return div;
}

function openEventModal(ev) {
  const overlay = document.getElementById('event-modal-overlay');
  if (!overlay) return;
  const icon = getTypeIcon(ev.tipe);
  const cls  = `event-type-chip chip-${ev.tipe}`;

  const img = document.getElementById('ev-modal-img');
  img.src = ev.thumbnail || '';
  img.onerror = () => { img.parentElement.innerHTML = `<div style="height:200px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--bg3)">${getTypeEmoji(ev.tipe)}</div>`; };

  document.getElementById('ev-modal-name').textContent = ev.nama;
  document.getElementById('ev-modal-desc').textContent = ev.deskripsi;
  document.getElementById('ev-modal-link-text').textContent = ev.link;
  document.getElementById('ev-modal-link').href = ev.link;
  document.getElementById('ev-btn-label').textContent = ev.label_btn || 'Buka Link';

  const typeEl = document.getElementById('ev-modal-type');
  typeEl.className = cls; typeEl.innerHTML = `<i class="${icon}" style="margin-right:5px"></i>${ev.tipe}`;

  const fb = document.getElementById('ev-modal-featured-badge');
  ev.featured ? fb.classList.remove('hidden') : fb.classList.add('hidden');

  const penRow = document.getElementById('ev-modal-penyelenggara-row');
  const penEl  = document.getElementById('ev-modal-penyelenggara');
  if (ev.penyelenggara) { penEl.textContent = ev.penyelenggara; penRow.classList.remove('hidden'); }
  else { penRow.classList.add('hidden'); }

  const angRow = document.getElementById('ev-modal-anggota-row');
  const angEl  = document.getElementById('ev-modal-anggota');
  if (ev.anggota) { angEl.textContent = ev.anggota; angRow.classList.remove('hidden'); }
  else { angRow.classList.add('hidden'); }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeEventModal() {
  const overlay = document.getElementById('event-modal-overlay');
  if (overlay) { overlay.classList.add('hidden'); document.body.style.overflow = ''; }
}

function initEventModalListeners() {
  const close   = document.getElementById('event-modal-close');
  const overlay = document.getElementById('event-modal-overlay');
  if (close)   close.addEventListener('click', closeEventModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeEventModal(); });

  const tabs = document.getElementById('event-tabs');
  if (tabs) tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.event-tab');
    if (!btn) return;
    document.querySelectorAll('.event-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEventType = btn.dataset.type;
    renderEvents();
  });

  const esearch = document.getElementById('event-search-input');
  const eclear  = document.getElementById('event-clear-search');
  if (esearch) esearch.addEventListener('input', (e) => {
    eventSearchQuery = e.target.value.trim();
    eclear.classList.toggle('hidden', !eventSearchQuery);
    renderEvents();
  });
  if (eclear) eclear.addEventListener('click', () => {
    document.getElementById('event-search-input').value = '';
    eventSearchQuery = ''; eclear.classList.add('hidden'); renderEvents();
  });
}

function getTypeIcon(t) {
  return { Grup:'fa-brands fa-whatsapp', Channel:'fa-brands fa-telegram', Website:'fa-solid fa-globe', Promo:'fa-solid fa-tag', Lainnya:'fa-solid fa-star' }[t] || 'fa-solid fa-circle-info';
}
function getTypeEmoji(t) {
  return { Grup:'💬', Channel:'📢', Website:'🌐', Promo:'🏷️', Lainnya:'🎉' }[t] || '📌';
}

// ===========================
// ANIME SYSTEM v2 — AniList
// ===========================
const ANILIST_API  = 'https://graphql.anilist.co';
const HARI         = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const SEASON_MAP   = {0:'WINTER',1:'WINTER',2:'SPRING',3:'SPRING',4:'SPRING',5:'SUMMER',6:'SUMMER',7:'SUMMER',8:'FALL',9:'FALL',10:'FALL',11:'WINTER'};
const SEASON_LABEL = {WINTER:'❄️ Winter',SPRING:'🌸 Spring',SUMMER:'☀️ Summer',FALL:'🍂 Fall'};
const NEXT_SEASON  = {WINTER:'SPRING',SPRING:'SUMMER',SUMMER:'FALL',FALL:'WINTER'};

let animeWeekData     = {};
let animeUpcomingData = [];
let currentAnimeDay   = new Date().getDay();
let currentAnimeGenre = 'all';
let animeSearchQuery  = '';
let animeLoaded       = false;
let animeView         = 'schedule';
let countdownInterval = null;

const SCHEDULE_QUERY = `
query ($from: Int, $to: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
      id episode airingAt timeUntilAiring
      media {
        id title { romaji english native }
        description(asHtml: false)
        coverImage { large extraLarge medium }
        bannerImage genres averageScore popularity favourites episodes duration
        studios(isMain: true) { nodes { name } }
        format status season seasonYear siteUrl countryOfOrigin source
        streamingEpisodes { title thumbnail url site }
        tags { name rank isMediaSpoiler }
      }
    }
  }
}`;

const UPCOMING_QUERY = `
query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
      id title { romaji english native }
      description(asHtml: false)
      coverImage { large extraLarge medium }
      bannerImage genres averageScore popularity favourites episodes duration
      studios(isMain: true) { nodes { name } }
      format status season seasonYear startDate { year month day } siteUrl countryOfOrigin source
      airingSchedule(notYetAired: true, perPage: 1) { nodes { episode airingAt timeUntilAiring } }
      tags { name rank isMediaSpoiler }
    }
  }
}`;

async function fetchAllPages(query, baseVars, dataKey) {
  let page = 1, results = [], hasNext = true;
  while (hasNext && page <= 4) {
    try {
      const res  = await fetch(ANILIST_API, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({query, variables:{...baseVars, page}}) });
      const json = await res.json();
      const pg   = json?.data?.Page;
      if (!pg) break;
      results  = results.concat(pg[dataKey] || []);
      hasNext  = pg.pageInfo?.hasNextPage;
      page++;
    } catch(e) { break; }
  }
  return results;
}

function getStartOfWeek() {
  const now = new Date(); now.setHours(0,0,0,0);
  now.setDate(now.getDate() - now.getDay());
  return Math.floor(now.getTime() / 1000);
}

function getUpcomingTs(anime) {
  const n = anime?.airingSchedule?.nodes?.[0];
  if (n?.airingAt) return n.airingAt;
  const s = anime?.startDate;
  if (s?.year && s?.month && s?.day) return Math.floor(new Date(s.year, s.month-1, s.day).getTime()/1000);
  return 9999999999;
}

async function loadAnimeSchedule(force = false) {
  if (animeLoaded && !force) { renderAnimeView(); return; }
  showAnimeLoading(true); showAnimeError(false);
  document.getElementById('anime-grid').innerHTML = '';

  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const cur   = SEASON_MAP[month];
  const nxt   = NEXT_SEASON[cur];
  const nxtYr = cur === 'FALL' ? year + 1 : year;

  const lbl = document.getElementById('anime-season-label');
  if (lbl) lbl.innerHTML = `<i class="fa-solid fa-calendar"></i> ${SEASON_LABEL[cur]} ${year}`;

  try {
    const from = getStartOfWeek();
    const to   = from + 7 * 24 * 3600;

    const entries = await fetchAllPages(SCHEDULE_QUERY, {from, to}, 'airingSchedules');
    animeWeekData  = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
    entries.forEach(e => {
      if (!e.media) return;
      const d = new Date(e.airingAt * 1000).getDay();
      animeWeekData[d].push(e);
    });

    const upCur = await fetchAllPages(UPCOMING_QUERY, {season:cur, seasonYear:year}, 'media');
    const upNxt = await fetchAllPages(UPCOMING_QUERY, {season:nxt, seasonYear:nxtYr}, 'media');
    animeUpcomingData = [...upCur, ...upNxt]
      .filter((v,i,a) => a.findIndex(x => x.id === v.id) === i)
      .sort((a,b) => getUpcomingTs(a) - getUpcomingTs(b));

    animeLoaded = true;
    updateAnimeStats();
    showAnimeLoading(false);
    renderAnimeView();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdowns, 1000);
  } catch(e) {
    showAnimeLoading(false);
    showAnimeError(true);
  }
}

function updateAnimeStats() {
  const today = animeWeekData[currentAnimeDay] || [];
  const total = Object.values(animeWeekData).reduce((s,a) => s+a.length, 0);
  const e1 = document.getElementById('anime-count-day');
  const e2 = document.getElementById('anime-count-week');
  const e3 = document.getElementById('anime-count-upcoming');
  const e4 = document.getElementById('anime-next-time');
  const lu = document.getElementById('anime-last-update');
  if (e1) e1.textContent = today.length;
  if (e2) e2.textContent = total;
  if (e3) e3.textContent = animeUpcomingData.length;
  const now  = Math.floor(Date.now()/1000);
  const next = today.filter(e => e.airingAt > now).sort((a,b)=>a.airingAt-b.airingAt)[0];
  if (e4 && next) {
    const d = new Date(next.airingAt*1000);
    e4.textContent = d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  } else if (e4) { e4.textContent = '--:--'; }
  if (lu) { const t=new Date(); lu.textContent=t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0'); }
}

function renderAnimeView() {
  if (animeView === 'schedule') renderAnimeSchedule();
  else renderAnimeUpcoming();
}

function renderAnimeSchedule() {
  const grid  = document.getElementById('anime-grid');
  const empty = document.getElementById('anime-empty');
  if (!grid) return;

  let list = [...(animeWeekData[currentAnimeDay] || [])];
  if (currentAnimeGenre !== 'all') list = list.filter(e => e.media?.genres?.includes(currentAnimeGenre));
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(e => {
      const t = e.media?.title;
      return (t?.romaji||'').toLowerCase().includes(q) || (t?.english||'').toLowerCase().includes(q) || (t?.native||'').toLowerCase().includes(q);
    });
  }
  list.sort((a,b) => a.airingAt - b.airingAt);

  const e1 = document.getElementById('anime-count-day');
  if (e1) e1.textContent = list.length;
  const ttl = document.getElementById('anime-schedule-title');
  if (ttl) ttl.innerHTML = `<i class="fa-solid fa-calendar-day" style="color:#ff5c93"></i> ${HARI[currentAnimeDay]}`;

  grid.innerHTML = '';
  if (list.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const now = Math.floor(Date.now()/1000);
  list.forEach((e,i) => grid.appendChild(createAnimeScheduleCard(e,i,now)));
}

function renderAnimeUpcoming() {
  const grid  = document.getElementById('anime-grid');
  const empty = document.getElementById('anime-empty');
  if (!grid) return;

  let list = [...animeUpcomingData];
  if (currentAnimeGenre !== 'all') list = list.filter(a => a.genres?.includes(currentAnimeGenre));
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(a => (a.title?.romaji||'').toLowerCase().includes(q)||(a.title?.english||'').toLowerCase().includes(q)||(a.title?.native||'').toLowerCase().includes(q));
  }

  const ttl = document.getElementById('anime-schedule-title');
  if (ttl) ttl.innerHTML = `<i class="fa-solid fa-rocket" style="color:#ff5c93"></i> Segera Tayang`;

  grid.innerHTML = '';
  if (list.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const now = Math.floor(Date.now()/1000);
  list.forEach((a,i) => grid.appendChild(createAnimeUpcomingCard(a,i,now)));
}

function createAnimeScheduleCard(entry, index, now) {
  const anime = entry.media;
  if (!anime) return document.createElement('div');
  const div   = document.createElement('div');
  div.className = 'anime-card';
  div.style.animationDelay = (index * 0.04) + 's';
  const title  = anime.title.english || anime.title.romaji;
  const cover  = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score  = anime.averageScore ? (anime.averageScore/10).toFixed(1) : null;
  const genres = (anime.genres||[]).slice(0,2);
  const d      = new Date(entry.airingAt * 1000);
  const timeStr= d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  const diff   = entry.airingAt - now;
  const isLive = diff >= -1800 && diff <= 1800;
  const aired  = diff < -1800;
  const img = cover
    ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'anime-card-poster-placeholder\\'>🎌</div>'">`
    : `<div class="anime-card-poster-placeholder">🎌</div>`;
  const badge = isLive
    ? `<div class="anime-airing-badge"><div class="airing-pill"><span class="live-dot"></span>LIVE</div></div>`
    : aired
      ? `<div class="anime-aired-badge"><i class="fa-solid fa-check" style="color:var(--neon3);font-size:0.7rem;background:rgba(6,255,165,0.15);border:1px solid rgba(6,255,165,0.4);border-radius:20px;padding:2px 8px"></i></div>`
      : '';
  div.innerHTML = `
    <div class="anime-card-poster">
      ${img}<div class="anime-card-overlay"></div>
      ${score ? `<div class="anime-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      <div class="anime-card-ep-badge">EP ${entry.episode}</div>
      ${badge}
      <div class="anime-card-time ${aired?'aired':isLive?'live':''}"><i class="fa-solid fa-clock"></i>${timeStr}</div>
    </div>
    <div class="anime-card-body">
      <div class="anime-card-title">${escHtml(title)}</div>
      <div class="anime-card-genres">${genres.map(g=>`<span class="anime-card-genre-tag">${g}</span>`).join('')}</div>
      <div class="anime-card-countdown" data-airing="${entry.airingAt}">
        ${aired ? '<span class="aired-text">Sudah tayang</span>' : formatCountdown(Math.max(0,diff))}
      </div>
    </div>`;
  div.addEventListener('click', () => openAnimeModal(anime, entry));
  return div;
}

function createAnimeUpcomingCard(anime, index, now) {
  const div = document.createElement('div');
  div.className = 'anime-card anime-card-upcoming';
  div.style.animationDelay = (index * 0.04) + 's';
  const title  = anime.title.english || anime.title.romaji;
  const cover  = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score  = anime.averageScore ? (anime.averageScore/10).toFixed(1) : null;
  const genres = (anime.genres||[]).slice(0,2);
  const firstTs = anime?.airingSchedule?.nodes?.[0]?.airingAt;
  const sd = anime.startDate;
  let dateStr = 'TBA', cdStr = '';
  if (firstTs) {
    const d = new Date(firstTs*1000);
    dateStr = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
    const diff = firstTs - now;
    if (diff > 0) cdStr = formatCountdown(diff);
  } else if (sd?.year) { dateStr = `${sd.day||'??'}/${sd.month||'??'}/${sd.year}`; }
  const img = cover
    ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'anime-card-poster-placeholder\\'>🎌</div>'">`
    : `<div class="anime-card-poster-placeholder">🎌</div>`;
  div.innerHTML = `
    <div class="anime-card-poster">
      ${img}<div class="anime-card-overlay"></div>
      ${score ? `<div class="anime-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      <div class="anime-upcoming-tag"><i class="fa-solid fa-rocket"></i> Upcoming</div>
      <div class="anime-card-time upcoming-time"><i class="fa-solid fa-calendar"></i>${dateStr}</div>
    </div>
    <div class="anime-card-body">
      <div class="anime-card-title">${escHtml(title)}</div>
      <div class="anime-card-genres">${genres.map(g=>`<span class="anime-card-genre-tag">${g}</span>`).join('')}</div>
      <div class="anime-card-countdown upcoming-cd" data-airing="${firstTs||0}">
        ${cdStr || `<span style="color:var(--text3);font-size:0.6rem">${anime.season?SEASON_LABEL[anime.season]||anime.season:'TBA'} ${anime.seasonYear||''}</span>`}
      </div>
    </div>`;
  div.addEventListener('click', () => openAnimeModal(anime, null, true));
  return div;
}

function formatCountdown(seconds) {
  if (seconds <= 0) return '<span class="aired-text">Sudah tayang</span>';
  const d = Math.floor(seconds/86400), h = Math.floor((seconds%86400)/3600);
  const m = Math.floor((seconds%3600)/60), s = seconds%60;
  if (d > 0) return `<span class="cd-val">${d}<small>h</small> ${h}<small>j</small></span>`;
  if (h > 0) return `<span class="cd-val">${h}<small>j</small> ${m}<small>m</small></span>`;
  return `<span class="cd-val cd-hot">${m}<small>m</small> ${s}<small>d</small></span>`;
}

function updateCountdowns() {
  const now = Math.floor(Date.now()/1000);
  document.querySelectorAll('.anime-card-countdown').forEach(el => {
    const t = parseInt(el.dataset.airing);
    if (!t) return;
    const diff = t - now;
    el.innerHTML = diff < -1800 ? '<span class="aired-text">Sudah tayang</span>' : formatCountdown(Math.max(0,diff));
    const card = el.closest('.anime-card');
    if (!card) return;
    const tb = card.querySelector('.anime-card-time');
    if (tb) { tb.classList.toggle('live', diff>=-1800&&diff<=1800); tb.classList.toggle('aired',diff<-1800); }
  });
}

function openAnimeModal(anime, scheduleEntry = null, isUpcoming = false) {
  const overlay = document.getElementById('anime-modal-overlay');
  if (!overlay) return;

  const title       = anime.title?.english || anime.title?.romaji || '';
  const titleRomaji = anime.title?.romaji || '';
  const titleNative = anime.title?.native || '';
  const cover  = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || cover;
  const score  = anime.averageScore ? (anime.averageScore/10).toFixed(1) : 'N/A';
  const genres = anime.genres || [];
  const studio = anime.studios?.nodes?.[0]?.name || 'Unknown';
  const format = (anime.format||'TV').replace(/_/g,' ');
  const source = (anime.source||'N/A').replace(/_/g,' ');
  const country = anime.countryOfOrigin || 'JP';
  const statusMap = {RELEASING:'Sedang Tayang',FINISHED:'Selesai',NOT_YET_RELEASED:'Belum Tayang',CANCELLED:'Dibatalkan',HIATUS:'Hiatus'};
  const airStatus = statusMap[anime.status] || anime.status || 'N/A';

  const bEl = document.getElementById('am-banner');
  if (bEl) { bEl.src = banner; bEl.onerror = () => { bEl.src = cover; }; }
  const cEl = document.getElementById('am-cover');
  if (cEl) { cEl.src = cover; cEl.onerror = () => { cEl.style.opacity='0'; }; }

  const scoreB = document.getElementById('am-score');
  if (scoreB) scoreB.textContent = anime.averageScore ? `⭐ ${score}/10` : '';

  const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  setEl('am-title',       title);
  setEl('am-title-romaji', titleRomaji !== title ? titleRomaji : '');
  setEl('am-title-native', titleNative);
  setEl('am-format',      format);
  setEl('am-score2',      `${score}/10`);
  setEl('am-pop',         (anime.popularity||0).toLocaleString('id-ID'));
  setEl('am-fav',         (anime.favourites||0).toLocaleString('id-ID'));
  setEl('am-studio',      studio);
  setEl('am-source',      source);
  setEl('am-duration',    anime.duration ? `${anime.duration} menit` : 'N/A');
  setEl('am-season-info', anime.season ? `${SEASON_LABEL[anime.season]||anime.season} ${anime.seasonYear||''}` : 'N/A');
  setEl('am-country',     country);
  setEl('am-airstatus',   airStatus);

  // Airing time
  const now2 = Math.floor(Date.now()/1000);
  if (scheduleEntry) {
    const d = new Date(scheduleEntry.airingAt*1000);
    const diff = scheduleEntry.airingAt - now2;
    const dateStr = d.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const timeEl = document.getElementById('am-time');
    if (timeEl) timeEl.innerHTML = `${dateStr}<br><small style="color:#ff5c93">${diff>0?formatCountdown(diff):'Sudah tayang'}</small>`;
    setEl('am-ep', `Episode ${scheduleEntry.episode}`);
  } else if (isUpcoming) {
    const node = anime?.airingSchedule?.nodes?.[0];
    const sd   = anime?.startDate;
    const timeEl = document.getElementById('am-time');
    if (node && timeEl) {
      const d = new Date(node.airingAt*1000); const diff = node.airingAt - now2;
      timeEl.innerHTML = `${d.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}<br><small style="color:#ff5c93">${diff>0?formatCountdown(diff):'Segera'}</small>`;
    } else if (sd?.year && timeEl) { timeEl.textContent = `${sd.day||'??'}/${sd.month||'??'}/${sd.year}`; }
    else if (timeEl) { timeEl.textContent = 'TBA'; }
    setEl('am-ep', anime.episodes ? `${anime.episodes} EP` : 'TBA');
  } else {
    setEl('am-time', 'N/A'); setEl('am-ep', anime.episodes||'Ongoing');
  }

  // Genres
  const genEl = document.getElementById('am-genres');
  if (genEl) genEl.innerHTML = genres.slice(0,5).map(g=>`<span class="am-genre-chip">${g}</span>`).join('');

  // Tags
  const tags = (anime.tags||[]).filter(t=>!t.isMediaSpoiler).slice(0,10);
  const tagW = document.getElementById('am-tags-wrap');
  const tagL = document.getElementById('am-tags-list');
  if (tagW && tagL) {
    if (tags.length > 0) { tagW.classList.remove('hidden'); tagL.innerHTML = tags.map(t=>`<span class="am-tag-chip">${t.name}</span>`).join(''); }
    else { tagW.classList.add('hidden'); }
  }

  // Streaming
  const streams = (anime.streamingEpisodes||[]);
  const stW = document.getElementById('am-stream-wrap');
  const stL = document.getElementById('am-stream-list');
  if (stW && stL) {
    const sites = [...new Set(streams.map(s=>s.site))];
    if (sites.length > 0) {
      stW.classList.remove('hidden');
      stL.innerHTML = sites.map(site => { const ep = streams.find(s=>s.site===site); return `<a href="${ep?.url||'#'}" target="_blank" class="stream-btn">${site}</a>`; }).join('');
    } else { stW.classList.add('hidden'); }
  }

  // Description
  const rawDesc   = anime.description || 'Tidak ada deskripsi.';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g,'').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
  const descEl = document.getElementById('am-desc');
  const readBtn = document.getElementById('am-read-more');
  if (descEl) { descEl.textContent = cleanDesc; descEl.className = ''; }
  if (readBtn) {
    if (cleanDesc.length > 300) {
      readBtn.classList.remove('hidden'); readBtn.textContent = 'Baca selengkapnya ▼';
      readBtn.onclick = () => { const exp = descEl.classList.contains('expanded'); descEl.classList.toggle('expanded',!exp); readBtn.textContent = exp?'Baca selengkapnya ▼':'Tutup ▲'; };
    } else { readBtn.classList.add('hidden'); }
  }

  // AniList link
  const alLink = document.getElementById('am-anilist-link');
  if (alLink) alLink.href = anime.siteUrl || `https://anilist.co/anime/${anime.id}`;

  // Countdown in modal
  const modalCd = document.getElementById('am-modal-countdown');
  if (modalCd) {
    const target = scheduleEntry?.airingAt || anime?.airingSchedule?.nodes?.[0]?.airingAt;
    if (target) {
      modalCd.classList.remove('hidden');
      if (overlay.dataset.cdInt) clearInterval(parseInt(overlay.dataset.cdInt));
      function updateMCd() {
        const n = Math.floor(Date.now()/1000), diff = target - n;
        modalCd.innerHTML = diff > 0
          ? `<i class="fa-solid fa-clock" style="color:#ff5c93"></i> <span>${formatCountdown(diff)}</span>`
          : `<i class="fa-solid fa-check" style="color:var(--neon3)"></i> <span>Sudah tayang</span>`;
      }
      updateMCd();
      overlay.dataset.cdInt = setInterval(updateMCd, 1000);
    } else { modalCd.classList.add('hidden'); }
  }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAnimeModal() {
  const overlay = document.getElementById('anime-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  if (overlay.dataset.cdInt) { clearInterval(parseInt(overlay.dataset.cdInt)); delete overlay.dataset.cdInt; }
}

function initAnimeModalListeners() {
  const close   = document.getElementById('anime-modal-close');
  const overlay = document.getElementById('anime-modal-overlay');
  if (close)   close.addEventListener('click', closeAnimeModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAnimeModal(); });

  const retry = document.getElementById('anime-retry-btn');
  if (retry) retry.addEventListener('click', () => { animeLoaded = false; loadAnimeSchedule(true); });

  const asearch = document.getElementById('anime-search-input');
  const aclear  = document.getElementById('anime-clear-search');
  if (asearch) asearch.addEventListener('input', (e) => {
    animeSearchQuery = e.target.value.trim();
    if (aclear) aclear.classList.toggle('hidden', !animeSearchQuery);
    renderAnimeView();
  });
  if (aclear) aclear.addEventListener('click', () => {
    document.getElementById('anime-search-input').value = '';
    animeSearchQuery = ''; aclear.classList.add('hidden'); renderAnimeView();
  });

  const genreBar = document.getElementById('anime-genre-bar');
  if (genreBar) genreBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.anime-genre-btn');
    if (!btn) return;
    document.querySelectorAll('.anime-genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnimeGenre = btn.dataset.genre;
    renderAnimeView();
  });
}

function initAnimeViewToggle() {
  const btnS = document.getElementById('anime-btn-schedule');
  const btnU = document.getElementById('anime-btn-upcoming');
  const tabs = document.getElementById('anime-day-tabs');
  if (!btnS || !btnU) return;
  btnS.addEventListener('click', () => {
    animeView = 'schedule';
    btnS.classList.add('active'); btnU.classList.remove('active');
    if (tabs) tabs.classList.remove('hidden');
    renderAnimeView();
  });
  btnU.addEventListener('click', () => {
    animeView = 'upcoming';
    btnU.classList.add('active'); btnS.classList.remove('active');
    if (tabs) tabs.classList.add('hidden');
    renderAnimeView();
  });
}

function initAnimeDayTabs() {
  const tabs = document.getElementById('anime-day-tabs');
  if (!tabs) return;
  const today = new Date().getDay();
  tabs.querySelectorAll('.anime-day-tab').forEach(btn => {
    const d = parseInt(btn.dataset.day);
    btn.classList.toggle('today-tab', d === today);
    btn.classList.toggle('active', d === currentAnimeDay);
  });
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.anime-day-tab');
    if (!btn) return;
    tabs.querySelectorAll('.anime-day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnimeDay = parseInt(btn.dataset.day);
    updateAnimeStats();
    renderAnimeView();
  });
}

function showAnimeLoading(show) {
  const el = document.getElementById('anime-loading');
  if (el) el.classList.toggle('hidden', !show);
  if (show) {
    const g = document.getElementById('anime-grid'); if (g) g.innerHTML = '';
    const e = document.getElementById('anime-empty'); if (e) e.classList.add('hidden');
  }
}
function showAnimeError(show) {
  const el = document.getElementById('anime-error');
  if (el) el.classList.toggle('hidden', !show);
}

// ===========================
// PARTICLE SYSTEMS
// ===========================
function initSplashParticles() {
  const canvas = document.getElementById('splash-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = Array.from({length:80}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5,
    r:Math.random()*2+.5, a:Math.random(),
    color: Math.random()>.5?'#00d4ff':'#7c3aed'
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.globalAlpha=p.a*.6; ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>canvas.width) p.vx*=-1;
      if(p.y<0||p.y>canvas.height) p.vy*=-1;
    });
    ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  draw();
}

function initBgParticles() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  const particles = Array.from({length:50}, () => ({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2,
    r:Math.random()*1.5+.3, a:Math.random()*.4,
    color:['#00d4ff','#7c3aed','#06ffa5'][Math.floor(Math.random()*3)]
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach((p,i) => {
      particles.slice(i+1).forEach(p2 => {
        const dx=p.x-p2.x, dy=p.y-p2.y, dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120) {
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y);
          ctx.strokeStyle=`rgba(0,212,255,${.06*(1-dist/120)})`; ctx.lineWidth=.5; ctx.stroke();
        }
      });
    });
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.globalAlpha=p.a; ctx.fill(); ctx.globalAlpha=1;
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>canvas.width) p.vx*=-1;
      if(p.y<0||p.y>canvas.height) p.vy*=-1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}
