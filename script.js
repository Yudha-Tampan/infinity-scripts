/* ============================================
   BOTIFY — script.js v3 (FIXED)
   Semua DOM refs di dalam fungsi, bukan global
   ============================================ */
'use strict';

// ===== PWA — Service Worker & Install Prompt =====
let deferredInstallPrompt = null;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Register failed:', err));
  });
}

// Tangkap event beforeinstallprompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Tampilkan banner hanya kalau user belum dismiss sebelumnya
  if (!localStorage.getItem('pwa_dismissed')) {
    setTimeout(() => showPwaBanner(), 3000); // delay 3 detik setelah load
  }
});

function showPwaBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('hidden');
}

function hidePwaBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  // Tombol Install
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Botify berhasil diinstall! 🎉', 'success');
      }
      deferredInstallPrompt = null;
      hidePwaBanner();
    });
  }

  // Tombol Dismiss
  const dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem('pwa_dismissed', '1');
      hidePwaBanner();
    });
  }
});

// Event saat PWA sudah terinstall
window.addEventListener('appinstalled', () => {
  showToast('App berhasil diinstall di homescreen!', 'success');
  hidePwaBanner();
  deferredInstallPrompt = null;
});


let allScripts = [];
let filteredScripts = [];
let favorites = JSON.parse(localStorage.getItem('is_favorites') || '[]');
let recentlyViewed = JSON.parse(localStorage.getItem('botify_recently_viewed') || '[]');
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'default'; // default | az | za | rating | newest
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
  loadChangelog();
  loadAnnouncement();
  loadNewScriptNotif();
  initAnimeDayTabs();
  initAnimeViewToggle();
  animateSkillBars();
}

// ===== NAVIGATION =====
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      goToPage(page);
    });
  });
}

// Util: pindah halaman secara terprogram (dipakai tombol/promo card di luar bottom-nav)
function goToPage(page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (!target) return;
  target.classList.add('active');
  if (page === 'profile') animateSkillBars();
  if (page === 'anime') loadAnimeSchedule();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  renderRecentlyViewed();
  renderLeaderboard();
  renderScripts();
  updateCategoryCounts();
  updateFavBadge();
  initRecentClearBtn();
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
  // Sort
  if (currentSort === 'az') result.sort((a,b) => a.nama.localeCompare(b.nama, 'id'));
  else if (currentSort === 'za') result.sort((a,b) => b.nama.localeCompare(a.nama, 'id'));
  else if (currentSort === 'rating') result.sort((a,b) => (b.rating||0) - (a.rating||0));
  else if (currentSort === 'newest') result.sort((a,b) => (b.baru ? 1 : 0) - (a.baru ? 1 : 0));

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

// ===== UPDATE CATEGORY COUNTS =====
function updateCategoryCounts() {
  document.querySelectorAll('.cat-btn[data-cat]').forEach(btn => {
    const cat = btn.dataset.cat;
    const count = cat === 'all' ? allScripts.length : allScripts.filter(s => s.kategori === cat).length;
    let badge = btn.querySelector('.cat-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cat-count';
      btn.appendChild(badge);
    }
    badge.textContent = count;
    // Hide count if 0
    badge.style.display = count === 0 ? 'none' : '';
  });
}


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
        ${script.trending ? '<span class="badge-trending"><i class="fa-solid fa-fire"></i> HOT</span>' : ''}
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

  trackRecentlyViewed(script.id);

  img.src = script.thumbnail;
  img.onerror = () => {
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'%3E%3Crect fill='%230d0d1f' width='400' height='225'/%3E%3Ctext y='120' x='200' text-anchor='middle' font-size='60' fill='%2300d4ff'%3E%3C/text%3E%3C/svg%3E";
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

  // === COPY LINK ===
  const copyBtn = document.getElementById('modal-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(script.link || '').then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin Link'; }, 2000);
        showToast('Link berhasil disalin!', 'success');
      }).catch(() => showToast('Gagal menyalin link', 'error'));
    };
  }

  // === SHARE WA ===
  const waShareBtn = document.getElementById('modal-wa-share-btn');
  if (waShareBtn) {
    waShareBtn.onclick = () => {
      const text = `🤖 *${script.nama}*\n📂 Kategori: ${script.kategori}\n⭐ Rating: ${script.rating}\n\n${script.deskripsi}\n\n🔗 Download: ${script.link}\n\n_Via Botify_`;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };
  }

  if (script.linkyt && script.linkyt.trim() !== '') {
    ytBtn.href = script.linkyt;
    ytBtn.classList.remove('hidden');
  } else {
    ytBtn.classList.add('hidden');
  }

  const chBtn = document.getElementById('modal-ch-btn');
  if (chBtn) {
    if (script.linkch && script.linkch.trim() !== '') {
      chBtn.href = script.linkch.trim();
      chBtn.classList.remove('hidden');
    } else {
      chBtn.classList.add('hidden');
    }
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
    showToast('Ditambahkan ke favorit', 'success');
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

// ===== SORT =====
document.addEventListener('DOMContentLoaded', () => {
  const sortWrap = document.getElementById('sort-options');
  if (sortWrap) sortWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    renderScripts();
  });
});


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
  const slides = document.querySelectorAll('.carousel-slide');
  const dotsEl = document.getElementById('banner-dots');
  if (!dotsEl || !slides.length) return;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cs-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goBanner(i));
    dotsEl.appendChild(dot);
  });

  // Prev / Next arrows
  const prevBtn = document.getElementById('cs-prev');
  const nextBtn = document.getElementById('cs-next');
  if (prevBtn) prevBtn.addEventListener('click', () => goBanner((currentBannerSlide - 1 + slides.length) % slides.length));
  if (nextBtn) nextBtn.addEventListener('click', () => goBanner((currentBannerSlide + 1) % slides.length));

  // Touch swipe — passive untuk tidak block scroll
  const track = document.getElementById('banner-track');
  let startX = 0, startY = 0, isScrolling = null;
  if (track) {
    track.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isScrolling = null;
    }, { passive: true });
    track.addEventListener('touchmove', e => {
      if (isScrolling === null) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        isScrolling = dy > dx;
      }
    }, { passive: true });
    track.addEventListener('touchend', e => {
      if (isScrolling) return; // vertical scroll, jangan ganti slide
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goBanner(diff > 0
        ? (currentBannerSlide + 1) % slides.length
        : (currentBannerSlide - 1 + slides.length) % slides.length);
    }, { passive: true });
  }

  bannerInterval = setInterval(() => goBanner((currentBannerSlide + 1) % slides.length), 5000);
}

