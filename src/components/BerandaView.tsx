import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  Search,
  ArrowRight,
  BookOpen,
  Compass,
  Lightbulb,
  FileCheck2,
  Users,
  Database,
  FileSpreadsheet,
  ClipboardList,
  FolderOpen,
  CalendarCheck,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, AcademicEvent, SchoolConfig, AppDatabase } from '../types';
import { NavItem } from './Sidebar';
import { dbService } from '../db/storage';

interface BerandaViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  events: AcademicEvent[];
  db: AppDatabase;
  onNavigate: (tab: NavItem) => void;
  onOpenUploadModal?: () => void;
}

export const BerandaView: React.FC<BerandaViewProps> = ({
  currentUser,
  config,
  events,
  db,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilterMode, setEventFilterMode] = useState<'h30' | 'all'>('h30');

  // Filter out administrator and obtain real teachers
  const teachers = useMemo(() => {
    return (db.users || [])
      .filter((u) => !u.role || (u.role.toLowerCase() !== 'administrator' && u.nip !== 'admin'))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [db.users]);

  const totalGuru = teachers.length;

  // Calculate actual progress for each teacher using the verified multi-slot matcher
  const { avgProgress, lengkapCount } = useMemo(() => {
    if (teachers.length === 0) return { avgProgress: 0, lengkapCount: 0 };
    const progressList = teachers.map((t) => dbService.calculateTeacherProgress(t.id));
    const avg = Math.round(
      progressList.reduce((acc, curr) => acc + curr.percentage, 0) / teachers.length
    );
    const lengkap = progressList.filter(
      (p) => p.percentage >= 100 || p.filledSlots >= 36
    ).length;
    return { avgProgress: avg, lengkapCount: lengkap };
  }, [teachers, db.uploadRecords]);

  const totalBerkas = db.uploadRecords ? db.uploadRecords.length : 0;

  // Calculate specific progress for the currently logged-in user
  const currentUserProgress = useMemo(() => {
    if (!currentUser?.nip && !currentUser?.id) return null;
    return dbService.calculateTeacherProgress(currentUser.nip || currentUser.id);
  }, [currentUser, db.uploadRecords]);

  // Dates & Event Filtering
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const h30Date = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 30);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [today]);

  // Upcoming events from today onwards
  const upcomingEvents = useMemo(() => {
    return (events || []).filter((evt) => {
      if (!evt.tanggal_awal_kegiatan) return false;
      const start = new Date(evt.tanggal_awal_kegiatan);
      let end = evt.tanggal_akhir_kegiatan ? new Date(evt.tanggal_akhir_kegiatan) : start;
      end.setHours(23, 59, 59, 999);
      return end >= today;
    });
  }, [events, today]);

  // Events within the next 30 days (H0 - H+30)
  const h30Events = useMemo(() => {
    return (events || []).filter((evt) => {
      if (!evt.tanggal_awal_kegiatan) return false;
      const start = new Date(evt.tanggal_awal_kegiatan);
      start.setHours(0, 0, 0, 0);

      let end = new Date(start);
      if (evt.tanggal_akhir_kegiatan) {
        const parsed = new Date(evt.tanggal_akhir_kegiatan);
        if (!isNaN(parsed.getTime())) end = parsed;
      }
      end.setHours(23, 59, 59, 999);

      return end >= today && start <= h30Date;
    });
  }, [events, today, h30Date]);

  const displayedEvents = eventFilterMode === 'all' ? (events || []) : h30Events;

  // Group events by Month Year
  const groupedEvents: Record<string, AcademicEvent[]> = {};
  displayedEvents.forEach((evt) => {
    const d = new Date(evt.tanggal_awal_kegiatan);
    const monthKey = !isNaN(d.getTime())
      ? d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : 'Lainnya';
    if (!groupedEvents[monthKey]) groupedEvents[monthKey] = [];
    groupedEvents[monthKey].push(evt);
  });

  // 12 Menu items definition
  const menuCatalog = [
    {
      title: 'Perangkat Pembelajaran',
      icon: <Compass className="w-6 h-6" />,
      desc: 'Silabus, Prota, Promes, KKTP, Modul Ajar (36 Kategori semester 1 & 2).',
      color: '#db2777',
      tab: 'perangkat' as NavItem,
    },
    {
      title: 'Kalender Pendidikan',
      icon: <BookOpen className="w-6 h-6" />,
      desc: 'Tampilan lengkap agenda sekolah, proposal kegiatan, dan timeline Kaldik.',
      color: '#0284c7',
      tab: 'kaldik' as NavItem,
    },
    {
      title: 'Suara Guru & Usulan',
      icon: <Lightbulb className="w-6 h-6" />,
      desc: 'Wadah aspirasi, pengajuan kebutuhan sarana/fasilitas, dan ide inovatif.',
      color: '#ea580c',
      tab: 'usulan' as NavItem,
    },
    {
      title: 'Jurnal Mengajar Harian',
      icon: <CalendarCheck className="w-6 h-6" />,
      desc: 'Catat agenda harian, materi ajar, presensi tatap muka, dan refleksi kelas.',
      color: '#0d9488',
      tab: 'jurnal' as NavItem,
    },
    {
      title: 'Data Guru & Rekap',
      icon: <Users className="w-6 h-6" />,
      desc: 'Daftar guru pengampu, rekapitulasi kelengkapan, dan cetak PDF laporan.',
      color: '#4f46e5',
      tab: 'data-guru' as NavItem,
    },
    {
      title: 'Database Spreadsheet',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      desc: 'Pusat integrasi Google Sheets, live sync data, dan pengaturan backend.',
      color: '#059669',
      tab: 'db-manager' as NavItem,
    },
    {
      title: 'Penilaian Antar Rekan',
      icon: <Award className="w-6 h-6" />,
      desc: 'Instrumen evaluasi dan penilaian kinerja objektif antar rekan sejawat.',
      color: '#7c3aed',
      externalUrl: 'https://forms.gle/oWbXrJX3VncVWLDe9',
    },
    {
      title: 'Update Eflyer Sosmed',
      icon: <FolderOpen className="w-6 h-6" />,
      desc: 'Laporan publikasi materi promosi, agenda dakwah, dan e-flyer sekolah.',
      color: '#9333ea',
      externalUrl: 'https://forms.gle/5SeuC8XTp6SzWoBo9',
    },
    {
      title: 'Absensi / Presensi Kelas',
      icon: <UserCheck className="w-6 h-6" />,
      desc: 'Pencatatan kehadiran harian siswa di kelas secara tertib dan akurat.',
      color: '#2563eb',
      tab: 'jurnal' as NavItem,
    },
    {
      title: 'Bank Soal & Kisi-kisi',
      icon: <FileText className="w-6 h-6" />,
      desc: 'Kumpulan arsip master soal ujian formatif/sumatif, kisi-kisi, & rubrik.',
      color: '#0891b2',
      tab: 'perangkat' as NavItem,
    },
    {
      title: 'Daftar Nilai Siswa',
      icon: <ClipboardList className="w-6 h-6" />,
      desc: 'Lembar entri nilai tugas harian, PTS, PAS, dan kalkulasi nilai akhir.',
      color: '#d97706',
      tab: 'perangkat' as NavItem,
    },
    {
      title: 'Arsip & Administrasi Surat',
      icon: <Layers className="w-6 h-6" />,
      desc: 'Penyimpanan berkas SK pembagian tugas, sertifikat, & administrasi resmi.',
      color: '#64748b',
      tab: 'perangkat' as NavItem,
    },
  ];

  const isAdmin = Boolean(
    currentUser?.role &&
    (currentUser.role.toLowerCase() === 'admin' ||
     currentUser.role.toLowerCase() === 'administrator' ||
     currentUser.role.toLowerCase().includes('admin'))
  );

  // Filter: Hide Data Guru & Rekap and Database Spreadsheet from Role: Guru
  const accessibleMenus = menuCatalog.filter((m) => {
    if (m.tab === 'data-guru' || m.tab === 'db-manager') {
      return isAdmin;
    }
    return true;
  });

  const filteredMenus = accessibleMenus.filter(
    (m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-r from-blue-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-7 lg:p-9 shadow-xl border border-blue-800/40">
        {/* Ambient background accents */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
          {/* Main Greeting & Identity Details */}
          <div className="max-w-2xl space-y-3.5 sm:space-y-4 min-w-0 flex-1">
            {/* Header badges: Portal Tag & Academic Year */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-sky-200 border border-blue-400/30 text-[11px] sm:text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Portal Administrasi Guru</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15 text-[11px] sm:text-xs font-medium">
                <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>TA {config.academic_year}</span>
              </span>
            </div>

            {/* Respectful Greeting & Prominent Teacher Name */}
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-wider text-sky-300/90 uppercase mb-1">
                Selamat Datang,
              </p>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight text-balance">
                {currentUser ? currentUser.nama : 'Bapak/Ibu Pendidik'}
              </h1>
            </div>

            {/* Profile Identity Badges: Role, Mapel, NIK */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {currentUser?.role && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] sm:text-xs text-slate-200 font-semibold backdrop-blur-xs">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{currentUser.role}</span>
                </span>
              )}
              {currentUser?.mapel && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] sm:text-xs text-slate-200 font-semibold backdrop-blur-xs">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Mapel: <strong className="text-white font-bold">{currentUser.mapel}</strong></span>
                </span>
              )}
              {currentUser?.nip && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] sm:text-xs text-slate-300 font-mono backdrop-blur-xs">
                  <span className="text-slate-400 font-sans">NIK:</span>
                  <span className="text-slate-200 font-bold">{currentUser.nip}</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal max-w-xl">
              Pusat kendali mandiri berkas perangkat kurikulum merdeka, jurnal KBM harian, dan agenda sekolah secara teratur, tertib, dan transparan.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={() => onNavigate('perangkat')}
                className="px-5 py-2.5 rounded-xl bg-white text-blue-950 hover:bg-sky-50 font-bold text-xs lg:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
              >
                <FileCheck2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Kelola Perangkat Pembelajaran</span>
              </button>

              <a
                href="#panel-menu-section"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs lg:text-sm backdrop-blur-xs border border-white/20 transition-all flex items-center justify-center gap-2 text-center active:scale-95 min-h-[44px]"
              >
                <Layers className="w-4 h-4 text-sky-300 shrink-0" />
                <span>Buka Panel Menu</span>
              </a>
            </div>
          </div>

          {/* Right Column: Teacher Identity Card (Desktop & Large Screens) */}
          {currentUser && (
            <div className="hidden lg:flex flex-col w-72 shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4.5 shadow-lg text-white space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-white/15">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md ring-2 ring-white/30 shrink-0">
                  {currentUser.avatar || currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300 block">
                    Status Pendidik
                  </span>
                  <h3 className="text-xs font-bold text-white truncate" title={currentUser.nama}>
                    {currentUser.nama}
                  </h3>
                  <span className="text-[11px] text-slate-300 truncate block">
                    {currentUser.role} {currentUser.mapel ? `• ${currentUser.mapel}` : ''}
                  </span>
                </div>
              </div>

              {/* Progress Summary if teacher progress exists */}
              {currentUserProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 text-[11px]">Kelengkapan Berkas</span>
                    <span className="font-bold text-sky-300">{currentUserProgress.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(currentUserProgress.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>{currentUserProgress.filledSlots} / 36 Terisi</span>
                    <span className="font-semibold text-emerald-300">
                      {currentUserProgress.percentage >= 100 ? '✓ Lengkap' : 'Dalam Proses'}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
                <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Pendidik Aktif
                </span>
                <span className="font-mono text-slate-300">NIK: {currentUser.nip}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* QUICK METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Total Guru */}
        <div
          onClick={() => onNavigate(isAdmin ? 'data-guru' : 'perangkat')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center gap-2.5 sm:gap-4 group min-w-0"
          title={isAdmin ? "Klik untuk membuka daftar lengkap Data Guru" : "Kelola Perangkat Pembelajaran"}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center font-bold transition shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs text-slate-500 block font-medium truncate">Total Guru</span>
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalGuru}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">Guru</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-semibold block truncate mt-0.5">
              <span className="sm:hidden">Pendidik Aktif</span>
              <span className="hidden sm:inline">{db.users ? db.users.length : totalGuru} Akun • Pendidik Aktif</span>
            </span>
          </div>
        </div>

        {/* 2. Guru Lengkap (100% 36 slot) */}
        <div
          onClick={() => onNavigate(isAdmin ? 'data-guru' : 'perangkat')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer flex items-center gap-2.5 sm:gap-4 group min-w-0"
          title={isAdmin ? "Klik untuk melihat rekapitulasi kelengkapan berkas guru" : "Kelola Perangkat Pembelajaran"}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold transition shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs text-slate-500 block font-medium truncate">Guru Lengkap</span>
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">{lengkapCount}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">/ {totalGuru} Guru</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-emerald-700 font-semibold block truncate mt-0.5">
              <span className="sm:hidden">{totalGuru > 0 ? Math.round((lengkapCount / totalGuru) * 100) : 0}% Lengkap</span>
              <span className="hidden sm:inline">{totalGuru > 0 ? Math.round((lengkapCount / totalGuru) * 100) : 0}% Penuhi 36 Slot</span>
            </span>
          </div>
        </div>

        {/* 3. Rata-rata Kelengkapan */}
        <div
          onClick={() => onNavigate('perangkat')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition cursor-pointer flex items-center gap-2.5 sm:gap-4 group min-w-0"
          title="Klik untuk mengelola Perangkat Pembelajaran"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center font-bold transition shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs text-slate-500 block font-medium truncate">Rata Kelengkapan</span>
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-purple-600">{avgProgress}%</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-purple-700 font-semibold block truncate mt-0.5">
              <span className="sm:hidden">{totalBerkas} Berkas Masuk</span>
              <span className="hidden sm:inline">{totalBerkas} Berkas Terverifikasi</span>
            </span>
          </div>
        </div>

        {/* 4. Kegiatan Terjadwal */}
        <div
          onClick={() => onNavigate('kaldik')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 hover:shadow-md transition cursor-pointer flex items-center gap-2.5 sm:gap-4 group min-w-0"
          title="Klik untuk membuka Kalender Pendidikan (Kaldik)"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-50 group-hover:bg-sky-100 text-sky-600 flex items-center justify-center font-bold transition shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs text-slate-500 block font-medium truncate">Kegiatan Kaldik</span>
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-sky-700">{upcomingEvents.length}</span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">Agenda</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-sky-700 font-semibold block truncate mt-0.5">
              <span className="sm:hidden">{h30Events.length} dlm 30 Hari</span>
              <span className="hidden sm:inline">{h30Events.length} dlm 30 Hari • Total {events.length} Kaldik</span>
            </span>
          </div>
        </div>
      </div>

      {/* INFORMASI TERKINI (H0 s.d H+30) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 sm:pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg lg:text-xl font-black text-blue-950 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" />
              <span>INFORMASI TERKINI & AGENDA KEGIATAN</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Kalender kegiatan sekolah terpantau otomatis secara real-time
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setEventFilterMode('h30')}
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                eventFilterMode === 'h30'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>30 Hari ke Depan</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  eventFilterMode === 'h30' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {h30Events.length}
              </span>
            </button>
            <button
              onClick={() => setEventFilterMode('all')}
              className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                eventFilterMode === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua Agenda</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  eventFilterMode === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {events.length}
              </span>
            </button>
          </div>
        </div>

        {/* Event List by Month */}
        <div className="mt-6 space-y-7">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada agenda untuk periode ini.</p>
              <p className="text-xs text-slate-500 mt-0.5">Semua kegiatan dapat dilihat di menu Kalender Pendidikan.</p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([monthName, list]) => (
              <div key={monthName} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{monthName}</span>
                  <div className="flex-1 h-px bg-slate-200 ml-2" />
                </div>

                <div className="space-y-2.5">
                  {list.map((item) => {
                    const start = new Date(item.tanggal_awal_kegiatan);
                    const dayNum = !isNaN(start.getTime()) ? start.getDate() : 1;
                    const dayName = !isNaN(start.getTime())
                      ? start.toLocaleDateString('id-ID', { weekday: 'short' })
                      : '';

                    let end = new Date(start);
                    if (item.tanggal_akhir_kegiatan) {
                      const pEnd = new Date(item.tanggal_akhir_kegiatan);
                      if (!isNaN(pEnd.getTime())) end = pEnd;
                    }
                    end.setHours(23, 59, 59, 999);

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Belum Dilaksanakan
                      </span>
                    );

                    if (today > end) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Sudah Dilaksanakan
                        </span>
                      );
                    } else if (today >= start && today <= end) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                          <Sparkles className="w-3 h-3" /> Sedang Berlangsung
                        </span>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50/70 transition shadow-xs gap-3 group"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Date Block */}
                          <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 transition">
                            <span className="text-base font-black text-slate-900 group-hover:text-blue-700 leading-none">
                              {String(dayNum).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                              {dayName}
                            </span>
                          </div>

                          {/* Event info */}
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition">
                              {item.nama_kegiatan}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                              {statusBadge}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                {item.tanggal_awal_kegiatan}
                                {item.tanggal_akhir_kegiatan && item.tanggal_akhir_kegiatan !== item.tanggal_awal_kegiatan
                                  ? ` s.d ${item.tanggal_akhir_kegiatan}`
                                  : ''}
                              </span>
                              {item.penanggung_jawab && (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  PJ: {item.penanggung_jawab}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Proposal Link */}
                        {item.proposal && (
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <a
                              href={item.proposal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-500" />
                              <span>Lihat File</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* PANEL MENU ADMINISTRASI (GRID) */}
      <section id="panel-menu-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Panel Menu Administrasi</h2>
              <p className="text-xs text-slate-500">Layanan administrasi, dokumen kurikulum, dan agenda sekolah</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari layanan administrasi..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenus.map((item, idx) => {
            const isExternal = !!item.externalUrl;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (item.tab) onNavigate(item.tab);
                  else if (item.externalUrl) window.open(item.externalUrl, '_blank');
                }}
                className="cursor-pointer group bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                style={{ borderTopWidth: '4px', borderTopColor: item.color }}
              >
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 transition">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div
                  className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold transition"
                  style={{ color: item.color }}
                >
                  <span>{isExternal ? 'Buka Tautan Luar' : 'Buka Halaman'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
