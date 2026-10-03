import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  Sparkles,
  Filter,
  Users,
  Download,
  ChevronRight,
  ChevronDown,
  FileText,
  AlertCircle,
  X,
  FileCheck,
  Loader2,
  FolderOpen,
  Search
} from 'lucide-react';
import { User, DocumentType, SemesterType, GradeClass, UploadRecord, SchoolConfig } from '../types';
import { dbService } from '../db/storage';
import { spreadsheetService } from '../db/spreadsheetService';

interface PerangkatViewProps {
  currentUser: User | null;
  config: SchoolConfig;
  allTeachers: User[];
  onOpenReportPrint?: () => void;
}

const DOC_TYPES: DocumentType[] = ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'];
const SEMESTERS: SemesterType[] = ['Semester 1', 'Semester 2'];
const CLASSES: GradeClass[] = ['Kelas 7', 'Kelas 8', 'Kelas 9'];

interface UploadBatchStatus {
  isOpen: boolean;
  isUploading: boolean;
  isFinished: boolean;
  total: number;
  current: number;
  currentFileName: string;
  slotTitle: string;
  results: {
    fileName: string;
    success: boolean;
    msg?: string;
  }[];
}

export const PerangkatView: React.FC<PerangkatViewProps> = ({
  currentUser,
  config,
  allTeachers,
  onOpenReportPrint,
}) => {
  // If user is Admin, they can choose which teacher to inspect/manage. If Guru, locked to their own account.
  const isAdmin =
    currentUser?.role?.toLowerCase() === 'administrator' ||
    currentUser?.role?.toLowerCase() === 'admin' ||
    currentUser?.nip === 'admin';

  // Search filter for teacher selector
  const [teacherSearch, setTeacherSearch] = useState('');
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);
  const teacherMenuRef = useRef<HTMLDivElement | null>(null);
  const teacherInputRef = useRef<HTMLInputElement | null>(null);

  // Local reactivity trigger when records are added or deleted
  const [recordsVersion, setRecordsVersion] = useState(0);

  // Sort valid teachers alphabetically by name (A to Z)
  const validTeachers = useMemo(() => {
    return (allTeachers || [])
      .filter((t) => t && t.nama && t.nama.trim().toLowerCase() !== 'guru' && t.nip)
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }, [allTeachers]);

  // Filtered teachers list for selector
  const filteredTeachersForSelect = useMemo(() => {
    if (!teacherSearch.trim()) return validTeachers;
    const q = teacherSearch.toLowerCase();
    return validTeachers.filter(
      (t) =>
        (t.nama && t.nama.toLowerCase().includes(q)) ||
        (t.nip && t.nip.toLowerCase().includes(q)) ||
        (t.mapel && t.mapel.toLowerCase().includes(q))
    );
  }, [validTeachers, teacherSearch]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    currentUser && !isAdmin ? currentUser.nip || currentUser.id : validTeachers[0]?.nip || validTeachers[0]?.id || ''
  );

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (teacherMenuRef.current && !teacherMenuRef.current.contains(event.target as Node)) {
        setIsTeacherMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTeacherMenuOpen(false);
      }
    };
    if (isTeacherMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTeacherMenuOpen]);

  const [activeDocFilter, setActiveDocFilter] = useState<DocumentType | 'ALL'>('ALL');
  const [activeSemFilter, setActiveSemFilter] = useState<SemesterType | 'ALL'>('ALL');
  const [activeClassFilter, setActiveClassFilter] = useState<GradeClass | 'ALL'>('ALL');

  // Multi-file upload reference & target slot
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTargetSlot, setActiveTargetSlot] = useState<{
    docType: DocumentType;
    semester: SemesterType;
    kelas: GradeClass;
  } | null>(null);

  // Batch upload state & modal
  const [batchStatus, setBatchStatus] = useState<UploadBatchStatus>({
    isOpen: false,
    isUploading: false,
    isFinished: false,
    total: 0,
    current: 0,
    currentFileName: '',
    slotTitle: '',
    results: []
  });

  // Manual link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSlot, setLinkSlot] = useState<{
    docType: DocumentType;
    semester: SemesterType;
    kelas: GradeClass;
  } | null>(null);
  const [manualLinkUrl, setManualLinkUrl] = useState('');
  const [manualLinkName, setManualLinkName] = useState('');

  // Delete confirmation modal state (replaces native window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{
    recordId: string;
    fileName: string;
    docType?: string;
    semester?: string;
    kelas?: string;
    fileUrl?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Selected teacher object from sheet "user"
  const activeTeacher =
    validTeachers.find(
      (t) => t.nip === selectedTeacherId || t.id === selectedTeacherId || `T-${t.nip}` === selectedTeacherId
    ) || validTeachers[0];

  // Calculate progress for active teacher (reacts to recordsVersion)
  const progress = useMemo(() => {
    return activeTeacher
      ? dbService.calculateTeacherProgress(activeTeacher.nip || activeTeacher.id)
      : { percentage: 0, filledSlots: 0, totalSlots: 36, breakdown: {} as any };
  }, [activeTeacher, recordsVersion]);

  // Helper: Read file as base64 string
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Direct File Trigger: Opens OS file picker immediately with multiple selection enabled!
  const handleTriggerDirectUpload = (docType: DocumentType, semester: SemesterType, kelas: GradeClass) => {
    setActiveTargetSlot({ docType, semester, kelas });
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
      multiFileInputRef.current.click();
    }
  };

  // Process files selected directly by the user (supports 1 or more files)
  const handleMultiFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !activeTargetSlot || !activeTeacher) return;

    const files = Array.from(fileList);

    // 1. Calculate TA short prefix: e.g. 2026/2027 -> 2627
    const rawYears = (config.academic_year || '2026/2027').replace(/[^0-9]/g, '');
    let shortYear = '2627';
    if (rawYears.length === 8) {
      shortYear = rawYears.substring(2, 4) + rawYears.substring(6, 8);
    } else if (rawYears.length >= 4) {
      shortYear = rawYears;
    }

    // 2. Short semester & class
    const semNum = activeTargetSlot.semester.replace(/[^0-9]/g, '');
    const shortSem = 'S' + (semNum || '1');
    const shortKelas = activeTargetSlot.kelas.replace(/[^0-9]/g, '') || '7';

    // 3. Count existing files in this slot to continue sequential numbering
    const existingRecords = dbService.getUploadRecordsForSlot(
      activeTeacher.nip || activeTeacher.id,
      activeTargetSlot.docType,
      activeTargetSlot.semester,
      activeTargetSlot.kelas
    );
    const existingCount = existingRecords.length;

    const slotTitle = `${activeTargetSlot.docType} • ${activeTargetSlot.semester} • ${activeTargetSlot.kelas}`;

    // Open upload progress dialog
    setBatchStatus({
      isOpen: true,
      isUploading: true,
      isFinished: false,
      total: files.length,
      current: 1,
      currentFileName: files[0]?.name || '',
      slotTitle,
      results: []
    });

    const results: { fileName: string; success: boolean; msg?: string }[] = [];

    // Process each file sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')) || '.docx';

      // Naming format rule:
      // If 1 file and slot is empty: 2627-S1-7-MODUL-Abu Haripin, M.Pd.doc
      // If multiple files OR slot already has existing files: 2627-S1-7-MODUL1-Abu Haripin, M.Pd.doc, MODUL2, etc.
      let finalFileName: string;
      if (existingCount === 0 && files.length === 1) {
        finalFileName = `${shortYear}-${shortSem}-${shortKelas}-${activeTargetSlot.docType}-${activeTeacher.nama}${fileExt}`;
      } else {
        const fileSeqNumber = existingCount + i + 1;
        finalFileName = `${shortYear}-${shortSem}-${shortKelas}-${activeTargetSlot.docType}${fileSeqNumber}-${activeTeacher.nama}${fileExt}`;
      }

      setBatchStatus((prev) => ({
        ...prev,
        current: i + 1,
        currentFileName: finalFileName
      }));

      // Check max file size (15MB)
      if (file.size > 15 * 1024 * 1024) {
        results.push({
          fileName: finalFileName,
          success: false,
          msg: 'Ukuran file melebihi 15MB.'
        });
        continue;
      }

      try {
        const base64Data = await readFileAsBase64(file);

        // Send to Google Apps Script endpoint
        const uploadResult = await spreadsheetService.uploadPerangkat(
          {
            name: finalFileName,
            data: base64Data
          },
          {
            teacher_id: `T-${activeTeacher.nip}`,
            teacher_name: activeTeacher.nama,
            doc_type: activeTargetSlot.docType,
            semester: activeTargetSlot.semester,
            kelas: activeTargetSlot.kelas,
            academic_year: config.academic_year,
            target_file_name: finalFileName,
            folder_id: config.drive_folder_perangkat_id || '1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp'
          }
        );

        const driveUrl = uploadResult.fileUrl || 'https://drive.google.com';

        const folderCategory = activeTargetSlot.docType === 'MODUL' ? 'Modul' : (activeTargetSlot.docType === 'PROSEM' ? 'Promes' : activeTargetSlot.docType);
        const folderBreadcrumb = `${activeTeacher.nama} ➔ ${folderCategory} ➔ ${activeTargetSlot.semester}`;

        // Check response
        if (uploadResult && uploadResult.isOk === false && uploadResult.msg) {
          results.push({
            fileName: finalFileName,
            success: false,
            msg: uploadResult.msg
          });
        } else {
          results.push({
            fileName: finalFileName,
            success: true,
            msg: `Tersimpan ke folder Drive (${folderBreadcrumb}) & database`
          });
        }

        // Always add to local reactive database store
        dbService.addUploadRecord({
          teacher_id: `T-${activeTeacher.nip}`,
          teacher_name: activeTeacher.nama,
          doc_type: activeTargetSlot.docType,
          semester: activeTargetSlot.semester,
          kelas: activeTargetSlot.kelas,
          academic_year: config.academic_year,
          file_name: finalFileName,
          file_url: driveUrl,
          file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          status: 'uploaded'
        });
      } catch (err: any) {
        results.push({
          fileName: finalFileName,
          success: false,
          msg: err.message || 'Koneksi ke Apps Script gagal.'
        });
      }
    }

    // Refresh from Google Spreadsheet in background
    spreadsheetService.fetchPerangkat().then((freshRes) => {
      if (freshRes && freshRes.success && Array.isArray(freshRes.data)) {
        const mappedRecords: UploadRecord[] = freshRes.data.map((r: any, idx: number) => ({
          id: r.id || `REC-${idx + 1}`,
          teacher_id: String(r.teacher_id || '').trim(),
          teacher_name: r.file_name ? r.file_name.split('-').pop()?.split('.')[0] : '',
          doc_type: (r.doc_type || 'MODUL') as any,
          semester: (r.semester || 'Semester 1') as any,
          kelas: (r.kelas || 'Kelas 7') as any,
          status: (r.status || 'uploaded') as any,
          file_name: r.file_name || 'Berkas.pdf',
          uploaded_at: r.upload_date || new Date().toISOString(),
          academic_year: r.academic_year || config.academic_year,
          file_url: r.file_url || 'https://drive.google.com',
          file_size: '1.2 MB'
        }));
        dbService.replaceUploadRecords(mappedRecords);
      }
    }).catch(() => {});

    setBatchStatus((prev) => ({
      ...prev,
      isUploading: false,
      isFinished: true,
      results
    }));
  };

  // Open manual link modal
  const handleOpenLinkModal = (docType: DocumentType, semester: SemesterType, kelas: GradeClass) => {
    setLinkSlot({ docType, semester, kelas });
    const cleanTA = config.academic_year.replace(/[^0-9]/g, '');
    const shortYear = cleanTA.length === 8 ? cleanTA.substring(2, 4) + cleanTA.substring(6, 8) : '2627';
    const shortSem = semester.includes('2') ? 'S2' : 'S1';
    const shortKelas = kelas.replace(/[^0-9]/g, '') || '7';

    const existingRecords = dbService.getUploadRecordsForSlot(
      activeTeacher.nip || activeTeacher.id,
      docType,
      semester,
      kelas
    );
    const existingCount = existingRecords.length;

    let defName: string;
    if (existingCount === 0) {
      defName = `${shortYear}-${shortSem}-${shortKelas}-${docType}-${activeTeacher.nama}.gdoc`;
    } else {
      defName = `${shortYear}-${shortSem}-${shortKelas}-${docType}${existingCount + 1}-${activeTeacher.nama}.gdoc`;
    }

    setManualLinkName(defName);
    setManualLinkUrl('');
    setLinkModalOpen(true);
  };

  const handleSaveManualLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSlot || !activeTeacher || !manualLinkUrl.trim()) return;

    dbService.addUploadRecord({
      teacher_id: `T-${activeTeacher.nip}`,
      teacher_name: activeTeacher.nama,
      doc_type: linkSlot.docType,
      semester: linkSlot.semester,
      kelas: linkSlot.kelas,
      academic_year: config.academic_year,
      file_name: manualLinkName.trim() || 'Tautan_Google_Drive.gdoc',
      file_url: manualLinkUrl.trim(),
      file_size: 'Tautan Web',
      status: 'uploaded'
    });

    setRecordsVersion((v) => v + 1);
    setLinkModalOpen(false);
  };

  const handleRequestDelete = (
    recordId: string,
    fileName: string,
    docType?: string,
    semester?: string,
    kelas?: string,
    fileUrl?: string
  ) => {
    setDeleteTarget({
      recordId,
      fileName,
      docType,
      semester,
      kelas,
      fileUrl
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { recordId, fileName, fileUrl } = deleteTarget;
    try {
      // 1. Immediately delete from local reactive database & trigger instant UI re-render
      dbService.deleteUploadRecord(recordId, fileName, fileUrl);
      setRecordsVersion((v) => v + 1);

      // 2. Call Google Apps Script backend to remove row from sheet & Google Drive
      const res = await spreadsheetService.deletePerangkatFromSpreadsheet(
        recordId,
        activeTeacher ? `T-${activeTeacher.nip}` : '',
        fileName,
        fileUrl
      );

      if (res && res.success) {
        setToastMessage({
          text: `Berkas "${fileName}" berhasil dihapus dari perangkat pembelajaran & spreadsheet.`,
          type: 'success'
        });
      } else {
        setToastMessage({
          text: `Berkas "${fileName}" berhasil dihapus dari tampilan portal.`,
          type: 'success'
        });
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({
        text: `Berkas "${fileName}" telah dihapus secara lokal.`,
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Hidden Native File Input: Directly triggered on button click, supports MULTIPLE files! */}
      <input
        type="file"
        multiple
        ref={multiFileInputRef}
        onChange={handleMultiFilesSelected}
        accept=".pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
      />

      {/* Header and Teacher Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-pink-600 mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>SISTEM 36 KATEGORI ADMINISTRASI PEMBELAJARAN</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Perangkat Pembelajaran Guru
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dukungan upload langsung multi-file dengan penomoran otomatis (Contoh: MODUL1, MODUL2, dst.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* If admin, dropdown to switch teachers with quick search */}
          {/* UNIFIED SEARCHABLE TEACHER COMBOBOX (Menyatu: 1 trigger, dropdown dengan pencarian terintegrasi & urutan A-Z) */}
          {isAdmin ? (
            <div className="relative" ref={teacherMenuRef}>
              {/* Trigger Button: Tampilan tunggal yang rapi tanpa banyak kotak dialog */}
              <button
                type="button"
                onClick={() => {
                  setIsTeacherMenuOpen((prev) => !prev);
                  setTimeout(() => teacherInputRef.current?.focus(), 80);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition text-left cursor-pointer shadow-xs ${
                  isTeacherMenuOpen
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                }`}
                title="Klik untuk mencari dan memilih guru"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                  {activeTeacher?.nama?.charAt(0).toUpperCase() || 'G'}
                </div>

                <div className="min-w-0 max-w-[170px] sm:max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Guru Terpilih:</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate leading-tight">
                    {activeTeacher?.nama || 'Pilih Guru'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight">
                    {activeTeacher?.mapel || 'Guru'} {activeTeacher?.nip ? `• NIK: ${activeTeacher.nip}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1 pl-1 text-slate-400 shrink-0">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTeacherMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
              </button>

              {/* Integrated Search & Dropdown List */}
              {isTeacherMenuOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Search Input Box Directly Integrated at Top of List */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 absolute left-3 text-blue-600" />
                      <input
                        ref={teacherInputRef}
                        type="text"
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="Ketik kata kunci nama / NIK / mapel..."
                        className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                      {teacherSearch && (
                        <button
                          type="button"
                          onClick={() => setTeacherSearch('')}
                          className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          title="Hapus pencarian"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 font-medium">
                      <span>Daftar Guru (Urut Abjad A - Z)</span>
                      <span className="font-bold text-blue-600">
                        {filteredTeachersForSelect.length} dari {validTeachers.length} Guru
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Teacher List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1.5">
                    {filteredTeachersForSelect.length === 0 ? (
                      <div className="p-6 text-center">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">Guru tidak ditemukan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tidak ada guru yang sesuai dengan "{teacherSearch}"
                        </p>
                        <button
                          type="button"
                          onClick={() => setTeacherSearch('')}
                          className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                        >
                          Tampilkan Semua Guru
                        </button>
                      </div>
                    ) : (
                      filteredTeachersForSelect.map((t, idx) => {
                        const isSelected =
                          t.nip === selectedTeacherId ||
                          t.id === selectedTeacherId ||
                          `T-${t.nip}` === selectedTeacherId;
                        return (
                          <button
                            key={t.nip || t.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedTeacherId(t.nip || t.id);
                              setIsTeacherMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 text-[10px] font-bold text-slate-400 shrink-0 text-right">
                                {idx + 1}.
                              </span>
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {t.nama?.charAt(0).toUpperCase() || 'G'}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs truncate ${isSelected ? 'font-black text-blue-900' : 'text-slate-800'}`}>
                                  {t.nama}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="font-semibold text-slate-600">{t.mapel || 'Guru'}</span>
                                  {t.nip && <span>• NIK: {t.nip}</span>}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-50/90 rounded-xl sm:rounded-2xl border border-blue-200/70 text-blue-950 text-xs font-bold min-w-0">
              <span className="truncate">{activeTeacher?.nama}</span>
              {activeTeacher?.mapel && (
                <span className="text-blue-600 font-medium truncate shrink-0">({activeTeacher?.mapel})</span>
              )}
            </div>
          )}

          {config.drive_folder_perangkat_id && (
            <a
              href={`https://drive.google.com/drive/folders/${config.drive_folder_perangkat_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              title="Buka Folder Google Drive Perangkat Pembelajaran"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Folder Drive Perangkat</span>
              <span className="sm:hidden">Drive</span>
            </a>
          )}

          {onOpenReportPrint && (
            <button
              onClick={onOpenReportPrint}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Unduh Laporan PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* OVERALL TEACHER PROGRESS CARD */}
      {activeTeacher && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 sm:space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Kelengkapan Administrasi Guru
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5 truncate" title={activeTeacher.nama}>
                {activeTeacher.nama}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-500">
                <span className="font-mono text-slate-600 font-semibold">NIK: {activeTeacher.nip}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">{activeTeacher.mapel || 'Guru Mata Pelajaran'}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">TA {config.academic_year}</span>
              </div>
            </div>

            {/* Status Matriks Box (Optimized for Mobile & Desktop) */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 bg-slate-50/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/70">
              <div className="text-left sm:text-right min-w-0">
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    Status Matriks
                  </span>
                </div>
                <div className="mt-0.5 whitespace-nowrap">
                  <strong className="text-sm sm:text-base font-black text-blue-950">
                    {progress.filledSlots}
                  </strong>
                  <span className="text-xs font-bold text-slate-500 ml-1">
                    dari 36 Kategori Terisi
                  </span>
                </div>
              </div>

              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-xs shrink-0 transition-transform active:scale-95 ${
                  progress.percentage >= 80
                    ? 'bg-emerald-600 shadow-emerald-500/20'
                    : progress.percentage >= 50
                    ? 'bg-amber-500 shadow-amber-500/20'
                    : 'bg-rose-500 shadow-rose-500/20'
                }`}
              >
                <span className="text-sm sm:text-base leading-none">{progress.percentage}%</span>
                <span className="text-[9px] font-bold text-white/90 mt-0.5 uppercase tracking-tighter">
                  {progress.percentage >= 100 ? 'Lengkap' : 'Proses'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progress.percentage >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : progress.percentage >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500'
              }`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>

          {/* Breakdown per Document Type (3 columns on mobile = exactly 2 neat rows) */}
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-3 sm:pt-4 border-t border-slate-100">
            {DOC_TYPES.map((dt) => {
              const count = progress.breakdown[dt] || 0;
              const isFull = count >= 6;
              return (
                <div
                  key={dt}
                  className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition ${
                    isFull
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] sm:text-[11px] font-bold block text-slate-600 truncate">{dt}</span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={`text-xs sm:text-base font-black ${isFull ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {count}/6
                    </span>
                    {isFull && <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />}
                  </div>
                  <span className={`block text-[9px] sm:text-[10px] font-semibold mt-0.5 ${isFull ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isFull ? 'Tuntas' : `${6 - count} Kurang`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-1.5 px-3 py-1 font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-blue-600" /> Filter:
        </span>

        {/* Doc type filter */}
        <select
          value={activeDocFilter}
          onChange={(e) => setActiveDocFilter(e.target.value as any)}
          className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
        >
          <option value="ALL">Semua Jenis Dokumen</option>
          {DOC_TYPES.map((d) => (
            <option key={d} value={d}>
              {d === 'MODUL' ? 'MODUL AJAR' : d}
            </option>
          ))}
        </select>

        {/* Semester filter */}
        <select
          value={activeSemFilter}
          onChange={(e) => setActiveSemFilter(e.target.value as any)}
          className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
        >
          <option value="ALL">Semua Semester</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Class filter */}
        <select
          value={activeClassFilter}
          onChange={(e) => setActiveClassFilter(e.target.value as any)}
          className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 outline-none"
        >
          <option value="ALL">Semua Kelas (7, 8, 9)</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* MATRIX OF 36 SLOTS (GROUPED BY DOC TYPE) */}
      <div className="space-y-6">
        {DOC_TYPES.filter((dt) => activeDocFilter === 'ALL' || activeDocFilter === dt).map(
          (docType) => {
            return (
              <div
                key={docType}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Doc Type Card Header */}
                <div className="bg-slate-50/90 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {docType === 'MODUL' ? 'MODUL AJAR (RPP MERDEKA)' : docType}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Kategori Dokumen Pembelajaran Fase D (Kelas 7, 8, 9)
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-500">
                    Slot Terisi: {progress.breakdown[docType] || 0} / 6 Kategori
                  </span>
                </div>

                {/* Grid of Semesters & Classes */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SEMESTERS.filter((s) => activeSemFilter === 'ALL' || activeSemFilter === s).map((sem) =>
                    CLASSES.filter((c) => activeClassFilter === 'ALL' || activeClassFilter === c).map((kls) => {
                      const records = activeTeacher
                        ? dbService.getUploadRecordsForSlot(activeTeacher.nip || activeTeacher.id, docType, sem, kls)
                        : [];
                      const hasRecords = records.length > 0;

                      return (
                        <div
                          key={`${docType}-${sem}-${kls}`}
                          className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                            hasRecords
                              ? 'bg-emerald-50/30 border-emerald-200/90 shadow-2xs'
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {/* Card subheader */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                              <span className="text-xs font-extrabold text-slate-800">
                                {sem} • {kls}
                              </span>
                              {hasRecords ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  {records.length} File
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  Kosong
                                </span>
                              )}
                            </div>

                            {/* Files list */}
                            {hasRecords ? (
                              <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1">
                                {records.map((rec) => (
                                  <div
                                    key={rec.id}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-1 shadow-2xs hover:border-blue-300 transition"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-800 truncate text-[11px]" title={rec.file_name}>
                                        {rec.file_name}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {rec.file_size || '1.2 MB'} • {rec.uploaded_at?.split('T')[0] || 'Tercatat'}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <a
                                        href={rec.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-50"
                                        title="Unduh / Buka Berkas di Tab Baru"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleRequestDelete(rec.id, rec.file_name, docType, sem, kls, rec.file_url)}
                                        className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                        title="Hapus Berkas Ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic mb-4 py-2">
                                Belum ada berkas terunggah
                              </p>
                            )}
                          </div>

                          {/* Action Button: Direct File Selector (supports multi-file upload) */}
                          <div className="pt-2">
                            <button
                              onClick={() => handleTriggerDirectUpload(docType, sem, kls)}
                              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                                hasRecords
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'bg-blue-700 hover:bg-blue-800 text-white'
                              }`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{hasRecords ? '+ Tambah File Lagi' : 'Pilih & Unggah File'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* MULTI-FILE UPLOAD PROGRESS DIALOG */}
      {batchStatus.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  {batchStatus.isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {batchStatus.isUploading
                      ? 'Mengunggah Berkas ke Database...'
                      : 'Proses Unggah Selesai'}
                  </h3>
                  <p className="text-xs text-slate-500">{batchStatus.slotTitle}</p>
                </div>
              </div>

              {!batchStatus.isUploading && (
                <button
                  onClick={() => setBatchStatus((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Progress Information */}
            {batchStatus.isUploading && (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">
                    Memproses berkas {batchStatus.current} dari {batchStatus.total}
                  </span>
                  <span className="text-blue-600">
                    {Math.round((batchStatus.current / batchStatus.total) * 100)}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(batchStatus.current / batchStatus.total) * 100}%`
                    }}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                      Nama File Otomatis:
                    </p>
                    <p className="font-mono text-slate-800 break-all font-semibold">
                      {batchStatus.currentFileName}
                    </p>
                  </div>

                  {activeTeacher && activeTargetSlot && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider mb-0.5">
                        Alur Folder Drive Otomatis:
                      </p>
                      <p className="font-medium text-slate-700 flex items-center gap-1.5 flex-wrap text-[11px]">
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900">{activeTeacher.nama}</span>
                        <span className="text-slate-400">➔</span>
                        <span className="font-bold text-slate-900">
                          {activeTargetSlot.docType === 'MODUL' ? 'Modul' : (activeTargetSlot.docType === 'PROSEM' ? 'Promes' : activeTargetSlot.docType)}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className="font-bold text-slate-900">{activeTargetSlot.semester}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Results List */}
            {batchStatus.isFinished && (
              <div className="space-y-3">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {batchStatus.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        res.success
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/70 border-amber-200 text-amber-900'
                      }`}
                    >
                      {res.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{res.fileName}</p>
                        <p className="text-[11px] opacity-80 mt-0.5">{res.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {batchStatus.results.some((r) => !r.success && (r.msg?.includes('DriveApp') || r.msg?.includes('Akses ditolak') || r.msg?.includes('Access denied'))) && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cara Mengatasi &ldquo;Akses ditolak: DriveApp&rdquo;:</span>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800/90">
                      <li>Buka Google Spreadsheet &gt; <strong>Ekstensi &gt; Apps Script</strong>.</li>
                      <li>Di editor Apps Script, pilih fungsi <code>testDrivePermission</code> lalu klik <strong>Jalankan (Run)</strong> untuk mengizinkan akses Drive.</li>
                      <li>Klik <strong>Terapkan &gt; Kelola penerapan &gt; Edit (ikon pensil)</strong> &gt; Pilih <strong>Versi Baru</strong> &gt; Pastikan <em>Jalankan sebagai: Saya</em> &gt; Klik <strong>Terapkan</strong>.</li>
                    </ol>
                  </div>
                )}

                <button
                  onClick={() => setBatchStatus((prev) => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
                >
                  Tutup & Periksa Berkas
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL LINK MODAL */}
      {linkModalOpen && linkSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Tautkan Link Google Drive
                </h3>
                <p className="text-xs text-slate-500">
                  {linkSlot.docType} • {linkSlot.semester} • {linkSlot.kelas}
                </p>
              </div>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tautan File (Google Drive / Docs / Spreadsheet)
                </label>
                <input
                  type="url"
                  value={manualLinkUrl}
                  onChange={(e) => setManualLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Tautan Berkas
                </label>
                <input
                  type="text"
                  value={manualLinkName}
                  onChange={(e) => setManualLinkName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs hover:shadow transition"
                >
                  Simpan Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (Replaces browser confirm() that gets blocked on mobile/iframes) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus Berkas Perangkat?
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteTarget.docType || 'Perangkat'} • {deleteTarget.semester || ''} • {deleteTarget.kelas || ''}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Nama Berkas:</p>
              <p className="text-xs font-bold text-slate-800 break-all">
                {deleteTarget.fileName}
              </p>
            </div>

            <div className="space-y-1.5 text-xs bg-red-50/70 p-3 rounded-2xl border border-red-100">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span><strong>Google Drive:</strong> Berkas fisik akan dihapus & dipindahkan ke Sampah (Trash).</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span><strong>Google Spreadsheet:</strong> Baris data pada sheet <em>PerangkatPembelajaran</em> dihapus.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span><strong>Tampilan Portal:</strong> Berkas langsung hilang dari slot perangkat guru.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Berkas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-slate-700'
                : 'bg-red-950 text-red-200 border-red-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-md hover:bg-white/10 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
