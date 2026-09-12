# Dyax Daily Auto Claimer & Checker

Script Node.js sederhana (tanpa dependensi eksternal) untuk melakukan pengecekan status harian dan auto-claim reward daily login pada platform **[Dyax.io](https://dyax.io)** untuk banyak akun sekaligus (*multi-session*).

---

## ✨ Fitur Utama

- **Zero External Dependencies**: Menggunakan native `fetch` bawaan Node.js (v18+).
- **Multi-Account Support**: Cukup paste cookie session di `sessions.txt` (1 baris per akun).
- **Auto-Claim Daily Login**: Otomatis mentrigger claim daily reward jika akun belum klaim di hari tersebut.
- **Auto-Retry System**: Otomatis mencoba ulang hingga 3x jika koneksi internet terputus atau respon lambat.
- **Safe Rate-Limiting**: Jeda waktu otomatis antar pemrosesan akun agar aman dari blokir/rate-limit.
- **Tampilan Bersih & Rapi**: Menampilkan tabel ringkas berformat CLI modern yang memuat Username, Level, Points, Status Klaim, dan Waktu Check-in terakhir.

---

## 🚀 Persyaratan Sistem

- [Node.js](https://nodejs.org/) v18.0.0 atau versi yang lebih baru.

---

## 🛠️ Cara Instalasi & Penggunaan

1. **Clone repository ini**:
   ```bash
   git clone https://github.com/USERNAME/dyax-daily.git
   cd dyax-daily
   ```

2. **Siapkan file `sessions.txt`**:
   Salin file template:
   ```bash
   cp sessions.example.txt sessions.txt
   ```
   Buka `sessions.txt` dan masukkan cookie akun kamu (1 cookie per baris):
   ```text
   auth_sid=c95b74c77b6629fe113aad...; _ga=...
   auth_sid=4bc0b89d999fd2cabb...; _ga=...
   ```
   > **Catatan Keamanan**: File `sessions.txt` sudah otomatis dimasukkan ke dalam `.gitignore` sehingga cookie akun pribadimu tidak akan ter-upload ke publik.

3. **Jalankan script**:
   ```bash
   npm start
   ```

---

## 📋 Contoh Tampilan Output

```text
DYAX DAILY AUTO CLAIM & CHECKER
Sabtu, 12 September 2026 • 15.51.24 WIB

  #   AKUN       USERNAME       LV      POINTS  STATUS         CHECK-IN
  ─── ────────── ────────────── ───── ────────  ────────────── ──────────────
  01  Akun #1    edisonradi     Lv.4    11.800  ✓ Sudah Klaim  12/09 13.31.37
  02  Akun #2    muffin258      Lv.4     7.200  ✓ Sudah Klaim  12/09 15.28.11
  03  Akun #3    myliekent9     Lv.4     7.200  ✓ Sudah Klaim  12/09 15.29.25
  ─── ────────── ────────────── ───── ────────  ────────────── ──────────────
  Total: 3 Akun  |  Sukses: 3  |  Gagal: 0  |  Total Poin: 26.200
```

---

## ⚠️ Disclaimer

Project ini dibuat hanya untuk tujuan edukasi dan penggunaan pribadi. Pengguna bertanggung jawab penuh atas segala aktivitas dan kepatuhan terhadap ketentuan layanan platform terkait.
