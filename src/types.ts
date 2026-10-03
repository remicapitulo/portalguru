export type UserRole = 'Administrator' | 'Guru' | 'admin' | 'guru';

export interface User {
  id: string;
  nip: string;
  nama: string;
  password?: string;
  role: string;
  mapel?: string;
  email?: string;
  avatar?: string;
  nip_aliases?: string[];
}

export type DocumentType = 'MODUL' | 'CP' | 'ATP' | 'KKTP' | 'PROTA' | 'PROSEM';
export type SemesterType = 'Semester 1' | 'Semester 2';
export type GradeClass = 'Kelas 7' | 'Kelas 8' | 'Kelas 9';

export interface UploadRecord {
  id: string;
  teacher_id: string;
  teacher_name: string;
  doc_type: DocumentType;
  semester: SemesterType;
  kelas: GradeClass;
  academic_year: string;
  file_name: string;
  file_url: string; // Data URL or external link
  file_size?: string;
  uploaded_at: string;
  status?: string;
}

export type EventStatus = 'belum' | 'berlangsung' | 'selesai';

export interface AcademicEvent {
  id: string;
  rowIndex?: number;
  nama_kegiatan: string;
  tanggal_awal_kegiatan: string; // YYYY-MM-DD or formatted string
  tanggal_akhir_kegiatan?: string; // YYYY-MM-DD
  penanggung_jawab: string;
  proposal?: string; // URL or Drive link
  file_id?: string; // Google Drive File ID
  proposal_name?: string;
  deskripsi?: string;
  lokasi?: string;
  status?: EventStatus;
}

export type UsulanStatus = 'Terkirim' | 'Proses' | 'Diterima' | 'Ditolak' | '';
export type UsulanKategori = 'Usulan Program' | 'Permintaan Sarana' | 'Masukan/Evaluasi' | 'Ide Inovasi' | string;

export interface UsulanItem {
  id: string;
  rowIndex?: number;
  nip: string;
  nama: string;
  mapel: string;
  kategori?: UsulanKategori;
  isi: string;
  tanggal: string; // ISO String or date format
  status: UsulanStatus;
  tanggapan_admin?: string;
}

export interface JurnalItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  tanggal: string;
  kelas: string;
  jam_ke: string;
  mapel: string;
  materi_pokok: string;
  kegiatan_pembelajaran: string;
  jumlah_hadir: number;
  jumlah_absen: number;
  catatan_refleksi?: string;
}

export interface SchoolConfig {
  school_name: string;
  foundation_name?: string;
  academic_year: string;
  semester_active: SemesterType;
  headmaster: string;
  headmaster_nip?: string;
  headmaster_nik?: string;
  vice_headmaster?: string;
  vice_headmaster_nip?: string;
  vice_headmaster_nik?: string;
  vice_headmaster_title?: string;
  school_address: string;
  npsn: string;
  school_logo_url?: string;
  logo_folder_id?: string;
  drive_folder_name?: string;
  drive_folder_id?: string;
  drive_folder_perangkat_id?: string;
  drive_folder_perangkat_name?: string;
  spreadsheet_id: string;
  apps_script_url: string;
  eflayer_apps_script_url?: string;
  penilaian_spreadsheet_id?: string;
  penilaian_apps_script_url?: string;
}

export interface AppDatabase {
  config: SchoolConfig;
  users: User[];
  events: AcademicEvent[];
  uploadRecords: UploadRecord[];
  usulanList: UsulanItem[];
  jurnalList: JurnalItem[];
  lastUpdated: string;
  lastSyncTime?: string;
  syncStatus?: 'connected' | 'syncing' | 'error' | 'idle';
  syncErrorMsg?: string;
}
