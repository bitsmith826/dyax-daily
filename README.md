# Dyax Daily Auto Claimer & Checker

Script Node.js sederhana (tanpa dependensi eksternal) untuk melakukan auto-claim reward daily login pada platform **[Dyax.io](https://dyax.io)** untuk banyak akun sekaligus (*multi-session*).

---

## ✨ Fitur Utama

- **Zero External Dependencies** — Menggunakan native `fetch` bawaan Node.js (v18+), tidak perlu `npm install`.
- **Multi-Account Support** — Daftarkan sebanyak apapun akun di `sessions.json`.
- **Auto Daily Claim** — Otomatis mentrigger klaim daily reward saat script dijalankan.
- **Auto Re-Login** — Jika cookie session expired, script otomatis login ulang menggunakan `loginId` & `password` dan menyimpan cookie baru ke `sessions.json`.
- **Auto-Retry System** — Mencoba ulang hingga 3x jika koneksi bermasalah.
- **Tampilan CLI Rapi** — Tabel ringkas berisi Username, Level, Points, Status Klaim, dan Waktu Check-in terakhir.

---

## 🚀 Persyaratan Sistem

- [Node.js](https://nodejs.org/) **v18.0.0** atau lebih baru.

---

## 🛠️ Cara Instalasi & Penggunaan

### 1. Clone repository

```bash
git clone https://github.com/bitsmith826/dyax-daily.git
cd dyax-daily
```

### 2. Siapkan file `sessions.json`

Salin file template:

```bash
# Windows
copy sessions.example.json sessions.json

# Linux / macOS
cp sessions.example.json sessions.json
```

Buka `sessions.json` dan isi data setiap akun:

```json
[
  {
    "name": "Nama Akun 1",
    "loginId": "username_atau_email",
    "password": "password_akun",
    "cookie": "auth_sid=...; _ga=..."
  },
  {
    "name": "Nama Akun 2",
    "loginId": "username_atau_email_2",
    "password": "password_akun_2",
    "cookie": "auth_sid=...; _ga=..."
  }
]
```

| Field      | Wajib | Keterangan                                                    |
|------------|-------|---------------------------------------------------------------|
| `name`     | ✅    | Label akun yang ditampilkan di output                         |
| `loginId`  | ✅    | Username atau email untuk login                               |
| `password` | ✅    | Password akun (digunakan untuk auto re-login jika expired)    |
| `cookie`   | ✅    | Cookie session aktif dari browser (lihat cara mendapatkannya) |

> **🔒 Keamanan**: File `sessions.json` sudah dimasukkan ke `.gitignore` sehingga **tidak akan ter-upload ke GitHub**.

### 3. Cara mendapatkan Cookie

1. Login ke [dyax.io](https://dyax.io) di browser (Chrome/Edge).
2. Tekan **F12** → tab **Application** (atau *Storage*).
3. Klik **Cookies** → `https://dyax.io`.
4. Copy seluruh isi kolom **Value** dari cookie `auth_sid`, `_ga`, dan `mpGuestId`.
5. Gabungkan dalam format: `auth_sid=...; _ga=...; mpGuestId=...`

### 4. Jalankan script

```bash
npm start
```

---

## 📋 Contoh Tampilan Output

```text
DYAX DAILY AUTO CLAIM & CHECKER
Selasa, 15 September 2026 • 13.12.47 WIB

  #   AKUN       USERNAME       LV      POINTS  STATUS         CHECK-IN
  ─── ────────── ────────────── ───── ────────  ────────────── ──────────────
  01  Akun 1     edisonradi     Lv.4    12.100  ✓ Sudah Klaim  15/09 12.00.28
  02  Akun 2     muffin258      Lv.4     7.500  ✓ Baru Klaim   15/09 13.07.50 ↻ re-login
  03  Akun 3     myliekent9     Lv.4     7.500  ✓ Baru Klaim   15/09 13.08.00 ↻ re-login
  ─── ────────── ────────────── ───── ────────  ────────────── ──────────────
  Total: 3 Akun  |  Sukses: 3  |  Gagal: 0  |  Total Poin: 27.100
```

**Keterangan Status:**
- `✓ Baru Klaim` — Daily reward baru saja berhasil diklaim saat script dijalankan.
- `✓ Sudah Klaim` — Akun sudah klaim sebelumnya hari ini.
- `! Belum Klaim` — Belum klaim (kemungkinan ada error).
- `× Gagal/Exp` — Session expired dan re-login juga gagal (perlu update cookie/password).
- `↻ re-login` — Cookie expired, script berhasil login ulang otomatis dan menyimpan cookie baru.

---

## ⚠️ Disclaimer

Project ini dibuat hanya untuk tujuan edukasi dan penggunaan pribadi. Pengguna bertanggung jawab penuh atas segala aktivitas dan kepatuhan terhadap ketentuan layanan platform terkait.
