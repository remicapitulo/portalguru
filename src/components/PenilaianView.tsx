import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  ShieldCheck,
  Clock,
  Building2,
  Scale,
  Printer,
  RefreshCw,
  Code,
  Info,
  Check,
  Copy,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { User, SchoolConfig, SemesterType } from '../types';
import { dbService } from '../db/storage';
import {
  penilaianService,
  PENILAIAN_SPREADSHEET_ID,
  DEFAULT_PENILAIAN_APPS_SCRIPT_URL,
  GAS_SCRIPT_CODE,
} from '../db/penilaianService';
import { PenilaianRekanTab } from './penilaian/PenilaianRekanTab';
import { StatusPengisianTab } from './penilaian/StatusPengisianTab';
import { SupervisiTab } from './penilaian/SupervisiTab';
import { AbsensiTab } from './penilaian/AbsensiTab';
import { YayasanTab } from './penilaian/YayasanTab';
import { RaporDiktendikTab } from './penilaian/RaporDiktendikTab';
import { CetakRaporTab } from './penilaian/CetakRaporTab';

export type PenilaianTabType =
  | 'rekan'
  | 'status'
  | 'supervisi'
  | 'absensi'
  | 'yayasan'
  | 'rapor'
  | 'cetak';

interface PenilaianViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
}

