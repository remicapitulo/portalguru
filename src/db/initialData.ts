import { AppDatabase, User, AcademicEvent, UploadRecord, UsulanItem, JurnalItem, SchoolConfig } from '../types';

export const initialConfig: SchoolConfig = {
  school_name: 'SMPIT Pondok Duta',
  foundation_name: 'Yayasan Perguruan Islam Pondok Duta',
  academic_year: '2026/2027',
  semester_active: 'Semester 1',
  headmaster: 'Abu Haripin, M.Pd',
  headmaster_nip: '03.18.10.49',
  vice_headmaster: 'Nilam Cahya, S.Pd',
  vice_headmaster_nip: '02.20.09.112',
  vice_headmaster_title: 'Tim Kurikulum',
  school_address: 'Jl. Duta Plaza No. 1, Cimanggis, Depok, Jawa Barat',
  npsn: '20276180',
  school_logo_url: 'https://lh3.googleusercontent.com/d/1mnkKRHv-bqHsof1Lz4qdJd-o',
  logo_folder_id: '1tFn4GYU5d231gJgqXSphAAGlyueOkljJ',
  spreadsheet_id: '1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc',
  apps_script_url: 'https://script.google.com/macros/s/AKfycby599LImP-J6RkN-zYc77G1MhqYFtCz8-GfzT_8zi8vUVXIkSFs2A6KhI5B7obT9Ft2/exec',
  drive_folder_id: '1iW9MXmYQDE7hGZOM8z0JJpQ_QQGcenwS',
  drive_folder_name: 'Arsip Administrasi SMPIT Pondok Duta 2026/2027',
  drive_folder_perangkat_id: '1sgMfoLIvjrjRbBO6__inK2ZQ4d7XrJcp',
  drive_folder_perangkat_name: 'Folder Perangkat Pembelajaran'
};

// Data pengguna riil sekolah sesuai sheet "user" & "usulan_guru"
export const initialUsers: User[] = [
  {
    id: 'USR-01',
    nip: 'admin',
    nama: 'Administrator Sekolah',
    password: 'admin',
    role: 'Administrator',
    mapel: 'Manajemen',
    email: 'admin@smpitpondokduta.sch.id',
    avatar: 'A'
  },
  {
    id: 'USR-02',
    nip: '03.13.01.13',
    nama: 'Abu Haripin, M.Pd',
    password: 'guru',
    role: 'Administrator',
    mapel: 'Bahasa Inggris',
    email: 'abuharipin23@admin.smp.belajar.id',
    avatar: 'H',
    nip_aliases: ['03.13.01.13', 'T-03.13.01.13', 'Abu Haripin', 'Abu Haripin, M.Pd']
  },
  {
    id: 'USR-03',
    nip: '03.13.06.15',
    nama: 'M. Miftahur Rahman, S.I',
    password: 'guru',
    role: 'Guru',
    mapel: 'Al Qur\'an',
    email: 'miftahur@smpitpondokduta.sch.id',
    avatar: 'M',
    nip_aliases: ['02.18.07.135', '03.13.06.15', 'T-03.13.06.15', 'Novi Mulafatturrahman', 'Novi Mulafatturrahman, S.Pd.', 'M. Miftahur Rahman']
  },
  {
    id: 'USR-04',
    nip: '03.25.07.63',
    nama: 'Chintya Handayani, M.Pd',
    password: 'guru',
    role: 'Guru',
    mapel: 'IPS',
    email: 'chintya@smpitpondokduta.sch.id',
    avatar: 'C',
    nip_aliases: ['03.25.07.63', 'T-03.25.07.63', 'Chintya Handaya', 'Chintya Handaya, M.Pd', 'Chintya Handayani']
  },
  {
    id: 'USR-05',
    nip: '03.26.06.66',
    nama: 'Firhan Baihaqi, S.Pd',
    password: 'guru',
    role: 'Guru',
    mapel: 'PJOK',
    email: 'firhan@smpitpondokduta.sch.id',
    avatar: 'F',
    nip_aliases: ['03.26.06.66', 'T-03.26.06.66', 'Firhan Baihaqi']
  },
  {
    id: 'USR-06',
    nip: '02.13.08.92',
    nama: 'Syifa Fauziah, S.Pd.I',
    password: 'guru',
    role: 'Guru',
    mapel: 'PAI & Budi Pekerti',
    email: 'syifa@smpitpondokduta.sch.id',
    avatar: 'S',
    nip_aliases: ['02.19.08.101', '02.13.08.92', 'T-02.13.08.92', 'Syifa Fauziah']
  },
  {
    id: 'USR-07',
    nip: '02.20.09.112',
    nama: 'Nilam Cahya, S.Pd',
    password: 'guru',
    role: 'Guru',
    mapel: 'Matematika',
    email: 'nilam@smpitpondokduta.sch.id',
    avatar: 'N',
    nip_aliases: ['02.20.09.112', 'T-02.20.09.112', 'Nilam Cahya']
  },
  {
    id: 'USR-08',
    nip: '01.13.07.24',
    nama: 'Nurhasanah, S.Pd',
    password: 'guru',
    role: 'Guru',
    mapel: 'Bahasa Indonesia',
    email: 'nurhasanah@smpitpondokduta.sch.id',
    avatar: 'N',
    nip_aliases: ['03.21.05.77', '01.13.07.24', 'T-01.13.07.24', 'Nurhasanah']
  },
  {
    id: 'USR-09',
    nip: '03.23.09.61',
    nama: 'Anggita Aprilia Sari, S.Sos',
    password: 'guru',
    role: 'Guru',
    mapel: 'BK & Komite',
    email: 'anggita@smpitpondokduta.sch.id',
    avatar: 'A',
    nip_aliases: ['03.24.08.89', '03.23.09.61', 'T-03.23.09.61', 'Anggita Aprilia Sari', 'Anggita Aprillia Sari', 'Anggita Aprillia Sari, S.Sos']
  }
];

