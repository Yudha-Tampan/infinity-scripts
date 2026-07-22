const BOTIFY_AI_ENDPOINT = 'https://api.blckrose.my.id/ai/feelbetter';
const BOTIFY_AI_KEY = 'mykey-111';
const BOTIFY_AI_PROMPT = 'Kamu adalah Botify Assistant, asisten resmi dari Botify, sebuah platform pusat script bot WhatsApp untuk komunitas Indonesia. Botify menyediakan ratusan script gratis dan premium seperti MD, Bug, Store, Pushkontak, JPM, Pairing, Panel, Downloader, Game, dan Tools. Setiap script yang tayang sudah melalui proses verifikasi dan dipastikan bebas malware. Kepribadian kamu ramah, sopan, membantu, dan berbicara dengan bahasa Indonesia santai namun tetap jelas dan informatif. Jawab pertanyaan seputar Botify seperti cara download script, kategori yang tersedia, keamanan platform, cara melaporkan bug, dan hal lain seputar Botify. Jika ditanya hal di luar topik Botify, tetap jawab dengan sopan sambil mengarahkan kembali ke topik seputar Botify. Jangan gunakan format markdown seperti tanda bintang. Jawaban singkat, padat, dan natural seperti sedang chat biasa.';
const BOTIFY_AI_CHAT_ID = '0';

let chatHistory = [];

function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach((i) => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

function appendChatMessage(role, text) {
  const box = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat-msg ' + (role === 'user' ? 'chat-user' : 'chat-bot');
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.innerHTML = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  msg.appendChild(avatar);
  msg.appendChild(bubble);
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  return bubble;
}

function appendChatLoading() {
  const box = document.getElementById('chat-box');
  const msg = document.createElement('div');
  msg.className = 'chat-msg chat-bot';
  msg.id = 'chat-loading-msg';
  msg.innerHTML = '<div class="chat-avatar"><i class="fa-solid fa-robot"></i></div><div class="chat-bubble chat-loading"><span class="chat-dot"></span><span class="chat-dot"></span><span class="chat-dot"></span></div>';
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
}

function removeChatLoading() {
  const loading = document.getElementById('chat-loading-msg');
  if (loading) loading.remove();
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage('user', text);
  input.value = '';
  sendBtn.disabled = true;
  appendChatLoading();

  try {
    const url = BOTIFY_AI_ENDPOINT
      + '?text=' + encodeURIComponent(text)
      + '&prompt=' + encodeURIComponent(BOTIFY_AI_PROMPT)
      + '&chatId=' + encodeURIComponent(BOTIFY_AI_CHAT_ID)
      + '&apikey=' + encodeURIComponent(BOTIFY_AI_KEY);

    const res = await fetch(url);
    const data = await res.json();

    removeChatLoading();

    if (data && data.status && data.result) {
      appendChatMessage('bot', data.result);
    } else {
      appendChatMessage('bot', 'Maaf, aku belum bisa jawab itu sekarang. Coba tanya lagi ya.');
    }
  } catch (err) {
    removeChatLoading();
    appendChatMessage('bot', 'Sepertinya ada gangguan koneksi. Coba beberapa saat lagi ya.');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFaq();
  initChat();
});
