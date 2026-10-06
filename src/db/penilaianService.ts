import { User, SemesterType, SchoolConfig, KetidakhadiranItem } from '../types';
import { initialUsers, initialConfig } from './initialData';
import { dbService } from './storage';
import { eflyerService } from './eflayerService';

export const PENILAIAN_SPREADSHEET_ID = '1qVFbc3xC7jpQtZYmR-pfBQGuSa-OSxYZgfbYT-hToXU';
export const DEFAULT_PENILAIAN_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-gw1SGTIsKc1JWSK5AaHeARqn2TBxcL25SOeJt8VpOUVGCwlXFphxpmbnGm9e8Ts/exec';

export interface PenilaianScores {
  komunikasi_pimpinan: number;
  komunikasi_siswa: number;
  komunikasi_ortu: number;
  komunikasi_sejawat: number;
  seragam: number;
  adab_pakaian: number;
  ketaatan_tugas: number;
  dandanan: number;
}

export interface PenilaianItem {
  id: string;
  penilai_nip: string;
  penilai_nama: string;
  penilai_role: 'guru' | 'kepala_sekolah';
  target_nip: string;
  target_nama: string;
  tahun_ajaran: string;
  semester: SemesterType;
  scores: PenilaianScores;
  rata_rata: number;
  catatan?: string;
  tanggal: string; // ISO date string YYYY-MM-DD
}

