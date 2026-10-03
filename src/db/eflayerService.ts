import { User } from '../types';

export interface EflyerReport {
  id: string;
  timestamp: string;
  tanggal_update: string; // ISO or M/D/YYYY
  nama: string;
  platform: string; // e.g., "Status WA", "Instagram", etc.
  bukti_1: string; // URL or Data URL
  bukti_2?: string;
  bukti_3?: string;
  bukti_4?: string;
  source: 'spreadsheet' | 'local';
}

export interface MonthSummary {
  monthIndex: number; // 0 = Jan, 11 = Des
  monthName: string; // "Januari", "Februari", etc.
  shareCount: number;
  poin: number;
}

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

// Kriteria Poin Sesuai Permintaan Resmi:
// 0: 0 | 1: 56 | 2: 58 | ... | 19: 92 | 20+: 100
export function calculateEflyerPoin(shareCount: number): number {
  if (!shareCount || shareCount <= 0) return 0;
  if (shareCount >= 20) return 100;
  return 56 + (shareCount - 1) * 2;
}

// Ekstrak ID berkas dari berbagai format tautan Google Drive
export function extractDriveFileId(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) return matchFile[1];
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  return null;
}

// Konversi tautan halaman web Google Drive (open?id=...) menjadi URL langsung gambar (CDN)
export function getDriveDirectImageUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:image')) return trimmed;

  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return trimmed;
}

// Thumbnail resmi Google Drive
export function getDriveThumbnailUrl(rawUrl?: string, size = 800): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:image')) return trimmed;

  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }
  return trimmed;
}

// Tautan embed preview (iframe) resmi Google Drive
export function getDrivePreviewEmbedUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const fileId = extractDriveFileId(rawUrl);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return rawUrl;
}

const EFLAYER_SPREADSHEET_ID = '1rJ45wTNmzykqXgjiep6HN0euVuI-S86Zze_dZuFAYBY';
const EFLAYER_SHEET_NAME = 'Form Responses 1';
const LOCAL_STORAGE_KEY = 'portal_guru_eflayer_local_submissions_v1';
const CACHE_STORAGE_KEY = 'portal_guru_eflayer_sheet_cache_v1';

export class EflyerService {
  private static instance: EflyerService;

  public static getInstance(): EflyerService {
    if (!EflyerService.instance) {
      EflyerService.instance = new EflyerService();
    }
    return EflyerService.instance;
  }

