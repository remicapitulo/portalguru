import React, { useState } from 'react';
import { Building2, CheckCircle2, AlertCircle, Save, Lock, ShieldCheck } from 'lucide-react';
import { User, SchoolConfig, SemesterType } from '../../types';
import { penilaianService, YayasanRecord } from '../../db/penilaianService';

interface YayasanTabProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  activeGasUrl: string;
  onDataUpdated: () => void;
}

export const YayasanTab: React.FC<YayasanTabProps> = ({
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
    ? penilaianService.getYayasan(selectedNip, academicYear, semester)
    : undefined;

  const [milad, setMilad] = useState<number>(currentRecord?.milad || 0);
  const [talim, setTalim] = useState<number>(currentRecord?.talim || 0);
  const [sosialisasi, setSosialisasi] = useState<number>(currentRecord?.sosialisasi || 0);
  const [catatan, setCatatan] = useState<string>(currentRecord?.catatan || '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSelectTeacher = (nip: string) => {
    setSelectedNip(nip);
    const rec = penilaianService.getYayasan(nip, academicYear, semester);
    setMilad(rec?.milad || 0);
    setTalim(rec?.talim || 0);
    setSosialisasi(rec?.sosialisasi || 0);
    setCatatan(rec?.catatan || '');
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setFeedback({ type: 'error', text: 'Hanya Admin atau Kepala Sekolah yang dapat menyimpan nilai kegiatan yayasan.' });
      return;
    }
    if (!selectedTeacher) {
      setFeedback({ type: 'error', text: 'Pilih guru terlebih dahulu.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const record: YayasanRecord = {
        target_nip: selectedTeacher.nip,
        target_nama: selectedTeacher.nama,
        tahun_ajaran: academicYear,
        semester,
        milad: Number(milad) || 0,
        talim: Number(talim) || 0,
        sosialisasi: Number(sosialisasi) || 0,
        catatan: catatan.trim(),
        updated_by: currentUser?.nama || 'Admin',
      };

      await penilaianService.saveYayasan(record, activeGasUrl);
      setFeedback({
        type: 'success',
        text: `✓ Nilai Kegiatan Yayasan untuk ${selectedTeacher.nama} berhasil disimpan!`
      });
      onDataUpdated();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan nilai kegiatan yayasan.' });
    } finally {
      setSaving(false);
    }
  };

  const allYayasan = penilaianService.getAllYayasan(academicYear, semester);

  const avgCurrent = [milad, talim, sosialisasi].some((v) => v > 0)
    ? Math.round((([milad, talim, sosialisasi].reduce((a, b) => a + b, 0)) / 3) * 10) / 10
    : 0;

  // Data milik guru yang sedang login (untuk tampilan Guru saja)
  const myRecord = currentUser
    ? penilaianService.getYayasan(currentUser.nip, academicYear, semester)
    : undefined;

  const myScores = myRecord ? [myRecord.milad, myRecord.talim, myRecord.sosialisasi] : [];
  const myAvg = myScores.some((v) => v > 0)
    ? Math.round((myScores.reduce((a, b) => a + b, 0) / 3) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
        canEdit
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : 'bg-slate-100 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {canEdit ? (
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
          )}
          <div>
            <strong className="block font-bold">
              {canEdit ? 'Akses Input Kegiatan Yayasan Aktif' : 'Mode Guru: Hasil Partisipasi Kegiatan Yayasan Anda'}
            </strong>
            <span>
              {canEdit
                ? 'Input nilai 3 sub kriteria kegiatan Yayasan: Milad Yayasan, Ta\'lim / Pengajian, dan Sosialisasi.'
                : 'Bapak/Ibu Guru hanya dapat melihat catatan keikutsertaan kegiatan Yayasan diri sendiri. Input data dikelola oleh Admin/Kepala Sekolah.'}
            </span>
          </div>
        </div>

        {!canEdit && currentUser && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs shrink-0">
            {currentUser.nama}
          </div>
        )}
      </div>

      {/* 1. TAMPILAN KHUSUS GURU (HANYA MELIHAT DATA DIRI SENDIRI - TIDAK ADA TABEL GURU LAIN) */}
      {!canEdit ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 3a. Milad Yayasan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">3a. Milad Yayasan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-700">{myRecord?.milad ?? '-'}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">Partisipasi & kehadiran acara Milad Yayasan</p>
            </div>

            {/* 3b. Ta'lim / Kajian Rutin */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">3b. Ta'lim / Kajian Rutin</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-700">{myRecord?.talim ?? '-'}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">Keaktifan mengikuti pengajian & kajian Yayasan</p>
            </div>

            {/* 3c. Sosialisasi Agenda Yayasan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">3c. Sosialisasi Yayasan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-700">{myRecord?.sosialisasi ?? '-'}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500">Mendukung dan mempublikasikan agenda Yayasan</p>
            </div>

            {/* Rata-rata Kegiatan Yayasan */}
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-5 rounded-3xl shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-300 uppercase block">Rata-rata Yayasan</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{myAvg > 0 ? myAvg : '-'}</span>
                <span className="text-xs text-emerald-300">/ 100</span>
              </div>
              <p className="text-[11px] text-emerald-200 font-semibold">
                {myAvg >= 91 ? 'Sangat Aktif' : myAvg >= 81 ? 'Aktif' : myAvg > 0 ? 'Cukup' : 'Belum Ada Data'}
              </p>
            </div>
          </div>

          {/* Catatan dari Yayasan / Pimpinan */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Catatan & Umpan Balik Kegiatan Yayasan</span>
            </h4>
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-800 leading-relaxed">
              {myRecord?.catatan ? (
                <p className="italic">"{myRecord.catatan}"</p>
              ) : (
                <p className="text-slate-400 italic">Belum ada catatan khusus kegiatan yayasan untuk Anda pada periode ini.</p>
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
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Form Nilai Kegiatan Yayasan</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Guru / Diktendik
              </label>
              <select
                value={selectedNip}
                onChange={(e) => handleSelectTeacher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:border-emerald-600 outline-none"
              >
                {evaluatedTeachers.map((t) => (
                  <option key={t.nip} value={t.nip}>
                    {t.nama} ({t.mapel || 'Guru'})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* 3a. Milad Yayasan */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>3a. Milad Yayasan</span>
                  <span className="text-emerald-700">{milad}</span>
                </div>
                <p className="text-[10px] text-slate-500">Kehadiran & partisipasi dalam agenda Milad Yayasan.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={milad || ''}
                  onChange={(e) => setMilad(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* 3b. Talim / Pengajian Rutin */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>3b. Ta'lim / Kajian Rutin</span>
                  <span className="text-emerald-700">{talim}</span>
                </div>
                <p className="text-[10px] text-slate-500">Keikutsertaan dalam pengajian/kajian rutin yayasan.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={talim || ''}
                  onChange={(e) => setTalim(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* 3c. Sosialisasi Agenda Yayasan */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>3c. Sosialisasi Agenda Yayasan</span>
                  <span className="text-emerald-700">{sosialisasi}</span>
                </div>
                <p className="text-[10px] text-slate-500">Dukungan promosi & sosialisasi program yayasan.</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={sosialisasi || ''}
                  onChange={(e) => setSosialisasi(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="Skor 0 - 100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-emerald-600 outline-none"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Kegiatan Yayasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan keikutsertaan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-emerald-600 outline-none resize-none"
                />
              </div>

              {/* Rata-rata */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950">Rata-rata Kegiatan Yayasan:</span>
                <span className="text-sm font-black text-emerald-800">{avgCurrent}</span>
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
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Nilai Yayasan'}</span>
              </button>
            </form>
          </div>

          {/* Right: Rekapitulasi Tabel Kegiatan Yayasan */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Rekap Nilai Kegiatan Yayasan ({academicYear})
                </h3>
                <p className="text-xs text-slate-500">
                  3a. Milad Yayasan • 3b. Ta'lim / Kajian Rutin • 3c. Sosialisasi Agenda
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-2 text-center">3a. Milad</th>
                    <th className="py-2.5 px-2 text-center">3b. Ta'lim</th>
                    <th className="py-2.5 px-2 text-center">3c. Sosialisasi</th>
                    <th className="py-2.5 px-2 text-center bg-emerald-100/50 text-emerald-900 font-black">Rata</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluatedTeachers.map((t, idx) => {
                    const rec = allYayasan.find((y) => y.target_nip === t.nip);
                    const scores = rec ? [rec.milad, rec.talim, rec.sosialisasi] : [];
                    const avg = scores.some((v) => v > 0)
                      ? Math.round((scores.reduce((a, b) => a + b, 0) / 3) * 10) / 10
                      : 0;

                    return (
                      <tr
                        key={t.nip}
                        className={`hover:bg-emerald-50/20 transition ${selectedNip === t.nip ? 'bg-emerald-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{t.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.nip}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.milad ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.talim ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{rec?.sosialisasi ?? '-'}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-700 bg-emerald-50/30">
                          {avg > 0 ? avg : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[150px]" title={rec?.catatan || ''}>
                          {rec?.catatan || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleSelectTeacher(t.nip)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition cursor-pointer"
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