function goBanner(idx) {
  const slides = document.querySelectorAll('.carousel-slide');
  currentBannerSlide = idx;
  const track = document.getElementById('banner-track');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.cs-dot').forEach((d,i) => d.classList.toggle('active', i === idx));
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
    showToast(document.body.classList.contains('light-mode') ? 'Light mode aktif' : 'Dark mode aktif', 'info');
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
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        fab.classList.toggle('visible', window.scrollY > 200);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== MUSIC PLAYER =====
let audioPlayer = null;

function initMusicPlayer() {
  const btn    = document.getElementById('music-toggle');
  const disc   = document.getElementById('music-disc');
  const wave   = document.getElementById('music-wave');
  const title  = document.getElementById('music-title');
  const artist = document.getElementById('music-artist');
  if (!btn) return;

  // Buat elemen audio
  audioPlayer = new Audio('lagu.mp3');
  audioPlayer.loop = true;
  audioPlayer.volume = 0.6;

  // Kalau file tidak ada / error
  audioPlayer.addEventListener('error', () => {
    if (title)  title.textContent  = 'Everything u are';
    if (artist) artist.textContent = 'Taruh lagu.mp3 di folder';
  });

  // Kalau berhasil load
  audioPlayer.addEventListener('canplay', () => {
    if (title)  title.textContent  = 'Everything u are';
    if (artist) artist.textContent = 'Hindia';
  });

  // Update progress bar (opsional visual)
  audioPlayer.addEventListener('timeupdate', () => {
    const prog = document.getElementById('music-progress');
    if (prog && audioPlayer.duration) {
      prog.style.width = (audioPlayer.currentTime / audioPlayer.duration * 100) + '%';
    }
  });

  btn.addEventListener('click', async () => {
    if (!musicPlaying) {
      try {
        await audioPlayer.play();
        musicPlaying = true;
        btn.innerHTML  = `<i class="fa-solid fa-pause"></i>`;
        disc.classList.add('spinning');
        wave.classList.add('playing');
        showToast('Musik diputar', 'info');
      } catch(e) {
        showToast('Taruh file lagu.mp3 di folder website', 'error');
      }
    } else {
      audioPlayer.pause();
      musicPlaying = false;
      btn.innerHTML  = `<i class="fa-solid fa-play"></i>`;
      disc.classList.remove('spinning');
      wave.classList.remove('playing');
      showToast('Musik dijeda', 'info');
    }
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
  { icon: 'fa-fire', color: '#ff6b35', text: 'AI Assistant Bot trending hari ini — 500+ downloads' },
  { icon: 'fa-download', color: '#38bdf8', text: 'Botify MD V2 baru saja didownload dari Jakarta' },
  { icon: 'fa-bolt', color: '#fbbf24', text: 'Panel Botify mendapat update fitur terbaru!' },
  { icon: 'fa-users', color: '#34d399', text: '50.000+ pengguna aktif telah bergabung' },
  { icon: 'fa-sparkles', color: '#818cf8', text: 'Script baru ditambahkan ke koleksi minggu ini' },
  { icon: 'fa-circle-check', color: '#34d399', text: 'Server online — semua script tersedia 24/7' },
  { icon: 'fa-star', color: '#fbbf24', text: 'Rating rata-rata script: 4.8 / 5.0' },
  { icon: 'fa-shield-halved', color: '#38bdf8', text: 'Script terverifikasi aman & bebas malware' },
];
let liveIdx = 0;
function animateLiveText() {
  const iconEl = document.getElementById('live-icon');
  const textEl = document.getElementById('live-text');
  if (!textEl) return;
  function update() {
    const wrap = textEl.closest('.live-update');
    if (wrap) wrap.style.opacity = '0';
    setTimeout(() => {
      const msg = liveMessages[liveIdx % liveMessages.length];
      if (iconEl) { iconEl.className = `fa-solid ${msg.icon}`; iconEl.style.color = msg.color; }
      textEl.textContent = msg.text;
      if (wrap) wrap.style.opacity = '1';
      liveIdx++;
    }, 350);
  }
  update();
  setInterval(update, 4500);
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
      ? `<img src="${ev.thumbnail}" alt="${escHtml(ev.nama)}" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML=this.parentElement.dataset.ph;">`
      : '';
    const phHTML = `<div class="featured-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
    const anggota  = ev.anggota ? `<span><i class="fa-solid fa-users"></i> ${ev.anggota}</span>` : '';
    const penyelng = ev.penyelenggara ? `<span><i class="fa-solid fa-user-tie"></i> ${ev.penyelenggara}</span>` : '';
    return `
      <div class="featured-event-card">
        <div class="featured-thumb" data-ph="${escHtml(phHTML)}">${thumb || phHTML}<div class="featured-thumb-overlay"></div>${ev.baru?'<div class="new-chip">NEW</div>':''}<div class="feat-star-badge"><i class="fa-solid fa-star"></i> Featured</div></div>
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
  const phHTML = `<div class="event-card-thumb-placeholder">${getTypeEmoji(ev.tipe)}</div>`;
  const thumb = ev.thumbnail
    ? `<img src="${ev.thumbnail}" alt="${escHtml(ev.nama)}" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML=this.parentElement.dataset.ph;">`
    : phHTML;
  div.innerHTML = `
    <div class="event-card-thumb" data-ph="${escHtml(phHTML)}">${thumb}${ev.baru?'<div class="event-new-chip">NEW</div>':''}</div>
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

function getYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function openEventModal(ev) {
  const overlay = document.getElementById('event-modal-overlay');
  if (!overlay) return;
  const icon = getTypeIcon(ev.tipe);
  const cls  = `event-type-chip chip-${ev.tipe}`;

  const img = document.getElementById('ev-modal-img');
  const thumbWrap = document.getElementById('ev-modal-thumb-wrap');
  const ytWrap  = document.getElementById('ev-modal-yt-wrap');
  const ytIframe = document.getElementById('ev-modal-yt-iframe');

  const ytId = getYoutubeId(ev.link);
  if (ytId) {
    // Sembunyikan thumbnail, tampilkan iframe YouTube
    thumbWrap.classList.add('hidden');
    ytWrap.classList.remove('hidden');
    ytIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`;
  } else {
    // Tampilkan thumbnail biasa
    ytWrap.classList.add('hidden');
    ytIframe.src = '';
    thumbWrap.classList.remove('hidden');
    img.src = ev.thumbnail || '';
    img.onerror = () => { img.parentElement.innerHTML = `<div style="height:200px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--bg3)">${getTypeEmoji(ev.tipe)}</div>`; };
  }

  document.getElementById('ev-modal-name').textContent = ev.nama;
  document.getElementById('ev-modal-desc').textContent = ev.deskripsi;
  document.getElementById('ev-modal-link-text').textContent = ev.link;
  document.getElementById('ev-modal-link').href = ev.link;
  document.getElementById('ev-btn-label').textContent = ev.label_btn || 'Buka Link';

  // === COPY LINK EVENT ===
  const evCopyBtn = document.getElementById('ev-copy-btn');
  if (evCopyBtn) {
    evCopyBtn.onclick = () => {
      navigator.clipboard.writeText(ev.link || '').then(() => {
        evCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
        setTimeout(() => { evCopyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin Link'; }, 2000);
        showToast('Link berhasil disalin!', 'success');
      }).catch(() => showToast('Gagal menyalin link', 'error'));
    };
  }

  // === SHARE WA EVENT ===
  const evWaBtn = document.getElementById('ev-wa-share-btn');
  if (evWaBtn) {
    evWaBtn.onclick = () => {
      const text = `📢 *${ev.nama}*\n🏷️ Tipe: ${ev.tipe}${ev.penyelenggara ? '\n👤 By: ' + ev.penyelenggara : ''}${ev.anggota ? '\n👥 ' + ev.anggota : ''}\n\n${ev.deskripsi}\n\n🔗 Link: ${ev.link}\n\n_Via Botify_`;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };
  }

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
  const ytIframe = document.getElementById('ev-modal-yt-iframe');
  if (ytIframe) ytIframe.src = '';
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
  return { 
    Grup: 'fa-brands fa-whatsapp', 
    Saluran: 'fa-brands fa-whatsapp',
    Channel: 'fa-brands fa-telegram', 
    Website: 'fa-solid fa-globe', 
    Promo: 'fa-solid fa-tag', 
    Lainnya: 'fa-solid fa-star' 
  }[t] || 'fa-solid fa-circle-info';
}
function getTypeEmoji(t) {
  const map = {
    Grup:    '<i class="fa-brands fa-whatsapp" style="color:var(--neon3)"></i>',
    Saluran: '<i class="fa-brands fa-whatsapp" style="color:#25D366"></i>',
    Channel: '<i class="fa-brands fa-telegram" style="color:#0af"></i>',
    Website: '<i class="fa-solid fa-globe" style="color:var(--neon)"></i>',
    Promo:   '<i class="fa-solid fa-tag" style="color:var(--accent)"></i>',
    Lainnya: '<i class="fa-solid fa-star" style="color:var(--premium)"></i>',
  };
  return map[t] || '<i class="fa-solid fa-circle-info" style="color:var(--text2)"></i>';
}

// ===========================
// ==========================================
// ANIME HUB v3 — AniList GraphQL
// ==========================================
const ANILIST_API   = 'https://graphql.anilist.co';
const HARI          = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const SEASON_MAP    = {0:'WINTER',1:'WINTER',2:'SPRING',3:'SPRING',4:'SPRING',5:'SUMMER',6:'SUMMER',7:'SUMMER',8:'FALL',9:'FALL',10:'FALL',11:'WINTER'};
const SEASON_LABEL  = {WINTER:'❄ Winter',SPRING:'🌸 Spring',SUMMER:'☀ Summer',FALL:'🍂 Fall'};
const SEASON_LABEL2 = {WINTER:'Winter',SPRING:'Spring',SUMMER:'Summer',FALL:'Fall'};
const NEXT_SEASON   = {WINTER:'SPRING',SPRING:'SUMMER',SUMMER:'FALL',FALL:'WINTER'};

let animeWeekData      = {};
let animeUpcomingData  = [];
let animeTrendingData  = [];
let currentAnimeDay    = new Date().getDay();
let currentAnimeGenre  = 'all';
let animeSearchQuery   = '';
let animeLoaded        = false;
let animeView          = 'jadwal';   // jadwal | upcoming | trending
let countdownInterval  = null;

// ── GRAPHQL QUERIES ──────────────────────────────────────────

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

const TRENDING_QUERY = `
query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
  Page(page: $page, perPage: 30) {
    pageInfo { hasNextPage }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
      id title { romaji english native }
      description(asHtml: false)
      coverImage { large extraLarge medium }
      bannerImage genres averageScore popularity favourites episodes duration
      studios(isMain: true) { nodes { name } }
      format status season seasonYear siteUrl countryOfOrigin source
      streamingEpisodes { title thumbnail url site }
      airingSchedule(notYetAired: true, perPage: 1) { nodes { episode airingAt } }
      tags { name rank isMediaSpoiler }
    }
  }
}`;

// ── HELPERS ──────────────────────────────────────────────────

async function fetchAniList(query, variables) {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllPages(query, baseVars, dataKey) {
  let page = 1, results = [], hasNext = true;
  while (hasNext && page <= 4) {
    try {
      const json = await fetchAniList(query, { ...baseVars, page });
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

function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const cur   = SEASON_MAP[month];
  const nxt   = NEXT_SEASON[cur];
  const nxtYr = cur === 'FALL' ? year + 1 : year;
  return { cur, nxt, year, nxtYr };
}

// ── LOAD DATA ────────────────────────────────────────────────

async function loadAnimeSchedule(force = false) {
  if (animeLoaded && !force) { renderAnimeView(); return; }
  showAnimeLoading(true);
  showAnimeError(false);
  qid('anime-grid').innerHTML = '';

  const { cur, nxt, year, nxtYr } = getCurrentSeason();

  const lbl = qid('anime-season-label');
  if (lbl) lbl.innerHTML = `<i class="fa-solid fa-calendar"></i> ${SEASON_LABEL2[cur]} ${year}`;

  try {
    const from = getStartOfWeek();
    const to   = from + 7 * 24 * 3600;

    const [entries, upCur, upNxt, trendData] = await Promise.all([
      fetchAllPages(SCHEDULE_QUERY, { from, to }, 'airingSchedules'),
      fetchAllPages(UPCOMING_QUERY, { season: cur, seasonYear: year }, 'media'),
      fetchAllPages(UPCOMING_QUERY, { season: nxt, seasonYear: nxtYr }, 'media'),
      fetchAllPages(TRENDING_QUERY, { season: cur, seasonYear: year }, 'media')
    ]);

    // Week schedule
    animeWeekData = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
    entries.forEach(e => {
      if (!e.media) return;
      const d = new Date(e.airingAt * 1000).getDay();
      animeWeekData[d].push(e);
    });

    // Upcoming
    const weekIds = new Set(entries.map(e => e.media?.id).filter(Boolean));
    const nowTs   = Math.floor(Date.now() / 1000);
    animeUpcomingData = [...upCur, ...upNxt]
      .filter((v,i,a) => a.findIndex(x => x.id === v.id) === i)
      .filter(a => !weekIds.has(a.id))
      .filter(a => {
        const sd = a.startDate;
        if (!sd?.year) return true;
        const ts = new Date(sd.year, (sd.month||1)-1, sd.day||1).getTime() / 1000;
        return ts > nowTs - 86400;
      })
      .sort((a,b) => getUpcomingTs(a) - getUpcomingTs(b));

    // Trending
    animeTrendingData = trendData
      .filter((v,i,a) => a.findIndex(x => x.id === v.id) === i)
      .slice(0, 30);

    animeLoaded = true;
    updateAnimeStats();
    renderTodaySpotlight();
    showAnimeLoading(false);
    renderAnimeView();

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdowns, 1000);

  } catch(e) {
    console.error('Anime load error:', e);
    showAnimeLoading(false);
    showAnimeError(true);
  }
}

// ── STATS ────────────────────────────────────────────────────

function updateAnimeStats() {
  const today = animeWeekData[currentAnimeDay] || [];
  const total = Object.values(animeWeekData).reduce((s,a) => s+a.length, 0);
  const now   = Math.floor(Date.now()/1000);
  setTxt('anime-count-day',      today.length);
  setTxt('anime-count-week',     total);
  setTxt('anime-count-upcoming', animeUpcomingData.length);
  setTxt('anime-count-upcoming2',animeUpcomingData.length);

  const next = today.filter(e => e.airingAt > now).sort((a,b) => a.airingAt - b.airingAt)[0];
  const e4   = qid('anime-next-time');
  if (e4 && next) {
    const d = new Date(next.airingAt*1000);
    e4.textContent = d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  } else if (e4) { e4.textContent = '--:--'; }

  const lu = qid('anime-last-update');
  if (lu) { const t=new Date(); lu.textContent=t.getHours().toString().padStart(2,'0')+':'+t.getMinutes().toString().padStart(2,'0'); }
}

function setTxt(id, val) { const e = qid(id); if(e) e.textContent = val; }
function qid(id) { return document.getElementById(id); }

// ── TODAY SPOTLIGHT ──────────────────────────────────────────

function renderTodaySpotlight() {
  const wrap = qid('ani-today-wrap');
  const scrl = qid('ani-today-scroll');
  if (!scrl) return;

  const today = animeWeekData[new Date().getDay()] || [];
  if (today.length === 0) { if (wrap) wrap.classList.add('hidden'); return; }
  if (wrap) wrap.classList.remove('hidden');

  const now = Math.floor(Date.now()/1000);
  scrl.innerHTML = '';
  [...today].sort((a,b) => a.airingAt - b.airingAt).forEach(entry => {
    const anime = entry.media; if (!anime) return;
    const title = anime.title.english || anime.title.romaji;
    const cover = anime.coverImage?.large || '';
    const score = anime.averageScore ? (anime.averageScore/10).toFixed(1) : null;
    const diff  = entry.airingAt - now;
    const isLive = diff >= -1800 && diff <= 1800;
    const aired  = diff < -1800;
    const d = new Date(entry.airingAt*1000);
    const timeStr = d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');

    const chip = document.createElement('div');
    chip.className = 'ani-today-chip' + (isLive ? ' live-now' : '');
    chip.innerHTML = `
      <div class="ani-today-chip-img">
        ${cover ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy">` : `<div class="ani-card-poster-ph"><i class="fa-solid fa-tv"></i></div>`}
        <div class="ani-card-overlay"></div>
        <div class="ani-today-chip-ep">EP ${entry.episode}</div>
        ${score ? `<div class="ani-today-chip-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
        <div class="ani-today-chip-time ${isLive?'is-live':aired?'is-aired':''}">
          ${isLive ? '<span class="live-dot"></span> LIVE' : aired ? '✓ Tayang' : '⏰ '+timeStr}
        </div>
      </div>
      <div class="ani-today-chip-body">
        <div class="ani-today-chip-title">${escHtml(title)}</div>
      </div>`;
    chip.addEventListener('click', () => openAnimeModal(anime, entry));
    scrl.appendChild(chip);
  });
}

// ── RENDER VIEWS ─────────────────────────────────────────────

function renderAnimeView() {
  const header = qid('anime-section-header');
  if (header) header.classList.remove('hidden');

  if      (animeView === 'jadwal')   renderAnimeSchedule();
  else if (animeView === 'upcoming') renderAnimeUpcoming();
  else if (animeView === 'trending') renderAnimeTrending();
}

function renderAnimeSchedule() {
  const grid  = qid('anime-grid');
  const empty = qid('anime-empty');
  const strip = qid('anime-day-tabs');
  if (!grid) return;
  if (strip) strip.classList.remove('hidden');

  let list = [...(animeWeekData[currentAnimeDay] || [])];
  list = list.filter(e => e.media?.status !== 'NOT_YET_RELEASED');
  if (currentAnimeGenre !== 'all') list = list.filter(e => e.media?.genres?.includes(currentAnimeGenre));
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(e => {
      const t = e.media?.title;
      return (t?.romaji||'').toLowerCase().includes(q) || (t?.english||'').toLowerCase().includes(q);
    });
  }
  list.sort((a,b) => a.airingAt - b.airingAt);

  setTxt('anime-count-day', list.length);
  const ttl = qid('anime-schedule-title');
  if (ttl) ttl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${HARI[currentAnimeDay]}`;

  grid.innerHTML = '';
  if (list.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const now = Math.floor(Date.now()/1000);
  list.forEach((e,i) => grid.appendChild(createScheduleCard(e, i, now)));
}

function renderAnimeUpcoming() {
  const grid  = qid('anime-grid');
  const empty = qid('anime-empty');
  const strip = qid('anime-day-tabs');
  if (!grid) return;
  if (strip) strip.classList.add('hidden');

  let list = [...animeUpcomingData];
  if (currentAnimeGenre !== 'all') list = list.filter(a => a.genres?.includes(currentAnimeGenre));
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(a => (a.title?.romaji||'').toLowerCase().includes(q)||(a.title?.english||'').toLowerCase().includes(q));
  }

  const ttl = qid('anime-schedule-title');
  if (ttl) ttl.innerHTML = `<i class="fa-solid fa-rocket"></i> Segera Tayang`;

  grid.innerHTML = '';
  if (list.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const now = Math.floor(Date.now()/1000);
  list.forEach((a,i) => grid.appendChild(createUpcomingCard(a, i, now)));
}

function renderAnimeTrending() {
  const grid  = qid('anime-grid');
  const empty = qid('anime-empty');
  const strip = qid('anime-day-tabs');
  if (!grid) return;
  if (strip) strip.classList.add('hidden');

  let list = [...animeTrendingData];
  if (currentAnimeGenre !== 'all') list = list.filter(a => a.genres?.includes(currentAnimeGenre));
  if (animeSearchQuery) {
    const q = animeSearchQuery.toLowerCase();
    list = list.filter(a => (a.title?.romaji||'').toLowerCase().includes(q)||(a.title?.english||'').toLowerCase().includes(q));
  }

  const ttl = qid('anime-schedule-title');
  if (ttl) ttl.innerHTML = `<i class="fa-solid fa-fire"></i> Trending Season Ini`;

  grid.innerHTML = '';
  if (list.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.forEach((a,i) => grid.appendChild(createTrendingCard(a, i)));
}

// ── CARD BUILDERS ─────────────────────────────────────────────

function createScheduleCard(entry, index, now) {
  const anime = entry.media; if (!anime) return document.createElement('div');
  const div   = document.createElement('div');
  div.className = 'ani-card';
  div.style.animationDelay = (index * 0.04) + 's';

  const title  = anime.title.english || anime.title.romaji;
  const cover  = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score  = anime.averageScore ? (anime.averageScore/10).toFixed(1) : null;
  const genres = (anime.genres||[]).slice(0,2);
  const d      = new Date(entry.airingAt * 1000);
  const timeStr = d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
  const diff   = entry.airingAt - now;
  const isLive = diff >= -1800 && diff <= 1800;
  const aired  = diff < -1800;

  const img = cover
    ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'ani-card-poster-ph\\'><i class=\\'fa-solid fa-tv\\'></i></div>'">`
    : `<div class="ani-card-poster-ph"><i class="fa-solid fa-tv"></i></div>`;

  div.innerHTML = `
    <div class="ani-card-poster">
      ${img}<div class="ani-card-overlay"></div>
      <div class="ani-card-ep">EP ${entry.episode}</div>
      ${score ? `<div class="ani-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      ${isLive
        ? `<div class="ani-live-badge"><div class="ani-live-pill"><span class="live-dot"></span>LIVE</div></div>`
        : aired
          ? `<div class="ani-aired-badge"><span style="color:var(--neon3);font-size:0.6rem;background:rgba(6,255,165,0.1);border:1px solid rgba(6,255,165,0.3);border-radius:20px;padding:2px 8px;backdrop-filter:blur(4px)">✓ Tayang</span></div>`
          : ''}
      <div class="ani-card-time ${aired?'is-aired':isLive?'is-live':''}">
        <i class="fa-solid fa-clock"></i>${timeStr}
      </div>
    </div>
    <div class="ani-card-body">
      <div class="ani-card-title">${escHtml(title)}</div>
      <div class="ani-card-genres">${genres.map(g=>`<span class="ani-card-genre-tag">${g}</span>`).join('')}</div>
      <div class="ani-card-countdown" data-airing="${entry.airingAt}">
        ${aired ? '<span class="aired-text">Sudah tayang</span>' : formatCountdown(Math.max(0,diff))}
      </div>
    </div>`;
  div.addEventListener('click', () => openAnimeModal(anime, entry));
  return div;
}

function createUpcomingCard(anime, index, now) {
  const div = document.createElement('div');
  div.className = 'ani-card';
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
    ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'ani-card-poster-ph\\'><i class=\\'fa-solid fa-tv\\'></i></div>'">`
    : `<div class="ani-card-poster-ph"><i class="fa-solid fa-tv"></i></div>`;

  div.innerHTML = `
    <div class="ani-card-poster">
      ${img}<div class="ani-card-overlay"></div>
      ${score ? `<div class="ani-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      <div class="ani-upcoming-tag"><i class="fa-solid fa-rocket"></i> Upcoming</div>
      <div class="ani-card-time"><i class="fa-solid fa-calendar"></i>${dateStr}</div>
    </div>
    <div class="ani-card-body">
      <div class="ani-card-title">${escHtml(title)}</div>
      <div class="ani-card-genres">${genres.map(g=>`<span class="ani-card-genre-tag">${g}</span>`).join('')}</div>
      <div class="ani-card-countdown upcoming-cd" data-airing="${firstTs||0}">
        ${cdStr || `<span style="color:var(--text3);font-size:0.6rem">${anime.season?SEASON_LABEL2[anime.season]||anime.season:'TBA'} ${anime.seasonYear||''}</span>`}
      </div>
    </div>`;
  div.addEventListener('click', () => openAnimeModal(anime, null, true));
  return div;
}

function createTrendingCard(anime, index) {
  const div = document.createElement('div');
  div.className = 'ani-card';
  div.style.animationDelay = (index * 0.04) + 's';

  const title  = anime.title.english || anime.title.romaji;
  const cover  = anime.coverImage?.large || anime.coverImage?.extraLarge || '';
  const score  = anime.averageScore ? (anime.averageScore/10).toFixed(1) : null;
  const genres = (anime.genres||[]).slice(0,2);
  const pop    = (anime.popularity||0).toLocaleString('id-ID');
  const rank   = index + 1;

  const img = cover
    ? `<img src="${cover}" alt="${escHtml(title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'ani-card-poster-ph\\'><i class=\\'fa-solid fa-tv\\'></i></div>'">`
    : `<div class="ani-card-poster-ph"><i class="fa-solid fa-tv"></i></div>`;

  div.innerHTML = `
    <div class="ani-trend-bar"></div>
    <div class="ani-card-poster">
      ${img}<div class="ani-card-overlay"></div>
      <div class="ani-card-rank">#${rank}</div>
      ${score ? `<div class="ani-card-score"><i class="fa-solid fa-star"></i>${score}</div>` : ''}
      <div class="ani-card-time"><i class="fa-solid fa-users"></i>${pop}</div>
    </div>
    <div class="ani-card-body">
      <div class="ani-card-title">${escHtml(title)}</div>
      <div class="ani-card-genres">${genres.map(g=>`<span class="ani-card-genre-tag">${g}</span>`).join('')}</div>
      <div class="ani-card-countdown">
        <span style="color:var(--text3);font-size:0.6rem;font-family:'Rajdhani',sans-serif">
          ${anime.season?SEASON_LABEL2[anime.season]||anime.season:''} ${anime.seasonYear||''}
        </span>
      </div>
    </div>`;
  div.addEventListener('click', () => openAnimeModal(anime, null, false));
  return div;
}

// ── COUNTDOWN ────────────────────────────────────────────────

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
  document.querySelectorAll('.ani-card-countdown[data-airing]').forEach(el => {
    const t = parseInt(el.dataset.airing);
    if (!t) return;
    const diff = t - now;
    if (!el.classList.contains('upcoming-cd')) {
      el.innerHTML = diff < -1800 ? '<span class="aired-text">Sudah tayang</span>' : formatCountdown(Math.max(0,diff));
      const card = el.closest('.ani-card');
      if (card) {
        const tb = card.querySelector('.ani-card-time');
        if (tb) { tb.classList.toggle('is-live', diff>=-1800&&diff<=1800); tb.classList.toggle('is-aired',diff<-1800); }
      }
    }
  });
}

// ── MODAL ────────────────────────────────────────────────────

function openAnimeModal(anime, scheduleEntry = null, isUpcoming = false) {
  const overlay = qid('anime-modal-overlay');
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

  const bEl = qid('am-banner');
  if (bEl) { bEl.src = banner; bEl.onerror = () => { bEl.src = cover; }; }
  const cEl = qid('am-cover');
  if (cEl) { cEl.src = cover; cEl.onerror = () => { cEl.style.opacity='0'; }; }

  const scoreB = qid('am-score');
  if (scoreB) scoreB.innerHTML = anime.averageScore ? `<i class="fa-solid fa-star" style="color:#ffd700"></i> ${score}/10` : '';

  const setEl = (id, val) => { const e = qid(id); if(e) e.textContent = val; };
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
  setEl('am-season-info', anime.season ? `${SEASON_LABEL2[anime.season]||anime.season} ${anime.seasonYear||''}` : 'N/A');
  setEl('am-country',     country);
  setEl('am-airstatus',   airStatus);

  const now2 = Math.floor(Date.now()/1000);
  if (scheduleEntry) {
    const d = new Date(scheduleEntry.airingAt*1000);
    const diff = scheduleEntry.airingAt - now2;
    const dateStr = d.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const timeEl = qid('am-time');
    if (timeEl) timeEl.innerHTML = `${dateStr}<br><small style="color:#ff5c93">${diff>0?formatCountdown(diff):'Sudah tayang'}</small>`;
    setEl('am-ep', `Episode ${scheduleEntry.episode}`);
  } else if (isUpcoming) {
    const node = anime?.airingSchedule?.nodes?.[0];
    const sd   = anime?.startDate;
    const timeEl = qid('am-time');
    if (node && timeEl) {
      const d = new Date(node.airingAt*1000); const diff = node.airingAt - now2;
      timeEl.innerHTML = `${d.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}<br><small style="color:#ff5c93">${diff>0?formatCountdown(diff):'Segera'}</small>`;
    } else if (sd?.year && timeEl) { timeEl.textContent = `${sd.day||'??'}/${sd.month||'??'}/${sd.year}`; }
    else if (timeEl) { timeEl.textContent = 'TBA'; }
    setEl('am-ep', anime.episodes ? `${anime.episodes} EP` : 'TBA');
  } else {
    setEl('am-time', 'N/A'); setEl('am-ep', anime.episodes||'Ongoing');
  }

  const genEl = qid('am-genres');
  if (genEl) genEl.innerHTML = genres.slice(0,5).map(g=>`<span class="am-genre-chip">${g}</span>`).join('');

  const tags = (anime.tags||[]).filter(t=>!t.isMediaSpoiler).slice(0,10);
  const tagW = qid('am-tags-wrap'), tagL = qid('am-tags-list');
  if (tagW && tagL) {
    if (tags.length > 0) { tagW.classList.remove('hidden'); tagL.innerHTML = tags.map(t=>`<span class="am-tag-chip">${t.name}</span>`).join(''); }
    else { tagW.classList.add('hidden'); }
  }

  const streams = (anime.streamingEpisodes||[]);
  const stW = qid('am-stream-wrap'), stL = qid('am-stream-list');
  if (stW && stL) {
    const sites = [...new Set(streams.map(s=>s.site))];
    if (sites.length > 0) {
      stW.classList.remove('hidden');
      stL.innerHTML = sites.map(site => {
        const ep = streams.find(s=>s.site===site);
        return `<a href="${ep?.url||'#'}" target="_blank" class="stream-btn"><i class="fa-solid fa-play"></i>${site}</a>`;
      }).join('');
    } else { stW.classList.add('hidden'); }
  }

  const rawDesc   = anime.description || 'Tidak ada deskripsi.';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g,'').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();
  const descEl = qid('am-desc'), readBtn = qid('am-read-more');
  if (descEl) { descEl.textContent = cleanDesc; descEl.className = ''; }
  if (readBtn) {
    if (cleanDesc.length > 300) {
      readBtn.classList.remove('hidden'); readBtn.textContent = 'Baca selengkapnya ▼';
      readBtn.onclick = () => { const exp = descEl.classList.contains('expanded'); descEl.classList.toggle('expanded',!exp); readBtn.textContent = exp?'Baca selengkapnya ▼':'Tutup ▲'; };
    } else { readBtn.classList.add('hidden'); }
  }

  const alLink = qid('am-anilist-link');
  if (alLink) alLink.href = anime.siteUrl || `https://anilist.co/anime/${anime.id}`;

  const modalCd = qid('am-modal-countdown');
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
  const overlay = qid('anime-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  if (overlay.dataset.cdInt) { clearInterval(parseInt(overlay.dataset.cdInt)); delete overlay.dataset.cdInt; }
}

// ── INIT LISTENERS ───────────────────────────────────────────

function initAnimeModalListeners() {
  const close   = qid('anime-modal-close');
  const overlay = qid('anime-modal-overlay');
  if (close)   close.addEventListener('click', closeAnimeModal);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAnimeModal(); });

  const retry = qid('anime-retry-btn');
  if (retry) retry.addEventListener('click', () => { animeLoaded = false; loadAnimeSchedule(true); });

  const asearch = qid('anime-search-input');
  const aclear  = qid('anime-clear-search');
  if (asearch) asearch.addEventListener('input', (e) => {
    animeSearchQuery = e.target.value.trim();
    if (aclear) aclear.classList.toggle('hidden', !animeSearchQuery);
    renderAnimeView();
  });
  if (aclear) aclear.addEventListener('click', () => {
    qid('anime-search-input').value = '';
    animeSearchQuery = ''; aclear.classList.add('hidden'); renderAnimeView();
  });

  const genreBar = qid('anime-genre-bar');
  if (genreBar) genreBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.ani-genre-pill');
    if (!btn) return;
    document.querySelectorAll('.ani-genre-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnimeGenre = btn.dataset.genre;
    renderAnimeView();
  });
}

function initAnimeViewToggle() {
  ['jadwal','upcoming','trending'].forEach(tab => {
    const btn = qid(`ani-tab-${tab}`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ani-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      animeView = tab;
      renderAnimeView();
    });
  });
}

function initAnimeDayTabs() {
  const tabs = qid('anime-day-tabs');
  if (!tabs) return;
  const today = new Date().getDay();
  tabs.querySelectorAll('.ani-day-btn').forEach(btn => {
    const d = parseInt(btn.dataset.day);
    btn.classList.toggle('today-btn',  d === today);
    btn.classList.toggle('active', d === currentAnimeDay);
  });
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.ani-day-btn');
    if (!btn) return;
    tabs.querySelectorAll('.ani-day-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnimeDay = parseInt(btn.dataset.day);
    updateAnimeStats();
    renderAnimeView();
  });
}