  // Parse various date representations in Google Sheets / Form responses
  public parseDate(rawDate: string): { year: number; month: number; day: number; formatted: string } {
    if (!rawDate) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), formatted: now.toISOString().split('T')[0] };
    }

    // Google Visualization format: Date(2023,6,10) (month is 0-indexed)
    const gvizMatch = rawDate.match(/Date\((\d+),(\d+),(\d+)/);
    if (gvizMatch) {
      const y = parseInt(gvizMatch[1], 10);
      const m = parseInt(gvizMatch[2], 10) + 1; // Convert 0-indexed to 1-12
      const d = parseInt(gvizMatch[3], 10);
      return { year: y, month: m, day: d, formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }

    // Standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(rawDate)) {
      const parts = rawDate.split('T')[0].split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return { year: y, month: m, day: d, formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }

    // M/D/YYYY or D/M/YYYY
    const slashParts = rawDate.split(' ')[0].split('/');
    if (slashParts.length === 3) {
      const p1 = parseInt(slashParts[0], 10);
      const p2 = parseInt(slashParts[1], 10);
      const p3 = parseInt(slashParts[2], 10);
      // Usually Google Sheets in US locale is M/D/YYYY
      const y = p3 < 100 ? 2000 + p3 : p3;
      const m = p1 <= 12 ? p1 : p2;
      const d = p1 <= 12 ? p2 : p1;
      return { year: y, month: m, day: d, formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }

    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), formatted: d.toISOString().split('T')[0] };
    }

    const fallback = new Date();
    return { year: fallback.getFullYear(), month: fallback.getMonth() + 1, day: fallback.getDate(), formatted: fallback.toISOString().split('T')[0] };
  }

  // Get local reports stored in browser
  public getLocalReports(): EflyerReport[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed reading local eflyer reports:', e);
    }
    return [];
  }

  // Save new local report
  public saveLocalReport(report: Omit<EflyerReport, 'id' | 'source'>): EflyerReport {
    const list = this.getLocalReports();
    const newReport: EflyerReport = {
      ...report,
      id: `EFL-LOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      source: 'local'
    };
    list.unshift(newReport);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return newReport;
  }

  // Send report to Google Apps Script Web App so it appends row to Spreadsheet and uploads screenshots to Google Drive
  public async submitToAppsScript(
    report: Omit<EflyerReport, 'id' | 'source'>,
    scriptUrl?: string
  ): Promise<{
    success: boolean;
    message: string;
    remoteRow?: number;
    driveUrls?: {
      bukti_1?: string;
      bukti_2?: string;
      bukti_3?: string;
      bukti_4?: string;
    };
  }> {
    if (!scriptUrl || !scriptUrl.trim()) {
      return {
        success: false,
        message: 'URL Google Apps Script belum dikonfigurasi. Data tersimpan di penyimpanan lokal portal.',
      };
    }

    try {
      const payload = {
        action: 'addEflyer',
        tanggal_update: report.tanggal_update,
        nama: report.nama,
        platform: report.platform,
        bukti_1: report.bukti_1,
        bukti_2: report.bukti_2 || '',
        bukti_3: report.bukti_3 || '',
        bukti_4: report.bukti_4 || '',
      };

      const res = await fetch(scriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json && (json.success || json.status === 'success')) {
        return {
          success: true,
          message: json.message || 'Data berhasil dikirim dan tersimpan ke Google Drive & Spreadsheet!',
          remoteRow: json.rowAdded,
          driveUrls: {
            bukti_1: json.bukti1 || json.driveUrls?.bukti_1,
            bukti_2: json.bukti2 || json.driveUrls?.bukti_2,
            bukti_3: json.bukti3 || json.driveUrls?.bukti_3,
            bukti_4: json.bukti4 || json.driveUrls?.bukti_4,
          },
        };
      } else {
        return {
          success: false,
          message: json?.error || json?.message || 'Respon Google Script tidak berhasil.',
        };
      }
    } catch (err: any) {
      console.warn('POST to Apps Script failed:', err);
      return {
        success: false,
        message: 'Gagal mengirim ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // Fetch live reports from Google Spreadsheet Form Responses 1
  public async fetchSpreadsheetReports(): Promise<{ success: boolean; data: EflyerReport[]; message?: string }> {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${EFLAYER_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(EFLAYER_SHEET_NAME)}&_t=${Date.now()}`;
      
      const res = await fetch(csvUrl);
      const text = await res.text();

      // Extract JSON from Google's /*O_o*/ google.visualization.Query.setResponse({...});
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Format respon Google Sheets tidak sesuai');
      }

      const rawJson = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      const rows = rawJson?.table?.rows || [];

      const parsedReports: EflyerReport[] = [];

      rows.forEach((row: any, index: number) => {
        const c = row?.c || [];
        const nama = c[2]?.v ? String(c[2].v).trim() : '';
        // Skip header or empty rows
        if (!nama || nama.toLowerCase() === 'nama' || nama === '1' || nama === '0') {
          return;
        }

        const rawTimestamp = c[0]?.f || c[0]?.v || '';
        const rawTanggal = c[1]?.f || c[1]?.v || rawTimestamp || '';
        const platform = c[3]?.v ? String(c[3].v).trim() : 'Status WA';
        const bukti1 = c[4]?.v ? String(c[4].v).trim() : '';
        const bukti2 = c[5]?.v ? String(c[5].v).trim() : '';
        const bukti3 = c[6]?.v ? String(c[6].v).trim() : '';
        const bukti4 = c[7]?.v ? String(c[7].v).trim() : '';

        parsedReports.push({
          id: `EFL-SS-${index + 1}`,
          timestamp: String(rawTimestamp),
          tanggal_update: String(rawTanggal),
          nama,
          platform,
          bukti_1: bukti1,
          bukti_2: bukti2,
          bukti_3: bukti3,
          bukti_4: bukti4,
          source: 'spreadsheet'
        });
      });

      // Save cache in localStorage (sample of latest 1500 to keep within storage limits)
      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsedReports.slice(0, 1500)));
      } catch (err) {
        console.warn('Cache quota exceeded, skipping local storage cache of all rows');
      }

      return { success: true, data: parsedReports };
    } catch (err: any) {
      console.warn('Fetch from spreadsheet failed, using cache:', err);
      // Fallback to cache if available
      try {
        const cached = localStorage.getItem(CACHE_STORAGE_KEY);
        if (cached) {
          return { success: true, data: JSON.parse(cached), message: 'Menggunakan data cache tersimpan' };
        }
      } catch (e) {
        // ignore
      }
      return { success: false, data: [], message: err.message || 'Gagal memuat data dari Spreadsheet' };
    }
  }

  // Get all reports combined (local + spreadsheet)
  public async getAllReports(): Promise<EflyerReport[]> {
    const local = this.getLocalReports();
    const sheetRes = await this.fetchSpreadsheetReports();
    const sheet = sheetRes.success ? sheetRes.data : [];

    // Deduplicate and combine (local first)
    return [...local, ...sheet];
  }

  // Clean teacher name comparison to handle academic titles
  public normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/,/g, '')
      .replace(/\./g, '')
      .replace(/s\.?pd\.?i?/g, '')
      .replace(/m\.?pd\.?i?/g, '')
      .replace(/s\.?hum\.?/g, '')
      .replace(/s\.?kom\.?/g, '')
      .replace(/s\.?or\.?/g, '')
      .replace(/s\.?sos\.?/g, '')
      .replace(/s\.?si\.?/g, '')
      .replace(/s\.?ag\.?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Check if a report belongs to a given user
  public isReportForUser(report: EflyerReport, user: User): boolean {
    if (!user) return false;
    const repNameNorm = this.normalizeName(report.nama);
    const userNameNorm = this.normalizeName(user.nama);

    if (repNameNorm === userNameNorm) return true;
    if (userNameNorm.length > 4 && repNameNorm.includes(userNameNorm)) return true;
    if (repNameNorm.length > 4 && userNameNorm.includes(repNameNorm)) return true;

    // Check aliases if available
    if (user.nip_aliases && user.nip_aliases.length > 0) {
      for (const alias of user.nip_aliases) {
        const aliasNorm = this.normalizeName(alias);
        if (aliasNorm && (aliasNorm === repNameNorm || repNameNorm.includes(aliasNorm))) {
          return true;
        }
      }
    }

    return false;
  }

  // Calculate monthly summary (Jan - Des) for a specific teacher and year
  public calculateTeacherMonthlySummary(
    reports: EflyerReport[],
    teacher: User,
    targetYear: number
  ): MonthSummary[] {
    const teacherReports = reports.filter((r) => {
      if (!this.isReportForUser(r, teacher)) return false;
      const parsed = this.parseDate(r.tanggal_update || r.timestamp);
      return parsed.year === targetYear;
    });

    const summaries: MonthSummary[] = MONTH_NAMES.map((name, index) => {
      const monthNum = index + 1;
      const monthReports = teacherReports.filter((r) => {
        const parsed = this.parseDate(r.tanggal_update || r.timestamp);
        return parsed.month === monthNum;
      });

      const count = monthReports.length;
      return {
        monthIndex: index,
        monthName: name,
        shareCount: count,
        poin: calculateEflyerPoin(count),
      };
    });

    return summaries;
  }
}

