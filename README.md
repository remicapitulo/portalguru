# Portal Administrasi Guru - SMPIT Pondok Duta

Sistem administrasi guru terpadu, pengelolaan perangkat pembelajaran Kurikulum Merdeka (Modul Ajar, CP, ATP, KKTP, Prota, Promes), kalender akademik, jurnal mengajar harian, serta wadah usulan dan aspirasi guru.

Dibangun dengan arsitektur **Flexible JSON Document Engine** yang berkinerja tinggi (<5ms), menggantikan ketergantungan Google Sheets yang lambat tanpa kerumitan instalasi MySQL.

---

## 🚀 Keunggulan Arsitektur Baru

1. **Performa Super Cepat (<5ms)**:
   - Tidak ada lagi waktu tunggu (delay 2 - 4 detik) seperti saat memanggil Google Apps Script / Spreadsheet.
   - Menggunakan in-memory cache dengan reaktivitas instan dan persistensi otomatis.
2. **Fleksibel Tanpa MySQL**:
   - Menghindari kerumitan konfigurasi server MySQL, instalasi ekstensi database di hosting, atau *schema migration* yang kaku.
   - Struktur data dokumen NoSQL JSON dapat berkembang fleksibel mengikuti administrasi guru.
3. **Pencadangan & Pemulihan 1-Klik**:
   - Fitur **Download Backup JSON** dan **Import JSON** siap pakai untuk pencadangan rutin atau pertukaran data antar perangkat.
4. **Siap Di-Deploy ke GitHub**:
   - Berupa React SPA murni dengan Vite + Tailwind CSS.
   - Langsung dapat di-hosting di **GitHub Pages**, **Vercel**, **Netlify**, atau hosting reguler (Hostinger).

---

## 📋 Modul Utama

1. **Beranda Portal**:
   - Informasi terkini agenda sekolah periode H-0 s.d H+30 hari.
   - Status kegiatan otomatis: *Sedang Berlangsung*, *Sudah Dilaksanakan*, *Belum Dilaksanakan*.
   - Metrik kelengkapan administrasi guru dan 12 katalog akses cepat layanan sekolah.
2. **Perangkat Pembelajaran (36 Kategori)**:
   - 6 Jenis Dokumen: `MODUL` (Modul Ajar), `CP`, `ATP`, `KKTP`, `PROTA`, `PROSEM`.
   - Melingkupi Semester 1 & 2 untuk Kelas 7, 8, dan 9.
   - Dukungan multi-file per slot, pelacakan persentase ketercapaian, dan filter administrasi.
3. **Kalender Pendidikan (Kaldik)**:
   - Timeline agenda kegiatan sekolah per bulan, lampiran proposal file, nama penanggung jawab (PJ), dan lokasi.
4. **Suara Guru (Usulan & Aspirasi)**:
   - Formulir penyampaian usulan sarana prasarana, ide inovatif, dan masukan ke manajemen.
   - Filter responsif berdasarkan Bulan, Tahun, dan Status (*Terkirim, Proses, Diterima, Ditolak*).
   - Tindak lanjut dan tanggapan resmi dari manajemen sekolah.
5. **Jurnal Mengajar Harian**:
   - Pencatatan materi ajar harian, kelas, jam mengajar, rekap presensi siswa, dan catatan refleksi.
6. **Data Guru & Rekapitulasi**:
   - Matriks ketercapaian 36 berkas seluruh guru pengampu.
   - Siap cetak ke format PDF laporan resmi lengkap dengan kop surat dan tanda tangan kepala sekolah.
7. **Database Manager**:
   - Statistik database, unduh backup JSON, unggah file pemulihan, dan pengaturan identitas sekolah.

---

## 🛠️ Panduan Migrasi ke GitHub

### 1. Inisialisasi Repository Git
Buka terminal pada folder proyek ini:
```bash
git init
git add .
git commit -m "feat: Portal Administrasi Guru SMPIT Pondok Duta Rebuilt"
```

### 2. Hubungkan ke GitHub
Buat repository baru di [github.com/new](https://github.com/new), lalu jalankan:
```bash
git branch -M main
git remote add origin https://github.com/USERNAME/portal-administrasi-guru.git
git push -u origin main
```

### 3. Build & Deploy
Untuk kompilasi produksi:
```bash
npm run build
```
Folder `dist/` siap diunggah ke web server Hostinger (cPanel / hPanel) atau dihubungkan ke GitHub Pages / Vercel.

---

## 🔐 Akun Akses Default

- **Administrator**:
  - NIP / Username: `admin`
  - Password: `admin123`
- **Guru Pengampu**:
  - NIP: Terdapat pada menu data guru (misal `198502142009022003` untuk Siti Nurhaliza - Matematika)
  - Password default: `guru123`
  - Tersedia pula fitur **Masuk Cepat (Akun Demo)** langsung dari pop-up login.
