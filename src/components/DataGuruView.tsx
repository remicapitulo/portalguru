import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Trash2,
  Edit,
  FileCheck,
  RotateCcw,
  GraduationCap,
  Briefcase,
  Crown,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck
} from 'lucide-react';
import { User, SchoolConfig, AppDatabase, DocumentType } from '../types';
import { dbService } from '../db/storage';
import { spreadsheetService } from '../db/spreadsheetService';

interface DataGuruViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  db: AppDatabase;
  onOpenReportPrint?: () => void;
}

const DOC_TYPES: DocumentType[] = ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'];

export const isKepalaSekolah = (user: User, config?: SchoolConfig): boolean => {
  if (!user) return false;
  const nipLower = (user.nip || '').toLowerCase().trim();
  const namaLower = (user.nama || '').toLowerCase().trim();
  const roleLower = (user.role || '').toLowerCase().trim();
  const mapelLower = (user.mapel || '').toLowerCase().trim();

  // 1. Nilam Cahya, S.Pd is Wakil Kepala Sekolah / Tim Kurikulum (Tendik), strictly NOT Kepala Sekolah
  if (namaLower.includes('nilam') || nipLower === '03.18.10.49' || nipLower === '02.20.09.112') {
    return false;
  }

  // 2. Generic admin bot account is NOT Kepala Sekolah
  if (nipLower === 'admin' || namaLower.includes('administrator sekolah')) {
    return false;
  }

  // 3. Abu Haripin, M.Pd is the SOLE Kepala Sekolah of SMPIT Pondok Duta
  if (namaLower.includes('abu haripin') || nipLower === '03.13.01.13') {
    return true;
  }

  // 4. Role or mapel explicitly Kepala Sekolah (excluding Nilam)
  if (
    roleLower === 'kepala sekolah' ||
    roleLower === 'kepsek' ||
    roleLower === 'headmaster' ||
    mapelLower === 'kepala sekolah' ||
    mapelLower === 'kepsek'
  ) {
    return true;
  }

  // 5. Config headmaster matching (strictly not Nilam's NIP)
  if (config) {
    const headNip = (config.headmaster_nip || config.headmaster_nik || '').toLowerCase().trim();
    if (headNip && nipLower === headNip && headNip !== '03.18.10.49' && headNip !== '02.20.09.112') {
      return true;
    }
  }

  return false;
};

export const isTendikOrOB = (user: User): boolean => {
  if (!user) return false;
  const roleLower = (user.role || '').toLowerCase().trim();
  const mapelLower = (user.mapel || '').toLowerCase().trim();
  return (
    roleLower === 'tendik' ||
    roleLower === 'ob' ||
    roleLower.includes('tendik') ||
    roleLower.includes('tenaga kependidikan') ||
    roleLower.includes('tata usaha') ||
    roleLower.includes('office boy') ||
    roleLower.includes('kebersihan') ||
    roleLower.includes('security') ||
    roleLower.includes('satpam') ||
    mapelLower.includes('tendik') ||
    mapelLower.includes('tata usaha') ||
    mapelLower.includes('ob') ||
    mapelLower.includes('kebersihan')
  );
};

export const getUserGroup = (user: User, config?: SchoolConfig): 'GURU' | 'TENDIK' => {
  if (isKepalaSekolah(user, config) || isTendikOrOB(user)) {
    return 'TENDIK';
  }
  return 'GURU';
};

