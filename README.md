# 🚀 INFINITY SCRIPTS — Panduan Owner

## 📁 Struktur File
```
infinity-scripts/
├── index.html          ← Halaman utama (jangan diubah)
├── style.css           ← Tampilan website (jangan diubah)
├── script.js           ← Fungsi website (jangan diubah)
├── scripts.json        ← DATA SCRIPT (EDIT INI!)
├── owner.jpg           ← Foto profil owner (ganti dengan foto kamu)
└── [nama-gambar].jpg   ← Thumbnail script
```

---

## ✏️ Cara Edit Data Script (scripts.json)

Buka file `scripts.json` dan tambahkan/hapus script sesuai kebutuhan.

### Format setiap script:
```json
{
  "id": 1,
  "nama": "Nama Script",
  "kategori": "MD",
  "deskripsi": "Deskripsi singkat script kamu",
  "thumbnail": "namafile.jpg",
  "status": "Free",
  "rating": "4.9",
  "views": 1000,
  "trending": true,
  "baru": false,
  "link": "https://link-download.com/..."
}
```

### Keterangan Field:
| Field | Isi | Contoh |
|-------|-----|--------|
| `id` | Nomor unik (jangan sama) | 1, 2, 3... |
| `nama` | Nama script | "Infinity MD" |
| `kategori` | Salah satu kategori | "MD", "Bug", "AI"... |
| `deskripsi` | Penjelasan script | "Bot WA canggih..." |
| `thumbnail` | Nama file gambar | "mybot.jpg" |
| `status` | Free atau Premium | "Free" / "Premium" |
| `rating` | Nilai 1-5 | "4.9" |
| `views` | Jumlah penonton awal | 5000 |
| `trending` | Tampil di trending? | true / false |
| `baru` | Tampilkan badge NEW? | true / false |
| `link` | Link download/beli | "https://..." |

### Kategori yang tersedia:
- `MD` — Multi Device Bot
- `Bug` — Script Bug
- `Store` — Toko Otomatis
- `Pushkontak` — Blast Kontak
- `JPM` — JPM Script
- `Pairing` — Auto Pairing
- `Panel` — Web Panel
- `Downloader` — Downloader
- `AI` — AI Bot
- `Game` — Game Bot
- `Tools` — Tools Script

---

## 🖼️ Cara Ganti Thumbnail

1. Siapkan gambar script kamu (jpg/png/webp)
2. Taruh di folder yang sama dengan `index.html`
3. Di `scripts.json`, isi field `thumbnail` dengan nama filenya:
   ```json
   "thumbnail": "botku.jpg"
   ```

---

## 👤 Cara Ganti Profil Owner

Edit di `index.html` (cari teks di bawah ini dan ganti):

- **Foto**: Ganti file `owner.jpg` dengan foto kamu (nama file harus sama)
- **Nama**: Cari `Infinity Owner` → ganti nama kamu
- **Role**: Cari `Script Developer` → ganti sesuai profesimu
- **Bio**: Cari paragraf bio → ganti deskripsi kamu
- **WhatsApp**: Ganti `6281234567890` dengan nomor WA kamu
- **Telegram**: Ganti `@infinityscripts` dengan username TG kamu
- **YouTube/GitHub**: Ganti link sesuai milikmu

---

## 🌐 Cara Upload ke Hosting

### Netlify / Vercel (Gratis):
1. Buka netlify.com atau vercel.com
2. Drag & drop seluruh folder ke dashboard
3. Website langsung online!

### GitHub Pages:
1. Buat repository baru di GitHub
2. Upload semua file
3. Settings → Pages → Deploy from main branch

### cPanel / Hosting Biasa:
1. Upload semua file ke folder `public_html`
2. Akses via domain kamu

---

## ⚙️ Tips Tambahan

- **Tambah script baru**: Salin satu blok `{...}` di JSON, ubah semua isinya, ganti `id` dengan angka baru
- **Hapus script**: Hapus blok `{...}` dari JSON
- **Urutan**: Script tampil sesuai urutan di JSON
- **Gambar tidak muncul**: Pastikan nama file sama persis (case-sensitive)
- **Edit di HP**: Gunakan aplikasi seperti **QuickEdit** atau **Acode**

---

## 🔗 Kontak Support
- Ubah di `index.html` sesuai kontak kamu sendiri

---

**Dibuat dengan ❤️ oleh Infinity Scripts Team**