function showAnimeLoading(show) {
  const el = qid('anime-loading');
  if (el) el.classList.toggle('hidden', !show);
  if (show) {
    const g = qid('anime-grid'); if (g) g.innerHTML = '';
    const e = qid('anime-empty'); if (e) e.classList.add('hidden');
    const h = qid('anime-section-header'); if (h) h.classList.add('hidden');
    const t = qid('ani-today-wrap'); if (t) t.classList.add('hidden');
  }
}
function showAnimeError(show) {
  const el = qid('anime-error');
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
  // Kurangi dari 80 → 40 untuk performa lebih baik
  const cnt = window.innerWidth < 480 ? 25 : 40;
  const particles = Array.from({length:cnt}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5,
    r:Math.random()*2+.5, a:Math.random(),
    color: Math.random()>.5?'#38bdf8':'#818cf8'
  }));
  let splashRafId;
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
    splashRafId = requestAnimationFrame(draw);
  }
  draw();
  // Stop animasi saat splash selesai untuk hemat CPU
  setTimeout(() => {
    cancelAnimationFrame(splashRafId);
    canvas.width = 0; canvas.height = 0;
  }, 3500);
}

function initBgParticles() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isMobile = window.innerWidth < 600;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  // Debounce resize agar tidak spam
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  // Mobile: 20 partikel tanpa garis; Desktop: 35 dengan garis
  const cnt = isMobile ? 20 : 35;
  const particles = Array.from({length:cnt}, () => ({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2,
    r:Math.random()*1.5+.3, a:Math.random()*.4,
    color:['#38bdf8','#818cf8','#34d399'][Math.floor(Math.random()*3)]
  }));

  // Visibility API — pause saat tab tidak aktif
  let paused = false;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; });

  let lastTime = 0;
  function draw(ts) {
    requestAnimationFrame(draw);
    if (paused) return;
    // Throttle ke ~30fps untuk hemat baterai
    if (ts - lastTime < 33) return;
    lastTime = ts;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Garis koneksi hanya di desktop
    if (!isMobile) {
      particles.forEach((p,i) => {
        for (let j = i+1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx=p.x-p2.x, dy=p.y-p2.y;
          const dist = Math.sqrt(dx*dx+dy*dy);
          if(dist<100) {
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y);
            ctx.strokeStyle=`rgba(56,189,248,${.05*(1-dist/100)})`; ctx.lineWidth=.4; ctx.stroke();
          }
        }
      });
    }

    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.globalAlpha=p.a; ctx.fill(); ctx.globalAlpha=1;
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>canvas.width) p.vx*=-1;
      if(p.y<0||p.y>canvas.height) p.vy*=-1;
    });
  }
  requestAnimationFrame(draw);
}

