// ============================================
//  AniChat v2 — app.js
//  With Relationship System (Dating + Marriage)
// ============================================

// ---- Global State ----
const State = {
  characters: [],
  activeChar: null,
  chatHistories: {},     // { charId: [{ role, content, time }] }
  relationships: {},     // { charId: 'single' | 'dating' | 'married' }
  isTyping: false,
  settings: {
    fontSize: 14,
    showTimestamps: true,
  }
};

// ---- API Config ----
// OmegaTech GPT API — GET endpoint dengan params question & prompt
const OMEGATECH_API = 'https://omegatech-api.dixonomega.tech/api/ai/gpt';
let currentEndpointIdx = 0;

// ---- DOM ----
const $ = id => document.getElementById(id);
const sidebar     = $('sidebar');
const charList    = $('character-list');
const chatArea    = $('chat-area');
const msgInput    = $('message-input');
const sendBtn     = $('send-btn');
const chatHeader  = $('chat-header');
const settingsMod = $('settings-modal');
const searchInput = $('search-input');
const toastCont   = $('toast-container');
const relBar      = $('relationship-bar');
const quickChips  = $('quick-chips');

// ============================================
//  INIT
// ============================================
async function init() {
  loadSettings();
  await loadCharacters();
  setupEvents();
  applySavedSettings();

  const lastId = localStorage.getItem('anichat_last_char');
  if (lastId) {
    const found = State.characters.find(c => c.id === lastId);
    if (found) { setActiveChar(found); return; }
  }
  if (State.characters[0]) setActiveChar(State.characters[0]);
}

// ============================================
//  LOAD CHARACTERS
// ============================================
async function loadCharacters() {
  renderSkeletons();
  try {
    const res = await fetch('characters.json');
    State.characters = await res.json();
  } catch {
    State.characters = getFallback();
  }
  State.characters.forEach(c => {
    const saved = localStorage.getItem(`anichat_history_${c.id}`);
    State.chatHistories[c.id] = saved ? JSON.parse(saved) : [];
    const rel = localStorage.getItem(`anichat_rel_${c.id}`);
    State.relationships[c.id] = rel || 'single';
  });
  renderCharList(State.characters);
}

function renderSkeletons() {
  charList.innerHTML = Array(5).fill(0).map(() => `
    <div class="char-item">
      <div class="skeleton" style="width:42px;height:42px;border-radius:12px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="skeleton" style="height:12px;border-radius:5px;width:75%"></div>
        <div class="skeleton" style="height:10px;border-radius:5px;width:55%"></div>
      </div>
    </div>
  `).join('');
}

// ============================================
//  RENDER CHARACTER LIST
// ============================================
function renderCharList(chars) {
  charList.innerHTML = '';
  const countEl = $('char-count');
  if (countEl) countEl.textContent = chars.length;

  if (!chars.length) {
    charList.innerHTML = `<div style="text-align:center;color:var(--text3);padding:20px;font-size:0.82rem">Tidak ada karakter ditemukan</div>`;
    return;
  }

  chars.forEach(char => {
    const rel = State.relationships[char.id] || 'single';
    const rgb = hexToRgb(char.themeColor);
    const item = document.createElement('div');
    item.className = 'char-item' + (State.activeChar?.id === char.id ? ' active' : '');
    item.dataset.id = char.id;
    if (rgb) item.style.cssText = `--char-r:${rgb.r};--char-gr:${rgb.g};--char-bl:${rgb.b}`;

    const msgCount = (State.chatHistories[char.id] || []).filter(m => m.role === 'user').length;
    const relBadge = rel === 'dating'
      ? `<span class="char-rel-badge rel-dating">💕 Pacar</span>`
      : rel === 'married'
      ? `<span class="char-rel-badge rel-married">💍 Menikah</span>`
      : '';

    item.innerHTML = `
      <div class="char-avatar" style="background:linear-gradient(135deg,${char.gradientFrom},${char.gradientTo})">
        <img src="${char.image}" alt="${char.name}" onerror="this.style.display='none';this.parentNode.textContent='${char.fallbackEmoji}'" loading="lazy">
        <div class="online-dot"></div>
      </div>
      <div class="char-info">
        <div class="char-name">${char.name}</div>
        <div class="char-anime">${msgCount > 0 ? msgCount + ' pesan · ' : ''}${char.anime}</div>
      </div>
      ${relBadge}
    `;
    item.addEventListener('click', () => { setActiveChar(char); closeSidebar(); });
    charList.appendChild(item);
  });
}