// Data riil agenda dari sheet "event"
export const initialEvents: AcademicEvent[] = [
  {
    id: 'EVT-001',
    rowIndex: 2,
    tanggal_awal_kegiatan: '2026-06-15',
    tanggal_akhir_kegiatan: '2026-07-10',
    nama_kegiatan: 'Libur Akhir Tahun 2026/2027 dan PPDB',
    penanggung_jawab: '-',
    proposal: '',
    file_id: '',
    lokasi: 'SMPIT Pondok Duta'
  },
  {
    id: 'EVT-002',
    rowIndex: 3,
    tanggal_awal_kegiatan: '2026-07-13',
    tanggal_akhir_kegiatan: '2026-07-17',
    nama_kegiatan: 'Masa Pengenalan Lingkungan Sekolah (MPLS)',
    penanggung_jawab: 'Syifa Fauziah, S.Pd.I',
    proposal: 'https://docs.google.com/document/d/1DEOmq6G6dwsRK...',
    file_id: '1DEOmq6G6dwsRK...',
    lokasi: 'Aula & Lapangan Utama'
  },
  {
    id: 'EVT-003',
    rowIndex: 4,
    tanggal_awal_kegiatan: '2026-07-20',
    tanggal_akhir_kegiatan: '2026-07-20',
    nama_kegiatan: 'KBM Normal',
    penanggung_jawab: '-',
    proposal: '',
    file_id: '',
    lokasi: 'Seluruh Ruang Kelas'
  },
  {
    id: 'EVT-004',
    rowIndex: 5,
    tanggal_awal_kegiatan: '2026-07-21',
    tanggal_akhir_kegiatan: '2026-07-23',
    nama_kegiatan: 'Placementest Al Qur\'an Kelas VII',
    penanggung_jawab: 'M. Miftahur Rahman, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Masjid & Ruang Kelas VII'
  },
  {
    id: 'EVT-005',
    rowIndex: 6,
    tanggal_awal_kegiatan: '2026-07-31',
    tanggal_akhir_kegiatan: '2026-07-31',
    nama_kegiatan: 'Rapat Dinas dan Komunitas Belajar Bulan Juli',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Ruang Multimedia'
  },
  {
    id: 'EVT-006',
    rowIndex: 7,
    tanggal_awal_kegiatan: '2026-08-03',
    tanggal_akhir_kegiatan: '2026-08-03',
    nama_kegiatan: 'Pelaksanaan Ekstrakurikuler dan Infaq Harian',
    penanggung_jawab: '-',
    proposal: '',
    file_id: '',
    lokasi: 'Lingkungan Sekolah'
  },
  {
    id: 'EVT-007',
    rowIndex: 8,
    tanggal_awal_kegiatan: '2026-08-07',
    tanggal_akhir_kegiatan: '2026-08-07',
    nama_kegiatan: 'Penunjukkan Komite dan Kordinator Kelas',
    penanggung_jawab: 'Anggita Aprilia Sari, S.Sos',
    proposal: '',
    file_id: '',
    lokasi: 'Aula SMPIT Pondok Duta'
  },
  {
    id: 'EVT-008',
    rowIndex: 9,
    tanggal_awal_kegiatan: '2026-08-12',
    tanggal_akhir_kegiatan: '2026-08-12',
    nama_kegiatan: 'Peringatan Pramuka',
    penanggung_jawab: 'Syifa Fauziah, S.Pd.I',
    proposal: 'https://drive.google.com/file/d/1fU0mv8I_f-b9xmm...',
    file_id: '1fU0mv8I_f-b9xmm...',
    lokasi: 'Lapangan Olahraga'
  },
  {
    id: 'EVT-009',
    rowIndex: 10,
    tanggal_awal_kegiatan: '2026-08-17',
    tanggal_akhir_kegiatan: '2026-08-17',
    nama_kegiatan: 'Libur HUT Republik Indonesia Ke-80',
    penanggung_jawab: '-',
    proposal: '',
    file_id: '',
    lokasi: '-'
  },
  {
    id: 'EVT-010',
    rowIndex: 11,
    tanggal_awal_kegiatan: '2026-08-18',
    tanggal_akhir_kegiatan: '2026-08-18',
    nama_kegiatan: 'Perayaan HUT Republik Indonesia Ke-80',
    penanggung_jawab: 'Nurhasanah, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Lapangan & Selasar SMPIT Pondok Duta'
  },
  {
    id: 'EVT-011',
    rowIndex: 12,
    tanggal_awal_kegiatan: '2026-08-24',
    tanggal_akhir_kegiatan: '2026-08-27',
    nama_kegiatan: 'Pelaksanaan Asesmen Nasional SMP',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Laboratorium Komputer CBT'
  },
  {
    id: 'EVT-012',
    rowIndex: 13,
    tanggal_awal_kegiatan: '2026-08-28',
    tanggal_akhir_kegiatan: '2026-08-28',
    nama_kegiatan: 'Rapat Dinas dan Komunitas Belajar Bulan Agustus',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Ruang Guru'
  },
  {
    id: 'EVT-013',
    rowIndex: 14,
    tanggal_awal_kegiatan: '2026-08-31',
    tanggal_akhir_kegiatan: '2026-08-31',
    nama_kegiatan: 'Pelaksanaan Tim TPDS dan Upacara Bendera',
    penanggung_jawab: 'Nurhasanah, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Lapangan Sekolah'
  },
  {
    id: 'EVT-014',
    rowIndex: 15,
    tanggal_awal_kegiatan: '2026-09-04',
    tanggal_akhir_kegiatan: '2026-09-04',
    nama_kegiatan: 'Launching PPDB',
    penanggung_jawab: 'Anggita Aprilia Sari, S.Sos',
    proposal: '',
    file_id: '',
    lokasi: 'Lobi & Kanal Media Sosial'
  },
  {
    id: 'EVT-015',
    rowIndex: 16,
    tanggal_awal_kegiatan: '2026-09-05',
    tanggal_akhir_kegiatan: '2026-09-05',
    nama_kegiatan: 'Libur Maulid Nabi Muhammad SAW',
    penanggung_jawab: '-',
    proposal: '',
    file_id: '',
    lokasi: '-'
  },
  {
    id: 'EVT-016',
    rowIndex: 17,
    tanggal_awal_kegiatan: '2026-09-14',
    tanggal_akhir_kegiatan: '2026-09-17',
    nama_kegiatan: 'Pelaksanaan Sulingjar (Kepala Sekolah dan Guru)',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Ruang CBT / Daring'
  },
  {
    id: 'EVT-017',
    rowIndex: 18,
    tanggal_awal_kegiatan: '2026-09-25',
    tanggal_akhir_kegiatan: '2026-09-25',
    nama_kegiatan: 'Rapat Dinas dan Komunitas Belajar Bulan September',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Ruang Rapat Sekolah'
  },
  {
    id: 'EVT-018',
    rowIndex: 19,
    tanggal_awal_kegiatan: '2026-09-28',
    tanggal_akhir_kegiatan: '2026-09-28',
    nama_kegiatan: 'Sumatif Tengah Semester Ganjil (STS)',
    penanggung_jawab: 'Nilam Cahya, S.Pd',
    proposal: '',
    file_id: '',
    lokasi: 'Ruang Ujian Kelas 7, 8, 9'
  }
];