export const DataGuruView: React.FC<DataGuruViewProps> = ({
  currentUser,
  config,
  allTeachers,
  db,
  onOpenReportPrint,
}) => {
  const isAdmin = currentUser?.role?.toLowerCase() === 'administrator' || currentUser?.role?.toLowerCase() === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroupTab, setActiveGroupTab] = useState<'guru' | 'tendik' | 'semua'>('guru');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Form states aligned with Sheet "user": [Nama, NIP, Mapel, Role, Password]
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [mapel, setMapel] = useState('');
  const [role, setRole] = useState('Guru');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Confirmation modal states
  const [deleteConfirmTeacher, setDeleteConfirmTeacher] = useState<User | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  // Combine db.users and allTeachers, deduplicate strictly and filter out corrupt placeholders and pure technical bot accounts
  const validPersonnel = useMemo(() => {
    const list = (db.users && db.users.length > 0 ? db.users : allTeachers) || [];
    const seenNips = new Set<string>();
    const seenNames = new Set<string>();
    const unique: User[] = [];

    for (const t of list) {
      if (!t || !t.nama || !t.nip) continue;
      const cleanNip = t.nip.trim().toLowerCase();
      const cleanName = t.nama.trim().toLowerCase();
      if (cleanNip === 'admin' || cleanName === 'guru' || cleanName === '' || cleanName === 'administrator sekolah') {
        continue;
      }

      // Deduplicate so duplicate accounts (e.g., duplicate Abu Haripin entries) cannot occur
      if (seenNips.has(cleanNip) || seenNames.has(cleanName)) {
        continue;
      }
      seenNips.add(cleanNip);
      seenNames.add(cleanName);
      unique.push(t);
    }

    return unique.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [db.users, allTeachers]);

  // Split into 2 primary groups as requested:
  // 1. Kelompok Guru: guru yang tidak berstatus kepala sekolah
  // 2. Kelompok Tendik: Kepala sekolah, tendik dan Ob
  const guruList = useMemo(() => {
    return validPersonnel.filter((u) => getUserGroup(u, config) === 'GURU');
  }, [validPersonnel, config]);

  const tendikList = useMemo(() => {
    return validPersonnel.filter((u) => getUserGroup(u, config) === 'TENDIK');
  }, [validPersonnel, config]);

  // Determine personnel list to display based on active group tab
  const displayedByGroup = useMemo(() => {
    if (activeGroupTab === 'guru') return guruList;
    if (activeGroupTab === 'tendik') return tendikList;
    return validPersonnel;
  }, [activeGroupTab, guruList, tendikList, validPersonnel]);

  // Filter based on search term
  const filteredPersonnel = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return displayedByGroup;
    return displayedByGroup.filter((t) => {
      return (
        t.nama.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        (t.mapel && t.mapel.toLowerCase().includes(q)) ||
        (t.role && t.role.toLowerCase().includes(q))
      );
    });
  }, [displayedByGroup, searchTerm]);

  // Summary statistics for Kelompok Guru
  const guruStats = useMemo(() => {
    let totalSlotsFilled = 0;
    let completeTeachers = 0;
    guruList.forEach((g) => {
      const prog = dbService.calculateTeacherProgress(g.id || g.nip);
      totalSlotsFilled += prog.filledSlots;
      if (prog.percentage >= 100) completeTeachers++;
    });
    const avgPercentage = guruList.length > 0 ? Math.round((totalSlotsFilled / (guruList.length * 36)) * 100) : 0;
    return {
      total: guruList.length,
      completeCount: completeTeachers,
      avgPercentage,
      totalSlotsFilled,
    };
  }, [guruList]);

  // Summary statistics for Kelompok Tendik
  const tendikStats = useMemo(() => {
    let headmasterCount = 0;
    let tendikCount = 0;
    let obCount = 0;

    tendikList.forEach((u) => {
      if (isKepalaSekolah(u, config)) {
        headmasterCount++;
      } else {
        const r = (u.role || '').toLowerCase();
        const m = (u.mapel || '').toLowerCase();
        if (r.includes('ob') || r.includes('kebersihan') || m.includes('ob') || m.includes('kebersihan')) {
          obCount++;
        } else {
          tendikCount++;
        }
      }
    });

    return {
      total: tendikList.length,
      headmasterCount: Math.min(headmasterCount, 1), // Strictly 1 Kepala Sekolah
      tendikCount,
      obCount,
    };
  }, [tendikList, config]);

  const handleRestoreInitial = () => {
    setRestoreConfirmOpen(true);
  };

  const executeRestore = () => {
    dbService.restoreInitialTeachers();
    setRestoreConfirmOpen(false);
  };

  const handleOpenAdd = () => {
    setEditingTeacherId(null);
    setNip('');
    setNama('');
    setMapel('');
    setRole(activeGroupTab === 'tendik' ? 'Tendik' : 'Guru');
    setEmail('');
    setPassword('guru123');
    setModalOpen(true);
  };

  const handleOpenEdit = (teacher: User) => {
    setEditingTeacherId(teacher.id || teacher.nip);
    setNip(teacher.nip);
    setNama(teacher.nama);
    setMapel(teacher.mapel || '');
    setRole(teacher.role || (isKepalaSekolah(teacher, config) ? 'Kepala Sekolah' : 'Guru'));
    setEmail(teacher.email || '');
    setPassword(teacher.password || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim() || !nama.trim()) return;

    const userData = {
      nip: nip.trim(),
      nama: nama.trim(),
      mapel: mapel.trim(),
      role: role.trim() || 'Guru',
      email: email.trim() || undefined,
      password: password.trim() || 'guru123',
    };

    if (editingTeacherId) {
      dbService.updateTeacher(editingTeacherId, userData);
      spreadsheetService.updateUserInSpreadsheet(userData).catch((err) => {
        console.warn('Update user in sheet failed:', err);
      });
    } else {
      dbService.addTeacher(userData);
      spreadsheetService.addUserToSpreadsheet(userData).catch((err) => {
        console.warn('Add user in sheet failed:', err);
      });
    }

    setModalOpen(false);
  };

  const handleDelete = (t: User) => {
    setDeleteConfirmTeacher(t);
  };

  const executeDeleteTeacher = () => {
    if (!deleteConfirmTeacher) return;
    const t = deleteConfirmTeacher;
    dbService.deleteTeacher(t.id || t.nip);
    spreadsheetService.deleteUserFromSpreadsheet(t.nip).catch((err) => {
      console.warn('Delete user in sheet failed:', err);
    });
    setDeleteConfirmTeacher(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Users className="w-4 h-4" />
            <span>PORTAL DATA PENDIDIK & TENAGA KEPENDIDIKAN</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data Guru & Rekapitulasi Administrasi
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Sistem pengelompokan resmi terbagi menjadi <strong>Kelompok Guru</strong> (Pendidik non-Kepala Sekolah) dan <strong>Kelompok Tendik</strong> (Kepala Sekolah, Tendik & OB).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleRestoreInitial}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Pulihkan data nama guru sesuai database sheet"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Pulihkan Data Sheet</span>
              <span className="sm:hidden">Reset</span>
            </button>
          )}

          {onOpenReportPrint && (
            <button
              onClick={onOpenReportPrint}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Unduh Laporan PDF</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah {activeGroupTab === 'tendik' ? 'Tendik/OB' : 'Guru'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-GROUP SEGMENTED SWITCHER (Kelompok Guru & Kelompok Tendik) */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 border border-slate-200/90 shadow-2xs">
        {/* Tab 1: Kelompok Guru */}
        <button
          onClick={() => setActiveGroupTab('guru')}
          className={`flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeGroupTab === 'guru'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeGroupTab === 'guru' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">Kelompok Guru</span>
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Guru Non-Kepala Sekolah</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${activeGroupTab === 'guru' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
            {guruList.length} Orang
          </span>
        </button>

        {/* Tab 2: Kelompok Tendik */}
        <button
          onClick={() => setActiveGroupTab('tendik')}
          className={`flex-1 flex items-center justify-between sm:justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeGroupTab === 'tendik'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeGroupTab === 'tendik' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">Kelompok Tendik</span>
              <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Kepala Sekolah, Tendik & OB</span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${activeGroupTab === 'tendik' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
            {tendikList.length} Orang
          </span>
        </button>

        {/* Tab 3: Semua Personel */}
        <button
          onClick={() => setActiveGroupTab('semua')}
          className={`px-4 py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-between sm:justify-center gap-2 ${
            activeGroupTab === 'semua'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Semua Personel</span>
          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${activeGroupTab === 'semua' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
            {validPersonnel.length}
          </span>
        </button>
      </div>

      {/* STATS BANNER PER KELOMPOK */}
      {activeGroupTab === 'guru' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Kelompok Guru</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{guruStats.total} <span className="text-xs font-semibold text-slate-500">Guru</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Non-Kepala Sekolah</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Kelengkapan</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{guruStats.avgPercentage}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">36 Slot Dokumen Belajar</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guru Berkas Lengkap</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{guruStats.completeCount} <span className="text-xs font-semibold text-slate-500">Guru</span></p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tuntas 100% (36/36)</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Berkas Masuk</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{guruStats.totalSlotsFilled} <span className="text-xs font-semibold text-slate-500">File</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Modul, CP, ATP, KKTP, Prota, Promes</p>
          </div>
        </div>
      )}

      {activeGroupTab === 'tendik' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-purple-700 mb-1">
              <Crown className="w-3.5 h-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Kepala Sekolah</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{tendikStats.headmasterCount} <span className="text-xs font-semibold text-slate-500">Orang</span></p>
            <p className="text-[10px] text-purple-600 font-medium mt-0.5">{config.headmaster || 'Abu Haripin, M.Pd'}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-blue-700 mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Tenaga Kependidikan</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{tendikStats.tendikCount} <span className="text-xs font-semibold text-slate-500">Tendik</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tata Usaha & Administrasi</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Tenaga Pendukung / OB</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{tendikStats.obCount} <span className="text-xs font-semibold text-slate-500">Orang</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Office Boy & Kebersihan</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-indigo-700 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Total Personel Tendik</p>
            </div>
            <p className="text-2xl font-black text-indigo-700">{tendikStats.total} <span className="text-xs font-semibold text-slate-500">Personel</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Kepsek, Staf TU & OB</p>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Cari nama, NIK, atau posisi di ${activeGroupTab === 'guru' ? 'Kelompok Guru' : activeGroupTab === 'tendik' ? 'Kelompok Tendik' : 'Semua Data'}...`}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:border-indigo-600 outline-none transition"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <span>Menampilkan:</span>
          <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-800 font-extrabold">
            {filteredPersonnel.length} Personel
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. VIEW KELOMPOK GURU (DENGAN MATRIKS 36 DOKUMEN BELAJAR) */}
      {/* ======================================================== */}
      {activeGroupTab === 'guru' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Matriks Kelengkapan Dokumen Pembelajaran (Semester 1 & 2 • Kelas 7, 8, 9)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar khusus guru mata pelajaran yang wajib melengkapi 36 slot dokumen kurikulum
              </p>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 shrink-0">Maksimal 6 Berkas per Jenis</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5">Guru & NIK</th>
                  <th className="px-4 py-3.5">Mata Pelajaran</th>
                  {DOC_TYPES.map((dt) => (
                    <th key={dt} className="px-3 py-3.5 text-center">
                      {dt}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-center">Total Slot</th>
                  <th className="px-4 py-3.5 text-center">Kelengkapan</th>
                  {isAdmin && <th className="px-4 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Tidak ada data guru yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((teacher) => {
                    const prog = dbService.calculateTeacherProgress(teacher.id || teacher.nip);

                    return (
                      <tr key={teacher.id || teacher.nip} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {teacher.avatar || teacher.nama.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900">{teacher.nama}</p>
                              <p className="text-[11px] text-slate-400">NIK: {teacher.nip}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-700 font-semibold">
                          {teacher.mapel || '-'}
                        </td>

                        {DOC_TYPES.map((dt) => {
                          const count = prog.breakdown[dt] || 0;
                          const isComplete = count >= 6;
                          return (
                            <td key={dt} className="px-3 py-3.5 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                                  isComplete
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : count > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {count}/6
                              </span>
                            </td>
                          );
                        })}

                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                          {prog.filledSlots} / 36
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  prog.percentage >= 80
                                    ? 'bg-emerald-500'
                                    : prog.percentage >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${prog.percentage}%` }}
                              />
                            </div>
                            <span
                              className={`font-black text-xs ${
                                prog.percentage >= 80
                                  ? 'text-emerald-600'
                                  : prog.percentage >= 50
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {prog.percentage}%
                            </span>
                          </div>
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(teacher)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Data Guru"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(teacher)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus Guru"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada data guru yang sesuai pencarian.
              </div>
            ) : (
              filteredPersonnel.map((teacher) => {
                const prog = dbService.calculateTeacherProgress(teacher.id || teacher.nip);
                const isFull = prog.percentage >= 100;
                const isHalf = prog.percentage >= 50;

                return (
                  <div key={teacher.id || teacher.nip} className="p-4 space-y-3.5 hover:bg-slate-50/60 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {teacher.avatar || teacher.nama.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                            {teacher.nama}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {teacher.mapel || 'Guru Mata Pelajaran'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            NIK: {teacher.nip}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isFull
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isHalf
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isFull ? 'Lengkap' : isHalf ? 'Sebagian' : 'Belum'}
                        </span>
                        <span
                          className={`text-xs font-black mt-1 ${
                            isFull
                              ? 'text-emerald-600'
                              : isHalf
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {prog.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Kelengkapan Berkas:</span>
                        <span className="text-slate-800">
                          <strong className="text-indigo-700">{prog.filledSlots}</strong> / 36 Berkas
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFull
                              ? 'bg-emerald-500'
                              : isHalf
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${prog.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Rincian 6 Dokumen:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DOC_TYPES.map((dt) => {
                          const count = prog.breakdown[dt] || 0;
                          const complete = count >= 6;
                          return (
                            <div
                              key={dt}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                                complete
                                  ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
                                  : count > 0
                                  ? 'bg-amber-50/80 border-amber-200/80 text-amber-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <span className="text-[10px] font-bold tracking-tight">
                                {dt}
                              </span>
                              <span
                                className={`text-xs font-black mt-0.5 ${
                                  complete
                                    ? 'text-emerald-700'
                                    : count > 0
                                    ? 'text-amber-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                {count}/6
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(teacher)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW KELOMPOK TENDIK (KEPALA SEKOLAH, TENAGA KEPENDIDIKAN & OB)        */}
      {/* ========================================================================= */}
      {activeGroupTab === 'tendik' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Kelompok Tendik: Kepala Sekolah, Tenaga Kependidikan & OB</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pimpinan satuan pendidikan, staf tata usaha/administrasi sekolah, serta petugas penunjang & kebersihan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                Kepsek
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                Tendik
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                OB
              </span>
            </div>
          </div>

          {/* Desktop Table View for Tendik */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5">Personel & NIK</th>
                  <th className="px-4 py-3.5">Klasifikasi</th>
                  <th className="px-4 py-3.5">Tugas / Posisi Kerja</th>
                  <th className="px-4 py-3.5">Email / Kontak</th>
                  <th className="px-4 py-3.5 text-center">Status Administrasi</th>
                  {isAdmin && <th className="px-4 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data staf tendik yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((person) => {
                    const isKs = isKepalaSekolah(person, config);
                    const isOb = (person.role || '').toLowerCase().includes('ob') ||
                                 (person.role || '').toLowerCase().includes('kebersihan') ||
                                 (person.mapel || '').toLowerCase().includes('ob') ||
                                 (person.mapel || '').toLowerCase().includes('kebersihan');

                    // Check if headmaster/tendik also has uploaded teaching documents
                    const prog = dbService.calculateTeacherProgress(person.id || person.nip);

                    return (
                      <tr key={person.id || person.nip} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-2xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                              isKs
                                ? 'bg-gradient-to-tr from-purple-600 to-indigo-700'
                                : isOb
                                ? 'bg-gradient-to-tr from-emerald-500 to-teal-700'
                                : 'bg-gradient-to-tr from-blue-600 to-cyan-700'
                            }`}>
                              {isKs ? <Crown className="w-4 h-4 text-amber-300" /> : isOb ? <Sparkles className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{person.nama}</span>
                                {isKs && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[9.5px] font-black">
                                    Pimpinan
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">NIK: {person.nip}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {isKs ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                              <Crown className="w-3 h-3 text-purple-600" />
                              Kepala Sekolah
                            </span>
                          ) : isOb ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              OB / Kebersihan
                            </span>
                          ) : (person.nama.toLowerCase().includes('nilam cahya') || person.nip === '03.18.10.49') ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Briefcase className="w-3 h-3 text-indigo-600" />
                              Tendik / Kurikulum
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              <Briefcase className="w-3 h-3 text-blue-600" />
                              Tendik / TU
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-700 font-semibold">
                          {isKs ? (
                            <div>
                              <p className="text-slate-900">Kepala Satuan Pendidikan</p>
                              {person.mapel && person.mapel !== 'admin' && (
                                <p className="text-[10px] text-slate-400">Mapel: {person.mapel}</p>
                              )}
                            </div>
                          ) : (person.nama.toLowerCase().includes('nilam cahya') || person.nip === '03.18.10.49') ? (
                            <div>
                              <p className="text-slate-900">Wakil Kepala Sekolah • Tim Kurikulum</p>
                              {person.mapel && (
                                <p className="text-[10px] text-slate-400">Mapel: {person.mapel}</p>
                              )}
                            </div>
                          ) : (
                            person.mapel || person.role || 'Tenaga Kependidikan'
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                          {person.email || '-'}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {isKs ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              Penanggung Jawab Sekolah
                            </span>
                          ) : prog.filledSlots > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <FileCheck className="w-3.5 h-3.5" />
                              {prog.filledSlots}/36 Berkas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Aktif Terverifikasi
                            </span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(person)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Data Tendik/Personel"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(person)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus Data Personel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Tendik */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada data personel tendik yang sesuai pencarian.
              </div>
            ) : (
              filteredPersonnel.map((person) => {
                const isKs = isKepalaSekolah(person, config);
                const isOb = (person.role || '').toLowerCase().includes('ob') ||
                             (person.role || '').toLowerCase().includes('kebersihan') ||
                             (person.mapel || '').toLowerCase().includes('ob') ||
                             (person.mapel || '').toLowerCase().includes('kebersihan');

                return (
                  <div key={person.id || person.nip} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                          isKs
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-700'
                            : isOb
                            ? 'bg-gradient-to-tr from-emerald-500 to-teal-700'
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-700'
                        }`}>
                          {isKs ? <Crown className="w-5 h-5 text-amber-300" /> : isOb ? <Sparkles className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
                            {person.nama}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {isKs
                              ? 'Kepala Satuan Pendidikan'
                              : (person.nama.toLowerCase().includes('nilam cahya') || person.nip === '03.18.10.49')
                              ? 'Wakil Kepala Sekolah • Tim Kurikulum'
                              : person.mapel || person.role || 'Tenaga Kependidikan'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            NIK: {person.nip}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isKs ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            Kepsek
                          </span>
                        ) : isOb ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            OB
                          </span>
                        ) : (person.nama.toLowerCase().includes('nilam cahya') || person.nip === '03.18.10.49') ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Kurikulum
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                            Tendik
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Email / Kontak:</span>
                      <span className="font-mono text-slate-800">{person.email || 'Belum diisi'}</span>
                    </div>

                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(person)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(person)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW SEMUA PERSONEL (GURU & TENDIK BERSAMA DENGAN BADGE KELOMPOK)      */}
      {/* ========================================================================= */}
      {activeGroupTab === 'semua' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Daftar Seluruh Personel Sekolah (Guru & Tendik)</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              Total {validPersonnel.length} Personel
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5">Nama & NIK</th>
                  <th className="px-4 py-3.5">Kelompok</th>
                  <th className="px-4 py-3.5">Jabatan / Mapel</th>
                  <th className="px-4 py-3.5">Peran (Role)</th>
                  {isAdmin && <th className="px-4 py-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPersonnel.map((person) => {
                  const group = getUserGroup(person, config);
                  const isKs = isKepalaSekolah(person, config);

                  return (
                    <tr key={person.id || person.nip} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0 ${
                            group === 'TENDIK'
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                              : 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                          }`}>
                            {person.avatar || person.nama.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{person.nama}</p>
                            <p className="text-[11px] text-slate-400 font-mono">NIK: {person.nip}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {group === 'TENDIK' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Briefcase className="w-3 h-3" />
                            Kelompok Tendik {isKs ? '(Kepsek)' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <GraduationCap className="w-3 h-3" />
                            Kelompok Guru
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 font-semibold">
                        {person.mapel || (isKs ? 'Kepala Satuan Pendidikan' : '-')}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 font-semibold">
                        {person.role || 'Guru'}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(person)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(person)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT GURU & PERSONEL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingTeacherId ? 'Edit Data Personel' : 'Tambah Guru / Tendik Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar (Kolom A: Nama)
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Abu Haripin, M.Pd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIK / Username (Kolom B: NIK)
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 03.13.01.13"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran / Tugas Kerja (Kolom C: Mapel)
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  placeholder="Contoh: Bahasa Inggris / Staf Tata Usaha / Kebersihan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peran (Kolom D: Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none font-bold bg-white"
                  >
                    <option value="Guru">Guru (Pendidik)</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Tendik">Tendik (Tata Usaha)</option>
                    <option value="OB">OB (Office Boy / Kebersihan)</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password (Kolom E: Password)
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {/* Group indicator preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Otomatis masuk ke:</span>
                <span className={`font-black px-2 py-0.5 rounded-md ${
                  role === 'Kepala Sekolah' || role === 'Tendik' || role === 'OB'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {role === 'Kepala Sekolah' || role === 'Tendik' || role === 'OB'
                    ? 'Kelompok Tendik'
                    : 'Kelompok Guru'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow cursor-pointer"
                >
                  {editingTeacherId ? 'Simpan Perubahan' : 'Tambah Personel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TEACHER CONFIRMATION MODAL */}
      {deleteConfirmTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus Data Personel?
                </h3>
                <p className="text-xs text-slate-500">
                  NIK: {deleteConfirmTeacher.nip}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Nama:</p>
              <p className="text-xs font-bold text-slate-800">
                {deleteConfirmTeacher.nama} ({deleteConfirmTeacher.mapel || deleteConfirmTeacher.role || 'Personel'})
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Data personel ini akan dihapus dari portal dan sheet &ldquo;user&rdquo;. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeacher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeDeleteTeacher}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-600/20 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE INITIAL TEACHERS CONFIRMATION MODAL */}
      {restoreConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pulihkan Data Guru Asli?
                </h3>
                <p className="text-xs text-slate-500">
                  Sinkronisasi dengan sheet &ldquo;user&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengembalikan susunan data guru lengkap dan terurut alfabetis sesuai database sheet &ldquo;user&rdquo; dan membersihkan data kosong.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeRestore}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Pulihkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
