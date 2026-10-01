import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  UserCheck,
  Trash2,
  Edit3,
  MapPin,
  FolderCheck,
  AlertCircle
} from 'lucide-react';
import { AcademicEvent, User, SchoolConfig } from '../types';
import { dbService } from '../db/storage';

interface KaldikViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  events: AcademicEvent[];
}

export const KaldikView: React.FC<KaldikViewProps> = ({
  currentUser,
  config,
  events,
}) => {
  const isAdmin = currentUser?.role === 'Administrator';
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form states
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [tanggalAwal, setTanggalAwal] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState(currentUser?.nama || '');
  const [proposalUrl, setProposalUrl] = useState('');
  const [proposalName, setProposalName] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [lokasi, setLokasi] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = events.filter((evt) => {
    const q = searchTerm.toLowerCase();
    return (
      evt.nama_kegiatan.toLowerCase().includes(q) ||
      (evt.penanggung_jawab && evt.penanggung_jawab.toLowerCase().includes(q)) ||
      (evt.lokasi && evt.lokasi.toLowerCase().includes(q))
    );
  });

  // Group events by Month
  const groupedEvents: Record<string, AcademicEvent[]> = {};
  filteredEvents.forEach((evt) => {
    const d = new Date(evt.tanggal_awal_kegiatan);
    const monthKey = !isNaN(d.getTime())
      ? d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : 'Lainnya';
    if (!groupedEvents[monthKey]) groupedEvents[monthKey] = [];
    groupedEvents[monthKey].push(evt);
  });

  const handleOpenAdd = () => {
    setEditingEventId(null);
    setNamaKegiatan('');
    setTanggalAwal(new Date().toISOString().split('T')[0]);
    setTanggalAkhir('');
    setPenanggungJawab(currentUser?.nama || '');
    setProposalUrl('');
    setProposalName('');
    setDeskripsi('');
    setLokasi('SMPIT Pondok Duta');
    setModalOpen(true);
  };

  const handleOpenEdit = (evt: AcademicEvent) => {
    setEditingEventId(evt.id);
    setNamaKegiatan(evt.nama_kegiatan);
    setTanggalAwal(evt.tanggal_awal_kegiatan);
    setTanggalAkhir(evt.tanggal_akhir_kegiatan || '');
    setPenanggungJawab(evt.penanggung_jawab || '');
    setProposalUrl(evt.proposal || '');
    setProposalName(evt.proposal_name || '');
    setDeskripsi(evt.deskripsi || '');
    setLokasi(evt.lokasi || '');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKegiatan.trim() || !tanggalAwal) return;

    if (editingEventId) {
      dbService.updateEvent(editingEventId, {
        nama_kegiatan: namaKegiatan.trim(),
        tanggal_awal_kegiatan: tanggalAwal,
        tanggal_akhir_kegiatan: tanggalAkhir || undefined,
        penanggung_jawab: penanggungJawab.trim(),
        proposal: proposalUrl.trim() || undefined,
        proposal_name: proposalName.trim() || 'Dokumen_Kegiatan.pdf',
        deskripsi: deskripsi.trim() || undefined,
        lokasi: lokasi.trim() || undefined,
      });
    } else {
      dbService.addEvent({
        nama_kegiatan: namaKegiatan.trim(),
        tanggal_awal_kegiatan: tanggalAwal,
        tanggal_akhir_kegiatan: tanggalAkhir || undefined,
        penanggung_jawab: penanggungJawab.trim(),
        proposal: proposalUrl.trim() || undefined,
        proposal_name: proposalName.trim() || 'Dokumen_Kegiatan.pdf',
        deskripsi: deskripsi.trim() || undefined,
        lokasi: lokasi.trim() || undefined,
      });
    }

    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Hapus kegiatan "${name}" dari Kalender Pendidikan?`)) {
      dbService.deleteEvent(id);
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>AGENDA & TAHUN AKADEMIK</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Kalender Pendidikan (Kaldik)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar terpadu seluruh kegiatan kurikuler, evaluasi belajar, dan program sekolah
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Agenda Baru</span>
        </button>
      </div>

      {/* Drive Folder Connection Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
        <FolderCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="font-bold">
            Tahun Akademik Aktif: {config.academic_year}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Folder Google Drive penyimpanan berkas terhubung ke <em>&ldquo;{config.drive_folder_name || 'Arsip Administrasi SMPIT Pondok Duta'}&rdquo;</em>.
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kegiatan, nama PJ, atau lokasi..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:border-blue-600 outline-none transition shadow-2xs"
          />
        </div>

        <span className="text-xs font-semibold text-slate-500 hidden sm:block">
          Ditemukan: <strong>{filteredEvents.length}</strong> Kegiatan
        </span>
      </div>

      {/* Grouped Event List */}
      <div className="space-y-8">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Belum ada agenda kegiatan.</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik tombol &quot;Tambah Agenda Baru&quot; di atas untuk menjadwalkan kegiatan.
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([monthName, evts]) => (
            <div key={monthName} className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-black text-blue-950 uppercase tracking-wider">
                <CalendarDays className="w-4 h-4 text-sky-600" />
                <span>{monthName}</span>
                <div className="flex-1 h-px bg-slate-200 ml-2" />
              </div>

              <div className="grid gap-3">
                {evts.map((item) => {
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

                  const canManage =
                    isAdmin ||
                    (currentUser &&
                      item.penanggung_jawab &&
                      currentUser.nama.toLowerCase().includes(item.penanggung_jawab.toLowerCase()));

                  return (
                    <div
                      key={item.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-400 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 transition">
                          <span className="text-xl font-black text-slate-900 group-hover:text-blue-700 leading-none">
                            {String(dayNum).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase mt-1">
                            {dayName}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {statusBadge}
                            {item.lokasi && (
                              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {item.lokasi}
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-900 transition">
                            {item.nama_kegiatan}
                          </h3>

                          {item.deskripsi && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                              {item.deskripsi}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                              {item.tanggal_awal_kegiatan}
                              {item.tanggal_akhir_kegiatan &&
                              item.tanggal_akhir_kegiatan !== item.tanggal_awal_kegiatan
                                ? ` s.d ${item.tanggal_akhir_kegiatan}`
                                : ''}
                            </span>

                            {item.penanggung_jawab && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                PJ: <strong className="text-slate-700">{item.penanggung_jawab}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100 w-full md:w-auto justify-end">
                        {item.proposal && (
                          <a
                            href={item.proposal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-red-500" />
                            <span>Lihat Proposal</span>
                          </a>
                        )}

                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
                              title="Edit Agenda"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.nama_kegiatan)}
                              className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL ADD / EDIT EVENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingEventId ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Kegiatan Baru'}
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
                  Nama Kegiatan / Agenda
                </label>
                <input
                  type="text"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="Contoh: PTS Ganjil TA 2026/2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={tanggalAwal}
                    onChange={(e) => setTanggalAwal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    value={tanggalAkhir}
                    onChange={(e) => setTanggalAkhir(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Penanggung Jawab (PJ)
                </label>
                <input
                  type="text"
                  value={penanggungJawab}
                  onChange={(e) => setPenanggungJawab(e.target.value)}
                  placeholder="Nama Guru atau Panitia PJ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi Kegiatan
                </label>
                <input
                  type="text"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  placeholder="Contoh: Aula SMPIT Pondok Duta / Ruang Kelas"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan Agenda
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Tuliskan gambaran ringkas kegiatan..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none h-18 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan File Proposal / Panduan (Google Drive Link)
                </label>
                <input
                  type="url"
                  value={proposalUrl}
                  onChange={(e) => setProposalUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
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
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow transition"
                >
                  {editingEventId ? 'Simpan Perubahan' : 'Jadwalkan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