// Data riil usulan dari sheet "usulan_guru"
export const initialUsulanList: UsulanItem[] = [
  {
    id: 'USL-001',
    rowIndex: 2,
    nama: 'admin',
    nip: 'admin',
    mapel: 'admin',
    tanggal: '2026-07-26 19:47:23',
    isi: 'AC nya kurang dingin. Mohon di perbaiki di ruang kelas.',
    status: 'Proses'
  },
  {
    id: 'USL-002',
    rowIndex: 3,
    nama: 'M. Miftahur Rahman, S.I',
    nip: '02.18.07.135',
    mapel: 'Al Qur\'an',
    tanggal: '2026-07-31 14:22:19',
    isi: 'Usul servis AC kelas majah yang dibelakang karena mengeluarkan suara bising.',
    status: 'Ditolak'
  },
  {
    id: 'USL-003',
    rowIndex: 4,
    nama: 'Chintya Handayani, M.P',
    nip: '03.25.07.63',
    mapel: 'IPS',
    tanggal: '2026-07-31 14:24:09',
    isi: 'Tolong diperiksa AC kelas kholdun yang tidak dingin saat siang hari.',
    status: 'Diterima'
  },
  {
    id: 'USL-004',
    rowIndex: 5,
    nama: 'Firhan Baihaqi, S.Pd',
    nip: '03.26.06.66',
    mapel: 'PJOK',
    tanggal: '2026-07-31 14:28:48',
    isi: 'tolong belikan bola basket, bola voli, bola futsal, agility ladder (tangga kelincahan), cone (corong), gawang mini.',
    status: 'Terkirim'
  },
  {
    id: 'USL-005',
    rowIndex: 6,
    nama: 'Abu Haripin, M.Pd',
    nip: '03.13.01.13',
    mapel: 'Bahasa Inggris',
    tanggal: '2026-08-03 10:30:57',
    isi: 'Pergantian Ring basket yang sudah rusak. masa pakainya sudah lebih dari 5 tahun.',
    status: 'Terkirim'
  },
  {
    id: 'USL-006',
    rowIndex: 7,
    nama: 'admin',
    nip: 'admin',
    mapel: 'admin',
    tanggal: '2026-08-04 16:35:50',
    isi: 'Speaker Portable untuk senam dan sholat di aula.',
    status: 'Terkirim'
  },
  {
    id: 'USL-007',
    rowIndex: 8,
    nama: 'Abu Haripin, M.Pd',
    nip: '03.13.01.13',
    mapel: 'Bahasa Inggris',
    tanggal: '2026-08-08 19:25:48',
    isi: 'Membuat Hidropinik di Rooptop, referensi link: https://www.instagram.com/reel/DZ46VetDJ4E/',
    status: 'Terkirim'
  },
  {
    id: 'USL-008',
    rowIndex: 9,
    nama: 'Abu Haripin, M.Pd',
    nip: '03.13.01.13',
    mapel: 'Bahasa Inggris',
    tanggal: '2026-08-08 19:26:31',
    isi: 'Pindahkan speaker ruang majah ke Lapangan.',
    status: 'Terkirim'
  }
];

