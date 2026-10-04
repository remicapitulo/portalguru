import React, { useState, useMemo } from 'react';
import { Users, CheckCircle2, Search, Filter, Copy, Check, Info } from 'lucide-react';
import { User, SemesterType } from '../../types';
import { penilaianService } from '../../db/penilaianService';

interface StatusPengisianTabProps {
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  refreshTrigger: number;
}

export const StatusPengisianTab: React.FC<StatusPengisianTabProps> = ({
  allTeachers,
  academicYear,
  semester,
  refreshTrigger,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'sudah' | 'belum'>('all');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const participationList = useMemo(() => {
    return penilaianService.getParticipationStatus(allTeachers, academicYear, semester);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTeachers, academicYear, semester, refreshTrigger]);

  const filteredParticipation = useMemo(() => {
    return participationList.filter((item) => {
      if (statusFilter === 'sudah' && !item.hasFilled) return false;
      if (statusFilter === 'belum' && item.hasFilled) return false;
      if (searchStatus.trim()) {
        const term = searchStatus.toLowerCase();
        return (
          item.teacher.nama.toLowerCase().includes(term) ||
          item.teacher.nip.includes(term) ||
          (item.teacher.mapel && item.teacher.mapel.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [participationList, statusFilter, searchStatus]);

  const totalTeachers = participationList.length;
  const sudahMengisiCount = participationList.filter((p) => p.hasFilled).length;
  const belumMengisiCount = totalTeachers - sudahMengisiCount;
  const participationPercentage = totalTeachers > 0 ? Math.round((sudahMengisiCount / totalTeachers) * 100) : 0;

  const handleCopyUnfilledTeachers = () => {
    const unfilled = participationList.filter((p) => !p.hasFilled);
    if (unfilled.length === 0) return;

    const text =
      `*DAFTAR GURU YANG BELUM MENGISI PENILAIAN REKAN*\n` +
      `SMPIT Pondok Duta - TA ${academicYear}\n\n` +
      unfilled.map((p, i) => `${i + 1}. ${p.teacher.nama} (${p.teacher.mapel || 'Guru'})`).join('\n') +
      `\n\n_Mohon kepada Bapak/Ibu guru di atas untuk segera mengisi instrumen penilaian antar rekan melalui Portal Guru SMPIT Pondok Duta._`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Stat Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pendidik</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalTeachers}</span>
            <span className="text-xs font-bold text-slate-500">Guru</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Sudah Mengisi</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{sudahMengisiCount}</span>
            <span className="text-xs font-bold text-emerald-700">Guru ({participationPercentage}%)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase block">Belum Mengisi</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-600">{belumMengisiCount}</span>
            <span className="text-xs font-bold text-rose-700">Guru</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase block">Partisipasi</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-700">{participationPercentage}%</span>
            <span className="text-xs font-bold text-slate-500">Selesai</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({totalTeachers})
            </button>
            <button
              onClick={() => setStatusFilter('sudah')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'sudah'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Sudah Mengisi ({sudahMengisiCount})
            </button>
            <button
              onClick={() => setStatusFilter('belum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'belum'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Belum Mengisi ({belumMengisiCount})
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              placeholder="Cari nama guru..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-600 outline-none"
            />
          </div>
        </div>

        {/* WhatsApp Broadcast reminder */}
        {belumMengisiCount > 0 && (
          <button
            onClick={handleCopyUnfilledTeachers}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
            title="Salin daftar guru yang belum mengisi untuk dibagikan via grup WhatsApp"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNotification ? 'Tersalin ke Clipboard!' : 'Salin Pengingat WhatsApp'}</span>
          </button>
        )}
      </div>

      {/* Status Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-4">Nama Guru</th>
                <th className="py-3 px-3">Mapel</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Rekan Yang Dinilai</th>
                <th className="py-3 px-4 text-center">Dinilai Balik</th>
                <th className="py-3 px-3 text-center">Tanggal Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipation.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    Tidak ada guru yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredParticipation.map((item, idx) => (
                  <tr key={item.teacher.nip} className="hover:bg-purple-50/20 transition">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{item.teacher.nama}</span>
                      <span className="text-[10px] text-slate-400 font-mono">NIP: {item.teacher.nip}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{item.teacher.mapel || 'Guru'}</td>
                    <td className="py-3 px-3 text-center">
                      {item.isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lengkap
                        </span>
                      ) : item.hasFilled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Sebagian ({item.percentage}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Belum Mengisi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-slate-800">
                          {item.countGiven} / {item.totalColleagues} Target
                        </span>
                        {item.hasSelfEvaluated && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" title="Sudah mengisi penilaian mandiri (diri sendiri)">
                            <span>★</span>
                            <span>Diri Sendiri</span>
                          </span>
                        )}
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.isComplete ? 'bg-emerald-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-700 block">
                        {item.receivedPeerCount} ulasan rekan
                      </span>
                      {item.hasHeadmaster && (
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
                          + Kepsek
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                      {item.lastDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
