import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Share2,
  Calendar,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  X,
  Plus,
  Eye,
  Award,
  Layers,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Code,
  Settings
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, SchoolConfig, AppDatabase } from '../types';
import {
  eflyerService,
  EflyerReport,
  MONTH_NAMES,
  calculateEflyerPoin,
  RECOMMENDED_APPS_SCRIPT_CODE,
  getDriveDirectImageUrl,
  getDriveThumbnailUrl,
  getDrivePreviewEmbedUrl,
  extractDriveFileId,
} from '../db/eflayerService';
import { dbService } from '../db/storage';

interface UpdateEflyerViewProps {
  currentUser: User | null;
  db: AppDatabase;
  config: SchoolConfig;
}

const PLATFORM_OPTIONS = [
  { id: 'Status WA', label: 'Status WhatsApp', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { id: 'Instagram', label: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },
  { id: 'Facebook', label: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { id: 'Tiktok', label: 'TikTok', color: 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800' },
  { id: 'Lainnya', label: 'Lainnya', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' }
];

export const UpdateEflyerView: React.FC<UpdateEflyerViewProps> = ({
  currentUser,
  db,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'progress'>('form');
  const [reports, setReports] = useState<EflyerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(currentUser?.nama || '');
  const [selectedTeacherNip, setSelectedTeacherNip] = useState<string>(currentUser?.nip || '');
  const [tanggalUpdate, setTanggalUpdate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Status WA']);
  const [customPlatform, setCustomPlatform] = useState<string>('');
  
  // 4 Upload Boxes (Box 1 is mandatory, Boxes 2-4 are optional)
  const [bukti1, setBukti1] = useState<string>('');
  const [bukti2, setBukti2] = useState<string>('');
  const [bukti3, setBukti3] = useState<string>('');
  const [bukti4, setBukti4] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remoteStatus, setRemoteStatus] = useState<string>('');

  // Google Apps Script Modal & Configuration
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(
    config.eflayer_apps_script_url || 'https://script.google.com/macros/s/AKfycbzwl296baWL4h3gCVlkWYzcEocV-wO3i-V0SZykFD5N29xBsyq2XZIjvGjv_NPzbQsW/exec'
  );
  const [scriptSaving, setScriptSaving] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Tab 2 Progress Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [adminViewMode, setAdminViewMode] = useState<'matrix' | 'log'>('matrix');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');

  // Pilih Tahun laporan berdasarkan data yang masuk saja (jika tidak ada data, tahun dihilangkan)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    reports.forEach((r) => {
      const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
      if (parsed.year && parsed.year >= 2020 && parsed.year <= 2035) {
        yearsSet.add(parsed.year);
      }
    });

    const sorted = Array.from(yearsSet).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [reports]);

  // Otomatis sinkronkan selectedYear jika tahun yang dipilih tidak ada di daftar data yang masuk
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);
  
  // Screenshot modal preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [proofListModal, setProofListModal] = useState<{ title: string; reports: EflyerReport[] } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const openPreview = (url: string) => {
    setPreviewLoadError(false);
    setPreviewImage(url);
  };

  // Check if admin
  const isAdmin = Boolean(
    currentUser && (
      (currentUser.role && (
        currentUser.role.toLowerCase() === 'admin' ||
        currentUser.role.toLowerCase() === 'administrator' ||
        currentUser.role.toLowerCase().includes('admin')
      )) ||
      (config.headmaster_nip && currentUser.nip === config.headmaster_nip)
    )
  );

  // List of active teachers for dropdown
  const teachers = useMemo(() => {
    return (db.users || [])
      .filter((u) => !u.role || (u.role.toLowerCase() !== 'administrator' && u.nip !== 'admin'))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [db.users]);

  // Load initial reports
  const loadData = async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const sheetRes = await eflyerService.fetchSpreadsheetReports();
      const local = eflyerService.getLocalReports();
      if (sheetRes.success) {
        setReports([...local, ...sheetRes.data]);
        setSyncError(null);
      } else {
        setReports(local);
        if (sheetRes.message) {
          setSyncError(sheetRes.message);
        }
      }
    } catch (e: any) {
      console.warn('Error loading reports:', e);
      setSyncError(e?.message || 'Gagal memuat data dari Spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setSyncError(null);
    try {
      const res = await eflyerService.fetchSpreadsheetReports();
      const local = eflyerService.getLocalReports();
      if (res.success) {
        setReports([...local, ...res.data]);
        setSyncError(null);
      } else {
        if (res.message) {
          setSyncError(res.message);
        }
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Gagal memuat data dari Spreadsheet');
    } finally {
      setRefreshing(false);
    }
  };

  // Convert File to Base64 Image
  const handleFileUpload = (file: File, boxNum: 1 | 2 | 3 | 4) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah berkas berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (boxNum === 1) setBukti1(result);
      else if (boxNum === 2) setBukti2(result);
      else if (boxNum === 3) setBukti3(result);
      else if (boxNum === 4) setBukti4(result);
    };
    reader.readAsDataURL(file);
  };

  // Toggle platform selection
  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setRemoteStatus('');

    if (!selectedTeacherName.trim()) {
      setErrorMessage('Nama Guru pelapor wajib diisi.');
      return;
    }

    if (!tanggalUpdate) {
      setErrorMessage('Tanggal update wajib dipilih.');
      return;
    }

    if (!bukti1) {
      setErrorMessage('Bukti Screenshoot 1 wajib diunggah.');
      return;
    }

    setSubmitting(true);

    try {
      const platformStr = selectedPlatforms.includes('Lainnya') && customPlatform.trim()
        ? selectedPlatforms.map((p) => p === 'Lainnya' ? `Lainnya: ${customPlatform.trim()}` : p).join(', ')
        : selectedPlatforms.join(', ');

      const reportPayload = {
        timestamp: new Date().toLocaleString('id-ID'),
        tanggal_update: tanggalUpdate,
        nama: selectedTeacherName.trim(),
        platform: platformStr,
        bukti_1: bukti1,
        bukti_2: bukti2 || undefined,
        bukti_3: bukti3 || undefined,
        bukti_4: bukti4 || undefined,
      };

      // 1. Simpan ke sistem lokal (seketika muncul di progres & tabel)
      const newRecord = eflyerService.saveLocalReport(reportPayload);
      setReports((prev) => [newRecord, ...prev]);

      // 2. Jika Google Apps Script sudah dipasang, kirim ke Spreadsheet Google & Drive
      const targetScriptUrl = config.eflayer_apps_script_url || scriptUrlInput;
      if (targetScriptUrl && targetScriptUrl.trim()) {
        const remoteRes = await eflyerService.submitToAppsScript(reportPayload, targetScriptUrl);
        if (remoteRes.success) {
          setRemoteStatus('✓ Data dan berkas foto sukses tersimpan ke Google Drive & Spreadsheet!');
          if (remoteRes.driveUrls) {
            setReports((prev) =>
              prev.map((r) =>
                r.id === newRecord.id
                  ? {
                      ...r,
                      bukti_1: remoteRes.driveUrls?.bukti_1 || r.bukti_1,
                      bukti_2: remoteRes.driveUrls?.bukti_2 || r.bukti_2,
                      bukti_3: remoteRes.driveUrls?.bukti_3 || r.bukti_3,
                      bukti_4: remoteRes.driveUrls?.bukti_4 || r.bukti_4,
                    }
                  : r
              )
            );
          }
        } else {
          setRemoteStatus(`Data tersimpan di portal lokal. Catatan Google Script: ${remoteRes.message}`);
        }
      } else {
        setRemoteStatus('Data tersimpan di penyimpanan portal. Pasang Google Script khusus Eflayer agar data otomatis masuk ke Spreadsheet & Google Drive.');
      }

      setSubmitSuccess(true);
      setSubmitting(false);

      // Reset form proofs
      setBukti1('');
      setBukti2('');
      setBukti3('');
      setBukti4('');

      // Auto dismiss success toast
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 8000);
    } catch (err: any) {
      setSubmitting(false);
      setErrorMessage(err.message || 'Gagal menyimpan laporan.');
    }
  };

  // Find user's reports for progress
  const targetUserForProgress = useMemo(() => {
    if (isAdmin && selectedTeacherName) {
      const found = teachers.find((t) => t.nama === selectedTeacherName);
      if (found) return found;
    }
    return currentUser || (teachers[0] as User);
  }, [isAdmin, selectedTeacherName, currentUser, teachers]);

  const teacherMonthlySummary = useMemo(() => {
    if (!targetUserForProgress) return [];
    return eflyerService.calculateTeacherMonthlySummary(reports, targetUserForProgress, selectedYear);
  }, [reports, targetUserForProgress, selectedYear]);

  const teacherAnnualStats = useMemo(() => {
    const totalShare = teacherMonthlySummary.reduce((acc, m) => acc + m.shareCount, 0);
    const totalPoin = teacherMonthlySummary.reduce((acc, m) => acc + m.poin, 0);
    // Poin akhir dihitung berdasarkan 12 bulan (bulan yang kosong tetap menjadi pembagi 12)
    const avgPoin = Math.round(totalPoin / 12);
    const maxMonth = [...teacherMonthlySummary].sort((a, b) => b.shareCount - a.shareCount)[0];
    return { totalShare, avgPoin, maxMonth };
  }, [teacherMonthlySummary]);

  // Admin: Matrix of ALL teachers
  const allTeachersMatrix = useMemo(() => {
    return teachers.map((teacher, index) => {
      const summaries = eflyerService.calculateTeacherMonthlySummary(reports, teacher, selectedYear);
      const totalShare = summaries.reduce((acc, m) => acc + m.shareCount, 0);
      const totalPoin = summaries.reduce((acc, m) => acc + m.poin, 0);
      // Poin akhir dihitung berdasarkan 12 bulan (bulan yang kosong tetap menjadi pembagi 12)
      const avgPoin = Math.round(totalPoin / 12);
      return {
        no: index + 1,
        teacher,
        summaries,
        totalShare,
        avgPoin,
      };
    });
  }, [teachers, reports, selectedYear]);

  const filteredTeachersMatrix = useMemo(() => {
    if (!searchTerm.trim()) return allTeachersMatrix;
    const term = searchTerm.toLowerCase();
    return allTeachersMatrix.filter(
      (item) =>
        item.teacher.nama.toLowerCase().includes(term) ||
        (item.teacher.nip && item.teacher.nip.includes(term)) ||
        (item.teacher.mapel && item.teacher.mapel.toLowerCase().includes(term))
    );
  }, [allTeachersMatrix, searchTerm]);

  // Log of all reports (for Admin Log view)
  const filteredReportsLog = useMemo(() => {
    return reports.filter((r) => {
      const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
      if (parsed.year !== selectedYear) return false;
      if (filterMonth !== 'all' && parsed.month !== filterMonth) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          r.nama.toLowerCase().includes(term) ||
          r.platform.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [reports, selectedYear, filterMonth, searchTerm]);

  // PDF Export for Admin
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Kop Sekolah
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(config.school_name.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('REKAPITULASI PROGRES UPDATE EFLAYER & SOSMED GURU', pageWidth / 2, 19, { align: 'center' });
    doc.text(`Tahun Pelaporan: ${selectedYear} • Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 24, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 27, pageWidth - 14, 27);

    // Kriteria Nilai Reference mini-note
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Kriteria Poin: 0 Share = 0 Poin | 1 Share = 56 Poin | 2 Share = 58 Poin | ... | >= 20 Share = 100 Poin (Format Sel: [Jumlah Share] / [Poin]) • Poin Akhir dihitung dibagi 12 bulan (bulan kosong tetap menjadi pembagi 12)',
      14,
      32
    );

    // Table Data
    const tableHeaders = [
      'No',
      'Nama Pendidik',
      'Mapel',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
      'Tot. Share',
      'Rata Poin'
    ];

    const tableRows = allTeachersMatrix.map((item, idx) => {
      const monthCells = item.summaries.map((m) =>
        m.shareCount > 0 ? `${m.shareCount} (${m.poin})` : '-'
      );
      return [
        idx + 1,
        item.teacher.nama,
        item.teacher.mapel || 'Guru',
        ...monthCells,
        item.totalShare,
        item.avgPoin > 0 ? `${item.avgPoin}` : '0'
      ];
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [30, 58, 138], // blue-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
        2: { cellWidth: 26, halign: 'left' },
        15: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        16: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Signature Footer
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    const signY = finalY > 175 ? 175 : finalY;

    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    // Left signature: Penanggung Jawab Sosmed
    doc.text('Mengetahui,', 25, signY);
    doc.text('Penanggung Jawab Sosmed & Humas', 25, signY + 5);
    doc.text('_____________________________', 25, signY + 25);
    doc.text('Tim IT & Media Sekolah', 25, signY + 30);

    // Right signature: Kepala Sekolah
    const rightCol = pageWidth - 70;
    doc.text('Depok, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), rightCol, signY);
    doc.text('Kepala Sekolah,', rightCol, signY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(config.headmaster || 'Abu Haripin, M.Pd', rightCol, signY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIK: ${config.headmaster_nip || '03.13.01.13'}`, rightCol, signY + 30);

    doc.save(`Rekap_Update_Eflayer_SMPIT_Pondok_Duta_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Tab Controls */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/30 text-xs font-semibold">
                <Share2 className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>Publikasi Media & Eflyer</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Update Eflayer & Sosmed
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pelaporan mandiri publikasi materi promosi, e-flyer dakwah, dan agenda sekolah di media sosial guru beserta rekapitulasi progres penilaian bulanan.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {isAdmin && (
              <button
                onClick={() => setScriptModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-200 text-xs font-semibold backdrop-blur-xs border border-fuchsia-400/40 transition flex items-center gap-2 cursor-pointer"
                title="Atur Google Script agar data tersimpan langsung ke Google Spreadsheet"
              >
                <Code className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>{config.eflayer_apps_script_url ? 'Google Script Terhubung' : 'Pasang Google Script'}</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Sinkronkan data dengan Google Spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-fuchsia-400' : 'text-sky-300'}`} />
              <span>{refreshing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-blue-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 hover:text-white text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-fuchsia-600" />
            <span>Isian Laporan Eflayer</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'progress'
                ? 'bg-white text-blue-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 hover:text-white text-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Laporan / Progres (Jan - Des)</span>
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight transition-colors ${
                activeTab === 'progress'
                  ? 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300'
                  : 'bg-fuchsia-950/70 text-fuchsia-200 border border-fuchsia-500/40'
              }`}
            >
              {reports.length} Data
            </span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET ACCESS WARNING IF RESTRICTED */}
      {syncError && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">Perhatian: Sinkronisasi Google Spreadsheet</p>
              <p className="text-[11px] text-amber-800">{syncError}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Coba Sinkron Ulang</span>
          </button>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-black">Laporan Eflayer Berhasil Dikirim!</p>
              <p className="text-xs text-emerald-700">
                {remoteStatus || 'Data telah tercatat dan progres penilaian bulanan Anda langsung terupdate.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('progress')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shrink-0 self-end sm:self-auto cursor-pointer"
          >
            Lihat Progres & Poin
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: FORM ISIAN LAPORAN EFLAYER */}
      {/* ============================================================== */}
      {activeTab === 'form' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-7 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-fuchsia-600" />
              <span>Formulir Pelaporan Update Eflayer</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Isi tanggal, pilih media publikasi, dan unggah tangkapan layar (screenshoot) sebagai bukti share.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1: Pelapor / Guru */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Guru Pelapor <span className="text-rose-500">*</span>
                </label>
                {isAdmin ? (
                  <div className="relative">
                    <select
                      value={selectedTeacherName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setSelectedTeacherName(name);
                        const match = teachers.find((t) => t.nama === name);
                        if (match) setSelectedTeacherNip(match.nip);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition appearance-none"
                    >
                      <option value="">-- Pilih Guru --</option>
                      {teachers.map((t) => (
                        <option key={t.id || t.nip} value={t.nama}>
                          {t.nama} ({t.mapel || 'Guru'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>{currentUser?.nama || 'Guru SMPIT Pondok Duta'}</span>
                    <span className="text-[11px] font-mono text-slate-500">NIK: {currentUser?.nip}</span>
                  </div>
                )}
              </div>

              {/* Field 2: Tanggal Update */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Update <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tanggalUpdate}
                    onChange={(e) => setTanggalUpdate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Field 3: Update Iklan/Eflayer di? */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Update Iklan/Eflayer di Media Mana? <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PLATFORM_OPTIONS.map((plat) => {
                  const isChecked = selectedPlatforms.includes(plat.id);
                  return (
                    <button
                      type="button"
                      key={plat.id}
                      onClick={() => togglePlatform(plat.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-white' : 'bg-slate-400'}`}></span>
                      <span>{plat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom platform input if "Lainnya" is selected */}
              {selectedPlatforms.includes('Lainnya') && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    placeholder="Sebutkan media lainnya (misal: Twitter / X, Telegram, Grup Walimurid, dll)..."
                    className="w-full sm:max-w-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              )}
            </div>

            {/* Field 4: Bukti Screenshoot (4 Kotak Upload: 1 Wajib, 2-4 Pilihan) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Bukti Update (Screenshoot)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Unggah tangkapan layar bukti share eflyer. <strong>Kotak 1 Wajib</strong>, kotak 2, 3, dan 4 adalah pilihan tambahan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KOTAK 1 (WAJIB) */}
                <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col justify-between min-h-[210px] ${
                  bukti1 ? 'border-emerald-300 bg-emerald-50/30' : 'border-blue-300 bg-blue-50/20 hover:bg-blue-50/40'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-blue-900 flex items-center gap-1">
                      <span>Kotak 1</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      Wajib
                    </span>
                  </div>

                  {bukti1 ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      <img src={bukti1} alt="Bukti 1" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(bukti1)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-slate-900 text-xs font-bold transition"
                          title="Lihat Gambar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBukti1('')}
                          className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
                          title="Hapus"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center cursor-pointer p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Pilih Berkas Bukti 1</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 1)}
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 text-center mt-2">Screenshoot Utama</span>
                </div>

                {/* KOTAK 2 (PILIHAN) */}
                <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col justify-between min-h-[210px] ${
                  bukti2 ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-700">Kotak 2</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Pilihan
                    </span>
                  </div>

                  {bukti2 ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      <img src={bukti2} alt="Bukti 2" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(bukti2)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-slate-900 text-xs font-bold transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBukti2('')}
                          className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center cursor-pointer p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Tambah Bukti 2</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Opsional</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 2)}
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 text-center mt-2">Screenshoot Tambahan</span>
                </div>

                {/* KOTAK 3 (PILIHAN) */}
                <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col justify-between min-h-[210px] ${
                  bukti3 ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-700">Kotak 3</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Pilihan
                    </span>
                  </div>

                  {bukti3 ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      <img src={bukti3} alt="Bukti 3" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(bukti3)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-slate-900 text-xs font-bold transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBukti3('')}
                          className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center cursor-pointer p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Tambah Bukti 3</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Opsional</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 3)}
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 text-center mt-2">Screenshoot Tambahan</span>
                </div>

                {/* KOTAK 4 (PILIHAN) */}
                <div className={`p-4 rounded-2xl border-2 border-dashed transition flex flex-col justify-between min-h-[210px] ${
                  bukti4 ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-700">Kotak 4</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Pilihan
                    </span>
                  </div>

                  {bukti4 ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      <img src={bukti4} alt="Bukti 4" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(bukti4)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-slate-900 text-xs font-bold transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBukti4('')}
                          className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center cursor-pointer p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Tambah Bukti 4</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Opsional</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 4)}
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-slate-400 text-center mt-2">Screenshoot Tambahan</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Laporan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Kirim Laporan Eflayer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LAPORAN / PROGRES DARI JANUARI - DESEMBER */}
      {/* ============================================================== */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Controls Bar: Year Selection, Admin View Switcher, and Export PDF */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Pilih Tahun Laporan
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:border-blue-600 outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Tampilan Data
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setAdminViewMode('matrix')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        adminViewMode === 'matrix' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Matriks Semua Guru (12 Bulan)
                    </button>
                    <button
                      onClick={() => setAdminViewMode('log')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        adminViewMode === 'log' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Log Riwayat Laporan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export PDF Button (Requirement c) */}
            {isAdmin && (
              <button
                onClick={exportPDF}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-sky-200" />
                <span>Unduh Laporan PDF (Semua Guru)</span>
              </button>
            )}
          </div>

          {/* Reference Card: Skema Nilai Resmi */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Kriteria Penilaian Share Eflayer per Bulan (Resmi):</span>
            </div>
            <p className="text-amber-800/90 text-[11px] leading-relaxed">
              <strong>0 Share:</strong> 0 Poin • <strong>1 Share:</strong> 56 Poin • <strong>2 Share:</strong> 58 Poin • ... • <strong>10 Share:</strong> 74 Poin • ... • <strong>19 Share:</strong> 92 Poin • <strong>20+ Share:</strong> 100 Poin.
              (Setiap penambahan share menambah 2 poin hingga maksimal 100 poin).
              <br />
              <span className="font-semibold text-amber-950 mt-1 inline-block">
                • <strong>Poin Akhir (Rata Poin):</strong> Dihitung berdasarkan akumulasi poin selama 12 bulan penuh dibagi 12. Jika ada bulan yang kosong (0 poin), maka tetap menjadi pembagi 12 dan mempengaruhi poin akhir.
              </span>
            </p>
          </div>

          {/* ========================================================= */}
          {/* GURU VIEW: PERSONAL MONTHLY SUMMARY (12 BULAN) */}
          {/* ========================================================= */}
          {!isAdmin && (
            <div className="space-y-6">
              {/* Stat Ringkasan Guru */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Share Tahun {selectedYear}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900">{teacherAnnualStats.totalShare}</span>
                    <span className="text-xs font-bold text-slate-500">Share Iklan</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Rata-rata Poin</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-2xl font-black ${
                      teacherAnnualStats.avgPoin >= 80 ? 'text-emerald-600' : teacherAnnualStats.avgPoin >= 50 ? 'text-amber-600' : 'text-slate-700'
                    }`}>
                      {teacherAnnualStats.avgPoin}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ 100 Poin</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bulan Teraktif</span>
                  <div className="mt-1">
                    <span className="text-sm font-black text-blue-900 block truncate">
                      {teacherAnnualStats.maxMonth ? teacherAnnualStats.maxMonth.monthName : '-'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {teacherAnnualStats.maxMonth?.shareCount || 0} Share ({teacherAnnualStats.maxMonth?.poin || 0} Poin)
                    </span>
                  </div>
                </div>
              </div>

              {/* 12 Bulan Grid Cards */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Rincian Progres & Nilai Bulanan (Januari - Desember {selectedYear})</span>
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Target: 20 Share = 100 Poin
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {teacherMonthlySummary.map((m) => {
                    const isMax = m.shareCount >= 20;
                    return (
                      <div
                        key={m.monthIndex}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                          m.shareCount > 0
                            ? 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                            : 'bg-white border-slate-200/60 opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                              {m.monthName}
                            </span>
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                m.poin >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.poin >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {m.poin} Poin
                            </span>
                          </div>

                          <div className="flex items-baseline gap-1 my-1">
                            <strong className="text-lg font-black text-blue-950">{m.shareCount}</strong>
                            <span className="text-xs text-slate-500 font-medium">/ 20 Share</span>
                          </div>

                          {/* Progress Bar towards 20 share */}
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-2">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMax ? 'bg-emerald-500' : m.shareCount > 0 ? 'bg-blue-600' : 'bg-transparent'
                              }`}
                              style={{ width: `${Math.min((m.shareCount / 20) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {m.shareCount > 0 && (
                          <button
                            onClick={() => {
                              const monthReports = reports.filter((r) => {
                                if (!eflyerService.isReportForUser(r, targetUserForProgress)) return false;
                                const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
                                return parsed.year === selectedYear && parsed.month === m.monthIndex + 1;
                              });
                              setProofListModal({
                                title: `Bukti Share Bulan ${m.monthName} ${selectedYear}`,
                                reports: monthReports,
                              });
                            }}
                            className="mt-2 w-full py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>Lihat Bukti ({m.shareCount})</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ADMIN VIEW MODE: MATRIX TABEL SEMUA GURU (Requirement c) */}
          {/* ========================================================= */}
          {isAdmin && adminViewMode === 'matrix' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Matriks Laporan Eflayer Seluruh Guru ({selectedYear})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format sel: <strong>Jumlah Share (Poin Nilai)</strong>. Klik angka pada sel bulan untuk membuka daftar berkas tangkapan layar bukti guru.
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari guru atau mapel..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Responsive Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-3 px-3 text-center">No</th>
                      <th className="py-3 px-3">Nama Pendidik</th>
                      <th className="py-3 px-2">Mapel</th>
                      {MONTH_NAMES.map((m) => (
                        <th key={m} className="py-3 px-2 text-center whitespace-nowrap">
                          {m.substring(0, 3)}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center bg-blue-950">Total</th>
                      <th className="py-3 px-3 text-center bg-indigo-950">Rata Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachersMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="py-8 text-center text-slate-400">
                          Tidak ada data guru yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachersMatrix.map((item) => (
                        <tr key={item.teacher.id || item.teacher.nip} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {item.no}
                          </td>
                          <td
                            onClick={() => {
                              if (item.totalShare > 0) {
                                const teacherReports = reports.filter((r) => {
                                  if (!eflyerService.isReportForUser(r, item.teacher)) return false;
                                  const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
                                  return parsed.year === selectedYear;
                                });
                                setProofListModal({
                                  title: `Seluruh Bukti Share Tahun ${selectedYear} - ${item.teacher.nama}`,
                                  reports: teacherReports,
                                });
                              }
                            }}
                            className={`py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap ${
                              item.totalShare > 0 ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''
                            }`}
                            title={item.totalShare > 0 ? `Klik untuk melihat seluruh ${item.totalShare} bukti tahun ${selectedYear}` : undefined}
                          >
                            {item.teacher.nama}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                            {item.teacher.mapel || 'Guru'}
                          </td>
                          {item.summaries.map((m) => {
                            const hasShare = m.shareCount > 0;
                            return (
                              <td
                                key={m.monthIndex}
                                onClick={() => {
                                  if (hasShare) {
                                    const monthReports = reports.filter((r) => {
                                      if (!eflyerService.isReportForUser(r, item.teacher)) return false;
                                      const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
                                      return parsed.year === selectedYear && parsed.month === m.monthIndex + 1;
                                    });
                                    setProofListModal({
                                      title: `Bukti Share Bulan ${m.monthName} ${selectedYear} - ${item.teacher.nama}`,
                                      reports: monthReports,
                                    });
                                  }
                                }}
                                className={`py-2.5 px-2 text-center font-mono whitespace-nowrap transition-all ${
                                  hasShare
                                    ? m.poin >= 80
                                      ? 'text-emerald-700 font-extrabold bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer shadow-xs active:scale-95'
                                      : 'text-blue-800 font-bold bg-blue-50/40 hover:bg-blue-100 hover:text-blue-900 cursor-pointer shadow-xs active:scale-95'
                                    : 'text-slate-300'
                                }`}
                                title={
                                  hasShare
                                    ? `Klik untuk membuka ${m.shareCount} bukti upload bulan ${m.monthName} (${item.teacher.nama})`
                                    : `Belum ada upload bulan ${m.monthName}`
                                }
                              >
                                {hasShare ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="underline decoration-dotted underline-offset-2">
                                      {m.shareCount} ({m.poin})
                                    </span>
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          })}
                          <td
                            onClick={() => {
                              if (item.totalShare > 0) {
                                const teacherReports = reports.filter((r) => {
                                  if (!eflyerService.isReportForUser(r, item.teacher)) return false;
                                  const parsed = eflyerService.parseDate(r.tanggal_update || r.timestamp);
                                  return parsed.year === selectedYear;
                                });
                                setProofListModal({
                                  title: `Seluruh Bukti Share Tahun ${selectedYear} - ${item.teacher.nama} (${item.totalShare} Bukti)`,
                                  reports: teacherReports,
                                });
                              }
                            }}
                            className={`py-2.5 px-3 text-center font-black text-blue-900 bg-blue-50/30 ${
                              item.totalShare > 0 ? 'cursor-pointer hover:bg-blue-100/70 hover:underline' : ''
                            }`}
                            title={item.totalShare > 0 ? 'Klik untuk melihat semua bukti tahun ini' : undefined}
                          >
                            {item.totalShare}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-indigo-900 bg-indigo-50/30">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                item.avgPoin >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.avgPoin >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.avgPoin > 0 ? item.avgPoin : '-'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ADMIN VIEW MODE: LOG RIWAYAT LAPORAN */}
          {/* ========================================================= */}
          {isAdmin && adminViewMode === 'log' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Log Riwayat Seluruh Laporan Eflayer ({selectedYear})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan total <strong>{filteredReportsLog.length}</strong> kiriman laporan
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 outline-none"
                  >
                    <option value="all">Semua Bulan</option>
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        Bulan {m}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari pelapor..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center">No</th>
                      <th className="py-3 px-3">Tanggal Update</th>
                      <th className="py-3 px-3">Nama Pendidik</th>
                      <th className="py-3 px-3">Media / Platform</th>
                      <th className="py-3 px-3 text-center">Bukti 1</th>
                      <th className="py-3 px-3 text-center">Bukti 2</th>
                      <th className="py-3 px-3 text-center">Bukti 3</th>
                      <th className="py-3 px-3 text-center">Bukti 4</th>
                      <th className="py-3 px-3 text-center">Sumber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReportsLog.slice(0, 150).map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {r.tanggal_update || r.timestamp}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{r.nama}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                            {r.platform}
                          </span>
                        </td>
                        
                        {/* Bukti 1 */}
                        <td className="py-2.5 px-3 text-center">
                          {r.bukti_1 ? (
                            <button
                              onClick={() => openPreview(r.bukti_1)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Bukti 2 */}
                        <td className="py-2.5 px-3 text-center">
                          {r.bukti_2 ? (
                            <button
                              onClick={() => openPreview(r.bukti_2!)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Bukti 3 */}
                        <td className="py-2.5 px-3 text-center">
                          {r.bukti_3 ? (
                            <button
                              onClick={() => openPreview(r.bukti_3!)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Bukti 4 */}
                        <td className="py-2.5 px-3 text-center">
                          {r.bukti_4 ? (
                            <button
                              onClick={() => openPreview(r.bukti_4!)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                              r.source === 'local' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.source === 'local' ? 'Portal Baru' : 'Sheet'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: IMAGE FULLSCREEN PREVIEW */}
      {/* ============================================================== */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-slate-800 mb-3 self-start">Bukti Tangkapan Layar (Screenshoot)</h4>
            <div className="w-full max-h-[75vh] min-h-[300px] overflow-auto rounded-2xl flex flex-col items-center justify-center bg-slate-950 p-2">
              {!previewLoadError ? (
                <img
                  src={getDriveDirectImageUrl(previewImage)}
                  alt="Preview Bukti"
                  onError={() => setPreviewLoadError(true)}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
                />
              ) : extractDriveFileId(previewImage) ? (
                <div className="w-full h-full flex flex-col items-center gap-3 py-2">
                  <iframe
                    src={getDrivePreviewEmbedUrl(previewImage)}
                    className="w-full h-[65vh] rounded-xl border border-slate-700 bg-white"
                    title="Google Drive Preview"
                    allow="autoplay"
                  />
                  <span className="text-[11px] text-slate-400">
                    Menampilkan pratinjau dokumen Google Drive
                  </span>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Gambar tidak dapat ditampilkan secara langsung. Silakan buka melalui link Google Drive di bawah.
                </div>
              )}
            </div>
            {previewImage.startsWith('http') && (
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Buka Berkas Asli di Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MONTHLY PROOF LIST FOR A TEACHER */}
      {/* ============================================================== */}
      {proofListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{proofListModal.title}</h3>
                <p className="text-xs text-slate-500">Daftar tangkapan layar bukti share pada bulan ini</p>
              </div>
              <button
                onClick={() => setProofListModal(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {proofListModal.reports.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">Tidak ada berkas bukti tersimpan.</p>
              ) : (
                proofListModal.reports.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {idx + 1}. Tanggal: {item.tanggal_update || item.timestamp}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {item.platform}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[item.bukti_1, item.bukti_2, item.bukti_3, item.bukti_4].filter(Boolean).map((proof, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => openPreview(proof!)}
                          className="aspect-video bg-slate-200 rounded-xl overflow-hidden border border-slate-300 cursor-pointer relative group flex items-center justify-center"
                        >
                          <img
                            src={getDriveThumbnailUrl(proof, 400)}
                            onError={(e) => {
                              const direct = getDriveDirectImageUrl(proof);
                              if ((e.currentTarget as HTMLImageElement).src !== direct) {
                                (e.currentTarget as HTMLImageElement).src = direct;
                              }
                            }}
                            alt={`Bukti ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Perbesar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PENGATURAN & PANDUAN GOOGLE APPS SCRIPT EFLAYER */}
      {/* ============================================================== */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-7 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Panduan & Pengaturan Google Apps Script Eflayer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menghubungkan form portal ke Spreadsheet Google (1MhXpEaCXJJSkwoRTtMi1yofgBRvyOgqX7nSdREJn-bU)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setScriptModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 pr-1 text-xs">
              {/* Form Input Web App URL */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-blue-950">
                  URL Aplikasi Web Google Script (Eflayer Web App URL)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-mono focus:border-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    disabled={scriptSaving || !scriptUrlInput.trim()}
                    onClick={() => {
                      setScriptSaving(true);
                      dbService.updateConfig({ eflayer_apps_script_url: scriptUrlInput.trim() });
                      setTimeout(() => {
                        setScriptSaving(false);
                        alert('URL Google Apps Script Eflayer berhasil disimpan!');
                      }, 500);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{scriptSaving ? 'Menyimpan...' : 'Simpan URL Script'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-blue-700">
                  Setelah memasang script di Google Spreadsheet, tempelkan URL Web App hasil Deploy ke kolom ini.
                </p>
              </div>

              {/* Google Drive Target Folder Info */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Folder Penyimpanan Google Drive Terkonfigurasi (4 Subfolder Lengkap)
                    </span>
                    <p className="text-xs font-bold text-slate-900">
                      Raport Guru &gt; Laporan Update Sosme...
                    </p>
                  </div>
                  <a
                    href="https://drive.google.com/drive/folders/1FA0fW-BwTF8EyRJ4F7FXYzjkUVLPr7Sj2kkKKTb_THRopT94npUSxtQIDpqMCjUXvl5MESYe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Buka Folder Utama</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="font-bold text-slate-800 block">1. Bukti Update 1:</span>
                    <code className="text-[10px] text-slate-600 font-mono break-all">1X8toPB6eS9zrWvyNGeQt-qrlc_Gm4HrsqD1i0TRn9YigjstMY7rvsdwdQo7qegfsL9-4qb1u</code>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="font-bold text-slate-800 block">2. Bukti Update 2:</span>
                    <code className="text-[10px] text-slate-600 font-mono break-all">1zsVrS_PECmdPlqSKOq87kbiH8o8RPR8VGdmPsKomgHFlO4DD4gfqtdpruJc3iMeHfebdjri2</code>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="font-bold text-slate-800 block">3. Bukti Update 3:</span>
                    <code className="text-[10px] text-slate-600 font-mono break-all">13ywN4mi08nVKkW1FUKV4uRQd7g6aYXZXQmlEy09nMeZd0zL4IZdrtsTpeEhKeTTFSOnZP5lY</code>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                    <span className="font-bold text-slate-800 block">4. Bukti Update 4:</span>
                    <code className="text-[10px] text-slate-600 font-mono break-all">13B_LX0hLZXlZ1a6djk7D5k_5NXWEbNk7WRCxAPAhOYGWKqoElqZtNWRhXhpSCm7AdumuiX9W</code>
                  </div>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Langkah-Langkah Pembaruan / Pemasangan Google Script:
                </h4>

                <ol className="space-y-2.5 list-decimal list-inside text-slate-700 leading-relaxed font-medium">
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <strong>Buka Spreadsheet Google:</strong> Buka file spreadsheet respon eflyer di Google Drive:{' '}
                    <a
                      href="https://docs.google.com/spreadsheets/d/1MhXpEaCXJJSkwoRTtMi1yofgBRvyOgqX7nSdREJn-bU/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-bold underline inline-flex items-center gap-1"
                    >
                      <span>Buka Spreadsheet 1MhXpEa...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>

                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <strong>Buka Editor Script:</strong> Pada menu atas spreadsheet, klik menu{' '}
                    <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">Ekstensi (Extensions)</span>{' '}
                    &rarr;{' '}
                    <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">Apps Script</span>.
                  </li>

                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <strong>Perbarui Kode Script:</strong> Hapus kode lama di editor Apps Script, lalu salin dan tempel kode script yang telah disesuaikan dengan folder Drive tujuan pada kotak di bawah ini.
                  </li>

                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <strong>Simpan &amp; Terapkan (Deploy):</strong>
                    <div className="mt-1 pl-4 space-y-1 text-slate-600 text-[11px]">
                      <p>1. Klik ikon disket <strong>Simpan (Save)</strong>.</p>
                      <p>2. Klik tombol biru <strong>Terapkan (Deploy)</strong> &rarr; pilih <strong>Kelola Penerapan (Manage deployments)</strong> atau <strong>Penerapan Baru (New deployment)</strong>.</p>
                      <p>3. Jika sudah pernah deploy, klik ikon pensil <strong>Edit</strong> &rarr; pilih Versi: <strong>Versi Baru (New version)</strong> &rarr; klik <strong>Terapkan (Deploy)</strong>.</p>
                      <p>4. Pastikan opsi <em>Siapa yang memiliki akses</em> adalah: <strong>Siapa saja (Anyone)</strong>.</p>
                    </div>
                  </li>

                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <strong>Salin URL Web App:</strong> Salin <strong>URL Aplikasi Web</strong> yang dihasilkan (berakhiran <code>/exec</code>), lalu tempelkan pada kolom input di atas dan klik <strong>Simpan URL Script</strong>.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Kode Google Apps Script (Code.gs):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(RECOMMENDED_APPS_SCRIPT_CODE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 3000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Seluruh Kode Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {RECOMMENDED_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