export const initialUploadRecords: UploadRecord[] = [
  {
    id: 'REC-1B94AC52',
    teacher_id: 'T-03.23.09.61',
    teacher_name: 'Anggita Aprilia Sari, S.Sos',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Anggita Aprilia Sari, S.Sos.xlsx',
    uploaded_at: '2026-06-22T01:18:51.125Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/spreadsheets/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-88D22A38',
    teacher_id: 'T-02.13.08.92',
    teacher_name: 'Syifa Fauziah, S.Pd.I',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-CP-Syifa Fauziah.docx',
    uploaded_at: '2026-06-22T03:22:52.316Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-3D0F9777',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T04:41:59.121Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-52C3D1A5',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T04:43:36.912Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-3AC738FE',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 8',
    status: 'uploaded',
    file_name: '2627-S1-8-MODUL-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T04:44:25.278Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-2E9F6B0E',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 9',
    status: 'uploaded',
    file_name: '2627-S1-9-MODUL-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T04:45:27.936Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-A4AE1450',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-CP-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T06:00:14.797Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-B5B0A15E',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 8',
    status: 'uploaded',
    file_name: '2627-S1-8-CP-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T06:00:38.118Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-FDABA8CE',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 9',
    status: 'uploaded',
    file_name: '2627-S1-9-CP-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-22T06:00:56.275Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-07A7706A',
    teacher_id: 'T-03.25.07.63',
    teacher_name: 'Chintya Handayani, M.P',
    doc_type: 'ATP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-ATP-Chintya Handaya, M.Pd.docx',
    uploaded_at: '2026-06-23T03:55:01.513Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-8701EB80',
    teacher_id: 'T-03.25.07.63',
    teacher_name: 'Chintya Handayani, M.P',
    doc_type: 'ATP',
    semester: 'Semester 2',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S2-7-ATP-Chintya Handaya, M.Pd.docx',
    uploaded_at: '2026-06-23T03:58:20.768Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-AA6806E7',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'ATP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-ATP-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-23T04:17:06.372Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-E24034FB',
    teacher_id: 'T-03.13.06.15',
    teacher_name: 'M. Miftahur Rahman, S.I',
    doc_type: 'ATP',
    semester: 'Semester 2',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S2-7-ATP-Novi Mulafatturrahman, S.Pd..docx',
    uploaded_at: '2026-06-23T04:17:26.420Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-1FA7FF3B',
    teacher_id: 'T-03.25.07.63',
    teacher_name: 'Chintya Handayani, M.P',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-CP-Chintya Handaya, M.Pd.docx',
    uploaded_at: '2026-06-23T04:19:02.650Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-7F7265B6',
    teacher_id: 'T-03.25.07.63',
    teacher_name: 'Chintya Handayani, M.P',
    doc_type: 'CP',
    semester: 'Semester 2',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S2-7-CP-Chintya Handaya, M.Pd.docx',
    uploaded_at: '2026-06-23T04:19:18.637Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-751D88DE',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:34:23.799Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-B81BC657',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:35:08.363Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-3A57B7C7',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:35:31.584Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-F27E0BAA',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:37:53.347Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-1CEE8424',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 2',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S2-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:38:21.648Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-604CD650',
    teacher_id: 'T-01.13.07.24',
    teacher_name: 'Nurhasanah, S.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 2',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S2-7-MODUL-Nurhasanah.docx',
    uploaded_at: '2026-06-23T04:38:42.062Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-A41B098C',
    teacher_id: 'T-03.13.01.13',
    teacher_name: 'Abu Haripin, M.Pd',
    doc_type: 'MODUL',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-MODUL-Abu Haripin, M.Pd.docx',
    uploaded_at: '2026-06-24T02:10:15.000Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  },
  {
    id: 'REC-C88DF102',
    teacher_id: 'T-03.13.01.13',
    teacher_name: 'Abu Haripin, M.Pd',
    doc_type: 'CP',
    semester: 'Semester 1',
    kelas: 'Kelas 7',
    status: 'uploaded',
    file_name: '2627-S1-7-CP-Abu Haripin, M.Pd.docx',
    uploaded_at: '2026-06-24T02:15:30.000Z',
    academic_year: '2026/2027',
    file_url: 'https://docs.google.com/document/d/1fmApuBRDQ2cNFEqtsj9g169WvwoccXjZJSEBLtftKwc/edit'
  }
];

export const initialJurnalList: JurnalItem[] = [
  {
    id: 'JRN-001',
    teacher_id: 'USR-02',
    teacher_name: 'Abu Haripin, M.Pd',
    tanggal: '2026-09-28',
    kelas: '7A',
    jam_ke: '1 - 2',
    mapel: 'Bahasa Inggris',
    materi_pokok: 'Describing People and Daily Routines',
    kegiatan_pembelajaran: 'Eksplorasi teks deskripsi interaktif dan speaking practice berpasangan.',
    jumlah_hadir: 30,
    jumlah_absen: 0,
    catatan_refleksi: 'Siswa sangat aktif saat role play percakapan bahasa Inggris di depan kelas.'
  }
];

export const initialDatabase: AppDatabase = {
  config: initialConfig,
  users: initialUsers,
  events: initialEvents,
  uploadRecords: initialUploadRecords,
  usulanList: initialUsulanList,
  jurnalList: initialJurnalList,
  lastUpdated: new Date().toISOString(),
  lastSyncTime: 'Baru saja',
  syncStatus: 'connected'
};
