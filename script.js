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
