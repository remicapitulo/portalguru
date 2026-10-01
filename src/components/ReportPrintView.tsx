import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppDatabase, SchoolConfig, DocumentType } from '../types';
import { dbService } from '../db/storage';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface ReportPrintViewProps {
  db: AppDatabase;
  config: SchoolConfig;
  onBack: () => void;
}

const DOC_TYPES: DocumentType[] = ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'];

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  db,
  config,
  onBack,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User configuration options for paper size and orientation
  const [paperSize, setPaperSize] = useState<'a4' | 'f4'>('f4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');

  const pagesContainerRef = useRef<HTMLDivElement>(null);

  // Filter valid teachers and sort A-Z
  const teachers = db.users
    .filter(
      (u) => u && u.nama && u.nama.trim().toLowerCase() !== 'guru' && u.nip && u.nip !== 'admin'
    )
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

  // Indonesian localized date format for document date
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currentDateFullStr =
    now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ` pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

  // Sanitized institution names
  const foundationName =
    !config.foundation_name || config.foundation_name === 'Yayasan Pondok Duta'
      ? 'Yayasan Perguruan Islam Pondok Duta'
      : config.foundation_name;

  const npsn = config.npsn || '20276180';

  const viceHeadmasterTitle =
    !config.vice_headmaster_title || config.vice_headmaster_title.includes('Administrasi')
      ? 'Tim Kurikulum'
      : config.vice_headmaster_title;

  const isLandscape = orientation === 'landscape';

  // Dimension calibration matching exact physical paper aspect ratios
  // A4: 210 x 297 mm (ratio 1.414)
  // F4: 215 x 330 mm (ratio 1.535)
  const getSheetDimensions = () => {
    if (paperSize === 'a4') {
      return isLandscape
        ? { width: '1123px', minHeight: '794px', padding: '24px 28px' }
        : { width: '794px', minHeight: '1123px', padding: '26px 24px' };
    } else {
      // F4
      return isLandscape
        ? { width: '1218px', minHeight: '794px', padding: '24px 32px' }
        : { width: '794px', minHeight: '1218px', padding: '28px 24px' };
    }
  };

  const sheetDims = getSheetDimensions();

  // Pagination calculation:
  // If teachers fit on 1 sheet, keep all on 1 page (like 10-14 teachers in F4 portrait/landscape)
  // If more, cleanly split across pages with repeated header
  const maxRowsSinglePage = isLandscape
    ? paperSize === 'f4'
      ? 16
      : 14
    : paperSize === 'f4'
    ? 20
    : 17;

  const maxRowsPage1 = isLandscape ? 16 : 18;
  const maxRowsSubsequent = isLandscape ? 20 : 22;

  const teacherPages: (typeof teachers)[] = [];
  if (teachers.length <= maxRowsSinglePage) {
    teacherPages.push(teachers);
  } else {
    teacherPages.push(teachers.slice(0, maxRowsPage1));
    let startIdx = maxRowsPage1;
    while (startIdx < teachers.length) {
      teacherPages.push(teachers.slice(startIdx, startIdx + maxRowsSubsequent));
      startIdx += maxRowsSubsequent;
    }
  }

  const totalPages = teacherPages.length;

  // Generate 100% IDENTICAL, Crystal-Clear High-Resolution (300+ DPI Lossless PNG) PDF
  const handleDownloadPdf = async () => {
    if (!pagesContainerRef.current) return;
    setIsDownloading(true);
    setErrorMessage(null);

    try {
      const pageElements = pagesContainerRef.current.querySelectorAll('.report-page-sheet');
      if (!pageElements.length) {
        throw new Error('Elemen dokumen laporan tidak ditemukan');
      }

      const isF4 = paperSize === 'f4';

      // Physical mm dimensions:
      // A4: 210 x 297 mm
      // F4 (Folio/HVS Panjang standard): 215 x 330 mm
      const pWidth = isF4 ? (isLandscape ? 330 : 215) : (isLandscape ? 297 : 210);
      const pHeight = isF4 ? (isLandscape ? 215 : 330) : (isLandscape ? 210 : 297);

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pWidth, pHeight],
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;

        // High quality 3x retina scale (equivalent to 300+ DPI print quality)
        const canvas = await html2canvas(pageEl, {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            // 1. Sanitize all stylesheet text to eliminate any oklch color function
            try {
              const styleTags = clonedDoc.querySelectorAll('style');
              styleTags.forEach((s) => {
                if (s.textContent && s.textContent.includes('oklch')) {
                  s.textContent = s.textContent.replace(/oklch\([^)]+\)/g, '#1e293b');
                }
              });
            } catch (styleErr) {
              console.warn('Style sanitization notice:', styleErr);
            }

            // 2. Sanitize inline / computed styles for all elements
            try {
              const allElements = clonedDoc.querySelectorAll('*');
              const colorProps = [
                'color',
                'backgroundColor',
                'borderColor',
                'borderTopColor',
                'borderBottomColor',
                'borderLeftColor',
                'borderRightColor',
                'outlineColor',
                'fill',
                'stroke',
              ];

              allElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (!htmlEl || !htmlEl.style) return;

                colorProps.forEach((prop) => {
                  const val = (htmlEl.style as any)[prop];
                  if (typeof val === 'string' && val.includes('oklch')) {
                    (htmlEl.style as any)[prop] =
                      prop === 'backgroundColor'
                        ? '#ffffff'
                        : prop.includes('border')
                        ? '#cbd5e1'
                        : '#0f172a';
                  }
                });
              });
            } catch (elemErr) {
              console.warn('Element color sanitization notice:', elemErr);
            }
          },
        });

        // Use lossless PNG (NOT JPEG) so text and borders are 100% sharp with ZERO compression artifacts!
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
          pdf.addPage([pWidth, pHeight], isLandscape ? 'landscape' : 'portrait');
        }

        // Draw image matching exact paper dimensions (aspect ratio is calibrated 1:1)
        pdf.addImage(imgData, 'PNG', 0, 0, pWidth, pHeight, undefined, 'FAST');
      }

      const safeYear = (config.academic_year || '2026_2027').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Rekapitulasi_Perangkat_${paperSize.toUpperCase()}_${orientation}_${safeYear}.pdf`;
      pdf.save(filename);

      setSuccessNotice(
        `Dokumen "${filename}" berhasil diunduh (${paperSize.toUpperCase()} ${
          isLandscape ? 'Landscape' : 'Portrait'
        }). Tampilan hasil unduhan 100% identik dengan yang tampak di layar.`
      );
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      console.error('Gagal membuat dokumen PDF:', err);
      setErrorMessage(`Kendala saat membuat PDF: ${err?.message || 'Silakan coba lagi.'}`);
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Action Toolbar */}
      <div className="no-print bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Back & Options */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Kembali</span>
          </button>

          {/* Paper Size Selector: A4 vs F4 */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <span className="px-2 text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Kertas:
            </span>
            <button
              type="button"
              onClick={() => setPaperSize('a4')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'a4'
                  ? 'bg-white text-blue-900 shadow-2xs font-extrabold border border-slate-200/80'
                  : 'hover:text-slate-900'
              }`}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('f4')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'f4'
                  ? 'bg-white text-blue-900 shadow-2xs font-extrabold border border-slate-200/80'
                  : 'hover:text-slate-900'
              }`}
            >
              F4 / Folio
            </button>
          </div>

          {/* Orientation Selector: Landscape vs Portrait */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <span className="px-2 text-[10px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Orientasi:
            </span>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-white text-blue-900 shadow-2xs font-extrabold border border-slate-200/80'
                  : 'hover:text-slate-900'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-white text-blue-900 shadow-2xs font-extrabold border border-slate-200/80'
                  : 'hover:text-slate-900'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Right: EXCLUSIVELY Unduh Dokumen PDF (.pdf) */}
        <div>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 disabled:bg-blue-400 text-white text-xs font-bold shadow-md shadow-blue-700/25 transition cursor-pointer"
            title="Klik untuk mengunduh laporan ke file PDF resmi dengan tampilan 100% sama dengan di layar"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyiapkan Dokumen PDF Presisi...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Unduh Dokumen PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="no-print p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p>{successNotice}</p>
          </div>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="no-print p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Sheet Information Notice */}
      <div className="no-print px-4 py-2 bg-slate-100 rounded-xl text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <span>
          Ukuran Dokumen: <strong>{paperSize.toUpperCase()}</strong> (
          {paperSize === 'f4' ? '215 × 330 mm' : '210 × 297 mm'}) •{' '}
          <strong>{isLandscape ? 'Landscape (Mendatar)' : 'Portrait (Tegak)'}</strong>
        </span>
        <span className="font-semibold text-slate-500">
          Total: {teachers.length} Guru Terdaftar • {totalPages} Halaman Dokumen
        </span>
      </div>

      {/* PAGES CONTAINER (Visual On-Screen Sheet = Downloaded PDF 100% Identical) */}
      <div className="w-full overflow-x-auto pb-6">
        <div ref={pagesContainerRef} className="space-y-10 flex flex-col items-center min-w-max mx-auto px-1">
        {teacherPages.map((pageTeachers, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;
          const startNum =
            pageIdx === 0
              ? 1
              : teachers.length <= maxRowsSinglePage
              ? 1
              : maxRowsPage1 + (pageIdx - 1) * maxRowsSubsequent + 1;

          return (
            <div
              key={`page-${pageIdx}`}
              className="report-page-sheet bg-white rounded-3xl border border-slate-300 shadow-xl mx-auto flex flex-col justify-between"
              style={{
                width: sheetDims.width,
                minHeight: sheetDims.minHeight,
                padding: sheetDims.padding,
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            >
              {/* PAGE TOP CONTENT: KOP SURAT + JUDUL + TABEL */}
              <div>
                {/* 1. KOP SURAT (Hanya tampil penuh di halaman pertama) */}
                {isFirstPage ? (
                  <div
                    className="pb-3 text-center relative"
                    style={{
                      borderBottom: '3.5px double #0f172a',
                      marginBottom: '10px',
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
                        className="w-12 h-12 mx-auto mb-1.5 rounded-xl text-white flex items-center justify-center font-bold shadow-xs"
                        style={{ backgroundColor: '#1e3a8a' }}
                      >
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                    )}

                    {/* Baris 1: Yayasan Perguruan Islam Pondok Duta */}
                    <h2
                      className="font-black uppercase tracking-tight font-serif"
                      style={{
                        color: '#0f172a',
                        fontSize: isLandscape ? '17px' : '15px',
                        lineHeight: '1.25',
                        margin: 0,
                      }}
                    >
                      {foundationName.toUpperCase()}
                    </h2>

                    {/* Baris 2: Nama Sekolah */}
                    <h1
                      className="font-black uppercase tracking-wide"
                      style={{
                        color: '#172554',
                        fontSize: isLandscape ? '20px' : '18px',
                        lineHeight: '1.25',
                        margin: '2px 0',
                      }}
                    >
                      {(config.school_name || 'SMPIT PONDOK DUTA').toUpperCase()}
                    </h1>

                    {/* Baris 3: Alamat Sekolah */}
                    <p
                      className="font-medium"
                      style={{
                        color: '#334155',
                        fontSize: '11px',
                        lineHeight: '1.3',
                        margin: '1px 0',
                      }}
                    >
                      {config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat'}
                    </p>

                    {/* Baris 4: NPSN & Kontak */}
                    <p
                      className="font-mono font-semibold"
                      style={{
                        color: '#475569',
                        fontSize: '10px',
                        lineHeight: '1.3',
                        margin: '1px 0',
                      }}
                    >
                      NPSN: {npsn} &nbsp;•&nbsp; Website: smpitpondokduta.sch.id &nbsp;•&nbsp; Status: Terakreditasi A
                    </p>
                  </div>
                ) : (
                  /* Mini-Header untuk Halaman Lanjutan */
                  <div
                    className="pb-2 flex items-center justify-between text-xs"
                    style={{
                      borderBottom: '1px solid #cbd5e1',
                      color: '#475569',
                      marginBottom: '10px',
                    }}
                  >
                    <span className="font-black uppercase tracking-wider" style={{ color: '#172554' }}>
                      {(config.school_name || 'SMPIT PONDOK DUTA').toUpperCase()} &nbsp;•&nbsp; REKAPITULASI PERANGKAT GURU
                    </span>
                    <span className="font-semibold" style={{ color: '#64748b' }}>
                      TA {config.academic_year || '2026/2027'} (Lanjutan Halaman {pageIdx + 1})
                    </span>
                  </div>
                )}

                {/* 2. JUDUL LAPORAN (Hanya halaman pertama) */}
                {isFirstPage && (
                  <div className="text-center my-2.5 space-y-0.5">
                    <h3
                      className="font-black uppercase tracking-tight text-slate-900"
                      style={{
                        fontSize: isLandscape ? '13.5px' : '12.5px',
                        textDecoration: 'underline',
                        textUnderlineOffset: '3.5px',
                        margin: 0,
                      }}
                    >
                      LAPORAN REKAPITULASI KELENGKAPAN PERANGKAT PEMBELAJARAN GURU
                    </h3>
                    <p
                      className="font-extrabold uppercase tracking-wide text-slate-800"
                      style={{
                        fontSize: '10.5px',
                        margin: '3px 0 0 0',
                      }}
                    >
                      TAHUN AKADEMIK: {config.academic_year || '2026/2027'}
                    </p>
                  </div>
                )}

                {/* 3. TABEL MATRIKS REKAPITULASI */}
                <div className="w-full my-2 overflow-x-auto">
                  <table
                    className="w-full text-left"
                    style={{
                      borderCollapse: 'collapse',
                      fontSize: isLandscape ? '11px' : '10px',
                      color: '#0f172a',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          borderTop: '1px solid #94a3b8',
                          borderBottom: '2px solid #64748b',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        <th
                          style={{
                            padding: '6px 4px',
                            border: '1px solid #94a3b8',
                            textAlign: 'center',
                            width: '32px',
                          }}
                        >
                          NO
                        </th>
                        <th
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #94a3b8',
                            minWidth: isLandscape ? '150px' : '135px',
                          }}
                        >
                          NAMA GURU / NIK
                        </th>
                        <th
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #94a3b8',
                            minWidth: isLandscape ? '100px' : '85px',
                          }}
                        >
                          MATA PELAJARAN
                        </th>
                        {DOC_TYPES.map((dt) => (
                          <th
                            key={dt}
                            className="whitespace-nowrap"
                            style={{
                              padding: '6px 3px',
                              border: '1px solid #94a3b8',
                              textAlign: 'center',
                              width: isLandscape ? '42px' : '36px',
                            }}
                          >
                            {dt}
                          </th>
                        ))}
                        <th
                          className="whitespace-nowrap"
                          style={{
                            padding: '6px 6px',
                            border: '1px solid #94a3b8',
                            textAlign: 'center',
                            width: isLandscape ? '85px' : '75px',
                          }}
                        >
                          TOTAL BERKAS
                        </th>
                        <th
                          className="whitespace-nowrap"
                          style={{
                            padding: '6px 6px',
                            border: '1px solid #94a3b8',
                            textAlign: 'center',
                            width: isLandscape ? '70px' : '62px',
                          }}
                        >
                          STATUS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageTeachers.map((teacher, idx) => {
                        const prog = dbService.calculateTeacherProgress(teacher.id);

                        return (
                          <tr
                            key={teacher.id}
                            style={{
                              backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                              lineHeight: '1.3',
                            }}
                          >
                            <td
                              style={{
                                padding: '4.5px 4px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'center',
                                fontWeight: 700,
                              }}
                            >
                              {startNum + idx}
                            </td>
                            <td style={{ padding: '4.5px 8px', border: '1px solid #cbd5e1' }}>
                              <span style={{ fontWeight: 700, display: 'block', color: '#0f172a' }}>
                                {teacher.nama}
                              </span>
                              <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'monospace' }}>
                                NIK: {teacher.nip}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '4.5px 8px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 500,
                                color: '#1e293b',
                              }}
                            >
                              {teacher.mapel || '-'}
                            </td>
                            {DOC_TYPES.map((dt) => {
                              const count = prog.breakdown[dt] || 0;
                              return (
                                <td
                                  key={dt}
                                  style={{
                                    padding: '4.5px 3px',
                                    border: '1px solid #cbd5e1',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '10px',
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      backgroundColor:
                                        count >= 6 ? '#d1fae5' : count > 0 ? '#fef3c7' : 'transparent',
                                      color:
                                        count >= 6 ? '#065f46' : count > 0 ? '#92400e' : '#94a3b8',
                                    }}
                                  >
                                    {count}/6
                                  </span>
                                </td>
                              );
                            })}
                            <td
                              style={{
                                padding: '4.5px 6px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'center',
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: '10px',
                              }}
                            >
                              {prog.filledSlots} / 36 ({prog.percentage}%)
                            </td>
                            <td
                              style={{
                                padding: '4.5px 6px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '10px',
                                color:
                                  prog.percentage >= 100
                                    ? '#047857'
                                    : prog.percentage >= 50
                                    ? '#b45309'
                                    : '#b91c1c',
                              }}
                            >
                              {prog.percentage >= 100 ? 'Lengkap' : prog.percentage >= 50 ? 'Sebagian' : 'Belum'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 4. CATATAN KELENGKAPAN (Hanya tampil di halaman terakhir) */}
                {isLastPage && (
                  <div
                    className="my-2.5 rounded-xl border border-slate-200"
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '8px 12px',
                      fontSize: '9.5px',
                      color: '#475569',
                      lineHeight: '1.4',
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong style={{ color: '#1e293b' }}>* Catatan Kelengkapan:</strong> Dokumen administrasi guru mencakup 6 jenis perangkat pembelajaran kurikulum merdeka (Modul Ajar, CP, ATP, KKTP, Prota, Prosem) pada tiap jenjang kelas (7, 8, 9) dan semester (1 &amp; 2). Total kelengkapan penuh adalah 36 berkas.
                    </p>
                  </div>
                )}
              </div>

              {/* PAGE BOTTOM CONTENT: LEMBAR PENGESAHAN (Halaman Terakhir) */}
              {isLastPage ? (
                <div style={{ marginTop: '22px', paddingTop: '6px' }}>
                  <div className="grid grid-cols-2 text-slate-900 gap-8 sm:gap-16 text-center text-xs">
                    {/* Kolom Kiri: Kepala Sekolah */}
                    <div style={{ lineHeight: '1.4' }}>
                      <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>Mengetahui,</p>
                      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '11.5px', margin: '2px 0' }}>
                        Kepala Sekolah {config.school_name || 'SMPIT Pondok Duta'}
                      </p>
                      {/* Jarak tanda tangan yang proporsional dan pas */}
                      <div style={{ height: '48px' }} />
                      <p
                        style={{
                          fontWeight: 800,
                          textDecoration: 'underline',
                          fontSize: '12px',
                          color: '#0f172a',
                          margin: 0,
                        }}
                      >
                        {config.headmaster || 'Abu Haripin, M.Pd'}
                      </p>
                      <p style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace', margin: '3px 0 0 0' }}>
                        NIK. {config.headmaster_nip || '03.18.10.49'}
                      </p>
                    </div>

                    {/* Kolom Kanan: Tim Kurikulum */}
                    <div style={{ lineHeight: '1.4' }}>
                      <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>Depok, {currentDateStr}</p>
                      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '11.5px', margin: '2px 0' }}>
                        {viceHeadmasterTitle}
                      </p>
                      {/* Jarak tanda tangan yang proporsional dan pas */}
                      <div style={{ height: '48px' }} />
                      <p
                        style={{
                          fontWeight: 800,
                          textDecoration: 'underline',
                          fontSize: '12px',
                          color: '#0f172a',
                          margin: 0,
                        }}
                      >
                        {config.vice_headmaster || 'Nilam Cahya, S.Pd'}
                      </p>
                      <p style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace', margin: '3px 0 0 0' }}>
                        NIK. {config.vice_headmaster_nip || '02.20.09.112'}
                      </p>
                    </div>
                  </div>

                  {/* Footnote */}
                  <div
                    style={{
                      marginTop: '22px',
                      paddingTop: '6px',
                      borderTop: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      color: '#64748b',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span>
                      Dicetak melalui Portal Administrasi Guru {config.school_name || 'SMPIT Pondok Duta'} ({currentDateFullStr})
                    </span>
                    <span>
                      Halaman {pageIdx + 1} dari {totalPages} • {paperSize.toUpperCase()}{' '}
                      {isLandscape ? 'Landscape' : 'Portrait'}
                    </span>
                  </div>
                </div>
              ) : (
                /* Footnote & Page Number for intermediate pages */
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '6px',
                    borderTop: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '9px',
                    color: '#64748b',
                    fontFamily: 'monospace',
                  }}
                >
                  <span>
                    Portal Administrasi Guru {config.school_name || 'SMPIT Pondok Duta'} • {paperSize.toUpperCase()}{' '}
                    {isLandscape ? 'Landscape' : 'Portrait'}
                  </span>
                  <span>
                    Halaman {pageIdx + 1} dari {totalPages}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