// ===========================
// PROTEKSI KONTEN
// ===========================
(function() {

  // 1. Blokir klik kanan
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showToast('Klik kanan dinonaktifkan', 'error');
  });

  // 2. Blokir shortcut keyboard berbahaya
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+S (save), Ctrl+U (view source), Ctrl+C (copy),
    // Ctrl+A (select all), Ctrl+P (print), Ctrl+Shift+I/J/C (devtools)
    if (ctrl && ['s','u','p','a'].includes(k)) {
      e.preventDefault();
      showToast('Aksi ini dinonaktifkan', 'error');
      return;
    }
    if (ctrl && e.shiftKey && ['i','j','c','k'].includes(k)) {
      e.preventDefault();
      showToast('DevTools dinonaktifkan', 'error');
      return;
    }
    // F12 (devtools)
    if (e.key === 'F12') {
      e.preventDefault();
      showToast('DevTools dinonaktifkan', 'error');
      return;
    }
    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      showToast('Screenshot dinonaktifkan', 'error');
    }
  });

  // 3. Blokir drag & drop gambar
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });

  // 4. Blokir copy teks
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    showToast('Copy dinonaktifkan', 'error');
  });

  // 5. Blokir cut
  document.addEventListener('cut', (e) => {
    e.preventDefault();
  });

  // 6. Deteksi DevTools dibuka (cek perubahan ukuran window)
  let devtoolsOpen = false;
  const threshold = 160;
  setInterval(() => {
    const widthDiff  = window.outerWidth  - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if ((widthDiff > threshold || heightDiff > threshold) && !devtoolsOpen) {
      devtoolsOpen = true;
      showToast('DevTools terdeteksi!', 'error');
      // Blur konten saat devtools buka
      document.getElementById('app')?.style.setProperty('filter', 'blur(8px)');
    } else if (widthDiff <= threshold && heightDiff <= threshold && devtoolsOpen) {
      devtoolsOpen = false;
      document.getElementById('app')?.style.removeProperty('filter');
    }
  }, 1000);

  // 7. Blokir inspect element via touch hold (mobile)
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // 8. Watermark tak kasat mata di body (forensik)
  const wm = document.createElement('div');
  wm.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;opacity:0.015;display:flex;align-items:center;justify-content:center;font-size:4rem;font-weight:900;color:#fff;transform:rotate(-30deg);font-family:Orbitron,sans-serif;';
  wm.textContent = 'BOTIFY';
  document.body.appendChild(wm);

})();

