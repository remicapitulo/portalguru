import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, SchoolConfig, SemesterType } from '../../types';
import { penilaianService, INDIKATOR_PENILAIAN } from '../../db/penilaianService';

interface CetakRaporTabProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  academicYear: string;
  semester: SemesterType;
  isAdmin: boolean;
  refreshTrigger: number;
  initialSelectedTeacher?: User | null;
}

export const CetakRaporTab: React.FC<CetakRaporTabProps> = ({
  currentUser,
  config,
  allTeachers,
  academicYear,
  semester,
  isAdmin,
  refreshTrigger,
  initialSelectedTeacher,
}) => {
  const evaluatedTeachers = allTeachers.filter(
    (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2 && !penilaianService.isHeadmaster(t, config)
  );

  const [selectedNip, setSelectedNip] = useState<string>(() => {
    if (initialSelectedTeacher) return initialSelectedTeacher.nip;
    if (!isAdmin && currentUser) return currentUser.nip;
    return evaluatedTeachers[0]?.nip || '';
  });

  const selectedTeacher = evaluatedTeachers.find((t) => t.nip === selectedNip) || evaluatedTeachers[0] || null;

  const raporData = selectedTeacher
    ? penilaianService.calculateSingleRaporDiktendik(selectedTeacher, academicYear, semester)
    : null;

  const currentIndex = evaluatedTeachers.findIndex((t) => t.nip === selectedNip);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedNip(evaluatedTeachers[currentIndex - 1].nip);
    }
  };

  const handleNext = () => {
    if (currentIndex < evaluatedTeachers.length - 1) {
      setSelectedNip(evaluatedTeachers[currentIndex + 1].nip);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!selectedTeacher || !raporData) return;

    const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Surat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text((config.foundation_name || 'YAYASAN PERGURUAN ISLAM PONDOK DUTA').toUpperCase(), pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(15);
    doc.setTextColor(88, 28, 135);
    doc.text(config.school_name.toUpperCase(), pageWidth / 2, 21, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat', pageWidth / 2, 26, { align: 'center' });
    doc.text(`NPSN: ${config.npsn || '20276180'} • Status Terakreditasi "A"`, pageWidth / 2, 30, { align: 'center' });

    // Garis Ganda Kop Surat
    doc.setDrawColor(88, 28, 135);
    doc.setLineWidth(1);
    doc.line(14, 33, pageWidth - 14, 33);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 34.2, pageWidth - 14, 34.2);

    // Judul Rapor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('RAPOR PENILAIAN KINERJA PENDIDIK & TENAGA KEPENDIDIKAN (DIKTENDIK)', pageWidth / 2, 41, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Tahun Pelajaran ${academicYear}`, pageWidth / 2, 46, { align: 'center' });

    // Identitas Guru
    const identitasHeaders = [['Data Pendidik', '', 'Periode Penilaian', '']];
    const identitasRows = [
      ['Nama Lengkap', `: ${selectedTeacher.nama}`, 'Tahun Pelajaran', `: ${academicYear}`],
      ['NIP / ID', `: ${selectedTeacher.nip}`, 'Periode', ': 1 Tahun Kalender'],
      ['Jabatan / Mapel', `: ${selectedTeacher.mapel || 'Guru Mata Pelajaran'}`, 'Tanggal Cetak', `: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    ];

    autoTable(doc, {
      body: identitasRows,
      startY: 50,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 68 },
        2: { fontStyle: 'bold', cellWidth: 32 },
        3: { cellWidth: 50 },
      },
    });

    const currentY = (doc as any).lastAutoTable?.finalY || 68;

    // Tabel Penilaian 4 Aspek
    const tableHeaders = [['No', 'Komponen & Indikator Penilaian', 'Skor', 'Rata-rata Sub', 'Bobot Mutu']];
    const tableBody = [
      ['I', 'SUPERVISI PEMBELAJARAN & ADMINISTRASI', '', `${raporData.supervisi.rataRata || '-'}`, 'Baik'],
      ['1a', '  • KBM (Kegiatan Belajar Mengajar di Kelas)', `${raporData.supervisi.kbm || '-'}`, '', ''],
      ['1b', '  • Administrasi Guru (Modul Ajar, Prota, Promes, Jurnal)', `${raporData.supervisi.administrasi || '-'}`, '', ''],
      ['II', 'KEDISIPLINAN & ABSENSI', '', `${raporData.absensi.rataRata || '-'}`, 'Baik'],
      ['2a', '  • Tingkat Kehadiran', `${raporData.absensi.kehadiran || '-'}`, '', ''],
      ['2b', '  • Ketepatan Waktu (Keterlambatan)', `${raporData.absensi.keterlambatan || '-'}`, '', ''],
      ['2c', '  • Kedisiplinan Kepulangan', `${raporData.absensi.kepulangan || '-'}`, '', ''],
      ['2d', '  • Keikutsertaan Doa Bersama Pagi', `${raporData.absensi.doa_bersama || '-'}`, '', ''],
      ['2e', '  • Broadcast / Share Eflyer Media Sosial Sekolah', `${raporData.absensi.share_eflayer || '-'}`, '', ''],
      ['III', 'PARTISIPASI KEGIATAN YAYASAN PONDOK DUTA', '', `${raporData.yayasan.rataRata || '-'}`, 'Baik'],
      ['3a', '  • Kehadiran Milad Yayasan', `${raporData.yayasan.milad || '-'}`, '', ''],
      ['3b', '  • Keaktifan Ta\'lim / Pengajian Rutin Yayasan', `${raporData.yayasan.talim || '-'}`, '', ''],
      ['3c', '  • Sosialisasi & Agenda Yayasan', `${raporData.yayasan.sosialisasi || '-'}`, '', ''],
      ['IV', `ADAB & ETIKA SEJAWAT (${raporData.peerReviewCount} Rekan Penilai)`, '', `${raporData.adab.rataRata || '-'}`, 'Baik'],
      ['4', '  • Rata-rata 8 Indikator (Komunikasi, Seragam, Adab, Ketaatan)', `${raporData.adab.rataRata || '-'}`, '', ''],
      ['', 'TOTAL JUMLAH SKOR KINERJA', '', `${raporData.jumlah}`, ''],
      ['', 'NILAI AKHIR RAPOR DIKTENDIK', '', `${raporData.rata_rata}`, `Kategori: ${raporData.kategori}`],
    ];

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: currentY + 3,
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 105 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 26 },
      },
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 190;

    // Catatan Yayasan Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CATATAN / REKOMENDASI KEPALA SEKOLAH & YAYASAN:', 14, finalTableY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(raporData.catatanYayasan || 'Pertahankan dedikasi amanah mengajar, integritas dakwah, dan kedisiplinan berakhlak mulia di lingkungan SMPIT Pondok Duta.', 14, finalTableY + 12, { maxWidth: pageWidth - 28 });

    // Tanda Tangan 3 Kolom
    const signY = finalTableY + 24;
    const col1 = 30;
    const col2 = pageWidth / 2;
    const col3 = pageWidth - 45;

    doc.setFontSize(8);
    doc.text(`Depok, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, col3, signY - 5, { align: 'center' });

    doc.text('Pendidik yang Dinilai,', col1, signY, { align: 'center' });
    doc.text('Mengetahui,\nKetua Yayasan Pondok Duta,', col2, signY, { align: 'center' });
    doc.text('Kepala Sekolah,', col3, signY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(selectedTeacher.nama, col1, signY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP: ${selectedTeacher.nip}`, col1, signY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text('Pengurus Yayasan', col2, signY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Pondok Duta Depok', col2, signY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(config.headmaster || 'Abu Haripin, M.Pd', col3, signY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP: ${config.headmaster_nip || '03.18.10.49'}`, col3, signY + 26, { align: 'center' });

    doc.save(`Rapor_Diktendik_${selectedTeacher.nama.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear.replace('/', '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Teacher Picker & Navigation Bar (hidden on print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 shrink-0">
            Pilih Diktendik:
          </label>
          <select
            value={selectedNip}
            onChange={(e) => setSelectedNip(e.target.value)}
            disabled={!isAdmin && currentUser?.nip !== selectedNip}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-purple-600 outline-none cursor-pointer min-w-[220px]"
          >
            {evaluatedTeachers.map((t) => (
              <option key={t.nip} value={t.nip}>
                {t.nama} ({t.mapel || 'Guru'})
              </option>
            ))}
          </select>

          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                title="Guru Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= evaluatedTeachers.length - 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                title="Guru Selanjutnya"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>

        {/* Print & Download buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            <span>Cetak Dokumen (Print)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-purple-200" />
            <span>Unduh PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet View: Styled as standard official A4 paper */}
      {selectedTeacher && raporData ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900">
          {/* KOP SURAT RESMI */}
          <div className="border-b-2 border-purple-900 pb-3 mb-5">
            <div className="flex items-center justify-between gap-4">
              {config.school_logo_url ? (
                <img
                  src={config.school_logo_url}
                  alt="Logo Sekolah"
                  className="w-16 h-16 object-contain rounded-lg p-0.5 border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-purple-100 text-purple-900 font-black flex items-center justify-center text-xl shrink-0">
                  PD
                </div>
              )}
              <div className="text-center flex-1">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  {config.foundation_name || 'YAYASAN PERGURUAN ISLAM PONDOK DUTA'}
                </h3>
                <h1 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">
                  {config.school_name.toUpperCase()}
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat'} • NPSN: {config.npsn || '20276180'}
                </p>
                <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
                  TERAKREDITASI &bull; RAPOR PENILAIAN KINERJA PENDIDIK & TENAGA KEPENDIDIKAN
                </p>
              </div>
              <div className="w-16 shrink-0 hidden sm:block"></div>
            </div>
            {/* Double decorative border line */}
            <div className="h-0.5 bg-slate-300 mt-2"></div>
          </div>

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
              RAPOR PENILAIAN KINERJA DIKTENDIK
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Tahun Pelajaran {academicYear}
            </p>
          </div>

          {/* IDENTITAS DIKTENDIK */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">Nama Lengkap</span>
                <span className="font-black text-slate-900">: {selectedTeacher.nama}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">Tahun Pelajaran</span>
                <span className="font-semibold text-slate-800">: {academicYear}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">NIP / ID Guru</span>
                <span className="font-mono text-slate-800">: {selectedTeacher.nip}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">Periode</span>
                <span className="font-semibold text-slate-800">: 1 Tahun Kalender Penuh</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">Tugas / Mapel</span>
                <span className="font-semibold text-slate-800">: {selectedTeacher.mapel || 'Guru Mata Pelajaran'}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-500">Tanggal Cetak</span>
                <span className="font-semibold text-slate-800">: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* TABEL PENILAIAN 4 ASPEK */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-purple-950 text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 border border-purple-900 text-center w-12">No</th>
                  <th className="py-2.5 px-3 border border-purple-900">Komponen & Indikator Kinerja</th>
                  <th className="py-2.5 px-3 border border-purple-900 text-center w-24">Skor Riil</th>
                  <th className="py-2.5 px-3 border border-purple-900 text-center w-28">Rata-rata Sub</th>
                  <th className="py-2.5 px-3 border border-purple-900 text-center w-28">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. Supervisi */}
                <tr className="bg-purple-50/60 font-bold">
                  <td className="py-2 px-3 text-center border border-slate-200">I</td>
                  <td className="py-2 px-3 border border-slate-200">SUPERVISI PEMBELAJARAN & ADMINISTRASI</td>
                  <td className="py-2 px-3 text-center border border-slate-200">-</td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-purple-900 font-black">
                    {raporData.supervisi.rataRata || '-'}
                  </td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-purple-800">
                    {raporData.supervisi.rataRata >= 85 ? 'Amat Baik' : 'Cukup'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">1a</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">KBM (Kegiatan Belajar Mengajar di Kelas)</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.supervisi.kbm || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">1b</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Kelengkapan Administrasi (Modul Ajar, Prota, Promes, Jurnal)</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.supervisi.administrasi || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>

                {/* 2. Absensi */}
                <tr className="bg-blue-50/60 font-bold">
                  <td className="py-2 px-3 text-center border border-slate-200">II</td>
                  <td className="py-2 px-3 border border-slate-200">KEDISIPLINAN & ABSENSI</td>
                  <td className="py-2 px-3 text-center border border-slate-200">-</td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-blue-900 font-black">
                    {raporData.absensi.rataRata || '-'}
                  </td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-blue-800">
                    {raporData.absensi.rataRata >= 85 ? 'Disiplin' : 'Cukup'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">2a</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Tingkat Kehadiran Jam Dinas & Mengajar</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.absensi.kehadiran || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">2b</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Ketepatan Waktu (Keterlambatan)</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.absensi.keterlambatan || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">2c</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Kedisiplinan Jam Kepulangan</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.absensi.kepulangan || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">2d</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Keikutsertaan Doa Bersama Pagi</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.absensi.doa_bersama || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">2e</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Broadcast / Share Eflyer Media Sosial Sekolah</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.absensi.share_eflayer || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>

                {/* 3. Yayasan */}
                <tr className="bg-emerald-50/60 font-bold">
                  <td className="py-2 px-3 text-center border border-slate-200">III</td>
                  <td className="py-2 px-3 border border-slate-200">PARTISIPASI KEGIATAN YAYASAN PONDOK DUTA</td>
                  <td className="py-2 px-3 text-center border border-slate-200">-</td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-emerald-900 font-black">
                    {raporData.yayasan.rataRata || '-'}
                  </td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-emerald-800">
                    {raporData.yayasan.rataRata >= 85 ? 'Aktif' : 'Cukup'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">3a</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Kehadiran Milad Yayasan Pondok Duta</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.yayasan.milad || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">3b</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Keaktifan Ta'lim / Kajian Rutin Yayasan</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.yayasan.talim || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">3c</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Sosialisasi & Agenda Kegiatan Yayasan</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.yayasan.sosialisasi || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>

                {/* 4. Adab */}
                <tr className="bg-indigo-50/60 font-bold">
                  <td className="py-2 px-3 text-center border border-slate-200">IV</td>
                  <td className="py-2 px-3 border border-slate-200">
                    ADAB, ETIKA & KETELADANAN ({raporData.peerReviewCount} Rekan Penilai)
                  </td>
                  <td className="py-2 px-3 text-center border border-slate-200">-</td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-indigo-900 font-black">
                    {raporData.adab.rataRata || '-'}
                  </td>
                  <td className="py-2 px-3 text-center border border-slate-200 text-indigo-800">
                    {raporData.adab.rataRata >= 85 ? 'Terpuji' : 'Cukup'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">
                    Rata-rata 8 Indikator (Komunikasi, Busana Islami, Seragam, Ketaatan Tugas, Dandanan)
                  </td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.rataRata || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>

                {/* Ringkasan Skor Akhir */}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="py-2.5 px-4 text-right border border-slate-300">
                    TOTAL JUMLAH SKOR KINERJA
                  </td>
                  <td colSpan={3} className="py-2.5 px-4 text-center font-mono font-black text-slate-900 border border-slate-300 text-sm">
                    {raporData.jumlah}
                  </td>
                </tr>
                <tr className="bg-purple-900 text-white font-black text-sm">
                  <td colSpan={2} className="py-3 px-4 text-right border border-purple-900">
                    NILAI AKHIR RAPOR DIKTENDIK
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center font-mono text-lg border border-purple-900">
                    {raporData.rata_rata}
                  </td>
                  <td className="py-3 px-4 text-center border border-purple-900 text-amber-300 font-black">
                    Kategori {raporData.kategori}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CATATAN & REKOMENDASI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-8 text-xs">
            <span className="font-bold text-slate-700 block mb-1 uppercase tracking-wider text-[11px]">
              Catatan / Evaluasi Pimpinan:
            </span>
            <p className="text-slate-700 italic leading-relaxed">
              "{raporData.catatanYayasan || 'Semoga Allah SWT senantiasa memberikan keberkahan dan kemudahan dalam menjalankan amanah mendidik generasi rabbani di SMPIT Pondok Duta.'}"
            </p>
          </div>

          {/* TANDA TANGAN RESMI TIGA PIHAK */}
          <div className="pt-4 border-t border-slate-200 text-xs">
            <div className="text-right mb-4">
              <span className="font-medium text-slate-600">
                Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="font-medium text-slate-600 mb-16">Pendidik yang Dinilai,</p>
                <p className="font-bold text-slate-900 underline underline-offset-4">{selectedTeacher.nama}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">NIP: {selectedTeacher.nip}</p>
              </div>

              <div>
                <p className="font-medium text-slate-600 mb-16">
                  Mengetahui,<br />
                  Ketua Yayasan Pondok Duta,
                </p>
                <p className="font-bold text-slate-900 underline underline-offset-4">Pengurus Yayasan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Pondok Duta Depok</p>
              </div>

              <div>
                <p className="font-medium text-slate-600 mb-16">Kepala Sekolah,</p>
                <p className="font-bold text-slate-900 underline underline-offset-4">
                  {config.headmaster || 'Abu Haripin, M.Pd'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NIP: {config.headmaster_nip || '03.18.10.49'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-300 text-center">
          <p className="text-slate-500 text-xs">Pilih guru untuk melihat lembar rapor.</p>
        </div>
      )}
    </div>
  );
};