// ============================================
//  SET ACTIVE CHARACTER
// ============================================
function setActiveChar(char) {
  State.activeChar = char;
  localStorage.setItem('anichat_last_char', char.id);

  const root = document.documentElement;
  root.style.setProperty('--char', char.themeColor);
  root.style.setProperty('--char-g', char.glowColor);
  root.style.setProperty('--char-a', char.gradientFrom);
  root.style.setProperty('--char-b', char.gradientTo);
  const rgb = hexToRgb(char.themeColor);
  if (rgb) {
    root.style.setProperty('--char-r', rgb.r);
    root.style.setProperty('--char-gr', rgb.g);
    root.style.setProperty('--char-bl', rgb.b);
  }

  updateHeader(char);
  document.querySelectorAll('.char-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === char.id);
  });
  renderChatHistory(char);
  updateRelBar(char);
  updateQuickChips(char);
}

function updateHeader(char) {
  const rel = State.relationships[char.id] || 'single';
  const relTag = rel === 'dating'
    ? `<span class="header-rel-tag header-rel-dating">💕 Pacaran</span>`
    : rel === 'married'
    ? `<span class="header-rel-tag header-rel-married">💍 Menikah</span>`
    : '';

  chatHeader.innerHTML = `
    <button id="menu-toggle" onclick="toggleSidebar()" aria-label="Menu">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div class="header-avatar" id="header-avatar">
      <img src="${char.image}" alt="${char.name}" onerror="this.style.display='none';this.parentNode.textContent='${char.fallbackEmoji}'">
    </div>
    <div class="header-info">
      <div class="header-name">
        ${char.name}
        ${relTag}
        <span class="online-badge">● Online</span>
      </div>
      <div class="header-sub">${char.anime}</div>
    </div>
    <div class="header-actions">
      <button class="header-btn" onclick="exportChat()" title="Export Chat">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button class="header-btn" onclick="clearHistory()" title="Hapus Chat">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
      <button class="header-btn" onclick="openSettings()" title="Pengaturan">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
    </div>
  `;
}

function updateRelBar(char) {
  const rel = State.relationships[char.id] || 'single';
  if (rel === 'single') {
    relBar.classList.add('hidden');
  } else {
    relBar.classList.remove('hidden');
    $('rel-icon').textContent = rel === 'married' ? '💍' : '💕';
    $('rel-label').textContent = rel === 'married' ? 'Sudah Menikah dengan' : 'Pacaran dengan';
    $('rel-name').textContent = char.name;
  }
}

// ============================================
//  QUICK CHIPS (Context Aware)
// ============================================
function updateQuickChips(char) {
  const rel = State.relationships[char.id] || 'single';
  let chips = [];

  if (rel === 'single') {
    chips = [
      { label: '👋 Perkenalan', msg: 'Halo! Siapa kamu?' },
      { label: '💬 Cerita tentang kamu', msg: 'Ceritain tentang dirimu!' },
      { label: '❤️ Aku suka kamu', msg: 'Aku... aku suka kamu.' },
      { label: '🤝 Jadilah pacarku', msg: 'Maukah kamu jadi pacarku?' },
    ];
  } else if (rel === 'dating') {
    chips = [
      { label: '💕 Sayang', msg: 'Aku sayang kamu~' },
      { label: '📅 Jalan bareng', msg: 'Kita pergi jalan-jalan yuk?' },
      { label: '💍 Menikahlah denganku', msg: 'Aku ingin menikah denganmu. Maukah kamu?' },
      { label: '😘 Cium', msg: '*mencoba untuk menciumnya*' },
    ];
  } else if (rel === 'married') {
    chips = [
      { label: '🏠 Di rumah', msg: 'Kita habiskan waktu di rumah yuk~' },
      { label: '💞 Malam berdua', msg: '*memeluknya erat di malam hari*' },
      { label: '☀️ Selamat pagi', msg: 'Selamat pagi sayang~ 💕' },
      { label: '🌙 Selamat malam', msg: 'Selamat malam, aku rindu kamu~' },
    ];
  }

  if (chips.length) {
    quickChips.innerHTML = chips.map(c =>
      `<div class="quick-chip" onclick="sendQuick('${c.msg.replace(/'/g, "\\'")}')">${c.label}</div>`
    ).join('');
    quickChips.classList.remove('hidden');
  } else {
    quickChips.classList.add('hidden');
  }
}