// ===========================
// CHANGELOG
// ===========================
async function loadChangelog() {
  const wrap = document.getElementById('changelog-wrap');
  if (!wrap) return;
  try {
    const res = await fetch('changelog.json?v=' + Date.now());
    if (!res.ok) throw new Error('fail');
    const logs = await res.json();
    const labelMap = {
      new:    { cls: 'cl-label-new',    icon: 'fa-solid fa-star',          text: 'NEW'    },
      update: { cls: 'cl-label-update', icon: 'fa-solid fa-arrow-up-right-dots', text: 'UPDATE' },
      fix:    { cls: 'cl-label-fix',    icon: 'fa-solid fa-wrench',        text: 'FIX'    },
    };
    wrap.innerHTML = logs.map(log => {
      const lbl = labelMap[log.label] || labelMap.update;
      const items = (log.perubahan || []).map(p => `<li><i class="fa-solid fa-chevron-right cl-li-icon"></i>${escHtml(p)}</li>`).join('');
      return `
        <div class="changelog-card">
          <div class="changelog-card-header">
            <div class="cl-versi-wrap">
              <span class="cl-versi">${escHtml(log.versi)}</span>
              <span class="cl-label ${lbl.cls}"><i class="${lbl.icon}"></i> ${lbl.text}</span>
            </div>
            <span class="cl-tanggal"><i class="fa-regular fa-calendar"></i> ${escHtml(log.tanggal)}</span>
          </div>
          <ul class="cl-list">${items}</ul>
        </div>`;
    }).join('');
  } catch {
    wrap.innerHTML = '<p style="color:var(--text3);text-align:center;padding:16px">Changelog tidak tersedia</p>';
  }
}

