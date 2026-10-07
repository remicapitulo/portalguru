import { User } from '../types';
import { dbService } from './storage';

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

const EFLAYER_SPREADSHEET_ID = '1MhXpEaCXJJSkwoRTtMi1yofgBRvyOgqX7nSdREJn-bU';
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

  constructor() {
    this.sanitizeStorage();
  }

  // Bersihkan kuota localStorage dari sisa data gambar raksasa lawas jika hampir penuh
  private sanitizeStorage(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && raw.length > 1.5 * 1024 * 1024) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.slice(0, 35).map((item, idx) => {
            if (idx >= 3) {
              return {
                ...item,
                bukti_1: item.bukti_1?.startsWith('data:') ? '' : item.bukti_1,
                bukti_2: '',
                bukti_3: '',
                bukti_4: '',
              };
            }
            return item;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      // Abaikan jika error
    }
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
      let y = parseInt(parts[0], 10);
      if (y === 2926) y = 2026;
      if (y === 2925) y = 2025;
      if (y === 26 || y === 2026) y = 2026;
      if (y === 25 || y === 2025) y = 2025;
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return { year: y, month: m, day: d, formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
    }

    // M/D/YYYY or D/M/YYYY or YYYY/M/D
    const slashParts = rawDate.split(' ')[0].split('/');
    if (slashParts.length === 3) {
      const p1 = parseInt(slashParts[0], 10);
      const p2 = parseInt(slashParts[1], 10);
      let p3 = parseInt(slashParts[2], 10);
      if (p1 > 1000) {
        let y = p1;
        if (y === 2926) y = 2026;
        if (y === 2925) y = 2025;
        const m = p2;
        const d = p3;
        return { year: y, month: m, day: d, formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
      }
      let y = p3 < 100 ? 2000 + p3 : p3;
      if (y === 2926) y = 2026;
      if (y === 2925) y = 2025;
      if (y === 26 || y === 2026) y = 2026;
      if (y === 25 || y === 2025) y = 2025;
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

  // Save new local report with robust quota-protection and fallback
  public saveLocalReport(report: Omit<EflyerReport, 'id' | 'source'>): EflyerReport {
    const list = this.getLocalReports();
    const newReport: EflyerReport = {
      ...report,
      id: `EFL-LOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      source: 'local'
    };
    list.unshift(newReport);

    // 1. Coba simpan normal
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      return newReport;
    } catch (quotaErr) {
      console.warn('Penyimpanan browser penuh, melakukan pembersihan otomatis:', quotaErr);
    }

    // 2. Pemulihan tahap 1: Bersihkan cache spreadsheet sementara
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch (_) {}

    // 3. Pemulihan tahap 2: Simpan dengan memangkas foto lama (hanya simpan foto 3 laporan terbaru)
    try {
      const pruned = list.slice(0, 35).map((item, idx) => {
        if (idx >= 3) {
          return {
            ...item,
            bukti_1: item.bukti_1?.startsWith('data:') ? '' : item.bukti_1,
            bukti_2: '',
            bukti_3: '',
            bukti_4: '',
          };
        }
        return item;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pruned));
      return newReport;
    } catch (pruneErr) {
      console.warn('Pemangkasan foto gagal, beralih ke penyimpanan metadata tanpa gambar:', pruneErr);
    }

    // 4. Pemulihan tahap 3: Simpan metadata ringkas agar seluruh poin & log guru tetap 100% aman
    try {
      const minimal = list.slice(0, 25).map((item, idx) => {
        if (idx > 0) {
          return {
            ...item,
            bukti_1: '',
            bukti_2: '',
            bukti_3: '',
            bukti_4: '',
          };
        }
        return item;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(minimal));
    } catch (finalErr) {
      console.error('Penyimpanan lokal penuh, menyimpan di memori sesi aktif:', finalErr);
    }

    return newReport;
  }

  // Send report to Google Apps Script Web App with timeout and non-JSON protection
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
        message: 'URL Google Apps Script belum dikonfigurasi.',
      };
    }

    try {
      const payload = {
        action: 'addEflyer',
        tanggal_update: report.tanggal_update,
        nama: report.nama,
        platform: report.platform,
        bukti_1: report.bukti_1 || '',
        bukti_2: report.bukti_2 || '',
        bukti_3: report.bukti_3 || '',
        bukti_4: report.bukti_4 || '',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      let res: Response;
      try {
        res = await fetch(scriptUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        // Respons bukan JSON (misal HTML 404 Google Drive / izin)
        return {
          success: false,
          message: 'Layanan Google Script belum aktif atau tidak dapat diakses publik. Laporan tersimpan di sistem internal portal.',
        };
      }

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
          message: json?.error || json?.message || 'Respon Google Script belum berhasil.',
        };
      }
    } catch (err: any) {
      console.warn('POST to Apps Script failed:', err);
      const isAbort = err?.name === 'AbortError';
      return {
        success: false,
        message: isAbort
          ? 'Waktu koneksi ke Google Script habis (timeout).'
          : 'Koneksi ke Google Apps Script belum dapat dijangkau.',
      };
    }
  }

  // Fetch live reports from Google Spreadsheet Form Responses 1
  public async fetchSpreadsheetReports(): Promise<{ success: boolean; data: EflyerReport[]; message?: string }> {
    // 1. Jalur Utama Tercepat: Google Visualization API (jika Spreadsheet memiliki izin Pelihat)
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${EFLAYER_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(EFLAYER_SHEET_NAME)}&_t=${Date.now()}`;
      
      const res = await fetch(csvUrl);
      if (res.status === 200) {
        const text = await res.text();
        if (!text.includes('ServiceLogin') && !text.includes('accounts.google.com') && !text.startsWith('<!DOCTYPE html>')) {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const rawJson = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            const rows = rawJson?.table?.rows || [];

            const parsedReports: EflyerReport[] = [];

            rows.forEach((row: any, index: number) => {
              const c = row?.c || [];
              const nama = c[2]?.v ? String(c[2].v).trim() : '';
              if (!nama || nama.toLowerCase() === 'nama' || nama === '1' || nama === '0') {
                return;
              }

              const rawTimestamp = c[0]?.f || c[0]?.v || '';

              // Prioritas Utama Kolom B: "Tanggal Update" (Sesuai Permintaan Resmi Pengguna)
              let resolvedTanggal = '';
              const c1Val = c[1]?.v;
              const c1Fmt = c[1]?.f;

              if (c1Val && String(c1Val).startsWith('Date(')) {
                const m = String(c1Val).match(/Date\((\d+),(\d+),(\d+)/);
                if (m) {
                  const y = parseInt(m[1], 10);
                  const mo = parseInt(m[2], 10) + 1;
                  const d = parseInt(m[3], 10);
                  resolvedTanggal = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                }
              }

              if (!resolvedTanggal && c1Fmt) {
                resolvedTanggal = String(c1Fmt).trim();
              } else if (!resolvedTanggal && c1Val) {
                resolvedTanggal = String(c1Val).trim();
              }

              // Fallback jika Kolom B kosong ke Kolom A (Timestamp)
              if (!resolvedTanggal) {
                resolvedTanggal = String(rawTimestamp).trim();
              }

              const platform = c[3]?.v ? String(c[3].v).trim() : 'Status WA';
              const bukti1 = c[4]?.v ? String(c[4].v).trim() : '';
              const bukti2 = c[5]?.v ? String(c[5].v).trim() : '';
              const bukti3 = c[6]?.v ? String(c[6].v).trim() : '';
              const bukti4 = c[7]?.v ? String(c[7].v).trim() : '';

              parsedReports.push({
                id: `EFL-SS-${index + 1}`,
                timestamp: String(rawTimestamp),
                tanggal_update: resolvedTanggal,
                nama,
                platform,
                bukti_1: bukti1,
                bukti_2: bukti2,
                bukti_3: bukti3,
                bukti_4: bukti4,
                source: 'spreadsheet'
              });
            });

            // Simpan data terbaru ke cache
            try {
              localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsedReports.slice(-2500)));
            } catch (err) {
              // ignore
            }

            return { success: true, data: parsedReports };
          }
        }
      }
    } catch (gvizErr) {
      console.warn('GViz direct query skipped or failed, trying Google Apps Script fallback:', gvizErr);
    }

    // 2. Jalur Alternatif Mandiri: Google Apps Script Web App (Privat, Tanpa Share Public)
    const scriptUrl = dbService.getConfig().eflayer_apps_script_url || 'https://script.google.com/macros/s/AKfycbzwl296baWL4h3gCVlkWYzcEocV-wO3i-V0SZykFD5N29xBsyq2XZIjvGjv_NPzbQsW/exec';
    if (scriptUrl) {
      try {
        const gasUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=getEflyer&_t=${Date.now()}`;
        const gasRes = await fetch(gasUrl);
        const gasJson = await gasRes.json();
        if (gasJson && gasJson.success && Array.isArray(gasJson.data) && gasJson.data.length > 0) {
          try {
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(gasJson.data.slice(-2500)));
          } catch (e) {
            // ignore
          }
          return { success: true, data: gasJson.data };
        }
      } catch (gasErr) {
        console.warn('Google Apps Script fetch failed:', gasErr);
      }
    }

    // 3. Fallback ke Cache Lokal jika tersedia
    try {
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { success: true, data: parsed, message: 'Menggunakan data cache tersimpan' };
        }
      }
    } catch (e) {
      // ignore
    }

    return {
      success: false,
      data: [],
      message: 'Akses Spreadsheet saat ini "Dibatasi" dan Google Script belum mengembalikan data. Anda dapat mengubah Akses Umum Spreadsheet menjadi "Siapa saja yang memiliki link: Pelihat" agar data otomatis ditarik langsung, ATAU perbarui kode Google Apps Script (fungsi doGet).'
    };
  }

  // Get all reports combined (local + spreadsheet)
  public async getAllReports(): Promise<EflyerReport[]> {
    const local = this.getLocalReports();
    const sheetRes = await this.fetchSpreadsheetReports();
    const sheet = sheetRes.success ? sheetRes.data : [];

    // Deduplicate and combine (local first)
    return [...local, ...sheet];
  }

  // Helper ekstrak kata nama tanpa gelar akademik dan variasi konsonan ganda
  public getNameTokens(str?: string): string[] {
    if (!str) return [];
    const titles = new Set([
      'spd', 'mpd', 'ssos', 'shum', 'skom', 'sor', 'ssi', 'sag', 'si',
      'spdi', 'mpdi', 'sgeo', 'st', 'se', 'mm', 'dra', 'drs'
    ]);
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((w) =>
        w
          .replace(/ll/g, 'l')
          .replace(/rr/g, 'r')
          .replace(/ff/g, 'f')
          .replace(/tt/g, 't')
          .replace(/ch/g, 'c')
      )
      .filter((w) => w.length > 1 && !titles.has(w));
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

  // Check if a report belongs to a given user (cerdas dan akurat)
  public isReportForUser(report: EflyerReport, user: User): boolean {
    if (!user) return false;
    const reportName = report.nama || '';
    const userName = user.nama || '';

    // Kecocokan langsung
    if (reportName.toLowerCase().trim() === userName.toLowerCase().trim()) return true;

    const repTokens = this.getNameTokens(reportName);
    const userTokens = this.getNameTokens(userName);

    if (repTokens.length > 0 && userTokens.length > 0) {
      if (repTokens.join('') === userTokens.join('')) return true;

      const common = repTokens.filter((w) =>
        userTokens.includes(w) ||
        userTokens.some((uw) => (w.length >= 4 && uw.includes(w)) || (uw.length >= 4 && w.includes(uw)))
      );
      if (common.length >= 2) return true;
      if (common.length === 1 && (repTokens.length === 1 || userTokens.length === 1)) return true;
    }

    // Cek alias bila terdaftar
    if (user.nip_aliases && user.nip_aliases.length > 0) {
      for (const alias of user.nip_aliases) {
        if (!alias) continue;
        if (reportName.toLowerCase().includes(alias.toLowerCase().trim())) return true;
        const aliasTokens = this.getNameTokens(alias);
        if (aliasTokens.length > 0 && repTokens.length > 0) {
          if (repTokens.join('') === aliasTokens.join('')) return true;
          const common = repTokens.filter((w) =>
            aliasTokens.includes(w) ||
            aliasTokens.some((aw) => (w.length >= 4 && aw.includes(w)) || (aw.length >= 4 && w.includes(aw)))
          );
          if (common.length >= 2) return true;
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

  // Get all cached reports synchronously
  public getCachedReports(): EflyerReport[] {
    const local = this.getLocalReports();
    let cachedSheet: EflyerReport[] = [];
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        cachedSheet = JSON.parse(saved);
      }
    } catch (e) {}
    return [...local, ...cachedSheet];
  }

  // Get teacher's average points for a given year (defaults to current year)
  public getTeacherAvgPoin(teacher: User | null | undefined, year?: number): number {
    if (!teacher) return 0;
    const targetYear = year || new Date().getFullYear();
    const reports = this.getCachedReports();
    const summaries = this.calculateTeacherMonthlySummary(reports, teacher, targetYear);
    const totalPoin = summaries.reduce((acc, m) => acc + m.poin, 0);
    return Math.round(totalPoin / 12);
  }
}

export const eflyerService = EflyerService.getInstance();

export const EFLAYER_DRIVE_PARENT_FOLDER_ID = '1FA0fW-BwTF8EyRJ4F7FXYzjkUVLPr7Sj2kkKKTb_THRopT94npUSxtQIDpqMCjUXvl5MESYe';

export const RECOMMENDED_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT KHUSUS UPDATE EFLAYER & SOSMED
 * Spreadsheet ID: 1MhXpEaCXJJSkwoRTtMi1yofgBRvyOgqX7nSdREJn-bU
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
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    // Ambil data laporan Eflayer secara privat tanpa perlu share link Spreadsheet
    if (action === 'getEflyer') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Form Responses 1");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getValues();
      var reports = [];

      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var nama = row[2] ? String(row[2]).trim() : '';
        if (!nama || nama.toLowerCase() === 'nama') continue;

        var rawTs = row[0];
        var rawTgl = row[1] || rawTs;
        var tglStr = '';
        if (rawTgl instanceof Date) {
          tglStr = Utilities.formatDate(rawTgl, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
        } else {
          tglStr = String(rawTgl || '');
        }

        var tsStr = '';
        if (rawTs instanceof Date) {
          tsStr = Utilities.formatDate(rawTs, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
        } else {
          tsStr = String(rawTs || '');
        }

        reports.push({
          id: 'EFL-GAS-' + i,
          timestamp: tsStr,
          tanggal_update: tglStr,
          nama: nama,
          platform: String(row[3] || 'Status WA'),
          bukti_1: String(row[4] || ''),
          bukti_2: String(row[5] || ''),
          bukti_3: String(row[6] || ''),
          bukti_4: String(row[7] || ''),
          source: 'spreadsheet'
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: reports
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Google Script Update Eflayer Aktif dan Siap Menerima Laporan."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

