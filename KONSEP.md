# 🌯 WebKasir Kebab — Konsep Aplikasi

## 🎯 Tujuan
Aplikasi kasir pribadi berbasis web untuk memudahkan pencatatan pesanan,
penghitungan total harga, dan uang kembalian saat berjualan kebab —
tanpa perlu aplikasi kasir berbayar atau ribet.

---

## 🛠️ Tech Stack

| Komponen        | Teknologi              | Alasan                                                              |
|-----------------|------------------------|---------------------------------------------------------------------|
| Struktur        | HTML5                  | Ringan, langsung jalan di browser, tidak perlu install apapun       |
| Logika          | Vanilla JavaScript     | Cukup untuk kalkulasi real-time, tidak butuh framework berat        |
| Tampilan        | CSS3 (Vanilla)         | Fleksibel, bisa desain sendiri, tidak butuh build tools             |
| Penyimpanan     | LocalStorage browser   | Data menu tersimpan lokal, tidak butuh database/server              |
| Hosting         | GitHub Pages (GRATIS)  | Gratis selamanya, cukup push ke GitHub langsung online              |

Kenapa tidak pakai backend/database?
Karena ini untuk 1 pengguna (kamu sendiri). Tidak butuh multi-user,
tidak butuh laporan jangka panjang di server. Cukup browser saja.

---

## 🌐 Rencana Hosting: GitHub Pages

Kenapa GitHub Pages?
- Gratis selamanya
- Tidak perlu bayar domain/server
- Cukup push file ke GitHub, langsung online
- Bisa dibuka dari HP/tablet saat berjualan

Langkah deploy:
1. Buat repo di GitHub (contoh: kasir-kebab)
2. Upload semua file HTML/CSS/JS ke repo tersebut
3. Buka Settings -> Pages -> pilih branch main -> Save
4. Website otomatis live di:
   https://[username-github].github.io/kasir-kebab/
5. Bookmark di HP -> buka tiap kali berjualan

---

## 📱 Fitur Aplikasi

### 1. Panel Menu
- Semua menu tampil sebagai kartu besar (mudah di-tap pakai jari)
- Tiap kartu berisi: nama menu + harga
- Tap menu -> otomatis masuk ke daftar pesanan
- Jika menu yang sama di-tap lagi -> qty bertambah (+1)

### 2. Daftar Pesanan Aktif
- Tampilkan semua item yang sudah dipilih
- Tiap baris: nama item | qty | subtotal (harga x qty)
- Tombol + dan - untuk ubah jumlah per item
- Tombol hapus untuk hapus item dari pesanan
- Total dihitung otomatis real-time di bagian bawah

### 3. Panel Pembayaran
- Tampil TOTAL HARGA besar & jelas
- Input nominal uang yang diterima dari pembeli
- Otomatis hitung dan tampilkan KEMBALIAN
- Tombol Selesai/Reset -> hapus semua pesanan, siap untuk pembeli berikutnya

---

## 🔄 Alur Penggunaan

Pembeli datang
-> Tap menu yang dipesan -> masuk daftar order
-> Pembeli minta tambah? -> Tap lagi atau tekan +
-> Lihat TOTAL di bawah
-> Masukkan uang yang diterima pembeli
-> Kembalian otomatis muncul
-> Tap "Selesai" -> semua reset, siap pembeli berikutnya

---

## 🗂️ Struktur File Project

WebKasir/
  index.html    <- Halaman utama (satu-satunya halaman)
  style.css     <- Semua styling & desain
  app.js        <- Logika pemesanan, kalkulasi, kembalian
  menu.js       <- Data menu & harga (diisi setelah kamu kasih daftarnya)
  KONSEP.md     <- File konsep ini

---

## 📝 Contoh Format Data Menu

const MENU = [
  { id: 1, nama: "Kebab Kecil",  harga: 10000, kategori: "Kebab" },
  { id: 2, nama: "Kebab Sedang", harga: 15000, kategori: "Kebab" },
  { id: 3, nama: "Kebab Besar",  harga: 20000, kategori: "Kebab" },
  { id: 4, nama: "Es Teh",       harga: 5000,  kategori: "Minuman" },
];

---

## 🎨 Desain UI

- Mobile-first -> dioptimalkan untuk layar HP
- Tombol besar -> mudah di-tap sambil masak
- Dark mode dengan aksen warna hangat (oranye/kuning) -> sesuai tema makanan
- Font besar pada angka harga & kembalian -> mudah dibaca cepat
- Kontras tinggi -> tetap terbaca di kondisi outdoor/terik

---

## ✅ Checklist Pengerjaan

[x] Buat dokumen konsep
[x] Terima daftar menu + harga
[x] Buat menu.js (35 item menu lengkap)
[x] Sistem multi-pesanan antrian (Pesanan #1, #2, dst.)
[x] Pilihan varian rasa (Saos Tomat, Sedang, Pedas)
[x] Pilihan varian sayur (Lengkap [Sayur & Mayo], No Sayur)
[x] Kalkulator bayar & kembalian real-time
[x] Histori & rekap penjualan per item hari ini
[x] Desain mobile-friendly & bottom navigation
[x] Penyimpanan otomatis LocalStorage browser
[x] Deploy ke GitHub Pages
[x] Siap dipakai berjualan kebab!
[x] Revisi: Pilihan rasa "No Saos"
[x] Revisi: Pilihan sayur/mayo "No Mayo" & "Polos"
[x] Revisi: Pilihan tipe pembeli "BCL" / "Reguler" & rekap histori
