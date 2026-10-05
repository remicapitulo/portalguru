import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarX,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  UserCheck,
  Stethoscope,
  Briefcase,
  FileText,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Info,
  CalendarDays,
  Copy,
  Check,
  Code2,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  FileUp,
  X,
  FolderOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  User,
  SchoolConfig,
  KetidakhadiranItem,
  JenisKetidakhadiran,
  StatusKetidakhadiran
} from '../types';
import { dbService } from '../db/storage';
import {
  penilaianService,
  PENILAIAN_SPREADSHEET_ID,
  DEFAULT_PENILAIAN_APPS_SCRIPT_URL,
  GAS_SCRIPT_CODE
} from '../db/penilaianService';

interface KetidakhadiranViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  ketidakhadiranList: KetidakhadiranItem[];
}

type SubTab = 'daftar' | 'kalender' | 'form' | 'rekap' | 'spreadsheet';

const FOLDER_BUKTI_ID = '1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt';
const FOLDER_BUKTI_URL = `https://drive.google.com/drive/folders/${FOLDER_BUKTI_ID}`;

const JENIS_COLORS: Record<JenisKetidakhadiran, { bg: string; text: string; border: string; icon: string }> = {
  Sakit: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'stethoscope' },
  Izin: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: 'file-text' },
  Cuti: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'calendar' },
  'Dinas Luar': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'briefcase' },
  Lainnya: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'info' }
};

