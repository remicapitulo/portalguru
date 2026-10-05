import React, { useState, useMemo } from 'react';
import {
  Scale,
  Search,
  Download,
  FileSpreadsheet,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  ShieldCheck,
  Award,
  ChevronRight,
  CloudUpload,
  RefreshCw,
  ExternalLink,
  Check,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, SchoolConfig, SemesterType } from '../../types';
import {
  penilaianService,
  RaporDiktendikItem,
  INDIKATOR_PENILAIAN,
  PENILAIAN_SPREADSHEET_ID,
} from '../../db/penilaianService';

interface RaporDiktendikTabProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  refreshTrigger: number;
  activeGasUrl?: string;
  onSelectTeacherForPrint: (teacher: User) => void;
}

export const RaporDiktendikTab: React.FC<RaporDiktendikTabProps> = ({
  currentUser,
  config,
  allTeachers,
  academicYear,
  semester,
  isAdmin,
  refreshTrigger,
  activeGasUrl,
  onSelectTeacherForPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'A' | 'B+' | 'B' | 'C' | 'D'>('all');
  const [selectedDetail, setSelectedDetail] = useState<RaporDiktendikItem | null>(null);
  const [syncingGAS, setSyncingGAS] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isTeacher = currentUser?.role?.toLowerCase() === 'guru';
  const canSeeAll = isAdmin && !isTeacher;

  const evaluatedTeachers = useMemo(() => {
    const baseList = allTeachers.filter(
      (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2 && !penilaianService.isHeadmaster(t, config)
    );
    // Guru HANYA bisa melihat dan mencetak rapor diri sendiri, tidak bisa melihat guru lain
    if (!canSeeAll && currentUser) {
      const selfList = baseList.filter((t) => t.nip === currentUser.nip);
      return selfList.length > 0 ? selfList : [currentUser];
    }
    return baseList;
  }, [allTeachers, config, canSeeAll, currentUser]);

  const raporList = useMemo(() => {
    return penilaianService.calculateRaporDiktendik(evaluatedTeachers, academicYear, semester);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluatedTeachers, academicYear, semester, refreshTrigger]);

  const filteredRapor = useMemo(() => {
    return raporList.filter((item) => {
      if (categoryFilter !== 'all' && item.kategori !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        return (
          item.teacher.nama.toLowerCase().includes(term) ||
          item.teacher.nip.includes(term) ||
          (item.teacher.mapel && item.teacher.mapel.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [raporList, categoryFilter, searchQuery]);

  const getKategoriBadge = (kategori: string) => {
    switch (kategori) {
      case 'A':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B+':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'B':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  // Export to Excel (.xls HTML table)
  const exportExcel = () => {
    const tableRows = raporList.map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${item.teacher.nama}</td>
        <td style="mso-number-format:'\\@';">${item.teacher.nip}</td>
        <td>${item.teacher.mapel || 'Guru'}</td>
        <td style="text-align:center;">${item.supervisi.kbm || '-'}</td>
        <td style="text-align:center;">${item.supervisi.administrasi || '-'}</td>
        <td style="text-align:center;font-weight:bold;">${item.supervisi.rataRata || '-'}</td>
        <td style="text-align:center;">${item.absensi.kehadiran || '-'}</td>
        <td style="text-align:center;">${item.absensi.keterlambatan || '-'}</td>
        <td style="text-align:center;">${item.absensi.kepulangan || '-'}</td>
        <td style="text-align:center;">${item.absensi.doa_bersama || '-'}</td>
        <td style="text-align:center;">${item.absensi.share_eflayer || '-'}</td>
        <td style="text-align:center;font-weight:bold;">${item.absensi.rataRata || '-'}</td>
        <td style="text-align:center;">${item.yayasan.milad || '-'}</td>
        <td style="text-align:center;">${item.yayasan.talim || '-'}</td>
        <td style="text-align:center;">${item.yayasan.sosialisasi || '-'}</td>
        <td style="text-align:center;font-weight:bold;">${item.yayasan.rataRata || '-'}</td>
        <td style="text-align:center;font-weight:bold;">${item.adab.rataRata || '-'}</td>
        <td style="text-align:center;">${item.peerReviewCount}</td>
        <td style="text-align:center;font-weight:bold;">${item.jumlah}</td>
        <td style="text-align:center;font-weight:bold;background-color:#EDE9FE;">${item.rata_rata}</td>
        <td style="text-align:center;font-weight:bold;">${item.kategori}</td>
        <td>${item.catatanYayasan || '-'}</td>
      </tr>
    `).join('');

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }
            th { background-color: #581C87; color: #ffffff; padding: 6px; border: 1px solid #cccccc; }
            td { padding: 5px; border: 1px solid #cccccc; }
            .kop { font-size: 14px; font-weight: bold; text-align: center; }
            .subkop { font-size: 11px; text-align: center; color: #555555; }
          </style>
        </head>
        <body>
          <div class="kop">${config.school_name.toUpperCase()}</div>
          <div class="subkop">REKAPITULASI RAPOR PENILAIAN KINERJA DIKTENDIK - TA ${academicYear}</div>
          <br/>
          <table>
            <thead>
              <tr>
                <th rowspan="2">No</th>
                <th rowspan="2">Nama Diktendik</th>
                <th rowspan="2">NIP</th>
                <th rowspan="2">Mapel/Tugas</th>
                <th colspan="3">1. Supervisi</th>
                <th colspan="6">2. Absensi & Kedisiplinan</th>
                <th colspan="4">3. Kegiatan Yayasan</th>
                <th colspan="2">4. Adab Sejawat</th>
                <th rowspan="2">Jumlah</th>
                <th rowspan="2">Nilai Akhir</th>
                <th rowspan="2">Kategori</th>
                <th rowspan="2">Catatan Yayasan</th>
              </tr>
              <tr>
                <th>1a. KBM</th>
                <th>1b. Adm</th>
                <th>Rata</th>
                <th>2a. Hadir</th>
                <th>2b. Terlambat</th>
                <th>2c. Pulang</th>
                <th>2d. Doa</th>
                <th>2e. Flyer</th>
                <th>Rata</th>
                <th>3a. Milad</th>
                <th>3b. Talim</th>
                <th>3c. Sosial</th>
                <th>Rata</th>
                <th>Rata 8 P</th>
                <th>Jml Rater</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rapor_Diktendik_SMPIT_Pondok_Duta_${academicYear.replace('/', '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF table
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(config.school_name.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`REKAPITULASI RAPOR PENILAIAN KINERJA PENDIDIK & TENAGA KEPENDIDIKAN (DIKTENDIK)`, pageWidth / 2, 17, { align: 'center' });
    doc.text(`Tahun Ajaran: ${academicYear} • Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 21, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 23, pageWidth - 14, 23);

    const headers = [
      ['No', 'Nama Guru', 'Mapel', '1. Supervisi', '2. Absensi', '3. Yayasan', '4. Adab', 'Jml', 'Nilai', 'Kat', 'Catatan']
    ];

    const rows = raporList.map((item, idx) => [
      idx + 1,
      item.teacher.nama,
      item.teacher.mapel || 'Guru',
      item.supervisi.rataRata > 0 ? `${item.supervisi.rataRata}` : '-',
      item.absensi.rataRata > 0 ? `${item.absensi.rataRata}` : '-',
      item.yayasan.rataRata > 0 ? `${item.yayasan.rataRata}` : '-',
      item.adab.rataRata > 0 ? `${item.adab.rataRata}` : '-',
      item.jumlah,
      item.rata_rata,
      item.kategori,
      item.catatanYayasan || '-'
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 26,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [88, 28, 135],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'left' },
        2: { halign: 'left' },
        10: { halign: 'left' },
      },
      alternateRowStyles: {
        fillColor: [250, 245, 255],
      },
    });

    doc.save(`Rekap_Rapor_Diktendik_SMPIT_Pondok_Duta_${academicYear.replace('/', '_')}.pdf`);
  };

  // Realisasikan seluruh Rapor Diktendik ke database Google Spreadsheet
  const handleSyncToSpreadsheet = async () => {
    if (raporList.length === 0) {
      setSyncFeedback({ type: 'error', text: 'Tidak ada data rekap guru untuk direalisasikan ke spreadsheet.' });
      return;
    }

    setSyncingGAS(true);
    setSyncFeedback(null);
    try {
      const res = await penilaianService.saveAllRaporToGAS(
        raporList,
        academicYear,
        semester,
        activeGasUrl
      );
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          text: `✓ Sukses! Seluruh data Rapor Diktendik (${res.count ?? raporList.length} Guru) berhasil direalisasikan ke Sheet "Rapor_Diktendik" di database Google Spreadsheet.`,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          text: res.message || 'Gagal menyimpan ke Google Spreadsheet.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat menyimpan ke Google Spreadsheet.',
      });
    } finally {
      setSyncingGAS(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Export Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({raporList.length})
            </button>
            <button
              onClick={() => setCategoryFilter('A')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                categoryFilter === 'A' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setCategoryFilter('B+')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                categoryFilter === 'B+' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700'
              }`}
            >
              B+
            </button>
            <button
              onClick={() => setCategoryFilter('B')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                categoryFilter === 'B' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700'
              }`}
            >
              B
            </button>
            <button
              onClick={() => setCategoryFilter('C')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                categoryFilter === 'C' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700'
              }`}
            >
              C
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-600 outline-none"
            />
          </div>
        </div>

        {/* Action Buttons: Sync to Spreadsheet & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleSyncToSpreadsheet}
              disabled={syncingGAS}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Kirim dan simpan seluruh rekapitulasi Rapor Diktendik ke Sheet Rapor_Diktendik di Google Spreadsheet"
            >
              <CloudUpload className={`w-4 h-4 text-emerald-100 ${syncingGAS ? 'animate-bounce' : ''}`} />
              <span>{syncingGAS ? 'Menyimpan ke Spreadsheet...' : 'Realisasikan ke Spreadsheet'}</span>
            </button>
          )}

          <button
            onClick={exportExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Unduh seluruh tabel rekap dalam format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Unduh Excel (.xls)</span>
          </button>

          <button
            onClick={exportPDF}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Unduh laporan rekapitulasi dalam format PDF"
          >
            <Download className="w-4 h-4 text-purple-200" />
            <span>Unduh PDF Rekap</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner Realisasi Spreadsheet */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{syncFeedback.text}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://docs.google.com/spreadsheets/d/${PENILAIAN_SPREADSHEET_ID}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <span>Buka Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
            </a>
            <button
              onClick={() => setSyncFeedback(null)}
              className="p-1 rounded-lg hover:bg-emerald-200/50 text-emerald-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Rapor Diktendik Comprehensive Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase border-b border-slate-800">
                <th rowSpan={2} className="py-3 px-2 text-center w-8">No</th>
                <th rowSpan={2} className="py-3 px-3 min-w-[140px]">Nama Diktendik</th>
                <th rowSpan={2} className="py-3 px-2 min-w-[90px]">Mapel/Tugas</th>
                <th colSpan={3} className="py-2 px-2 text-center bg-purple-950 border-x border-purple-800">
                  1. Supervisi
                </th>
                <th colSpan={6} className="py-2 px-2 text-center bg-blue-950 border-x border-blue-800">
                  2. Absensi & Disiplin
                </th>
                <th colSpan={4} className="py-2 px-2 text-center bg-emerald-950 border-x border-emerald-800">
                  3. Yayasan
                </th>
                <th colSpan={2} className="py-2 px-2 text-center bg-indigo-950 border-x border-indigo-800">
                  4. Adab
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center bg-slate-800">Jumlah</th>
                <th rowSpan={2} className="py-3 px-2 text-center bg-purple-900">Nilai Akhir</th>
                <th rowSpan={2} className="py-3 px-2 text-center">Kat</th>
                <th rowSpan={2} className="py-3 px-3 text-center min-w-[120px]">Aksi</th>
              </tr>
              <tr className="bg-slate-800 text-slate-300 text-[9px] uppercase border-b border-slate-700">
                {/* 1. Supervisi */}
                <th className="py-1 px-1.5 text-center">1a. KBM</th>
                <th className="py-1 px-1.5 text-center">1b. Adm</th>
                <th className="py-1 px-1.5 text-center font-bold text-white bg-purple-900/60">Rata</th>

                {/* 2. Absensi */}
                <th className="py-1 px-1 text-center">2a</th>
                <th className="py-1 px-1 text-center">2b</th>
                <th className="py-1 px-1 text-center">2c</th>
                <th className="py-1 px-1 text-center">2d</th>
                <th className="py-1 px-1 text-center">2e</th>
                <th className="py-1 px-1.5 text-center font-bold text-white bg-blue-900/60">Rata</th>

                {/* 3. Yayasan */}
                <th className="py-1 px-1.5 text-center">3a</th>
                <th className="py-1 px-1.5 text-center">3b</th>
                <th className="py-1 px-1.5 text-center">3c</th>
                <th className="py-1 px-1.5 text-center font-bold text-white bg-emerald-900/60">Rata</th>

                {/* 4. Adab */}
                <th className="py-1 px-1.5 text-center font-bold text-white bg-indigo-900/60">Skor</th>
                <th className="py-1 px-1 text-center">Rater</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRapor.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-8 text-center text-slate-400 font-semibold">
                    Tidak ada guru yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRapor.map((item, idx) => (
                  <tr key={item.teacher.nip} className="hover:bg-purple-50/20 transition">
                    <td className="py-2.5 px-2 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block truncate max-w-[150px]">{item.teacher.nama}</span>
                      <span className="text-[10px] text-slate-400 font-mono">NIP: {item.teacher.nip}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 truncate max-w-[100px]">{item.teacher.mapel || 'Guru'}</td>

                    {/* 1. Supervisi */}
                    <td className="py-2.5 px-1.5 text-center font-mono">{item.supervisi.kbm || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono">{item.supervisi.administrasi || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono font-black text-purple-800 bg-purple-50/40">
                      {item.supervisi.rataRata || '-'}
                    </td>

                    {/* 2. Absensi */}
                    <td className="py-2.5 px-1 text-center font-mono">{item.absensi.kehadiran || '-'}</td>
                    <td className="py-2.5 px-1 text-center font-mono">{item.absensi.keterlambatan || '-'}</td>
                    <td className="py-2.5 px-1 text-center font-mono">{item.absensi.kepulangan || '-'}</td>
                    <td className="py-2.5 px-1 text-center font-mono">{item.absensi.doa_bersama || '-'}</td>
                    <td className="py-2.5 px-1 text-center font-mono">{item.absensi.share_eflayer || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono font-black text-blue-800 bg-blue-50/40">
                      {item.absensi.rataRata || '-'}
                    </td>

                    {/* 3. Yayasan */}
                    <td className="py-2.5 px-1.5 text-center font-mono">{item.yayasan.milad || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono">{item.yayasan.talim || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono">{item.yayasan.sosialisasi || '-'}</td>
                    <td className="py-2.5 px-1.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/40">
                      {item.yayasan.rataRata || '-'}
                    </td>

                    {/* 4. Adab */}
                    <td className="py-2.5 px-1.5 text-center font-mono font-black text-indigo-800 bg-indigo-50/40">
                      {item.adab.rataRata || '-'}
                    </td>
                    <td className="py-2.5 px-1 text-center text-[10px] text-slate-500 font-mono">
                      {item.peerReviewCount}
                    </td>

                    {/* Jumlah */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 bg-slate-50">
                      {item.jumlah}
                    </td>

                    {/* Nilai Akhir */}
                    <td className="py-2.5 px-2 text-center font-mono font-black text-purple-950 bg-purple-100/50">
                      {item.rata_rata > 0 ? item.rata_rata : '-'}
                    </td>

                    {/* Kategori */}
                    <td className="py-2.5 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${getKategoriBadge(item.kategori)}`}>
                        {item.kategori}
                      </span>
                    </td>

                    {/* Aksi: Cetak Rapor & Detail */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectTeacherForPrint(item.teacher)}
                          className="px-2 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Cetak lembar Rapor resmi untuk guru ini"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Cetak</span>
                        </button>
                        <button
                          onClick={() => setSelectedDetail(item)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                          title="Lihat rincian lengkap"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                  Rincian Rapor Kinerja Diktendik
                </span>
                <h3 className="text-lg font-black text-white">{selectedDetail.teacher.nama}</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  NIP: {selectedDetail.teacher.nip} • Mapel: {selectedDetail.teacher.mapel || 'Guru'} • TA {academicYear} (1 Tahun Kalender Penuh)
                </p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-bold uppercase block">1. Supervisi</span>
                  <span className="text-xl font-black text-purple-900">{selectedDetail.supervisi.rataRata || '-'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">2. Absensi</span>
                  <span className="text-xl font-black text-blue-900">{selectedDetail.absensi.rataRata || '-'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">3. Yayasan</span>
                  <span className="text-xl font-black text-emerald-900">{selectedDetail.yayasan.rataRata || '-'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase block">4. Adab</span>
                  <span className="text-xl font-black text-indigo-900">{selectedDetail.adab.rataRata || '-'}</span>
                </div>
              </div>

              {/* Nilai Akhir & Predikat Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nilai Akhir Rapor</span>
                  <span className="text-2xl font-black text-purple-300">{selectedDetail.rata_rata}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Kategori Mutu</span>
                  <span className="text-lg font-black text-emerald-400">{selectedDetail.kategoriLabel}</span>
                </div>
              </div>

              {/* Rincian 8 Indikator Adab & Etika */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-indigo-200/60 pb-1.5">
                  <span>Rincian 8 Indikator Adab &amp; Etika Sejawat ({selectedDetail.peerReviewCount} Rekan Penilai):</span>
                  <span className="font-mono font-black text-indigo-800">Rata-rata: {selectedDetail.adab.rataRata || '-'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4a. Komunikasi Pimpinan</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.komunikasi_pimpinan || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4b. Komunikasi Siswa</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.komunikasi_siswa || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4c. Komunikasi Orang Tua</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.komunikasi_ortu || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4d. Komunikasi Rekan Sejawat</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.komunikasi_sejawat || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4e. Ketentuan Seragam</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.seragam || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4f. Busana Sesuai Adab</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.adab_pakaian || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4g. Ketaatan Tugas</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.ketaatan_tugas || '-'}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-slate-600">4h. Dandanan &amp; Kerapian</span>
                    <strong className="font-mono text-indigo-900">{selectedDetail.adab.dandanan || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    const t = selectedDetail.teacher;
                    setSelectedDetail(null);
                    onSelectTeacherForPrint(t);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Buka Lembar Cetak Rapor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