export const eflyerService = EflyerService.getInstance();

export const EFLAYER_DRIVE_PARENT_FOLDER_ID = '1FA0fW-BwTF8EyRJ4F7FXYzjkUVLPr7Sj2kkKKTb_THRopT94npUSxtQIDpqMCjUXvl5MESYe';

export const RECOMMENDED_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT KHUSUS UPDATE EFLAYER & SOSMED
 * Spreadsheet ID: 1rJ45wTNmzykqXgjiep6HN0euVuI-S86Zze_dZuFAYBY
 * Sheet: "Form Responses 1"
 * Folder Utama Drive: 1FA0fW-BwTF8EyRJ4F7FXYzjkUVLPr7Sj2kkKKTb_THRopT94npUSxtQIDpqMCjUXvl5MESYe
 * (Raport Guru > Laporan Update Sosme...)
 * 
 * Subfolder Otomatis:
 * 1. Bukti Update (Screenshoot) 1 (File responses)
 * 2. Bukti Update (Screenshoot) 2 (File responses)
 * 3. Bukti Update (Screenshoot) 3 (File responses)
 * 4. Bukti Update (Screenshoot) 4 (File responses)
 */

var PARENT_FOLDER_ID = "1FA0fW-BwTF8EyRJ4F7FXYzjkUVLPr7Sj2kkKKTb_THRopT94npUSxtQIDpqMCjUXvl5MESYe";

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    if (data.action === 'addEflyer') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Form Responses 1");
      
      if (!sheet) {
        sheet = ss.insertSheet("Form Responses 1");
        sheet.appendRow([
          "Timestamp", 
          "Tanggal Update", 
          "Nama", 
          "Update Iklan/Eflayer di?", 
          "Bukti Update (Screenshoot) 1", 
          "Bukti Update (Screenshoot) 2", 
          "Bukti Update (Screenshoot) 3", 
          "Bukti Update (Screenshoot) 4"
        ]);
      }

      // Pemetaan langsung 4 ID subfolder dari Google Drive Anda
      var FOLDER_MAP = {
        1: "1X8toPB6eS9zrWvyNGeQt-qrlc_Gm4HrsqD1i0TRn9YigjstMY7rvsdwdQo7qegfsL9-4qb1u",
        2: "1zsVrS_PECmdPlqSKOq87kbiH8o8RPR8VGdmPsKomgHFlO4DD4gfqtdpruJc3iMeHfebdjri2",
        3: "13ywN4mi08nVKkW1FUKV4uRQd7g6aYXZXQmlEy09nMeZd0zL4IZdrtsTpeEhKeTTFSOnZP5lY",
        4: "13B_LX0hLZXlZ1a6djk7D5k_5NXWEbNk7WRCxAPAhOYGWKqoElqZtNWRhXhpSCm7AdumuiX9W"
      };

      // Ambil folder tujuan langsung berdasarkan ID subfolder yang telah ditentukan
      function getTargetFolder(boxNumber) {
        var folderId = FOLDER_MAP[boxNumber];
        if (folderId) {
          try {
            return DriveApp.getFolderById(folderId);
          } catch (eMap) {
            Logger.log("Peringatan: Gagal membuka folder ID " + folderId + ": " + eMap.toString());
          }
        }

        // Fallback jika terjadi kendala akses pada subfolder
        try {
          var parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
          return parentFolder;
        } catch (err) {
          return DriveApp.getRootFolder();
        }
      }

      // Simpan file base64 ke Google Drive dan kembalikan URL Google Drive
      function saveFileToDrive(base64Data, fileName, boxNumber) {
        if (!base64Data || !base64Data.startsWith('data:image')) {
          return base64Data || '';
        }
        try {
          var targetFolder = getTargetFolder(boxNumber);
          var parts = base64Data.split(',');
          var contentType = parts[0].split(':')[1].split(';')[0];
          var decoded = Utilities.base64Decode(parts[1]);
          var blob = Utilities.newBlob(decoded, contentType, fileName);
          
          // 1. Buat berkas di Google Drive
          var file = targetFolder.createFile(blob);
          var fileUrl = "https://drive.google.com/open?id=" + file.getId();
          
          // 2. Berikan izin akses berbagi jika didukung domain akun belajar.id
          // (Dibungkus try-catch agar pembatasan domain tidak membatalkan URL)
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (eShare) {
            // Abaikan jika kebijakan admin belajar.id membatasi setSharing eksternal
          }
          
          // 3. Kembalikan URL Google Drive yang valid
          return fileUrl;
        } catch (err) {
          return "Upload Gagal: " + err.toString();
        }
      }

      var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "M/d/yyyy HH:mm:ss");
      var namaGuru = data.nama || "";
      var tglUpdate = data.tanggal_update || Utilities.formatDate(new Date(), "Asia/Jakarta", "M/d/yyyy");
      var platform = data.platform || "Status WA";
      var safeName = namaGuru.replace(/[^a-zA-Z0-9]/g, "_");

      // Simpan berkas bukti ke masing-masing subfolder di Google Drive
      var bukti1 = saveFileToDrive(data.bukti_1, "Bukti_1_" + safeName + "_" + Date.now() + ".png", 1);
      var bukti2 = saveFileToDrive(data.bukti_2, "Bukti_2_" + safeName + "_" + Date.now() + ".png", 2);
      var bukti3 = saveFileToDrive(data.bukti_3, "Bukti_3_" + safeName + "_" + Date.now() + ".png", 3);
      var bukti4 = saveFileToDrive(data.bukti_4, "Bukti_4_" + safeName + "_" + Date.now() + ".png", 4);

      // Sisipkan baris baru di sheet Form Responses 1
      sheet.appendRow([
        timestamp,
        tglUpdate,
        namaGuru,
        platform,
        bukti1,
        bukti2,
        bukti3,
        bukti4
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Data laporan Eflayer dan berkas screenshoot berhasil disimpan ke Google Drive & Spreadsheet!",
        rowAdded: sheet.getLastRow(),
        bukti1: bukti1,
        bukti2: bukti2,
        bukti3: bukti3,
        bukti4: bukti4
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Action tidak dikenali."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Google Script Update Eflayer Aktif dan Siap Menerima Laporan.").setMimeType(ContentService.MimeType.TEXT);
}`;

