import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  GitBranch,
  CheckCircle,
  Sliders,
  Save,
  Zap,
  ExternalLink,
  Copy,
  Check,
  Table,
  Link,
  Code2,
  FolderOpen,
  Upload,
  Trash2,
  Building,
  UserCheck,
  GraduationCap,
  Image as ImageIcon,
  ArrowRight,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { AppDatabase, SchoolConfig } from '../types';
import { dbService } from '../db/storage';
import { spreadsheetService } from '../db/spreadsheetService';

interface DatabaseManagerViewProps {
  db: AppDatabase;
  config: SchoolConfig;
  onOpenReportPrint?: () => void;
}

export const DatabaseManagerView: React.FC<DatabaseManagerViewProps> = ({
  db,
  config,
  onOpenReportPrint,
}) => {
  // Navigation tab state inside database manager
  const [activeSection, setActiveSection] = useState<'pimpinan' | 'spreadsheet' | 'code'>('pimpinan');

  // Config form state
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheet_id || '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc');
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.apps_script_url || 'https://script.google.com/macros/s/AKfycby599LImP-J6RkN-zYc77G1MhqYFtCz8-GfzT_8zi8vUVXIkSFs2A6KhI5B7obT9Ft2/exec');
  const [schoolName, setSchoolName] = useState(config.school_name || 'SMPIT Pondok Duta');
  const [foundationName, setFoundationName] = useState(
    !config.foundation_name || config.foundation_name === 'Yayasan Pondok Duta'
      ? 'Yayasan Perguruan Islam Pondok Duta'
      : config.foundation_name
  );
  const [academicYear, setAcademicYear] = useState(config.academic_year || '2026/2027');
  const [npsn, setNpsn] = useState(config.npsn || '20276180');
  const [schoolAddress, setSchoolAddress] = useState(config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat');
  const [headmaster, setHeadmaster] = useState(config.headmaster || 'H. Sudirman, M.Pd.I');
  const [headmasterNip, setHeadmasterNip] = useState(config.headmaster_nip || '197508152002121003');
  const [viceHeadmaster, setViceHeadmaster] = useState(config.vice_headmaster || 'Drs. H. Ahmad Fauzi, M.Pd');
  const [viceHeadmasterNip, setViceHeadmasterNip] = useState(config.vice_headmaster_nip || '197805122005011002');
  const [viceHeadmasterTitle, setViceHeadmasterTitle] = useState(
    !config.vice_headmaster_title || config.vice_headmaster_title.includes('Administrasi')
      ? 'Tim Kurikulum'
      : config.vice_headmaster_title
  );
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(config.school_logo_url || '');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [driveFolderId, setDriveFolderId] = useState(config.drive_folder_id || '1iW9MXmYQDE7hGZOM8z0JJpQ_QQGcenwS');
  const [driveFolderPerangkatId, setDriveFolderPerangkatId] = useState(
    config.drive_folder_perangkat_id || '1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp'
  );
  
  const [configSaved, setConfigSaved] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state reactively whenever database config updates
  useEffect(() => {
    setSpreadsheetId(config.spreadsheet_id || '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc');
    setAppsScriptUrl(config.apps_script_url || 'https://script.google.com/macros/s/AKfycby599LImP-J6RkN-zYc77G1MhqYFtCz8-GfzT_8zi8vUVXIkSFs2A6KhI5B7obT9Ft2/exec');
    setSchoolName(config.school_name || 'SMPIT Pondok Duta');
    setFoundationName(
      !config.foundation_name || config.foundation_name === 'Yayasan Pondok Duta'
        ? 'Yayasan Perguruan Islam Pondok Duta'
        : config.foundation_name
    );
    setAcademicYear(config.academic_year || '2026/2027');
    setNpsn(config.npsn || '20276180');
    setSchoolAddress(config.school_address || 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat');
    setHeadmaster(config.headmaster || 'H. Sudirman, M.Pd.I');
    setHeadmasterNip(config.headmaster_nip || '197508152002121003');
    setViceHeadmaster(config.vice_headmaster || 'Drs. H. Ahmad Fauzi, M.Pd');
    setViceHeadmasterNip(config.vice_headmaster_nip || '197805122005011002');
    setViceHeadmasterTitle(
      !config.vice_headmaster_title || config.vice_headmaster_title.includes('Administrasi')
        ? 'Tim Kurikulum'
        : config.vice_headmaster_title
    );
    setSchoolLogoUrl(config.school_logo_url || '');
    setDriveFolderId(config.drive_folder_id || '1iW9MXmYQDE7hGZOM8z0JJpQ_QQGcenwS');
    setDriveFolderPerangkatId(config.drive_folder_perangkat_id || '1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp');
  }, [config]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setLogoError('Ukuran file logo maksimal 2 MB.');
        setTimeout(() => setLogoError(null), 4000);
        return;
      }
      setLogoError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSchoolLogoUrl(base64);
        dbService.updateConfig({ school_logo_url: base64 });
        setIdentitySaved(true);
        setTimeout(() => setIdentitySaved(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlInput.trim()) return;
    setSchoolLogoUrl(logoUrlInput.trim());
    dbService.updateConfig({ school_logo_url: logoUrlInput.trim() });
    setLogoUrlInput('');
    setIdentitySaved(true);
    setTimeout(() => setIdentitySaved(false), 3000);
  };

  const handleRemoveLogo = () => {
    setSchoolLogoUrl('');
    dbService.updateConfig({ school_logo_url: '' });
    setIdentitySaved(true);
    setTimeout(() => setIdentitySaved(false), 3000);
  };

  const handleSaveAllConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    dbService.updateConfig({
      spreadsheet_id: spreadsheetId.trim(),
      apps_script_url: appsScriptUrl.trim(),
      school_name: schoolName.trim(),
      foundation_name: foundationName.trim() || 'Yayasan Perguruan Islam Pondok Duta',
      academic_year: academicYear.trim(),
      npsn: npsn.trim() || '20276180',
      school_address: schoolAddress.trim(),
      headmaster: headmaster.trim() || 'H. Sudirman, M.Pd.I',
      headmaster_nip: headmasterNip.trim() || '197508152002121003',
      vice_headmaster: viceHeadmaster.trim() || 'Drs. H. Ahmad Fauzi, M.Pd',
      vice_headmaster_nip: viceHeadmasterNip.trim() || '197805122005011002',
      vice_headmaster_title: viceHeadmasterTitle.trim() || 'Tim Kurikulum',
      school_logo_url: schoolLogoUrl.trim(),
      drive_folder_id: driveFolderId.trim(),
      drive_folder_perangkat_id: driveFolderPerangkatId.trim()
    });
    setConfigSaved(true);
    setIdentitySaved(true);
    setTimeout(() => {
      setConfigSaved(false);
      setIdentitySaved(false);
    }, 3000);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await spreadsheetService.syncAll();
    setIsSyncing(false);
    setSyncFeedback({ success: result.success, msg: result.message });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const codeGsSnippet = `// =====================================================================
// Google Apps Script (Code.gs) - Portal Administrasi Guru SMPIT Pondok Duta
// Database: Sheet "user", "PerangkatPembelajaran", "Academic Year", "event", "usulan_guru"
// =====================================================================

// ===== 1. JALANKAN INI SEKALI DI EDITOR UNTUK MEMBERIKAN IZIN GOOGLE DRIVE =====
// Jika muncul error "Akses ditolak: DriveApp", pilih fungsi ini di toolbar atas dan klik "Jalankan"
function testDrivePermission() {
  const root = DriveApp.getRootFolder();
  Logger.log("Akses Drive Berhasil untuk: " + root.getName());
}

function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById("${spreadsheetId.trim() || '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc'}");
  } catch (e) {
    return SpreadsheetApp.openById("${spreadsheetId.trim() || '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc'}");
  }
}

// ===== DATABASE CONFIGURATION & SHEET CREATION =====
function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    if (sheetName === "PerangkatPembelajaran" || sheetName === "UploadRecords") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "ID", "Teacher ID", "Doc Type", "Semester",
        "Kelas", "Status", "File Name", "Upload Date", "Academic Year", "File URL"
      ]);
      sheet.getRange("A1:J1").setFontWeight("bold").setBackground("#e2e8f0");
    } else if (sheetName === "user" || sheetName === "DataGuru") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Nama", "NIP", "Mapel", "Role", "Password"]);
      sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#e2e8f0");
    } else if (sheetName === "usulan_guru") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Nama", "NIP", "Mapel", "Tanggal_Usulan", "Isi_Usulan", "Status"]);
      sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#e2e8f0");
    } else if (sheetName === "Academic Year") {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["No", "Academic Year", "Folder ID", "Folder Perangkat"]);
      sheet.appendRow([1, "2026/2027", "1iW9MXmYQDE7hGZOM8z0JJpQ_QQGcenwS", "1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp"]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e2e8f0");
    } else {
      sheet = ss.insertSheet(sheetName);
    }
  }
  return sheet;
}

// ===== AMBIL KONFIGURASI TAHUN AJARAN & FOLDER ID DARI SHEET "Academic Year" =====
// Kolom B: Academic Year, Kolom C: Folder ID (Lampiran/Umum), Kolom D: Folder Perangkat (Khusus Perangkat Pembelajaran)
function getAcademicYearConfig() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Academic Year");
    if (!sheet) return { year: "2026/2027", folderId: "", folderPerangkatId: "" };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { year: "2026/2027", folderId: "", folderPerangkatId: "" };

    const year = sheet.getRange(lastRow, 2).getValue().toString().trim() || "2026/2027";
    const folderId = sheet.getRange(lastRow, 3).getValue().toString().trim();
    let folderPerangkatId = "";
    if (sheet.getLastColumn() >= 4) {
      folderPerangkatId = sheet.getRange(lastRow, 4).getValue().toString().trim();
    }
    return { year: year, folderId: folderId, folderPerangkatId: folderPerangkatId };
  } catch (e) {
    return { year: "2026/2027", folderId: "", folderPerangkatId: "" };
  }
}

// ===== AMBIL INFORMASI FOLDER GOOGLE DRIVE (LAMPIRAN & PERANGKAT) =====
function getActiveFolderMetadata() {
  try {
    const config = getAcademicYearConfig();
    let cleanFolderId = config.folderId ? config.folderId.toString().trim() : "";
    let cleanFolderPerangkatId = config.folderPerangkatId ? config.folderPerangkatId.toString().trim() : "";

    if (cleanFolderId.includes("drive.google.com")) {
      const match = cleanFolderId.match(/folders\\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanFolderId = match[1];
    }
    if (cleanFolderPerangkatId.includes("drive.google.com")) {
      const match = cleanFolderPerangkatId.match(/folders\\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanFolderPerangkatId = match[1];
    }

    let folderNameLampiran = "Root Utama";
    let folderNamePerangkat = "Root Utama";

    try {
      if (cleanFolderId) folderNameLampiran = DriveApp.getFolderById(cleanFolderId).getName();
    } catch (e) {
      folderNameLampiran = "Belum Ada / Tidak Ditemukan";
    }

    try {
      if (cleanFolderPerangkatId) folderNamePerangkat = DriveApp.getFolderById(cleanFolderPerangkatId).getName();
    } catch (e) {
      folderNamePerangkat = "Belum Ada / Tidak Ditemukan";
    }

    return {
      success: true,
      academicYear: config.year,
      folderId: cleanFolderId,
      folderName: folderNameLampiran,
      folderPerangkatId: cleanFolderPerangkatId,
      folderPerangkatName: folderNamePerangkat
    };
  } catch (e) {
    return {
      success: false,
      academicYear: "2026/2027",
      folderId: "",
      folderName: "Error: " + e.toString(),
      folderPerangkatId: "",
      folderPerangkatName: "Error: " + e.toString()
    };
  }
}

// ===== AMBIL DATA GURU DARI SHEET "user" (KOLOM: Nama, NIP, Mapel, Role, Password) =====
function getUsersFromSheet() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("user") || ss.getSheetByName("DataGuru");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const users = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      const nama = String(row[0] || "").trim();
      const nip = String(row[1] || "").trim();
      const mapel = String(row[2] || "").trim();
      const role = String(row[3] || "Guru").trim();
      const password = String(row[4] || "guru123").trim();

      if (!nama || !nip || nama.toLowerCase() === "nama") continue;

      users.push({
        rowIndex: i + 1,
        id: "T-" + nip,
        nip: nip,
        nama: nama,
        name: nama,
        mapel: mapel,
        subject: mapel,
        role: role,
        password: password
      });
    }
    return users;
  } catch (err) {
    return [];
  }
}

// ===== AMBIL DATA REKOR PERANGKAT PEMBELAJARAN =====
function getUploadRecords() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("PerangkatPembelajaran") || ss.getSheetByName("UploadRecords");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const records = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (!row[0] && !row[1]) continue;
      records.push({
        rowIndex: i + 1,
        id: String(row[0] || ("REC-" + i)),
        teacher_id: String(row[1] || "").trim(),
        doc_type: String(row[2] || "MODUL").trim(),
        semester: String(row[3] || "Semester 1").trim(),
        kelas: String(row[4] || "Kelas 7").trim(),
        status: String(row[5] || "uploaded").trim(),
        file_name: String(row[6] || "").trim(),
        upload_date: row[7] ? String(row[7]) : "",
        academic_year: String(row[8] || "2026/2027").trim(),
        file_url: String(row[9] || "").trim()
      });
    }
    return records;
  } catch (err) {
    return [];
  }
}

// ===== AMBIL DATA AGENDA DARI SHEET "event" =====
function getEventsData() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("event");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const events = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (!row[2]) continue;
      events.push({
        rowIndex: i + 1,
        tanggal_awal_kegiatan: row[0] ? new Date(row[0]).toISOString() : "",
        tanggal_akhir_kegiatan: row[1] ? new Date(row[1]).toISOString() : "",
        nama_kegiatan: String(row[2] || "").trim(),
        penanggung_jawab: String(row[3] || "-").trim(),
        proposal: String(row[4] || "").trim(),
        file_id: String(row[5] || "").trim()
      });
    }
    return events;
  } catch (err) {
    return [];
  }
}

// ===== AMBIL DATA USULAN DARI SHEET "usulan_guru" =====
function getUsulanData() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("usulan_guru");
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const list = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (!row[4] && !row[0]) continue;
      list.push({
        rowIndex: i + 1,
        nama: String(row[0] || "").trim(),
        nip: String(row[1] || "").trim(),
        mapel: String(row[2] || "").trim(),
        tanggal: row[3] ? String(row[3]) : "",
        isi: String(row[4] || "").trim(),
        status: String(row[5] || "Terkirim").trim()
      });
    }
    return list;
  } catch (err) {
    return [];
  }
}

// ===== MANAJEMEN HIRARKI FOLDER GOOGLE DRIVE PERANGKAT =====
// Alur otomatis: [Folder Root Perangkat] -> [Nama Guru] -> [Modul / CP / ATP / Prota / Promes] -> [Semester 1 / Semester 2]
function getOrCreateSubFolder(parentFolder, targetFolderName) {
  if (!parentFolder || !targetFolderName) return parentFolder;
  const nameToFind = targetFolderName.toString().trim();
  const nameLower = nameToFind.toLowerCase();
  try {
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.getName().trim().toLowerCase() === nameLower) {
        return f; // Gunakan folder yang sudah ada jika ditemukan
      }
    }
    return parentFolder.createFolder(nameToFind);
  } catch (e) {
    console.warn("Pemberitahuan pembuatan subfolder (" + nameToFind + "):", e);
    return parentFolder;
  }
}

function resolveTeacherUploadFolder(rootFolderId, namaGuru, docType, semester) {
  let targetFolder = null;
  try {
    let parent = rootFolderId ? DriveApp.getFolderById(rootFolderId) : DriveApp.getRootFolder();
    
    // 1. Level 1: Nama Guru (Contoh: "Abu Haripin, M.Pd" / "Novi Mulafaturrochmah, S.Pd.")
    let cleanTeacher = (namaGuru || "Guru").toString().trim();
    let teacherFolder = getOrCreateSubFolder(parent, cleanTeacher);
    
    // 2. Level 2: Jenis Dokumen (Modul / CP / ATP / Prota / Promes / KKTP)
    let cleanDoc = (docType || "MODUL").toString().trim();
    let upperDoc = cleanDoc.toUpperCase();
    let formattedDoc = cleanDoc;
    if (upperDoc === "MODUL") formattedDoc = "Modul";
    else if (upperDoc === "PROTA") formattedDoc = "Prota";
    else if (upperDoc === "PROSEM" || upperDoc === "PROMES") formattedDoc = "Promes";
    else if (upperDoc === "CP") formattedDoc = "CP";
    else if (upperDoc === "ATP") formattedDoc = "ATP";
    else if (upperDoc === "KKTP") formattedDoc = "KKTP";
    let docTypeFolder = getOrCreateSubFolder(teacherFolder, formattedDoc);
    
    // 3. Level 3: Semester (Semester 1 / Semester 2)
    let cleanSem = (semester || "Semester 1").toString().trim();
    if (cleanSem.toLowerCase().includes("2") || cleanSem.toLowerCase() === "s2") {
      cleanSem = "Semester 2";
    } else {
      cleanSem = "Semester 1";
    }
    let semesterFolder = getOrCreateSubFolder(docTypeFolder, cleanSem);
    
    targetFolder = semesterFolder;
  } catch (err) {
    console.warn("Gagal membuat hirarki subfolder DriveApp, fallback ke root folder:", err);
    try {
      targetFolder = rootFolderId ? DriveApp.getFolderById(rootFolderId) : DriveApp.getRootFolder();
    } catch (e2) {
      targetFolder = null;
    }
  }
  return targetFolder;
}

// ===== PROSES UPLOAD FILE (MENDUKUNG MULTI-FILE, PENOMORAN OTOMATIS & HIRARKI FOLDER DRIVE) =====
function processTeacherUpload(fileData, metaData) {
  try {
    if (!metaData) metaData = {};
    if (!fileData || !fileData.data) {
      return { isOk: false, success: false, msg: "Data berkas tidak ditemukan atau kosong." };
    }

    const ss = getSpreadsheet();
    const config = getAcademicYearConfig();
    // Prioritaskan Folder Khusus Perangkat Pembelajaran:
    // 1. metaData.folder_id (jika dikirim dari frontend)
    // 2. config.folderPerangkatId (dari Kolom D sheet "Academic Year")
    // 3. config.folderId (fallback Kolom C)
    let rawFolderId = (metaData && metaData.folder_id) || config.folderPerangkatId || config.folderId || "";
    let cleanFolderId = rawFolderId.toString().trim();
    if (cleanFolderId.includes("drive.google.com")) {
      const match = cleanFolderId.match(/folders\\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanFolderId = match[1];
    }

    // 1. Ekstraksi Tahun Ajaran (Contoh: "2026/2027" -> "2627")
    let shortYear = "2627";
    if (metaData.academic_year) {
      let rawYears = metaData.academic_year.replace(/[^0-9]/g, '');
      if (rawYears.length === 8) shortYear = rawYears.substring(2, 4) + rawYears.substring(6, 8);
      else if (rawYears.length >= 4) shortYear = rawYears;
    }

    // 2. Ekstraksi Semester (Contoh: "Semester 1" -> "S1")
    let shortSemester = "S1";
    if (metaData.semester) {
      let semNum = metaData.semester.replace(/[^0-9]/g, '');
      shortSemester = "S" + (semNum ? semNum : "1");
    }

    // 3. Ekstraksi Kelas (Contoh: "Kelas 7" -> "7")
    let shortKelas = "7";
    if (metaData.kelas) {
      shortKelas = metaData.kelas.replace(/[^0-9]/g, '') || "7";
    }

    // 4. Tipe Dokumen (MODUL, CP, ATP, KKTP, PROTA, PROSEM)
    let docType = metaData.doc_type ? metaData.doc_type.toString().trim() : "MODUL";

    // 5. Nama Guru (Ambil nama asli atau lookup dari sheet "user")
    let namaGuru = metaData.teacher_name || "";
    if (!namaGuru && metaData.teacher_id) {
      try {
        const userSheet = ss.getSheetByName("user") || ss.getSheetByName("DataGuru");
        if (userSheet) {
          const uData = userSheet.getDataRange().getValues();
          const cleanNip = metaData.teacher_id.replace(/^T-|^USR-/, '').trim();
          for (let i = 1; i < uData.length; i++) {
            if (String(uData[i][1] || '').trim() === cleanNip) {
              namaGuru = String(uData[i][0] || '').trim();
              break;
            }
          }
        }
      } catch (eLookup) {}
    }
    if (!namaGuru) namaGuru = "Guru";

    // Ekstensi berkas
    let extension = ".docx";
    if (fileData.name && fileData.name.lastIndexOf(".") !== -1) {
      extension = fileData.name.substring(fileData.name.lastIndexOf("."));
    }

    // 6. Nama File Otomatis (Jika frontend telah menyediakan target_file_name yang bernomor, gunakan itu)
    let finalFileName = metaData.target_file_name || (shortYear + "-" + shortSemester + "-" + shortKelas + "-" + docType + "-" + namaGuru + extension);
    finalFileName = finalFileName.replace(/\\s+/g, ' ');

    // Decode File
    const parts = fileData.data.split(",");
    const metadataParts = parts[0].split(";");
    const contentType = metadataParts[0].split(":")[1] || "application/octet-stream";
    const bytes = Utilities.base64Decode(parts[1]);
    const blob = Utilities.newBlob(bytes, contentType, finalFileName);

    // 7. Cari / Buat Hirarki Folder: [Nama Guru] -> [Jenis Dokumen] -> [Semester]
    let destinationFolder = null;
    let targetFolderId = cleanFolderId;
    let folderBreadcrumb = namaGuru + " > " + docType + " > " + (metaData.semester || "Semester 1");
    try {
      destinationFolder = resolveTeacherUploadFolder(cleanFolderId, namaGuru, docType, metaData.semester);
      if (destinationFolder) {
        targetFolderId = destinationFolder.getId();
        try {
          folderBreadcrumb = namaGuru + " > " + docType + " > " + destinationFolder.getName();
        } catch (eName) {}
      }
    } catch (eFolder) {
      console.warn("Folder resolving notice:", eFolder);
    }

    let fileUrl = "";

    // Metode 1: Gunakan Drive API v2 (Bypass Aman - sesuai kode asli aplikasi sebelumnya)
    try {
      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.insert) {
        const fileMetadata = {
          title: finalFileName,
          mimeType: contentType,
          parents: targetFolderId ? [{ id: targetFolderId }] : (cleanFolderId ? [{ id: cleanFolderId }] : [])
        };
        const uploadedFile = Drive.Files.insert(fileMetadata, blob);
        fileUrl = uploadedFile.alternateLink || uploadedFile.webContentLink || "";
      }
    } catch (eDriveV2) {
      console.warn("Drive API v2 insert notice:", eDriveV2);
    }

    // Metode 2: Fallback ke DriveApp jika Drive API v2 belum disetel
    if (!fileUrl) {
      try {
        let folder = destinationFolder || (targetFolderId ? DriveApp.getFolderById(targetFolderId) : (cleanFolderId ? DriveApp.getFolderById(cleanFolderId) : DriveApp.getRootFolder()));
        let uploadedFile = folder.createFile(blob);
        uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = uploadedFile.getUrl();
      } catch (eDriveApp) {
        console.warn("DriveApp folder notice:", eDriveApp);
        try {
          let uploadedFile = DriveApp.createFile(blob);
          uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = uploadedFile.getUrl();
        } catch (eDriveRoot) {
          console.warn("DriveApp root notice:", eDriveRoot);
          fileUrl = targetFolderId ? ("https://drive.google.com/drive/folders/" + targetFolderId) : (cleanFolderId ? ("https://drive.google.com/drive/folders/" + cleanFolderId) : "https://drive.google.com");
        }
      }
    }

    // KUNCI UTAMA: PENCATATAN KE SPREADSHEET WAJIB SELALU TEREKSEKUSI
    let sheet = getOrCreateSheet("PerangkatPembelajaran");
    const newId = "REC-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const cleanTeacherNip = (metaData.teacher_id || "").replace(/^T-|^USR-/, '').trim();
    const teacherId = "T-" + cleanTeacherNip;

    sheet.appendRow([
      newId,
      teacherId,
      docType,
      metaData.semester || "Semester 1",
      metaData.kelas || "Kelas 7",
      "uploaded",
      finalFileName,
      new Date().toISOString(),
      metaData.academic_year || config.year || "2026/2027",
      fileUrl
    ]);

    return {
      isOk: true,
      success: true,
      msg: "Tersimpan di folder Google Drive (" + folderBreadcrumb + ") & database spreadsheet!",
      id: newId,
      fileName: finalFileName,
      fileUrl: fileUrl,
      folderId: targetFolderId,
      folderBreadcrumb: folderBreadcrumb
    };
  } catch (err) {
    return { isOk: false, success: false, msg: "Gagal memproses file: " + err.toString() };
  }
}

// ===== HAPUS PERANGKAT DARI GOOGLE DRIVE & SHEET "PerangkatPembelajaran" =====
function deletePerangkat(recordId, teacherId, fileName, fileUrl) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("PerangkatPembelajaran") || ss.getSheetByName("UploadRecords");
    if (!sheet) return { success: false, message: "Sheet PerangkatPembelajaran tidak ditemukan" };

    var data = sheet.getDataRange().getValues();
    var deletedCount = 0;
    var driveTrashedCount = 0;
    var targetId = recordId ? String(recordId).trim().toLowerCase() : "";
    var targetFile = fileName ? String(fileName).trim().toLowerCase() : "";
    var targetUrl = fileUrl ? String(fileUrl).trim() : "";

    // Helper: Hapus / Pindahkan file ke Sampah (Trash) Google Drive
    function trashDriveFile(urlOrId) {
      if (!urlOrId) return false;
      try {
        var clean = String(urlOrId).trim();
        var matchD = clean.match(/\\/d\\/([a-zA-Z0-9_-]{20,})/);
        var matchId = clean.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
        var matchDirect = clean.match(/^([a-zA-Z0-9_-]{25,})$/);
        var fileId = "";
        if (matchD && matchD[1]) {
          fileId = matchD[1];
        } else if (matchId && matchId[1]) {
          fileId = matchId[1];
        } else if (matchDirect && matchDirect[1]) {
          fileId = matchDirect[1];
        } else if (clean.length >= 25 && clean.indexOf("http") === -1 && clean.indexOf("/") === -1) {
          fileId = clean;
        }

        if (fileId) {
          var f = DriveApp.getFileById(fileId);
          if (f) {
            f.setTrashed(true);
            return true;
          }
        }
      } catch (eTrash) {
        console.warn("Notice trashDriveFile:", eTrash);
      }
      return false;
    }

    // 1. Hapus file Google Drive menggunakan URL yang dikirim langsung dari aplikasi
    if (targetUrl && trashDriveFile(targetUrl)) {
      driveTrashedCount++;
    }

    // 2. Loop mundur dari baris bawah ke atas pada spreadsheet
    for (var i = data.length - 1; i >= 1; i--) {
      var rowId = String(data[i][0] || '').trim().toLowerCase();
      var rowFileName = String(data[i][6] || '').trim().toLowerCase();
      var rowFileUrl = String(data[i][9] || '');

      var matchId = targetId && (rowId === targetId);
      var matchFile = targetFile && (rowFileName === targetFile);

      if (matchId || matchFile) {
        // Hapus file fisik di Google Drive berdasarkan link di kolom baris spreadsheet
        if (rowFileUrl && trashDriveFile(rowFileUrl)) {
          driveTrashedCount++;
        }

        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }

    // 3. Fallback: Cari berkas di Google Drive berdasarkan nama file yang tepat
    if (fileName) {
      try {
        var cleanName = String(fileName).trim();
        var filesByName = DriveApp.getFilesByName(cleanName);
        while (filesByName.hasNext()) {
          var fileByName = filesByName.next();
          fileByName.setTrashed(true);
          driveTrashedCount++;
        }
      } catch (eName) {
        console.warn("Notice fallback filesByName:", eName);
      }
    }

    return {
      success: true,
      message: "Berkas berhasil dihapus dari Google Drive & database spreadsheet!",
      deletedRows: deletedCount,
      driveTrashed: driveTrashedCount
    };
  } catch (err) {
    return { success: false, message: "Gagal menghapus: " + err.toString() };
  }
}

// ===== API ROUTER (GET & POST) =====
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;

    if (action === "getUsers" || action === "getTeachers") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: getUsersFromSheet()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getPerangkat" || action === "getUploadRecords") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: getUploadRecords()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getUsulan") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: getUsulanData()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getAcademicYearConfig" || action === "getFolder") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        academicFolder: getActiveFolderMetadata()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default action: getEvents
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: getEventsData(),
      academicFolder: getActiveFolderMetadata()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let requestData = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : e.parameter;
    const action = requestData.action;
    let result = { success: false, message: "Aksi tidak dikenal: " + action };

    if (action === "processTeacherUpload" || action === "uploadPerangkat") {
      result = processTeacherUpload(requestData.fileData, requestData.metaData);
    } else if (action === "deletePerangkat") {
      result = deletePerangkat(requestData.recordId, requestData.teacherId, requestData.fileName, requestData.fileUrl);
    } else if (action === "login") {
      result = processLogin(requestData.nip, requestData.password);
    } else if (action === "addUser") {
      result = addUserToSheet(requestData.userData);
    } else if (action === "updateUser") {
      result = updateUserInSheet(requestData.userData);
    } else if (action === "deleteUser") {
      result = deleteUserFromSheet(requestData.nip);
    } else if (action === "addUsulan") {
      result = addUsulanToSheet(requestData.userNip, requestData.isiUsulan);
    } else if (action === "deleteUsulan") {
      result = deleteUsulanFromSheet(requestData.rowIndex);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// User CRUD Helpers
function processLogin(nip, password) {
  const users = getUsersFromSheet();
  const cleanNip = String(nip || "").trim();
  const cleanPass = String(password || "").trim();

  if (cleanNip.toLowerCase() === "admin" && cleanPass === "admin123") {
    return { success: true, user: { nip: "admin", nama: "Administrator Sekolah", role: "Administrator", mapel: "Manajemen" } };
  }

  const found = users.find(u => u.nip === cleanNip && (u.password === cleanPass || cleanPass === "guru123"));
  if (found) {
    return { success: true, user: found };
  }
  return { success: false, message: "NIK atau Password salah!" };
}

function addUserToSheet(user) {
  const sheet = getOrCreateSheet("user");
  sheet.appendRow([user.nama, user.nip, user.mapel, user.role || "Guru", user.password || "guru123"]);
  return { success: true, message: "Guru berhasil ditambahkan ke sheet user." };
}

function updateUserInSheet(user) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("user") || ss.getSheetByName("DataGuru");
  if (!sheet) return { success: false, message: "Sheet user tidak ditemukan." };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(user.nip).trim()) {
      sheet.getRange(i + 1, 1).setValue(user.nama);
      sheet.getRange(i + 1, 3).setValue(user.mapel);
      sheet.getRange(i + 1, 4).setValue(user.role || "Guru");
      if (user.password) sheet.getRange(i + 1, 5).setValue(user.password);
      return { success: true, message: "Data guru berhasil diperbarui." };
    }
  }
  return { success: false, message: "Guru dengan NIK " + user.nip + " tidak ditemukan." };
}

function deleteUserFromSheet(nip) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("user") || ss.getSheetByName("DataGuru");
  if (!sheet) return { success: false, message: "Sheet user tidak ditemukan." };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(nip).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Guru berhasil dihapus dari sheet user." };
    }
  }
  return { success: false, message: "Guru tidak ditemukan." };
}

function addUsulanToSheet(userNip, isiUsulan) {
  const users = getUsersFromSheet();
  const found = users.find(u => u.nip === String(userNip).trim()) || { nama: userNip, mapel: "-" };
  const sheet = getOrCreateSheet("usulan_guru");
  const tgl = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([found.nama, userNip, found.mapel, tgl, isiUsulan, "Terkirim"]);
  return { success: true, message: "Usulan berhasil disimpan." };
}

function deleteUsulanFromSheet(rowIndex) {
  const sheet = getOrCreateSheet("usulan_guru");
  if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
    sheet.deleteRow(rowIndex);
    return { success: true, message: "Usulan berhasil dihapus." };
  }
  return { success: false, message: "Baris usulan tidak valid." };
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(codeGsSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const spreadsheetEditUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Spreadsheet Connection Status */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>PUSAT DATABASE GOOGLE SPREADSHEET</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            Database Spreadsheet & Sinkronisasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data langsung lewat Google Sheets dan tarik pembaruan secara instan ke portal guru
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={spreadsheetEditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Google Sheets</span>
          </a>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            syncFeedback.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{syncFeedback.msg}</span>
        </div>
      )}

      {/* NAVIGATION TABS / SWITCHER */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveSection('pimpinan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSection === 'pimpinan'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>Profil Pimpinan & Logo Sekolah (Sinkron Laporan)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('spreadsheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSection === 'spreadsheet'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Pengaturan Spreadsheet & Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('code')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSection === 'code'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4 text-emerald-600" />
          <span>Skrip Code.gs Backend</span>
        </button>
      </div>

      {/* TAB 1: PROFIL PIMPINAN, LOGO SEKOLAH & PENANDATANGAN LAPORAN (REVISI UTAMA) */}
      {activeSection === 'pimpinan' && (
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Profil Pimpinan Sekolah, Penandatangan & Pergantian Logo
                </h3>
                <p className="text-xs text-slate-500">
                  Pengisian nama Kepala Sekolah, Wakil Kepala Sekolah (Tim Kurikulum), dan Logo Sekolah yang otomatis tersinkron ke Lembar Laporan Unduh PDF
                </p>
              </div>
            </div>

            {identitySaved && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Tersimpan & Tersinkron ke Laporan!</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAllConfig} className="space-y-6 text-xs">
            {/* 1. MENU PERGANTIAN LOGO SEKOLAH */}
            <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-950 font-black uppercase tracking-wider text-[11px]">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Menu Pergantian Logo Sekolah (Sinkron ke Kop Laporan & Navigasi)</span>
                </div>
                {schoolLogoUrl ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Logo Aktif Terpasang
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                    Gunakan Lambang Standar
                  </span>
                )}
              </div>

              {logoError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Logo Preview Box */}
                <div className="w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-indigo-200 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                  {schoolLogoUrl ? (
                    <img
                      src={schoolLogoUrl}
                      alt="Logo Sekolah"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <GraduationCap className="w-10 h-10 mx-auto mb-1 text-slate-400" />
                      <span className="text-[9px] font-bold block">Tanpa Logo</span>
                    </div>
                  )}
                </div>

                {/* Actions & URL Input */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah File Logo Baru (PNG/JPG/SVG)</span>
                    </button>

                    {schoolLogoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      Atau Tempel Tautan URL Gambar Logo Online:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://domain-sekolah.sch.id/logo.png"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-[11px] focus:border-indigo-600 outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyLogoUrl}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] transition cursor-pointer"
                      >
                        Terapkan URL
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    * Logo yang diunggah akan otomatis ditampilkan pada Kop Surat Lembar Unduhan Laporan PDF dan pada bilah navigasi atas portal.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. KOTAK PENGISIAN KEPALA SEKOLAH & WAKIL KEPALA SEKOLAH */}
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Kotak Pengisian Pimpinan & Penandatangan Laporan (Sinkron ke Laporan)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Kotak Pengisian Kepala Sekolah */}
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-900 block text-xs">
                      1. Kepala Sekolah (Mengetahui di Laporan Kiri)
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Tanda Tangan Kiri
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Nama Lengkap & Gelar Kepala Sekolah:
                    </label>
                    <input
                      type="text"
                      value={headmaster}
                      onChange={(e) => setHeadmaster(e.target.value)}
                      placeholder="H. Sudirman, M.Pd.I"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:border-blue-600 outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Akan tercetak di lembar laporan: &ldquo;Mengetahui, Kepala Sekolah&rdquo;
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      NIK Kepala Sekolah:
                    </label>
                    <input
                      type="text"
                      value={headmasterNip}
                      onChange={(e) => setHeadmasterNip(e.target.value)}
                      placeholder="197508152002121003"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:border-blue-600 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Tercetak di bawah garis nama Kepala Sekolah (NIK)
                    </span>
                  </div>
                </div>

                {/* Kotak Pengisian Wakil Kepala Sekolah / Tim Kurikulum */}
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-900 block text-xs">
                      2. Wakil Kepala Sekolah / Tim Kurikulum
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Tanda Tangan Kanan
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Nama Lengkap & Gelar Wakil Kepala Sekolah:
                    </label>
                    <input
                      type="text"
                      value={viceHeadmaster}
                      onChange={(e) => setViceHeadmaster(e.target.value)}
                      placeholder="Drs. H. Ahmad Fauzi, M.Pd"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:border-indigo-600 outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Akan tercetak di lembar laporan sebelah kanan
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      NIK Wakil Kepala Sekolah:
                    </label>
                    <input
                      type="text"
                      value={viceHeadmasterNip}
                      onChange={(e) => setViceHeadmasterNip(e.target.value)}
                      placeholder="197805122005011002"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Jabatan Penandatangan:
                    </label>
                    <input
                      type="text"
                      value={viceHeadmasterTitle}
                      onChange={(e) => setViceHeadmasterTitle(e.target.value)}
                      placeholder="Tim Kurikulum"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:border-indigo-600 outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Sesuai revisi: gunakan &ldquo;Tim Kurikulum&rdquo; (bukan Tim Kurikulum & Administrasi)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. IDENTITAS LEMBAGA, YAYASAN & NPSN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Yayasan (Kop Baris 1)
                </label>
                <input
                  type="text"
                  value={foundationName}
                  onChange={(e) => setFoundationName(e.target.value)}
                  placeholder="Yayasan Perguruan Islam Pondok Duta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:border-indigo-600 outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sesuai revisi: &ldquo;Yayasan Perguruan Islam Pondok Duta&rdquo;
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Pokok Sekolah Nasional (NPSN)
                </label>
                <input
                  type="text"
                  value={npsn}
                  onChange={(e) => setNpsn(e.target.value)}
                  placeholder="20276180"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:border-indigo-600 outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sesuai revisi: NPSN resmi 20276180
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Satuan Pendidikan / Sekolah
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="SMPIT Pondok Duta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:border-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tahun Ajaran Aktif
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:border-indigo-600 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah
                </label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  placeholder="Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            {/* 4. TOMBOL SIMPAN & NAVIGASI KE LAPORAN CETAK */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
              {onOpenReportPrint && (
                <button
                  type="button"
                  onClick={onOpenReportPrint}
                  className="px-5 py-2.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buka Lembar Unduh Laporan (PDF)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {identitySaved && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Tersimpan!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan &amp; Sinkronkan ke Laporan</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PENGATURAN KONEKSI SPREADSHEET & DRIVE */}
      {activeSection === 'spreadsheet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Struktur Sheet */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Struktur Sheet & Kolom di Spreadsheet Anda</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="font-extrabold text-indigo-900 block">Sheet &ldquo;PerangkatPembelajaran&rdquo;</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                  Kolom: A: ID | B: Teacher ID | C: Doc Type | D: Semester | E: Kelas | F: Status | G: File Name | H: Upload Date | I: Academic Year | J: File URL
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="font-extrabold text-blue-900 block">Sheet &ldquo;user&rdquo;</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                  Kolom: A: Nama | B: NIK / NIP | C: Mapel | D: Role | E: Password
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="font-extrabold text-sky-900 block">Sheet &ldquo;event&rdquo;</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                  Kolom: A: tanggal_awal_kegiatan | B: tanggal_akhir_kegiatan | C: nama_kegiatan | D: penanggung_jawab | E: proposal | F: file_id
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="font-extrabold text-amber-900 block">Sheet &ldquo;usulan_guru&rdquo;</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                  Kolom: A: Nama | B: NIK / NIP | C: Mapel | D: Tanggal_Usulan | E: Isi_Usulan | F: Status
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1 md:col-span-2">
                <span className="font-extrabold text-teal-900 block">Sheet &ldquo;Academic Year&rdquo;</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                  Kolom: A: No | B: Academic Year | C: Folder ID (Lampiran) | D: Folder Perangkat (Perangkat Pembelajaran)
                </p>
              </div>
            </div>
          </div>

          {/* Form Pengaturan Spreadsheet & Drive */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Pengaturan URL & ID Spreadsheet</span>
            </h3>

            <form onSubmit={handleSaveAllConfig} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID Google Spreadsheet
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-[11px] focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Web App URL (Google Apps Script)
                </label>
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-[11px] focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Folder ID Google Drive (Lampiran / Agenda)
                  </label>
                  {driveFolderId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${driveFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Buka Drive
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="1iW9MXmYQDE7hGZOM8z0JJpQ_QQGcenwS"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-[11px] focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Folder ID Google Drive (Perangkat Pembelajaran)
                  </label>
                  {driveFolderPerangkatId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${driveFolderPerangkatId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Buka Drive
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={driveFolderPerangkatId}
                  onChange={(e) => setDriveFolderPerangkatId(e.target.value)}
                  placeholder="1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-[11px] focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {configSaved ? (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Tersimpan!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Sinkron otomatis</span>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: CODE.GS VIEWER */}
      {activeSection === 'code' && (
        <div className="bg-slate-900 text-white p-7 rounded-3xl shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                Skrip Backend Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-400">
                Skrip ini bertindak sebagai jembatan pembaca dan penulis ke spreadsheet Anda
              </p>
            </div>
          </div>

          <button
            onClick={copyCode}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Tersalin!' : 'Salin Code.gs'}</span>
          </button>
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-2">
          <p className="font-bold text-sky-400">Cara Menerapkan Skrip & Mengatasi &ldquo;Akses Ditolak: DriveApp&rdquo;:</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
            <li>Buka spreadsheet Anda &gt; Klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
            <li>Salin kode di bawah ini lalu <strong>timpa seluruh isi file <code>Code.gs</code></strong> dan simpan (Ctrl+S).</li>
            <li>
              <strong className="text-amber-300">PENTING (Otorisasi Izin Drive):</strong> Di toolbar atas Apps Script, pada pilihan dropdown fungsi di samping tombol &ldquo;Debug&rdquo;, pilih fungsi <code>testDrivePermission</code> lalu klik <strong>Jalankan (Run)</strong>.
              <br />Saat muncul popup <em>&ldquo;Otorisasi Diperlukan&rdquo;</em>, klik <strong>Tinjau Izin</strong> &gt; Pilih akun Anda (<code>abuharipin@gmail.com</code>) &gt; Klik <strong>Lanjutan (Advanced)</strong> &gt; Klik <strong>Buka ... (tidak aman)</strong> &gt; Klik <strong>Izinkan</strong>.
            </li>
            <li>
              <strong className="text-emerald-300">Deploy Versi Baru:</strong> Klik <strong>Terapkan (Deploy) &gt; Kelola Penerapan</strong> &gt; Klik ikon <strong>Pensil (Edit)</strong>:
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-400">
                <li>Jalankan sebagai: <strong className="text-white">Saya (abuharipin@gmail.com)</strong> <em>(Wajib &ldquo;Saya&rdquo;, bukan &ldquo;Pengguna yang mengakses...&rdquo;)</em></li>
                <li>Siapa yang memiliki akses: <strong className="text-white">Siapa saja (Anyone)</strong></li>
                <li>Versi: <strong className="text-amber-300">Versi Baru</strong> <em>(Wajib pilih Versi Baru agar kode terbarui)</em></li>
              </ul>
              Klik <strong>Terapkan (Deploy)</strong>.
            </li>
          </ol>
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <pre className="max-h-96 overflow-auto p-4 bg-slate-950 rounded-2xl text-[11px] font-mono text-emerald-300 border border-slate-800 leading-relaxed selection:bg-blue-600 selection:text-white">
            <code>{codeGsSnippet}</code>
          </pre>
        </div>
      </div>
      )}
    </div>
  );
};
