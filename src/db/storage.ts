import { AppDatabase, User, AcademicEvent, UploadRecord, UsulanItem, JurnalItem, SchoolConfig, DocumentType, SemesterType, GradeClass } from '../types';
import { initialDatabase, initialConfig } from './initialData';

const STORAGE_KEY = 'portal_guru_smpit_pondok_duta_db_v1';
const AUTH_KEY = 'portal_guru_logged_user';

type Listener = (db: AppDatabase) => void;

class FlexibleDatabaseService {
  private db: AppDatabase;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.db = this.loadFromStorage();
  }

  private loadFromStorage(): AppDatabase {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.config && Array.isArray(parsed.users)) {
          let needsResave = false;

          // Check if users were corrupted with empty or dummy "Guru" placeholders
          const validUsers = parsed.users.filter(
            (u: User) =>
              u &&
              typeof u.nama === 'string' &&
              u.nama.trim().length > 2 &&
              u.nama.trim().toLowerCase() !== 'guru' &&
              typeof u.nip === 'string' &&
              u.nip.trim() !== '' &&
              !('nama_kegiatan' in (u as any))
          );

          // If fewer than 5 valid teachers remain, localStorage was corrupted by empty sync. Restore initialUsers!
          if (validUsers.length < 5) {
            parsed.users = JSON.parse(JSON.stringify(initialDatabase.users));
            needsResave = true;
          } else {
            // Ensure administrator exists
            const hasAdmin = validUsers.some(
              (u: User) => u.nip === 'admin' || u.role?.toLowerCase() === 'administrator'
            );
            if (!hasAdmin) {
              validUsers.unshift(initialDatabase.users[0]);
            }
            parsed.users = validUsers;
          }

          // Ensure uploadRecords contains legitimate records from sheet PerangkatPembelajaran
          const validRecords = Array.isArray(parsed.uploadRecords)
            ? parsed.uploadRecords.filter(
                (r: UploadRecord) =>
                  r &&
                  typeof r.teacher_id === 'string' &&
                  r.teacher_id.trim() !== '' &&
                  typeof r.doc_type === 'string' &&
                  ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'].includes(r.doc_type.trim().toUpperCase()) &&
                  !('nama_kegiatan' in (r as any))
              )
            : [];

          if (validRecords.length < 10) {
            parsed.uploadRecords = JSON.parse(JSON.stringify(initialDatabase.uploadRecords));
            needsResave = true;
          } else {
            parsed.uploadRecords = validRecords;
          }

          if (!parsed.config.drive_folder_perangkat_id) {
            parsed.config.drive_folder_perangkat_id = '1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp';
            parsed.config.drive_folder_perangkat_name = 'Folder Perangkat Pembelajaran';
            needsResave = true;
          }

          // Clean up any remaining dummy values from old cache to avoid confusion
          const isDummyHeadmaster = !parsed.config.headmaster || parsed.config.headmaster === 'H. Sudirman, M.Pd.I';
          const isDummyHeadmasterNip = !parsed.config.headmaster_nip || parsed.config.headmaster_nip === '197508152002121003';
          const isDummyVice = !parsed.config.vice_headmaster || parsed.config.vice_headmaster === 'Drs. H. Ahmad Fauzi, M.Pd';
          const isDummyViceNip = !parsed.config.vice_headmaster_nip || parsed.config.vice_headmaster_nip === '197805122005011002';

          if (isDummyHeadmaster || isDummyHeadmasterNip || isDummyVice || isDummyViceNip) {
            needsResave = true;
          }

          const cleanViceNip = isDummyViceNip
            ? '02.20.09.112'
            : (parsed.config.vice_headmaster_nip || parsed.config.vice_headmaster_nik || '02.20.09.112');
          const cleanHeadNip = isDummyHeadmasterNip
            ? '03.18.10.49'
            : (parsed.config.headmaster_nip || parsed.config.headmaster_nik || '03.18.10.49');

          parsed.config = {
              ...initialConfig,
              ...parsed.config,
              npsn: (parsed.config.npsn === '20268412' || !parsed.config.npsn) ? '20276180' : parsed.config.npsn,
              foundation_name: (!parsed.config.foundation_name || parsed.config.foundation_name === 'Yayasan Pondok Duta')
                ? 'Yayasan Perguruan Islam Pondok Duta'
                : parsed.config.foundation_name,
              headmaster: isDummyHeadmaster ? 'Abu Haripin, M.Pd' : parsed.config.headmaster,
              headmaster_nip: cleanHeadNip,
              headmaster_nik: cleanHeadNip,
              vice_headmaster: isDummyVice ? 'Nilam Cahya, S.Pd' : parsed.config.vice_headmaster,
              vice_headmaster_nip: cleanViceNip,
              vice_headmaster_nik: cleanViceNip,
              vice_headmaster_title: (!parsed.config.vice_headmaster_title || parsed.config.vice_headmaster_title.includes('Administrasi'))
                ? 'Tim Kurikulum'
                : parsed.config.vice_headmaster_title,
              school_logo_url: parsed.config.school_logo_url || 'https://lh3.googleusercontent.com/d/1mnkKRHv-bqHsof1Lz4qdJd-o',
              logo_folder_id: parsed.config.logo_folder_id || '1tFn4GYU5d231gJgqXSphAAGlyueOkljJ'
            };

          if (needsResave) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (err) {
              console.warn('Storage resave warning:', err);
            }
          }

          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load database from localStorage, initializing defaults', e);
    }
    return JSON.parse(JSON.stringify(initialDatabase));
  }

  private saveToStorage() {
    try {
      this.db.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      this.notify();
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.db);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.db));
  }

  public getDatabase(): AppDatabase {
    return this.db;
  }

  // ===== AUTH & USER METHODS =====
  public getLoggedInUser(): User | null {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  public setLoggedInUser(user: User | null) {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  public authenticate(nip: string, pass: string): { success: boolean; user?: User; message: string } {
    const cleanNip = nip.trim();
    const cleanPass = pass.trim();

    // Check admin
    if (cleanNip.toLowerCase() === 'admin' && cleanPass === 'admin123') {
      const admin = this.db.users.find((u) => u.role === 'Administrator') || {
        id: 'ADM01',
        nip: 'admin',
        nama: 'Administrator Sekolah',
        role: 'Administrator'
      };
      return { success: true, user: admin, message: 'Login berhasil sebagai Administrator' };
    }

    const user = this.db.users.find(
      (u) => u.nip.trim() === cleanNip && (u.password ? u.password === cleanPass : cleanPass === 'guru123')
    );

    if (user) {
      return { success: true, user, message: `Selamat datang, ${user.nama}` };
    }

    return { success: false, message: 'NIK atau Password tidak cocok. Silakan coba lagi.' };
  }

  public getTeachers(): User[] {
    return this.db.users
      .filter((u) => !u.role || (u.role.toLowerCase() !== 'administrator' && u.nip !== 'admin'))
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));
  }

  public getAllUsers(): User[] {
    return this.db.users;
  }

  public replaceUsers(users: User[]) {
    // Only accept valid teachers with a valid NIP and non-placeholder name
    const valid = users.filter(
      (u) => u && u.nip && u.nip.trim() !== '' && u.nama && u.nama.trim() !== '' && u.nama !== 'Guru'
    );
    if (valid.length >= 3) {
      // Ensure admin exists
      const hasAdmin = valid.some((u) => u.role?.toLowerCase().includes('admin') || u.nip === 'admin');
      if (!hasAdmin) {
        const admin = this.db.users.find((u) => u.nip === 'admin') || initialDatabase.users[0];
        valid.unshift(admin);
      }
      // Sort teachers alphabetically (preserving administrator at the top)
      valid.sort((a, b) => {
        if (a.role?.toLowerCase() === 'administrator' || a.nip === 'admin') return -1;
        if (b.role?.toLowerCase() === 'administrator' || b.nip === 'admin') return 1;
        return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
      });
      this.db.users = valid;
      this.saveToStorage();
    }
  }

  public addTeacher(teacher: Omit<User, 'id'>): User {
    const newTeacher: User = {
      ...teacher,
      id: teacher.nip ? `USR-${teacher.nip}` : 'GUR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      role: teacher.role || 'Guru',
      avatar: teacher.nama ? teacher.nama.charAt(0).toUpperCase() : 'G'
    };
    this.db.users.push(newTeacher);
    // Keep teachers sorted
    this.db.users.sort((a, b) => {
      if (a.role?.toLowerCase() === 'administrator' || a.nip === 'admin') return -1;
      if (b.role?.toLowerCase() === 'administrator' || b.nip === 'admin') return 1;
      return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
    });
    this.saveToStorage();
    return newTeacher;
  }

  public updateTeacher(id: string, updates: Partial<User>) {
    this.db.users = this.db.users.map((u) => (u.id === id || u.nip === id ? { ...u, ...updates } : u));
    this.db.users.sort((a, b) => {
      if (a.role?.toLowerCase() === 'administrator' || a.nip === 'admin') return -1;
      if (b.role?.toLowerCase() === 'administrator' || b.nip === 'admin') return 1;
      return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
    });
    this.saveToStorage();
  }

  public deleteTeacher(id: string) {
    this.db.users = this.db.users.filter((u) => u.id !== id && u.nip !== id);
    // Also remove associated upload records
    this.db.uploadRecords = this.db.uploadRecords.filter((r) => r.teacher_id !== id);
    this.saveToStorage();
  }

  // ===== CONFIG METHODS =====
  public getConfig(): SchoolConfig {
    return this.db.config;
  }

  public updateConfig(updates: Partial<SchoolConfig>) {
    const sanitized = { ...updates };
    // Synchronize NIP and NIK aliases so both vice_headmaster_nip and vice_headmaster_nik always match
    if (sanitized.vice_headmaster_nik !== undefined && !sanitized.vice_headmaster_nip) {
      sanitized.vice_headmaster_nip = sanitized.vice_headmaster_nik;
    } else if (sanitized.vice_headmaster_nip !== undefined) {
      sanitized.vice_headmaster_nik = sanitized.vice_headmaster_nip;
    }
    if (sanitized.headmaster_nik !== undefined && !sanitized.headmaster_nip) {
      sanitized.headmaster_nip = sanitized.headmaster_nik;
    } else if (sanitized.headmaster_nip !== undefined) {
      sanitized.headmaster_nik = sanitized.headmaster_nip;
    }
    this.db.config = { ...this.db.config, ...sanitized };
    this.saveToStorage();
  }

  // ===== EVENTS / KALDIK METHODS =====
  public getEvents(): AcademicEvent[] {
    return this.db.events;
  }

  public getRecentAndUpcomingEvents(daysAhead = 30): AcademicEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + daysAhead);
    limitDate.setHours(23, 59, 59, 999);

    return this.db.events.filter((evt) => {
      if (!evt.tanggal_awal_kegiatan) return false;
      const start = new Date(evt.tanggal_awal_kegiatan);
      start.setHours(0, 0, 0, 0);

      let end = new Date(start);
      if (evt.tanggal_akhir_kegiatan) {
        const parsed = new Date(evt.tanggal_akhir_kegiatan);
        if (!isNaN(parsed.getTime())) end = parsed;
      }
      end.setHours(23, 59, 59, 999);

      // Event is between today and limitDate, or currently ongoing
      return end >= today && start <= limitDate;
    });
  }

  public addEvent(event: Omit<AcademicEvent, 'id'>): AcademicEvent {
    const newEvent: AcademicEvent = {
      ...event,
      id: 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    this.db.events.unshift(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  public updateEvent(id: string, updates: Partial<AcademicEvent>) {
    this.db.events = this.db.events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    this.saveToStorage();
  }

  public deleteEvent(id: string) {
    this.db.events = this.db.events.filter((e) => e.id !== id);
    this.saveToStorage();
  }

  public replaceEvents(events: AcademicEvent[]) {
    this.db.events = events;
    this.saveToStorage();
  }

  // ===== PERANGKAT PEMBELAJARAN / UPLOAD RECORDS =====
  public matchTeacherRecord(r: UploadRecord, teacher: User): boolean {
    if (!teacher || !r) return false;
    const recTid = (r.teacher_id || '').trim();
    const cleanRecNip = recTid.replace(/^T-|^USR-/, '').trim();
    const teacherNip = (teacher.nip || '').trim();
    const cleanTeacherNip = teacherNip.replace(/^T-|^USR-/, '').trim();

    if (recTid === teacher.id) return true;
    if (recTid === teacherNip || recTid === `T-${cleanTeacherNip}`) return true;
    if (cleanRecNip && cleanTeacherNip && cleanRecNip === cleanTeacherNip) return true;

    // Check aliases
    if (teacher.nip_aliases && teacher.nip_aliases.some((alias) => {
      const cleanAlias = alias.replace(/^T-|^USR-/, '').trim();
      return cleanRecNip === cleanAlias || recTid === alias || recTid === `T-${cleanAlias}`;
    })) {
      return true;
    }

    // Check teacher name match from file or record
    if (teacher.nama) {
      const cleanTName = teacher.nama.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanTName.length >= 4) {
        if (r.file_name) {
          const cleanFileName = r.file_name.toLowerCase().replace(/[^a-z]/g, '');
          if (cleanFileName.includes(cleanTName) || cleanTName.includes(cleanFileName)) {
            return true;
          }
        }
        if (r.teacher_name) {
          const cleanRecName = r.teacher_name.toLowerCase().replace(/[^a-z]/g, '');
          if (cleanRecName.length >= 4 && (cleanTName.includes(cleanRecName) || cleanRecName.includes(cleanTName))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public getUploadRecordsList(
    teacherId: string,
    docType?: DocumentType,
    semester?: SemesterType,
    kelas?: GradeClass
  ): UploadRecord[] {
    const cleanId = (teacherId || '').replace(/^T-|^USR-/, '').trim();
    const teacher = this.db.users.find(
      (u) =>
        u.id === teacherId ||
        u.nip === teacherId ||
        `T-${u.nip}` === teacherId ||
        `USR-${u.nip}` === teacherId ||
        (u.nip && u.nip.replace(/^T-|^USR-/, '').trim() === cleanId) ||
        (u.nip_aliases && u.nip_aliases.some((a) => a.replace(/^T-|^USR-/, '').trim() === cleanId))
    );

    return this.db.uploadRecords.filter((r) => {
      if (teacher && !this.matchTeacherRecord(r, teacher)) return false;
      if (!teacher && r.teacher_id !== teacherId && r.teacher_id !== `T-${teacherId}`) return false;
      if (docType && r.doc_type !== docType) return false;
      if (semester && r.semester !== semester) return false;
      if (kelas && r.kelas !== kelas) return false;
      return true;
    });
  }

  public getAllUploadRecords(): UploadRecord[] {
    return this.db.uploadRecords;
  }

  public replaceUploadRecords(records: UploadRecord[]) {
    if (Array.isArray(records)) {
      const valid = records.filter(
        (r) =>
          r &&
          typeof r.teacher_id === 'string' &&
          r.teacher_id.trim() !== '' &&
          typeof r.doc_type === 'string' &&
          ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'].includes(r.doc_type.trim().toUpperCase()) &&
          !('nama_kegiatan' in (r as any))
      );
      if (valid.length >= 1) {
        this.db.uploadRecords = valid;
        this.saveToStorage();
      }
    }
  }

  public getUploadRecordsForSlot(
    teacherId: string,
    docType: DocumentType,
    semester: SemesterType,
    kelas: GradeClass
  ): UploadRecord[] {
    const cleanId = (teacherId || '').replace(/^T-|^USR-/, '').trim();
    const teacher = this.db.users.find(
      (u) =>
        u.id === teacherId ||
        u.nip === teacherId ||
        `T-${u.nip}` === teacherId ||
        `USR-${u.nip}` === teacherId ||
        (u.nip && u.nip.replace(/^T-|^USR-/, '').trim() === cleanId) ||
        (u.nip_aliases && u.nip_aliases.some((a) => a.replace(/^T-|^USR-/, '').trim() === cleanId))
    );

    return this.db.uploadRecords.filter(
      (r) =>
        (teacher ? this.matchTeacherRecord(r, teacher) : (r.teacher_id === teacherId || r.teacher_id === `T-${cleanId}`)) &&
        r.doc_type === docType &&
        r.semester === semester &&
        r.kelas === kelas
    );
  }

  public addUploadRecord(record: Omit<UploadRecord, 'id' | 'uploaded_at'>): UploadRecord {
    const newRec: UploadRecord = {
      ...record,
      id: 'REC-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      status: 'uploaded',
      uploaded_at: new Date().toISOString()
    };
    this.db.uploadRecords.unshift(newRec);
    this.saveToStorage();
    return newRec;
  }

  public deleteUploadRecord(id: string, fileName?: string, fileUrl?: string) {
    const cleanId = (id || '').trim().toLowerCase();
    const cleanFile = (fileName || '').trim().toLowerCase();
    const cleanUrl = (fileUrl || '').trim();
    this.db.uploadRecords = this.db.uploadRecords.filter((r) => {
      if (cleanId && (r.id || '').trim().toLowerCase() === cleanId) return false;
      if (cleanFile && (r.file_name || '').trim().toLowerCase() === cleanFile) return false;
      if (cleanUrl && (r.file_url || '').trim() === cleanUrl) return false;
      return true;
    });
    this.saveToStorage();
  }

  public calculateTeacherProgress(teacherId: string) {
    const docTypes: DocumentType[] = ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'];
    const semesters: SemesterType[] = ['Semester 1', 'Semester 2'];
    const classes: GradeClass[] = ['Kelas 7', 'Kelas 8', 'Kelas 9'];

    const cleanId = (teacherId || '').replace(/^T-|^USR-/, '').trim();
    const teacher = this.db.users.find(
      (u) =>
        u.id === teacherId ||
        u.nip === teacherId ||
        `T-${u.nip}` === teacherId ||
        `USR-${u.nip}` === teacherId ||
        (u.nip && u.nip.replace(/^T-|^USR-/, '').trim() === cleanId) ||
        (u.nip_aliases && u.nip_aliases.some((a) => a.replace(/^T-|^USR-/, '').trim() === cleanId))
    );

    const totalSlots = docTypes.length * semesters.length * classes.length; // 36 slots
    let filledSlots = 0;

    const breakdown: Record<DocumentType, number> = {
      MODUL: 0,
      CP: 0,
      ATP: 0,
      KKTP: 0,
      PROTA: 0,
      PROSEM: 0
    };

    docTypes.forEach((doc) => {
      let docCount = 0;
      semesters.forEach((sem) => {
        classes.forEach((kls) => {
          const count = this.db.uploadRecords.filter(
            (r) =>
              (teacher ? this.matchTeacherRecord(r, teacher) : (r.teacher_id === teacherId || r.teacher_id === `T-${cleanId}`)) &&
              r.doc_type === doc &&
              r.semester === sem &&
              r.kelas === kls
          ).length;
          if (count > 0) {
            filledSlots++;
            docCount++;
          }
        });
      });
      breakdown[doc] = docCount; // Max 6 per doctype
    });

    const percentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return {
      percentage,
      filledSlots,
      totalSlots,
      breakdown
    };
  }

  public restoreInitialTeachers() {
    this.db.users = JSON.parse(JSON.stringify(initialDatabase.users));
    this.db.uploadRecords = JSON.parse(JSON.stringify(initialDatabase.uploadRecords));
    this.saveToStorage();
  }

  // ===== USULAN / SUARA GURU =====
  public getUsulanList(): UsulanItem[] {
    return this.db.usulanList;
  }

  public addUsulan(item: Omit<UsulanItem, 'id' | 'tanggal' | 'status'>): UsulanItem {
    const newUsulan: UsulanItem = {
      ...item,
      id: 'USL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      tanggal: new Date().toISOString(),
      status: 'Terkirim'
    };
    this.db.usulanList.unshift(newUsulan);
    this.saveToStorage();
    return newUsulan;
  }

  public updateUsulanStatus(id: string, status: UsulanItem['status'], tanggapan?: string) {
    this.db.usulanList = this.db.usulanList.map((u) =>
      u.id === id
        ? {
            ...u,
            status,
            ...(tanggapan !== undefined ? { tanggapan_admin: tanggapan } : {})
          }
        : u
    );
    this.saveToStorage();
  }

  public deleteUsulan(id: string) {
    this.db.usulanList = this.db.usulanList.filter((u) => u.id !== id);
    this.saveToStorage();
  }

  public replaceUsulan(usulan: UsulanItem[]) {
    this.db.usulanList = usulan;
    this.saveToStorage();
  }

  public updateSyncStatus(status: 'connected' | 'syncing' | 'error' | 'idle', errorMsg?: string) {
    this.db.syncStatus = status;
    this.db.syncErrorMsg = errorMsg;
    if (status === 'connected') {
      this.db.lastSyncTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    this.saveToStorage();
  }

  public getSpreadsheetEditUrl(): string {
    return `https://docs.google.com/spreadsheets/d/${this.db.config.spreadsheet_id || '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc'}/edit`;
  }

  // ===== JURNAL MENGAJAR =====
  public getJurnalList(teacherId?: string): JurnalItem[] {
    if (teacherId) {
      return this.db.jurnalList.filter((j) => j.teacher_id === teacherId);
    }
    return this.db.jurnalList;
  }

  public addJurnal(jurnal: Omit<JurnalItem, 'id'>): JurnalItem {
    const newJurnal: JurnalItem = {
      ...jurnal,
      id: 'JRN-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    this.db.jurnalList.unshift(newJurnal);
    this.saveToStorage();
    return newJurnal;
  }

  public deleteJurnal(id: string) {
    this.db.jurnalList = this.db.jurnalList.filter((j) => j.id !== id);
    this.saveToStorage();
  }

  // ===== BACKUP, RESTORE & EXPORT / IMPORT =====
  public exportDatabaseJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importDatabaseJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonStr) as AppDatabase;
      if (!parsed || !parsed.config || !Array.isArray(parsed.users)) {
        return { success: false, message: 'Format file JSON tidak valid untuk database Portal Guru.' };
      }
      this.db = parsed;
      this.saveToStorage();
      return { success: true, message: 'Database berhasil diimpor & disinkronkan secara instan!' };
    } catch (e: any) {
      return { success: false, message: 'Gagal memproses file JSON: ' + (e.message || String(e)) };
    }
  }

  public resetToDefault() {
    this.db = JSON.parse(JSON.stringify(initialDatabase));
    this.saveToStorage();
  }
}

export const dbService = new FlexibleDatabaseService();
