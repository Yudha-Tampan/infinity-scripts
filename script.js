/* ============================================
   INFINITY SCRIPTS — script.js
   WhatsApp Bot Center Frontend
   ============================================ */

'use strict';

// ===== STATE =====
let allScripts = [];
let filteredScripts = [];
let favorites = JSON.parse(localStorage.getItem('is_favorites') || '[]');
let currentCategory = 'all';
let searchQuery = '';
let currentBannerSlide = 0;
let bannerInterval;
let musicPlaying = false;
let currentModal = null;

// ===== DOM REFS =====
const splash = document.getElementById('splash');
const app = document.getElementById('app');
const scriptsGrid = document.getElementById('scripts-grid');
const trendingGrid = document.getElementById('trending-grid');
const trendingHeader = document.getElementById('trending-header');
const searchInput = document.getElementById('search-input');
const clearSearch = document.getElementById('clear-search');
const emptyState = document.getElementById('empty-state');
const modalOverlay = document.getElementById('modal-overlay');
const modalBox = document.getElementById('modal-box');
const toastContainer = document.getElementById('toast-container');
const visitorCount = document.getElementById('visitor-count');
const liveText = document.getElementById('live-text');
const statTotal = document.getElementById('stat-total');
const favCount = document.getElementById('fav-count');
const fabBtn = document.getElementById('fab');

// ===== SPLASH + INIT =====
window.addEventListener('load', () => {
  initSplashParticles();
  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.classList.add('hidden');
      app.classList.remove('hidden');
      initApp();
    }, 500);
  }, 2800);
});

async function initApp() {
  initBgParticles();
  initNavigation();
  initBanner();
  initTheme();
  initSearch();
  initFab();
  initMusicPlayer();
  initFakeStats();
  animateLiveText();
  loadScripts();
  loadEvents();
  animateSkillBars();
}

// ===== LOAD SCRIPTS FROM JSON =====
async function loadScripts() {
  showSkeletons(scriptsGrid, 6);
  showSkeletons(trendingGrid, 3);

  try {
    const res = await fetch('scripts.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed to load');
    allScripts = await res.json();
  } catch (e) {
    allScripts = [];
    showToast('Gagal memuat scripts.json', 'error');
  }

  statTotal.textContent = allScripts.length;
  filteredScripts = [...allScripts];
  renderTrending();
  renderScripts();
  updateFavBadge();
}

// ===== RENDER TRENDING =====
function renderTrending() {
  const trending = allScripts.filter(s => s.trending).slice(0, 6);
  trendingGrid.innerHTML = '';
  if (trending.length === 0) {
    trendingHeader.classList.add('hidden');
    return;
  }
  trendingHeader.classList.remove('hidden');
  trending.forEach((s, i) => {
    const card = createCard(s, i);
    trendingGrid.appendChild(card);
  });
}

