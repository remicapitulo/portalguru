import React, { useState } from 'react';
import {
  BookOpenCheck,
  Plus,
  Search,
  Calendar,
  Trash2,
  Users,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { JurnalItem, User } from '../types';
import { dbService } from '../db/storage';

interface JurnalViewProps {
  currentUser: User | null;
  jurnalList: JurnalItem[];
}

export const JurnalView: React.FC<JurnalViewProps> = ({
  currentUser,
  jurnalList,
}) => {
  const isAdmin = currentUser?.role === 'Administrator';
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kelas, setKelas] = useState('7A');
  const [jamKe, setJamKe] = useState('1 - 2');
  const [mapel, setMapel] = useState(currentUser?.mapel || 'Matematika');
  const [materiPokok, setMateriPokok] = useState('');
  const [kegiatanPembelajaran, setKegiatanPembelajaran] = useState('');
  const [jumlahHadir, setJumlahHadir] = useState(30);
  const [jumlahAbsen, setJumlahAbsen] = useState(0);
  const [catatanRefleksi, setCatatanRefleksi] = useState('');

  const filteredJurnal = jurnalList.filter((j) => {
    const q = searchTerm.toLowerCase();
    const matchUser = isAdmin || (currentUser && j.teacher_id === currentUser.id);
    const matchSearch =
      j.materi_pokok.toLowerCase().includes(q) ||
      j.kelas.toLowerCase().includes(q) ||
      j.teacher_name.toLowerCase().includes(q) ||
      j.mapel.toLowerCase().includes(q);
    return matchUser && matchSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiPokok.trim() || !currentUser) return;

    dbService.addJurnal({
      teacher_id: currentUser.id,
      teacher_name: currentUser.nama,
      tanggal,
      kelas,
      jam_ke: jamKe,
      mapel,
      materi_pokok: materiPokok.trim(),
      kegiatan_pembelajaran: kegiatanPembelajaran.trim(),
      jumlah_hadir: Number(jumlahHadir) || 0,
      jumlah_absen: Number(jumlahAbsen) || 0,
      catatan_refleksi: catatanRefleksi.trim(),
    });

    setMateriPokok('');
    setKegiatanPembelajaran('');
    setCatatanRefleksi('');
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus catatan jurnal mengajar ini?')) {
      dbService.deleteJurnal(id);
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 mb-1">
            <BookOpenCheck className="w-4 h-4" />
            <span>AGENDA HARIAN KELAS</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Jurnal Mengajar & Presensi Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan materi harian, alokasi jam tatap muka, kehadiran siswa, dan refleksi pembelajaran
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Isi Jurnal Mengajar Baru</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari materi pokok, kelas, atau nama guru..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:border-teal-600 outline-none transition"
          />
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:block">
          Total: <strong>{filteredJurnal.length}</strong> Catatan Jurnal
        </span>
      </div>

      {/* Jurnal Cards / Table */}
      <div className="space-y-4">
        {filteredJurnal.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
            <BookOpenCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Belum ada entri jurnal mengajar.</p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan tombol di atas untuk mencatat jurnal harian kelas Anda secara cepat.
            </p>
          </div>
        ) : (
          filteredJurnal.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-teal-400 transition shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-extrabold text-xs border border-teal-200">
                    Kelas {item.kelas}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">{item.mapel}</span>
                  <span className="text-xs text-slate-400">• Jam Ke: {item.jam_ke}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {item.tanggal}
                  </span>
                  {isAdmin && (
                    <span className="font-bold text-slate-700">Guru: {item.teacher_name}</span>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                    title="Hapus Jurnal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 mb-1">{item.materi_pokok}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.kegiatan_pembelajaran}</p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <span className="text-emerald-700 font-bold">
                    Hadir: {item.jumlah_hadir} Siswa
                  </span>
                  <span className="text-amber-700 font-bold">
                    Absen/Izin: {item.jumlah_absen} Siswa
                  </span>
                </div>

                {item.catatan_refleksi && (
                  <span className="text-slate-500 italic max-w-lg truncate">
                    Refleksi: &ldquo;{item.catatan_refleksi}&rdquo;
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL ISI JURNAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Input Jurnal Mengajar Harian
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="7A">7A</option>
                    <option value="7B">7B</option>
                    <option value="7C">7C</option>
                    <option value="8A">8A</option>
                    <option value="8B">8B</option>
                    <option value="8C">8C</option>
                    <option value="9A">9A</option>
                    <option value="9B">9B</option>
                    <option value="9C">9C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Ke</label>
                  <input
                    type="text"
                    value={jamKe}
                    onChange={(e) => setJamKe(e.target.value)}
                    placeholder="Contoh: 1 - 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Materi Pokok / Tujuan Pembelajaran
                </label>
                <input
                  type="text"
                  value={materiPokok}
                  onChange={(e) => setMateriPokok(e.target.value)}
                  placeholder="Contoh: Pengenalan Aljabar & Persamaan Linear"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Kegiatan Pembelajaran
                </label>
                <textarea
                  value={kegiatanPembelajaran}
                  onChange={(e) => setKegiatanPembelajaran(e.target.value)}
                  placeholder="Aktivitas pembuka, inti materi, dan diskusi kelompok..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none h-20 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Siswa Hadir
                  </label>
                  <input
                    type="number"
                    value={jumlahHadir}
                    onChange={(e) => setJumlahHadir(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Siswa Absen/Izin
                  </label>
                  <input
                    type="number"
                    value={jumlahAbsen}
                    onChange={(e) => setJumlahAbsen(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Refleksi Mengajar (Opsional)
                </label>
                <input
                  type="text"
                  value={catatanRefleksi}
                  onChange={(e) => setCatatanRefleksi(e.target.value)}
                  placeholder="Contoh: Siswa antusias saat praktikum, 2 siswa perlu pendampingan tambahan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs hover:shadow transition"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