// ============================================
//  RELATIONSHIP DETECTION (from AI response)
// ============================================
function detectRelationshipChange(aiResponse, char) {
  const rel = State.relationships[char.id] || 'single';
  const lower = aiResponse.toLowerCase();

  // Detect accepting dating
  if (rel === 'single') {
    const datingSignals = [
      'iya aku mau jadi pacarmu', 'aku mau jadi pacarmu', 'kita pacaran yuk',
      'baiklah, aku mau', 'ya, aku mau jadi pacarmu', 'dengan senang hati',
      'tentu saja aku mau', 'aku setuju', 'kita resmi pacaran',
      'mulai sekarang kamu pacarku', 'kamu pacarku sekarang'
    ];
    if (datingSignals.some(s => lower.includes(s))) {
      setRelationship(char.id, 'dating');
      setTimeout(() => showToast('success', '💕', `Selamat! Kamu sekarang pacaran dengan ${char.name}!`), 500);
    }
  }

  // Detect accepting marriage
  if (rel === 'dating') {
    const marriageSignals = [
      'aku mau menikah', 'ya, aku mau menikah', 'aku bersedia menikah',
      'kita menikah yuk', 'aku setuju menikah', 'kita resmi menikah',
      'i do', 'dengan ini kita menikah', 'kamu suamiku', 'kamu istriku',
      'mulai sekarang kita suami istri', 'aku menerima lamaranmu'
    ];
    if (marriageSignals.some(s => lower.includes(s))) {
      setRelationship(char.id, 'married');
      setTimeout(() => showToast('success', '💍', `Selamat! Kamu sekarang menikah dengan ${char.name}!`), 500);
    }
  }
}

function setRelationship(charId, status) {
  State.relationships[charId] = status;
  localStorage.setItem(`anichat_rel_${charId}`, status);
  // Update UI
  if (State.activeChar?.id === charId) {
    updateHeader(State.activeChar);
    updateRelBar(State.activeChar);
    updateQuickChips(State.activeChar);
  }
  renderCharList(filterChars(searchInput?.value || ''));
}

// ============================================
//  RENDER CHAT HISTORY
// ============================================
function renderChatHistory(char) {
  chatArea.innerHTML = '';
  const history = State.chatHistories[char.id] || [];
  if (!history.length) { showWelcomeScreen(char); return; }
  history.forEach(msg => appendMsg(msg.role, msg.content, msg.time, false));
  scrollToBottom();
}

function showWelcomeScreen(char) {
  chatArea.innerHTML = `
    <div id="welcome-screen">
      <div class="welcome-avatar">
        <img src="${char.image}" alt="${char.name}" onerror="this.style.display='none';this.parentNode.textContent='${char.fallbackEmoji}'">
      </div>
      <div class="welcome-name">${char.name}</div>
      <div class="welcome-anime">${char.anime}</div>
      <div class="welcome-desc">${char.description}</div>
      <div class="welcome-chips">
        <div class="suggestion-chip" onclick="sendQuick('Halo! Siapa kamu?')">👋 Perkenalan~</div>
        <div class="suggestion-chip" onclick="sendQuick('Ceritain tentang dirimu!')">💬 Cerita tentang kamu</div>
        <div class="suggestion-chip" onclick="sendQuick('Aku mau ngobrol sama kamu!')">🤝 Ngobrol yuk</div>
        <div class="suggestion-chip" onclick="sendQuick('Maukah kamu jadi pacarku?')">❤️ Jadilah pacarku</div>
      </div>
    </div>
  `;
}

