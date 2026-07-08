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
    department: 'Sektor Bangka Belitung',
    email: 'ahmad.fauzi@haleyorapower.co.id',
    phone: '081345678901',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200',
    status: 'Aktif',
    joinDate: '2023-06-10'
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
    department: 'Sektor Bangka Belitung',
    date: '2026-07-06 10:15',
    type: 'Teknis',
    title: 'Perbaikan Kubikel Penyulang',
    description: 'Melakukan troubleshooting gangguan hubung singkat pada kubikel penyulang utama Sektor Bangka. Penggantian isolator yang retak.',
    status: 'Pending',
    notes: '',
    location: {
      name: 'Sektor Bangka Belitung',
      coordinates: '-2.1299, 106.1138'
    },
    photoIndoor: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400',
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
    department: 'Sektor Bangka Belitung',
    date: '2026-07-06',
    clockIn: '07:55',
    status: 'Terlambat',
    locationIn: '-2.1299, 106.1138'
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
    posCount: 1
  }
];

export const INITIAL_EMPLOYEE_LOCATIONS: { [key: string]: string } = {
  'EMP_1': 'LOC_002',
  'EMP_2': 'LOC_002',
  'EMP_3': 'LOC_002'
};

export const INITIAL_JABATANS = [
  { id: 'JAB_001', name: 'Satgas Operasional', level: 1 },
  { id: 'JAB_002', name: 'Satgas Teknis', level: 1 },
  { id: 'JAB_003', name: 'Satgas Lapangan', level: 1 }
];

export const INITIAL_EMPLOYEE_JABATANS: { [key: string]: string } = {
  'EMP_1': 'JAB_001',
  'EMP_2': 'JAB_002',
  'EMP_3': 'JAB_003'
};
