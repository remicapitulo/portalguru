import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Trash2,
  Edit,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Award,
  RotateCcw
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

export const DataGuruView: React.FC<DataGuruViewProps> = ({
  currentUser,
  config,
  allTeachers,
  db,
  onOpenReportPrint,
}) => {
  const isAdmin = currentUser?.role?.toLowerCase() === 'administrator' || currentUser?.role?.toLowerCase() === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Form states aligned with Sheet "user": [Nama, NIP, Mapel, Role, Password]
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [mapel, setMapel] = useState('');
  const [role, setRole] = useState('Guru');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Confirmation modal states (replaces blocked window.confirm)
  const [deleteConfirmTeacher, setDeleteConfirmTeacher] = useState<User | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  // Filter out any corrupted placeholder objects & sort alphabetically (A-Z)
  const validTeachers = useMemo(() => {
    return (allTeachers || [])
      .filter((t) => t && t.nama && t.nama.trim().toLowerCase() !== 'guru' && t.nip && t.nip.trim() !== '')
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [allTeachers]);

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return validTeachers.filter((t) => {
      return (
        t.nama.toLowerCase().includes(q) ||
        t.nip.toLowerCase().includes(q) ||
        (t.mapel && t.mapel.toLowerCase().includes(q))
      );
    });
  }, [validTeachers, searchTerm]);

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
    setRole('Guru');
    setEmail('');
    setPassword('');
    setModalOpen(true);
  };

  const handleOpenEdit = (teacher: User) => {
    setEditingTeacherId(teacher.id || teacher.nip);
    setNip(teacher.nip);
    setNama(teacher.nama);
    setMapel(teacher.mapel || '');
    setRole(teacher.role || 'Guru');
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
      password: password.trim(),
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
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Users className="w-4 h-4" />
            <span>DATA PENDIDIK & TENAGA KEPENDIDIKAN</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Data Guru & Rekapitulasi Administrasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring kelengkapan 36 kategori perangkat pembelajaran tiap guru mata pelajaran
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleRestoreInitial}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              title="Pulihkan data nama guru jika sempat corrupt / kosong"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Pulihkan Data Sesuai Sheet</span>
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
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama guru, NIK, atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:border-indigo-600 outline-none transition"
          />
        </div>

        <span className="text-xs font-bold text-slate-500 hidden sm:block">
          Total Terdaftar: <strong>{allTeachers.length}</strong> Guru
        </span>
      </div>

      {/* Matrix Table: Guru vs 6 Dokumen Types */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Matriks Kelengkapan Dokumen Pembelajaran (Semester 1 & 2 • Kelas 7, 8, 9)</span>
          </h3>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">Maksimal 6 Berkas per Jenis</span>
        </div>

        {/* Desktop Table View (Tampilan Desktop Tetap 100% Utuh & Tidak Berubah) */}
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
              {filteredTeachers.map((teacher) => {
                const prog = dbService.calculateTeacherProgress(teacher.id);

                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
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
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (Tampilan Khusus Mobile dalam Bentuk Kartu Rapi) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada data guru yang sesuai pencarian.
            </div>
          ) : (
            filteredTeachers.map((teacher) => {
              const prog = dbService.calculateTeacherProgress(teacher.id);
              const isFull = prog.percentage >= 100;
              const isHalf = prog.percentage >= 50;

              return (
                <div key={teacher.id} className="p-4 space-y-3.5 hover:bg-slate-50/60 transition">
                  {/* Top Bar: Guru Identity & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
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

                    {/* Status Badge & Percentage */}
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

                  {/* Progress Bar & Total Slots */}
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

                  {/* 6 Document Badges Grid (3 columns x 2 rows) */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Rincian 6 Jenis Dokumen (Semester 1 & 2):
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

                  {/* Admin Action Buttons (if Admin) */}
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

      {/* MODAL TAMBAH / EDIT GURU */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingTeacherId ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
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
                  Mata Pelajaran (Kolom C: Mapel)
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  placeholder="Contoh: Bahasa Inggris"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-600 outline-none"
                  required
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
                    <option value="Guru">Guru</option>
                    <option value="Tendik">Tendik (Tenaga Kependidikan)</option>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow"
                >
                  {editingTeacherId ? 'Simpan Perubahan' : 'Tambah Guru'}
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
                  Hapus Data Guru?
                </h3>
                <p className="text-xs text-slate-500">
                  NIK: {deleteConfirmTeacher.nip}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Nama Pendidik:</p>
              <p className="text-xs font-bold text-slate-800">
                {deleteConfirmTeacher.nama} ({deleteConfirmTeacher.mapel || 'Guru'})
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Data guru ini akan dihapus dari portal dan sheet &ldquo;user&rdquo;. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeacher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeDeleteTeacher}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-600/20 transition"
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
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeRestore}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 transition"
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