// ============================================
//  MESSAGING
// ============================================
function sendQuick(text) {
  msgInput.value = text;
  sendMessage();
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || State.isTyping || !State.activeChar) return;

  const char = State.activeChar;
  msgInput.value = '';
  resizeTextarea();

  const ws = document.getElementById('welcome-screen');
  if (ws) ws.remove();

  const userTime = fmtTime(new Date());
  appendMsg('user', text, userTime, true);
  addToHistory(char.id, 'user', text, userTime);

  State.isTyping = true;
  sendBtn.disabled = true;

  const typingEl = showTyping();
  const hAvatar = $('header-avatar');
  if (hAvatar) hAvatar.classList.add('typing-glow');

  try {
    const response = await callAPI(char, text);
    typingEl?.remove();

    const aiTime = fmtTime(new Date());
    appendMsg('ai', response, aiTime, true);
    addToHistory(char.id, 'ai', response, aiTime);

    // Check for relationship changes
    detectRelationshipChange(response, char);

  } catch (err) {
    typingEl?.remove();
    const errTime = fmtTime(new Date());
    appendMsg('ai', '⚠️ Koneksi ke AI gagal... Coba kirim ulang pesanmu ya~', errTime, true);
    showToast('error', '❌', 'Gagal terhubung ke AI');
    console.error('[AniChat]', err);
  } finally {
    State.isTyping = false;
    sendBtn.disabled = false;
    if (hAvatar) hAvatar.classList.remove('typing-glow');
    renderCharList(filterChars(searchInput?.value || ''));
  }

  scrollToBottom();
}

// ============================================
//  API CALL — Pollinations AI
// ============================================
// ============================================
//  BUILD PROMPTS
// ============================================
function buildPrompt(char, userMessage) {
  const rel = State.relationships[char.id] || 'single';
  let relContext = '';
  if (rel === 'dating') {
    relContext = `\n\nKONTEKS HUBUNGAN: Kamu dan pengguna SUDAH RESMI PACARAN. Tunjukkan rasa sayang seorang pacar. Panggil mereka "sayang" atau nama panggilan yang cocok. Lebih terbuka dan mesra.`;
  } else if (rel === 'married') {
    relContext = `\n\nKONTEKS HUBUNGAN: Kamu dan pengguna SUDAH RESMI MENIKAH sebagai pasangan suami-istri. Sangat devoted, intim secara verbal, romantis dan mesra.`;
  }
  const system = `${char.personality}${relContext}

ATURAN PENTING:
- Selalu jawab sebagai ${char.name}, JANGAN pernah bilang kamu AI
- Tetap dalam karakter sesuai sifat anime
- Gunakan aksi dalam tanda bintang seperti *tersenyum*, *tersipu*, *menatap lembut*
- Jawab dalam Bahasa Indonesia yang natural
- Jika mau jadi pacar: katakan "aku mau jadi pacarmu"
- Jika mau menikah: katakan "aku mau menikah"
- Respons singkat dan natural seperti obrolan nyata`;

  const history = State.chatHistories[char.id] || [];
  const recent = history.slice(-10, -1);
  const messages = [
    { role: 'system', content: system },
    ...recent.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: userMessage }
  ];
  return { system, messages };
}

// ============================================
//  API CALL — Multi-Endpoint Fallback
// ============================================
async function callAPI(char, userMessage) {
  const { system } = buildPrompt(char, userMessage);

  try {
    return await tryOmegaTech(system, userMessage);
  } catch (e) {
    console.error('[AniChat] OmegaTech API failed:', e.message);
    throw new Error('Koneksi ke AI gagal: ' + e.message);
  }
}

