export interface Employee {
  id: string;
  nip: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'Aktif' | 'Cuti' | 'Nonaktif';
  joinDate: string;
}

export interface Report {
  id: string;
  employeeId: string;
  nip: string;
  employeeName: string;
  role: string;
  department: string; // Unit Kerja
  date: string;
  type: 'Operasional' | 'Teknis' | 'Penjualan' | 'Administrasi' | 'Lainnya';
  title: string;
  description: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  notes?: string;
  location?: {
    name: string;
    coordinates: string;
  };
  photoIndoor?: string;
  photoOutdoor?: string;
  imagePath?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: 'Tepat Waktu' | 'Terlambat' | 'Alpa' | 'Izin';
  locationIn?: string;
  locationOut?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'attendance' | 'report' | 'system';
  timestamp: string;
  read: boolean;
}