// ===========================
// ANNOUNCEMENT POPUP
// ===========================
async function loadAnnouncement() {
  try {
    const res = await fetch('announcement.json?v=' + Date.now());
    if (!res.ok) throw new Error('fail');
    const ann = await res.json();
    if (!ann.aktif) return;

    // Cek apakah user sudah dismiss announcement ini
    const dismissed = localStorage.getItem('ann_dismissed');
    if (dismissed === ann.id) return;

    const overlay  = document.getElementById('announcement-overlay');
    const titleEl  = document.getElementById('ann-title');
    const msgEl    = document.getElementById('ann-message');
    const iconEl   = document.getElementById('ann-icon');
    const actionBtn= document.getElementById('ann-btn-action');
    const dismissBtn=document.getElementById('ann-btn-dismiss');
    const closeBtn = document.getElementById('ann-close');
    const box      = document.getElementById('ann-box');

    if (!overlay) return;

    titleEl.textContent = ann.judul;
    msgEl.textContent   = ann.pesan;
    actionBtn.textContent = ann.label_btn || 'Lihat';

    // Warna aksen
    if (ann.warna) {
      box.style.setProperty('--ann-accent', ann.warna);
      iconEl.style.color = ann.warna;
    }

    // Icon berdasarkan tipe
    const icons = { info: 'fa-bullhorn', warning: 'fa-triangle-exclamation', success: 'fa-circle-check', error: 'fa-circle-xmark' };
    iconEl.innerHTML = `<i class="fa-solid ${icons[ann.tipe] || 'fa-bullhorn'}"></i>`;

    // Tampilkan dengan delay kecil
    setTimeout(() => overlay.classList.remove('hidden'), 800);

    // Aksi tombol utama
    actionBtn.onclick = () => {
      overlay.classList.add('hidden');
      localStorage.setItem('ann_dismissed', ann.id);
      if (ann.aksi === 'changelog') {
        // Navigasi ke home dan scroll ke changelog
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-item[data-page="home"]')?.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-home')?.classList.add('active');
        setTimeout(() => {
          document.getElementById('changelog-header')?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      } else if (ann.aksi && ann.aksi.startsWith('http')) {
        window.open(ann.aksi, '_blank');
      }
    };

    const close = () => {
      overlay.classList.add('hidden');
      localStorage.setItem('ann_dismissed', ann.id);
    };
    dismissBtn.onclick = close;
    closeBtn.onclick   = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  } catch { /* silent */ }
}


/* ============================================================
   NEW SCRIPT NOTIFICATION
   ============================================================ */
async function loadNewScriptNotif() {
  try {
    const res = await fetch('new_script_notif.json?v=' + Date.now());
    if (!res.ok) throw new Error('fail');
    const nsn = await res.json();
    if (!nsn.aktif) return;

    // Cek apakah user sudah dismiss notif ini
    const dismissed = localStorage.getItem('nsn_dismissed');
    if (dismissed === nsn.id) return;

    const overlay   = document.getElementById('nsn-overlay');
    const box       = document.getElementById('nsn-box');
    const titleEl   = document.getElementById('nsn-title');
    const descEl    = document.getElementById('nsn-desc');
    const catEl     = document.getElementById('nsn-cat');
    const statusEl  = document.getElementById('nsn-status-badge');
    const tryBtn    = document.getElementById('nsn-btn-try');
    const closeBtn1 = document.getElementById('nsn-close');
    const closeBtn2 = document.getElementById('nsn-btn-close');
    const glowEl    = document.getElementById('nsn-glow');

    if (!overlay) return;

    titleEl.textContent  = nsn.nama_script || 'Script Baru';
    descEl.textContent   = nsn.deskripsi   || '';
    catEl.textContent    = nsn.kategori    || 'Script';

    // Status badge dengan warna
    const statusText = nsn.status || 'Free';
    statusEl.textContent = statusText;
    statusEl.className = 'nsn-badge-status';
    if (statusText.toLowerCase() === 'free') {
      statusEl.classList.add('nsn-status-free');
    } else if (statusText.toLowerCase() === 'premium') {
      statusEl.classList.add('nsn-status-premium');
    }

    // Load thumbnail dari scripts.json
    const thumbImg = document.getElementById('nsn-thumb-img');
    const thumbPh  = document.getElementById('nsn-thumb-ph');
    if (thumbImg && nsn.script_id) {
      try {
        const sRes = await fetch('scripts.json?v=' + Date.now());
        const sData = await sRes.json();
        const scriptData = (Array.isArray(sData) ? sData : []).find(s => s.id === nsn.script_id);
        if (scriptData && scriptData.thumbnail) {
          thumbImg.src = scriptData.thumbnail;
          thumbImg.onerror = () => { thumbImg.classList.add('hidden'); thumbPh.classList.remove('hidden'); };
        } else {
          thumbImg.classList.add('hidden');
          if (thumbPh) thumbPh.classList.remove('hidden');
        }
      } catch {
        thumbImg.classList.add('hidden');
        if (thumbPh) thumbPh.classList.remove('hidden');
      }
    } else if (thumbImg) {
      thumbImg.classList.add('hidden');
      if (thumbPh) thumbPh.classList.remove('hidden');
    }

    // Warna aksen dinamis
    const accent = nsn.warna || '#818cf8';
    box.style.setProperty('--nsn-accent', accent);
    if (glowEl) glowEl.style.background = accent;

    // Tampilkan dengan delay — tunggu announcement selesai dulu
    // Kalau announcement aktif & belum dismissed: tunggu lebih lama
    const annDismissed = localStorage.getItem('ann_dismissed');
    let delay = 800;
    try {
      const annRes = await fetch('announcement.json?v=' + Date.now());
      const annData = await annRes.json();
      if (annData.aktif && annDismissed !== annData.id) {
        delay = 3500; // tunggu user baca announcement dulu
      }
    } catch { /* pakai delay default */ }
    setTimeout(() => overlay.classList.remove('hidden'), delay);

    // Pasang badge "NEW" di script card yang bersangkutan
    setTimeout(() => {
      const card = document.querySelector(`.script-card[data-id="${nsn.script_id}"]`);
      if (card && !card.querySelector('.nsn-new-badge')) {
        const badge = document.createElement('span');
        badge.className = 'nsn-new-badge';
        badge.textContent = 'NEW';
        card.appendChild(badge);
      }

      // Pasang dot merah di nav item "home"
      const navHome = document.querySelector('.nav-item[data-page="home"]');
      if (navHome && !navHome.querySelector('.nsn-nav-dot')) {
        navHome.style.position = 'relative';
        const dot = document.createElement('span');
        dot.className = 'nsn-nav-dot';
        navHome.appendChild(dot);
      }
    }, 500);

    const close = () => {
      overlay.classList.add('hidden');
      localStorage.setItem('nsn_dismissed', nsn.id);
      // Hapus badge NEW dan nav dot setelah notif dilihat
      setTimeout(() => {
        const card = document.querySelector(`.script-card[data-id="${nsn.script_id}"]`);
        if (card) card.querySelector('.nsn-new-badge')?.remove();
        document.querySelector('.nav-item[data-page="home"] .nsn-nav-dot')?.remove();
      }, 300);
      // Toast konfirmasi
      showToast(`Script "${nsn.nama_script}" tersedia di halaman utama!`, 'info');
    };

    // Tombol "Coba Sekarang" → navigate ke card script lalu buka modal
    tryBtn.onclick = () => {
      close();

      // Pastikan page home aktif
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelector('.nav-item[data-page="home"]')?.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-home')?.classList.add('active');

      // Scroll ke scripts-grid lalu temukan card & highlight
      setTimeout(() => {
        const grid = document.getElementById('scripts-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
          const card = document.querySelector(`.script-card[data-id="${nsn.script_id}"]`);
          if (card) {
            // Scroll ke card yang tepat
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Efek highlight glow sementara
            card.classList.add('nsn-highlight');
            setTimeout(() => card.classList.remove('nsn-highlight'), 2200);

            // Buka modal setelah highlight
            setTimeout(() => card.click(), 600);
          }
        }, 400);
      }, 200);
    };

    closeBtn1.onclick = close;
    closeBtn2.onclick = close;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

  } catch { /* silent */ }
}