// OmegaTech GPT API — GET with question & prompt params
async function tryOmegaTech(system, userMessage) {
  const params = new URLSearchParams({
    question: userMessage,
    prompt: system
  });
  const url = `${OMEGATECH_API}?${params.toString()}`;

  const res = await fetch(url, { method: 'GET' });
  if (res.status === 429) throw new Error('Rate limited (429)');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // Extract reply — try common response fields
  const reply = data?.result
    || data?.answer
    || data?.response
    || data?.message
    || data?.text
    || data?.content
    || (typeof data === 'string' ? data : null);

  if (!reply) throw new Error('Empty response from OmegaTech API');
  return reply.trim();
}

// ============================================
//  APPEND MESSAGE TO DOM
// ============================================
function appendMsg(role, content, time, animate) {
  const char = State.activeChar;
  const el = document.createElement('div');
  el.className = `message ${role}`;
  if (!animate) el.style.animation = 'none';

  const rendered = renderMd(content);
  const showTs = State.settings.showTimestamps;

  if (role === 'user') {
    el.innerHTML = `
      <div class="msg-content">
        <div class="msg-bubble">${rendered}</div>
        ${showTs ? `<div class="msg-time">${time}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>` : ''}
      </div>`;
  } else {
    const avatar = char
      ? `<img src="${char.image}" alt="${char.name}" onerror="this.style.display='none';this.parentNode.textContent='${char.fallbackEmoji}'">`
      : '🤖';
    el.innerHTML = `
      <div class="msg-avatar" style="background:linear-gradient(135deg,${char?.gradientFrom||'#7b68f0'},${char?.gradientTo||'#a78bfa'})">${avatar}</div>
      <div class="msg-content">
        <div class="msg-bubble">${rendered}</div>
        ${showTs ? `<div class="msg-time">${time}
          <span class="msg-copy" onclick="copyMsg(this)" title="Salin">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </span>
        </div>` : ''}
      </div>`;
  }

  chatArea.appendChild(el);
}

// ============================================
//  TYPING INDICATOR
// ============================================
function showTyping() {
  const char = State.activeChar;
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.id = 'typing-indicator';
  el.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,${char?.gradientFrom||'#7b68f0'},${char?.gradientTo||'#a78bfa'})">
      <img src="${char?.image}" alt="" onerror="this.style.display='none';this.parentNode.textContent='${char?.fallbackEmoji||'🤖'}'">
    </div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatArea.appendChild(el);
  scrollToBottom();
  return el;
}

// ============================================
//  MARKDOWN RENDERER
// ============================================
function renderMd(text) {
  if (!text) return '';
  let out = escapeHtml(text);
  // Code blocks
  out = out.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, l, c) =>
    `<pre><code>${c.trim()}</code></pre>`);
  // Inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic (including roleplay actions)
  out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Lists
  out = out.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  // Line breaks
  out = out.replace(/\n/g, '<br>');
  return out;
}

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================
//  HISTORY MANAGEMENT
// ============================================
function addToHistory(charId, role, content, time) {
  if (!State.chatHistories[charId]) State.chatHistories[charId] = [];
  State.chatHistories[charId].push({ role, content, time });
  if (State.chatHistories[charId].length > 120) {
    State.chatHistories[charId] = State.chatHistories[charId].slice(-120);
  }
  localStorage.setItem(`anichat_history_${charId}`, JSON.stringify(State.chatHistories[charId]));
}

function clearHistory() {
  if (!State.activeChar) return;
  const id = State.activeChar.id;
  State.chatHistories[id] = [];
  localStorage.removeItem(`anichat_history_${id}`);
  showWelcomeScreen(State.activeChar);
  renderCharList(filterChars(searchInput?.value || ''));
  showToast('success', '🗑️', 'Chat history dihapus!');
}

