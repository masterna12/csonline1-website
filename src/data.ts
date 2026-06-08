import { Employee, Report, Attendance } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    nip: "198804151001",
    name: "Budi Santoso",
    role: "Senior IT Support",
    department: "IT",
    email: "budi.santoso@perusahaan.com",
    phone: "0812-3456-7890",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    status: "Aktif",
    joinDate: "15-Jan-2023"
  },
  {
    id: "EMP002",
    nip: "199408221002",
    name: "Siti Rahma",
    role: "Marketing Specialist",
    department: "Marketing",
    email: "siti.rahma@perusahaan.com",
    phone: "0821-9876-5432",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    status: "Aktif",
    joinDate: "10-Mar-2023"
  },
  {
    id: "EMP003",
    nip: "198511031003",
    name: "Rudi Hermawan",
    role: "Financial Analyst",
    department: "Finance",
    email: "rudi.hermawan@perusahaan.com",
    phone: "0857-1122-3344",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    status: "Aktif",
    joinDate: "01-Jul-2022"
  },
  {
    id: "EMP004",
    nip: "199709201004",
    name: "Dewi Lestari",
    role: "HR Generalist",
    department: "HR",
    email: "dewi.lestari@perusahaan.com",
    phone: "0819-5566-7788",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
    status: "Aktif",
    joinDate: "20-Sep-2024"
  },
  {
    id: "EMP005",
    nip: "198112121005",
    name: "Andi Wijaya",
    role: "Head of Operations",
    department: "Operations",
    email: "andi.wijaya@perusahaan.com",
    phone: "0811-2233-4455",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    status: "Aktif",
    joinDate: "12-Dec-2021"
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: "REP101",
    employeeId: "EMP001",
    nip: "198804151001",
    employeeName: "Budi Santoso",
    role: "Senior IT Support",
    department: "IT",
    date: "2026-06-07",
    type: "Teknis",
    title: "Pemeliharaan Router Server & Backup berkala",
    description: "Melakukan restart terjadwal pada router utama lantai 2, mem-backup database harian ke cloud storage backup, serta memverifikasi suhu pendingin ruangan server tetap stabil pada 18 derajat Celcius.",
    status: "Disetujui",
    notes: "Kerja bagus. Pastikan log AC dicatat setiap minggu.",
    location: {
      name: "Kantor Pusat Lantai 2",
      coordinates: "-6.2088, 106.8456"
    },
    photoIndoor: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300",
    photoOutdoor: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "REP102",
    employeeId: "EMP002",
    nip: "199408221002",
    employeeName: "Siti Rahma",
    role: "Marketing Specialist",
    department: "Marketing",
    date: "2026-06-07",
    type: "Penjualan",
    title: "Optimasi Iklan Sosial Media & FB Ads",
    description: "Menganalisa performa kampanye FB Ads untuk rilis produk baru. Terjadi peningkatan CTR (Click-Through Rate) sebesar 1.5% setelah dilakukan A/B testing pada copywriting landing page.",
    status: "Disetujui",
    notes: "Lanjutkan kampanye B karena efisiensi biayanya lebih baik.",
    location: {
      name: "WFO - Ruang Kreatif",
      coordinates: "-6.2120, 106.8123"
    },
    photoIndoor: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=300",
    photoOutdoor: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "REP103",
    employeeId: "EMP003",
    nip: "198511031003",
    employeeName: "Rudi Hermawan",
    role: "Financial Analyst",
    department: "Finance",
    date: "2026-06-07",
    type: "Administrasi",
    title: "Penyusunan Laporan Pajak Bulanan PPN",
    description: "Memasukkan faktur pajak masukan dan keluaran bulan Mei ke sistem e-Faktur. Menghitung total kurang bayar pajak dan telah mencetak kode billing penyetoran.",
    status: "Pending",
    location: {
      name: "Kantor Pusat Lantai 3",
      coordinates: "-6.2088, 106.8456"
    },
    photoIndoor: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=300",
    photoOutdoor: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "REP104",
    employeeId: "EMP005",
    nip: "198112121005",
    employeeName: "Andi Wijaya",
    role: "Head of Operations",
    department: "Operations",
    date: "2026-06-06",
    type: "Operasional",
    title: "Inspeksi Kesiapan Gudang Logistik Tangerang",
    description: "Melakukan kunjungan lapangan ke gudang Tangerang untuk memeriksa alur keluar masuk barang. Menemukan forklift nomor 3 memerlukan perbaikan hidrolik segera.",
    status: "Disetujui",
    notes: "Pengajuan perbaikan forklift sudah saya teruskan ke procurement.",
    location: {
      name: "Gudang Logistik Tangerang",
      coordinates: "-6.1783, 106.6319"
    },
    photoIndoor: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=300",
    photoOutdoor: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300"
  }
];

export const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: "ATT501",
    employeeId: "EMP001",
    employeeName: "Budi Santoso",
    department: "IT",
    date: "2026-06-07",
    clockIn: "07:45",
    clockOut: "17:05",
    status: "Tepat Waktu",
    locationIn: "Kantor Pusat Lantai 2"
  },
  {
    id: "ATT502",
    employeeId: "EMP002",
    employeeName: "Siti Rahma",
    department: "Marketing",
    date: "2026-06-07",
    clockIn: "08:15",
    clockOut: "17:00",
    status: "Tepat Waktu",
    locationIn: "WFO - Ruang Kreatif"
  },
  {
    id: "ATT503",
    employeeId: "EMP003",
    employeeName: "Rudi Hermawan",
    department: "Finance",
    date: "2026-06-07",
    clockIn: "08:45",
    clockOut: "17:30",
    status: "Terlambat",
    locationIn: "Kantor Pusat Lantai 3"
  },
  {
    id: "ATT504",
    employeeId: "EMP004",
    employeeName: "Dewi Lestari",
    department: "HR",
    date: "2026-06-07",
    clockIn: "07:55",
    clockOut: "17:00",
    status: "Tepat Waktu",
    locationIn: "Kantor Pusat Lantai 1"
  },
  {
    id: "ATT505",
    employeeId: "EMP005",
    employeeName: "Andi Wijaya",
    department: "Operations",
    date: "2026-06-07",
    clockIn: "07:30",
    clockOut: "17:15",
    status: "Tepat Waktu",
    locationIn: "Gudang Tangerang"
  }
];