// ===== RENDER SCRIPTS =====
function renderScripts() {
  scriptsGrid.innerHTML = '';

  let result = allScripts;
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

  if (result.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
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

  const thumbContent = `
    <img src="${script.thumbnail}"
      alt="${script.nama}"
      loading="lazy"
      onerror="this.parentElement.innerHTML='<div class=\\'card-thumb-placeholder\\'><i class=\\'fa-brands fa-whatsapp\\'></i></div>'"
    />
    <div class="card-overlay"><span class="card-overlay-text">Lihat Detail →</span></div>
    <span class="card-status ${script.status.toLowerCase()}">${script.status}</span>
    <div class="card-badges">
      ${script.trending ? '<span class="badge-trending">🔥 HOT</span>' : ''}
      ${script.baru ? '<span class="badge-new">NEW</span>' : ''}
    </div>
  `;

  div.innerHTML = `
    <div class="card-thumb">${thumbContent}</div>
    <div class="card-body">
      <div class="card-cat">${script.kategori}</div>
      <div class="card-name">${script.nama}</div>
      <div class="card-desc">${script.deskripsi}</div>
      <div class="card-meta">
        <span class="rating"><i class="fa-solid fa-star"></i>${script.rating}</span>
        <span><i class="fa-solid fa-eye"></i>${formatViews(script.views)}</span>
      </div>
    </div>
    <button class="card-fav ${isFav ? 'active' : ''}" data-id="${script.id}" title="Favorite">
      <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
    </button>
  `;

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

// ===== MODAL =====
function openModal(script) {
  currentModal = script;
  const isFav = favorites.includes(script.id);

  document.getElementById('modal-img').src = script.thumbnail;
  document.getElementById('modal-img').onerror = () => {
    document.getElementById('modal-img').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'%3E%3Crect fill='%230d0d1f' width='400' height='225'/%3E%3Ctext y='120' x='200' text-anchor='middle' font-size='60' fill='%2300d4ff'%3E📱%3C/text%3E%3C/svg%3E";
  };
  document.getElementById('modal-name').textContent = script.nama;
  document.getElementById('modal-desc').textContent = script.deskripsi;
  document.getElementById('modal-cat').textContent = script.kategori;
  document.getElementById('modal-rating').textContent = script.rating + ' ★';
  document.getElementById('modal-views').textContent = formatViews(script.views) + ' views';
  document.getElementById('modal-trend').textContent = script.trending ? 'Trending' : 'Normal';
  document.getElementById('modal-trend-icon').style.color = script.trending ? '#ff6b35' : 'var(--text3)';

  const statusBadge = document.getElementById('modal-status-badge');
  statusBadge.textContent = script.status;
  statusBadge.className = 'status-badge ' + script.status.toLowerCase();

  const newBadge = document.getElementById('modal-new-badge');
  script.baru ? newBadge.classList.remove('hidden') : newBadge.classList.add('hidden');

  document.getElementById('modal-link').href = script.link;

  const favBtn = document.getElementById('modal-fav-btn');
  favBtn.className = 'btn-fav-modal' + (isFav ? ' active' : '');
  favBtn.innerHTML = `<i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>`;
  favBtn.onclick = () => {
    toggleFavorite(script.id, favBtn, true);
    const newFav = favorites.includes(script.id);
    favBtn.className = 'btn-fav-modal' + (newFav ? ' active' : '');
    favBtn.innerHTML = `<i class="fa-${newFav ? 'solid' : 'regular'} fa-heart"></i>`;
  };

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // bump views
  script.views = (script.views || 0) + 1;
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  currentModal = null;
}

document.getElementById('modal-close').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

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
  const count = favorites.length;
  if (count > 0) {
    favCount.textContent = count;
    favCount.classList.remove('hidden');
  } else {
    favCount.classList.add('hidden');
  }
}

document.getElementById('fav-btn').addEventListener('click', () => {
  if (favorites.length === 0) {
    showToast('Belum ada script favorit', 'info');
    return;
  }
  // Filter ke favorit
  currentCategory = 'all';
  searchInput.value = '';
  searchQuery = '';
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-cat="all"]').classList.add('active');
  filteredScripts = allScripts.filter(s => favorites.includes(s.id));
  scriptsGrid.innerHTML = '';
  filteredScripts.forEach((s, i) => {
    const card = createCard(s, i);
    scriptsGrid.appendChild(card);
  });
  trendingGrid.innerHTML = '';
  emptyState.classList.add('hidden');
  showToast(`${favorites.length} script favorit`, 'success');
  scrollToScripts();
});

// ===== CATEGORIES =====
document.getElementById('categories').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCategory = btn.dataset.cat;
  searchInput.value = '';
  searchQuery = '';
  clearSearch.classList.add('hidden');
  renderScripts();
  renderTrending();
});

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderScripts();
  scrollToScripts();
}
window.filterCategory = filterCategory;

// ===== SEARCH =====
function initSearch() {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    clearSearch.classList.toggle('hidden', !searchQuery);
    renderScripts();
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearch.classList.add('hidden');
    renderScripts();
    searchInput.focus();
  });
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
      if (page === 'anime') { initAnimeDayTabs(); loadAnimeSchedule(); }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ===== BANNER SLIDER =====
function initBanner() {
  const slides = document.querySelectorAll('.banner-slide');
  const dotsContainer = document.getElementById('banner-dots');
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'banner-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goBanner(i));
    dotsContainer.appendChild(dot);
  });
  bannerInterval = setInterval(() => goBanner((currentBannerSlide + 1) % slides.length), 4000);
}