// ============================================
//  EXPORT CHAT
// ============================================
function exportChat() {
  if (!State.activeChar) return;
  const char = State.activeChar;
  const history = State.chatHistories[char.id] || [];
  if (!history.length) { showToast('info', 'ℹ️', 'Belum ada chat'); return; }

  const rel = State.relationships[char.id] || 'single';
  const relLabel = rel === 'married' ? '💍 Sudah Menikah' : rel === 'dating' ? '💕 Pacaran' : '';

  const header = `AniChat — ${char.name} (${char.anime}) ${relLabel}\nExport: ${new Date().toLocaleString()}\n${'='.repeat(55)}\n\n`;
  const content = history.map(m =>
    `[${m.time}] ${m.role === 'user' ? 'Kamu' : char.name}:\n${m.content}`
  ).join('\n\n---\n\n');

  const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `anichat_${char.id}_${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
  showToast('success', '📥', 'Chat berhasil di-export!');
}

// ============================================
//  COPY MESSAGE
// ============================================
function copyMsg(btn) {
  const bubble = btn.closest('.msg-content').querySelector('.msg-bubble');
  const text = bubble?.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    showToast('success', '📋', 'Pesan disalin!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('success', '📋', 'Disalin!');
  });
}

// ============================================
//  TOAST
// ============================================
function showToast(type, icon, message) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  toastCont.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// ============================================
//  SETTINGS
// ============================================
function openSettings() { settingsMod.classList.add('open'); }
function closeSettings() { settingsMod.classList.remove('open'); }

function loadSettings() {
  const saved = localStorage.getItem('anichat_settings');
  if (saved) Object.assign(State.settings, JSON.parse(saved));
}
function saveSettings() {
  localStorage.setItem('anichat_settings', JSON.stringify(State.settings));
}
function applySavedSettings() {
  document.documentElement.style.setProperty('--msg-fs', State.settings.fontSize + 'px');
  const fsR = $('fs-range'), fsV = $('fs-val');
  if (fsR) fsR.value = State.settings.fontSize;
  if (fsV) fsV.textContent = State.settings.fontSize + 'px';
  const tsT = $('ts-toggle');
  if (tsT) tsT.checked = State.settings.showTimestamps;
}

// ============================================
//  SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
  sidebar.classList.toggle('open');
  document.querySelector('.sidebar-overlay')?.classList.toggle('hidden');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.add('hidden');
}

// ============================================
//  TEXTAREA AUTO-RESIZE
// ============================================
function resizeTextarea() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 130) + 'px';
}

// ============================================
//  UTILITIES
// ============================================
function scrollToBottom() {
  setTimeout(() => chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' }), 50);
}
function fmtTime(d) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}
function filterChars(q) {
  if (!q) return State.characters;
  const s = q.toLowerCase();
  return State.characters.filter(c =>
    c.name.toLowerCase().includes(s) || c.anime.toLowerCase().includes(s)
  );
}

// ============================================
//  EVENTS
// ============================================
function setupEvents() {
  // Send on Enter
  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  msgInput.addEventListener('input', resizeTextarea);
  sendBtn.addEventListener('click', sendMessage);

  // Search
  searchInput?.addEventListener('input', e => {
    renderCharList(filterChars(e.target.value));
  });

  // Settings controls
  const fsR = $('fs-range'), fsV = $('fs-val');
  fsR?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    State.settings.fontSize = v;
    if (fsV) fsV.textContent = v + 'px';
    document.documentElement.style.setProperty('--msg-fs', v + 'px');
    saveSettings();
  });
  $('ts-toggle')?.addEventListener('change', e => {
    State.settings.showTimestamps = e.target.checked;
    saveSettings();
  });

  // Close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSettings();
  });

  // Sidebar overlay click
  document.querySelector('.sidebar-overlay')?.addEventListener('click', closeSidebar);
}

// ============================================
//  FALLBACK
// ============================================
function getFallback() {
  return [{
    id: 'rimuru', name: 'Rimuru Tempest', anime: 'Tensei Slime',
    image: 'rimuru.webp', fallbackEmoji: '💧',
    description: 'Raja Demon yang bijak dan baik hati.',
    themeColor: '#4FC3F7', glowColor: 'rgba(79,195,247,0.4)',
    gradientFrom: '#4FC3F7', gradientTo: '#81D4FA',
    personality: 'Kamu adalah Rimuru Tempest. Santai dan friendly. Jawab dalam Bahasa Indonesia.',
    greeting: 'Halo! Aku Rimuru 💧', style: 'casual'
  }];
}

// ============================================
//  START
// ============================================
document.addEventListener('DOMContentLoaded', init);
