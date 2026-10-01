import { AcademicEvent, UsulanItem, User, UploadRecord } from '../types';
import { dbService } from './storage';

export interface SpreadsheetFolderInfo {
  success: boolean;
  academicYear?: string;
  folderId?: string;
  folderName?: string;
  folderPerangkatId?: string;
  folderPerangkatName?: string;
  message?: string;
}

class GoogleSpreadsheetService {
  private getApiUrl(): string {
    const config = dbService.getConfig();
    return config.apps_script_url || 'https://script.google.com/macros/s/AKfycby599LImP-J6RkN-zYc77G1MhqYFtCz8-GfzT_8zi8vUVXIkSFs2A6KhI5B7obT9Ft2/exec';
  }

  // 1. Fetch Events & Academic Year from Sheet "event" & "Academic Year"
  public async fetchEvents(): Promise<{
    success: boolean;
    data?: AcademicEvent[];
    academicFolder?: SpreadsheetFolderInfo;
    message?: string;
  }> {
    try {
      const url = `${this.getApiUrl()}?action=getEvents&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('Live fetchEvents failed, using cached data:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // 2. Fetch Usulan from Sheet "usulan_guru"
  public async fetchUsulan(): Promise<{
    success: boolean;
    data?: UsulanItem[];
    message?: string;
  }> {
    try {
      const url = `${this.getApiUrl()}?action=getUsulan&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('Live fetchUsulan failed, using cached data:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // 3. Fetch Users from Sheet "user"
  public async fetchUsers(): Promise<{
    success: boolean;
    data?: User[];
    message?: string;
  }> {
    try {
      const url = `${this.getApiUrl()}?action=getUsers&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('Live fetchUsers failed, using cached data:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // 4. Fetch Perangkat Pembelajaran from Sheet "PerangkatPembelajaran"
  public async fetchPerangkat(): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      const url = `${this.getApiUrl()}?action=getPerangkat&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('Live fetchPerangkat failed, using cached data:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // 5. Fetch Settings (Pimpinan, Logo, Instansi) from Sheet "settings"
  public async fetchSettings(): Promise<{
    success: boolean;
    data?: Record<string, any>;
    message?: string;
  }> {
    try {
      const url = `${this.getApiUrl()}?action=getSettings&_t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn('Live fetchSettings failed, using cached data:', err);
      return {
        success: false,
        message: 'Gagal terhubung ke Google Apps Script: ' + (err.message || String(err)),
      };
    }
  }

  // 6. Complete Sync: Updates Events, Usulan, Perangkat, Users, and Settings from Sheet into the DB
  public async syncAll(): Promise<{ success: boolean; message: string }> {
    try {
      dbService.updateSyncStatus('syncing');

      const [eventsRes, usulanRes, usersRes, perangkatRes, settingsRes] = await Promise.all([
        this.fetchEvents(),
        this.fetchUsulan(),
        this.fetchUsers(),
        this.fetchPerangkat(),
        this.fetchSettings(),
      ]);

      let hasSuccess = false;

      // Sync Settings from Sheet "settings" (or attached inside eventsRes)
      const settingsObj =
        settingsRes.success && settingsRes.data && typeof settingsRes.data === 'object'
          ? settingsRes.data
          : (eventsRes as any)?.settings && typeof (eventsRes as any).settings === 'object'
          ? (eventsRes as any).settings
          : null;

      if (settingsObj) {
        const s = settingsObj;
        const configUpdates: any = {};
        if (s.school_name) configUpdates.school_name = String(s.school_name).trim();
        if (s.foundation_name) configUpdates.foundation_name = String(s.foundation_name).trim();
        if (s.npsn) configUpdates.npsn = String(s.npsn).trim();
        if (s.school_address) configUpdates.school_address = String(s.school_address).trim();
        if (s.academic_year) configUpdates.academic_year = String(s.academic_year).trim();
        
        // Headmaster Name & NIK/NIP
        if (s.headmaster && s.headmaster !== 'H. Sudirman, M.Pd.I') {
          configUpdates.headmaster = String(s.headmaster).trim();
        }
        const hNip = s.headmaster_nip ?? s.headmaster_nik ?? s.nik_kepala ?? s.nip_kepala ?? s.nik_kepsek ?? s.nip_kepsek;
        if (hNip !== undefined && hNip !== null && String(hNip).trim() !== '' && String(hNip).trim() !== '197508152002121003') {
          configUpdates.headmaster_nip = String(hNip).trim();
          configUpdates.headmaster_nik = String(hNip).trim();
        }

        // Vice Headmaster Name & NIK/NIP
        if (s.vice_headmaster && s.vice_headmaster !== 'Drs. H. Ahmad Fauzi, M.Pd') {
          configUpdates.vice_headmaster = String(s.vice_headmaster).trim();
        }
        const vNip = s.vice_headmaster_nip ?? s.vice_headmaster_nik ?? s.nik_wakil ?? s.nip_wakil ?? s.nik_wakasek ?? s.nip_wakasek ?? s.nik_kurikulum;
        if (vNip !== undefined && vNip !== null && String(vNip).trim() !== '' && String(vNip).trim() !== '197805122005011002') {
          configUpdates.vice_headmaster_nip = String(vNip).trim();
          configUpdates.vice_headmaster_nik = String(vNip).trim();
        }

        if (s.vice_headmaster_title) configUpdates.vice_headmaster_title = String(s.vice_headmaster_title).trim();
        if (s.school_logo_url !== undefined && s.school_logo_url !== null) {
          configUpdates.school_logo_url = String(s.school_logo_url).trim();
        }
        if (s.logo_folder_id) configUpdates.logo_folder_id = String(s.logo_folder_id).trim();

        if (Object.keys(configUpdates).length > 0) {
          dbService.updateConfig(configUpdates);
          hasSuccess = true;
        }
      }

      // Sync Users from Sheet "user" ONLY IF valid rows exist (never wipe with empty or corrupt rows)
      if (usersRes.success && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        const validRows = usersRes.data.filter(
          (u: any) =>
            u &&
            typeof u.nama === 'string' &&
            u.nama.trim().length > 2 &&
            u.nama.trim().toLowerCase() !== 'guru' &&
            typeof u.nip === 'string' &&
            u.nip.trim() !== '' &&
            !('nama_kegiatan' in u)
        );
        if (validRows.length >= 2) {
          hasSuccess = true;
          const mappedUsers: User[] = validRows.map((u: any, i: number) => {
            const cleanNip = String(u.nip || '').replace(/^T-|^USR-/, '').trim();
            const fullName = u.nama || u.name;
            return {
              id: cleanNip ? `USR-${cleanNip}` : `USR-${i + 1}`,
              nip: cleanNip,
              nama: fullName,
              mapel: u.mapel || u.subject || 'Guru Mapel',
              role: u.role || 'Guru',
              password: u.password || 'guru123',
              avatar: fullName ? fullName.charAt(0).toUpperCase() : 'G',
              nip_aliases: [cleanNip, `T-${cleanNip}`, fullName]
            };
          });
          dbService.replaceUsers(mappedUsers);
        }
      }

      // Sync Perangkat from Sheet "PerangkatPembelajaran" ONLY IF valid rows exist
      if (perangkatRes.success && Array.isArray(perangkatRes.data) && perangkatRes.data.length > 0) {
        const validRecords = perangkatRes.data.filter(
          (r: any) =>
            r &&
            typeof r.teacher_id === 'string' &&
            r.teacher_id.trim() !== '' &&
            typeof r.doc_type === 'string' &&
            ['MODUL', 'CP', 'ATP', 'KKTP', 'PROTA', 'PROSEM'].includes(r.doc_type.trim().toUpperCase()) &&
            !('nama_kegiatan' in r)
        );
        if (validRecords.length >= 1) {
          hasSuccess = true;
          const mappedRecords: UploadRecord[] = validRecords.map((r: any, i: number) => ({
            id: r.id || `REC-SS-${i + 1}`,
            teacher_id: String(r.teacher_id || '').trim(),
            teacher_name: r.teacher_name || '',
            doc_type: (r.doc_type || 'MODUL') as any,
            semester: (r.semester || 'Semester 1') as any,
            kelas: (r.kelas || 'Kelas 7') as any,
            status: r.status || 'uploaded',
            file_name: r.file_name || 'Berkas.pdf',
            uploaded_at: r.upload_date || new Date().toISOString(),
            academic_year: r.academic_year || dbService.getConfig().academic_year,
            file_url: r.file_url || ''
          }));
          dbService.replaceUploadRecords(mappedRecords);
        }
      }

      if (eventsRes.success && Array.isArray(eventsRes.data)) {
        hasSuccess = true;
        const mappedEvents: AcademicEvent[] = eventsRes.data.map((evt: any, i: number) => ({
          id: `EVT-SS-${evt.rowIndex || i + 2}`,
          rowIndex: evt.rowIndex || i + 2,
          tanggal_awal_kegiatan: evt.tanggal_awal_kegiatan ? evt.tanggal_awal_kegiatan.split('T')[0] : '',
          tanggal_akhir_kegiatan: evt.tanggal_akhir_kegiatan ? evt.tanggal_akhir_kegiatan.split('T')[0] : '',
          nama_kegiatan: evt.nama_kegiatan || 'Kegiatan',
          penanggung_jawab: evt.penanggung_jawab || '-',
          proposal: evt.proposal || '',
          file_id: evt.file_id || ''
        }));

        dbService.replaceEvents(mappedEvents);

        if (eventsRes.academicFolder && eventsRes.academicFolder.success) {
          dbService.updateConfig({
            academic_year: eventsRes.academicFolder.academicYear || dbService.getConfig().academic_year,
            drive_folder_id: eventsRes.academicFolder.folderId || dbService.getConfig().drive_folder_id,
            drive_folder_name: eventsRes.academicFolder.folderName || dbService.getConfig().drive_folder_name,
            drive_folder_perangkat_id: eventsRes.academicFolder.folderPerangkatId || dbService.getConfig().drive_folder_perangkat_id,
            drive_folder_perangkat_name: eventsRes.academicFolder.folderPerangkatName || dbService.getConfig().drive_folder_perangkat_name
          });
        }
      }

      if (usulanRes.success && Array.isArray(usulanRes.data)) {
        hasSuccess = true;
        const mappedUsulan: UsulanItem[] = usulanRes.data.map((u: any, i: number) => ({
          id: `USL-SS-${u.rowIndex || i + 2}`,
          rowIndex: u.rowIndex || i + 2,
          nama: u.nama || 'Guru',
          nip: String(u.nip || '').trim(),
          mapel: u.mapel || 'Guru Mapel',
          tanggal: u.tanggal || new Date().toISOString(),
          isi: u.isi || '',
          status: (u.status || 'Terkirim') as any
        }));

        dbService.replaceUsulan(mappedUsulan);
      }

      if (hasSuccess) {
        dbService.updateSyncStatus('connected', 'Tersinkronisasi dengan Google Spreadsheet');
        return {
          success: true,
          message: 'Data berhasil disinkronisasi langsung dari Google Spreadsheet!',
        };
      } else {
        const errorMsg = eventsRes.message || usulanRes.message || 'Gagal menyinkronkan data.';
        dbService.updateSyncStatus('error', errorMsg);
        return {
          success: false,
          message: errorMsg,
        };
      }
    } catch (err: any) {
      const errTxt = err.message || String(err);
      dbService.updateSyncStatus('error', errTxt);
      return { success: false, message: 'Gagal terhubung: ' + errTxt };
    }
  }

  // 4. Login via Google Apps Script (Sheet "user")
  public async loginViaSpreadsheet(nip: string, password: string): Promise<{
    success: boolean;
    user?: User;
    message: string;
  }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', nip, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        const userObj: User = {
          id: `USR-${data.user.nip}`,
          nip: data.user.nip,
          nama: data.user.nama,
          role: data.user.role || 'Guru',
          mapel: data.user.mapel || 'Guru Mata Pelajaran',
          avatar: data.user.nama ? data.user.nama.charAt(0).toUpperCase() : 'G'
        };
        return { success: true, user: userObj, message: `Selamat datang, ${data.user.nama}` };
      }
      return { success: false, message: data.message || 'NIK atau Password salah!' };
    } catch (err: any) {
      console.warn('Spreadsheet login failed, checking local directory:', err);
      // Fallback to local authentication
      return dbService.authenticate(nip, password);
    }
  }

  // 5. Add Usulan to Sheet "Usulan_Guru"
  public async addUsulanToSpreadsheet(userNip: string, isiUsulan: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addUsulan',
          userNip,
          isiUsulan,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Apps script addUsulan failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 6. Delete Usulan from Sheet "Usulan_Guru"
  public async deleteUsulanFromSpreadsheet(rowIndex: number, userNip: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteUsulan',
          rowIndex,
          userNip,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 7. Upload Proposal to Google Drive & update Sheet "event"
  public async uploadProposalToDrive(
    dataObj: { rowIndex: number; fileName: string; mimeType: string; base64: string },
    userNip: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadProposal',
          dataObj,
          userNip,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: 'Gagal mengunggah ke Drive: ' + (err.message || String(err)) };
    }
  }

  // 8. Delete Proposal from Google Drive & update Sheet "event"
  public async deleteProposalFromDrive(rowIndex: number, userNip: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteProposal',
          rowIndex,
          userNip,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: 'Gagal menghapus file: ' + (err.message || String(err)) };
    }
  }

  // 9. Add User to Sheet "user"
  public async addUserToSpreadsheet(user: {
    nama: string;
    nip: string;
    mapel: string;
    role: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addUser',
          userData: user,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('addUserToSpreadsheet failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 10. Update User in Sheet "user"
  public async updateUserInSpreadsheet(user: {
    nama: string;
    nip: string;
    mapel: string;
    role: string;
    password?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateUser',
          userData: user,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('updateUserInSpreadsheet failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 11. Delete User from Sheet "user"
  public async deleteUserFromSpreadsheet(nip: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteUser',
          nip,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('deleteUserFromSpreadsheet failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 12. Upload Perangkat Pembelajaran to Google Drive & Sheet "PerangkatPembelajaran"
  public async uploadPerangkat(
    fileData: { name: string; data: string },
    metaData: {
      teacher_id: string;
      teacher_name: string;
      doc_type: string;
      semester: string;
      kelas: string;
      academic_year: string;
      target_file_name?: string;
      folder_id?: string;
    }
  ): Promise<{ isOk: boolean; success?: boolean; msg: string; fileUrl?: string; fileName?: string; id?: string }> {
    try {
      const config = dbService.getConfig();
      const targetFolderId = metaData.folder_id || config.drive_folder_perangkat_id || config.drive_folder_id || '';
      const payloadMetaData = {
        ...metaData,
        folder_id: targetFolderId,
      };
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'processTeacherUpload',
          fileData,
          metaData: payloadMetaData,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('uploadPerangkat failed:', err);
      return { isOk: false, success: false, msg: 'Gagal mengunggah berkas: ' + (err.message || String(err)) };
    }
  }

  // 13. Delete Perangkat Pembelajaran from Google Drive & Sheet "PerangkatPembelajaran"
  public async deletePerangkatFromSpreadsheet(
    recordId: string,
    teacherId: string,
    fileName?: string,
    fileUrl?: string
  ): Promise<{ success: boolean; message: string; deletedCount?: number; driveTrashedCount?: number }> {
    try {
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deletePerangkat',
          recordId,
          teacherId,
          fileName: fileName || '',
          fileUrl: fileUrl || ''
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('deletePerangkat failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 14. Save Settings to Sheet "settings"
  public async saveSettings(settingsData: Record<string, any>): Promise<{
    success: boolean;
    data?: Record<string, any>;
    message: string;
  }> {
    try {
      // Immediately reflect updates in local database state
      dbService.updateConfig(settingsData);

      // Ensure both NIP and NIK aliases are sent so any column name in sheet settings matches
      const payloadSettings = {
        ...settingsData,
        headmaster_nik: settingsData.headmaster_nip || settingsData.headmaster_nik || '',
        vice_headmaster_nik: settingsData.vice_headmaster_nip || settingsData.vice_headmaster_nik || '',
        nik_wakil: settingsData.vice_headmaster_nip || settingsData.vice_headmaster_nik || '',
        nik_kepala: settingsData.headmaster_nip || settingsData.headmaster_nik || '',
      };

      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSettings',
          settingsData: payloadSettings,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (data.data) {
          dbService.updateConfig(data.data);
        }
        return {
          success: true,
          data: data.data || settingsData,
          message: data.message || 'Pengaturan pimpinan & logo berhasil disimpan ke sheet "settings"!',
        };
      }
      return {
        success: false,
        message: data?.message || 'Gagal menyimpan pengaturan ke database spreadsheet.',
      };
    } catch (err: any) {
      console.warn('saveSettings failed:', err);
      return { success: false, message: 'Koneksi error: ' + (err.message || String(err)) };
    }
  }

  // 15. Upload Logo to Google Drive Folder (1tFn4GYU5d231gJgqXSphAAGlyueOkljJ) & save to Sheet "settings"
  public async uploadLogo(
    fileData: { name: string; data: string },
    customFolderId?: string
  ): Promise<{
    success: boolean;
    fileUrl?: string;
    fileId?: string;
    driveUrl?: string;
    fileName?: string;
    message: string;
  }> {
    try {
      const folder_id = customFolderId?.trim() || dbService.getConfig().logo_folder_id || '1tFn4GYU5d231gJgqXSphAAGlyueOkljJ';
      const res = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadLogo',
          fileData,
          folder_id,
        }),
      });
      const data = await res.json();
      if (data && data.success && data.fileUrl) {
        dbService.updateConfig({
          school_logo_url: data.fileUrl,
          logo_folder_id: folder_id
        });
        return {
          success: true,
          fileUrl: data.fileUrl,
          fileId: data.fileId,
          driveUrl: data.driveUrl,
          fileName: data.fileName,
          message: data.message || 'Logo berhasil disimpan ke Google Drive (Folder: ' + folder_id + ') & sheet "settings"!'
        };
      }
      return {
        success: false,
        message: data?.message || 'Gagal mengunggah logo ke Google Drive.'
      };
    } catch (err: any) {
      console.warn('uploadLogo failed:', err);
      return { success: false, message: 'Gagal mengunggah logo ke Google Drive: ' + (err.message || String(err)) };
    }
  }
}

export const spreadsheetService = new GoogleSpreadsheetService();
