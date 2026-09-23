import { Employee, Report, Attendance } from './types';

// Data bawaan/dummy dikosongkan secara permanen sesuai permintaan
export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_REPORTS: Report[] = [];

export const INITIAL_ATTENDANCE: Attendance[] = [];

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

export const INITIAL_EMPLOYEE_LOCATIONS: { [key: string]: string } = {};

export const INITIAL_JABATANS = [
  { id: 'JAB_001', name: 'Satgas Operasional', level: 1 },
  { id: 'JAB_002', name: 'Satgas Teknis', level: 1 },
  { id: 'JAB_003', name: 'Satgas Lapangan', level: 1 }
];

export const INITIAL_EMPLOYEE_JABATANS: { [key: string]: string } = {};
