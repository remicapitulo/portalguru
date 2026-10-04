import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertCircle, Save, Lock, ShieldCheck } from 'lucide-react';
import { User, SchoolConfig, SemesterType } from '../../types';
import { penilaianService, AbsensiRecord } from '../../db/penilaianService';

interface AbsensiTabProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  activeGasUrl: string;
  onDataUpdated: () => void;
}

export const AbsensiTab: React.FC<AbsensiTabProps> = ({
  currentUser,
  config,
  allTeachers,
  academicYear,
  semester,
  isAdmin,
  activeGasUrl,
  onDataUpdated,
}) => {
  const isTeacher = currentUser?.role?.toLowerCase() === 'guru';
  const canEdit = isAdmin && !isTeacher;

  const evaluatedTeachers = allTeachers.filter(
    (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2 && !penilaianService.isHeadmaster(t, config)
  );

  const [selectedNip, setSelectedNip] = useState<string>(() => {
    if (!canEdit && currentUser) return currentUser.nip;
    return evaluatedTeachers[0]?.nip || '';
  });

  const selectedTeacher = evaluatedTeachers.find((t) => t.nip === selectedNip) || null;

  const currentRecord = selectedNip
    ? penilaianService.getAbsensi(selectedNip, academicYear, semester)
    : undefined;

  const [kehadiran, setKehadiran] = useState<number>(currentRecord?.kehadiran || 0);
  const [keterlambatan, setKeterlambatan] = useState<number>(currentRecord?.keterlambatan || 0);
  const [kepulangan, setKepulangan] = useState<number>(currentRecord?.kepulangan || 0);
  const [doaBersama, setDoaBersama] = useState<number>(currentRecord?.doa_bersama || 0);
  const [shareEflyer, setShareEflyer] = useState<number>(currentRecord?.share_eflayer || 0);
  const [catatan, setCatatan] = useState<string>(currentRecord?.catatan || '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSelectTeacher = (nip: string) => {
    setSelectedNip(nip);
    const rec = penilaianService.getAbsensi(nip, academicYear, semester);
    setKehadiran(rec?.kehadiran || 0);
    setKeterlambatan(rec?.keterlambatan || 0);
    setKepulangan(rec?.kepulangan || 0);
    setDoaBersama(rec?.doa_bersama || 0);
    setShareEflyer(rec?.share_eflayer || 0);
    setCatatan(rec?.catatan || '');
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedback({ type: 'error', text: 'Hanya Admin atau Kepala Sekolah yang dapat menyimpan nilai absensi.' });
      return;
    }
    if (!selectedTeacher) {
      setFeedback({ type: 'error', text: 'Pilih guru terlebih dahulu.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const record: AbsensiRecord = {
        target_nip: selectedTeacher.nip,
        target_nama: selectedTeacher.nama,
        tahun_ajaran: academicYear,
        semester,
        kehadiran: Number(kehadiran) || 0,
        keterlambatan: Number(keterlambatan) || 0,
        kepulangan: Number(kepulangan) || 0,
        doa_bersama: Number(doaBersama) || 0,
        share_eflayer: Number(shareEflyer) || 0,
        catatan: catatan.trim(),
        updated_by: currentUser?.nama || 'Admin',
      };

      await penilaianService.saveAbsensi(record, activeGasUrl);
      setFeedback({
        type: 'success',
        text: `✓ Nilai Absensi untuk ${selectedTeacher.nama} berhasil disimpan!`
      });
      onDataUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan nilai absensi.' });
    } finally {
      setSaving(false);
    }
  };

  const allAbsensi = penilaianService.getAllAbsensi(academicYear, semester);

  const avgCurrent = [kehadiran, keterlambatan, kepulangan, doaBersama, shareEflyer].some((v) => v > 0)
    ? Math.round(
        (([kehadiran, keterlambatan, kepulangan, doaBersama, shareEflyer].reduce((a, b) => a + b, 0)) / 5) * 10
      ) / 10
    : 0;

  // Data milik guru yang sedang login (untuk tampilan Guru saja)
  const myRecord = currentUser
    ? penilaianService.getAbsensi(currentUser.nip, academicYear, semester)
    : undefined;

  const myScores = myRecord ? [myRecord.kehadiran, myRecord.keterlambatan, myRecord.kepulangan, myRecord.doa_bersama, myRecord.share_eflayer] : [];
  const myAvg = myScores.some((v) => v > 0)
    ? Math.round((myScores.reduce((a, b) => a + b, 0) / 5) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        canEdit
          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
          : 'bg-slate-100 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {canEdit ? (
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-blue-700 shrink-0" />
          )}
          <div>
            <strong className="block font-bold">
              {canEdit ? 'Akses Input Absensi Aktif (Admin / Kepala Sekolah)' : 'Mode Guru: Hasil Presensi & Kedisiplinan Anda'}
            </strong>
            <span>
              {canEdit
                ? 'Input nilai 5 sub kriteria absensi: Kehadiran, Keterlambatan, Kepulangan, Doa Bersama, dan Share Eflyer.'
                : 'Bapak/Ibu Guru hanya dapat melihat catatan presensi kedisiplinan diri sendiri. Input dan pembaruan data dilakukan oleh Admin/Kepala Sekolah.'}
            </span>
          </div>
        </div>

        {!canEdit && currentUser && (
          <div className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 font-bold text-xs shrink-0">
            {currentUser.nama}
          </div>
        )}
      </div>

      {/* 1. TAMPILAN KHUSUS GURU (HANYA MELIHAT DATA DIRI SENDIRI - TIDAK ADA TABEL GURU LAIN) */}
      {!canEdit ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 2a. Kehadiran */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">2a. Kehadiran</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-700">{myRecord?.kehadiran ?? '-'}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Presensi kehadiran jam dinas</p>
            </div>

            {/* 2b. Keterlambatan */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">2b. Keterlambatan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-700">{myRecord?.keterlambatan ?? '-'}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Ketepatan jam masuk dinas</p>
            </div>

            {/* 2c. Kepulangan */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">2c. Kepulangan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-700">{myRecord?.kepulangan ?? '-'}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Ketaatan jam kepulangan</p>
            </div>

            {/* 2d. Doa Bersama */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">2d. Doa Bersama</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-700">{myRecord?.doa_bersama ?? '-'}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Doa pagi & briefing bersama</p>
            </div>

            {/* 2e. Share Eflyer */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">2e. Share Eflyer</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-700">{myRecord?.share_eflayer ?? '-'}</span>
                <span className="text-[10px] text-slate-400">/ 100</span>
              </div>
              <p className="text-[10px] text-slate-500">Publikasi flyer sekolah</p>
            </div>

            {/* Rata-rata Presensi */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-4 rounded-3xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-blue-300 uppercase block">Rata-rata Presensi</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{myAvg > 0 ? myAvg : '-'}</span>
                <span className="text-[10px] text-blue-300">/ 100</span>
              </div>
              <p className="text-[10px] text-blue-200">
                {myAvg >= 91 ? 'Sangat Baik' : myAvg >= 81 ? 'Baik' : myAvg > 0 ? 'Cukup' : 'Belum Ada Data'}
              </p>
            </div>
          </div>

          {/* Catatan dari Pimpinan / Admin */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Catatan Kedisiplinan & Presensi dari Pimpinan</span>
            </h4>
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-slate-800 leading-relaxed">
              {myRecord?.catatan ? (
                <p className="italic">"{myRecord.catatan}"</p>
              ) : (
                <p className="text-slate-400 italic">Belum ada catatan khusus presensi untuk Anda pada periode ini.</p>
              )}
            </div>
            {myRecord?.updated_by && (
              <p className="text-[11px] text-slate-400">
                Dicatat oleh: <span className="font-semibold text-slate-600">{myRecord.updated_by}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 2. TAMPILAN ADMIN & KEPALA SEKOLAH: FORM INPUT + REKAP TABEL SELURUH GURU */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Form */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Form Nilai Absensi & Disiplin</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Guru / Diktendik
              </label>
              <select
                value={selectedNip}
                onChange={(e) => handleSelectTeacher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-blue-600 outline-none"
              >
                {evaluatedTeachers.map((t) => (
                  <option key={t.nip} value={t.nip}>
                    {t.nama} ({t.mapel || 'Guru'})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* 2a. Kehadiran */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2a. Kehadiran</span>
                  <span className="text-blue-700">{kehadiran}</span>
                </div>
                <p className="text-[10px] text-slate-500">Tingkat kehadiran dinas harian di sekolah.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kehadiran || ''}
                  onChange={(e) => setKehadiran(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              {/* 2b. Keterlambatan */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2b. Keterlambatan</span>
                  <span className="text-blue-700">{keterlambatan}</span>
                </div>
                <p className="text-[10px] text-slate-500">Ketepatan jam masuk dinas sekolah.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={keterlambatan || ''}
                  onChange={(e) => setKeterlambatan(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              {/* 2c. Kepulangan */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2c. Kepulangan</span>
                  <span className="text-blue-700">{kepulangan}</span>
                </div>
                <p className="text-[10px] text-slate-500">Ketaatan jam kepulangan dinas sekolah.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kepulangan || ''}
                  onChange={(e) => setKepulangan(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              {/* 2d. Doa Bersama */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2d. Doa Bersama</span>
                  <span className="text-blue-700">{doaBersama}</span>
                </div>
                <p className="text-[10px] text-slate-500">Keikutsertaan doa pagi & briefing bersama.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={doaBersama || ''}
                  onChange={(e) => setDoaBersama(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              {/* 2e. Share Eflyer */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2e. Share Eflyer</span>
                  <span className="text-blue-700">{shareEflyer}</span>
                </div>
                <p className="text-[10px] text-slate-500">Konsistensi menyebarkan info/flyer sekolah.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={shareEflyer || ''}
                  onChange={(e) => setShareEflyer(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Absensi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan kedisiplinan / izin / alasan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-blue-600 outline-none resize-none"
                />
              </div>

              {/* Rata-rata Absensi */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">Rata-rata Absensi:</span>
                <span className="text-sm font-black text-blue-800">{avgCurrent}</span>
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
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Nilai Absensi'}</span>
              </button>
            </form>
          </div>

          {/* Right: Rekapitulasi Tabel Absensi Seluruh Guru */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Rekap Nilai Absensi & Disiplin ({academicYear})
                </h3>
                <p className="text-xs text-slate-500">
                  2a. Kehadiran • 2b. Keterlambatan • 2c. Kepulangan • 2d. Doa Bersama • 2e. Share Eflyer
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-2 text-center w-8">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-2 text-center">2a</th>
                    <th className="py-2.5 px-2 text-center">2b</th>
                    <th className="py-2.5 px-2 text-center">2c</th>
                    <th className="py-2.5 px-2 text-center">2d</th>
                    <th className="py-2.5 px-2 text-center">2e</th>
                    <th className="py-2.5 px-2 text-center bg-blue-100/50 text-blue-900 font-black">Rata</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluatedTeachers.map((t, idx) => {
                    const rec = allAbsensi.find((a) => a.target_nip === t.nip);
                    const scores = rec ? [rec.kehadiran, rec.keterlambatan, rec.kepulangan, rec.doa_bersama, rec.share_eflayer] : [];
                    const avg = scores.some((v) => v > 0)
                      ? Math.round((scores.reduce((a, b) => a + b, 0) / 5) * 10) / 10
                      : 0;

                    return (
                      <tr
                        key={t.nip}
                        className={`hover:bg-blue-50/20 transition ${selectedNip === t.nip ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{t.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.nip}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.kehadiran ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.keterlambatan ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.kepulangan ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.doa_bersama ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.share_eflayer ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-blue-700 bg-blue-50/30">
                          {avg > 0 ? avg : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[120px]" title={rec?.catatan || ''}>
                          {rec?.catatan || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleSelectTeacher(t.nip)}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition cursor-pointer"
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