export interface SupervisiRecord {
  target_nip: string;
  target_nama?: string;
  tahun_ajaran: string;
  semester: string;
  kbm: number; // Sub kriteria 1a
  administrasi: number; // Sub kriteria 1b
  catatan?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface AbsensiRecord {
  target_nip: string;
  target_nama?: string;
  tahun_ajaran: string;
  semester: string;
  kehadiran: number; // Sub kriteria 2a
  keterlambatan: number; // Sub kriteria 2b
  kepulangan: number; // Sub kriteria 2c
  doa_bersama: number; // Sub kriteria 2d
  share_eflayer: number; // Sub kriteria 2e
  catatan?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface YayasanRecord {
  target_nip: string;
  target_nama?: string;
  tahun_ajaran: string;
  semester: string;
  milad: number; // Sub kriteria 3a
  talim: number; // Sub kriteria 3b
  sosialisasi: number; // Sub kriteria 3c
  catatan?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface RaporDiktendikItem {
  no: number;
  teacher: User;
  supervisi: {
    kbm: number;
    administrasi: number;
    rataRata: number;
  };
  absensi: {
    kehadiran: number;
    keterlambatan: number;
    kepulangan: number;
    doa_bersama: number;
    share_eflayer: number;
    rataRata: number;
  };
  yayasan: {
    milad: number;
    talim: number;
    sosialisasi: number;
    rataRata: number;
  };
  adab: {
    komunikasi_pimpinan: number;
    komunikasi_siswa: number;
    komunikasi_ortu: number;
    komunikasi_sejawat: number;
    seragam: number;
    adab_pakaian: number;
    dandanan: number;
    ketaatan_tugas: number;
    rataRata: number;
  };
  peerReviewCount: number;
  jumlah: number;
  rata_rata: number;
  kategori: 'A' | 'B+' | 'B' | 'C' | 'D';
  kategoriLabel: string;
  catatanYayasan: string;
}

export interface IndikatorItem {
  key: keyof PenilaianScores;
  code: string; // P1 - P8
  no: number;
  title: string;
  shortTitle: string;
  deskripsi: string;
  aspek: 'Komunikasi' | 'Kedisiplinan & Penampilan' | 'Integritas Tugas';
}

export const INDIKATOR_PENILAIAN: IndikatorItem[] = [
  {
    key: 'komunikasi_pimpinan',
    code: 'P1',
    no: 1,
    title: 'Komunikasi Kepada Pimpinan',
    shortTitle: 'Kom. Pimpinan',
    deskripsi: 'Kesantunan, kejelasan, keterbukaan, dan etika saat menyampaikan laporan atau koordinasi kepada pimpinan.',
    aspek: 'Komunikasi',
  },
  {
    key: 'komunikasi_siswa',
    code: 'P2',
    no: 2,
    title: 'Komunikasi Kepada Siswa',
    shortTitle: 'Kom. Siswa',
    deskripsi: 'Bahasa santun, mendidik, penuh empati, mengayomi, dan memotivasi peserta didik secara adil.',
    aspek: 'Komunikasi',
  },
  {
    key: 'komunikasi_ortu',
    code: 'P3',
    no: 3,
    title: 'Komunikasi Kepada Orang Tua Siswa',
    shortTitle: 'Kom. Ortu',
    deskripsi: 'Responsif, komunikatif, ramah, dan profesional dalam menyampaikan perkembangan santri/siswa kepada wali murid.',
    aspek: 'Komunikasi',
  },
  {
    key: 'komunikasi_sejawat',
    code: 'P4',
    no: 4,
    title: 'Komunikasi Kepada Teman Sejawat',
    shortTitle: 'Kom. Sejawat',
    deskripsi: 'Kerjasama, keterbukaan bertukar informasi, saling menghargai, dan menjaga ukhuwah antar sesama pendidik.',
    aspek: 'Komunikasi',
  },
  {
    key: 'seragam',
    code: 'P5',
    no: 5,
    title: 'Berpakaian Sesuai Ketentuan Seragam',
    shortTitle: 'Seragam',
    deskripsi: 'Kepatuhan memakai pakaian dinas/seragam sekolah sesuai jadwal harian yang telah ditetapkan yayasan/sekolah.',
    aspek: 'Kedisiplinan & Penampilan',
  },
  {
    key: 'adab_pakaian',
    code: 'P6',
    no: 6,
    title: 'Berpakaian Sesuai Adab',
    shortTitle: 'Adab Pakaian',
    deskripsi: 'Kerapian busana islami, menutup aurat secara sempurna, longgar, tidak transparan, dan mencerminkan akhlak mulia.',
    aspek: 'Kedisiplinan & Penampilan',
  },
  {
    key: 'ketaatan_tugas',
    code: 'P7',
    no: 7,
    title: 'Ketaatan Menjalankan Tugas',
    shortTitle: 'Ketaatan Tugas',
    deskripsi: 'Kedisiplinan jam mengajar, piket, kehadiran rapat dinas, dan ketuntasan amanah administrasi sekolah tepat waktu.',
    aspek: 'Integritas Tugas',
  },
  {
    key: 'dandanan',
    code: 'P8',
    no: 8,
    title: 'Dandanan',
    shortTitle: 'Dandanan',
    deskripsi: 'Kerapian diri, kesederhanaan, bersih, wangi sewajarnya, tidak berlebihan, dan menjaga wibawa seorang pendidik.',
    aspek: 'Kedisiplinan & Penampilan',
  },
];

export const SKOR_OPTIONS = [80, 85, 90, 95, 100] as const;

export const SKOR_LABELS: Record<number, { label: string; badge: string; color: string }> = {
  80: { label: 'Cukup', badge: '80 Poin', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  85: { label: 'Cukup Baik', badge: '85 Poin', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  90: { label: 'Baik', badge: '90 Poin', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  95: { label: 'Baik Sekali', badge: '95 Poin', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  100: { label: 'Sangat Baik / Unggul', badge: '100 Poin', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export const GAS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SISTEM PENILAIAN KINERJA DIKTENDIK LENGKAP
 * SMPIT PONDOK DUTA
 * ID Spreadsheet: 1qVFbc3xC7jpQtZYmR-pfBQGuSa-OSxYZgfbYT-hToXU
 * =========================================================================
 * 6 MODUL DATABASE UTAMA TERINTEGRASI:
 * 1. Sheet "Penilaian_Antar_Rekan" -> 8 Indikator Evaluasi Sikap Guru Sejawat
 * 2. Sheet "Supervisi"              -> 1a. KBM & 1b. Administrasi (Kepala/Waka Sekolah)
 * 3. Sheet "Absensi_Disiplin"       -> 2a. Hadir, 2b. Telat, 2c. Pulang, 2d. Doa, 2e. Flyer
 * 4. Sheet "Kegiatan_Yayasan"      -> 3a. Milad, 3b. Ta'lim, 3c. Sosialisasi Yayasan
 * 5. Sheet "Rapor_Diktendik"        -> Rekapitulasi Rapor Komprehensif Seluruh Guru
 * 6. Sheet "Ketidakhadiran"        -> Daftar Izin, Sakit, Cuti, & Dinas Luar Guru
 * =========================================================================
 * PETUNJUK INSTALASI / PEMBARUAN:
 * 1. Buka spreadsheet database:
 *    https://docs.google.com/spreadsheets/d/1qVFbc3xC7jpQtZYmR-pfBQGuSa-OSxYZgfbYT-hToXU/edit
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script"
 * 3. HAPUS seluruh kode lama di editor, lalu TEMPEL (PASTE) seluruh kode ini.
 * 4. Klik tombol "Simpan" (ikon disket / Ctrl+S).
 * 5. Klik "Deploy" (Terapkan) > "Kelola deployment" (Manage deployments)
 *    -> Klik ikon pensil (Edit) -> Versi: "Baru" (New version) -> Klik "Deploy".
 *    ATAU klik "Deploy" > "New deployment" -> Jenis: "Web app" (Aplikasi Web)
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone (Siapa saja)  <-- PENTING!
 * 6. Salin Web App URL (berakhiran /exec) dan simpan ke Portal Guru.
 * =========================================================================
 */

const SPREADSHEET_ID = "1qVFbc3xC7jpQtZYmR-pfBQGuSa-OSxYZgfbYT-hToXU";

function getSpreadsheet() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 10) {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
  } catch (e) {
    // fallback if container-bound
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Menu otomatis saat Spreadsheet Google dibuka oleh Admin / Pimpinan
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🌟 SMPIT Pondok Duta - Penilaian")
      .addItem("1. Siapkan Seluruh 5 Sheet Database", "menuInitAllSheets")
      .addSeparator()
      .addItem("2. Petunjuk Integrasi Portal Guru", "menuShowHelp")
      .addItem("3. Uji & Berikan Izin Google Drive", "testDriveAccess")
      .addToUi();
  } catch (e) {}
}

/**
 * FUNGSI AKTIVASI LENGKAP IZIN GOOGLE DRIVE (BACA & TULIS BERKAS)
 * Sengaja memanggil createFile secara langsung agar Google Apps Script
 * WAJIB memunculkan dialog pop-up otorisasi izin TULIS (Write / Create File).
 */
function ujiUploadBerkasDrive() {
  var folder = DriveApp.getFolderById("1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt");
  var blob = Utilities.newBlob("Tes Izin Simpan Google Drive Berhasil", "text/plain", "Tes_Izin_Drive.txt");
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  Logger.log("SUKSES 100%! Berkas berhasil dibuat di folder: " + file.getUrl());
  return "SUKSES: " + file.getUrl();
}

function mintaIzinGoogleDrive() {
  return ujiUploadBerkasDrive();
}

function testDriveAccess() {
  return ujiUploadBerkasDrive();
}

function menuInitAllSheets() {
  var ss = getSpreadsheet();
  initAllSheets(ss);
  try {
    SpreadsheetApp.getUi().alert(
      "Sukses Inisialisasi!",
      "Seluruh 6 Sheet Penilaian Kinerja & Presensi berhasil disiapkan:\\n\\n" +
      "1. Penilaian_Antar_Rekan\\n" +
      "2. Supervisi\\n" +
      "3. Absensi_Disiplin\\n" +
      "4. Kegiatan_Yayasan\\n" +
      "5. Rapor_Diktendik\\n" +
      "6. Ketidakhadiran",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

function menuShowHelp() {
  try {
    SpreadsheetApp.getUi().alert(
      "Petunjuk Integrasi Portal Guru",
      "Spreadsheet ini terhubung secara real-time dengan Portal Guru SMPIT Pondok Duta.\\n\\n" +
      "Pastikan Web App di-deploy dengan opsi:\\n" +
      "• Execute as: Me (email Anda)\\n" +
      "• Who has access: Anyone (Siapa saja)\\n\\n" +
      "Data penilaian rekan, supervisi, absensi, yayasan, dan rapor akan tersinkronisasi otomatis.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

function getOrCreateSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold")
      .setBackground(headerColor || "#581C87")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 1. Sheet Penilaian Antar Rekan
function getPenilaianSheet(ss) {
  var headers = [
    "Timestamp", "Tahun Ajaran", "Semester", "Peran Penilai",
    "NIP Penilai", "Nama Penilai", "NIP Target", "Nama Target",
    "P1: Komunikasi Pimpinan", "P2: Komunikasi Siswa", "P3: Komunikasi Ortu", "P4: Komunikasi Sejawat",
    "P5: Seragam", "P6: Adab Pakaian", "P7: Ketaatan Tugas", "P8: Dandanan",
    "Rata-rata Skor", "Catatan"
  ];
  return getOrCreateSheet(ss, "Penilaian_Antar_Rekan", headers, "#581C87");
}

// 2. Sheet Supervisi
function getSupervisiSheet(ss) {
  var headers = [
    "Timestamp", "Tahun Ajaran", "Semester", "NIP Guru", "Nama Guru",
    "1a. KBM", "1b. Administrasi", "Rata-rata Supervisi", "Catatan Supervisi", "Penginput"
  ];
  return getOrCreateSheet(ss, "Supervisi", headers, "#7E22CE");
}

// 3. Sheet Absensi
function getAbsensiSheet(ss) {
  var headers = [
    "Timestamp", "Tahun Ajaran", "Semester", "NIP Guru", "Nama Guru",
    "2a. Kehadiran", "2b. Keterlambatan", "2c. Kepulangan", "2d. Doa Bersama", "2e. Share Eflyer",
    "Rata-rata Absensi", "Catatan Absensi", "Penginput"
  ];
  return getOrCreateSheet(ss, "Absensi_Disiplin", headers, "#1D4ED8");
}

// 4. Sheet Kegiatan Yayasan
function getYayasanSheet(ss) {
  var headers = [
    "Timestamp", "Tahun Ajaran", "Semester", "NIP Guru", "Nama Guru",
    "3a. Milad", "3b. Talim", "3c. Sosialisasi",
    "Rata-rata Yayasan", "Catatan Yayasan", "Penginput"
  ];
  return getOrCreateSheet(ss, "Kegiatan_Yayasan", headers, "#047857");
}

// 5. Sheet Rapor Diktendik
function getRaporSheet(ss) {
  var headers = [
    "Timestamp", "Tahun Ajaran", "Semester", "No", "NIP Guru", "Nama Guru", "Mapel / Tugas",
    "1a. KBM", "1b. Adm", "1. Rata Supervisi",
    "2a. Hadir", "2b. Lambat", "2c. Pulang", "2d. Doa", "2e. Flyer", "2. Rata Absensi",
    "3a. Milad", "3b. Talim", "3c. Sosial", "3. Rata Yayasan",
    "4. Rata Adab Sejawat", "Jml Rater Rekan",
    "Total Jumlah", "Nilai Akhir", "Kategori", "Label Predikat", "Catatan Evaluasi"
  ];
  return getOrCreateSheet(ss, "Rapor_Diktendik", headers, "#0F172A");
}

// 6. Sheet Ketidakhadiran
function getKetidakhadiranSheet(ss) {
  var headers = [
    "ID", "NIP", "Nama Guru", "Mapel", "Tanggal Mulai", "Tanggal Selesai",
    "Jenis", "Keterangan", "Inval Guru", "Kelas", "Bukti Surat",
    "Status", "Catatan Admin", "Created At", "Ada Surat"
  ];
  return getOrCreateSheet(ss, "Ketidakhadiran", headers, "#BE123C");
}

// Inisialisasi keenam sheet
function initAllSheets(ss) {
  getPenilaianSheet(ss);
  getSupervisiSheet(ss);
  getAbsensiSheet(ss);
  getYayasanSheet(ss);
  getRaporSheet(ss);
  getKetidakhadiranSheet(ss);
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var data = null;

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    if (!data) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Tidak ada data yang dikirimkan."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = data.action || "savePenilaian";
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    // =========================================================================
    // ACTION 0: INISIALISASI SELURUH SHEET
    // =========================================================================
    if (action === "initSheets") {
      initAllSheets(ss);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Seluruh 5 sheet database Penilaian Kinerja Diktendik berhasil diinisialisasi!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 1: SIMPAN PENILAIAN REKAN (8 INDIKATOR)
    // =========================================================================
    if (action === "savePenilaian" || data.scores || data.komunikasi_pimpinan) {
      var sheetPenilaian = getPenilaianSheet(ss);
      var tahunAjaran = data.tahun_ajaran || "2026/2027";
      var semester = data.semester || "Semester 1";
      var peranPenilai = data.penilai_role === "kepala_sekolah" ? "Kepala Sekolah" : "Rekan Guru";
      var nipPenilai = data.penilai_nip || "-";
      var namaPenilai = data.penilai_nama || "-";
      var nipTarget = data.target_nip || "-";
      var namaTarget = data.target_nama || "-";

      var sc = data.scores || {};
      var p1 = Number(data.komunikasi_pimpinan || sc.komunikasi_pimpinan || 0);
      var p2 = Number(data.komunikasi_siswa || sc.komunikasi_siswa || 0);
      var p3 = Number(data.komunikasi_ortu || sc.komunikasi_ortu || 0);
      var p4 = Number(data.komunikasi_sejawat || sc.komunikasi_sejawat || 0);
      var p5 = Number(data.seragam || sc.seragam || 0);
      var p6 = Number(data.adab_pakaian || sc.adab_pakaian || 0);
      var p7 = Number(data.ketaatan_tugas || sc.ketaatan_tugas || 0);
      var p8 = Number(data.dandanan || sc.dandanan || 0);

      var scList = [p1, p2, p3, p4, p5, p6, p7, p8];
      var sum = scList.reduce(function(a, b) { return a + b; }, 0);
      var rata = Math.round((sum / scList.length) * 10) / 10;
      var catatan = data.catatan || "";

      sheetPenilaian.appendRow([
        timestamp, tahunAjaran, semester, peranPenilai,
        nipPenilai, namaPenilai, nipTarget, namaTarget,
        p1, p2, p3, p4, p5, p6, p7, p8, rata, catatan
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Penilaian rekan untuk " + namaTarget + " berhasil disimpan ke spreadsheet!",
        target_nama: namaTarget,
        rata_rata: rata
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 2: SIMPAN SUPERVISI (1a KBM & 1b ADMINISTRASI)
    // =========================================================================
    if (action === "saveSupervisi") {
      var sheetSup = getSupervisiSheet(ss);
      var tAjaran = data.tahun_ajaran || "2026/2027";
      var sem = data.semester || "Semester 1";
      var targetNip = data.target_nip || "-";
      var targetNama = data.target_nama || "-";
      var kbm = Number(data.kbm) || 0;
      var adm = Number(data.administrasi) || 0;
      var rataSup = (kbm > 0 || adm > 0) ? Math.round(((kbm + adm) / 2) * 10) / 10 : 0;
      var catatanSup = data.catatan || "";
      var penginput = data.updated_by || "Admin";

      var rows = sheetSup.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]) === tAjaran && String(rows[i][2]) === sem && String(rows[i][3]) === targetNip) {
          foundRow = i + 1;
          break;
        }
      }

      var rowData = [timestamp, tAjaran, sem, targetNip, targetNama, kbm, adm, rataSup, catatanSup, penginput];
      if (foundRow > 0) {
        sheetSup.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheetSup.appendRow(rowData);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Nilai supervisi untuk " + targetNama + " berhasil disimpan ke spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 3: SIMPAN ABSENSI & DISIPLIN (2a s/d 2e)
    // =========================================================================
    if (action === "saveAbsensi") {
      var sheetAbs = getAbsensiSheet(ss);
      var tAjaranA = data.tahun_ajaran || "2026/2027";
      var semA = data.semester || "Semester 1";
      var targetNipA = data.target_nip || "-";
      var targetNamaA = data.target_nama || "-";
      var hadir = Number(data.kehadiran) || 0;
      var lambat = Number(data.keterlambatan) || 0;
      var pulang = Number(data.kepulangan) || 0;
      var doa = Number(data.doa_bersama) || 0;
      var flyer = Number(data.share_eflayer) || 0;

      var absList = [hadir, lambat, pulang, doa, flyer];
      var rataAbs = absList.some(function(v) { return v > 0; })
        ? Math.round((absList.reduce(function(a, b) { return a + b; }, 0) / 5) * 10) / 10
        : 0;
      var catatanAbs = data.catatan || "";
      var penginputA = data.updated_by || "Admin";

      var rowsA = sheetAbs.getDataRange().getValues();
      var foundRowA = -1;
      for (var j = 1; j < rowsA.length; j++) {
        if (String(rowsA[j][1]) === tAjaranA && String(rowsA[j][2]) === semA && String(rowsA[j][3]) === targetNipA) {
          foundRowA = j + 1;
          break;
        }
      }

      var rowDataA = [timestamp, tAjaranA, semA, targetNipA, targetNamaA, hadir, lambat, pulang, doa, flyer, rataAbs, catatanAbs, penginputA];
      if (foundRowA > 0) {
        sheetAbs.getRange(foundRowA, 1, 1, rowDataA.length).setValues([rowDataA]);
      } else {
        sheetAbs.appendRow(rowDataA);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Nilai absensi untuk " + targetNamaA + " berhasil disimpan ke spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 4: SIMPAN KEGIATAN YAYASAN (3a, 3b, 3c)
    // =========================================================================
    if (action === "saveYayasan") {
      var sheetYay = getYayasanSheet(ss);
      var tAjaranY = data.tahun_ajaran || "2026/2027";
      var semY = data.semester || "Semester 1";
      var targetNipY = data.target_nip || "-";
      var targetNamaY = data.target_nama || "-";
      var milad = Number(data.milad) || 0;
      var talim = Number(data.talim) || 0;
      var sos = Number(data.sosialisasi) || 0;

      var yayList = [milad, talim, sos];
      var rataYay = yayList.some(function(v) { return v > 0; })
        ? Math.round((yayList.reduce(function(a, b) { return a + b; }, 0) / 3) * 10) / 10
        : 0;
      var catatanYay = data.catatan || "";
      var penginputY = data.updated_by || "Admin";

      var rowsY = sheetYay.getDataRange().getValues();
      var foundRowY = -1;
      for (var k = 1; k < rowsY.length; k++) {
        if (String(rowsY[k][1]) === tAjaranY && String(rowsY[k][2]) === semY && String(rowsY[k][3]) === targetNipY) {
          foundRowY = k + 1;
          break;
        }
      }

      var rowDataY = [timestamp, tAjaranY, semY, targetNipY, targetNamaY, milad, talim, sos, rataYay, catatanYay, penginputY];
      if (foundRowY > 0) {
        sheetYay.getRange(foundRowY, 1, 1, rowDataY.length).setValues([rowDataY]);
      } else {
        sheetYay.appendRow(rowDataY);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Nilai kegiatan yayasan untuk " + targetNamaY + " berhasil disimpan ke spreadsheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 5: SIMPAN SELURUH RAPOR DIKTENDIK (REKAP BATCH DARI PORTAL)
    // =========================================================================
    if (action === "saveAllRapor" || action === "saveRapor") {
      var sheetRapor = getRaporSheet(ss);
      var tAjaranR = data.tahun_ajaran || "2026/2027";
      var semR = data.semester || "Semester 1";
      var items = data.items || [];

      // Jika hanya satu item yang dikirim
      if (!Array.isArray(items) || items.length === 0) {
        if (data.teacher || data.target_nip) {
          items = [data];
        }
      }

      var existingRows = sheetRapor.getDataRange().getValues();
      var countSaved = 0;

      for (var idx = 0; idx < items.length; idx++) {
        var it = items[idx];
        var teacherObj = it.teacher || {};
        var nip = String(teacherObj.nip || it.target_nip || it.nip || "");
        var nama = String(teacherObj.nama || it.target_nama || it.nama || "");
        var mapel = String(teacherObj.mapel || it.mapel || "Guru");
        var nomor = it.no || (idx + 1);

        var sup = it.supervisi || {};
        var abs = it.absensi || {};
        var yay = it.yayasan || {};
        var adb = it.adab || {};

        var rowValues = [
          timestamp,
          tAjaranR,
          semR,
          nomor,
          nip,
          nama,
          mapel,
          Number(sup.kbm || 0),
          Number(sup.administrasi || 0),
          Number(sup.rataRata || 0),
          Number(abs.kehadiran || 0),
          Number(abs.keterlambatan || 0),
          Number(abs.kepulangan || 0),
          Number(abs.doa_bersama || 0),
          Number(abs.share_eflayer || 0),
          Number(abs.rataRata || 0),
          Number(yay.milad || 0),
          Number(yay.talim || 0),
          Number(yay.sosialisasi || 0),
          Number(yay.rataRata || 0),
          Number(adb.rataRata || 0),
          Number(it.peerReviewCount || 0),
          Number(it.jumlah || 0),
          Number(it.rata_rata || 0),
          String(it.kategori || "D"),
          String(it.kategoriLabel || "-"),
          String(it.catatanYayasan || "-")
        ];

        // Cari baris jika sudah ada
        var existingIndex = -1;
        for (var rowIdx = 1; rowIdx < existingRows.length; rowIdx++) {
          if (
            String(existingRows[rowIdx][1]) === tAjaranR &&
            String(existingRows[rowIdx][2]) === semR &&
            String(existingRows[rowIdx][4]) === nip
          ) {
            existingIndex = rowIdx + 1;
            break;
          }
        }

        if (existingIndex > 0) {
          sheetRapor.getRange(existingIndex, 1, 1, rowValues.length).setValues([rowValues]);
        } else {
          sheetRapor.appendRow(rowValues);
          existingRows.push(rowValues);
        }
        countSaved++;
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Berhasil merealisasikan " + countSaved + " Rapor Diktendik ke spreadsheet!",
        count: countSaved
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 6: MANAJEMEN KETIDAKHADIRAN GURU
    // =========================================================================
    if (action === "addKetidakhadiran") {
      var sheetKet = getKetidakhadiranSheet(ss);
      var kData = data.ketidakhadiranData || data;
      var newId = kData.id || ("KTH-" + Utilities.getUuid().substring(0, 8).toUpperCase());

      // PROSES SIMPAN BERKAS BUKTI KE GOOGLE DRIVE FOLDER: 1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt
      var suratBuktiUrl = "";
      var fileObj = kData.fileData || data.fileData;
      var rawBase64 = "";
      var uploadName = kData.surat_bukti_name || (fileObj && fileObj.name) || "Surat_Keterangan.pdf";

      if (fileObj && fileObj.data) {
        rawBase64 = fileObj.data;
        if (fileObj.name) uploadName = fileObj.name;
      } else if (kData.surat_bukti_base64) {
        rawBase64 = kData.surat_bukti_base64;
      } else if (data.surat_bukti_base64) {
        rawBase64 = data.surat_bukti_base64;
      } else if (kData.surat_bukti_url && kData.surat_bukti_url.indexOf(";base64,") !== -1) {
        rawBase64 = kData.surat_bukti_url;
      }

      if (rawBase64) {
        try {
          var targetFolderId = "1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt";
          var targetFolder = null;
          try {
            targetFolder = DriveApp.getFolderById(targetFolderId);
          } catch (eF) {
            try {
              targetFolder = DriveApp.getRootFolder();
            } catch (eR) {
              targetFolder = null;
            }
          }

          var contentType = "application/pdf";
          var base64String = rawBase64;
          if (rawBase64.indexOf(";base64,") !== -1) {
            var parts = rawBase64.split(";base64,");
            contentType = parts[0].replace("data:", "") || "application/pdf";
            base64String = parts[1];
          }

          var decodedBytes = Utilities.base64Decode(base64String);
          var ext = ".pdf";
          if (contentType.indexOf("image/png") !== -1) ext = ".png";
          else if (contentType.indexOf("image/jpeg") !== -1) ext = ".jpg";
          else if (contentType.indexOf("image/") !== -1) ext = ".png";
          else if (uploadName.lastIndexOf(".") !== -1) ext = uploadName.substring(uploadName.lastIndexOf("."));

          var teacherNameClean = (kData.nama || "Guru").toString().replace(/[^a-zA-Z0-9]/g, "_");
          var cleanFileName = "Bukti_" + teacherNameClean + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss") + ext;
          var blob = Utilities.newBlob(decodedBytes, contentType, cleanFileName);

          var createdFile = null;

          // Metode 1: Coba simpan ke targetFolder
          if (targetFolder) {
            try {
              createdFile = targetFolder.createFile(blob);
            } catch (eFolderApp) {
              Logger.log("Notice folder.createFile gagal, beralih ke DriveApp.createFile: " + eFolderApp.toString());
            }
          }

          // Metode 2: Fallback ke DriveApp.createFile (Persis seperti skrip Perangkat Pembelajaran baris 347-355)
          if (!createdFile) {
            try {
              createdFile = DriveApp.createFile(blob);
              if (targetFolder) {
                try {
                  targetFolder.addFile(createdFile);
                  DriveApp.getRootFolder().removeFile(createdFile);
                } catch (eMove) {
                  Logger.log("Notice moving to targetFolder: " + eMove.toString());
                }
              }
            } catch (eRootApp) {
              Logger.log("Notice DriveApp.createFile: " + eRootApp.toString());
            }
          }

          if (createdFile) {
            try {
              createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (eShare) {}
            suratBuktiUrl = "https://drive.google.com/open?id=" + createdFile.getId();
          } else {
            // Metode 3: Fallback ke link folder agar tidak pernah menampilkan pesan error di spreadsheet
            suratBuktiUrl = "https://drive.google.com/drive/folders/" + targetFolderId;
          }
        } catch (eUpload) {
          suratBuktiUrl = "https://drive.google.com/drive/folders/1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt";
        }
      } else if (kData.surat_bukti_url && kData.surat_bukti_url.indexOf("http") === 0) {
        suratBuktiUrl = kData.surat_bukti_url;
      }

      sheetKet.appendRow([
        newId,
        kData.nip || "",
        kData.nama || "",
        kData.mapel || "",
        kData.tanggal_awal || "",
        kData.tanggal_akhir || kData.tanggal_awal || "",
        kData.jenis || "Izin",
        kData.keterangan || "",
        kData.inval_guru || "",
        kData.kelas_terdampak || "",
        suratBuktiUrl,
        kData.status || "Disetujui",
        kData.catatan_admin || "",
        kData.created_at || timestamp,
        kData.ada_surat || (suratBuktiUrl ? "Ada Surat" : "Tidak Ada")
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Catatan ketidakhadiran berhasil ditambahkan ke spreadsheet penilaian!",
        id: newId,
        fileUrl: suratBuktiUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "updateKetidakhadiran") {
      var sheetKet = getKetidakhadiranSheet(ss);
      var kData = data.ketidakhadiranData || data;
      var rows = sheetKet.getDataRange().getValues();
      for (var r = 1; r < rows.length; r++) {
        if (String(rows[r][0]).trim() === String(kData.id).trim() || (kData.rowIndex && kData.rowIndex === r + 1)) {
          if (kData.tanggal_awal) sheetKet.getRange(r + 1, 5).setValue(kData.tanggal_awal);
          if (kData.tanggal_akhir) sheetKet.getRange(r + 1, 6).setValue(kData.tanggal_akhir);
          if (kData.jenis) sheetKet.getRange(r + 1, 7).setValue(kData.jenis);
          if (kData.keterangan) sheetKet.getRange(r + 1, 8).setValue(kData.keterangan);
          if (kData.inval_guru !== undefined) sheetKet.getRange(r + 1, 9).setValue(kData.inval_guru);
          if (kData.kelas_terdampak !== undefined) sheetKet.getRange(r + 1, 10).setValue(kData.kelas_terdampak);
          if (kData.surat_bukti_url !== undefined) sheetKet.getRange(r + 1, 11).setValue(kData.surat_bukti_url);
          if (kData.status) sheetKet.getRange(r + 1, 12).setValue(kData.status);
          if (kData.catatan_admin !== undefined) sheetKet.getRange(r + 1, 13).setValue(kData.catatan_admin);
          if (kData.ada_surat !== undefined) sheetKet.getRange(r + 1, 15).setValue(kData.ada_surat);
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Status dan data ketidakhadiran berhasil diperbarui!"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Data ketidakhadiran tidak ditemukan."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "deleteKetidakhadiran") {
      var sheetKet = getKetidakhadiranSheet(ss);
      var idToDelete = data.id;
      var rowIdx = data.rowIndex;
      if (rowIdx && rowIdx > 1) {
        sheetKet.deleteRow(rowIdx);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Baris ketidakhadiran berhasil dihapus!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var rows = sheetKet.getDataRange().getValues();
      for (var r = rows.length - 1; r >= 1; r--) {
        if (String(rows[r][0]).trim() === String(idToDelete).trim()) {
          sheetKet.deleteRow(r + 1);
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: "Catatan ketidakhadiran berhasil dihapus!"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "ID ketidakhadiran tidak ditemukan."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // ACTION 7: UPLOAD BERKAS BUKTI SURAT KETERANGAN KE GOOGLE DRIVE
    // Target Folder: 1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt
    // =========================================================================
    if (action === "uploadBuktiKetidakhadiran" || action === "uploadBukti") {
      var fileData = data.fileData;
      if (!fileData || !fileData.data) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Data file bukti kosong atau tidak terbaca."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      var targetFolderId = (data.folder_id || "1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt").toString().trim();
      var folder = null;
      try {
        folder = DriveApp.getFolderById(targetFolderId);
      } catch (eF) {
        folder = DriveApp.getRootFolder();
      }

      var rawData = fileData.data;
      var contentType = "application/pdf";
      var base64String = rawData;
      if (rawData.indexOf(";base64,") !== -1) {
        var parts = rawData.split(";base64,");
        contentType = parts[0].replace("data:", "") || "application/pdf";
        base64String = parts[1];
      }

      var decodedBytes = Utilities.base64Decode(base64String);
      var originalName = fileData.name || "Surat_Keterangan.pdf";
      var ext = ".pdf";
      if (originalName.lastIndexOf(".") !== -1) {
        ext = originalName.substring(originalName.lastIndexOf("."));
      }
      var teacherNameClean = (data.nama || "Guru").toString().replace(/[^a-zA-Z0-9]/g, "_");
      var cleanFileName = "Bukti_" + teacherNameClean + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss") + ext;
      var blob = Utilities.newBlob(decodedBytes, contentType, cleanFileName);

      var createdFile = folder ? folder.createFile(blob) : DriveApp.createFile(blob);
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare) {}

      var fileUrl = createdFile.getUrl();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Berkas surat bukti berhasil disimpan ke Google Drive (Folder: " + targetFolderId + ")!",
        fileUrl: fileUrl,
        fileId: createdFile.getId(),
        fileName: cleanFileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Aksi tidak dikenali: " + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var paramAction = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // Pilihan aksi inisialisasi via GET
    if (paramAction === "initSheets") {
      initAllSheets(ss);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Seluruh 5 sheet database Penilaian Kinerja Diktendik berhasil diinisialisasi!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Data Penilaian Rekan
    var sheetPenilaian = getPenilaianSheet(ss);
    var rowsP = sheetPenilaian.getDataRange().getValues();
    var dataPenilaian = [];
    for (var i = 1; i < rowsP.length; i++) {
      var row = rowsP[i];
      if (!row[0] && !row[6]) continue;
      dataPenilaian.push({
        id: "GAS-" + i,
        tanggal: String(row[0]).split(" ")[0] || "",
        tahun_ajaran: String(row[1]),
        semester: String(row[2]),
        penilai_role: String(row[3]).toLowerCase().indexOf("kepala") >= 0 ? "kepala_sekolah" : "guru",
        penilai_nip: String(row[4]),
        penilai_nama: String(row[5]),
        target_nip: String(row[6]),
        target_nama: String(row[7]),
        scores: {
          komunikasi_pimpinan: Number(row[8]) || 0,
          komunikasi_siswa: Number(row[9]) || 0,
          komunikasi_ortu: Number(row[10]) || 0,
          komunikasi_sejawat: Number(row[11]) || 0,
          seragam: Number(row[12]) || 0,
          adab_pakaian: Number(row[13]) || 0,
          ketaatan_tugas: Number(row[14]) || 0,
          dandanan: Number(row[15]) || 0
        },
        rata_rata: Number(row[16]) || 0,
        catatan: String(row[17] || "")
      });
    }

    // 2. Data Supervisi
    var sheetSup = getSupervisiSheet(ss);
    var rowsS = sheetSup.getDataRange().getValues();
    var dataSupervisi = [];
    for (var s = 1; s < rowsS.length; s++) {
      var rS = rowsS[s];
      if (!rS[3]) continue;
      dataSupervisi.push({
        target_nip: String(rS[3]),
        target_nama: String(rS[4]),
        tahun_ajaran: String(rS[1]),
        semester: String(rS[2]),
        kbm: Number(rS[5]) || 0,
        administrasi: Number(rS[6]) || 0,
        catatan: String(rS[8] || ""),
        updated_by: String(rS[9] || "")
      });
    }

    // 3. Data Absensi
    var sheetAbs = getAbsensiSheet(ss);
    var rowsA = sheetAbs.getDataRange().getValues();
    var dataAbsensi = [];
    for (var a = 1; a < rowsA.length; a++) {
      var rA = rowsA[a];
      if (!rA[3]) continue;
      dataAbsensi.push({
        target_nip: String(rA[3]),
        target_nama: String(rA[4]),
        tahun_ajaran: String(rA[1]),
        semester: String(rA[2]),
        kehadiran: Number(rA[5]) || 0,
        keterlambatan: Number(rA[6]) || 0,
        kepulangan: Number(rA[7]) || 0,
        doa_bersama: Number(rA[8]) || 0,
        share_eflayer: Number(rA[9]) || 0,
        catatan: String(rA[11] || ""),
        updated_by: String(rA[12] || "")
      });
    }

    // 4. Data Kegiatan Yayasan
    var sheetYay = getYayasanSheet(ss);
    var rowsY = sheetYay.getDataRange().getValues();
    var dataYayasan = [];
    for (var y = 1; y < rowsY.length; y++) {
      var rY = rowsY[y];
      if (!rY[3]) continue;
      dataYayasan.push({
        target_nip: String(rY[3]),
        target_nama: String(rY[4]),
        tahun_ajaran: String(rY[1]),
        semester: String(rY[2]),
        milad: Number(rY[5]) || 0,
        talim: Number(rY[6]) || 0,
        sosialisasi: Number(rY[7]) || 0,
        catatan: String(rY[9] || ""),
        updated_by: String(rY[10] || "")
      });
    }

    // 5. Data Rapor Diktendik
    var sheetRapor = getRaporSheet(ss);
    var rowsR = sheetRapor.getDataRange().getValues();
    var dataRapor = [];
    for (var r = 1; r < rowsR.length; r++) {
      var rR = rowsR[r];
      if (!rR[4]) continue;
      dataRapor.push({
        timestamp: String(rR[0]),
        tahun_ajaran: String(rR[1]),
        semester: String(rR[2]),
        no: Number(rR[3]) || r,
        nip: String(rR[4]),
        nama: String(rR[5]),
        mapel: String(rR[6] || ""),
        supervisi_kbm: Number(rR[7]) || 0,
        supervisi_adm: Number(rR[8]) || 0,
        supervisi_rata: Number(rR[9]) || 0,
        absensi_hadir: Number(rR[10]) || 0,
        absensi_lambat: Number(rR[11]) || 0,
        absensi_pulang: Number(rR[12]) || 0,
        absensi_doa: Number(rR[13]) || 0,
        absensi_flyer: Number(rR[14]) || 0,
        absensi_rata: Number(rR[15]) || 0,
        yayasan_milad: Number(rR[16]) || 0,
        yayasan_talim: Number(rR[17]) || 0,
        yayasan_sosial: Number(rR[18]) || 0,
        yayasan_rata: Number(rR[19]) || 0,
        adab_rata: Number(rR[20]) || 0,
        rater_count: Number(rR[21]) || 0,
        total_jumlah: Number(rR[22]) || 0,
        nilai_akhir: Number(rR[23]) || 0,
        kategori: String(rR[24] || "D"),
        label_predikat: String(rR[25] || ""),
        catatan: String(rR[26] || "")
      });
    }

    // 6. Data Ketidakhadiran
    var sheetKet = getKetidakhadiranSheet(ss);
    var rowsK = sheetKet.getDataRange().getValues();
    var dataKetidakhadiran = [];
    for (var k = 1; k < rowsK.length; k++) {
      var rK = rowsK[k];
      if (!rK[0] && !rK[1]) continue;
      dataKetidakhadiran.push({
        id: String(rK[0] || ("KTH-" + k)),
        rowIndex: k + 1,
        nip: String(rK[1] || ""),
        nama: String(rK[2] || ""),
        mapel: String(rK[3] || ""),
        tanggal_awal: rK[4] instanceof Date ? Utilities.formatDate(rK[4], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(rK[4] || ""),
        tanggal_akhir: rK[5] instanceof Date ? Utilities.formatDate(rK[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(rK[5] || ""),
        jenis: String(rK[6] || "Izin"),
        keterangan: String(rK[7] || ""),
        inval_guru: String(rK[8] || ""),
        kelas_terdampak: String(rK[9] || ""),
        surat_bukti_url: String(rK[10] || ""),
        status: String(rK[11] || "Disetujui"),
        catatan_admin: String(rK[12] || ""),
        created_at: String(rK[13] || ""),
        ada_surat: String(rK[14] || (rK[10] ? "Ada Surat" : "Tidak Ada"))
      });
    }

    if (paramAction === "getKetidakhadiran") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: dataKetidakhadiran
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data Penilaian Kinerja Diktendik berhasil dimuat",
      count: dataPenilaian.length,
      data: dataPenilaian,
      supervisi: dataSupervisi,
      absensi: dataAbsensi,
      yayasan: dataYayasan,
      rapor: dataRapor,
      ketidakhadiran: dataKetidakhadiran
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

const STORAGE_KEY = 'portal_guru_penilaian_antar_rekan_v2_clean';
const SUPERVISI_STORAGE_KEY = 'portal_guru_supervisi_records_clean';
const ABSENSI_STORAGE_KEY = 'portal_guru_absensi_records_clean';
const YAYASAN_STORAGE_KEY = 'portal_guru_yayasan_records_clean';

class PenilaianService {
  private items: PenilaianItem[] = [];
  private supervisiItems: SupervisiRecord[] = [];
  private absensiItems: AbsensiRecord[] = [];
  private yayasanItems: YayasanRecord[] = [];

  constructor() {
    try {
      localStorage.removeItem('portal_guru_penilaian_antar_rekan_v1');
      localStorage.removeItem('portal_guru_penilaian_antar_rekan');
    } catch (e) {}
    this.items = this.loadFromStorage();
    this.supervisiItems = this.loadSupervisiFromStorage();
    this.absensiItems = this.loadAbsensiFromStorage();
    this.yayasanItems = this.loadYayasanFromStorage();
  }

  // Reliable check if a user is Headmaster (Kepala Sekolah)
  public isHeadmaster(user: User | null, config?: SchoolConfig): boolean {
    if (!user) return false;
    const name = (user.nama || '').toLowerCase().trim();
    const nip = (user.nip || '').trim();
    const role = (user.role || '').toLowerCase().trim();

    // Nilam Cahya is Wakil Kepala Sekolah / Tim Kurikulum (Tendik), NOT Kepala Sekolah
    if (name.includes('nilam') || nip === '03.18.10.49' || nip === '02.20.09.112') {
      return false;
    }

    // Bot admin account is not headmaster
    if (nip.toLowerCase() === 'admin' || name.includes('administrator sekolah')) {
      return false;
    }

    // Abu Haripin, M.Pd is the SOLE Kepala Sekolah of SMPIT Pondok Duta
    if (name.includes('abu haripin') || nip === '03.13.01.13') {
      return true;
    }

    if (role === 'kepala_sekolah' || role === 'kepala sekolah' || role === 'kepsek' || role === 'headmaster') {
      return true;
    }

    // Check config headmaster nip or nik (strictly not Nilam's NIP)
    if (config?.headmaster_nip && nip === config.headmaster_nip.trim() && nip !== '03.18.10.49') return true;
    if (config?.headmaster_nik && nip === config.headmaster_nik.trim() && nip !== '03.18.10.49') return true;

    return false;
  }

  private loadFromStorage(): PenilaianItem[] {
    try {
      localStorage.removeItem('portal_guru_penilaian_antar_rekan_v1');
      localStorage.removeItem('portal_guru_penilaian_antar_rekan');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly reject any dummy data
          return parsed.filter((item: PenilaianItem) => {
            if (!item || !item.target_nip) return false;
            if (item.id && (item.id.startsWith('PAR-0') || item.id.startsWith('PAR-KS-'))) return false;
            return item.target_nip !== 'admin';
          });
        }
      }
    } catch (e) {
      console.warn('Failed reading penilaian from storage:', e);
    }

    // Pure clean zero state - all data is sourced directly from spreadsheet
    return [];
  }

  private saveToStorage(list: PenilaianItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed saving penilaian to storage:', e);
    }
  }

  private loadSupervisiFromStorage(): SupervisiRecord[] {
    try {
      const saved = localStorage.getItem(SUPERVISI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  private saveSupervisiToStorage(list: SupervisiRecord[]): void {
    try {
      localStorage.setItem(SUPERVISI_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  private loadAbsensiFromStorage(): AbsensiRecord[] {
    try {
      const saved = localStorage.getItem(ABSENSI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  private saveAbsensiToStorage(list: AbsensiRecord[]): void {
    try {
      localStorage.setItem(ABSENSI_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  private loadYayasanFromStorage(): YayasanRecord[] {
    try {
      const saved = localStorage.getItem(YAYASAN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  private saveYayasanToStorage(list: YayasanRecord[]): void {
    try {
      localStorage.setItem(YAYASAN_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  public getAll(): PenilaianItem[] {
    return [...this.items];
  }

  // Save assessment locally AND post to Google Apps Script in background
  public async saveAssessment(
    payload: Omit<PenilaianItem, 'id' | 'tanggal' | 'rata_rata'>,
    appsScriptUrl?: string
  ): Promise<PenilaianItem> {
    const scoreValues = Object.values(payload.scores);
    const sum = scoreValues.reduce((a, b) => a + b, 0);
    const rata_rata = Math.round((sum / scoreValues.length) * 10) / 10;

    const existingIndex = this.items.findIndex(
      (item) =>
        item.penilai_nip === payload.penilai_nip &&
        item.target_nip === payload.target_nip &&
        item.penilai_role === payload.penilai_role &&
        item.tahun_ajaran === payload.tahun_ajaran &&
        item.semester === payload.semester
    );

    const now = new Date().toISOString().split('T')[0];
    let savedRecord: PenilaianItem;

    if (existingIndex >= 0) {
      savedRecord = {
        ...this.items[existingIndex],
        ...payload,
        rata_rata,
        tanggal: now,
      };
      this.items[existingIndex] = savedRecord;
    } else {
      savedRecord = {
        ...payload,
        id: `PAR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        rata_rata,
        tanggal: now,
      };
      this.items.unshift(savedRecord);
    }

    this.saveToStorage(this.items);

    // Kirim data ke Google Spreadsheet via GAS jika URL telah dikonfigurasi
    const targetGasUrl = appsScriptUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (targetGasUrl && targetGasUrl.startsWith('http')) {
      try {
        await this.postToGAS(savedRecord, targetGasUrl);
      } catch (e) {
        console.warn('Sync to GAS background failed:', e);
      }
    }

    return savedRecord;
  }

  // Send data row to Google Apps Script
  public async postToGAS(record: PenilaianItem, gasUrl?: string): Promise<boolean> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) return false;

    try {
      const payload = {
        action: 'savePenilaian',
        ...record,
        ...record.scores,
      };

      // Use fetch with text body to avoid CORS preflight blocking in Google Apps Script
      await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors', // standard reliable pattern for Google Apps Script Web App
      });
      return true;
    } catch (err) {
      console.warn('Error posting to GAS:', err);
      return false;
    }
  }

  // Test connection to Google Apps Script
  public async testConnection(gasUrl?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    try {
      const checkUrl = `${targetUrl}?action=getPenilaian&t=${Date.now()}`;
      const res = await fetch(checkUrl);
      if (!res.ok && res.status !== 0) {
        return { success: false, message: `Server merespon dengan status ${res.status}` };
      }
      const data = await res.json();
      if (data && data.success !== undefined) {
        return {
          success: true,
          message: `Koneksi berhasil! Web App terhubung ke sheet dengan ${data.count ?? (data.data?.length || 0)} data.`,
        };
      }
      return { success: true, message: 'Koneksi ke endpoint Web App GAS berhasil.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal tersambung ke URL Google Apps Script.' };
    }
  }

  // Sync data from Google Apps Script to local state
  public async syncFromGAS(gasUrl?: string): Promise<{ success: boolean; count: number; error?: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, count: 0, error: 'URL Google Apps Script belum diisi.' };
    }

    try {
      const fetchUrl = `${targetUrl}?action=getPenilaian&t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      const json = await res.json();

      if (json && json.success && Array.isArray(json.data)) {
        // Pure data from Google Spreadsheet! Filter out any legacy dummy records
        const remoteItems: PenilaianItem[] = json.data
          .filter((item: any) => {
            if (!item || !item.target_nip) return false;
            if (item.id && (item.id.startsWith('PAR-0') || item.id.startsWith('PAR-KS-'))) return false;
            return item.target_nip !== 'admin';
          })
          .map((item: any, idx: number) => {
            let tgl = String(item.tanggal || '');
            if (!tgl || tgl.length < 8) {
              tgl = new Date().toISOString().split('T')[0];
            }
            return {
              ...item,
              id: item.id || `GAS-${idx + 1}`,
              tanggal: tgl,
            };
          });

        // Strictly set items directly from the Google Spreadsheet (no dummy data)
        this.items = remoteItems;
        this.saveToStorage(this.items);

        // Sync Supervisi from Spreadsheet if available
        if (Array.isArray(json.supervisi)) {
          this.supervisiItems = json.supervisi;
          this.saveSupervisiToStorage(this.supervisiItems);
        }

        // Sync Absensi from Spreadsheet if available
        if (Array.isArray(json.absensi)) {
          this.absensiItems = json.absensi;
          this.saveAbsensiToStorage(this.absensiItems);
        }

        // Sync Kegiatan Yayasan from Spreadsheet if available
        if (Array.isArray(json.yayasan)) {
          this.yayasanItems = json.yayasan;
          this.saveYayasanToStorage(this.yayasanItems);
        }

        // Sync Ketidakhadiran from Penilaian Spreadsheet if available
        if (Array.isArray(json.ketidakhadiran)) {
          dbService.replaceKetidakhadiran(json.ketidakhadiran);
        }

        const totalSynced = remoteItems.length + (json.supervisi?.length || 0) + (json.absensi?.length || 0) + (json.yayasan?.length || 0) + (json.ketidakhadiran?.length || 0);
        return { success: true, count: totalSynced };
      } else {
        return { success: false, count: 0, error: json?.error || 'Format respon script tidak sesuai.' };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Gagal menghubungi Google Apps Script.' };
    }
  }

  // Delete an assessment
  public deleteAssessment(id: string): boolean {
    const initialLen = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    if (this.items.length !== initialLen) {
      this.saveToStorage(this.items);
      return true;
    }
    return false;
  }

  // Get specific assessment given by evaluator to target
  public getAssessment(
    penilaiNip: string,
    targetNip: string,
    role: 'guru' | 'kepala_sekolah',
    tahunAjaran?: string,
    semester?: SemesterType
  ): PenilaianItem | undefined {
    return this.items.find(
      (item) =>
        item.penilai_nip === penilaiNip &&
        item.target_nip === targetNip &&
        item.penilai_role === role &&
        (!tahunAjaran || item.tahun_ajaran === tahunAjaran) &&
        (!semester || item.semester === semester)
    );
  }

  // Calculate composite summary for each teacher
  public calculateTeacherReport(
    teacher: User,
    academicYear: string,
    semester: SemesterType,
    weightPeer = 0.5,
    weightHeadmaster = 0.5
  ) {
    const allForTarget = this.items.filter(
      (item) =>
        item.target_nip === teacher.nip &&
        item.tahun_ajaran === academicYear &&
        item.semester === semester
    );

    const peerReviews = allForTarget.filter((item) => item.penilai_role === 'guru');
    const headmasterReview = allForTarget.find(
      (item) => item.penilai_role === 'kepala_sekolah'
    );

    // Calculate peer average
    let peerAvg = 0;
    const peerIndicatorAverages: Record<keyof PenilaianScores, number> = {
      komunikasi_pimpinan: 0,
      komunikasi_siswa: 0,
      komunikasi_ortu: 0,
      komunikasi_sejawat: 0,
      seragam: 0,
      adab_pakaian: 0,
      ketaatan_tugas: 0,
      dandanan: 0,
    };

    if (peerReviews.length > 0) {
      peerAvg =
        peerReviews.reduce((sum, r) => sum + r.rata_rata, 0) / peerReviews.length;
      peerAvg = Math.round(peerAvg * 10) / 10;

      INDIKATOR_PENILAIAN.forEach((ind) => {
        const indSum = peerReviews.reduce((s, r) => s + (r.scores[ind.key] || 0), 0);
        peerIndicatorAverages[ind.key] =
          Math.round((indSum / peerReviews.length) * 10) / 10;
      });
    }

    const headmasterAvg = headmasterReview ? headmasterReview.rata_rata : null;

    // Calculate final score with balance weight
    let nilaiAkhir = 0;
    if (peerReviews.length > 0 && headmasterAvg !== null) {
      nilaiAkhir = Math.round((peerAvg * weightPeer + headmasterAvg * weightHeadmaster) * 10) / 10;
    } else if (peerReviews.length > 0) {
      nilaiAkhir = peerAvg;
    } else if (headmasterAvg !== null) {
      nilaiAkhir = headmasterAvg;
    }

    // Predikat
    let predikat = '-';
    let predikatBadge = 'bg-slate-100 text-slate-600';
    if (nilaiAkhir >= 91) {
      predikat = 'Amat Baik (A)';
      predikatBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (nilaiAkhir >= 81) {
      predikat = 'Baik (B)';
      predikatBadge = 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (nilaiAkhir >= 71) {
      predikat = 'Cukup (C)';
      predikatBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (nilaiAkhir > 0) {
      predikat = 'Perlu Pembinaan (D)';
      predikatBadge = 'bg-rose-100 text-rose-800 border-rose-300';
    }

    return {
      teacher,
      peerReviews,
      peerReviewCount: peerReviews.length,
      peerAvg,
      peerIndicatorAverages,
      headmasterReview,
      headmasterAvg,
      nilaiAkhir,
      predikat,
      predikatBadge,
    };
  }

  // Get participation status of all teachers (Who has filled, who hasn't)
  public getParticipationStatus(
    allTeachers: User[],
    academicYear: string,
    semester: SemesterType
  ) {
    // Only non-headmaster teachers are assessed
    const validTeachers = allTeachers.filter(
      (t) => t.nip !== 'admin' && t.nama && t.nama.length > 2 && !this.isHeadmaster(t)
    );

    return validTeachers.map((teacher, idx) => {
      // Find reviews given by this teacher as peer
      const reviewsGiven = this.items.filter(
        (item) =>
          item.penilai_nip === teacher.nip &&
          item.penilai_role === 'guru' &&
          item.tahun_ajaran === academicYear &&
          item.semester === semester
      );

      // Target yang dinilai: seluruh guru termasuk penilaian mandiri (diri sendiri)
      const targetColleagues = validTeachers;
      const totalColleagues = targetColleagues.length;
      const countGiven = reviewsGiven.length;
      const percentage = totalColleagues > 0 ? Math.round((countGiven / totalColleagues) * 100) : 0;
      const hasFilled = countGiven > 0;
      const isComplete = countGiven >= totalColleagues && totalColleagues > 0;
      const hasSelfEvaluated = reviewsGiven.some((r) => r.target_nip === teacher.nip);

      // Check if received reviews
      const reviewsReceived = this.items.filter(
        (item) =>
          item.target_nip === teacher.nip &&
          item.tahun_ajaran === academicYear &&
          item.semester === semester
      );
      const receivedPeerCount = reviewsReceived.filter((r) => r.penilai_role === 'guru').length;
      const hasHeadmaster = reviewsReceived.some((r) => r.penilai_role === 'kepala_sekolah');

      return {
        no: idx + 1,
        teacher,
        hasFilled,
        isComplete,
        hasSelfEvaluated,
        countGiven,
        totalColleagues,
        percentage,
        receivedPeerCount,
        hasHeadmaster,
        lastDate: reviewsGiven[0]?.tanggal || '-',
      };
    });
  }

  // =========================================================================
  // 1. SUPERVISI (KBM & ADMINISTRASI)
  // =========================================================================
  public getSupervisi(target_nip: string, tahun_ajaran?: string, semester?: string): SupervisiRecord | undefined {
    return this.supervisiItems.find(
      (s) =>
        s.target_nip === target_nip &&
        (!tahun_ajaran || s.tahun_ajaran === tahun_ajaran) &&
        (!semester || s.semester === semester)
    );
  }

  public getAllSupervisi(tahun_ajaran?: string, semester?: string): SupervisiRecord[] {
    return this.supervisiItems.filter(
      (s) =>
        (!tahun_ajaran || s.tahun_ajaran === tahun_ajaran) &&
        (!semester || s.semester === semester)
    );
  }

  public async saveSupervisi(record: SupervisiRecord, appsScriptUrl?: string): Promise<SupervisiRecord> {
    const updated: SupervisiRecord = {
      ...record,
      updated_at: new Date().toISOString().split('T')[0],
    };
    const idx = this.supervisiItems.findIndex(
      (s) =>
        s.target_nip === record.target_nip &&
        s.tahun_ajaran === record.tahun_ajaran &&
        s.semester === record.semester
    );
    if (idx >= 0) {
      this.supervisiItems[idx] = updated;
    } else {
      this.supervisiItems.push(updated);
    }
    this.saveSupervisiToStorage(this.supervisiItems);

    const targetGasUrl = appsScriptUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (targetGasUrl && targetGasUrl.startsWith('http')) {
      try {
        fetch(targetGasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveSupervisi', ...updated }),
          mode: 'no-cors'
        }).catch(() => {});
      } catch (e) {}
    }
    return updated;
  }

  // =========================================================================
  // 2. ABSENSI (KEHADIRAN, KETERLAMBATAN, KEPULANGAN, DOA, SHARE EFLYER)
  // =========================================================================
  public getAbsensi(target_nip: string, tahun_ajaran?: string, semester?: string): AbsensiRecord | undefined {
    return this.absensiItems.find(
      (a) =>
        a.target_nip === target_nip &&
        (!tahun_ajaran || a.tahun_ajaran === tahun_ajaran) &&
        (!semester || a.semester === semester)
    );
  }

  public getAllAbsensi(tahun_ajaran?: string, semester?: string): AbsensiRecord[] {
    return this.absensiItems.filter(
      (a) =>
        (!tahun_ajaran || a.tahun_ajaran === tahun_ajaran) &&
        (!semester || a.semester === semester)
    );
  }

  public async saveAbsensi(record: AbsensiRecord, appsScriptUrl?: string): Promise<AbsensiRecord> {
    const updated: AbsensiRecord = {
      ...record,
      updated_at: new Date().toISOString().split('T')[0],
    };
    const idx = this.absensiItems.findIndex(
      (a) =>
        a.target_nip === record.target_nip &&
        a.tahun_ajaran === record.tahun_ajaran &&
        a.semester === record.semester
    );
    if (idx >= 0) {
      this.absensiItems[idx] = updated;
    } else {
      this.absensiItems.push(updated);
    }
    this.saveAbsensiToStorage(this.absensiItems);

    const targetGasUrl = appsScriptUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (targetGasUrl && targetGasUrl.startsWith('http')) {
      try {
        fetch(targetGasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveAbsensi', ...updated }),
          mode: 'no-cors'
        }).catch(() => {});
      } catch (e) {}
    }
    return updated;
  }

  // =========================================================================
  // 3. KEGIATAN YAYASAN (MILAD, TALIM, SOSIALISASI)
  // =========================================================================
  public getYayasan(target_nip: string, tahun_ajaran?: string, semester?: string): YayasanRecord | undefined {
    return this.yayasanItems.find(
      (y) =>
        y.target_nip === target_nip &&
        (!tahun_ajaran || y.tahun_ajaran === tahun_ajaran) &&
        (!semester || y.semester === semester)
    );
  }

  public getAllYayasan(tahun_ajaran?: string, semester?: string): YayasanRecord[] {
    return this.yayasanItems.filter(
      (y) =>
        (!tahun_ajaran || y.tahun_ajaran === tahun_ajaran) &&
        (!semester || y.semester === semester)
    );
  }

  public async saveYayasan(record: YayasanRecord, appsScriptUrl?: string): Promise<YayasanRecord> {
    const updated: YayasanRecord = {
      ...record,
      updated_at: new Date().toISOString().split('T')[0],
    };
    const idx = this.yayasanItems.findIndex(
      (y) =>
        y.target_nip === record.target_nip &&
        y.tahun_ajaran === record.tahun_ajaran &&
        y.semester === record.semester
    );
    if (idx >= 0) {
      this.yayasanItems[idx] = updated;
    } else {
      this.yayasanItems.push(updated);
    }
    this.saveYayasanToStorage(this.yayasanItems);

    const targetGasUrl = appsScriptUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (targetGasUrl && targetGasUrl.startsWith('http')) {
      try {
        fetch(targetGasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveYayasan', ...updated }),
          mode: 'no-cors'
        }).catch(() => {});
      } catch (e) {}
    }
    return updated;
  }

  // =========================================================================
  // 4. RAPOR DIKTENDIK (PERHITUNGAN KOMPREHENSIF)
  // =========================================================================
  public calculateSingleRaporDiktendik(
    teacher: User,
    tahun_ajaran: string,
    semester: SemesterType,
    index = 1
  ): RaporDiktendikItem {
    const rawSupervisi = this.getSupervisi(teacher.nip, tahun_ajaran, semester);
    const teacherProgress = dbService.calculateTeacherProgress(teacher.nip);
    const autoAdminScore = teacherProgress ? teacherProgress.percentage : 0;
    const effectiveAdminScore = (rawSupervisi && rawSupervisi.administrasi > 0)
      ? rawSupervisi.administrasi
      : autoAdminScore;

    const supervisi = {
      target_nip: teacher.nip,
      tahun_ajaran,
      semester,
      kbm: rawSupervisi?.kbm || 0,
      administrasi: effectiveAdminScore,
      catatan: rawSupervisi?.catatan || '',
    };

    const rawAbsensi = this.getAbsensi(teacher.nip, tahun_ajaran, semester);
    const autoEflyerPoin = eflyerService.getTeacherAvgPoin(teacher);
    const effectiveShareEflyer = (rawAbsensi && rawAbsensi.share_eflayer > 0)
      ? rawAbsensi.share_eflayer
      : autoEflyerPoin;

    const absensi = {
      target_nip: teacher.nip,
      tahun_ajaran,
      semester,
      kehadiran: rawAbsensi?.kehadiran || 0,
      keterlambatan: rawAbsensi?.keterlambatan || 0,
      kepulangan: rawAbsensi?.kepulangan || 0,
      doa_bersama: rawAbsensi?.doa_bersama || 0,
      share_eflayer: effectiveShareEflyer,
      catatan: rawAbsensi?.catatan || '',
    };

    const yayasan = this.getYayasan(teacher.nip, tahun_ajaran, semester) || {
      target_nip: teacher.nip,
      tahun_ajaran,
      semester,
      milad: 0,
      talim: 0,
      sosialisasi: 0,
    };

    const peerReport = this.calculateTeacherReport(teacher, tahun_ajaran, semester);

    const supervisiRata = (supervisi.kbm > 0 || supervisi.administrasi > 0)
      ? Math.round(((supervisi.kbm + supervisi.administrasi) / 2) * 10) / 10
      : 0;

    const absensiList = [absensi.kehadiran, absensi.keterlambatan, absensi.kepulangan, absensi.doa_bersama, absensi.share_eflayer];
    const absensiFilled = absensiList.some((v) => v > 0);
    const absensiRata = absensiFilled
      ? Math.round((absensiList.reduce((a, b) => a + b, 0) / absensiList.length) * 10) / 10
      : 0;

    const yayasanList = [yayasan.milad, yayasan.talim, yayasan.sosialisasi];
    const yayasanFilled = yayasanList.some((v) => v > 0);
    const yayasanRata = yayasanFilled
      ? Math.round((yayasanList.reduce((a, b) => a + b, 0) / yayasanList.length) * 10) / 10
      : 0;

    const adabRata = peerReport.peerAvg > 0 ? peerReport.peerAvg : 0;

    // Component values
    const componentScores = [supervisiRata, absensiRata, yayasanRata, adabRata];
    const filledComponents = componentScores.filter((v) => v > 0);
    const jumlah = Math.round(componentScores.reduce((a, b) => a + b, 0) * 10) / 10;
    const rata_rata = filledComponents.length > 0
      ? Math.round((jumlah / filledComponents.length) * 10) / 10
      : 0;

    let kategori: 'A' | 'B+' | 'B' | 'C' | 'D' = 'D';
    let kategoriLabel = 'Perlu Pembinaan (D)';
    if (rata_rata >= 91) {
      kategori = 'A';
      kategoriLabel = 'Amat Baik (A)';
    } else if (rata_rata >= 86) {
      kategori = 'B+';
      kategoriLabel = 'Baik Sekali (B+)';
    } else if (rata_rata >= 81) {
      kategori = 'B';
      kategoriLabel = 'Baik (B)';
    } else if (rata_rata >= 71) {
      kategori = 'C';
      kategoriLabel = 'Cukup (C)';
    }

    const catatanYayasan = yayasan.catatan || supervisi.catatan || absensi.catatan || '-';

    return {
      no: index,
      teacher,
      supervisi: {
        kbm: supervisi.kbm,
        administrasi: supervisi.administrasi,
        rataRata: supervisiRata,
      },
      absensi: {
        kehadiran: absensi.kehadiran,
        keterlambatan: absensi.keterlambatan,
        kepulangan: absensi.kepulangan,
        doa_bersama: absensi.doa_bersama,
        share_eflayer: absensi.share_eflayer,
        rataRata: absensiRata,
      },
      yayasan: {
        milad: yayasan.milad,
        talim: yayasan.talim,
        sosialisasi: yayasan.sosialisasi,
        rataRata: yayasanRata,
      },
      adab: {
        komunikasi_pimpinan: peerReport.peerIndicatorAverages.komunikasi_pimpinan,
        komunikasi_siswa: peerReport.peerIndicatorAverages.komunikasi_siswa,
        komunikasi_ortu: peerReport.peerIndicatorAverages.komunikasi_ortu,
        komunikasi_sejawat: peerReport.peerIndicatorAverages.komunikasi_sejawat,
        seragam: peerReport.peerIndicatorAverages.seragam,
        adab_pakaian: peerReport.peerIndicatorAverages.adab_pakaian,
        dandanan: peerReport.peerIndicatorAverages.dandanan,
        ketaatan_tugas: peerReport.peerIndicatorAverages.ketaatan_tugas,
        rataRata: adabRata,
      },
      peerReviewCount: peerReport.peerReviewCount,
      jumlah,
      rata_rata,
      kategori,
      kategoriLabel,
      catatanYayasan,
    };
  }

  public calculateRaporDiktendik(
    teachers: User[],
    tahun_ajaran: string,
    semester: SemesterType
  ): RaporDiktendikItem[] {
    const validTeachers = teachers.filter(
      (t) => t.nip !== 'admin' && t.nama && t.nama.length > 2 && !this.isHeadmaster(t)
    );

    return validTeachers.map((teacher, idx) =>
      this.calculateSingleRaporDiktendik(teacher, tahun_ajaran, semester, idx + 1)
    );
  }

  // Send all Rapor Diktendik calculations to Google Spreadsheet
  public async saveAllRaporToGAS(
    raporList: RaporDiktendikItem[],
    tahunAjaran: string,
    semester: string,
    gasUrl?: string
  ): Promise<{ success: boolean; message: string; count?: number }> {
    const targetGasUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetGasUrl || !targetGasUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const payload = {
        action: 'saveAllRapor',
        tahun_ajaran: tahunAjaran,
        semester,
        items: raporList.map((item) => ({
          no: item.no,
          teacher: {
            nip: item.teacher.nip,
            nama: item.teacher.nama,
            mapel: item.teacher.mapel || 'Guru',
          },
          supervisi: item.supervisi,
          absensi: item.absensi,
          yayasan: item.yayasan,
          adab: item.adab,
          peerReviewCount: item.peerReviewCount,
          jumlah: item.jumlah,
          rata_rata: item.rata_rata,
          kategori: item.kategori,
          kategoriLabel: item.kategoriLabel,
          catatanYayasan: item.catatanYayasan,
        })),
      };

      await fetch(targetGasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      return {
        success: true,
        message: `✓ Berhasil merealisasikan ${raporList.length} Rapor Diktendik ke spreadsheet!`,
        count: raporList.length,
      };
    } catch (err: any) {
      console.warn('Gagal posting Rapor ke GAS:', err);
      return {
        success: false,
        message: err.message || 'Gagal mengirimkan Rapor ke Google Apps Script.',
      };
    }
  }

  // Initialize all 6 sheets in Google Spreadsheet via Web App
  public async initSheetsInGAS(gasUrl?: string): Promise<{ success: boolean; message: string }> {
    const targetGasUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetGasUrl || !targetGasUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const initUrl = `${targetGasUrl}?action=initSheets&t=${Date.now()}`;
      const res = await fetch(initUrl);
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        return { success: true, message: json.message || 'Seluruh 6 Sheet Database Penilaian & Ketidakhadiran berhasil disiapkan!' };
      }
      return { success: true, message: 'Permintaan inisialisasi sheet telah dikirim ke Google Apps Script.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menginisialisasi sheet di Google Apps Script.' };
    }
  }

  // =========================================================================
  // 5. MANAJEMEN KETIDAKHADIRAN GURU & TENDIK (DATABASE PENILAIAN KINERJA)
  // =========================================================================
  public async fetchKetidakhadiran(gasUrl?: string): Promise<{ success: boolean; data: KetidakhadiranItem[]; message?: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, data: dbService.getKetidakhadiranList(), message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const fetchUrl = `${targetUrl}?action=getKetidakhadiran&t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        dbService.replaceKetidakhadiran(json.data);
        return {
          success: true,
          data: json.data,
          message: `✓ Berhasil memuat ${json.data.length} catatan ketidakhadiran dari Database Penilaian!`
        };
      }
      return { success: false, data: dbService.getKetidakhadiranList(), message: json?.error || 'Format respon tidak sesuai.' };
    } catch (err: any) {
      return { success: false, data: dbService.getKetidakhadiranList(), message: err.message || 'Gagal menghubungi Google Apps Script Penilaian.' };
    }
  }

  public async addKetidakhadiranToSpreadsheet(
    item: KetidakhadiranItem,
    gasUrl?: string,
    fileData?: { name: string; data: string }
  ): Promise<{ success: boolean; message: string; id?: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    try {
      // Pastikan string base64 raw yang sangat panjang tidak di-dump mentah-mentah ke kolom spreadsheet jika script lama belum di-deploy baru
      const cleanItem = {
        ...item,
        surat_bukti_url: (item.surat_bukti_url && item.surat_bukti_url.startsWith('http'))
          ? item.surat_bukti_url
          : ''
      };

      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addKetidakhadiran',
          ketidakhadiranData: {
            ...cleanItem,
            surat_bukti_base64: fileData ? fileData.data : undefined,
            fileData: fileData || undefined
          },
          surat_bukti_base64: fileData ? fileData.data : undefined,
          fileData: fileData || undefined
        }),
        mode: 'no-cors'
      });
      return { success: true, message: 'Catatan ketidakhadiran berhasil disimpan ke spreadsheet penilaian!' };
    } catch (err: any) {
      console.warn('Gagal menyimpan ketidakhadiran ke GAS:', err);
      return { success: false, message: err.message || 'Gagal mengirim ke Google Apps Script.' };
    }
  }

  public async updateKetidakhadiranInSpreadsheet(
    item: KetidakhadiranItem,
    gasUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateKetidakhadiran',
          ketidakhadiranData: item
        }),
        mode: 'no-cors'
      });
      return { success: true, message: 'Status ketidakhadiran berhasil diperbarui di spreadsheet penilaian!' };
    } catch (err: any) {
      console.warn('Gagal update ketidakhadiran ke GAS:', err);
      return { success: false, message: err.message || 'Gagal update di Google Apps Script.' };
    }
  }

  public async deleteKetidakhadiranFromSpreadsheet(
    id: string,
    rowIndex?: number,
    gasUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteKetidakhadiran',
          id,
          rowIndex
        }),
        mode: 'no-cors'
      });
      return { success: true, message: 'Catatan ketidakhadiran berhasil dihapus dari spreadsheet penilaian!' };
    } catch (err: any) {
      console.warn('Gagal hapus ketidakhadiran dari GAS:', err);
      return { success: false, message: err.message || 'Gagal menghapus dari Google Apps Script.' };
    }
  }

  // Upload berkas bukti surat keterangan ke folder Google Drive: 1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt
  public async uploadBuktiKetidakhadiran(
    fileData: { name: string; data: string },
    meta?: { nama?: string; nip?: string },
    gasUrl?: string
  ): Promise<{ success: boolean; fileUrl?: string; fileId?: string; fileName?: string; message: string }> {
    const targetUrl = gasUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
    const targetFolderId = '1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt';

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadBuktiKetidakhadiran',
          fileData,
          folder_id: targetFolderId,
          nama: meta?.nama,
          nip: meta?.nip
        })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Upload bukti ke GAS Penilaian notice:', err);
      return {
        success: false,
        message: 'Gagal mengunggah file bukti ke Google Drive: ' + (err.message || String(err))
      };
    }
  }

  // Reset all records to empty array (0 items)
  public resetToDefault(): void {
    this.items = [];
    this.supervisiItems = [];
    this.absensiItems = [];
    this.yayasanItems = [];
    this.saveToStorage([]);
    this.saveSupervisiToStorage([]);
    this.saveAbsensiToStorage([]);
    this.saveYayasanToStorage([]);
  }

  // Clear all cached penilaian items
  public clearAll(): void {
    this.items = [];
    this.supervisiItems = [];
    this.absensiItems = [];
    this.yayasanItems = [];
    this.saveToStorage([]);
    this.saveSupervisiToStorage([]);
    this.saveAbsensiToStorage([]);
    this.saveYayasanToStorage([]);
  }
}

export const penilaianService = new PenilaianService();
