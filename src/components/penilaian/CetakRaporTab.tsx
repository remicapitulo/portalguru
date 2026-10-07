import React, { useState, useRef } from 'react';
import {
  Download,
  Loader2,
  GraduationCap,
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
  // Jika akun Guru: HANYA bisa melihat dan mencetak rapor diri sendiri
  const isTeacherOnly = !isAdmin;

  const evaluatedTeachers = allTeachers.filter(
    (t) => t.nip !== 'admin' && t.nama && t.nama.trim().length > 2 && !penilaianService.isHeadmaster(t, config)
  );

  const [selectedNip, setSelectedNip] = useState<string>(() => {
    if (isTeacherOnly && currentUser) return currentUser.nip;
    if (initialSelectedTeacher) return initialSelectedTeacher.nip;
    return evaluatedTeachers[0]?.nip || '';
  });

  // Untuk akun guru, selectedTeacher WAJIB terkunci hanya ke akun dirinya sendiri (currentUser)
  const selectedTeacher: User | null = isTeacherOnly
    ? currentUser
    : (evaluatedTeachers.find((t) => t.nip === selectedNip) || initialSelectedTeacher || evaluatedTeachers[0] || null);

  const raporData = selectedTeacher
    ? penilaianService.calculateSingleRaporDiktendik(selectedTeacher, academicYear, semester)
    : null;

  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Unduh PDF: Tampilan 100% Identik & Seragam dengan Tampilan Website Rapor
  const handleDownloadPDF = () => {
    if (!selectedTeacher || !raporData) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm

      // 1. KOP SURAT RESMI (Persis Standar Laporan Perangkat Pembelajaran)
      if (config.school_logo_url) {
        try {
          doc.addImage(config.school_logo_url, 'PNG', (pageWidth - 14) / 2, 7, 14, 14);
        } catch {
          // Logo fallback jika link eksternal tidak dapat dimuat
        }
      }

      const startTextY = config.school_logo_url ? 24.5 : 12;

      // Baris 1: Yayasan Perguruan Islam Pondok Duta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(
        (config.foundation_name || 'YAYASAN PERGURUAN ISLAM PONDOK DUTA').toUpperCase(),
        pageWidth / 2,
        startTextY,
        { align: 'center' }
      );

      // Baris 2: Nama Sekolah (SMPIT PONDOK DUTA)
      doc.setFontSize(13.5);
      doc.setTextColor(23, 37, 84); // blue-950
      doc.text(
        (config.school_name || 'SMPIT PONDOK DUTA').toUpperCase(),
        pageWidth / 2,
        startTextY + 5.5,
        { align: 'center' }
      );

      // Baris 3: Alamat Sekolah
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(
        config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat',
        pageWidth / 2,
        startTextY + 10,
        { align: 'center' }
      );

      // Baris 4: NPSN, Website, & Status
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(
        `NPSN: ${config.npsn || '20276180'}  •  Website: smpitpondokduta.sch.id  •  Status: Terakreditasi A`,
        pageWidth / 2,
        startTextY + 14,
        { align: 'center' }
      );

      // Garis Ganda Kop Surat (borderBottom 3.5px double style)
      const lineY = startTextY + 16.5;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(14, lineY, pageWidth - 14, lineY);
      doc.setLineWidth(0.3);
      doc.line(14, lineY + 1.2, pageWidth - 14, lineY + 1.2);

      // 2. DOKUMEN TITLE
      const titleY = lineY + 6.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      doc.text('RAPOR PENILAIAN KINERJA DIKTENDIK', pageWidth / 2, titleY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tahun Pelajaran ${academicYear}`, pageWidth / 2, titleY + 4.5, { align: 'center' });

      // 3. IDENTITAS DIKTENDIK (Kotak Rapi Mirip Web View)
      const idBoxY = titleY + 7.5;
      const idBoxHeight = 17.5;
      doc.setFillColor(248, 250, 252); // bg-slate-50
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.setLineWidth(0.3);
      doc.roundedRect(14, idBoxY, pageWidth - 28, idBoxHeight, 2.5, 2.5, 'FD');

      const colLeftLabel = 18;
      const colLeftVal = 44;
      const colRightLabel = 108;
      const colRightVal = 138;

      // Baris Identitas 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Nama Lengkap', colLeftLabel, idBoxY + 5);
      doc.setTextColor(15, 23, 42);
      doc.text(`:  ${selectedTeacher.nama}`, colLeftVal, idBoxY + 5);

      doc.setTextColor(100, 116, 139);
      doc.text('Tahun Pelajaran', colRightLabel, idBoxY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`:  ${academicYear}`, colRightVal, idBoxY + 5);

      // Baris Identitas 2
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('NIP / ID Guru', colLeftLabel, idBoxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`:  ${selectedTeacher.nip}`, colLeftVal, idBoxY + 10);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Semester', colRightLabel, idBoxY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`:  ${semester}`, colRightVal, idBoxY + 10);

      // Baris Identitas 3
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Tugas / Mapel', colLeftLabel, idBoxY + 15);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`:  ${selectedTeacher.mapel || 'Guru Mata Pelajaran'}`, colLeftVal, idBoxY + 15);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Tanggal Cetak', colRightLabel, idBoxY + 15);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`:  ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, colRightVal, idBoxY + 15);

      // 4. TABEL PENILAIAN 4 ASPEK (Exact Match Format Website)
      const tableStartY = idBoxY + idBoxHeight + 3;

      const tableHead = [
        ['No', 'Komponen & Indikator Kinerja', 'Skor Riil', 'Rata-rata Sub', 'Kategori']
      ];

      const tableRows: any[] = [
        // 1. Supervisi
        [
          { content: 'I', styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 243, 255], textColor: [88, 28, 135] } },
          { content: 'SUPERVISI PEMBELAJARAN & ADMINISTRASI', styles: { fontStyle: 'bold', fillColor: [245, 243, 255], textColor: [88, 28, 135] } },
          { content: '-', styles: { halign: 'center', fillColor: [245, 243, 255], textColor: [148, 163, 184] } },
          { content: `${raporData.supervisi.rataRata || '-'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 243, 255], textColor: [88, 28, 135] } },
          { content: `${raporData.supervisi.rataRata >= 85 ? 'Amat Baik' : 'Cukup'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 243, 255], textColor: [88, 28, 135] } },
        ],
        [
          { content: '1a', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • KBM (Kegiatan Belajar Mengajar di Kelas)', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.supervisi.kbm || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '1b', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Kelengkapan Administrasi (Modul Ajar, Prota, Promes, Jurnal)', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.supervisi.administrasi || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],

        // 2. Absensi
        [
          { content: 'II', styles: { fontStyle: 'bold', halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
          { content: 'KEDISIPLINAN & ABSENSI', styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
          { content: '-', styles: { halign: 'center', fillColor: [239, 246, 255], textColor: [148, 163, 184] } },
          { content: `${raporData.absensi.rataRata || '-'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
          { content: `${raporData.absensi.rataRata >= 85 ? 'Disiplin' : 'Cukup'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
        ],
        [
          { content: '2a', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Tingkat Kehadiran Jam Dinas & Mengajar', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.absensi.kehadiran || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '2b', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Ketepatan Waktu (Keterlambatan)', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.absensi.keterlambatan || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '2c', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Kedisiplinan Jam Kepulangan', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.absensi.kepulangan || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '2d', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Keikutsertaan Doa Bersama Pagi', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.absensi.doa_bersama || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '2e', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Broadcast / Share Eflyer Media Sosial Sekolah', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.absensi.share_eflayer || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],

        // 3. Yayasan
        [
          { content: 'III', styles: { fontStyle: 'bold', halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
          { content: 'PARTISIPASI KEGIATAN YAYASAN PONDOK DUTA', styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
          { content: '-', styles: { halign: 'center', fillColor: [236, 253, 245], textColor: [148, 163, 184] } },
          { content: `${raporData.yayasan.rataRata || '-'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
          { content: `${raporData.yayasan.rataRata >= 85 ? 'Aktif' : 'Cukup'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [236, 253, 245], textColor: [6, 78, 59] } },
        ],
        [
          { content: '3a', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Kehadiran Milad Yayasan Pondok Duta', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.yayasan.milad || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '3b', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Keaktifan Ta\'lim / Kajian Rutin Yayasan', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.yayasan.talim || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '3c', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Sosialisasi & Agenda Kegiatan Yayasan', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.yayasan.sosialisasi || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],

        // 4. Adab
        [
          { content: 'IV', styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [49, 46, 129] } },
          { content: `ADAB, ETIKA & KETELADANAN (${raporData.peerReviewCount} Rekan Penilai)`, styles: { fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [49, 46, 129] } },
          { content: '-', styles: { halign: 'center', fillColor: [238, 242, 255], textColor: [148, 163, 184] } },
          { content: `${raporData.adab.rataRata || '-'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [49, 46, 129] } },
          { content: `${raporData.adab.rataRata >= 85 ? 'Terpuji' : 'Cukup'}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [49, 46, 129] } },
        ],
        [
          { content: '4a', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Komunikasi Kepada Pimpinan', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.komunikasi_pimpinan || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4b', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Komunikasi Kepada Siswa', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.komunikasi_siswa || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4c', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Komunikasi Kepada Orang Tua Siswa', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.komunikasi_ortu || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4d', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Komunikasi Kepada Teman Sejawat', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.komunikasi_sejawat || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4e', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Berpakaian Sesuai Ketentuan Seragam', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.seragam || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4f', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Berpakaian Sesuai Adab Islami', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.adab_pakaian || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4g', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Ketaatan Menjalankan Tugas', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.ketaatan_tugas || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],
        [
          { content: '4h', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '    • Kerapian Dandanan & Penampilan', styles: { textColor: [30, 41, 59] } },
          { content: `${raporData.adab.dandanan || '-'}`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
          { content: '-', styles: { halign: 'center', textColor: [148, 163, 184] } },
        ],

        // Baris Total
        [
          {
            content: 'TOTAL JUMLAH SKOR KINERJA',
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] }
          },
          {
            content: `${raporData.jumlah}`,
            colSpan: 3,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8.5 }
          }
        ],

        // Baris Nilai Akhir
        [
          {
            content: 'NILAI AKHIR RAPOR DIKTENDIK',
            colSpan: 2,
            styles: { halign: 'right', fontStyle: 'bold', fillColor: [88, 28, 135], textColor: [255, 255, 255] }
          },
          {
            content: `${raporData.rata_rata}`,
            colSpan: 2,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [88, 28, 135], textColor: [255, 255, 255], fontSize: 9 }
          },
          {
            content: `Kategori ${raporData.kategori}`,
            colSpan: 1,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [88, 28, 135], textColor: [253, 224, 71] }
          }
        ]
      ];

      autoTable(doc, {
        head: tableHead,
        body: tableRows,
        startY: tableStartY,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 0.95,
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: [46, 16, 101], // purple-950
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 96, halign: 'left' },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 26, halign: 'center' },
          4: { cellWidth: 26, halign: 'center' },
        },
      });

      const finalTableY = (doc as any).lastAutoTable?.finalY || 162;

      // 5. CATATAN / EVALUASI PIMPINAN (Kotak Abu-Abu Rapi)
      const noteY = finalTableY + 3.5;
      const noteHeight = 13;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, noteY, pageWidth - 28, noteHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('CATATAN / EVALUASI PIMPINAN:', 18, noteY + 4);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      const catText = `"${raporData.catatanYayasan || 'Semoga Allah SWT senantiasa memberikan keberkahan dan kemudahan dalam menjalankan amanah mendidik generasi rabbani di SMPIT Pondok Duta.'}"`;
      doc.text(catText, 18, noteY + 8.5, { maxWidth: pageWidth - 36 });

      // 6. TANDA TANGAN RESMI KEPALA SEKOLAH
      const signY = noteY + noteHeight + 4;
      const colRight = pageWidth - 45;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Depok, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        colRight,
        signY,
        { align: 'center' }
      );
      doc.text('Kepala Sekolah,', colRight, signY + 4, { align: 'center' });

      const headmasterName = config.headmaster || 'Abu Haripin, M.Pd';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(headmasterName, colRight, signY + 16.5, { align: 'center' });

      // Garis bawah nama kepala sekolah
      const nameWidth = doc.getTextWidth(headmasterName);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.25);
      doc.line(colRight - nameWidth / 2, signY + 17.5, colRight + nameWidth / 2, signY + 17.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`NIP: ${config.headmaster_nip || '03.18.10.49'}`, colRight, signY + 21, { align: 'center' });

      const safeName = (selectedTeacher.nama || 'Guru').replace(/[^a-zA-Z0-9]/g, '_');
      const safeYear = (academicYear || '2026_2027').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Rapor_Diktendik_${safeName}_${safeYear}.pdf`);
    } catch (err) {
      console.error('Gagal menghasilkan PDF Rapor:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Picker & Navigation Bar (hidden on print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 shrink-0">
              Pilih Diktendik:
            </label>
            <select
              value={selectedNip}
              onChange={(e) => setSelectedNip(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:border-purple-600 outline-none cursor-pointer min-w-[220px]"
            >
              {evaluatedTeachers.map((t) => (
                <option key={t.nip} value={t.nip}>
                  {t.nama} ({t.mapel || 'Guru'})
                </option>
              ))}
            </select>

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
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lembar Rapor Kinerja Pribadi Anda
              </span>
              <strong className="text-xs font-black text-slate-900 block">
                {currentUser?.nama || 'Guru'} <span className="font-normal text-slate-500 font-mono">({currentUser?.nip})</span>
              </strong>
            </div>
          </div>
        )}

        {/* Tombol Unduh PDF */}
        <div className="flex items-center">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
            ) : (
              <Download className="w-4 h-4 text-purple-200" />
            )}
            <span>{isDownloading ? 'Memproses PDF...' : 'Unduh PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet View: Styled as standard official A4 paper */}
      {selectedTeacher && raporData ? (
        <div ref={sheetRef} className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 text-slate-900">
          {/* KOP SURAT RESMI (Persis Standar Laporan Perangkat Pembelajaran) */}
          <div
            className="pb-3 text-center relative"
            style={{
              borderBottom: '3.5px double #0f172a',
              marginBottom: '14px',
            }}
          >
            {/* Logo Sekolah */}
            {config.school_logo_url ? (
              <div className="w-14 h-14 mx-auto mb-1.5 flex items-center justify-center">
                <img
                  src={config.school_logo_url}
                  alt="Logo Sekolah"
                  className="max-h-14 max-w-14 object-contain mx-auto"
                  crossOrigin="anonymous"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 mx-auto mb-1.5 rounded-xl text-white flex items-center justify-center font-bold shadow-xs bg-blue-900"
              >
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
            )}

            {/* Baris 1: Yayasan Perguruan Islam Pondok Duta */}
            <h2
              className="font-black uppercase tracking-tight font-serif text-slate-900 text-sm sm:text-base leading-tight m-0"
            >
              {(config.foundation_name || 'Yayasan Perguruan Islam Pondok Duta').toUpperCase()}
            </h2>

            {/* Baris 2: Nama Sekolah */}
            <h1
              className="font-black uppercase tracking-wide text-blue-950 text-base sm:text-lg leading-tight my-0.5"
            >
              {(config.school_name || 'SMPIT PONDOK DUTA').toUpperCase()}
            </h1>

            {/* Baris 3: Alamat Sekolah */}
            <p
              className="font-medium text-slate-700 text-[11px] leading-tight my-0.5"
            >
              {config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat'}
            </p>

            {/* Baris 4: NPSN, Website, & Status */}
            <p
              className="font-mono font-semibold text-slate-600 text-[10px] leading-tight mt-0.5"
            >
              NPSN: {config.npsn || '20276180'} &nbsp;•&nbsp; Website: smpitpondokduta.sch.id &nbsp;•&nbsp; Status: Terakreditasi A
            </p>
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
                <span className="w-32 font-bold text-slate-500">Semester</span>
                <span className="font-semibold text-slate-800">: {semester}</span>
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
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4a</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Komunikasi Kepada Pimpinan</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.komunikasi_pimpinan || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4b</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Komunikasi Kepada Siswa</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.komunikasi_siswa || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4c</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Komunikasi Kepada Orang Tua Siswa</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.komunikasi_ortu || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4d</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Komunikasi Kepada Teman Sejawat</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.komunikasi_sejawat || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4e</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Berpakaian Sesuai Ketentuan Seragam</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.seragam || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4f</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Berpakaian Sesuai Adab Islami</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.adab_pakaian || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4g</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Ketaatan Menjalankan Tugas</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.ketaatan_tugas || '-'}</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-3 text-center border border-slate-200 text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-center text-slate-400 border border-slate-200">4h</td>
                  <td className="py-1.5 px-3 pl-6 border border-slate-200">Kerapian Dandanan &amp; Penampilan</td>
                  <td className="py-1.5 px-3 text-center font-mono border border-slate-200">{raporData.adab.dandanan || '-'}</td>
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

          {/* TANDA TANGAN RESMI: HANYA KEPALA SEKOLAH SAJA */}
          <div className="pt-4 border-t border-slate-200 text-xs flex justify-end">
            <div className="text-center min-w-[220px]">
              <p className="font-medium text-slate-600 mb-1">
                Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="font-medium text-slate-600 mb-20">Kepala Sekolah,</p>
              <p className="font-bold text-slate-900 underline underline-offset-4 text-sm">
                {config.headmaster || 'Abu Haripin, M.Pd'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                NIP: {config.headmaster_nip || '03.18.10.49'}
              </p>
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