// ===========================
// RECENTLY VIEWED (localStorage, tanpa backend)
// ===========================
const RECENT_MAX = 8;

function trackRecentlyViewed(scriptId) {
  recentlyViewed = recentlyViewed.filter(id => id !== scriptId);
  recentlyViewed.unshift(scriptId);
  if (recentlyViewed.length > RECENT_MAX) recentlyViewed = recentlyViewed.slice(0, RECENT_MAX);
  localStorage.setItem('botify_recently_viewed', JSON.stringify(recentlyViewed));
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  const grid = document.getElementById('recent-grid');
  const header = document.getElementById('recent-header');
  if (!grid || !header) return;

  const items = recentlyViewed
    .map(id => allScripts.find(s => s.id === id))
    .filter(Boolean);

  grid.innerHTML = '';
  if (items.length === 0) { header.classList.add('hidden'); return; }
  header.classList.remove('hidden');
  items.forEach((s, i) => grid.appendChild(createCard(s, i)));
}

function initRecentClearBtn() {
  const btn = document.getElementById('recent-clear-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    recentlyViewed = [];
    localStorage.setItem('botify_recently_viewed', JSON.stringify(recentlyViewed));
    renderRecentlyViewed();
    showToast('Riwayat dilihat sudah dihapus', 'info');
  });
}

