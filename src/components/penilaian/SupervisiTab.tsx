import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Save, User, Lock, Award, BookOpenCheck, RefreshCw } from 'lucide-react';
import { User as UserType, SchoolConfig, SemesterType } from '../../types';
import { penilaianService } from '../../db/penilaianService';
import { dbService } from '../../db/storage';

interface SupervisiTabProps {
  currentUser: UserType | null;
  config: SchoolConfig;
  allTeachers: UserType[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  activeGasUrl: string;
  onDataUpdated: () => void;
}

export const SupervisiTab: React.FC<SupervisiTabProps> = ({
  currentUser,
  config,
  allTeachers,
  academicYear,
  semester,
  isAdmin,
  activeGasUrl,
  onDataUpdated,
}) => {
  // Access control: Guru hanya bisa melihat dirinya sendiri.
  // Input oleh admin / kepala sekolah / wakil kepala sekolah.
  const isTeacher = currentUser?.role?.toLowerCase() === 'guru';
  const canEdit = !isTeacher && Boolean(
    isAdmin ||
    (currentUser && (
      (config.vice_headmaster_nip && currentUser.nip === config.vice_headmaster_nip) ||
      (config.vice_headmaster && currentUser.nama?.toLowerCase().includes(config.vice_headmaster.toLowerCase())) ||
      currentUser.role?.toLowerCase().includes('wakil') ||
      currentUser.role?.toLowerCase().includes('kurikulum')
    ))
  );

  const evaluatedTeachers = allTeachers.filter(
    (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2 && !penilaianService.isHeadmaster(t, config)
  );

  // Guru hanya bisa melihat dirinya sendiri jika bukan admin/penilai
  const displayedTeachers = canEdit
    ? evaluatedTeachers
    : evaluatedTeachers.filter((t) => currentUser && t.nip === currentUser.nip);

  const [selectedNip, setSelectedNip] = useState<string>(() => {
    if (!canEdit && currentUser) return currentUser.nip;
    return evaluatedTeachers[0]?.nip || '';
  });

  const selectedTeacher = evaluatedTeachers.find((t) => t.nip === selectedNip) || null;

  const currentRecord = selectedNip
    ? penilaianService.getSupervisi(selectedNip, academicYear, semester)
    : undefined;

  // Persentase kelengkapan upload perangkat guru otomatis (100% -> 100, 80% -> 80)
  const teacherProgress = selectedNip ? dbService.calculateTeacherProgress(selectedNip) : null;
  const autoAdministrasiScore = teacherProgress ? teacherProgress.percentage : 0;

  const [kbm, setKbm] = useState<number>(currentRecord?.kbm || 0);
  const [administrasi, setAdministrasi] = useState<number>(autoAdministrasiScore);
  const [catatan, setCatatan] = useState<string>(currentRecord?.catatan || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSelectTeacher = (nip: string) => {
    setSelectedNip(nip);
    setFeedback(null);
    const rec = penilaianService.getSupervisi(nip, academicYear, semester);
    const prog = dbService.calculateTeacherProgress(nip);
    const autoScore = prog ? prog.percentage : 0;
    setKbm(rec?.kbm || 0);
    // Terkunci otomatis dari persentase upload perangkat guru
    setAdministrasi(autoScore);
    setCatatan(rec?.catatan || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedback({ type: 'error', text: 'Hanya Kepala Sekolah, Wakil Kepala Sekolah, atau Admin yang dapat menginput nilai supervisi.' });
      return;
    }
    if (!selectedTeacher) {
      setFeedback({ type: 'error', text: 'Pilih guru terlebih dahulu.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await penilaianService.saveSupervisi(
        {
          target_nip: selectedTeacher.nip,
          target_nama: selectedTeacher.nama,
          tahun_ajaran: academicYear,
          semester,
          kbm: Number(kbm) || 0,
          administrasi: autoAdministrasiScore,
          catatan: catatan.trim(),
          updated_by: currentUser?.nama || 'Admin',
        },
        activeGasUrl
      );
      setFeedback({
        type: 'success',
        text: `✓ Nilai Supervisi untuk ${selectedTeacher.nama} berhasil disimpan!`
      });
      onDataUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan nilai supervisi.' });
    } finally {
      setSaving(false);
    }
  };

  const allSupervisi = penilaianService.getAllSupervisi(academicYear, semester);

  // Data supervisi milik user sendiri (untuk tampilan Guru)
  const myRecord = currentUser
    ? penilaianService.getSupervisi(currentUser.nip, academicYear, semester)
    : undefined;

  const myProgress = currentUser ? dbService.calculateTeacherProgress(currentUser.nip) : null;
  const myEffectiveAdmin = (myRecord && myRecord.administrasi > 0)
    ? myRecord.administrasi
    : (myProgress ? myProgress.percentage : 0);

  const myAvg = (myRecord && myRecord.kbm > 0) || myEffectiveAdmin > 0
    ? Math.round((((myRecord?.kbm || 0) + myEffectiveAdmin) / 2) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        canEdit
          ? 'bg-purple-50/70 border-purple-200 text-purple-900'
          : 'bg-slate-100 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {canEdit ? (
            <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-purple-700 shrink-0" />
          )}
          <div>
            <strong className="block font-bold">
              {canEdit ? 'Akses Pengelolaan Supervisi (Admin & Tim Pimpinan)' : 'Mode Guru: Hasil Supervisi Anda'}
            </strong>
            <span>
              {canEdit
                ? 'Kelola dan input nilai aspek KBM serta kelengkapan administrasi guru.'
                : 'Bapak/Ibu Guru hanya dapat melihat laporan hasil supervisi diri sendiri. Input dan penilaian resmi dilakukan oleh Kepala Sekolah & Tim Kurikulum.'}
            </span>
          </div>
        </div>

        {!canEdit && currentUser && (
          <div className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs shrink-0">
            {currentUser.nama}
          </div>
        )}
      </div>

      {/* TAMPILAN KHUSUS GURU (HANYA MELIHAT DIRINYA SENDIRI) */}
      {!canEdit ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase block">1a. Nilai KBM</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-700">{myRecord?.kbm || '-'}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">Kinerja mengajar di kelas, apersepsi, & interaksi siswa.</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase block">1b. Kelengkapan Administrasi</span>
                {myProgress && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    {myProgress.percentage}% Perangkat
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-700">{myEffectiveAdmin > 0 ? myEffectiveAdmin : '-'}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {myRecord && myRecord.administrasi > 0 ? (
                  <span>Modul Ajar, CP, ATP, Prota, Promes, & Jurnal Mengajar.</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    Otomatis dari kelengkapan upload perangkat: {myProgress?.filledSlots || 0} dari {myProgress?.totalSlots || 36} kategori ({myProgress?.percentage || 0}%).
                  </span>
                )}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white p-5 rounded-3xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-purple-300 uppercase block">Rata-rata Supervisi</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{myAvg > 0 ? myAvg : '-'}</span>
                <span className="text-xs text-purple-300 font-bold">
                  {myAvg >= 91 ? 'Amat Baik' : myAvg >= 81 ? 'Baik' : myAvg > 0 ? 'Cukup' : 'Belum Dinilai'}
                </span>
              </div>
              <p className="text-[11px] text-purple-200">Kombinasi skor KBM dan kelengkapan administrasi.</p>
            </div>
          </div>

          {/* Catatan Supervisor untuk Guru */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-purple-600" />
              <span>Catatan & Rekomendasi Supervisi dari Pimpinan:</span>
            </h4>
            <p className="text-xs text-slate-700 italic bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              "{myRecord?.catatan || 'Belum ada catatan tertulis dari Kepala Sekolah / Tim Kurikulum.'}"
            </p>
          </div>
        </div>
      ) : (
        /* TAMPILAN ADMIN / KEPSEK / WAKIL KEPSEK (BISA INPUT & KELOLA SELURUH GURU) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Form */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Form Nilai Supervisi</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Guru / Diktendik
              </label>
              <select
                value={selectedNip}
                onChange={(e) => handleSelectTeacher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-purple-600 outline-none"
              >
                {evaluatedTeachers.map((t) => (
                  <option key={t.nip} value={t.nip}>
                    {t.nama} ({t.mapel || 'Guru'})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    1a. KBM (Kegiatan Belajar Mengajar)
                  </label>
                  <span className="text-xs font-black text-purple-700">{kbm} / 100</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={kbm || ''}
                  onChange={(e) => setKbm(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-purple-600 outline-none"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span>1b. Administrasi Guru</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Perangkat: {autoAdministrasiScore}%
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-600" />
                      Terkunci Otomatis
                    </span>
                  </label>
                  <span className="text-xs font-black text-purple-700">{autoAdministrasiScore} / 100</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    readOnly
                    disabled
                    value={autoAdministrasiScore}
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 bg-slate-100/90 text-xs font-bold text-slate-700 cursor-not-allowed select-none focus:outline-none"
                    title="Nilai administrasi terkunci karena otomatis dihitung dari kelengkapan upload perangkat guru."
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                  <span>
                    Upload Perangkat: <strong className="text-slate-800 font-bold">{teacherProgress?.filledSlots || 0}</strong> dari {teacherProgress?.totalSlots || 36} kategori
                  </span>
                  <span className="font-bold text-emerald-700">
                    {autoAdministrasiScore}% → Skor {autoAdministrasiScore} (Otomatis)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Supervisi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tuliskan catatan tindak lanjut..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-purple-600 outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900">Rata-rata Supervisi:</span>
                <span className="text-sm font-black text-purple-800">
                  {kbm > 0 || administrasi > 0 ? Math.round(((kbm + administrasi) / 2) * 10) / 10 : 0}
                </span>
              </div>

              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Nilai Supervisi'}</span>
              </button>
            </form>
          </div>

          {/* Right: Rekapitulasi Tabel Supervisi Seluruh Guru */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Rekap Hasil Supervisi Guru ({academicYear})
                </h3>
                <p className="text-xs text-slate-500">
                  Total {evaluatedTeachers.length} Guru • Data murni tersimpan di sistem
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-2 text-center">1a. KBM</th>
                    <th className="py-2.5 px-2 text-center">1b. Administrasi</th>
                    <th className="py-2.5 px-2 text-center bg-purple-100/50 text-purple-900 font-black">Rata-rata</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluatedTeachers.map((t, idx) => {
                    const rec = allSupervisi.find((s) => s.target_nip === t.nip);
                    const tProg = dbService.calculateTeacherProgress(t.nip);
                    const autoScore = tProg ? tProg.percentage : 0;
                    const effectiveAdmin = (rec && rec.administrasi > 0)
                      ? rec.administrasi
                      : autoScore;
                    const kbmVal = rec?.kbm || 0;
                    const avg = (kbmVal > 0 || effectiveAdmin > 0)
                      ? Math.round(((kbmVal + effectiveAdmin) / 2) * 10) / 10
                      : 0;

                    return (
                      <tr
                        key={t.nip}
                        className={`hover:bg-purple-50/20 transition ${selectedNip === t.nip ? 'bg-purple-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{t.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.nip} • {t.mapel || 'Guru'}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                          {rec?.kbm ?? '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                          {rec && rec.administrasi > 0 ? (
                            <span>{rec.administrasi}</span>
                          ) : (
                            <span
                              className="text-emerald-700 font-bold inline-flex items-center gap-0.5"
                              title={`Otomatis dari Kelengkapan Upload Perangkat: ${tProg.percentage}% (${tProg.filledSlots}/${tProg.totalSlots} kategori)`}
                            >
                              {effectiveAdmin > 0 ? effectiveAdmin : 0}
                              <span className="text-[9px] text-emerald-600 font-sans font-normal">(auto)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-purple-700 bg-purple-50/30">
                          {avg > 0 ? avg : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[150px]" title={rec?.catatan || ''}>
                          {rec?.catatan || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleSelectTeacher(t.nip)}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