function goBanner(idx) {
  const slides = document.querySelectorAll('.banner-slide');
  currentBannerSlide = idx;
  document.getElementById('banner-track').style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('is_theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light-mode');
  updateThemeIcon();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('is_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    updateThemeIcon();
    showToast(document.body.classList.contains('light-mode') ? '☀️ Light mode' : '🌙 Dark mode', 'info');
  });
}
function updateThemeIcon() {
  const icon = document.querySelector('#theme-toggle i');
  icon.className = document.body.classList.contains('light-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ===== FAB =====
function initFab() {
  window.addEventListener('scroll', () => {
    fabBtn.classList.toggle('visible', window.scrollY > 200);
  });
  fabBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== MUSIC PLAYER =====
function initMusicPlayer() {
  const musicToggle = document.getElementById('music-toggle');
  const musicDisc = document.getElementById('music-disc');
  const musicWave = document.getElementById('music-wave');

  musicToggle.addEventListener('click', () => {
    musicPlaying = !musicPlaying;
    musicToggle.innerHTML = `<i class="fa-solid fa-${musicPlaying ? 'pause' : 'play'}"></i>`;
    musicDisc.classList.toggle('spinning', musicPlaying);
    musicWave.classList.toggle('playing', musicPlaying);
    showToast(musicPlaying ? '🎵 Musik diputar' : '⏸ Musik dijeda', 'info');
  });
}

// ===== FAKE STATS =====
function initFakeStats() {
  // Visitor counter
  let visitors = Math.floor(Math.random() * 200) + 50;
  visitorCount.textContent = visitors;
  setInterval(() => {
    visitors += Math.floor(Math.random() * 5) - 2;
    if (visitors < 10) visitors = 10;
    visitorCount.textContent = visitors;
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
  '💡 Tips: Gunakan filter kategori untuk menemukan script lebih cepat',
  '⭐ Rating rata-rata script: 4.8/5.0',
];
let liveIdx = 0;
function animateLiveText() {
  liveText.style.opacity = '0';
  setTimeout(() => {
    liveText.textContent = liveMessages[liveIdx % liveMessages.length];
    liveText.style.opacity = '1';
    liveIdx++;
  }, 300);
  setInterval(() => {
    liveText.style.opacity = '0';
    setTimeout(() => {
      liveText.textContent = liveMessages[liveIdx % liveMessages.length];
      liveText.style.opacity = '1';
      liveIdx++;
    }, 300);
  }, 5000);
}

// ===== SKILL BARS =====
function animateSkillBars() {
  setTimeout(() => {
    document.querySelectorAll('.skill-fill').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  }, 300);
}

// ===== SKELETON LOADING =====
function showSkeletons(container, count) {
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
      </div>
    `;
  }
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const icons = { success: 'circle-check', error: 'circle-xmark', info: 'circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-${icons[type]}"></i><span>${msg}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
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
  document.getElementById('scripts-anchor').scrollIntoView({ behavior: 'smooth' });
}
window.scrollToScripts = scrollToScripts;

// ===== PARTICLE SYSTEMS =====
function initSplashParticles() {
  const canvas = document.getElementById('splash-particles');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    r: Math.random() * 2 + 0.5,
    a: Math.random(),
    color: Math.random() > 0.5 ? '#00d4ff' : '#7c3aed',
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.a * 0.6;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ===== EVENT SYSTEM =====
let allEvents = [];
let currentEventType = 'all';
let eventSearchQuery = '';

async function loadEvents() {
  try {
    const res = await fetch('event.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed');
    allEvents = await res.json();
  } catch (e) {
    allEvents = [];
  }
  renderEvents();
  updateEventNavBadge();
}

function updateEventNavBadge() {
  const badge = document.getElementById('event-nav-badge');
  const newCount = allEvents.filter(e => e.baru && e.aktif).length;
  if (newCount > 0) {
    badge.textContent = newCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderEvents() {
  const statEl = document.getElementById('stat-event-total');
  const activeEvents = allEvents.filter(e => e.aktif);
  if (statEl) statEl.textContent = activeEvents.length;

  let filtered = activeEvents;
  if (currentEventType !== 'all') filtered = filtered.filter(e => e.tipe === currentEventType);
  if (eventSearchQuery) {
    const q = eventSearchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.nama.toLowerCase().includes(q) ||
      e.deskripsi.toLowerCase().includes(q) ||
      e.tipe.toLowerCase().includes(q) ||
      (e.penyelenggara || '').toLowerCase().includes(q)
    );
  }

  // Featured
  const featuredWrap = document.getElementById('featured-event-wrap');
  const featured = filtered.filter(e => e.featured);
  if (featured.length > 0 && currentEventType === 'all' && !eventSearchQuery) {
    featuredWrap.innerHTML = renderFeaturedSlider(featured);
    featuredWrap.querySelectorAll('.featured-event-card').forEach((card, i) => {
      card.addEventListener('click', () => openEventModal(featured[i]));
    });
  } else {
    featuredWrap.innerHTML = '';
  }

  // List
  const list = document.getElementById('event-list');
  const emptyEl = document.getElementById('event-empty');
  const nonFeatured = (currentEventType !== 'all' || eventSearchQuery) ? filtered : filtered.filter(e => !e.featured);

  list.innerHTML = '';
  if (nonFeatured.length === 0 && featured.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  nonFeatured.forEach((ev, i) => {
    const card = createEventCard(ev, i);
    list.appendChild(card);
  });
}

function renderFeaturedSlider(featured) {
  const cards = featured.map(ev => {
    const typeClass = `chip-${ev.tipe}`;
    const typeIcon = getTypeIcon(ev.tipe);
    const thumbContent = ev.thumbnail
      ? `<img src="${ev.thumbnail}" alt="${ev.nama}" onerror="this.parentElement.innerHTML='<div class=\\'featured-thumb-placeholder\\'>${getTypeEmoji(ev.tipe)}</div>'">`
      : `<div class="featured-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
    const anggotaHTML = ev.anggota ? `<span><i class="fa-solid fa-users"></i> ${ev.anggota}</span>` : '';
    const penHTML = ev.penyelenggara ? `<span><i class="fa-solid fa-user-tie"></i> ${ev.penyelenggara}</span>` : '';
    return `
      <div class="featured-event-card">
        <div class="featured-thumb">
          ${thumbContent}
          <div class="featured-thumb-overlay"></div>
          ${ev.baru ? '<div class="new-chip">NEW</div>' : ''}
          <div class="feat-star-badge"><i class="fa-solid fa-star"></i> Featured</div>
        </div>
        <div class="featured-inner">
          <div class="featured-type-chip ${typeClass}"><i class="${typeIcon}"></i> ${ev.tipe}</div>
          <div class="featured-title">${ev.nama}</div>
          <div class="featured-desc">${ev.deskripsi}</div>
          <div class="featured-footer">
            <div class="featured-meta">${anggotaHTML}${penHTML}</div>
            <button class="featured-btn"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${ev.label_btn || 'Buka'}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="featured-event-section">
      <div class="featured-label"><i class="fa-solid fa-star"></i> Featured Event</div>
      ${cards}
    </div>
  `;
}

function createEventCard(ev, index) {
  const div = document.createElement('div');
  div.className = 'event-card';
  div.style.animationDelay = (index * 0.06) + 's';
  const typeClass = `chip-${ev.tipe}`;
  const typeIcon = getTypeIcon(ev.tipe);
  const thumbContent = ev.thumbnail
    ? `<img src="${ev.thumbnail}" alt="${ev.nama}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'event-card-thumb-placeholder\\'>${getTypeEmoji(ev.tipe)}</div>'">`
    : `<div class="event-card-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
  const metaText = ev.anggota || ev.penyelenggara || ev.tipe;

  div.innerHTML = `
    <div class="event-card-thumb">
      ${thumbContent}
      ${ev.baru ? '<div class="event-new-chip">NEW</div>' : ''}
    </div>
    <div class="event-card-body">
      <div>
        <div class="event-card-top">
          <div class="event-card-name">${ev.nama}</div>
          <span class="event-type-chip ${typeClass}"><i class="${typeIcon}"></i> ${ev.tipe}</span>
        </div>
        <div class="event-card-desc">${ev.deskripsi}</div>
      </div>
      <div class="event-card-footer">
        <div class="event-card-meta"><i class="fa-solid fa-info-circle"></i> ${metaText}</div>
        <button class="event-card-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${ev.label_btn || 'Buka'}</button>
      </div>
    </div>
  `;

  div.addEventListener('click', (e) => {
    if (e.target.closest('.event-card-btn')) {
      e.stopPropagation();
      window.open(ev.link, '_blank');
      return;
    }
    openEventModal(ev);
  });

  div.querySelector('.event-card-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(ev.link, '_blank');
  });

  return div;
}

function openEventModal(ev) {
  const overlay = document.getElementById('event-modal-overlay');
  const typeClass = `chip-${ev.tipe}`;
  const typeIcon = getTypeIcon(ev.tipe);

  const img = document.getElementById('ev-modal-img');
  img.src = ev.thumbnail || '';
  img.onerror = () => {
    img.parentElement.innerHTML = `<div class="featured-thumb-placeholder" style="height:200px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--bg3)">${getTypeEmoji(ev.tipe)}</div>`;
  };

  document.getElementById('ev-modal-name').textContent = ev.nama;
  document.getElementById('ev-modal-desc').textContent = ev.deskripsi;
  document.getElementById('ev-modal-link-text').textContent = ev.link;
  document.getElementById('ev-modal-link').href = ev.link;
  document.getElementById('ev-btn-label').textContent = ev.label_btn || 'Buka Link';

  const typeEl = document.getElementById('ev-modal-type');
  typeEl.textContent = ev.tipe;
  typeEl.className = `event-modal-type-badge event-type-chip ${typeClass}`;
  typeEl.innerHTML = `<i class="${typeIcon}" style="margin-right:5px"></i>${ev.tipe}`;

  const featBadge = document.getElementById('ev-modal-featured-badge');
  ev.featured ? featBadge.classList.remove('hidden') : featBadge.classList.add('hidden');

  const penRow = document.getElementById('ev-modal-penyelenggara-row');
  const penEl = document.getElementById('ev-modal-penyelenggara');
  if (ev.penyelenggara) {
    penEl.textContent = ev.penyelenggara;
    penRow.classList.remove('hidden');
  } else {
    penRow.classList.add('hidden');
  }

  const angRow = document.getElementById('ev-modal-anggota-row');
  const angEl = document.getElementById('ev-modal-anggota');
  if (ev.anggota) {
    angEl.textContent = ev.anggota;
    angRow.classList.remove('hidden');
  } else {
    angRow.classList.add('hidden');
  }

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeEventModal() {
  document.getElementById('event-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('event-modal-close').addEventListener('click', closeEventModal);
document.getElementById('event-modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('event-modal-overlay')) closeEventModal();
});

// Event Tabs
document.getElementById('event-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.event-tab');
  if (!btn) return;
  document.querySelectorAll('.event-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentEventType = btn.dataset.type;
  renderEvents();
});

// Event Search
document.getElementById('event-search-input').addEventListener('input', (e) => {
  eventSearchQuery = e.target.value.trim();
  const clearBtn = document.getElementById('event-clear-search');
  clearBtn.classList.toggle('hidden', !eventSearchQuery);
  renderEvents();
});
document.getElementById('event-clear-search').addEventListener('click', () => {
  document.getElementById('event-search-input').value = '';
  eventSearchQuery = '';
  document.getElementById('event-clear-search').classList.add('hidden');
  renderEvents();
});

// Helpers
function getTypeIcon(tipe) {
  const map = {
    'Grup': 'fa-brands fa-whatsapp',
    'Channel': 'fa-brands fa-telegram',
    'Website': 'fa-solid fa-globe',
    'Promo': 'fa-solid fa-tag',
    'Lainnya': 'fa-solid fa-star',
  };
  return map[tipe] || 'fa-solid fa-circle-info';
}
function getTypeEmoji(tipe) {
  const map = { 'Grup': '💬', 'Channel': '📢', 'Website': '🌐', 'Promo': '🏷️', 'Lainnya': '🎉' };
  return map[tipe] || '📌';
}

// ===== PARTICLES =====

function initBgParticles() {
  const canvas = document.getElementById('bg-particles');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random() * 0.4,
    color: ['#00d4ff', '#7c3aed', '#06ffa5'][Math.floor(Math.random() * 3)],
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw lines between close particles
    particles.forEach((p, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p.x - p2.x, dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.a;
      ctx.fill();
      ctx.globalAlpha = 1;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ===================================================
// ANIME SYSTEM — AniList GraphQL API
// ===================================================

let animeScheduleData = {};   // { 0:[...], 1:[...], ..., 6:[...] }
let currentAnimeDay = new Date().getDay();
let currentAnimeGenre = 'all';
let animeSearchQuery = '';
let animeLoaded = false;

const ANILIST_API = 'https://graphql.anilist.co';

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const SEASON_MAP = { 0:'WINTER', 1:'WINTER', 2:'SPRING', 3:'SPRING', 4:'SPRING',
                     5:'SUMMER', 6:'SUMMER', 7:'SUMMER', 8:'FALL', 9:'FALL',
                     10:'FALL', 11:'WINTER' };
const SEASON_LABEL = { WINTER:'❄️ Winter', SPRING:'🌸 Spring', SUMMER:'☀️ Summer', FALL:'🍂 Fall' };

// -- Query AniList --
const AIRING_QUERY = `
query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    airingSchedules: media(
      season: $season
      seasonYear: $seasonYear
      type: ANIME
      status: RELEASING
      sort: POPULARITY_DESC
    ) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large extraLarge }
      bannerImage
      genres
      averageScore
      popularity
      favourites
      episodes
      nextAiringEpisode { episode airingAt timeUntilAiring }
      airingSchedule(notYetAired: false, perPage: 1) {
        nodes { episode airingAt }
      }
      studios(isMain: true) { nodes { name } }
      format
      siteUrl
    }
  }
}`;

async function loadAnimeSchedule(forceReload = false) {
  if (animeLoaded && !forceReload) { renderAnimeDay(); return; }

  showAnimeLoading(true);
  showAnimeError(false);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const season = SEASON_MAP[month];
  const seasonYear = (month === 11) ? year : year;

  // Update season label
  const label = document.getElementById('anime-season-label');
  if (label) label.innerHTML = `<i class="fa-solid fa-sun"></i> ${SEASON_LABEL[season]} ${seasonYear}`;

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: AIRING_QUERY,
        variables: { page: 1, perPage: 50, season, seasonYear }
      })
    });
    const json = await res.json();
    const list = json?.data?.Page?.airingSchedules || [];

    // Distribusi ke hari berdasarkan nextAiringEpisode.airingAt atau popular
    animeScheduleData = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };

    list.forEach(anime => {
      const airingAt = anime?.nextAiringEpisode?.airingAt
        || anime?.airingSchedule?.nodes?.[0]?.airingAt;
      let day;
      if (airingAt) {
        day = new Date(airingAt * 1000).getDay();
      } else {
        // fallback: distribusi merata pakai id
        day = anime.id % 7;
      }
      animeScheduleData[day].push(anime);
    });

    // Sort tiap hari by popularity
    for (let d = 0; d < 7; d++) {
      animeScheduleData[d].sort((a,b) => (b.popularity||0) - (a.popularity||0));
    }

    animeLoaded = true;

    // Update stats
    const totalWeek = list.length;
    const todayCount = animeScheduleData[currentAnimeDay]?.length || 0;
    const el = document.getElementById('anime-count-week');
    const el2 = document.getElementById('anime-count-day');
    if (el) el.textContent = totalWeek;
    if (el2) el2.textContent = todayCount;

    // Last update time
    const lu = document.getElementById('anime-last-update');
    if (lu) {
      const t = new Date();
      lu.textContent = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
    }

    // Next airing time
    updateNextAiringTime();

    showAnimeLoading(false);
    renderAnimeDay();

  } catch(e) {
    showAnimeLoading(false);
    showAnimeError(true);
    showToast('Gagal memuat jadwal anime', 'error');
  }
}

function updateNextAiringTime() {
  const todayList = animeScheduleData[currentAnimeDay] || [];
  const now = Math.floor(Date.now() / 1000);
  let soonest = null;
  todayList.forEach(a => {
    const t = a?.nextAiringEpisode?.airingAt;
    if (t && t > now) {
      if (!soonest || t < soonest) soonest = t;
    }
  });
  const el = document.getElementById('anime-next-time');
  if (el && soonest) {
    const d = new Date(soonest * 1000);
    el.textContent = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }
}

// -- Render per hari --
function renderAnimeDay() {
  const grid = document.getElementById('anime-grid');
  const empty = document.getElementById('anime-empty');
  if (!grid) return;

  let list = animeScheduleData[currentAnimeDay] || [];

  // Genre filter
  if (currentAnimeGenre !== 'all') {
    list = list.filter(a => a.genres && a.genres.includes(currentAnimeGenre));
  }

  // Search
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(a => {
      const t = a.title;
      return (t.romaji||'').toLowerCase().includes(q) ||
             (t.english||'').toLowerCase().includes(q) ||
             (t.native||'').toLowerCase().includes(q);
    });
  }

  // Update stat
  document.getElementById('anime-count-day').textContent = list.length;

  // Schedule title
  const titleEl = document.getElementById('anime-schedule-title');
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-calendar-day" style="color:#ff5c93"></i> ${HARI[currentAnimeDay]}`;
  }

  // Upcoming banner — ambil yg paling cepat tayang hari ini
  renderUpcomingBanner(animeScheduleData[currentAnimeDay] || []);

  grid.innerHTML = '';
  if (list.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.forEach((anime, i) => {
    const card = createAnimeCard(anime, i);
    grid.appendChild(card);
  });
}

// -- Upcoming banner --
function renderUpcomingBanner(list) {
  const wrap = document.getElementById('anime-upcoming-wrap');
  if (!wrap) return;

  const now = Math.floor(Date.now() / 1000);
  const upcoming = list
    .filter(a => a?.nextAiringEpisode?.airingAt && a.nextAiringEpisode.airingAt > now)
    .sort((a,b) => a.nextAiringEpisode.airingAt - b.nextAiringEpisode.airingAt)[0];

  if (!upcoming) { wrap.innerHTML = ''; return; }

  const tLeft = upcoming.nextAiringEpisode.timeUntilAiring || 0;
  const h = Math.floor(tLeft / 3600);
  const m = Math.floor((tLeft % 3600) / 60);
  const countdownText = h > 0 ? `${h}j ${m}m lagi` : `${m} menit lagi`;

  const title = upcoming.title.english || upcoming.title.romaji;
  const banner = upcoming.bannerImage || upcoming.coverImage?.extraLarge || upcoming.coverImage?.large || '';
  const ep = upcoming.nextAiringEpisode.episode;
  const genres = (upcoming.genres || []).slice(0,3).join(' • ');

  wrap.innerHTML = `
    <div class="anime-upcoming-section">
      <div class="anime-upcoming-label"><i class="fa-solid fa-bell"></i> Segera Tayang</div>
      <div class="anime-upcoming-card" id="upcoming-card-click">
        <div class="anime-upcoming-thumb">
          <img src="${banner}" alt="${title}" onerror="this.src='${upcoming.coverImage?.large||''}'" />
          <div class="anime-upcoming-thumb-overlay"></div>
        </div>
        <div class="anime-upcoming-inner">
          <div class="anime-upcoming-countdown"><i class="fa-solid fa-clock"></i> ${countdownText}</div>
          <div class="anime-upcoming-title">${title}</div>
          <div class="anime-upcoming-meta">
            <span><i class="fa-solid fa-film"></i> Episode ${ep}</span>
            ${genres ? `<span><i class="fa-solid fa-tags"></i> ${genres}</span>` : ''}
            ${upcoming.averageScore ? `<span><i class="fa-solid fa-star" style="color:#ffd700"></i> ${upcoming.averageScore/10}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('upcoming-card-click')?.addEventListener('click', () => openAnimeModal(upcoming));
}

// -- Create Anime Card --
function createAnimeCard(anime, index) {
  const div = document.createElement('div');
  div.className = 'anime-card';
  div.style.animationDelay = (index * 0.04) + 's';

  const title = anime.title.english || anime.title.romaji;
  const cover = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const genres = (anime.genres || []).slice(0, 2);
  const epInfo = anime.nextAiringEpisode;
  const now = Math.floor(Date.now() / 1000);
  const isAiring = epInfo && (epInfo.airingAt - now) < 3600 && (epInfo.airingAt - now) > -3600;

  let timeStr = '';
  if (epInfo) {
    const d = new Date(epInfo.airingAt * 1000);
    timeStr = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  const imgContent = cover
    ? `<img src="${cover}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'anime-card-poster-placeholder\\'>🎌</div>'">`
    : `<div class="anime-card-poster-placeholder">🎌</div>`;

  div.innerHTML = `
    <div class="anime-card-poster">
      ${imgContent}
      <div class="anime-card-overlay"></div>
      ${score ? `<div class="anime-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      ${epInfo ? `<div class="anime-card-ep-badge">EP ${epInfo.episode}</div>` : ''}
      ${isAiring ? `<div class="anime-airing-badge"><div class="airing-pill"><span class="live-dot"></span>AIRING</div></div>` : ''}
      ${timeStr ? `<div class="anime-card-time"><i class="fa-solid fa-clock"></i>${timeStr}</div>` : ''}
    </div>
    <div class="anime-card-body">
      <div class="anime-card-title">${title}</div>
      <div class="anime-card-genres">
        ${genres.map(g => `<span class="anime-card-genre-tag">${g}</span>`).join('')}
      </div>
    </div>`;

  div.addEventListener('click', () => openAnimeModal(anime));
  return div;
}

// -- Anime Modal --
function openAnimeModal(anime) {
  const overlay = document.getElementById('anime-modal-overlay');
  const title = anime.title.english || anime.title.romaji;
  const titleNative = anime.title.native || '';
  const banner = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || '';
  const cover = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) + ' / 10' : 'N/A';
  const ep = anime.nextAiringEpisode;
  const genres = anime.genres || [];

  // Banner
  const bannerImg = document.getElementById('am-banner');
  bannerImg.src = banner;
  bannerImg.onerror = () => { bannerImg.src = cover; };

  // Cover
  const coverImg = document.getElementById('am-cover');
  coverImg.src = cover;
  coverImg.onerror = () => { coverImg.style.display = 'none'; };

  // Score badge
  document.getElementById('am-score').textContent = anime.averageScore ? `⭐ ${score}` : '';

  // Titles & genres
  document.getElementById('am-title').textContent = title;
  document.getElementById('am-title-en').textContent = titleNative;

  const genresEl = document.getElementById('am-genres');
  genresEl.innerHTML = genres.slice(0,5).map(g => `<span class="am-genre-chip">${g}</span>`).join('');

  // Info grid
  let timeStr = '--';
  if (ep) {
    const d = new Date(ep.airingAt * 1000);
    const h = Math.floor(ep.timeUntilAiring / 3600);
    const m = Math.floor((ep.timeUntilAiring % 3600) / 60);
    timeStr = d.toLocaleDateString('id-ID',{weekday:'short',hour:'2-digit',minute:'2-digit'});
    if (ep.timeUntilAiring > 0) {
      timeStr += ` (${h > 0 ? h+'j ' : ''}${m}m lagi)`;
    }
  }
  document.getElementById('am-time').textContent = timeStr;
  document.getElementById('am-ep').textContent = ep ? `EP ${ep.episode}` : (anime.episodes ? `${anime.episodes} EP` : 'Ongoing');
  document.getElementById('am-format').textContent = anime.format || 'TV';
  document.getElementById('am-score2').textContent = score;
  document.getElementById('am-fav').textContent = anime.favourites ? anime.favourites.toLocaleString() : '0';
  const studio = anime.studios?.nodes?.[0]?.name || 'Unknown';
  document.getElementById('am-studio').textContent = studio;

  // Description
  const rawDesc = anime.description || 'Tidak ada deskripsi.';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
  const descEl = document.getElementById('am-desc');
  const readMoreBtn = document.getElementById('am-read-more');
  descEl.textContent = cleanDesc;
  descEl.className = '';

  if (cleanDesc.length > 280) {
    readMoreBtn.classList.remove('hidden');
    readMoreBtn.textContent = 'Baca selengkapnya ▼';
    readMoreBtn.onclick = () => {
      const expanded = descEl.classList.contains('expanded');
      descEl.classList.toggle('expanded', !expanded);
      readMoreBtn.textContent = expanded ? 'Baca selengkapnya ▼' : 'Tutup ▲';
    };
  } else {
    readMoreBtn.classList.add('hidden');
  }

  // AniList link
  document.getElementById('am-anilist-link').href = anime.siteUrl || `https://anilist.co/anime/${anime.id}`;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAnimeModal() {
  document.getElementById('anime-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('anime-modal-close')?.addEventListener('click', closeAnimeModal);
document.getElementById('anime-modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('anime-modal-overlay')) closeAnimeModal();
});

// -- Day tabs --
function initAnimeDayTabs() {
  const tabs = document.getElementById('anime-day-tabs');
  if (!tabs) return;

  const today = new Date().getDay();
  // Mark today tab
  tabs.querySelectorAll('.anime-day-tab').forEach(btn => {
    const d = parseInt(btn.dataset.day);
    if (d === today) btn.classList.add('today-tab');
    if (d === currentAnimeDay) btn.classList.add('active');
  });

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.anime-day-tab');
    if (!btn) return;
    tabs.querySelectorAll('.anime-day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnimeDay = parseInt(btn.dataset.day);
    animeSearchQuery = '';
    document.getElementById('anime-search-input').value = '';
    document.getElementById('anime-clear-search').classList.add('hidden');
    renderAnimeDay();
  });
}

// -- Genre filter --
document.getElementById('anime-genre-bar')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.anime-genre-btn');
  if (!btn) return;
  document.querySelectorAll('.anime-genre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentAnimeGenre = btn.dataset.genre;
  renderAnimeDay();
});

// -- Anime Search --
document.getElementById('anime-search-input')?.addEventListener('input', (e) => {
  animeSearchQuery = e.target.value.trim();
  document.getElementById('anime-clear-search').classList.toggle('hidden', !animeSearchQuery);
  renderAnimeDay();
});
document.getElementById('anime-clear-search')?.addEventListener('click', () => {
  document.getElementById('anime-search-input').value = '';
  animeSearchQuery = '';
  document.getElementById('anime-clear-search').classList.add('hidden');
  renderAnimeDay();
});

// -- Retry btn --
document.getElementById('anime-retry-btn')?.addEventListener('click', () => {
  animeLoaded = false;
  loadAnimeSchedule(true);
});

// -- Helpers --
function showAnimeLoading(show) {
  const el = document.getElementById('anime-loading');
  if (el) el.classList.toggle('hidden', !show);
}
function showAnimeError(show) {
  const el = document.getElementById('anime-error');
  if (el) el.classList.toggle('hidden', !show);
}

// Init anime day tabs on load
document.addEventListener('DOMContentLoaded', () => {
  initAnimeDayTabs();
});
