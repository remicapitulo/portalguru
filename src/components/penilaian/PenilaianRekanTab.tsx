import React, { useState, useMemo } from 'react';
import { Award, Users, CheckCircle2, AlertCircle, Check, Info, ShieldCheck, Lock } from 'lucide-react';
import { User, SchoolConfig, SemesterType } from '../../types';
import {
  penilaianService,
  PenilaianScores,
  INDIKATOR_PENILAIAN,
  SKOR_OPTIONS,
  SKOR_LABELS,
} from '../../db/penilaianService';

interface PenilaianRekanTabProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  activeGasUrl: string;
  refreshTrigger: number;
  onDataUpdated: () => void;
}

export const PenilaianRekanTab: React.FC<PenilaianRekanTabProps> = ({
  currentUser,
  config,
  allTeachers,
  academicYear,
  semester,
  isAdmin,
  activeGasUrl,
  refreshTrigger,
  onDataUpdated,
}) => {
  const teachersList = useMemo(() => {
    return allTeachers.filter(
      (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2
    );
  }, [allTeachers]);

  // Target guru yang dinilai: Rekan sejawat (Kepala Sekolah TIDAK diikutsertakan)
  const targetTeachersList = useMemo(() => {
    // 1. Ambil seluruh rekan guru yang dinilai; Kepala Sekolah TIDAK diikutsertakan dalam penilaian antar rekan
    const list = teachersList.filter((t) => {
      if (penilaianService.isHeadmaster(t, config)) return false;
      return true;
    });

    // 2. Guru yang sedang login (jika bukan kepala sekolah) diizinkan menilai diri sendiri
    if (currentUser && !penilaianService.isHeadmaster(currentUser, config)) {
      const exists = list.some((t) => t.nip === currentUser.nip);
      if (!exists && currentUser.nip && currentUser.nama) {
        list.unshift(currentUser);
      } else {
        const selfIndex = list.findIndex((t) => t.nip === currentUser.nip);
        if (selfIndex > 0) {
          const [self] = list.splice(selfIndex, 1);
          list.unshift(self);
        }
      }
    }

    return list;
  }, [teachersList, currentUser, config]);

  const [evaluatorRole, setEvaluatorRole] = useState<'guru' | 'kepala_sekolah'>(
    isAdmin ? 'kepala_sekolah' : 'guru'
  );

  const EMPTY_SCORES: PenilaianScores = {
    komunikasi_pimpinan: 0,
    komunikasi_siswa: 0,
    komunikasi_ortu: 0,
    komunikasi_sejawat: 0,
    seragam: 0,
    adab_pakaian: 0,
    ketaatan_tugas: 0,
    dandanan: 0,
  };

  const [targetTeacherNip, setTargetTeacherNip] = useState<string>('');
  const [scores, setScores] = useState<PenilaianScores>(EMPTY_SCORES);
  const [catatan, setCatatan] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const allReviews = useMemo(() => {
    return penilaianService.getAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const userEvaluatedNips = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const evaluated = allReviews.filter(
      (r) =>
        r.penilai_nip === currentUser.nip &&
        r.penilai_role === evaluatorRole &&
        r.tahun_ajaran === academicYear &&
        r.semester === semester
    );
    return new Set(evaluated.map((r) => r.target_nip));
  }, [allReviews, currentUser, evaluatorRole, academicYear, semester]);

  const selectedTargetTeacher = useMemo(() => {
    return targetTeachersList.find((t) => t.nip === targetTeacherNip) || null;
  }, [targetTeachersList, targetTeacherNip]);

  const handleSelectTarget = (nip: string) => {
    setTargetTeacherNip(nip);
    setSaveSuccess(null);
    setSaveError(null);

    if (!currentUser) return;
    const existing = penilaianService.getAssessment(
      currentUser.nip,
      nip,
      evaluatorRole,
      academicYear,
      semester
    );

    if (existing) {
      setScores(existing.scores);
      setCatatan(existing.catatan || '');
    } else {
      // Clean zero slate (semua mulai dari Nol)
      setScores({ ...EMPTY_SCORES });
      setCatatan('');
    }
  };

  const filledIndicatorsCount = useMemo(() => {
    return Object.values(scores).filter((v) => (v || 0) > 0).length;
  }, [scores]);

  const liveAverage = useMemo(() => {
    const validScores = Object.values(scores).filter((v) => (v || 0) > 0) as number[];
    if (validScores.length === 0) return 0;
    const sum = validScores.reduce((a, b) => a + b, 0);
    return Math.round((sum / validScores.length) * 10) / 10;
  }, [scores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setSaveError('Anda harus login terlebih dahulu.');
      return;
    }
    if (!targetTeacherNip || !selectedTargetTeacher) {
      setSaveError('Silakan pilih guru yang akan dinilai.');
      return;
    }
    if (filledIndicatorsCount < 8) {
      setSaveError(`Wajib menjawab semua 8 pertanyaan penilaian. Jawaban tidak boleh ada yang kosong (saat ini baru ${filledIndicatorsCount} dari 8 terisi).`);
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const saved = await penilaianService.saveAssessment(
        {
          penilai_nip: currentUser.nip,
          penilai_nama: currentUser.nama,
          penilai_role: evaluatorRole,
          target_nip: selectedTargetTeacher.nip,
          target_nama: selectedTargetTeacher.nama,
          tahun_ajaran: academicYear,
          semester,
          scores,
          catatan: catatan.trim() || undefined,
        },
        activeGasUrl
      );

      const gasInfo = activeGasUrl
        ? ' serta otomatis tersimpan ke Google Spreadsheet.'
        : '.';

      const isSelf = currentUser && selectedTargetTeacher.nip === currentUser.nip;
      const targetLabel = isSelf ? 'mandiri (diri sendiri)' : selectedTargetTeacher.nama;

      setSaveSuccess(
        `✓ Penilaian ${targetLabel} berhasil disimpan dengan skor rata-rata ${saved.rata_rata}${gasInfo}`
      );
      onDataUpdated();

      setTimeout(() => {
        setSaveSuccess(null);
      }, 7000);
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan penilaian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rater Profile & Target Teacher Picker */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span>Pilih Rekan Guru yang Akan Dinilai</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap guru menilai rekan sejawat secara jujur, objektif, dan rahasia demi peningkatan kualitas pendidik.
            </p>
          </div>

          {/* Evaluator Role Selector (Guru vs Kepala Sekolah) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 p-1 bg-purple-50 rounded-2xl border border-purple-200/70">
              <button
                type="button"
                onClick={() => setEvaluatorRole('guru')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  evaluatorRole === 'guru'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-900 hover:bg-purple-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sebagai Rekan Guru</span>
              </button>
              <button
                type="button"
                onClick={() => setEvaluatorRole('kepala_sekolah')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  evaluatorRole === 'kepala_sekolah'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-900 hover:bg-purple-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sebagai Kepala Sekolah (Penyeimbang)</span>
              </button>
            </div>
          )}
        </div>

        {evaluatorRole === 'kepala_sekolah' && (
          <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Mode Penilaian Penyeimbang Kepala Sekolah Aktif</strong>
              <span>Skor Anda berfungsi sebagai penilaian resmi Kepala Sekolah dalam Rapor Diktendik.</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nama Guru yang Dinilai <span className="text-rose-500">*</span>
              </label>
              {currentUser && !penilaianService.isHeadmaster(currentUser, config) && (
                <button
                  type="button"
                  onClick={() => handleSelectTarget(currentUser.nip)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    targetTeacherNip === currentUser.nip
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                  title="Klik untuk langsung menilai diri sendiri"
                >
                  <span className="text-amber-500 font-black">★</span>
                  <span>Nilai Diri Sendiri</span>
                </button>
              )}
            </div>
            <select
              value={targetTeacherNip}
              onChange={(e) => handleSelectTarget(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-purple-600 outline-none transition cursor-pointer"
            >
              <option value="">-- Pilih Rekan Guru {currentUser && !penilaianService.isHeadmaster(currentUser, config) ? '/ Diri Sendiri' : ''} --</option>
              {targetTeachersList.map((t) => {
                const isEvaluated = userEvaluatedNips.has(t.nip);
                const isSelf = currentUser && t.nip === currentUser.nip;
                return (
                  <option key={t.nip} value={t.nip}>
                    {isEvaluated ? '✓ [Sudah Dinilai] ' : '○ [Belum Dinilai] '}
                    {isSelf ? '★ [Nilai Diri Sendiri] ' : ''}
                    {t.nama} {isSelf ? '(Saya Sendiri)' : `(${t.mapel || 'Guru'})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tahun Ajaran
            </label>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{academicYear}</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                1 Tahun Kalender
              </span>
            </div>
          </div>
        </div>

        {/* Quick Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              Daftar Cepat Rekan Guru ({userEvaluatedNips.size} dari {targetTeachersList.length} sudah dinilai Anda)
            </span>
            <span className="text-[11px] text-purple-700 font-semibold">
              Klik nama guru untuk langsung mengisi
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
            {targetTeachersList.map((t) => {
              const isEvaluated = userEvaluatedNips.has(t.nip);
              const isSelected = targetTeacherNip === t.nip;
              const isSelf = currentUser && t.nip === currentUser.nip;
              return (
                <button
                  type="button"
                  key={t.nip}
                  onClick={() => handleSelectTarget(t.nip)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-xs'
                      : isEvaluated
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : isSelf
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {isEvaluated ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                  ) : isSelf ? (
                    <span className={`text-xs ${isSelected ? 'text-white' : 'text-amber-600 font-black'}`}>★</span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`} />
                  )}
                  <span>{isSelf ? `${t.nama.split(',')[0]} (Diri Sendiri)` : t.nama.split(',')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banner Khusus Penilaian Diri Sendiri */}
      {selectedTargetTeacher && currentUser && selectedTargetTeacher.nip === currentUser.nip && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs animate-in fade-in">
          <span className="text-xl text-amber-600 mt-0.5">★</span>
          <div className="space-y-1">
            <h4 className="font-black text-amber-900 text-sm">Mode Penilaian Diri Sendiri (Self-Assessment) Aktif</h4>
            <p className="text-amber-800 leading-relaxed">
              Anda sedang melakukan evaluasi mandiri atas kinerja dan keteladanan Anda selama <strong>1 Tahun Kalender {academicYear}</strong>. Berikan penilaian yang objektif, jujur, dan reflektif demi pengembangan kompetensi diri berkelanjutan.
            </p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Assessment Form Matrix */}
      {selectedTargetTeacher ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-1.5">
                      <span>{selectedTargetTeacher.nama}</span>
                      <span className="text-rose-500 font-black">*</span>
                    </h3>
                    {currentUser && selectedTargetTeacher.nip === currentUser.nip && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <span>★</span>
                        <span>Penilaian Diri Sendiri (Self-Assessment)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mapel: <strong className="text-slate-700">{selectedTargetTeacher.mapel || 'Guru'}</strong> • NIP: {selectedTargetTeacher.nip}
                  </p>
                  {currentUser && selectedTargetTeacher.nip === currentUser.nip && (
                    <p className="text-[11px] text-amber-900 mt-1.5 font-medium bg-amber-50/90 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
                      ★ <strong>Refleksi Mandiri</strong>: Anda sedang mengisi evaluasi diri sendiri terhadap 8 indikator sikap, etika, dan keteladanan.
                    </p>
                  )}
                </div>

                {filledIndicatorsCount === 8 && (
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-purple-100/70 border border-purple-200 px-3.5 py-1.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-purple-900">Rata-rata Skor:</span>
                    <span className="text-sm font-black text-purple-700">{liveAverage}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-700 text-white">
                      {liveAverage >= 91 ? 'Amat Baik' : liveAverage >= 81 ? 'Baik' : 'Cukup'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Score Scale Guide */}
            <div className="px-5 sm:px-7 py-3 bg-slate-50 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Skala Penilaian:</span>
              <div className="flex flex-wrap items-center gap-2">
                {SKOR_OPTIONS.map((scoreVal) => (
                  <span
                    key={scoreVal}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${SKOR_LABELS[scoreVal].color}`}
                  >
                    <strong>{scoreVal}:</strong> {SKOR_LABELS[scoreVal].label}
                  </span>
                ))}
              </div>
            </div>

            {/* Assessment Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 text-xs font-extrabold uppercase">
                    <th className="py-3 px-4 sm:px-6 w-1/2">Indikator Penilaian Adab & Etika</th>
                    {SKOR_OPTIONS.map((scoreVal) => (
                      <th key={scoreVal} className="py-3 px-3 text-center w-20 text-slate-800">
                        <span className="text-sm font-black">{scoreVal}</span>
                        <span className="block text-[9px] font-semibold text-slate-500 normal-case">
                          {scoreVal === 100 ? 'Sangat Baik' : scoreVal === 80 ? 'Cukup' : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {INDIKATOR_PENILAIAN.map((ind) => {
                    const currentScore = scores[ind.key];
                    return (
                      <tr key={ind.key} className="hover:bg-purple-50/30 transition-colors group">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-100 group-hover:text-purple-800">
                              {ind.code}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                                {ind.title}
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                                {ind.deskripsi}
                              </span>
                            </div>
                          </div>
                        </td>

                        {SKOR_OPTIONS.map((scoreVal) => {
                          const isChecked = currentScore === scoreVal;
                          return (
                            <td key={scoreVal} className="py-3.5 px-3 text-center align-middle">
                              <label className="inline-flex items-center justify-center p-2 rounded-xl cursor-pointer transition hover:scale-110">
                                <input
                                  type="radio"
                                  name={ind.key}
                                  value={scoreVal}
                                  checked={isChecked}
                                  onChange={() =>
                                    setScores((prev) => ({
                                      ...prev,
                                      [ind.key]: scoreVal,
                                    }))
                                  }
                                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer accent-purple-600"
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 sm:p-7 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Konstruktif / Apresiasi untuk {selectedTargetTeacher.nama} (Opsional)
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  placeholder="Tuliskan masukan positif atau apresiasi terhadap kinerja rekan guru..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-purple-600 outline-none transition resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  {filledIndicatorsCount < 8 ? (
                    <div className="flex items-center gap-2 text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong>Wajib Dijawab 8 Pertanyaan</strong>: Lengkapi seluruh pertanyaan untuk membuka tombol simpan ({8 - filledIndicatorsCount} pertanyaan belum dijawab).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Seluruh 8 pertanyaan telah lengkap terisi. Silakan simpan penilaian.
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={filledIndicatorsCount < 8 || submitting}
                  className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 ${
                    filledIndicatorsCount === 8 && !submitting
                      ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer active:scale-[0.99]'
                      : 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                  title={
                    filledIndicatorsCount < 8
                      ? `Tombol terkunci: Wajib menjawab semua 8 pertanyaan (saat ini ${filledIndicatorsCount}/8).`
                      : 'Simpan penilaian'
                  }
                >
                  {filledIndicatorsCount === 8 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {submitting
                      ? 'Menyimpan...'
                      : filledIndicatorsCount < 8
                      ? `Tombol Terkunci (Wajib 8 Pertanyaan Terisi: ${filledIndicatorsCount}/8)`
                      : `Simpan Penilaian (${selectedTargetTeacher.nama.split(',')[0]})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800">
            Pilih Rekan Guru di Atas Terlebih Dahulu
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pilih salah satu nama rekan guru melalui dropdown atau chip cepat di atas untuk memunculkan formulir instrumen penilaian 8 indikator.
          </p>
        </div>
      )}
    </div>
  );
};
