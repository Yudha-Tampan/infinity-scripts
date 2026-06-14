# Infinity Scripts — Changelog v2

Dokumentasi semua perubahan dari versi sebelumnya ke **v2**.

---

## Daftar Perubahan

### 1. Banner Diganti Gambar Penuh (Tanpa Teks)
Banner carousel sebelumnya menggunakan ikon dan elemen CSS. Sekarang setiap slide menampilkan **gambar saja** — tidak ada teks, tag, atau tombol di atas banner.

**Jumlah banner: 3 slide**

| Slide | File Gambar | Keterangan |
|-------|-------------|------------|
| Slide 1 | `banner1.jpg` | Gambar pertama, tampil saat halaman dibuka |
| Slide 2 | `banner2.jpg` | Gambar kedua, auto-slide setelah 5 detik |
| Slide 3 | `banner3.jpg` | Gambar ketiga |

Tiap slide menampilkan gambar yang **berbeda-beda**.

---

#### Ukuran Gambar Banner yang Direkomendasikan

```
Ukuran     : 780 × 420 piksel  (landscape)
Aspect ratio: 1.85 : 1
Format     : JPG atau WebP
Max size   : 250 KB per gambar
```

Banner ditampilkan dengan tinggi **210px** dan lebar **penuh layar** (max ~390px di mobile, lebih lebar di desktop).

Gambar di-crop dari **tengah** (`object-position: center center`) — jadi pastikan bagian penting dari gambar ada di tengah.

> **Punya gambar portrait (tinggi)?**
> Crop dulu jadi landscape 780×420px sebelum dipakai.
> Kalau pakai gambar portrait langsung, yang tampil hanya bagian tengah-atas saja.

---

#### Cara Mengganti Gambar Banner
1. Siapkan 3 gambar masing-masing ukuran **780×420px**
2. Rename menjadi `banner1.jpg`, `banner2.jpg`, `banner3.jpg`
3. Letakkan di folder yang sama dengan `index.html`
4. Tidak perlu ubah kode apapun

---

### 2. Hapus Indikasi AI
- Slide "AI Powered" dan label robot dihapus dari carousel
- Kategori "AI" di filter dihapus dari HTML
- Skill bar "AI Integration" diubah jadi "Bot Development"

---

### 3. Performa Lebih Cepat

| | Sebelumnya | Sesudah |
|---|---|---|
| Splash particles | 80 partikel | 25–40 (sesuai layar) |
| Background particles | 50 partikel | 20–35 (sesuai layar) |
| Garis koneksi partikel | Aktif semua device | Desktop only |
| Loop fps | ~60fps | Throttle ~30fps |
| Tab tidak aktif | Tetap jalan | Pause otomatis |
| Splash particles stop | Tidak pernah | Stop setelah 3.5 detik |

---

### 4. Scroll Stabil
- `overscroll-behavior-y: contain` → stop bouncing effect
- Scroll listener pakai `requestAnimationFrame` + throttle
- Touch swipe banner deteksi arah vertikal vs horizontal
- Semua touch listener pakai `{ passive: true }`

---

## Struktur File

```
infinityscript_v2/
├── index.html              ← Halaman utama
├── style.css               ← Stylesheet
├── script.js               ← JavaScript
├── scripts.json            ← Data daftar script
├── event.json              ← Data event & promosi
├── changelog.json          ← Data update log
├── announcement.json       ← Data popup pengumuman
├── new_script_notif.json   ← Data notifikasi script baru
├── logo.png                ← Logo website
├── event-banner.png        ← Banner halaman Event (tetap)
├── banner1.jpg             ← ⭐ Gambar banner slide 1 (perlu ditambahkan)
├── banner2.jpg             ← ⭐ Gambar banner slide 2 (perlu ditambahkan)
├── banner3.jpg             ← ⭐ Gambar banner slide 3 (perlu ditambahkan)
├── lagu.mp3                ← File musik (taruh sendiri)
├── owner.jpg               ← Foto profil owner
└── README.md               ← File ini
```

> File `banner1.jpg`, `banner2.jpg`, `banner3.jpg` **belum disertakan**.
> Sementara belum ada, slide tampil dengan background gelap — tidak error.
