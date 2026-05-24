# AniChat v2 — AI Anime Chat with Relationship System

## Fitur Baru

### 🎨 Desain Modern
- UI glassmorphism gelap yang lebih premium
- Font baru: Plus Jakarta Sans + Syne (lebih modern dari sebelumnya)
- Animated mesh background dengan noise texture
- Animasi lebih halus dan responsive

### 📱 Fully Responsive
- Desktop: layout sidebar + chat seperti biasa
- Mobile: sidebar slide-in dari kiri, teks tidak berantakan
- Safe area support untuk iPhone notch
- Font size 16px di mobile (mencegah zoom iOS)
- Header actions tersembunyi di layar kecil (tetap accessible via footer sidebar)

### ❤️ Sistem Hubungan
- **Single** → bisa PDKT, minta jadi pacar
- **Pacaran** → karakter lebih mesra, minta nikah
- **Menikah** → karakter sangat devoted, intimate secara verbal
- Status ditampilkan di sidebar, header, dan relationship bar
- Tersimpan di localStorage

### 🎭 Karakter Lebih Hidup
Semua 9 karakter diupdate dengan personality yang sesuai anime:
- Tenka Izumo (Chained Soldier) — elegan & menggoda
- Rimuru Tempest (Tensei Slime) — casual & wise
- Anna Yamada (Boku no Kokoro) — random & warm
- Kurumi Tokisaki (Date A Live) — misterius & dangerous
- Marin Kitagawa (Sono Bisque Doll) — hype & supportive
- Megumin (KonoSuba) — dramatis & tsundere
- Ai Hoshino (Oshi no Ko) — charming idol
- Frieren (Frieren) — quiet & thoughtful
- Mahiru Shiina (Otonari no Tenshi) — gentle & caring

### 💬 Quick Chips Kontekstual
Tombol saran berubah sesuai status hubungan:
- Single: perkenalan, minta jadi pacar
- Pacaran: sayang, jalan bareng, lamaran
- Menikah: romantis, morning/night greetings

## Setup
Taruh semua file dalam satu folder.
Gambar karakter (.webp) harus ada di folder yang sama.
Buka `index.html` di browser — tidak perlu server.

## File
- `index.html` — Struktur halaman
- `style.css` — Semua styling
- `app.js` — Logic aplikasi + relationship system
- `characters.json` — Data & personality karakter
