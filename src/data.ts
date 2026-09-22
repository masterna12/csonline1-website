import { Employee, Report, Attendance } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP_1',
    nip: '9826003HPI',
    name: 'Rian Kusuma',
    role: 'Satgas Operasional',
    department: 'Sektor Bangka Belitung',
    email: 'rian.kusuma@haleyorapower.co.id',
    phone: '081234567890',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-01-15'
  },
  {
    id: 'EMP_2',
    nip: '9826004HPI',
    name: 'Siti Aminah',
    role: 'Satgas Teknis',
    department: 'Sektor Bangka Belitung',
    email: 'siti.aminah@haleyorapower.co.id',
    phone: '081298765432',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-03-20'
  },
  {
    id: 'EMP_3',
    nip: '9826005HPI',
    name: 'Ahmad Fauzi',
    role: 'Satgas Lapangan',
    department: 'Kantor Wilayah Pangkalpinang',
    email: 'ahmad.fauzi@haleyorapower.co.id',
    phone: '081345678901',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-06-10'
  },
  {
    id: 'EMP_4',
    nip: '9826010HPI',
    name: 'Budi Santoso',
    role: 'Satgas Operasional',
    department: 'Sektor Jawa Timur',
    email: 'budi.santoso@haleyorapower.co.id',
    phone: '081231122334',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-02-10'
  },
  {
    id: 'EMP_5',
    nip: '9826011HPI',
    name: 'Dewi Lestari',
    role: 'Satgas Teknis',
    department: 'Kantor Wilayah Surabaya',
    email: 'dewi.lestari@haleyorapower.co.id',
    phone: '081235566778',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-04-12'
  },
  {
    id: 'EMP_6',
    nip: '9826012HPI',
    name: 'Eko Prasetyo',
    role: 'Satgas Lapangan',
    department: 'Sektor Jawa Timur',
    email: 'eko.prasetyo@haleyorapower.co.id',
    phone: '081239988776',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-05-18'
  },
  {
    id: 'EMP_7',
    nip: '9826013HPI',
    name: 'Farhan Maulana',
    role: 'Satgas Operasional',
    department: 'Kantor Wilayah Malang',
    email: 'farhan.maulana@haleyorapower.co.id',
    phone: '081237766554',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-07-22'
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'REP_1',
    employeeId: 'EMP_1',
    nip: '9826003HPI',
    employeeName: 'Rian Kusuma',
    role: 'Satgas Operasional',
    department: 'Sektor Bangka Belitung',
    date: '2026-07-06 08:30',
    type: 'Operasional',
    title: 'Patroli Rutin Gardu Hubung Bangka',
    description: 'Melakukan pemeliharaan dan inspeksi rutin kondisi fisik Gardu Hubung Bangka Belitung. Semua parameter dalam batas normal.',
    status: 'Disetujui',
    notes: 'Pekerjaan selesai dengan baik. Rekomendasi patroli berkala dipertahankan.',
    location: {
      name: 'Sektor Bangka Belitung',
      coordinates: '-2.1299, 106.1138'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=400',
    photoOutdoor: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'REP_2',
    employeeId: 'EMP_2',
    nip: '9826004HPI',
    employeeName: 'Siti Aminah',
    role: 'Satgas Teknis',
    department: 'Kantor Wilayah Pangkalpinang',
    date: '2026-07-06 10:15',
    type: 'Teknis',
    title: 'Perbaikan Kubikel Penyulang Pangkalpinang',
    description: 'Melakukan troubleshooting gangguan hubung singkat pada kubikel penyulang utama Wilayah Pangkalpinang.',
    status: 'Pending',
    notes: '',
    location: {
      name: 'Kantor Wilayah Pangkalpinang',
      coordinates: '-2.1299, 106.1138'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400',
    photoOutdoor: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'REP_3',
    employeeId: 'EMP_4',
    nip: '9826010HPI',
    employeeName: 'Budi Santoso',
    role: 'Satgas Operasional',
    department: 'Sektor Jawa Timur',
    date: '2026-07-06 08:45',
    type: 'Operasional',
    title: 'Inspeksi & Pemeliharaan Gardu Induk Waru Surabaya',
    description: 'Pemeriksaan rutin kebersihan dan kesiapan operasional ruang panel kontrol dan kubikel Gardu Induk Jawa Timur.',
    status: 'Disetujui',
    notes: 'Kondisi steril dan seluruh indikator normal.',
    location: {
      name: 'Sektor Jawa Timur',
      coordinates: '-7.3512, 112.7278'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=400',
    photoOutdoor: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'REP_4',
    employeeId: 'EMP_5',
    nip: '9826011HPI',
    employeeName: 'Dewi Lestari',
    role: 'Satgas Teknis',
    department: 'Kantor Wilayah Surabaya',
    date: '2026-07-06 11:20',
    type: 'Teknis',
    title: 'Perawatan Ruang Server & Panel PLN Surabaya Barat',
    description: 'Pembersihan presisi pendingin rack server dan monitoring kabel distribusi tegangan menengah.',
    status: 'Disetujui',
    notes: 'Pekerjaan tuntas sesuai SOP HSE.',
    location: {
      name: 'Kantor Wilayah Surabaya',
      coordinates: '-7.2575, 112.7521'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400',
    photoOutdoor: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'REP_5',
    employeeId: 'EMP_7',
    nip: '9826013HPI',
    employeeName: 'Farhan Maulana',
    role: 'Satgas Operasional',
    department: 'Kantor Wilayah Malang',
    date: '2026-07-06 13:10',
    type: 'Operasional',
    title: 'Sterilisasi Ruang Dispatcher Wilayah Malang',
    description: 'Sterilisasi area operasional dan verifikasi sanitasi area kerja dispatcher PLN Malang.',
    status: 'Pending',
    notes: '',
    location: {
      name: 'Kantor Wilayah Malang',
      coordinates: '-7.9797, 112.6304'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=400',
    photoOutdoor: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400'
  }
];

export const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: 'ATT_1',
    employeeId: 'EMP_1',
    employeeName: 'Rian Kusuma',
    department: 'Sektor Bangka Belitung',
    date: '2026-07-06',
    clockIn: '07:25',
    clockOut: '16:05',
    status: 'Tepat Waktu',
    locationIn: '-2.1299, 106.1138',
    locationOut: '-2.1299, 106.1138'
  },
  {
    id: 'ATT_2',
    employeeId: 'EMP_2',
    employeeName: 'Siti Aminah',
    department: 'Kantor Wilayah Pangkalpinang',
    date: '2026-07-06',
    clockIn: '07:55',
    status: 'Terlambat',
    locationIn: '-2.1299, 106.1138'
  },
  {
    id: 'ATT_3',
    employeeId: 'EMP_4',
    employeeName: 'Budi Santoso',
    department: 'Sektor Jawa Timur',
    date: '2026-07-06',
    clockIn: '07:20',
    clockOut: '16:00',
    status: 'Tepat Waktu',
    locationIn: '-7.3512, 112.7278',
    locationOut: '-7.3512, 112.7278'
  },
  {
    id: 'ATT_4',
    employeeId: 'EMP_5',
    employeeName: 'Dewi Lestari',
    department: 'Kantor Wilayah Surabaya',
    date: '2026-07-06',
    clockIn: '07:28',
    status: 'Tepat Waktu',
    locationIn: '-7.2575, 112.7521'
  }
];

export const INITIAL_LOCATIONS = [
  {
    id: 'LOC_001',
    name: 'Sektor Bangka Belitung',
    level: 1,
    barcode: 'LOC-101',
    jamKerja: '8 Jam Kerja',
    posCount: 3
  },
  {
    id: 'LOC_002',
    name: 'Kantor Wilayah Pangkalpinang',
    level: 2,
    parentId: 'LOC_001',
    barcode: 'LOC-102',
    jamKerja: '8 Jam Kerja',
    posCount: 2
  },
  {
    id: 'LOC_003',
    name: 'Sektor Jawa Timur',
    level: 1,
    barcode: 'LOC-201',
    jamKerja: '8 Jam Kerja',
    posCount: 4
  },
  {
    id: 'LOC_004',
    name: 'Kantor Wilayah Surabaya',
    level: 2,
    parentId: 'LOC_003',
    barcode: 'LOC-202',
    jamKerja: '8 Jam Kerja',
    posCount: 2
  },
  {
    id: 'LOC_005',
    name: 'Kantor Wilayah Malang',
    level: 2,
    parentId: 'LOC_003',
    barcode: 'LOC-203',
    jamKerja: '8 Jam Kerja',
    posCount: 2
  }
];

export const INITIAL_EMPLOYEE_LOCATIONS: { [key: string]: string } = {
  'EMP_1': 'LOC_002',
  'EMP_2': 'LOC_002',
  'EMP_3': 'LOC_002',
  'EMP_4': 'LOC_004',
  'EMP_5': 'LOC_004',
  'EMP_6': 'LOC_004',
  'EMP_7': 'LOC_005'
};

export const INITIAL_JABATANS = [
  { id: 'JAB_001', name: 'Satgas Operasional', level: 1 },
  { id: 'JAB_002', name: 'Satgas Teknis', level: 1 },
  { id: 'JAB_003', name: 'Satgas Lapangan', level: 1 }
];

export const INITIAL_EMPLOYEE_JABATANS: { [key: string]: string } = {
  'EMP_1': 'JAB_001',
  'EMP_2': 'JAB_002',
  'EMP_3': 'JAB_003',
  'EMP_4': 'JAB_001',
  'EMP_5': 'JAB_002',
  'EMP_6': 'JAB_003',
  'EMP_7': 'JAB_001'
};