export const PenilaianView: React.FC<PenilaianViewProps> = ({
  currentUser,
  config,
  allTeachers,
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

  const [activeTab, setActiveTab] = useState<PenilaianTabType>('rekan');
  const [academicYear, setAcademicYear] = useState<string>(config.academic_year || '2026/2027');
  const [semester, setSemester] = useState<SemesterType>(config.semester_active || 'Semester 1');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selected teacher when jumping to Cetak Rapor
  const [teacherForPrint, setTeacherForPrint] = useState<User | null>(null);

  // Google Apps Script Modal & Web API URL
  const activeGasUrl = config.penilaian_apps_script_url || DEFAULT_PENILAIAN_APPS_SCRIPT_URL;
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(activeGasUrl);
  const [scriptSaving, setScriptSaving] = useState(false);
  const [scriptSavedMsg, setScriptSavedMsg] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config.penilaian_apps_script_url) {
      setScriptUrlInput(config.penilaian_apps_script_url);
    } else {
      dbService.updateConfig({ penilaian_apps_script_url: DEFAULT_PENILAIAN_APPS_SCRIPT_URL });
    }
  }, [config.penilaian_apps_script_url]);

  // Initial background sync directly from Google Spreadsheet
  useEffect(() => {
    setSyncing(true);
    penilaianService
      .syncFromGAS(activeGasUrl)
      .then((res) => {
        setRefreshTrigger((prev) => prev + 1);
        if (res.success) {
          setSyncMessage(`✓ Berhasil memuat ${res.count} data murni dari database Google Spreadsheet.`);
          setTimeout(() => setSyncMessage(null), 4000);
        }
      })
      .catch((err) => {
        console.warn('Initial sync warning:', err);
      })
      .finally(() => {
        setSyncing(false);
      });
  }, [activeGasUrl]);

  const handleSyncRemote = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await penilaianService.syncFromGAS(activeGasUrl);
      setRefreshTrigger((prev) => prev + 1);
      if (res.success) {
        setSyncMessage(`✓ Berhasil memuat ${res.count} data terbaru dari database Google Spreadsheet.`);
      } else {
        setSyncMessage(`⚠ Sinkronisasi gagal: ${res.error || 'Periksa URL Web App Google Script Anda.'}`);
      }
    } catch (err: any) {
      setSyncMessage(`⚠ Error: ${err.message || 'Gagal menghubungi Google Apps Script.'}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const handleSaveScriptUrl = async () => {
    setScriptSaving(true);
    setScriptSavedMsg(null);
    try {
      const cleanUrl = scriptUrlInput.trim();
      dbService.updateConfig({
        penilaian_apps_script_url: cleanUrl || DEFAULT_PENILAIAN_APPS_SCRIPT_URL,
      });
      setScriptSavedMsg('✓ URL Web App Google Apps Script berhasil disimpan!');
      setTimeout(() => setScriptSavedMsg(null), 4000);
    } catch (e: any) {
      setScriptSavedMsg('Gagal menyimpan URL: ' + e.message);
    } finally {
      setScriptSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await penilaianService.testConnection(scriptUrlInput.trim() || activeGasUrl);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Gagal uji koneksi.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const [initializingSheets, setInitializingSheets] = useState(false);
  const [initSheetsResult, setInitSheetsResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleInitSheets = async () => {
    setInitializingSheets(true);
    setInitSheetsResult(null);
    try {
      const res = await penilaianService.initSheetsInGAS(scriptUrlInput.trim() || activeGasUrl);
      setInitSheetsResult(res);
    } catch (e: any) {
      setInitSheetsResult({ success: false, message: e.message || 'Gagal inisialisasi sheet.' });
    } finally {
      setInitializingSheets(false);
    }
  };

  const handleSelectTeacherForPrint = (teacher: User) => {
    setTeacherForPrint(teacher);
    setActiveTab('cetak');
  };

  // Access control route-guard:
  // - status pengisian Guru (hanya admin/kepala sekolah)
  // - Rapor Diktendik (hanya admin/kepala sekolah)
  useEffect(() => {
    if (!isAdmin && (activeTab === 'status' || activeTab === 'rapor')) {
      setActiveTab('rekan');
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* HEADER BANNER: PENILAIAN KINERJA */}
      <div className="no-print relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 border border-purple-900/40 text-white p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Sistem Penilaian Kinerja Diktendik
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 font-mono">
                Sheet: {PENILAIAN_SPREADSHEET_ID.substring(0, 10)}...
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                Tahun Ajaran {academicYear}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                Periode 1 Tahun Kalender Penuh
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Penilaian Kinerja</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Sistem evaluasi komprehensif Pendidik & Tenaga Kependidikan: Penilaian Antar Rekan, Supervisi KBM & Administrasi, Presensi & Kedisiplinan, Partisipasi Kegiatan Yayasan, dan Rapor Diktendik.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Web API GAS Aktif</span>
            </div>

            {isAdmin && (
              <button
                onClick={() => setScriptModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold backdrop-blur-xs border border-purple-400/40 transition flex items-center gap-2 cursor-pointer"
                title="Atur atau uji Google Apps Script Web App"
              >
                <Code className="w-3.5 h-3.5 text-purple-300" />
                <span>Kelola Web API GAS</span>
              </button>
            )}

            <button
              onClick={handleSyncRemote}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Sinkronkan data dengan Google Spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-purple-400' : 'text-purple-300'}`} />
              <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
            </button>
          </div>
        </div>

        {/* TABS SWITCHER (Role-based access) */}
        <div className="flex items-center gap-1.5 mt-6 pt-4 border-t border-white/10 overflow-x-auto pb-1 scrollbar-thin">
          {/* 1. Input Penilaian Rekan */}
          <button
            onClick={() => setActiveTab('rekan')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'rekan'
                ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>Input Penilaian Rekan</span>
          </button>

          {/* 2. Status Pengisian Guru (HANYA ADMIN/KEPALA SEKOLAH) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Status Pengisian Guru</span>
            </button>
          )}

          {/* 3. Supervisi */}
          <button
            onClick={() => setActiveTab('supervisi')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'supervisi'
                ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Supervisi</span>
            {!isAdmin && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-900/60 text-purple-200 border border-purple-400/30">
                Nilai Saya
              </span>
            )}
          </button>

          {/* 4. Absensi */}
          <button
            onClick={() => setActiveTab('absensi')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'absensi'
                ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Absensi</span>
            {!isAdmin && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-900/60 text-blue-200 border border-blue-400/30">
                Presensi Saya
              </span>
            )}
          </button>

          {/* 5. Kegiatan Yayasan */}
          <button
            onClick={() => setActiveTab('yayasan')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'yayasan'
                ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kegiatan Yayasan</span>
            {!isAdmin && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-400/30">
                Keaktifan Saya
              </span>
            )}
          </button>

          {/* 6. Rapor Diktendik (HANYA ADMIN/KEPALA SEKOLAH) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('rapor')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'rapor'
                  ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Rapor Diktendik</span>
            </button>
          )}

          {/* 7. Cetak Rapor Diktendik */}
          <button
            onClick={() => setActiveTab('cetak')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'cetak'
                ? 'bg-white text-purple-950 shadow-md ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>{isAdmin ? 'Cetak Rapor Diktendik' : 'Cetak Rapor Saya'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="no-print p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs font-semibold text-purple-950 flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 text-purple-700 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* TAB CONTENT RENDERING */}
      {activeTab === 'rekan' && (
        <PenilaianRekanTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          activeGasUrl={activeGasUrl}
          refreshTrigger={refreshTrigger}
          onDataUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'status' && (
        <StatusPengisianTab
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          refreshTrigger={refreshTrigger}
        />
      )}

      {activeTab === 'supervisi' && (
        <SupervisiTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          activeGasUrl={activeGasUrl}
          onDataUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'absensi' && (
        <AbsensiTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          activeGasUrl={activeGasUrl}
          onDataUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'yayasan' && (
        <YayasanTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          activeGasUrl={activeGasUrl}
          onDataUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'rapor' && (
        <RaporDiktendikTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          refreshTrigger={refreshTrigger}
          activeGasUrl={activeGasUrl}
          onSelectTeacherForPrint={handleSelectTeacherForPrint}
        />
      )}

      {activeTab === 'cetak' && (
        <CetakRaporTab
          currentUser={currentUser}
          config={config}
          allTeachers={allTeachers}
          academicYear={academicYear}
          semester={semester}
          isAdmin={isAdmin}
          refreshTrigger={refreshTrigger}
          initialSelectedTeacher={teacherForPrint}
        />
      )}

      {/* MODAL: KELOLA WEB API GAS */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                  Google Apps Script & Database Integrasi
                </span>
                <h3 className="text-lg font-black text-white">Kelola Web API Penilaian</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  ID Sheet: {PENILAIAN_SPREADSHEET_ID}
                </p>
              </div>
              <button
                onClick={() => setScriptModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  URL Aplikasi Web Google Apps Script
                </label>
                <input
                  type="url"
                  value={scriptUrlInput}
                  onChange={(e) => setScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-800 focus:border-purple-600 outline-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Menguji...' : 'Uji Koneksi (Test API)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveScriptUrl}
                    disabled={scriptSaving}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{scriptSaving ? 'Menyimpan...' : 'Simpan URL'}</span>
                  </button>
                </div>

                {scriptSavedMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{scriptSavedMsg}</span>
                  </div>
                )}

                {testResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Fitur & Dukungan 5 Sheet Database Otomatis */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 block text-xs">
                    ⚡ 5 Lembar Kerja (Sheets) Database Kinerja Diktendik:
                  </span>
                  <button
                    type="button"
                    onClick={handleInitSheets}
                    disabled={initializingSheets}
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Buat/cek seluruh 5 sheet langsung di spreadsheet via Web App"
                  >
                    <RefreshCw className={`w-3 h-3 ${initializingSheets ? 'animate-spin' : ''}`} />
                    <span>{initializingSheets ? 'Menyiapkan Sheet...' : 'Inisialisasi 5 Sheet'}</span>
                  </button>
                </div>

                <ul className="text-[11px] text-purple-900 space-y-1 list-disc list-inside">
                  <li><code className="bg-white px-1 py-0.5 rounded text-purple-800 font-mono font-bold">Penilaian_Antar_Rekan</code> : 8 Indikator sikap & keteladanan sejawat.</li>
                  <li><code className="bg-white px-1 py-0.5 rounded text-purple-800 font-mono font-bold">Supervisi</code> : Nilai 1a. KBM & 1b. Administrasi (Kepala/Waka Sekolah).</li>
                  <li><code className="bg-white px-1 py-0.5 rounded text-purple-800 font-mono font-bold">Absensi_Disiplin</code> : 2a Hadir, 2b Telat, 2c Pulang, 2d Doa, 2e Flyer.</li>
                  <li><code className="bg-white px-1 py-0.5 rounded text-purple-800 font-mono font-bold">Kegiatan_Yayasan</code> : Partisipasi 3a Milad, 3b Ta'lim, 3c Sosialisasi.</li>
                  <li><code className="bg-white px-1 py-0.5 rounded text-purple-800 font-mono font-bold">Rapor_Diktendik</code> : Rekapitulasi nilai akhir komprehensif, predikat, & catatan.</li>
                </ul>

                {initSheetsResult && (
                  <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                    initSheetsResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {initSheetsResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{initSheetsResult.message}</span>
                  </div>
                )}
              </div>

              {/* Action Links */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${PENILAIAN_SPREADSHEET_ID}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                  <span>Buka Spreadsheet Google</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyScriptCode}
                  className="px-4 py-2 rounded-xl border border-purple-300 bg-purple-700 hover:bg-purple-800 text-white font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto shadow-xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Kode Berhasil Disalin!' : 'Salin Seluruh Kode GAS Terbaru'}</span>
                </button>
              </div>

              {/* Pratinjau Kode Script */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Pratinjau Kode Google Apps Script (Siap Pakai):
                  </span>
                  <span className="text-[10px] text-purple-700 font-medium">
                    Ctrl+A lalu Ctrl+C untuk salin manual jika diperlukan
                  </span>
                </div>
                <textarea
                  readOnly
                  value={GAS_SCRIPT_CODE}
                  rows={8}
                  className="w-full p-3 rounded-xl bg-slate-900 text-purple-200 font-mono text-[10px] leading-relaxed border border-slate-700 focus:outline-none resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
