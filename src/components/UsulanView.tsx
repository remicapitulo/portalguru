import React, { useState } from 'react';
import {
  Lightbulb,
  Send,
  Filter,
  Trash2,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UsulanItem, User, UsulanStatus, UsulanKategori } from '../types';
import { dbService } from '../db/storage';
import { spreadsheetService } from '../db/spreadsheetService';

interface UsulanViewProps {
  currentUser: User | null;
  usulanList: UsulanItem[];
}

export const UsulanView: React.FC<UsulanViewProps> = ({
  currentUser,
  usulanList,
}) => {
  const isAdmin = currentUser?.role === 'Administrator';

  // Form states
  const [isiUsulan, setIsiUsulan] = useState('');
  const [kategori, setKategori] = useState<UsulanKategori>('Usulan Program');
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [filterBulan, setFilterBulan] = useState<string>('all');
  const [filterTahun, setFilterTahun] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Admin response modal state
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [selectedUsulan, setSelectedUsulan] = useState<UsulanItem | null>(null);
  const [newStatus, setNewStatus] = useState<UsulanStatus>('Proses');
  const [adminNote, setAdminNote] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Extract available years
  const availableYears = Array.from(
    new Set(
      usulanList
        .map((u) => {
          const d = new Date(u.tanggal);
          return isNaN(d.getTime()) ? null : d.getFullYear();
        })
        .filter(Boolean) as number[]
    )
  ).sort((a, b) => b - a);

  // Apply filters
  const filteredList = usulanList.filter((item) => {
    if (!item.tanggal) return true;
    const d = new Date(item.tanggal);

    const matchBulan = filterBulan === 'all' || d.getMonth() === parseInt(filterBulan);
    const matchTahun = filterTahun === 'all' || d.getFullYear() === parseInt(filterTahun);
    const matchStatus = filterStatus === 'all' || item.status.toLowerCase() === filterStatus.toLowerCase();

    return matchBulan && matchTahun && matchStatus;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isiUsulan.trim() || !currentUser) return;

    setSubmitting(true);
    // Instant local add
    dbService.addUsulan({
      nip: currentUser.nip,
      nama: currentUser.nama,
      mapel: currentUser.mapel || 'Guru Mata Pelajaran',
      kategori,
      isi: isiUsulan.trim(),
    });

    // Send to Google Spreadsheet in background
    try {
      await spreadsheetService.addUsulanToSpreadsheet(currentUser.nip, isiUsulan.trim());
    } catch (e) {
      console.warn('Sync to spreadsheet failed:', e);
    }

    setIsiUsulan('');
    setSubmitting(false);
    setCurrentPage(1);
  };

  const handleDelete = async (item: UsulanItem) => {
    if (confirm('Hapus aspirasi/usulan ini dari portal dan spreadsheet?')) {
      dbService.deleteUsulan(item.id);
      if (item.rowIndex && currentUser) {
        try {
          await spreadsheetService.deleteUsulanFromSpreadsheet(item.rowIndex, currentUser.nip);
        } catch (e) {
          console.warn('Delete on spreadsheet failed:', e);
        }
      }
    }
  };

  const handleOpenResponse = (item: UsulanItem) => {
    setSelectedUsulan(item);
    setNewStatus(item.status);
    setAdminNote(item.tanggapan_admin || '');
    setResponseModalOpen(true);
  };

  const handleSaveResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsulan) return;

    dbService.updateUsulanStatus(selectedUsulan.id, newStatus, adminNote.trim());
    setResponseModalOpen(false);
  };

  const getStatusBadge = (status: UsulanStatus) => {
    switch (status) {
      case 'Diterima':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Diterima
          </span>
        );
      case 'Proses':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Sedang Diproses
          </span>
        );
      case 'Ditolak':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Belum Disetujui
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <Send className="w-3 h-3 text-sky-600" /> Terkirim
          </span>
        );
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mb-1">
            <Lightbulb className="w-4 h-4" />
            <span>RUANG ASPIRASI & REQUEST MANAJEMEN</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Suara Guru & Inovasi Sekolah
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Wadah penyampaian ide, kebutuhan sarana/prasarana, masukan, dan aspirasi ke manajemen
          </p>
        </div>
      </div>

      {/* Grid: Left is Form, Right is List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Submit New Aspiration (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-600" />
            <span>Sampaikan Aspirasi Baru</span>
          </h3>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-3.5 h-3.5" />
              Sampaikan Ide & Kebutuhan Anda
            </p>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              Gunakan formulir ini untuk mengajukan kebutuhan fasilitas, perbaikan sarana, ide kegiatan, atau masukan untuk perbaikan berkelanjutan di SMPIT Pondok Duta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Aspirasi
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as UsulanKategori)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              >
                <option value="Usulan Program">Usulan Program / Kegiatan</option>
                <option value="Permintaan Sarana">Permintaan Sarana & Prasarana</option>
                <option value="Ide Inovasi">Ide Inovasi Pembelajaran</option>
                <option value="Masukan/Evaluasi">Masukan & Evaluasi Sekolah</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detail Usulan / Aspirasi
              </label>
              <textarea
                value={isiUsulan}
                onChange={(e) => setIsiUsulan(e.target.value)}
                placeholder="Tuliskan secara lengkap rincian kebutuhan, kendala di kelas, atau ide inovasi Anda..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-amber-500 h-40 resize-none leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs hover:shadow transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirimkan Aspirasi</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right List: Filtered Aspirations (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Daftar Usulan & Tanggapan Manajemen
              </h3>
              <p className="text-xs text-slate-500">
                Total {filteredList.length} usulan tercatat dalam database
              </p>
            </div>

            {/* Quick Status Count Pills */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {usulanList.filter((u) => u.status === 'Diterima').length} Diterima
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {usulanList.filter((u) => u.status === 'Proses').length} Proses
              </span>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1 px-1">
              <Filter className="w-3.5 h-3.5 text-amber-600" /> Filter:
            </span>

            {/* Month Filter */}
            <select
              value={filterBulan}
              onChange={(e) => {
                setFilterBulan(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
            >
              <option value="all">Semua Bulan</option>
              <option value="0">Januari</option>
              <option value="1">Februari</option>
              <option value="2">Maret</option>
              <option value="3">April</option>
              <option value="4">Mei</option>
              <option value="5">Juni</option>
              <option value="6">Juli</option>
              <option value="7">Agustus</option>
              <option value="8">September</option>
              <option value="9">Oktober</option>
              <option value="10">November</option>
              <option value="11">Desember</option>
            </select>

            {/* Year Filter */}
            <select
              value={filterTahun}
              onChange={(e) => {
                setFilterTahun(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Proses">Sedang Diproses</option>
              <option value="Diterima">Diterima</option>
              <option value="Ditolak">Belum Disetujui</option>
            </select>
          </div>

          {/* List items */}
          <div className="space-y-3.5">
            {currentItems.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Tidak ada usulan yang sesuai dengan filter yang dipilih.
                </p>
              </div>
            ) : (
              currentItems.map((item) => {
                const dateStr = item.tanggal
                  ? new Date(item.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-';

                const isOwner = currentUser && currentUser.nip === item.nip;
                const canDelete = isOwner || isAdmin;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/90 hover:border-amber-300 transition shadow-xs bg-white space-y-2.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {item.nama}
                          </span>
                          <span className="text-xs text-slate-500 font-normal">
                            ({item.mapel})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {dateStr}
                          </span>
                          {item.kategori && (
                            <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold">
                              {item.kategori}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                      {item.isi}
                    </p>

                    {/* Admin Response Note */}
                    {item.tanggapan_admin && (
                      <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px] text-blue-700 uppercase tracking-wide">
                            Tanggapan Manajemen:
                          </span>
                          <p className="text-[11px] mt-0.5 leading-relaxed">{item.tanggapan_admin}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                      <span>NIK: {item.nip}</span>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenResponse(item)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Tindak Lanjuti</span>
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                            title="Hapus Usulan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <span>
                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      pg === currentPage
                        ? 'bg-amber-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN RESPONSE MODAL */}
      {responseModalOpen && selectedUsulan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">
                Tindak Lanjuti Usulan Guru
              </h3>
              <button
                onClick={() => setResponseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              <p className="font-bold text-slate-800">{selectedUsulan.nama}</p>
              <p className="mt-1 line-clamp-3 text-slate-600 italic">
                &ldquo;{selectedUsulan.isi}&rdquo;
              </p>
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Usulan
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as UsulanStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none"
                >
                  <option value="Terkirim">Terkirim</option>
                  <option value="Proses">Sedang Diproses</option>
                  <option value="Diterima">Diterima & Disetujui</option>
                  <option value="Ditolak">Belum Dapat Disetujui</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Tanggapan dari Manajemen
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Contoh: Disetujui, pengadaan barang dialokasikan pada anggaran pekan ini..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none h-24 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResponseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow"
                >
                  Simpan Tanggapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