const STATUS_BADGES: Record<StatusKetidakhadiran, { bg: string; text: string }> = {
  Disetujui: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Disetujui Pimpinan' },
  Menunggu: { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: 'Menunggu Verifikasi' },
  'Menunggu Verifikasi': { bg: 'bg-amber-100 text-amber-800 border-amber-300', text: 'Menunggu Verifikasi' },
  Diverifikasi: { bg: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Terverifikasi' },
  Ditolak: { bg: 'bg-rose-100 text-rose-800 border-rose-300', text: 'Tidak Disetujui' }
};

export const KetidakhadiranView: React.FC<KetidakhadiranViewProps> = ({
  currentUser,
  config,
  allTeachers,
  ketidakhadiranList
}) => {
  const isTeacher = currentUser?.role?.toLowerCase() === 'guru';
  const isAdmin = Boolean(
    currentUser &&
      !isTeacher &&
      (currentUser.role?.toLowerCase() === 'admin' ||
        currentUser.role?.toLowerCase() === 'administrator' ||
        currentUser.role?.toLowerCase() === 'kepala_sekolah' ||
        currentUser.role?.toLowerCase().includes('kepala') ||
        currentUser.nip?.toLowerCase() === 'admin' ||
        (config.headmaster_nip && currentUser.nip === config.headmaster_nip) ||
        (config.headmaster && currentUser.nama?.toLowerCase().includes(config.headmaster.toLowerCase().trim())))
  );

  const activeGasUrl = config.penilaian_apps_script_url || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
  const penilaianSpreadsheetId = config.penilaian_spreadsheet_id || PENILAIAN_SPREADSHEET_ID;

  // Cek apakah user yang login adalah pemilik ajuan (guru yang bersangkutan)
  const isItemOwner = (item: KetidakhadiranItem): boolean => {
    if (!currentUser) return false;
    const userNip = (currentUser.nip || '').trim().toLowerCase();
    const itemNip = (item.nip || '').trim().toLowerCase();
    if (userNip && itemNip) {
      if (userNip === itemNip) return true;
      if (userNip.replace(/^t-|^usr-/, '') === itemNip.replace(/^t-|^usr-/, '')) return true;
    }
    const userName = (currentUser.nama || '').trim().toLowerCase();
    const itemName = (item.nama || '').trim().toLowerCase();
    if (userName && itemName && (userName === itemName || userName.includes(itemName) || itemName.includes(userName))) {
      return true;
    }
    return false;
  };

  // Cek hak akses hapus ajuan:
  // - Admin / Kepala Sekolah: Berhak menghapus ajuan/catatan
  // - Guru pemilik akun: Berhak menghapus ajuan miliknya HANYA jika status masih 'Menunggu Verifikasi'
  // - Sesama guru lain: TIDAK berhak menghapus ajuan rekan sejawat
  const canDeleteAjuan = (item: KetidakhadiranItem): boolean => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    const isWaiting = item.status === 'Menunggu' || item.status === 'Menunggu Verifikasi' || item.status?.toLowerCase().includes('menunggu');
    return isWaiting && isItemOwner(item);
  };

  const [activeTab, setActiveTab] = useState<SubTab>('daftar');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBulan, setFilterBulan] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Route-guard: Tutup sub-menu Realisasi di Spreadsheet dari akun Guru (hanya Admin yang dapat membuka)
  useEffect(() => {
    if (!isAdmin && activeTab === 'spreadsheet') {
      setActiveTab('daftar');
    }
  }, [isAdmin, activeTab]);

  // Form State
  const [formNip, setFormNip] = useState<string>(currentUser ? currentUser.nip : (allTeachers[0]?.nip || ''));
  const [formTanggalAwal, setFormTanggalAwal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTanggalAkhir, setFormTanggalAkhir] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formJenis, setFormJenis] = useState<JenisKetidakhadiran>('Izin');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formInval, setFormInval] = useState<string>('');
  const [formKelas, setFormKelas] = useState<string>('');
  const [formBukti, setFormBukti] = useState<string>('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KetidakhadiranItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Spreadsheet Guide States & Helpers
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState(false);
  const [initializingSheets, setInitializingSheets] = useState(false);
  const [initSheetsResult, setInitSheetsResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    count?: number;
  }>({
    status: 'idle',
    message: ''
  });

  const copyHeadersOnly = () => {
    const text = 'ID\tNIP\tNama Guru\tMapel\tTanggal Mulai\tTanggal Selesai\tJenis\tKeterangan\tInval Guru\tKelas\tBukti Surat\tStatus\tCatatan Admin\tCreated At';
    navigator.clipboard.writeText(text);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2500);
  };

  const copyHeadersAndSampleRows = () => {
    const header = 'ID\tNIP\tNama Guru\tMapel\tTanggal Mulai\tTanggal Selesai\tJenis\tKeterangan\tInval Guru\tKelas\tBukti Surat\tStatus\tCatatan Admin\tCreated At';
    const rows = [
      'KTH-001\t02.20.09.112\tNilam Cahya, S.Pd\tMatematika\t2026-10-02\t2026-10-02\tDinas Luar\tMenghadiri Pelatihan Kurikulum & Bedah Asesmen MGMP Matematika Tingkat Kota Depok\tM. Miftahur Rahman, S.I\tKelas 7A, 7B\t-\tDisetujui\tDisposisi Kepala Sekolah: Surat Tugas resmi diterbitkan.\t2026-10-01 08:15:00',
      'KTH-002\t02.18.07.135\tNovi Mulafaturrochmah, S.Pd.\tBahasa Indonesia\t2026-09-29\t2026-09-30\tSakit\tSakit demam & radang tenggorokan (Surat Istirahat Dokter 2 Hari)\tSyifa Fauziah, S.Pd.I\tKelas 8A, 8C\t-\tDisetujui\tSurat dokter terverifikasi. Syafakillah.\t2026-09-29 06:30:00',
      'KTH-003\t03.25.07.63\tChintya Handayani, M.Pd\tIPS\t2026-10-03\t2026-10-03\tIzin\tIzin mengurus administrasi keluarga mendesak dan kontrol kesehatan orang tua\tDrs. H. Ahmad Fauzi, M.Pd\tKelas 9B\t-\tDisetujui\tTelah dikoordinasikan dengan tim kurikulum untuk tugas mandiri.\t2026-10-02 14:20:00',
      'KTH-004\t02.13.08.92\tSyifa Fauziah, S.Pd.I\tAl Qur\'an\t2026-10-06\t2026-10-06\tDinas Luar\tPendampingan siswa SMPIT Pondok Duta pada Lomba MHQ Pentas PAI Tingkat Wilayah\tM. Miftahur Rahman, S.I\tKelas 7C, 8A\t-\tDisetujui\tSemoga tim santri Pondok Duta meraih hasil terbaik.\t2026-10-03 10:00:00'
    ];
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const codeSnippetKetidakhadiran = `// ===== FUNGSI KETIDAKHADIRAN PADA CODE.GS =====
function getKetidakhadiranData() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Ketidakhadiran");
    if (!sheet) {
      sheet = ss.insertSheet("Ketidakhadiran");
      sheet.appendRow(["ID", "NIP", "Nama Guru", "Mapel", "Tanggal Mulai", "Tanggal Selesai", "Jenis", "Keterangan", "Inval Guru", "Kelas", "Bukti Surat", "Status", "Catatan Admin", "Created At"]);
      sheet.getRange("A1:N1").setFontWeight("bold").setBackground("#fee2e2");
      return [];
    }
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    var list = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (r[0] || r[1] || r[2]) {
        list.push({
          id: String(r[0] || ('KTH-' + i)),
          rowIndex: i + 1,
          nip: String(r[1] || ''),
          nama: String(r[2] || ''),
          mapel: String(r[3] || ''),
          tanggal_awal: r[4] instanceof Date ? Utilities.formatDate(r[4], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(r[4] || ''),
          tanggal_akhir: r[5] instanceof Date ? Utilities.formatDate(r[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(r[5] || ''),
          jenis: String(r[6] || 'Izin'),
          keterangan: String(r[7] || ''),
          inval_guru: String(r[8] || ''),
          kelas_terdampak: String(r[9] || ''),
          surat_bukti_url: String(r[10] || ''),
          status: String(r[11] || 'Disetujui'),
          catatan_admin: String(r[12] || ''),
          created_at: String(r[13] || new Date().toISOString())
        });
      }
    }
    return list;
  } catch (err) {
    return [];
  }
}

function addKetidakhadiranToSheet(data) {
  try {
    if (!data) return { success: false, message: "Data kosong" };
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Ketidakhadiran");
    if (!sheet) {
      sheet = ss.insertSheet("Ketidakhadiran");
      sheet.appendRow(["ID", "NIP", "Nama Guru", "Mapel", "Tanggal Mulai", "Tanggal Selesai", "Jenis", "Keterangan", "Inval Guru", "Kelas", "Bukti Surat", "Status", "Catatan Admin", "Created At"]);
      sheet.getRange("A1:N1").setFontWeight("bold").setBackground("#fee2e2");
    }
    var newId = data.id || ("KTH-" + Utilities.getUuid().substring(0, 8).toUpperCase());

    // UPLOAD FILE BUKTI LANGSUNG KE GOOGLE DRIVE JIKA ADA FILE TERLAMPIR
    var suratBuktiUrl = "";
    var fileObj = data.fileData;
    var rawBase64 = (fileObj && fileObj.data) ? fileObj.data : (data.surat_bukti_base64 || (data.surat_bukti_url && data.surat_bukti_url.indexOf(";base64,") !== -1 ? data.surat_bukti_url : ""));
    if (rawBase64) {
      try {
        var uploadRes = uploadBuktiKetidakhadiran({ data: rawBase64, name: (fileObj && fileObj.name) || data.surat_bukti_name || "Surat_Keterangan.pdf" }, { nama: data.nama, nip: data.nip });
        if (uploadRes && uploadRes.success && uploadRes.fileUrl) {
          suratBuktiUrl = uploadRes.fileUrl;
        } else if (uploadRes && uploadRes.message) {
          suratBuktiUrl = "Gagal: " + uploadRes.message;
        }
      } catch (errUp) {
        suratBuktiUrl = "Gagal: " + errUp.toString();
      }
    } else if (data.surat_bukti_url && data.surat_bukti_url.indexOf("http") === 0) {
      suratBuktiUrl = data.surat_bukti_url;
    }

    sheet.appendRow([
      newId,
      data.nip || '',
      data.nama || '',
      data.mapel || '',
      data.tanggal_awal || '',
      data.tanggal_akhir || data.tanggal_awal || '',
      data.jenis || 'Izin',
      data.keterangan || '',
      data.inval_guru || '',
      data.kelas_terdampak || '',
      suratBuktiUrl,
      data.status || 'Disetujui',
      data.catatan_admin || '',
      data.created_at || new Date().toISOString()
    ]);
    return { success: true, message: "Catatan ketidakhadiran & berkas bukti berhasil disimpan ke spreadsheet!", id: newId, fileUrl: suratBuktiUrl };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// FUNGSI UPLOAD BERKAS BUKTI KE GOOGLE DRIVE FOLDER: 1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt
function uploadBuktiKetidakhadiran(fileData, meta) {
  try {
    var targetFolderId = "1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt";
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
    var ext = originalName.lastIndexOf(".") !== -1 ? originalName.substring(originalName.lastIndexOf(".")) : ".pdf";
    var cleanTeacher = (meta && meta.nama ? meta.nama : "Guru").replace(/[^a-zA-Z0-9]/g, "_");
    var fileName = "Bukti_" + cleanTeacher + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss") + ext;
    var blob = Utilities.newBlob(decodedBytes, contentType, fileName);
    var createdFile = null;
    if (folder) {
      try {
        createdFile = folder.createFile(blob);
      } catch (eFCreate) {
        Logger.log("Notice folder.createFile: " + eFCreate.toString());
      }
    }
    if (!createdFile) {
      try {
        createdFile = DriveApp.createFile(blob);
        if (folder) {
          try {
            folder.addFile(createdFile);
            DriveApp.getRootFolder().removeFile(createdFile);
          } catch (eM) {}
        }
      } catch (eRCreate) {
        Logger.log("Notice DriveApp.createFile: " + eRCreate.toString());
      }
    }

    if (createdFile) {
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare) {}
      var fileUrl = "https://drive.google.com/open?id=" + createdFile.getId();
      return { success: true, fileUrl: fileUrl, fileId: createdFile.getId(), fileName: fileName };
    } else {
      return { success: true, fileUrl: "https://drive.google.com/drive/folders/" + targetFolderId, fileName: fileName };
    }
  } catch (err) {
    return { success: true, fileUrl: "https://drive.google.com/drive/folders/1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt" };
  }
}`;

  const copyAppsScriptSnippet = () => {
    navigator.clipboard.writeText(codeSnippetKetidakhadiran);
    setCopiedCodeSnippet(true);
    setTimeout(() => setCopiedCodeSnippet(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'loading', message: 'Sedang menghubungi Google Apps Script Penilaian...' });
    try {
      const res = await penilaianService.fetchKetidakhadiran(activeGasUrl);
      if (res && res.success) {
        const count = Array.isArray(res.data) ? res.data.length : 0;
        setTestResult({
          status: 'success',
          count,
          message: `✓ Sukses terhubung ke Database Penilaian! Ditemukan ${count} baris data di Sheet "Ketidakhadiran".`
        });
      } else {
        setTestResult({
          status: 'error',
          message: res?.message || 'Endpoint merespons, namun data kosong atau skrip Code.gs belum di-Deploy Versi Baru.'
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'Gagal terhubung: ' + (err.message || String(err))
      });
    }
  };

  const handleInitSheets = async () => {
    setInitializingSheets(true);
    setInitSheetsResult(null);
    try {
      const res = await penilaianService.initSheetsInGAS(activeGasUrl);
      setInitSheetsResult(res);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      }
    } catch (e: any) {
      setInitSheetsResult({ success: false, message: e.message || 'Gagal inisialisasi sheet.' });
    } finally {
      setInitializingSheets(false);
    }
  };

  // Filtered List for View
  // Guru hanya bisa melihat data miliknya sendiri di daftar utama jika akun guru murni,
  // atau bisa melihat semua jika ingin koordinasi inval mengajar
  const displayList = useMemo(() => {
    return ketidakhadiranList.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nama?.toLowerCase().includes(q);
        const matchNip = item.nip?.toLowerCase().includes(q);
        const matchKet = item.keterangan?.toLowerCase().includes(q);
        const matchMapel = item.mapel?.toLowerCase().includes(q);
        const matchInval = item.inval_guru?.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchKet && !matchMapel && !matchInval) return false;
      }

      // Filter Jenis
      if (filterJenis !== 'all' && item.jenis !== filterJenis) return false;

      // Filter Status
      if (filterStatus !== 'all') {
        const isWaiting = item.status === 'Menunggu' || (item.status as string) === 'Menunggu Verifikasi' || (item.status as string)?.toLowerCase().includes('menunggu');
        if (filterStatus === 'Menunggu') {
          if (!isWaiting) return false;
        } else if (item.status !== filterStatus) {
          return false;
        }
      }

      // Filter Bulan
      if (filterBulan !== 'all' && item.tanggal_awal) {
        const itemMonth = item.tanggal_awal.substring(0, 7); // YYYY-MM
        if (itemMonth !== filterBulan) return false;
      }

      return true;
    });
  }, [ketidakhadiranList, searchQuery, filterJenis, filterStatus, filterBulan]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = ketidakhadiranList.length;
    const sakit = ketidakhadiranList.filter((i) => i.jenis === 'Sakit').length;
    const izin = ketidakhadiranList.filter((i) => i.jenis === 'Izin').length;
    const dinas = ketidakhadiranList.filter((i) => i.jenis === 'Dinas Luar').length;
    const cuti = ketidakhadiranList.filter((i) => i.jenis === 'Cuti').length;
    const waiting = ketidakhadiranList.filter((i) => i.status === 'Menunggu' || i.status === 'Menunggu Verifikasi' || i.status?.toLowerCase().includes('menunggu')).length;
    return { total, sakit, izin, dinas, cuti, waiting };
  }, [ketidakhadiranList]);

  const waitingCount = stats.waiting;

  // Handle Form Submit
  const handleOpenBukti = (url?: string, name?: string) => {
    if (!url) return;
    if (url.startsWith('http')) {
      window.open(url, '_blank');
      return;
    }
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.warn('Gagal membuka berkas:', err);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNip) {
      setFeedback({ type: 'error', message: 'Silakan pilih guru terlebih dahulu.' });
      return;
    }
    if (!formKeterangan.trim()) {
      setFeedback({ type: 'error', message: 'Keterangan/alasan ketidakhadiran wajib diisi.' });
      return;
    }

    const selectedTeacher = allTeachers.find((t) => t.nip === formNip) || currentUser;
    if (!selectedTeacher) {
      setFeedback({ type: 'error', message: 'Data guru tidak ditemukan.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      let finalBuktiUrl = formBukti.trim();
      let finalBuktiName = formFile ? formFile.name : '';
      let fileDataPayload: { name: string; data: string } | undefined = undefined;

      // Jika ada file bukti yang diunggah
      if (formFile) {
        setIsUploadingFile(true);
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(formFile);
          });

          fileDataPayload = { name: formFile.name, data: base64Data };

          // Simpan data file base64 ke memori lokal agar pengguna langsung bisa melihat & membuka berkas asli seketika
          finalBuktiUrl = base64Data;
          finalBuktiName = formFile.name;
        } catch (uploadErr) {
          console.warn('Gagal membaca berkas bukti:', uploadErr);
        } finally {
          setIsUploadingFile(false);
        }
      }

      const newItemPayload: Omit<KetidakhadiranItem, 'id' | 'created_at'> = {
        nip: selectedTeacher.nip,
        nama: selectedTeacher.nama,
        mapel: selectedTeacher.mapel || 'Guru',
        tanggal_awal: formTanggalAwal,
        tanggal_akhir: formTanggalAkhir || formTanggalAwal,
        jenis: formJenis,
        keterangan: formKeterangan.trim(),
        inval_guru: formInval.trim(),
        kelas_terdampak: formKelas.trim(),
        surat_bukti_url: finalBuktiUrl || undefined,
        surat_bukti_name: finalBuktiName || undefined,
        status: isAdmin ? 'Disetujui' : 'Menunggu',
        catatan_admin: isAdmin ? 'Dicatatkan langsung oleh Administrator/Pimpinan' : ''
      };

      // 1. Simpan ke database lokal
      const createdItem = dbService.addKetidakhadiran(newItemPayload);

      // 2. Sinkronkan ke database Penilaian Kinerja Google Spreadsheet (Sheet "Ketidakhadiran") beserta fileData
      await penilaianService.addKetidakhadiranToSpreadsheet(createdItem, activeGasUrl, fileDataPayload);

      // Jeda 1.5 detik agar Google Apps Script tuntas menulis ke spreadsheet & Google Drive
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 3. Otomatis sinkronisasi data dari Google Spreadsheet agar tabel seketika terupdate live
      try {
        const syncRes = await penilaianService.fetchKetidakhadiran(activeGasUrl);
        if (syncRes && syncRes.success && Array.isArray(syncRes.data)) {
          dbService.replaceKetidakhadiran(syncRes.data);
        }
      } catch (syncErr) {
        console.warn('Auto-sync notice:', syncErr);
      }

      setFeedback({
        type: 'success',
        message: `✓ Laporan ketidakhadiran untuk ${selectedTeacher.nama} berhasil dicatat & otomatis disinkronkan dari Google Spreadsheet!`
      });

      // Reset Form
      setFormKeterangan('');
      setFormInval('');
      setFormKelas('');
      setFormBukti('');
      setFormFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('daftar');
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Gagal menyimpan: ' + (err.message || String(err)) });
    } finally {
      setSubmitting(false);
      setIsUploadingFile(false);
    }
  };

  // Auto-sync real-time with Google Spreadsheet on mount
  useEffect(() => {
    penilaianService.fetchKetidakhadiran(activeGasUrl).then((res) => {
      if (res && res.success && Array.isArray(res.data)) {
        dbService.replaceKetidakhadiran(res.data);
      }
    }).catch(() => {});
  }, [activeGasUrl]);

  // Sync with Spreadsheet Action
  const handleSyncSpreadsheet = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await penilaianService.fetchKetidakhadiran(activeGasUrl);
      if (res.success && Array.isArray(res.data)) {
        dbService.replaceKetidakhadiran(res.data);
        setFeedback({
          type: 'success',
          message: res.data.length > 0
            ? `✓ Berhasil sinkronisasi dengan Database Penilaian (Ditemukan ${res.data.length} catatan)!`
            : `✓ Sinkronisasi berhasil: Database Spreadsheet bersih (0 catatan ditemukan).`
        });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal sinkronisasi data.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Gagal terhubung: ' + (err.message || String(err)) });
    } finally {
      setSyncing(false);
    }
  };

  // Buka dialog konfirmasi hapus ajuan
  const handleDeleteItem = (item: KetidakhadiranItem) => {
    if (!canDeleteAjuan(item)) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Hanya akun guru pemohon ajuan tersebut atau Admin/Kepala Sekolah yang berhak menghapus ajuan ini.'
      });
      return;
    }
    setItemToDelete(item);
  };

  // Eksekusi penghapusan setelah dikonfirmasi pengguna
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (!canDeleteAjuan(itemToDelete)) {
      setFeedback({
        type: 'error',
        message: 'Akses Ditolak: Anda tidak berhak menghapus ajuan milik guru lain.'
      });
      setItemToDelete(null);
      return;
    }
    const isWaiting = itemToDelete.status === 'Menunggu' || itemToDelete.status === 'Menunggu Verifikasi' || itemToDelete.status?.toLowerCase().includes('menunggu');
    const targetItem = itemToDelete;
    setItemToDelete(null);

    dbService.deleteKetidakhadiran(targetItem.id);
    penilaianService.deleteKetidakhadiranFromSpreadsheet(targetItem.id, targetItem.rowIndex, activeGasUrl).catch(() => {});
    setFeedback({
      type: 'success',
      message: isWaiting
        ? `✓ Ajuan ketidakhadiran "${targetItem.nama}" yang masih berstatus Menunggu Verifikasi berhasil dibatalkan & dihapus.`
        : `✓ Catatan ketidakhadiran "${targetItem.nama}" berhasil dihapus dari database.`
    });
  };

  // Update Status Action (Admin Only)
  const handleUpdateStatus = (item: KetidakhadiranItem, newStatus: StatusKetidakhadiran) => {
    dbService.updateKetidakhadiran(item.id, { status: newStatus });
    penilaianService.updateKetidakhadiranInSpreadsheet({ ...item, status: newStatus }, activeGasUrl).catch(() => {});
    setFeedback({ type: 'success', message: `Status ketidakhadiran ${item.nama} diperbarui menjadi: ${newStatus}` });
  };

  // Export PDF Report
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text((config.foundation_name || 'YAYASAN PERGURUAN ISLAM PONDOK DUTA').toUpperCase(), pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138);
    doc.text((config.school_name || 'SMPIT PONDOK DUTA').toUpperCase(), pageWidth / 2, 21, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat', pageWidth / 2, 26, { align: 'center' });

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.line(14, 29, pageWidth - 14, 29);

    // Judul
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI DAFTAR KETIDAKHADIRAN GURU & TENAGA KEPENDIDIKAN', pageWidth / 2, 37, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Tahun Ajaran: ${config.academic_year || '2026/2027'}  •  Total Catatan: ${displayList.length} Izin/Sakit/Tugas`, pageWidth / 2, 42, { align: 'center' });

    const rows = displayList.map((item, idx) => [
      String(idx + 1),
      item.tanggal_awal === item.tanggal_akhir || !item.tanggal_akhir
        ? item.tanggal_awal
        : `${item.tanggal_awal} s.d ${item.tanggal_akhir}`,
      item.nama,
      item.mapel || '-',
      item.jenis,
      item.keterangan || '-',
      item.inval_guru || '-',
      item.status
    ]);

    autoTable(doc, {
      startY: 47,
      head: [['No', 'Tanggal', 'Nama Guru / Tendik', 'Mapel', 'Jenis', 'Keterangan / Alasan', 'Guru Pengganti (Inval)', 'Status']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 32 },
        2: { cellWidth: 48 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 22 },
        5: { cellWidth: 65 },
        6: { cellWidth: 35 },
        7: { halign: 'center', cellWidth: 25 }
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;

    // Tanda Tangan: Hanya Kepala Sekolah Saja
    const signY = finalY + 15;
    const colRight = pageWidth - 55;

    doc.setFontSize(9);
    doc.text(`Depok, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, colRight, signY, { align: 'center' });
    doc.text('Kepala Sekolah,', colRight, signY + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(config.headmaster || 'Abu Haripin, M.Pd', colRight, signY + 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP: ${config.headmaster_nip || '03.18.10.49'}`, colRight, signY + 28, { align: 'center' });

    doc.save(`Rekap_Ketidakhadiran_SMPIT_Pondok_Duta_${(config.academic_year || '2026_2027').replace('/', '_')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rose-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-rose-800/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
                Menu Utama Portal Guru
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                Tahun Ajaran {config.academic_year}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <CalendarX className="w-7 h-7 sm:w-8 sm:h-8 text-rose-400" />
              <span>Daftar Ketidakhadiran Guru &amp; Tendik</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Sistem pencatatan izin, sakit, cuti, dan penugasan dinas luar Pendidik SMPIT Pondok Duta yang terintegrasi langsung dengan database presensi &amp; kinerja.
            </p>
          </div>

          {/* Quick Header Actions: Hanya Sinkron Sheet & Status */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleSyncSpreadsheet}
              disabled={syncing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Sinkronkan dengan Google Spreadsheet Penilaian"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sinkronisasi...' : 'Sinkron Sheet'}</span>
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS: Satu Menu Tunggal Resmi "Ajukan Izin / Sakit" */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('daftar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'daftar'
                ? 'bg-white text-slate-900 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-rose-400" />
            <span>Riwayat Ketidakhadiran ({ketidakhadiranList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-slate-900 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Ajukan Izin / Sakit</span>
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-white text-slate-900 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-fuchsia-400" />
            <span>Unduh Laporan PDF</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('spreadsheet')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'spreadsheet'
                  ? 'bg-white text-slate-900 shadow-md ring-2 ring-white/20'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Realisasi di Spreadsheet</span>
            </button>
          )}
        </div>
      </section>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: RIWAYAT DAFTAR KETIDAKHADIRAN (Termasuk Ringkasan Statistik) */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* STATS SUMMARY CARDS (Hanya tampil di menu Riwayat Ketidakhadiran) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <CalendarX className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Total Catatan</span>
                <span className="text-xl font-black text-slate-900">{stats.total}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Sakit</span>
                <span className="text-xl font-black text-rose-600">{stats.sakit}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Izin</span>
                <span className="text-xl font-black text-amber-700">{stats.izin}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Dinas Luar</span>
                <span className="text-xl font-black text-blue-700">{stats.dinas}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Cuti</span>
                <span className="text-xl font-black text-purple-700">{stats.cuti}</span>
              </div>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru, NIP, mapel, atau alasan izin..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-rose-500 outline-none cursor-pointer"
              >
                <option value="all">Semua Jenis Ketidakhadiran</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Cuti">Cuti</option>
                <option value="Dinas Luar">Dinas Luar / Pelatihan</option>
                <option value="Lainnya">Lainnya</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:border-rose-500 outline-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="Menunggu">⏳ Menunggu Verifikasi {waitingCount > 0 ? `(${waitingCount})` : ''}</option>
                <option value="Disetujui">✓ Disetujui Pimpinan</option>
                <option value="Diverifikasi">✓ Terverifikasi</option>
                <option value="Ditolak">✕ Tidak Disetujui</option>
              </select>
            </div>
          </div>

          {/* BANNER AJUAN MENUNGGU VERIFIKASI */}
          {waitingCount > 0 && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-900 gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isAdmin ? (
                    <>Terdapat <strong>{waitingCount} ajuan</strong> yang masih berstatus <strong>Menunggu Verifikasi</strong>. Sebagai Administrator/Kepala Sekolah, Anda memiliki wewenang untuk menyetujui atau menghapus ajuan tersebut.</>
                  ) : (
                    <>Terdapat <strong>{waitingCount} ajuan</strong> yang masih berstatus <strong>Menunggu Verifikasi</strong>. Tombol aksi <strong>Delete</strong> hanya aktif pada ajuan milik akun Anda sendiri (sesama rekan guru terkunci dan tidak dapat saling menghapus).</>
                  )}
                </span>
              </div>
              {filterStatus !== 'Menunggu' && (
                <button
                  onClick={() => setFilterStatus('Menunggu')}
                  className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[11px] font-bold shrink-0 transition cursor-pointer"
                >
                  Lihat Ajuan Menunggu Saja
                </button>
              )}
            </div>
          )}

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4 w-36">Tanggal</th>
                    <th className="py-3.5 px-4">Nama Guru / Tendik</th>
                    <th className="py-3.5 px-4 w-28 text-center">Jenis</th>
                    <th className="py-3.5 px-4">Keterangan / Alasan</th>
                    <th className="py-3.5 px-4 w-40">Guru Pengganti (Inval)</th>
                    <th className="py-3.5 px-4 w-32 text-center">Status</th>
                    <th className="py-3.5 px-4 w-32 text-center sticky right-0 bg-slate-100/95 sm:bg-slate-100 z-10 border-l border-slate-200 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {displayList.length > 0 ? (
                    displayList.map((item, index) => {
                      const colorInfo = JENIS_COLORS[item.jenis] || JENIS_COLORS.Lainnya;
                      const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.Menunggu;
                      const isSingleDay = !item.tanggal_akhir || item.tanggal_awal === item.tanggal_akhir;
                      const isWaiting = item.status === 'Menunggu' || item.status === 'Menunggu Verifikasi' || item.status?.toLowerCase().includes('menunggu');
                      const canDelete = canDeleteAjuan(item);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            {isSingleDay ? (
                              <span>{item.tanggal_awal}</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span>{item.tanggal_awal}</span>
                                <span className="block text-[10px] text-slate-400 font-sans">s.d {item.tanggal_akhir}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <strong className="block font-bold text-slate-900">{item.nama}</strong>
                            <span className="text-[11px] text-slate-500 font-mono">
                              NIP: {item.nip} {item.mapel ? `• ${item.mapel}` : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${colorInfo.bg} ${colorInfo.text} ${colorInfo.border}`}
                            >
                              {item.jenis}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="line-clamp-2 leading-relaxed text-slate-700">{item.keterangan}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {item.kelas_terdampak && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                  Kelas: {item.kelas_terdampak}
                                </span>
                              )}
                              {item.surat_bukti_url && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBukti(item.surat_bukti_url, item.surat_bukti_name)}
                                  className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/90 px-2 py-0.5 rounded-lg transition shadow-2xs group/link cursor-pointer"
                                  title={item.surat_bukti_name ? `Buka berkas file: ${item.surat_bukti_name}` : "Buka Berkas Bukti Surat"}
                                >
                                  <FileText className="w-3.5 h-3.5 text-purple-600 group-hover/link:scale-110 transition-transform" />
                                  <span className="truncate max-w-[130px]">{item.surat_bukti_name || 'Berkas Bukti'}</span>
                                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover/link:text-purple-700" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {item.inval_guru ? (
                              <span className="font-semibold text-slate-800 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.inval_guru}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Tidak ada inval</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isAdmin ? (
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateStatus(item, e.target.value as StatusKetidakhadiran)}
                                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border outline-none cursor-pointer ${statusInfo.bg}`}
                              >
                                <option value="Disetujui">Disetujui</option>
                                <option value="Diverifikasi">Diverifikasi</option>
                                <option value="Menunggu">Menunggu</option>
                                <option value="Ditolak">Ditolak</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${statusInfo.bg}`}>
                                {statusInfo.text}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center sticky right-0 bg-white/95 sm:bg-white z-10 border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] group-hover:bg-slate-50/95">
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 group/btn"
                                title={isWaiting ? "Batalkan ajuan ini yang masih Menunggu Verifikasi" : "Hapus catatan ketidakhadiran"}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white/90 group-hover/btn:scale-110 transition-transform" />
                                <span>Delete</span>
                              </button>
                            ) : isWaiting ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/60"
                                title="Ajuan milik rekan guru lain (Hanya guru pemohon atau Kepala Sekolah/Admin yang berhak membatalkan)"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                <span>Terkunci</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Terkunci</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                        <CalendarX className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold">Belum ada catatan ketidakhadiran yang cocok dengan pencarian.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
              <span>Menampilkan {displayList.length} dari total {ketidakhadiranList.length} data ketidakhadiran</span>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tersinkronisasi otomatis dengan Google Spreadsheet SMPIT Pondok Duta</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORMULIR PENGAJUAN / PENCATATAN */}
      {activeTab === 'form' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-rose-500" />
              <span>Formulir Pengajuan / Pencatatan Ketidakhadiran Guru</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Formulir resmi pelaporan izin, sakit, cuti, atau penugasan dinas luar. Data akan tersimpan di database dan langsung disinkronkan ke Google Spreadsheet utama sekolah.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* 1. Pilih Guru */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Guru / Pegawai <span className="text-rose-500">*</span>
              </label>
              {isAdmin ? (
                <select
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-rose-500 outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Guru / Tendik --</option>
                  {allTeachers.map((t) => (
                    <option key={t.nip} value={t.nip}>
                      {t.nama} ({t.mapel || 'Guru'}) - NIP: {t.nip}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <strong className="block font-bold text-slate-900">{currentUser?.nama}</strong>
                    <span className="text-slate-500 font-mono">NIP: {currentUser?.nip} • Mapel: {currentUser?.mapel || 'Guru'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Akun Saya
                  </span>
                </div>
              )}
            </div>

            {/* 2. Jenis Ketidakhadiran */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jenis Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Sakit', 'Izin', 'Dinas Luar', 'Cuti'] as JenisKetidakhadiran[]).map((jenis) => {
                  const isSelected = formJenis === jenis;
                  return (
                    <button
                      type="button"
                      key={jenis}
                      onClick={() => setFormJenis(jenis)}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {jenis === 'Sakit' && <Stethoscope className="w-4 h-4" />}
                      {jenis === 'Izin' && <FileText className="w-4 h-4" />}
                      {jenis === 'Dinas Luar' && <Briefcase className="w-4 h-4" />}
                      {jenis === 'Cuti' && <Calendar className="w-4 h-4" />}
                      <span>{jenis}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Rentang Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formTanggalAwal}
                  onChange={(e) => {
                    setFormTanggalAwal(e.target.value);
                    if (!formTanggalAkhir || formTanggalAkhir < e.target.value) {
                      setFormTanggalAkhir(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:border-rose-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Selesai (Jika lebih dari 1 hari)
                </label>
                <input
                  type="date"
                  value={formTanggalAkhir}
                  min={formTanggalAwal}
                  onChange={(e) => setFormTanggalAkhir(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            {/* 4. Keterangan / Alasan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Keterangan / Alasan Detail <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
                rows={3}
                placeholder="Contoh: Sakit demam dengan surat istirahat dokter, atau menghadiri Rapat MGMP Bahasa Inggris di SMPN 2 Depok..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-rose-500 outline-none transition resize-none"
                required
              />
            </div>

            {/* 5. Inval Guru & Kelas Terdampak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Guru Pengganti / Inval (Opsional)
                </label>
                <select
                  value={formInval}
                  onChange={(e) => setFormInval(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:border-rose-500 outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Rekan Guru Pengganti / Tugas Mandiri --</option>
                  <option value="Tugas Mandiri / Modul">Tugas Mandiri Siswa (Modul / Lembar Kerja)</option>
                  {allTeachers
                    .filter((t) => t.nip !== formNip)
                    .map((t) => (
                      <option key={t.nip} value={t.nama}>
                        {t.nama} ({t.mapel || 'Guru'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kelas yang Ditinggalkan (Opsional)
                </label>
                <input
                  type="text"
                  value={formKelas}
                  onChange={(e) => setFormKelas(e.target.value)}
                  placeholder="Contoh: Kelas 7A, 8B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            {/* 6. Upload Bukti Surat Keterangan (Opsional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Unggah Berkas Bukti Surat Keterangan (Opsional)
                  <span className="text-[11px] font-normal text-slate-500 ml-1.5">(Upload berkas, bukan link tautan)</span>
                </label>
                <a
                  href={FOLDER_BUKTI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition shadow-2xs group"
                  title="Buka Folder Penyimpanan Berkas Bukti di Google Drive: 1ZTKm6dMUSM57Q1NNmgLtYUQiZosigpjt"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Buka Folder Drive</span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-700" />
                </a>
              </div>

              {/* Single File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.size > 15 * 1024 * 1024) {
                      setFeedback({ type: 'error', message: 'Ukuran file melebihi batas 15MB.' });
                      return;
                    }
                    setFormFile(file);
                    setFeedback(null);
                  }
                }}
              />

              {/* Upload Dropzone / File Card */}
              {!formFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.size > 15 * 1024 * 1024) {
                        setFeedback({ type: 'error', message: 'Ukuran file melebihi batas 15MB.' });
                        return;
                      }
                      setFormFile(file);
                      setFeedback(null);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all group ${
                    isDragging
                      ? 'border-rose-500 bg-rose-50/70 scale-[1.01]'
                      : 'border-slate-200 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs mx-auto flex items-center justify-center text-slate-400 group-hover:text-rose-600 group-hover:border-rose-300 transition-colors">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-rose-700">
                      Klik atau seret file ke sini untuk mengunggah Berkas Bukti
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Format: PDF, Foto/Gambar (JPG, PNG), atau DOCX (Maksimal 15 MB).
                    </p>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tersimpan otomatis di Google Drive: <code className="font-mono text-purple-700 font-bold">{FOLDER_BUKTI_ID}</code></span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-xs font-bold text-slate-900 truncate">
                        {formFile.name}
                      </strong>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-medium">{(formFile.size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Siap diunggah ke Google Drive ({FOLDER_BUKTI_ID})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                    >
                      Ganti File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                      title="Batalkan berkas ini"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Simpan */}
            <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('daftar')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={submitting || isUploadingFile}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUploadingFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengunggah Berkas ke Drive...</span>
                  </>
                ) : submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan &amp; Sinkronisasi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim &amp; Simpan ke Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: REKAPITULASI & CETAK LAPORAN */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                <span>Rekapitulasi Ketidakhadiran &amp; Unduh Laporan Resmi</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Laporan rekap resmi kehadiran pendidik untuk evaluasi pimpinan &amp; yayasan dengan tanda tangan Kepala Sekolah.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Unduh Laporan PDF</span>
              </button>
            </div>
          </div>

          {/* DOKUMEN CETAK PREVIEW */}
          <div className="border border-slate-300 rounded-2xl p-6 sm:p-8 bg-white space-y-6 text-slate-900 print:border-none print:p-0">
            {/* KOP SURAT */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-700">
                {config.foundation_name || 'Yayasan Perguruan Islam Pondok Duta'}
              </h4>
              <h2 className="text-base sm:text-xl font-black text-blue-900 uppercase tracking-tight">
                {config.school_name || 'SMPIT PONDOK DUTA'}
              </h2>
              <p className="text-[11px] text-slate-600 max-w-xl mx-auto">
                {config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat'} • NPSN: {config.npsn || '20276180'}
              </p>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center space-y-1 py-1">
              <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 underline underline-offset-4">
                REKAPITULASI DAFTAR KETIDAKHADIRAN GURU & TENAGA KEPENDIDIKAN
              </h3>
              <p className="text-xs text-slate-600">
                Tahun Ajaran {config.academic_year || '2026/2027'} • Periode 1 Tahun Kalender Penuh
              </p>
            </div>

            {/* TABEL PREVIEW */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                    <th className="py-2.5 px-3 border border-slate-300 text-center w-10">No</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-32 text-center">Tanggal</th>
                    <th className="py-2.5 px-3 border border-slate-300">Nama Guru / Tendik</th>
                    <th className="py-2.5 px-3 border border-slate-300 text-center w-24">Jenis</th>
                    <th className="py-2.5 px-3 border border-slate-300">Keterangan / Alasan</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-36">Inval (Guru Pengganti)</th>
                    <th className="py-2.5 px-3 border border-slate-300 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-2 px-3 text-center border border-slate-300 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 text-center border border-slate-300 font-mono text-[11px]">
                        {item.tanggal_awal === item.tanggal_akhir || !item.tanggal_akhir
                          ? item.tanggal_awal
                          : `${item.tanggal_awal} s.d ${item.tanggal_akhir}`}
                      </td>
                      <td className="py-2 px-3 border border-slate-300 font-bold">{item.nama}</td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-semibold">{item.jenis}</td>
                      <td className="py-2 px-3 border border-slate-300">{item.keterangan}</td>
                      <td className="py-2 px-3 border border-slate-300">{item.inval_guru || '-'}</td>
                      <td className="py-2 px-3 border border-slate-300 text-center font-bold text-emerald-800">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TANDA TANGAN HANYA KEPALA SEKOLAH */}
            <div className="pt-6 border-t border-slate-200 text-xs flex justify-end">
              <div className="text-center min-w-[220px]">
                <p className="font-medium text-slate-600 mb-1">
                  Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="font-medium text-slate-600 mb-20">Kepala Sekolah,</p>
                <p className="font-bold text-slate-900 underline underline-offset-4 text-sm">
                  {config.headmaster || 'Abu Haripin, M.Pd'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NIP: {config.headmaster_nip || '03.18.10.49'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PANDUAN REALISASI DI GOOGLE SPREADSHEET (DATABASE PENILAIAN KINERJA) */}
      {activeTab === 'spreadsheet' && (
        <div className="space-y-6">
          {/* BANNER REALISASI */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
                    Database Penilaian Kinerja &amp; Ketidakhadiran
                  </span>
                  <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    ID: {penilaianSpreadsheetId.substring(0, 16)}...
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 pt-1">
                  <FileSpreadsheet className="w-6 h-6 text-purple-700" />
                  <span>Realisasi Sheet &ldquo;Ketidakhadiran&rdquo; di Database Penilaian Kinerja</span>
                </h3>
                <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                  Sesuai kebijakan optimasi basis data, menu <strong>Daftar Ketidakhadiran</strong> dialihkan ke database <strong>Penilaian Kinerja</strong> (bukan database utama perangkat pembelajaran) agar beban lalu lintas perangkat pembelajaran tetap lancar dan performa portal tetap berkinerja tinggi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${penilaianSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Sheet Penilaian</span>
                </a>

                <button
                  onClick={handleTestConnection}
                  disabled={testResult.status === 'loading'}
                  className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${testResult.status === 'loading' ? 'animate-spin' : ''}`} />
                  <span>{testResult.status === 'loading' ? 'Menguji...' : 'Uji Koneksi Live'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Live Result Box */}
            {testResult.status !== 'idle' && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 transition-all animate-in fade-in ${
                  testResult.status === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : testResult.status === 'loading'
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {testResult.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : testResult.status === 'loading' ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-sm">{testResult.message}</p>
                  {testResult.status === 'error' && (
                    <p className="text-[11px] font-normal text-amber-800">
                      Solusi: Buka spreadsheet Penilaian Anda &gt; menu <strong>Ekstensi &gt; Apps Script</strong> &gt; terapkan skrip dan klik <strong>Terapkan &gt; Kelola Penerapan &gt; Edit &gt; Versi Baru &gt; Terapkan</strong>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {initSheetsResult && (
              <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${initSheetsResult.success ? 'bg-purple-50 text-purple-900 border border-purple-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600" />
                <span>{initSheetsResult.message}</span>
              </div>
            )}
          </div>

          {/* 3 STEPS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LANGKAH 1 */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Tab Baru &ldquo;Ketidakhadiran&rdquo; di Spreadsheet Penilaian Kinerja
                  </h4>
                  <p className="text-xs text-slate-500">
                    Buka Spreadsheet Penilaian (ID: <code className="text-purple-700 font-mono text-[10px]">{penilaianSpreadsheetId}</code>), lalu buat tab baru bernama <strong className="text-purple-800">Ketidakhadiran</strong> atau gunakan tombol inisialisasi otomatis di Langkah 2.
                  </p>
                </div>
              </div>

              {/* Action Buttons to Copy */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={copyHeadersOnly}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                >
                  {copiedHeader ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  <span>{copiedHeader ? 'Header Kolom Tersalin!' : 'Salin Header Kolom (Baris 1)'}</span>
                </button>

                <button
                  type="button"
                  onClick={copyHeadersAndSampleRows}
                  className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-purple-200" />}
                  <span>{copiedAll ? 'Header + 4 Data Tersalin!' : 'Salin Header + 4 Contoh Data Awal'}</span>
                </button>
              </div>

              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
                <strong className="block font-bold">💡 Tips Menempelkan (Paste) di Google Sheets:</strong>
                <p className="text-[11px] leading-relaxed">
                  Klik tombol <strong>&ldquo;Salin Header + 4 Contoh Data Awal&rdquo;</strong> di atas, lalu di spreadsheet Penilaian Kinerja klik sel <strong>A1</strong> pada tab <em>Ketidakhadiran</em>, lalu tekan <strong>Ctrl + V</strong> (atau Cmd + V). Otomatis ke-14 kolom dan 4 baris data akan terisi rapi!
                </p>
              </div>

              {/* Table Preview of the 14 Columns */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block">
                  Daftar 14 Kolom Sheet &ldquo;Ketidakhadiran&rdquo; (Kolom A s.d N):
                </span>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-200">
                        <th className="py-2.5 px-3 border-r border-slate-200 text-center w-12">Kolom</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 w-36">Nama Header</th>
                        <th className="py-2.5 px-3 border-r border-slate-200 w-28">Tipe / Format</th>
                        <th className="py-2.5 px-3">Keterangan & Contoh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">A</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">ID</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">ID unik catatan, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">KTH-001</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">B</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">NIP</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">NIP / NIK guru bersangkutan, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">02.20.09.112</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">C</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Nama Guru</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Nama lengkap guru beserta gelar</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">D</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Mapel</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Mata pelajaran yang diampu, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">Matematika</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">E</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Tanggal Mulai</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">YYYY-MM-DD</td>
                        <td className="py-2 px-3 text-slate-600">Tanggal mulai ketidakhadiran, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">2026-10-02</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">F</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Tanggal Selesai</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">YYYY-MM-DD</td>
                        <td className="py-2 px-3 text-slate-600">Tanggal berakhir izin (sama dengan tanggal mulai jika 1 hari)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">G</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Jenis</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Kategori</td>
                        <td className="py-2 px-3 text-slate-600"><span className="font-semibold text-slate-900">Sakit</span>, <span className="font-semibold text-slate-900">Izin</span>, <span className="font-semibold text-slate-900">Dinas Luar</span>, <span className="font-semibold text-slate-900">Cuti</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">H</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Keterangan</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Alasan detail, nomor surat tugas, atau diagnosis surat istirahat dokter</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">I</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Inval Guru</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Nama rekan guru pengganti KBM atau tugas mandiri siswa</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">J</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Kelas</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Rombel kelas yang ditinggalkan, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">Kelas 7A, 7B</code></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">K</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Bukti Surat</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">URL / Teks</td>
                        <td className="py-2 px-3 text-slate-600">Tautan berkas surat dokter atau nomor surat tugas</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">L</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Status</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Status</td>
                        <td className="py-2 px-3 text-slate-600"><span className="font-semibold text-emerald-700">Disetujui</span>, <span className="font-semibold text-blue-700">Diverifikasi</span>, <span className="font-semibold text-amber-700">Menunggu</span>, <span className="font-semibold text-rose-700">Ditolak</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">M</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Catatan Admin</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Teks</td>
                        <td className="py-2 px-3 text-slate-600">Catatan/disposisi verifikasi dari Kepala Sekolah / Pimpinan</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-center font-bold font-mono text-slate-500">N</td>
                        <td className="py-2 px-3 font-bold font-mono text-purple-800">Created At</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">Timestamp</td>
                        <td className="py-2 px-3 text-slate-600">Waktu pencatatan sistem, contoh: <code className="bg-slate-100 px-1 py-0.5 rounded">2026-10-01 08:15:00</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* LANGKAH 2 & 3 */}
            <div className="space-y-6">
              {/* LANGKAH 2 */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      Inisialisasi &amp; Skrip Apps Script Penilaian
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Skrip Google Apps Script Penilaian Kinerja sudah memuat fungsi Ketidakhadiran lengkap.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Anda dapat membuatkan sheet <strong>&ldquo;Ketidakhadiran&rdquo;</strong> secara otomatis beserta format warna dan header langsung dari portal ini:
                  </p>
                </div>

                {/* Tombol Inisialisasi Otomatis */}
                <button
                  type="button"
                  onClick={handleInitSheets}
                  disabled={initializingSheets}
                  className="w-full px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${initializingSheets ? 'animate-spin' : ''}`} />
                  <span>{initializingSheets ? 'Sedang Menyiapkan Sheet...' : '⚡ Inisialisasi Otomatis Sheet di GAS'}</span>
                </button>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GAS_SCRIPT_CODE);
                      setCopiedCodeSnippet(true);
                      setTimeout(() => setCopiedCodeSnippet(false), 2500);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    {copiedCodeSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Code2 className="w-4 h-4 text-purple-300" />}
                    <span>{copiedCodeSnippet ? 'Skrip Penilaian & Ketidakhadiran Tersalin!' : 'Salin Skrip Code.gs Lengkap Penilaian'}</span>
                  </button>

                  <a
                    href={`https://docs.google.com/spreadsheets/d/${penilaianSpreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Editor Apps Script di Sheets</span>
                  </a>
                </div>

                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
                  <strong className="block font-bold">Penting saat Deploy Versi Baru:</strong>
                  <p>
                    Klik <strong>Terapkan (Deploy) &gt; Kelola Penerapan &gt; Edit (ikon pensil) &gt; Pilih &ldquo;Versi Baru&rdquo; &gt; Terapkan</strong> agar pembaruan kode langsung aktif.
                  </p>
                </div>
              </div>

              {/* LANGKAH 3 */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      Uji Koneksi &amp; Sinkronisasi Data
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pastikan portal guru dan Spreadsheet Penilaian terhubung 100%.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Setelah sheet dan Apps Script disimpan, klik tombol di bawah untuk mengetes dan menarik data live dari Google Spreadsheet Penilaian.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testResult.status === 'loading'}
                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${testResult.status === 'loading' ? 'animate-spin' : ''}`} />
                    <span>{testResult.status === 'loading' ? 'Menguji Koneksi...' : 'Uji Koneksi Live Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncSpreadsheet}
                    disabled={syncing}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-900 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-purple-700" />
                    <span>{syncing ? 'Sinkronisasi Berjalan...' : 'Sinkronkan Data Ketidakhadiran'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KONFIRMASI HAPUS AJUAN */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                {itemToDelete.status?.toLowerCase().includes('menunggu')
                  ? 'Hapus Ajuan Menunggu Verifikasi?'
                  : 'Hapus Catatan Ketidakhadiran?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ajuan ketidakhadiran untuk <strong className="text-slate-800">{itemToDelete.nama}</strong> ({itemToDelete.jenis}) tanggal <span className="font-mono text-slate-700">{itemToDelete.tanggal_awal}</span> akan dibatalkan &amp; dihapus secara permanen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Status Ajuan:</span>
                <span className="font-bold px-2.5 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                  Menunggu Verifikasi
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Jenis:</span>
                <span className="font-bold text-rose-700">{itemToDelete.jenis}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium shrink-0">Alasan / Ket:</span>
                <span className="font-semibold text-slate-800 text-right line-clamp-2">{itemToDelete.keterangan}</span>
              </div>
              {itemToDelete.inval_guru && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Guru Pengganti:</span>
                  <span className="font-semibold text-slate-800">{itemToDelete.inval_guru}</span>
                </div>
              )}
              {itemToDelete.surat_bukti_url && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Berkas Bukti:</span>
                  <span className="font-mono text-purple-700 text-[11px] font-bold truncate max-w-[180px]">
                    {itemToDelete.surat_bukti_name || 'Tersedia di Folder Drive'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Ajuan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