// ===========================
// LEADERBOARD SCRIPT TERPOPULER (berbasis field 'views', tanpa backend)
// ===========================
const LEADERBOARD_MAX = 10;
const LEADERBOARD_MEDALS = ['🥇', '🥈', '🥉'];

function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;

  const top = [...allScripts]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, LEADERBOARD_MAX);

  list.innerHTML = '';

  if (top.length === 0) {
    list.innerHTML = `<div class="leaderboard-empty">Belum ada data script</div>`;
    return;
  }

  top.forEach((s, i) => {
    const rank = i + 1;
    const rankDisplay = LEADERBOARD_MEDALS[i] || `#${rank}`;
    const row = document.createElement('div');
    row.className = 'leaderboard-item' + (rank <= 3 ? ' top3' : '');
    row.dataset.id = s.id;
    row.innerHTML = `
      <span class="leaderboard-rank">${rankDisplay}</span>
      <img class="leaderboard-thumb" src="${s.thumbnail}" alt="${escHtml(s.nama)}" loading="lazy"
           onerror="this.onerror=null;this.src='logo.png';" />
      <div class="leaderboard-info">
        <span class="leaderboard-name">${escHtml(s.nama)}</span>
        <span class="leaderboard-meta"><i class="fa-solid fa-eye"></i> ${formatViews(s.views)} views</span>
      </div>
      <i class="fa-solid fa-chevron-right leaderboard-arrow"></i>
    `;
    row.addEventListener('click', () => {
      const card = document.querySelector(`.script-card[data-id="${s.id}"]`);
      if (card) { card.click(); return; }
      openModal(s);
    });
    list.appendChild(row);
  });
}

function formatViews(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'rb';
  return String(num);
}

