import React, { useState } from 'react';
import { 
  Users, FileText, CheckSquare, Clock, MapPin, 
  Search, Plus, Filter, CheckCircle2, XCircle, 
  AlertCircle, Briefcase, Mail, Phone, Calendar, 
  ArrowUpRight, Building2, UserCheck, Eye, Trash2,
  Shield, Settings, Menu, ChevronRight, HardHat,
  AlertTriangle, RefreshCw, Layers, Bell, Package,
  ArrowRight, Download, Send, Globe, Check, User, LogOut, Upload, Camera,
  FileSpreadsheet, Printer, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Report, Attendance } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_REPORTS } from '../data';
import { 
  initSheetsAuth, 
  signInGoogleSheets, 
  signOutGoogleSheets, 
  createNewReportsSpreadsheet, 
  writeReportsToSpreadsheet, 
  parseSpreadsheetToReports 
} from '../lib/sheetsService';

interface AdminDashboardProps {
  employees: Employee[];
  attendance: Attendance[];
  reports: Report[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateReportStatus: (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => void;
  onDeleteEmployee: (id: string) => void;
  onDeleteReport: (id: string) => void;
  onShowAlert: (title: string, message: string, type: 'success' | 'alert') => void;
  onAddReport: (rep: Report) => void;
  onLogout?: () => void;
  onImportReports?: (imported: Report[]) => void;
  adminName: string;
  adminAvatar: string;
  adminPassword: string;
  onUpdateAdminProfile: (name: string, avatar: string, pass: string) => void;
  draftReports?: Report[];
  onAddDraftReport?: (draft: Report) => void;
  onDeleteDraftReport?: (id: string) => void;
  onSyncDrafts?: () => Promise<void>;
}

export default function AdminDashboard({
  employees,
  attendance,
  reports,
  onAddEmployee,
  onUpdateReportStatus,
  onDeleteEmployee,
  onDeleteReport,
  onShowAlert,
  onAddReport,
  onLogout,
  onImportReports,
  adminName,
  adminAvatar,
  adminPassword,
  onUpdateAdminProfile,
  draftReports = [],
  onAddDraftReport = () => {},
  onDeleteDraftReport = () => {},
  onSyncDrafts = async () => {}
}: AdminDashboardProps) {
  // Sidebar tab management
  // 'ringkasan' = Dashboard, 'pegawai' = Data Pegawai, 'laporan' = Data Laporan, 'kehadiran' = Data Master, 'pengaturan' = Pengaturan Akun
  const [activeSubTab, setActiveSubTab] = useState<'ringkasan' | 'pegawai' | 'laporan' | 'kehadiran' | 'pengaturan'>('ringkasan');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportSubTab, setReportSubTab] = useState<'semua' | 'draft' | 'rekap_kinerja'>('semua');
  const [deptFilter, setDeptFilter] = useState<string>('Semua');
  const [reportDeptFilter, setReportDeptFilter] = useState<string>('Semua');
  const [locationFilter, setLocationFilter] = useState('Semua Lokasi');
  const [periodFilter, setPeriodFilter] = useState('25A - JUNI 2026');

  // Google Sheets Integration State
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('step_sheets_spreadsheet_id') || '';
  });
  const [sheetsSpreadsheetUrl, setSheetsSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('step_sheets_spreadsheet_url') || '';
  });
  const [sheetsTitle, setSheetsTitle] = useState('HPI Haleyora Powerindo - Data Pelaporan');
  const [isLoaderSheets, setIsLoaderSheets] = useState(false);
  const [isSheetsWidgetCollapsed, setIsSheetsWidgetCollapsed] = useState(false);

  React.useEffect(() => {
    const unsubscribe = initSheetsAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoaderSheets(true);
    try {
      const res = await signInGoogleSheets();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        onShowAlert('Koneksi Google Sukses', 'Sistem berhasil terhubung dengan akun Google Workspace Anda.', 'success');
      }
    } catch (err: any) {
      console.error(err);
      onShowAlert('Koneksi Google Gagal', err.message || 'Gagal masuk akun Google.', 'alert');
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsLoaderSheets(true);
    try {
      await signOutGoogleSheets();
      setGoogleUser(null);
      setGoogleToken(null);
      onShowAlert('Google Terputus', 'Akun Google berhasil diputuskan secara aman.', 'success');
    } catch (err: any) {
      console.error(err);
      onShowAlert('Error', 'Gagal memutus akun Google.', 'alert');
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!googleToken) {
      onShowAlert('Autentikasi Diperlukan', 'Harap hubungkan akun Google Sheets terlebih dahulu.', 'alert');
      return;
    }
    
    setIsLoaderSheets(true);
    try {
      const res = await createNewReportsSpreadsheet(googleToken, sheetsTitle || 'HPI Data Pelaporan', reports);
      setSheetsSpreadsheetId(res.spreadsheetId);
      setSheetsSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem('step_sheets_spreadsheet_id', res.spreadsheetId);
      localStorage.setItem('step_sheets_spreadsheet_url', res.spreadsheetUrl);
      onShowAlert('Spreadsheet Baru', 'Hore! Spreadsheet baru berhasil dibuat dan seluruh data pelaporan diekspor.', 'success');
    } catch (err: any) {
      console.error(err);
      onShowAlert('Gagal Membuat Sheet', err.message || 'Gagal membuat spreadsheet baru.', 'alert');
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleExportToExistingSheet = async () => {
    if (!googleToken) {
      onShowAlert('Autentikasi Diperlukan', 'Harap hubungkan akun Google Sheets terlebih dahulu.', 'alert');
      return;
    }
    if (!sheetsSpreadsheetId.trim()) {
      onShowAlert('ID Spreasheet Diperlukan', 'Silakan masukkan ID Spreadsheet Google tujuan.', 'alert');
      return;
    }

    const conf = window.confirm(`Apakah Anda yakin ingin menimpa data spreadsheet dengan ${reports.length} laporan saat ini?`);
    if (!conf) return;

    setIsLoaderSheets(true);
    try {
      await writeReportsToSpreadsheet(googleToken, sheetsSpreadsheetId.trim(), reports);
      onShowAlert('Ekspor Berhasil', 'Data pelaporan berhasil ditimpa ke Google Spreadsheet terpilih.', 'success');
    } catch (err: any) {
      console.error(err);
      onShowAlert('Ekspor Gagal', err.message || 'Gagal mengekspor data.', 'alert');
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleImportFromSheet = async () => {
    if (!googleToken) {
      onShowAlert('Autentikasi Diperlukan', 'Harap hubungkan akun Google Sheets terlebih dahulu.', 'alert');
      return;
    }
    if (!sheetsSpreadsheetId.trim()) {
      onShowAlert('ID Spreasheet Diperlukan', 'Silakan masukkan ID Spreadsheet Google yang valid.', 'alert');
      return;
    }

    setIsLoaderSheets(true);
    try {
      const imported = await parseSpreadsheetToReports(googleToken, sheetsSpreadsheetId.trim());
      if (onImportReports) {
        onImportReports(imported);
      } else {
        onShowAlert('Impor Sukses', `Ditemukan ${imported.length} data laporan di Google Sheet.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("404")) {
        onShowAlert('Gagal Sinkronisasi', 'ID Spreadsheet tidak ditemukan. Harap pastikan ID yang dimasukkan sesuai.', 'alert');
      } else {
        onShowAlert('Gagal Sinkronisasi', err.message || 'Gagal mengimpor data spreadsheet.', 'alert');
      }
    } finally {
      setIsLoaderSheets(false);
    }
  };

  // Modal State & Inline Form state for registering new employees
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpNip, setNewEmpNip] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('-');
  const [newEmpPhone, setNewEmpPhone] = useState('-');
  const [newEmpAvatar, setNewEmpAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Modal state for manual report inputs
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [addRepName, setAddRepName] = useState('');
  const [addRepNip, setAddRepNip] = useState('');
  const [addRepRole, setAddRepRole] = useState('');
  const [addRepDept, setAddRepDept] = useState('');
  const [addRepType, setAddRepType] = useState<'Operasional' | 'Teknis' | 'Penjualan' | 'Administrasi' | 'Lainnya'>('Operasional');
  const [addRepTitle, setAddRepTitle] = useState('');
  const [addRepDesc, setAddRepDesc] = useState('');
  const [addRepIndoor, setAddRepIndoor] = useState('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300');
  const [addRepOutdoor, setAddRepOutdoor] = useState('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300');
  const [addRepLocName, setAddRepLocName] = useState('Sektor Bangka Belitung');
  const [addRepCoord, setAddRepCoord] = useState('-2.1299, 106.1138');
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  // Date range filters for reports
  const [reportStartDateFilter, setReportStartDateFilter] = useState('');
  const [reportEndDateFilter, setReportEndDateFilter] = useState('');

  // Decision feedback modal
  const [selectedReportForAction, setSelectedReportForAction] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'Approve' | 'Reject' | null>(null);
  const [adminFeedbackNotes, setAdminFeedbackNotes] = useState('');
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Settings Form State
  const [settingName, setSettingName] = useState(adminName);
  const [settingAvatar, setSettingAvatar] = useState(adminAvatar);
  const [settingPassword, setSettingPassword] = useState(adminPassword);
  const [settingPasswordConfirm, setSettingPasswordConfirm] = useState(adminPassword);
  const [settingOldPassword, setSettingOldPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    setSettingName(adminName);
    setSettingAvatar(adminAvatar);
    setSettingPassword(adminPassword);
    setSettingPasswordConfirm(adminPassword);
    setSettingOldPassword('');
  }, [adminName, adminAvatar, adminPassword, activeSubTab]);

  // Master Sub-Tab state
  const [masterSubTab, setMasterSubTab] = useState<'lokasi' | 'jabatan' | 'struktur'>('lokasi');

  // Master Lokasi Kerja states
  const [locations, setLocations] = useState<{ id: string; name: string; level: number; parentId?: string; barcode?: string; jamKerja?: string; posCount?: number }[]>(() => {
    try {
      const saved = localStorage.getItem('hpi_locations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employeeLocations, setEmployeeLocations] = useState<{ [employeeId: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('hpi_employee_locations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Master Jabatan states
  const [jabatans, setJabatans] = useState<{ id: string; name: string; level: number; parentId?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('hpi_jabatans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employeeJabatans, setEmployeeJabatans] = useState<{ [employeeId: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('hpi_employee_jabatans');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Master Search & Filter states
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [masterParentFilter, setMasterParentFilter] = useState('Semua');

  // Modal states for adding/editing Master items
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [locationNameInput, setLocationNameInput] = useState('');
  const [locationLevelInput, setLocationLevelInput] = useState(1);
  const [locationParentInput, setLocationParentInput] = useState('');
  const [locationBarcodeInput, setLocationBarcodeInput] = useState('');
  const [locationJamInput, setLocationJamInput] = useState('8 Jam Kerja');
  const [locationPosInput, setLocationPosInput] = useState(1);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Modal states for adding/editing Jabatan items
  const [isAddJabatanModalOpen, setIsAddJabatanModalOpen] = useState(false);
  const [jabatanNameInput, setJabatanNameInput] = useState('');
  const [jabatanLevelInput, setJabatanLevelInput] = useState(1);
  const [jabatanParentInput, setJabatanParentInput] = useState('');
  const [editingJabatanId, setEditingJabatanId] = useState<string | null>(null);

  // Modal states for assigning Employees to Locations
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [selectedLocationForAssignment, setSelectedLocationForAssignment] = useState<string | null>(null);
  
  // Modal states for assigning Employees to Jabatan
  const [isAssignJabatanModalOpen, setIsAssignJabatanModalOpen] = useState(false);
  const [selectedJabatanForAssignment, setSelectedJabatanForAssignment] = useState<string | null>(null);

  // Modal state for structural view of Organization
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  // Detail view of employees assigned to a specific Jabatan
  const [selectedJabatanForDetail, setSelectedJabatanForDetail] = useState<string | null>(null);

  // Confirmation states for deleting Master items
  const [locationIdToDelete, setLocationIdToDelete] = useState<string | null>(null);
  const [jabatanIdToDelete, setJabatanIdToDelete] = useState<string | null>(null);

  // States for Rekap Kinerja Bulanan
  const [rekapMonth, setRekapMonth] = useState<number>(() => {
    // Default to current month of latest report or current date
    return new Date().getMonth() + 1;
  });
  const [rekapYear, setRekapYear] = useState<number>(() => {
    return new Date().getFullYear();
  });
  const [rekapSearchText, setRekapSearchText] = useState<string>('');
  const [selectedEmpForRekapDetail, setSelectedEmpForRekapDetail] = useState<string | null>(null);

  // Live Camera Capture States & Lifecycle Methods
  const [activeCameraStream, setActiveCameraStream] = useState<MediaStream | null>(null);
  const [cameraModalTarget, setCameraModalTarget] = useState<'indoor' | 'outdoor' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRefCallback = React.useCallback((node: HTMLVideoElement | null) => {
    if (node && activeCameraStream) {
      node.srcObject = activeCameraStream;
      node.play().catch(e => console.error("Error playing video feed:", e));
    }
  }, [activeCameraStream]);

  const handleOpenLiveCamera = async (target: 'indoor' | 'outdoor') => {
    setCameraModalTarget(target);
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: target === 'indoor' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setActiveCameraStream(stream);
    } catch (err: any) {
      console.error("Camera access with facingMode failed, falling back:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setActiveCameraStream(stream);
      } catch (errFallback: any) {
        setCameraError("Gagal mengakses kamera perangkat Anda. Silakan beri izin kamera pada perangkat browser Laptop / HP.");
        onShowAlert("Gagal Membuka Kamera", "Izin kamera ditolak atau kamera tidak didukung perangkat.", "alert");
      }
    }
  };

  const handleCloseLiveCamera = () => {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach(track => track.stop());
      setActiveCameraStream(null);
    }
    setCameraModalTarget(null);
    setCameraError(null);
  };

  const handleCapturePhoto = () => {
    const videoElement = document.getElementById('camera_preview_video') as HTMLVideoElement;
    if (videoElement) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (cameraModalTarget === 'indoor') {
          setAddRepIndoor(dataUrl);
        } else if (cameraModalTarget === 'outdoor') {
          setAddRepOutdoor(dataUrl);
        }
        handleCloseLiveCamera();
        onShowAlert("Foto Diambil", "Berhasil menyimpan hasil potret kamera.", "success");
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCameraStream]);

  React.useEffect(() => {
    localStorage.setItem('hpi_locations', JSON.stringify(locations));
  }, [locations]);

  React.useEffect(() => {
    localStorage.setItem('hpi_employee_locations', JSON.stringify(employeeLocations));
  }, [employeeLocations]);

  React.useEffect(() => {
    localStorage.setItem('hpi_jabatans', JSON.stringify(jabatans));
  }, [jabatans]);

  React.useEffect(() => {
    localStorage.setItem('hpi_employee_jabatans', JSON.stringify(employeeJabatans));
  }, [employeeJabatans]);

  // Sidebar responsive collapse
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Stats Calculations
  const totalEmployees = employees.length;
  const activeEmployeesCount = employees.filter(e => e.status === 'Aktif').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceToday = attendance.filter(a => a.date === todayStr);
  const presentTodayCount = attendanceToday.filter(a => a.clockIn).length;
  const lateTodayCount = attendanceToday.filter(a => a.status === 'Terlambat').length;
  const pendingReportsCount = reports.filter(r => r.status === 'Pending').length;

  // Render stats matching the PRISMA screenshot (scaled dynamically based on database state!)
  const scanPatroliCount = 17929 + (reports.length - INITIAL_REPORTS.length) * 15;
  const absensiMasukCount = 738 + (attendance.length - INITIAL_ATTENDANCE.length) * 3;
  const pergantianShiftCount = 528 + reports.filter(r => r.type === 'Operasional').length;
  const tamuMasukCount = 0;
  const kirimanBarangCount = 0;
  const kerawananCount = 26 + reports.filter(r => r.status === 'Ditolak').length;
  const insidenCount = 2 + reports.filter(r => r.title.toLowerCase().includes('darurat') || r.description.toLowerCase().includes('insiden')).length;

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi semua kolom wajib untuk mendaftarkan pegawai!', 'alert');
      return;
    }

    let nextNum = 1;
    if (employees && employees.length > 0) {
      const ids = employees.map(emp => {
        const match = emp.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      nextNum = Math.max(...ids) + 1;
    }
    const brandNewId = `EMP${nextNum.toString().padStart(3, '0')}`;

    const brandNewNip = newEmpNip || `199${Math.floor(100000 + Math.random() * 899999)}`;
    const newEmp: Employee = {
      id: brandNewId,
      name: newEmpName,
      nip: brandNewNip,
      role: newEmpRole,
      department: newEmpDept,
      email: "-",
      phone: "-",
      avatar: newEmpAvatar,
      status: 'Aktif',
      joinDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    onAddEmployee(newEmp);
    onShowAlert('Pegawai Berhasil Ditambahkan', `${newEmp.name} (NIP: ${newEmp.nip}) terdaftar dengan sukses!`, 'success');
    
    // Clear State
    setNewEmpName('');
    setNewEmpNip('');
    setNewEmpRole('');
    setNewEmpEmail('-');
    setNewEmpPhone('-');
    setIsAddModalOpen(false);
    setIsAddingInline(false);
  };

  const handleProcessReportAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForAction || !actionType) return;

    onUpdateReportStatus(
      selectedReportForAction.id, 
      actionType === 'Approve' ? 'Disetujui' : 'Ditolak', 
      adminFeedbackNotes
    );

    onShowAlert(
      actionType === 'Approve' ? 'Laporan Disetujui' : 'Laporan Ditolak', 
      `Laporan dari ${selectedReportForAction.employeeName} telah dievaluasi.`,
      'success'
    );

    setSelectedReportForAction(null);
    setActionType(null);
    setAdminFeedbackNotes('');
  };

  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      onShowAlert('GPS Tidak Didukung', 'Perangkat/browser ini tidak mendukung Geolocation API untuk koordinat GPS.', 'alert');
      return;
    }
    setIsFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setAddRepCoord(`${lat}, ${lng}`);
        setAddRepLocName(`Sektor Bangka (GPS: ${lat}, ${lng})`);
        setIsFetchingGPS(false);
        onShowAlert('GPS Sinkron', `Sukses mendapatkan lokasi GPS presisi: ${lat}, ${lng}`, 'success');
      },
      (error) => {
        setIsFetchingGPS(false);
        let errorMsg = 'Gagal mengakses GPS perangkat.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Akses lokasi ditolak oleh browser/pengguna.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Sinyal lokasi atau satelit GPS tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu permintaan akses GPS habis (timeout).';
        }
        onShowAlert('GPS Tertunda', `${errorMsg} Menggunakan koordinat default Sektor Bangka Belitung.`, 'alert');
        setAddRepCoord('-2.1299, 106.1138');
        setAddRepLocName('Sektor Bangka (Default)');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  React.useEffect(() => {
    if (isAddReportModalOpen) {
      handleFetchGPS();
    }
  }, [isAddReportModalOpen]);

  const handleSelectEmployeeForReport = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setAddRepName(emp.name);
      setAddRepNip(emp.nip || '');
      setAddRepRole(emp.role);
      setAddRepDept(emp.department);
    }
  };

  const handleIndoorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddRepIndoor(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOutdoorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddRepOutdoor(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRepName.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Nama Pegawai!', 'alert');
      return;
    }
    if (!addRepNip.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi NIP Pegawai!', 'alert');
      return;
    }
    if (!addRepRole.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Jabatan!' ,'alert');
      return;
    }
    if (!addRepDept.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Unit Kerja / Divisi!', 'alert');
      return;
    }

    const finalTitle = addRepTitle.trim() || `Laporan - ${addRepDept}`;
    const finalDesc = addRepDesc.trim() || "Menyelesaikan aktivitas patroli harian, inspeksi kelayakan instrumen, dan sinkronisasi laporan koordinat lapangan PT Haleyora Powerindo.";

    const newReport: Report = {
      id: `REP${Math.floor(200 + Math.random() * 800)}`,
      employeeId: `EMP_ADM_${Math.floor(100 + Math.random() * 899)}`,
      nip: addRepNip,
      employeeName: addRepName,
      role: addRepRole,
      department: addRepDept,
      date: new Date().toISOString().split('T')[0],
      type: addRepType,
      title: finalTitle,
      description: finalDesc,
      status: 'Disetujui', // Admin generated reports are directly set as approved
      photoIndoor: addRepIndoor,
      photoOutdoor: addRepOutdoor,
      location: {
        name: addRepLocName,
        coordinates: addRepCoord
      }
    };

    if (!navigator.onLine) {
      // Offline mode auto-save to draft!
      const draftId = `DRAFT${Math.floor(100 + Math.random() * 900)}`;
      newReport.id = draftId;
      newReport.status = 'Pending';
      onAddDraftReport(newReport);
      onShowAlert('Offline Terdeteksi', 'Koneksi terganggu. Laporan Anda berhasil disimpan ke menu Draft secara otomatis!', 'success');
    } else {
      onAddReport(newReport);
      onShowAlert('Laporan Sukses', `Laporan kerja penugasan untuk ${addRepName} berhasil diunggah dengan sukses.`, 'success');
    }

    // Reset fields
    setAddRepName('');
    setAddRepNip('');
    setAddRepRole('');
    setAddRepDept('');
    setAddRepTitle('');
    setAddRepDesc('');
    setAddRepIndoor('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300');
    setAddRepOutdoor('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300');
    setAddRepLocName('Sektor Bangka Belitung');
    setAddRepCoord('-2.1299, 106.1138');
    setIsAddReportModalOpen(false);
  };

  const handleSaveReportAsDraft = () => {
    if (!addRepName.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Nama Pegawai sebelum menyimpan draft!', 'alert');
      return;
    }
    if (!addRepNip.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi NIP Pegawai sebelum menyimpan draft!', 'alert');
      return;
    }
    if (!addRepRole.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Jabatan sebelum menyimpan draft!', 'alert');
      return;
    }
    if (!addRepDept.trim()) {
      onShowAlert('Validasi Gagal', 'Harap isi Unit Kerja / Divisi sebelum menyimpan draft!', 'alert');
      return;
    }

    const finalTitle = addRepTitle.trim() || `Laporan (Draft) - ${addRepDept}`;
    const finalDesc = addRepDesc.trim() || "Menyelesaikan aktivitas patroli harian, inspeksi kelayakan instrumen, dan sinkronisasi laporan koordinat lapangan PT Haleyora Powerindo.";

    const draftReport: Report = {
      id: `DRAFT${Math.floor(100 + Math.random() * 900)}`,
      employeeId: `EMP_DFT_${Math.floor(100 + Math.random() * 899)}`,
      nip: addRepNip,
      employeeName: addRepName,
      role: addRepRole,
      department: addRepDept,
      date: new Date().toISOString().split('T')[0],
      type: addRepType,
      title: finalTitle,
      description: finalDesc,
      status: 'Pending',
      photoIndoor: addRepIndoor,
      photoOutdoor: addRepOutdoor,
      location: {
        name: addRepLocName,
        coordinates: addRepCoord
      }
    };

    onAddDraftReport(draftReport);

    // Reset fields
    setAddRepName('');
    setAddRepNip('');
    setAddRepRole('');
    setAddRepDept('');
    setAddRepTitle('');
    setAddRepDesc('');
    setAddRepIndoor('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300');
    setAddRepOutdoor('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300');
    setAddRepLocName('Sektor Bangka Belitung');
    setAddRepCoord('-2.1299, 106.1138');
    setIsAddReportModalOpen(false);
  };

  const handleQuickUploadDraft = async (draft: Report) => {
    onAddReport(draft);
    onDeleteDraftReport(draft.id);
    onShowAlert('Draft Terkirim', `Laporan draft untuk ${draft.employeeName} berhasil diunggah ke server!`, 'success');
  };

  const handleEditDraft = (draft: Report) => {
    setAddRepName(draft.employeeName);
    setAddRepNip(draft.nip);
    setAddRepRole(draft.role);
    setAddRepDept(draft.department);
    setAddRepType(draft.type);
    setAddRepTitle(draft.title);
    setAddRepDesc(draft.description);
    if (draft.photoIndoor) setAddRepIndoor(draft.photoIndoor);
    if (draft.photoOutdoor) setAddRepOutdoor(draft.photoOutdoor);
    
    onDeleteDraftReport(draft.id);
    setIsAddReportModalOpen(true);
    onShowAlert('Draft Dimuat', 'Laporan draft berhasil dimuat kembali ke formulir pengisian.', 'success');
  };

  const handleRefresh = () => {
    onShowAlert('Data Disinkronkan', 'Mengambil data real-time terbaru dari satgas lapangan...', 'success');
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationNameInput.trim()) {
      onShowAlert('Nama Kosong', 'Nama lokasi kerja harus diisi.', 'alert');
      return;
    }
    if (editingLocationId) {
      setLocations(locations.map(loc => loc.id === editingLocationId ? {
        ...loc,
        name: locationNameInput.trim()
      } : loc));
      onShowAlert('Sukses', 'Lokasi kerja berhasil diperbarui.', 'success');
    } else {
      const parentId = locationParentInput || undefined;
      const level = parentId ? (locations.find(l => l.id === parentId)?.level || 1) + 1 : 1;
      const newLoc = {
        id: 'LOC_' + Date.now().toString().slice(-6),
        name: locationNameInput.trim(),
        level: level,
        parentId: parentId,
        barcode: 'LOC-' + Math.floor(100 + Math.random() * 900),
        jamKerja: '8 Jam Kerja',
        posCount: 1
      };
      setLocations([...locations, newLoc]);
      onShowAlert('Sukses', 'Lokasi kerja baru berhasil ditambahkan.', 'success');
    }
    setIsAddLocationModalOpen(false);
    setLocationNameInput('');
    setLocationLevelInput(1);
    setLocationParentInput('');
    setLocationBarcodeInput('');
    setLocationJamInput('8 Jam Kerja');
    setLocationPosInput(1);
    setEditingLocationId(null);
  };

  const handleDeleteLocation = (id: string) => {
    // Delete location and its sub-locations recursively
    const locationsToDelete = [id];
    
    // Find nested sub-locations
    const getChildrenIds = (parentId: string) => {
      locations.forEach(loc => {
        if (loc.parentId === parentId && !locationsToDelete.includes(loc.id)) {
          locationsToDelete.push(loc.id);
          getChildrenIds(loc.id);
        }
      });
    };
    getChildrenIds(id);

    setLocations(locations.filter(loc => !locationsToDelete.includes(loc.id)));

    // Clean up employee locations assignments mapping
    const updatedAssignments = { ...employeeLocations };
    Object.keys(updatedAssignments).forEach(empId => {
      if (locationsToDelete.includes(updatedAssignments[empId])) {
        delete updatedAssignments[empId];
      }
    });
    setEmployeeLocations(updatedAssignments);
    onShowAlert('Sukses', 'Lokasi kerja dan seluruh sub-lokasinya berhasil dihapus.', 'success');
  };

  const handleSaveJabatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jabatanNameInput.trim()) {
      onShowAlert('Nama Kosong', 'Nama jabatan / posisi harus diisi.', 'alert');
      return;
    }
    if (editingJabatanId) {
      setJabatans(jabatans.map(j => j.id === editingJabatanId ? {
        ...j,
        name: jabatanNameInput.trim(),
        level: jabatanLevelInput,
        parentId: jabatanParentInput || undefined
      } : j));
      onShowAlert('Sukses', 'Jabatan berhasil diperbarui.', 'success');
    } else {
      const newJab = {
        id: 'JAB_' + Date.now().toString().slice(-6),
        name: jabatanNameInput.trim(),
        level: jabatanLevelInput,
        parentId: jabatanParentInput || undefined
      };
      setJabatans([...jabatans, newJab]);
      onShowAlert('Sukses', 'Jabatan baru berhasil ditambahkan.', 'success');
    }
    setIsAddJabatanModalOpen(false);
    setJabatanNameInput('');
    setJabatanLevelInput(1);
    setJabatanParentInput('');
    setEditingJabatanId(null);
  };

  const handleDeleteJabatan = (id: string) => {
    setJabatans(jabatans.filter(j => j.id !== id));
    // Clean up employee assignments mapping
    const updatedAssignments = { ...employeeJabatans };
    Object.keys(updatedAssignments).forEach(empId => {
      if (updatedAssignments[empId] === id) {
        delete updatedAssignments[empId];
      }
    });
    setEmployeeJabatans(updatedAssignments);
    onShowAlert('Sukses', 'Jabatan berhasil dihapus.', 'success');
  };

  const handleExportExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Data Pelaporan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #0284c7; color: white; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; }
          td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; vertical-align: middle; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; color: #1e293b; }
          .meta { font-size: 11px; color: #64748b; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="title">REKAPITULASI PELAPORAN HARIAN PEGAWAI DENGAN DOKUMENTASI</div>
        <div class="meta">PT HALEYORA POWERINDO - Filter: ${reportStartDateFilter || 'Semua'} s.d ${reportEndDateFilter || 'Semua'} | Diekspor pada: ${new Date().toLocaleString('id-ID')} | Total Data: ${filteredReports.length} Laporan</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Sandi Laporan</th>
              <th>NIP</th>
              <th>Nama Pegawai</th>
              <th>Unit Kerja / Dept</th>
              <th>Jabatan</th>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th>Judul Laporan</th>
              <th>Deskripsi Aktivitas</th>
              <th>GPS Koordinat</th>
              <th>Status</th>
              <th style="background-color: #0d9488; width: 150px;">Foto Bukti Indoor</th>
              <th style="background-color: #059669; width: 150px;">Foto Bukti Outdoor</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredReports.forEach((rep, index) => {
      const indoorImgHtml = rep.photoIndoor 
        ? `<img src="${rep.photoIndoor}" width="120" height="85" style="border: 1px solid #cbd5e1; border-radius: 4px; display: block;" />`
        : '<span style="color: #94a3b8; font-size: 9px;">Tidak ada foto</span>';
        
      const outdoorImgHtml = rep.photoOutdoor 
        ? `<img src="${rep.photoOutdoor}" width="120" height="85" style="border: 1px solid #cbd5e1; border-radius: 4px; display: block;" />`
        : '<span style="color: #94a3b8; font-size: 9px;">Tidak ada foto</span>';

      html += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${rep.id}</td>
          <td>'${rep.nip}</td>
          <td>${rep.employeeName}</td>
          <td>${rep.department}</td>
          <td>${rep.role}</td>
          <td style="text-align: center; white-space: nowrap;">${rep.date}</td>
          <td>${rep.type}</td>
          <td><strong>${rep.title}</strong></td>
          <td style="white-space: pre-wrap; max-width: 350px;">${rep.description}</td>
          <td style="font-family: monospace;">${rep.location?.coordinates || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: ${rep.status === 'Disetujui' ? '#047857' : rep.status === 'Ditolak' ? '#b91c1c' : '#b45309'}">${rep.status}</td>
          <td style="text-align: center; width: 130px; height: 95px; mso-number-format:'\\@';">${indoorImgHtml}</td>
          <td style="text-align: center; width: 130px; height: 95px; mso-number-format:'\\@';">${outdoorImgHtml}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HPI_Laporan_Kerja_${reportStartDateFilter || 'Awal'}_s.d_${reportEndDateFilter || 'Akhir'}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowAlert('Selesai Ekspor', `Berhasil mengekspor ${filteredReports.length} laporan beserta lampiran foto ke Microsoft Excel!`, 'success');
  };

  const handleExportWord = () => {
    if (filteredReports.length === 0) {
      onShowAlert('Ekspor Kosong', 'Tidak ada data laporan untuk diekspor pada rentang filter ini.', 'alert');
      return;
    }
    
    onShowAlert('Mempersiapkan Word', 'Sedang memuat engine dokumen Word untuk mengunduh rekapitulasi data...', 'success');

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <title>Rekapitulasi Pelaporan Harian - PT Haleyora Powerindo</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 297mm 210mm; /* A4 Landscape format */
            margin: 1.2cm;
          }
          body { 
            font-family: 'Arial', sans-serif; 
            color: #1e293b; 
            line-height: 1.4;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
          }
          th { 
            background-color: #0284c7; 
            color: #ffffff; 
            font-weight: bold; 
            padding: 10px; 
            border: 1px solid #cbd5e1; 
            text-align: center; 
            font-size: 10pt; 
          }
          td { 
            padding: 8px; 
            border: 1px solid #cbd5e1; 
            font-size: 9pt; 
            vertical-align: middle; 
          }
          .title { 
            font-size: 16pt; 
            font-weight: bold; 
            color: #0f172a; 
            margin-bottom: 2px;
          }
          .meta { 
            font-size: 9pt; 
            color: #64748b; 
            margin-bottom: 18px; 
          }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 15px;">
          <table style="width: 100%; border: none; margin: 0;">
            <tr style="border: none;">
              <td style="width: 60%; border: none; padding: 0; vertical-align: top;">
                <div style="font-size: 16pt; font-weight: bold; color: #0284c7; letter-spacing: 0.5px;">⚡ PT HALEYORA POWERINDO</div>
                <div style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">MEMBER OF PLN GROUP</div>
              </td>
              <td style="width: 40%; border: none; padding: 0; text-align: right; vertical-align: top;">
                <div style="font-size: 11pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">REKAPITULASI DOKUMEN LAPORAN HARIAN</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px; line-height: 1.2;">
                  Filter: ${reportStartDateFilter || 'Semua Tanggal'} s.d ${reportEndDateFilter || 'Semua Tanggal'}<br/>
                  Ekspor Tanggal: ${new Date().toLocaleDateString('id-ID')} | Unit: ${reportDeptFilter}
                </div>
              </td>
            </tr>
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%; background-color: #0f172a; color: white;">No</th>
              <th style="width: 14%; background-color: #0284c7; color: white;">Pegawai</th>
              <th style="width: 13%; background-color: #0284c7; color: white;">Unit Kerja / Jabatan</th>
              <th style="width: 9%; background-color: #0284c7; color: white;">Tanggal</th>
              <th style="width: 30%; background-color: #0284c7; color: white;">Aktivitas & Judul Kerja</th>
              <th style="width: 11%; background-color: #0284c7; color: white;">Sektor / GPS</th>
              <th style="width: 6%; background-color: #0284c7; color: white;">Status</th>
              <th style="width: 7%; background-color: #0d9488; color: white;">Foto Indoor</th>
              <th style="width: 7%; background-color: #059669; color: white;">Foto Outdoor</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredReports.forEach((rep, index) => {
      const indoorImg = rep.photoIndoor 
        ? `<img src="${rep.photoIndoor}" width="120" height="85" style="border: 1px solid #cbd5e1; border-radius: 4px; display: block;" />`
        : '<span style="color: #94a3b8; font-size: 8pt;">Tidak ada foto</span>';

      const outdoorImg = rep.photoOutdoor 
        ? `<img src="${rep.photoOutdoor}" width="120" height="85" style="border: 1px solid #cbd5e1; border-radius: 4px; display: block;" />`
        : '<span style="color: #94a3b8; font-size: 8pt;">Tidak ada foto</span>';

      html += `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td>
            <strong>${rep.employeeName}</strong><br/>
            NIP. ${rep.nip}
          </td>
          <td>
            <strong>${rep.department}</strong><br/>
            <span style="color: #64748b; font-size: 8pt;">${rep.role}</span>
          </td>
          <td style="text-align: center; white-space: nowrap;">${rep.date}</td>
          <td>
            <strong>${rep.title}</strong>
            <p style="margin: 4px 0 0 0; color: #475569; font-size: 8.5pt; white-space: pre-wrap;">${rep.description}</p>
          </td>
          <td>
            <strong>${rep.location?.name || '-'}</strong><br/>
            <span style="font-family: monospace; font-size: 7.5pt; color: #0284c7;">(${rep.location?.coordinates || '-'})</span>
          </td>
          <td style="text-align: center; font-weight: bold; color: ${rep.status === 'Disetujui' ? '#047857' : rep.status === 'Ditolak' ? '#b91c1c' : '#b45309'};">
            ${rep.status}
          </td>
          <td style="text-align: center;">${indoorImg}</td>
          <td style="text-align: center;">${outdoorImg}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        
        <div style="margin-top: 35px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 10px;">
          Laporan Rekapitulasi Digital - PT Haleyora Powerindo (HPI CS System)
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HPI_Laporan_Kerja_${reportStartDateFilter || 'Awal'}_s.d_${reportEndDateFilter || 'Akhir'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowAlert('Ekspor Word Sukses', `Laporan Word (.doc) berhasil diunduh (${filteredReports.length} data laporan beserta lampiran foto)!`, 'success');
  };

  const uniqueDepartments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));

  // Searching and category filtering routines
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.nip.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = deptFilter === 'Semua' || emp.department === deptFilter;
    return matchesSearch && matchesFilter;
  });

  const uniqueReportDepartments = Array.from(new Set(reports.map(rep => rep.department).filter(Boolean)));

  const filteredReports = reports.filter(rep => {
    const matchesSearch = rep.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rep.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = reportDeptFilter === 'Semua' || rep.department === reportDeptFilter;
    
    let matchesDate = true;
    if (rep.date) {
      if (reportStartDateFilter && rep.date < reportStartDateFilter) {
        matchesDate = false;
      }
      if (reportEndDateFilter && rep.date > reportEndDateFilter) {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  const filteredAttendance = attendance.filter(att => {
    const matchesSearch = att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          att.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = deptFilter === 'Semua' || att.department === deptFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-[#f1f5f9] rounded-3xl border border-slate-300 shadow-2xl overflow-hidden min-h-[720px] text-slate-800 font-sans">
      
      {/* 1. LEFT SIDEBAR: PRISMA BRANDING & MENU CATEGORIES (DARK BLUE - #0e1623) */}
      <aside 
        id="prisma_sidebar"
        className={`${isSidebarOpen ? 'w-full md:w-64' : 'w-0 md:w-16'} shrink-0 bg-[#0e1623] text-slate-300 transition-all duration-350 ease-in-out flex flex-col border-r border-[#1e293b] select-none overflow-hidden`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 bg-[#090d16] border-b border-[#1e2a3f] flex items-center gap-3">
          <div className="bg-[#1d4ed8] p-2 rounded-xl text-white font-extrabold flex items-center justify-center border border-sky-400/20 shadow-md">
            <Shield size={18} className="text-yellow-400 fill-yellow-400" />
          </div>
          <div className={isSidebarOpen ? 'block' : 'hidden md:hidden'}>
            <h2 className="font-sans font-black text-white tracking-widest text-base leading-none">CS online</h2>
            <p className="text-[8px] font-sans font-bold text-slate-400 tracking-tighter mt-1">PT. HALEYORA POWERINDO BANGKA BELITUNG</p>
          </div>
        </div>

        {/* Sidebar Navigations */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Section: Menu Utama */}
          <div className="space-y-1">
            <span className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Menu Utama
            </span>
            <button
              id="sidebar_btn_dashboard"
              onClick={() => { setActiveSubTab('ringkasan'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'ringkasan' 
                  ? 'bg-[#1e293b] text-white border-l-4 border-sky-500 shadow-inner' 
                  : 'text-slate-400 hover:bg-[#151f32] hover:text-slate-100'
              }`}
            >
              <FileText size={15} className={activeSubTab === 'ringkasan' ? 'text-sky-400' : 'text-slate-400'} />
              {isSidebarOpen && <span>Dashboard</span>}
            </button>

            <button
              id="sidebar_btn_pegawai"
              onClick={() => { setActiveSubTab('pegawai'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'pegawai' 
                  ? 'bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner' 
                  : 'text-slate-400 hover:bg-[#151f32] hover:text-slate-100'
              }`}
            >
              <Users size={15} className={activeSubTab === 'pegawai' ? 'text-sky-400' : 'text-slate-400'} />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Data Pegawai</span>
                  <span className="bg-[#3b82f6]/10 text-[#38bdf8] text-[9px] px-1.5 py-0.5 rounded-md font-mono border border-sky-500/20">
                    {employees.length}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Section: Pelaporan */}
          <div className="space-y-1">
            <span className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Data Pelaporan
            </span>
            <button
              id="sidebar_btn_laporan_primary"
              onClick={() => { setActiveSubTab('laporan'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'laporan' 
                  ? 'bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner' 
                  : 'text-slate-400 hover:bg-[#151f32] hover:text-slate-100'
              }`}
            >
              <CheckSquare size={15} className={activeSubTab === 'laporan' ? 'text-sky-450' : 'text-slate-450'} />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Data Pelaporan</span>
                  {pendingReportsCount > 0 ? (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                      {pendingReportsCount}
                    </span>
                  ) : (
                    <ChevronRight size={12} className="text-slate-500" />
                  )}
                </div>
              )}
            </button>
          </div>

          {/* Section: Master & Sistem */}
          <div className="space-y-1">
            <span className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Sistem Master
            </span>
            <button
              id="sidebar_btn_master"
              onClick={() => { setActiveSubTab('kehadiran'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'kehadiran' 
                  ? 'bg-[#1e293b] text-white border-l-4 border-sky-500 shadow-inner' 
                  : 'text-slate-400 hover:bg-[#151f32] hover:text-slate-100'
              }`}
            >
              <Layers size={15} className={activeSubTab === 'kehadiran' ? 'text-sky-400' : 'text-slate-400'} />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Data Master</span>
                  <ChevronRight size={12} className="text-slate-500" />
                </div>
              )}
            </button>
          </div>

          {/* Section: Akun */}
          <div className="space-y-1">
            <span className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Sesi Akun
            </span>
            <button
              id="sidebar_btn_pengaturan"
              onClick={() => { setActiveSubTab('pengaturan'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeSubTab === 'pengaturan' 
                  ? 'bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner' 
                  : 'text-slate-400 hover:bg-[#151f32] hover:text-slate-100'
              }`}
            >
              <Settings size={15} className={activeSubTab === 'pengaturan' ? 'text-sky-400' : 'text-slate-400'} />
              {isSidebarOpen && <span>Pengaturan Akun</span>}
            </button>
            <button
              id="sidebar_btn_logout"
              onClick={onLogout || (() => onShowAlert('Pemberitahuan', 'Sesi login administrator terenkripsi aman.', 'alert'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left cursor-pointer active:scale-95"
            >
              <LogOut size={15} />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>

        </div>

        {/* Footer Credit */}
        {isSidebarOpen && (
          <div className="p-4 bg-[#090d16] border-t border-[#1e2a3f] text-center">
            <span className="text-[9px] font-mono tracking-wider text-slate-500">v3.1 CS online SECURITY</span>
          </div>
        )}
      </aside>

      {/* 2. MAIN HUB CONTAINER (LIGHT BACKGROUND SYSTEM) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9] overflow-hidden">
        
        {/* A. DARK TOP BAR: SYSTEM STATUS, SEARCH, PROFILE (DARK NAVY - #0e1623) */}
        <header className="bg-[#0e1623] px-6 py-3 border-b border-[#1f2937] flex items-center justify-between text-slate-300">
          
          <div className="flex items-center gap-4">
            <button 
              id="hamburger_sidebar_toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-all hidden md:block"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            
            {/* PRISMA Global Indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold hidden sm:inline">● Posko Bangka Belitung Online</span>
            </div>
          </div>

          {/* User Profile and Configuration Settings */}
          <div className="flex items-center gap-4">
            {/* Notification Indicator */}
            <div className="relative shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-800" onClick={() => onShowAlert('Notifikasi', 'Database sistem terhubung real-time dengan aplikasi android.', 'success')}>
              <Bell size={16} className="text-slate-400 hover:text-slate-200" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-550 rounded-full border border-[#0e1623]"></span>
            </div>

            {/* Admin Settings Gear */}
            <div className="shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-800" onClick={() => { setActiveSubTab('pengaturan'); setSearchQuery(''); }}>
              <Settings size={16} className="text-slate-400 hover:text-slate-200" />
            </div>

            {/* Profile Avatar & Metadata */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-850 cursor-pointer select-none" onClick={() => { setActiveSubTab('pengaturan'); setSearchQuery(''); }}>
              <img 
                src={adminAvatar}
                alt="Administrator Avatar"
                className="w-8 h-8 rounded-full border-2 border-indigo-500 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="hidden sm:block text-left text-xs leading-none">
                <p className="font-extrabold text-white">{adminName}</p>
                <span className="text-[9px] text-[#38bdf8] font-semibold mt-1 block">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* B. DUAL DYNAMIC PANEL DISPLAY */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: DASHBOARD VIEW (RINGKASAN) */}
            {activeSubTab === 'ringkasan' && (
              <motion.div
                key="tab_prisma_dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual Header Grid resembling the image */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-350">
                  <div>
                    <h1 id="prisma_dashboard_title" className="text-xl md:text-2xl font-black text-slate-900 tracking-tight text-left">
                      Dashboard <span className="text-[#0284c7]">Pegawai & Pelaporan</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 text-left">Sistem Integrasi Penampilan Data Sektor Utama</p>
                  </div>

                  {/* Refresh Trigger */}
                  <div className="flex items-center gap-2">
                    <button
                      id="dashboard_refresh_btn"
                      onClick={handleRefresh}
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white p-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow active:scale-95 cursor-pointer shrink-0"
                    >
                      <RefreshCw size={12} className="animate-spin-slow" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* SOLID HIGH-CONTRAST STATS TILES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Total Pegawai */}
                  <div className="bg-[#108dc7] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{employees.length}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#e0f2fe]">Total Pegawai</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <User size={24} className="fill-white" />
                    </div>
                  </div>

                  {/* Card 2: Total Pelaporan */}
                  <div className="bg-[#10b981] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{reports.length}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#ecfdf5]">Total Pelaporan</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <CheckSquare size={24} />
                    </div>
                  </div>

                  {/* Card 3: Laporan yang Disetujui */}
                  <div className="bg-[#8b5cf6] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{reports.filter(r => r.status === 'Disetujui').length}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#f5f3ff]">Laporan Disetujui</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <UserCheck size={24} className="fill-white" />
                    </div>
                  </div>

                  {/* Card 4: Laporan yang Pending */}
                  <div className="bg-[#f97316] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{pendingReportsCount}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#fff7ed]">Laporan Pending</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <AlertTriangle size={24} className="fill-white" />
                    </div>
                  </div>

                </div>

                {/* DOUBLE COLUMN SPLIT GRID VIEW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column: DATA PEGAWAI RINGKASAN */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <Users size={16} className="text-[#0284c7]" />
                          RINGKASAN DATA PEGAWAI
                        </h4>
                        <p className="text-[10px] text-slate-400">Daftar personil aktif Sektor Bangka Belitung</p>
                      </div>
                      <button
                        onClick={() => { setActiveSubTab('pegawai'); }}
                        className="text-[#0284c7] hover:underline text-[10px] font-bold shrink-0"
                      >
                        Kelola Pegawai &gt;&gt;
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                      {employees.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">Belum ada data pegawai terdaftar.</div>
                      ) : (
                        employees.slice(0, 5).map((emp) => (
                          <div key={emp.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-1 rounded-lg transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {emp.avatar ? (
                                <img 
                                  src={emp.avatar} 
                                  alt={emp.name} 
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="bg-sky-100 text-sky-700 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs shrink-0">P</div>
                              )}
                              <div className="text-left min-w-0">
                                <span className="font-bold text-slate-800 text-xs block truncate">{emp.name}</span>
                                <span className="text-[9px] text-slate-404 font-mono block">NIP: {emp.nip}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg block max-w-xs truncate font-sans">
                                {emp.role}
                              </span>
                              <span className="text-[9px] text-indigo-550 uppercase tracking-widest font-black mt-0.5 block">{emp.department}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: DATA PELAPORAN RINGKASAN */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <CheckSquare size={16} className="text-[#10b981]" />
                          LAPORAN SEKTOR TERBARU
                        </h4>
                        <p className="text-[10px] text-slate-400">Aktivitas dan pertanggungjawaban lapangan terkini</p>
                      </div>
                      <button
                        onClick={() => { setActiveSubTab('laporan'); }}
                        className="text-[#10b981] hover:underline text-[10px] font-bold shrink-0"
                      >
                        Kelola Laporan &gt;&gt;
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                      {reports.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">Belum ada data pelaporan masuk.</div>
                      ) : (
                        reports.slice(0, 5).map((rep) => (
                          <div key={rep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50 px-1 rounded-lg transition-colors">
                            <div className="text-left space-y-0.5 min-w-0">
                              <span className="font-bold text-slate-850 text-xs block truncate max-w-[200px] sm:max-w-[240px]">{rep.title}</span>
                              <div className="flex items-center gap-2 text-[9px] text-slate-450 font-semibold flex-wrap">
                                <span className="font-extrabold text-slate-750">{rep.employeeName}</span>
                                <span>•</span>
                                <span>{rep.date}</span>
                                <span>•</span>
                                <span className="bg-sky-50 text-[#0284c7] px-1.5 py-0.2 rounded text-[8px] font-black">{rep.type}</span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                rep.status === 'Disetujui' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : rep.status === 'Ditolak' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              }`}>
                                {rep.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Database State Quick Sync Card */}
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sky-900 text-left">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="text-[#0284c7]" size={18} />
                    <div>
                      <p className="font-extrabold leading-none">Database Sektor Bangka Belitung Terverifikasi</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">Data mutakhir: {employees.length} Pegawai, {reports.length} Laporan Kerja.</span>
                    </div>
                  </div>
                  <button 
                    id="btn_view_report_shortcut"
                    onClick={() => setActiveSubTab('laporan')}
                    className="p-1 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Tinjau Laporan &gt;&gt;
                  </button>
                </div>

              </motion.div>
            )}

            {/* TAB 2: DATA PEGAWAI VIEW (With user request: includes and replaces previous KTA & Kehadiran, contains Add Employee Form Menu) */}
            {activeSubTab === 'pegawai' && (
              <motion.div
                key="tab_prisma_pegawai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left"
              >
                {/* Header title */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-300">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">Database & Data Pegawai</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Seluruh informasi data pokok pegawai PT. Haleyora Powerindo Bangka Belitung</p>
                  </div>

                  {/* Master triggers: tambah pegawai button */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      id="btn_tambah_pegawai_view"
                      onClick={() => setIsAddingInline(!isAddingInline)}
                      className="bg-[#0284c7] hover:bg-[#0369a1] text-white p-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow active:scale-95 cursor-pointer w-full sm:w-auto"
                    >
                      <Plus size={14} />
                      <span>{isAddingInline ? 'Batal Tambah' : 'Tambah Pegawai Baru'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline form card panel for "+ Tambah Pegawai Baru" */}
                <AnimatePresence>
                  {isAddingInline && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-white border-2 border-indigo-200 p-5 rounded-2xl shadow-md overflow-hidden text-xs"
                    >
                      <div className="border-b border-slate-100 pb-2 mb-4">
                        <h3 className="text-sm font-black text-slate-800">Formuler Tambah Data Pegawai Baru</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Silakan isi formulir dengan lengkap untuk mendaftarkan personil baru ke database</p>
                      </div>

                      <form id="form_tambah_inline" onSubmit={handleAddEmployeeSubmit} className="space-y-4">
                        
                        {/* Nama & NIP */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">Nama Lengkap Pegawai *</label>
                            <input 
                              id="inline_emp_name"
                              type="text" 
                              required
                              placeholder="Masukkan nama lengkap (contoh: Zulfikar Murfhy)"
                              value={newEmpName}
                              onChange={(e) => setNewEmpName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">NIP (Nomor Induk Pegawai) *</label>
                            <input 
                              id="inline_emp_nip"
                              type="text" 
                              required
                              placeholder="Contoh: 19930801201509"
                              value={newEmpNip}
                              onChange={(e) => setNewEmpNip(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                            />
                          </div>
                        </div>

                        {/* Jabatan & Divisi */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">Jabatan Kerja *</label>
                            <input 
                              id="inline_emp_role"
                              type="text" 
                              required
                              placeholder="Contoh: Pelaksana"
                              value={newEmpRole}
                              onChange={(e) => setNewEmpRole(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">Unit Kerja / Divisi *</label>
                            <input 
                              id="inline_emp_dept"
                              type="text" 
                              required
                              placeholder="Contoh: PT. PLN ( Persero ) UP3 Bangka"
                              value={newEmpDept}
                              onChange={(e) => setNewEmpDept(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner font-bold"
                            />
                          </div>
                        </div>

                        {/* Avatar Picker Choice (File Upload / URL Input) */}
                        <div className="space-y-2 animate-fade-in bg-slate-50/55 p-3 rounded-2xl border border-slate-200">
                          <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5 block">Avatar Profil (File lokal / URL) *</label>
                          <div className="flex gap-2">
                            <input 
                              id="inline_emp_avatar_url"
                              type="text" 
                              required
                              placeholder="Masukkan URL foto atau unggah berkas lokal"
                              value={newEmpAvatar}
                              onChange={(e) => setNewEmpAvatar(e.target.value)}
                              className="flex-1 bg-white border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-700 truncate"
                            />
                            <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 select-none">
                              <Upload size={14} />
                              <span>Pilih Berkas</span>
                              <input 
                                id="inline_emp_avatar_file"
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      onShowAlert('Kapasitas Penuh', 'Batas maksimal ukuran file gambar adalah 2MB.', 'alert');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === 'string') {
                                        setNewEmpAvatar(reader.result);
                                        onShowAlert('File Terunggah', 'Berhasil memproses & mengunggah file foto lokal Anda.', 'success');
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden" 
                              />
                            </label>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-normal pl-0.5">Mendukung unggah berkas langsung dari komputer Anda atau sematkan alamat url gambar eksternal.</p>
                        </div>

                        {/* Actions Inside */}
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                          <button
                            type="button" 
                            onClick={() => setIsAddingInline(false)}
                            className="p-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="p-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                          >
                            Daftarkan Pegawai Baru
                          </button>
                        </div>

                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search & Filter segment */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-3 text-slate-400" size={15} />
                    <input 
                      id="pegawai_search_box"
                      type="text" 
                      placeholder="Cari Pegawai (Nama, Jabatan, NIP)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-slate-700 text-xs outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex gap-2.5 w-full md:w-auto items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400">Filter Unit:</span>
                    <select 
                      id="pegawai_dept_filter"
                      value={deptFilter} 
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="bg-[#f8fafc] border border-slate-300 rounded-xl p-2 px-3 text-slate-650 text-xs outline-none font-bold"
                    >
                      <option value="Semua">Semua Divisi / Unit Kerja</option>
                      {uniqueDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Directory Table inside White Layout */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="min-w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase bg-slate-50 select-none">
                          <th className="p-4 pl-6">Foto & Nama Lengkap</th>
                          <th className="p-4">NIP (Nomor Induk)</th>
                          <th className="p-4">Unit Kerja / Divisi</th>
                          <th className="p-4">Jabatan</th>
                          <th className="p-4 text-center pr-6">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                              Tidak ditemukan data personil/pegawai yang sesuai pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-55/70 transition-colors">
                              <td className="p-4 pl-6 flex items-center gap-3">
                                <img 
                                  src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                                  alt={emp.name} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <p className="font-sans font-extrabold text-slate-800 leading-tight text-xs">{emp.name}</p>
                                </div>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-600">{emp.nip || '199001150021'}</td>
                              <td className="p-4 text-slate-705 font-bold">{emp.department}</td>
                              <td className="p-4 text-slate-700 font-extrabold">{emp.role}</td>
                              <td className="p-4 text-center pr-6">
                                <button
                                  id={`edit_emp_view_btn_${emp.id}`}
                                  onClick={() => setEditingEmployee(emp)}
                                  className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-colors inline-block cursor-pointer shadow-sm border border-slate-100 mr-1.5"
                                  title="Edit Pegawai"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  id={`delete_emp_view_btn_${emp.id}`}
                                  onClick={() => {
                                    if (confirm(`Apakah Anda yakin ingin menghapus data personil ${emp.name} (NIP: ${emp.nip}) dari database?`)) {
                                      onDeleteEmployee(emp.id);
                                      onShowAlert('Pegawai Dihapus', `${emp.name} berhasil dihapus dari direktori database lokal.`, 'success');
                                    }
                                  }}
                                  className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-colors inline-block cursor-pointer shadow-sm border border-slate-100"
                                  title="Hapus Pegawai"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: DATA LAPORAN (EVALUASI LAPORAN KERJA HARIAN) */}
            {activeSubTab === 'laporan' && (
              <motion.div
                key="tab_prisma_laporan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left font-sans"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-300">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">Data Pelaporan</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Pantau, verifikasi, dan kelola pertanggungjawaban laporan tugas personil lapangan</p>
                  </div>

                  <button
                    id="btn_tambah_laporan_manual"
                    onClick={() => setIsAddReportModalOpen(true)}
                    className="bg-[#0284c7] hover:bg-[#0369a1] text-white p-2 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow cursor-pointer active:scale-95 text-center font-sans tracking-wide"
                  >
                    <Plus size={14} />
                    <span>Tambah Data Pelaporan</span>
                  </button>
                </div>

                {/* DRAFTS & SUB-TAB CONTROLS (GMAIL-LIKE) */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1 mt-1 text-xs">
                  <button
                    onClick={() => setReportSubTab('semua')}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all ${
                      reportSubTab === 'semua' ? 'text-[#0284c7] border-b-2 border-[#0284c7]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Laporan Terkirim ({reports.length})
                  </button>
                  <button
                    onClick={() => setReportSubTab('draft')}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all flex items-center gap-1.5 ${
                      reportSubTab === 'draft' ? 'text-[#0284c7] border-b-2 border-[#0284c7]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Draft Laporan ({draftReports.length})</span>
                    {draftReports.length > 0 && (
                      <span className="bg-amber-500 text-slate-950 font-bold text-[8px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-pulse leading-none">
                        {draftReports.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setReportSubTab('rekap_kinerja')}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all flex items-center gap-1.5 ${
                      reportSubTab === 'rekap_kinerja' ? 'text-[#0284c7] border-b-2 border-[#0284c7]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Rekap Kinerja Bulanan</span>
                  </button>
                </div>

                {reportSubTab === 'semua' && (
                  <>
                    {/* GOOGLE SHEETS INTEGRATION DASH WIDGET */}
                    <div id="google_sheets_sync_card" className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-sky-500/25 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 -mr-16 -mt-16 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
                        <Globe size={18} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs tracking-wider text-sky-100 flex items-center gap-2">
                          GOOGLE SHEETS LIVE SYNCHRONIZATION
                          {googleUser && (
                            <span className="text-[8px] font-mono uppercase bg-emerald-500/20 text-emerald-300 py-0.5 px-2 rounded-full border border-emerald-500/30 font-black tracking-widest leading-none">
                              TERKONEKSI
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-300 mt-1 font-sans">Hubungkan database pelaporan PT Haleyora Powerindo dengan Google Spreadsheet secara instan.</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setIsSheetsWidgetCollapsed(!isSheetsWidgetCollapsed)}
                      className="text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider bg-slate-900/40 p-1.5 px-3 rounded-lg border border-white/10 active:scale-95 transition cursor-pointer"
                    >
                      {isSheetsWidgetCollapsed ? "Buka Monitor" : "Sembunyikan"}
                    </button>
                  </div>

                  {!isSheetsWidgetCollapsed && (
                    <div className="pt-4 space-y-4 relative z-10 transition-all duration-300 text-left">
                      {!googleUser ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                          <div className="space-y-1 text-center md:text-left">
                            <span className="text-xs font-bold text-slate-200 block">Autentikasi Akun Google Dibutuhkan</span>
                            <span className="text-[10px] text-slate-400 block max-w-xl leading-relaxed">
                              Untuk mengaktifkan sinkronisasi otomatis, ekspor bulk, atau mengimpor data laporan eksternal, Anda harus menghubungkan sesi ke akun Google Drive/Sheets Anda.
                            </span>
                          </div>
                          
                          <button
                            id="btn_google_signin_sheets"
                            disabled={isLoaderSheets}
                            onClick={handleConnectGoogle}
                            className="bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl transition shadow flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                          >
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            </svg>
                            <span>Sign in with Google</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Connection Header details */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              {googleUser.photoURL ? (
                                <img src={googleUser.photoURL} alt="Google avatar" className="w-8 h-8 rounded-full border border-sky-450" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="bg-sky-500 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono">G</div>
                              )}
                              <div>
                                <span className="font-bold text-sky-100 block text-xs">{googleUser.displayName || 'Google Account Connected'}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">{googleUser.email}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={handleDisconnectGoogle}
                              className="text-[10px] font-black uppercase text-rose-300 hover:text-white bg-rose-950/30 hover:bg-rose-900 p-1.5 px-3 rounded-lg border border-rose-500/20 transition cursor-pointer active:scale-95"
                            >
                              Putuskan Hubungan
                            </button>
                          </div>

                          {/* Options Block */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Option Box A: Create New Spreadsheet */}
                            <div className="bg-slate-950/35 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3">
                              <div className="space-y-1.5">
                                <h4 className="text-[10px] uppercase font-black text-slate-300 tracking-wider">● Opsi 1: Buat Spreadsheet Baru</h4>
                                <p className="text-[10px] text-slate-400">Buat file spreadsheet kosong baru di Google Drive Anda lalu ekspor semua data pelaporan saat ini.</p>
                                
                                <div className="space-y-1 pt-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Judul Spreadsheet:</label>
                                  <input 
                                    type="text"
                                    value={sheetsTitle}
                                    onChange={(e) => setSheetsTitle(e.target.value)}
                                    placeholder="Masukkan judul sheet..."
                                    className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-sky-500 font-sans"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={handleCreateNewSheet}
                                disabled={isLoaderSheets}
                                className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
                              >
                                {isLoaderSheets ? (
                                  <RefreshCw className="animate-spin" size={13} />
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    <span>Buat Sheet & Ekspor Data</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Option Box B: Write / Read Existing Spreadsheet */}
                            <div className="bg-slate-950/35 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3">
                              <div className="space-y-1.5">
                                <h4 className="text-[10px] uppercase font-black text-slate-300 tracking-wider">● Opsi 2: Spreadsheet Tertarget (Dua Arah)</h4>
                                <p className="text-[10px] text-slate-400">Gunakan ID Google Spreadsheet yang sudah ada untuk menimpa data atau mengimpor data balik ke sistem.</p>
                                
                                <div className="space-y-1 pt-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ID Spreadsheet Google:</label>
                                  <div className="flex gap-1.5">
                                    <input 
                                      type="text"
                                      value={sheetsSpreadsheetId}
                                      onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                                      placeholder="Paling tidak 25 karakter ID..."
                                      className="flex-1 bg-[#070b13] border border-slate-800 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                                    />
                                    {sheetsSpreadsheetUrl && (
                                      <a 
                                        href={sheetsSpreadsheetUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="bg-[#0369a1] hover:bg-[#0284c7] p-2 rounded-lg text-white flex items-center justify-center transition active:scale-95"
                                        title="Buka Spreadsheet di Tab Baru"
                                      >
                                        <ArrowUpRight size={14} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <button
                                  onClick={handleExportToExistingSheet}
                                  disabled={isLoaderSheets || !sheetsSpreadsheetId}
                                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow"
                                >
                                  {isLoaderSheets ? <RefreshCw className="animate-spin" size={12} /> : "Ekspor Timpa"}
                                </button>
                                <button
                                  onClick={handleImportFromSheet}
                                  disabled={isLoaderSheets || !sheetsSpreadsheetId}
                                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow"
                                >
                                  {isLoaderSheets ? <RefreshCw className="animate-spin" size={12} /> : "Tarik Impor"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Quick details */}
                          {sheetsSpreadsheetId && (
                            <div className="bg-slate-950/40 p-2.5 px-3 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
                              <span className="truncate max-w-full font-mono">
                                ID Aktif: <strong className="text-sky-305">{sheetsSpreadsheetId}</strong>
                              </span>
                              {sheetsSpreadsheetUrl && (
                                <a 
                                  href={sheetsSpreadsheetUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sky-400 font-bold hover:underline flex items-center gap-1 shrink-0"
                                >
                                  Buka Google Sheets di tab baru <ArrowUpRight size={10} />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-Filters panel */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                    {/* Search bar */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 text-slate-400" size={14} />
                      <input 
                        id="laporan_search_box"
                        type="text" 
                        placeholder="Cari Laporan (Nama, Judul, Keterangan)..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-slate-700 text-xs outline-none focus:ring-1 focus:ring-sky-500/50 font-medium"
                      />
                    </div>

                    {/* Unit filter */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-black text-slate-400">Unit:</span>
                      <select 
                        id="laporan_dept_select"
                        value={reportDeptFilter} 
                        onChange={(e) => setReportDeptFilter(e.target.value)}
                        className="bg-[#f8fafc] border border-slate-300 rounded-xl p-2 px-3 text-slate-700 text-xs outline-none font-bold cursor-pointer"
                      >
                        <option value="Semua">Semua Unit Kerja</option>
                        {uniqueReportDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-3 border-t border-slate-100 items-stretch md:items-center justify-between flex-wrap">
                    {/* Date Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-400">Mulai:</span>
                        <input 
                          id="laporan_start_date_filter"
                          type="date"
                          value={reportStartDateFilter}
                          onChange={(e) => setReportStartDateFilter(e.target.value)}
                          className="bg-[#f8fafc] border border-slate-300 text-slate-755 font-bold p-1.5 px-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500/50 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-400">Selesai:</span>
                        <input 
                          id="laporan_end_date_filter"
                          type="date"
                          value={reportEndDateFilter}
                          onChange={(e) => setReportEndDateFilter(e.target.value)}
                          className="bg-[#f8fafc] border border-slate-300 text-slate-755 font-bold p-1.5 px-2.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500/50 cursor-pointer"
                        />
                      </div>

                      {(reportStartDateFilter || reportEndDateFilter || searchQuery || reportDeptFilter !== 'Semua') && (
                        <button
                          id="btn_reset_laporan_filters"
                          onClick={() => {
                            setSearchQuery('');
                            setReportDeptFilter('Semua');
                            setReportStartDateFilter('');
                            setReportEndDateFilter('');
                            onShowAlert('Filter Direset', 'Semua filter pencarian dan rentang tanggal telah dikosongkan.', 'success');
                          }}
                          className="text-rose-600 hover:text-rose-700 active:scale-95 font-bold text-[10px] uppercase border border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0"
                        >
                          Reset Filter
                        </button>
                      )}
                    </div>

                    {/* Export Tools */}
                    <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                      <span className="text-[10px] uppercase font-black text-slate-400">Ekspor ({filteredReports.length}):</span>
                      
                      <button
                        id="btn_export_excel"
                        onClick={handleExportExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase px-3.5 py-2 rounded-xl active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ekspor ke Excel"
                      >
                        <FileSpreadsheet size={13} />
                        <span>Excel</span>
                      </button>

                      <button
                        id="btn_export_word"
                        onClick={handleExportWord}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase px-3.5 py-2 rounded-xl active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Simpan sebagai dokumen Microsoft Word"
                      >
                        <FileText size={13} />
                        <span>Word</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feed of reports */}
                <div className="space-y-4">
                  {filteredReports.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 italic text-xs">
                      Tidak ada data laporan harian yang ditemukan.
                    </div>
                  ) : (
                    filteredReports.map((rep) => (
                      <div key={rep.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative">
                        {/* Status Label & Delete Action */}
                        <div className="absolute top-5 right-5 flex items-center gap-2">
                          <span className={`text-[9px] font-black py-1 px-3 rounded-full border select-none ${
                            rep.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            rep.status === 'Ditolak' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                            'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {rep.status}
                          </span>
                          
                          <button
                            id={`report_btn_delete_${rep.id}`}
                            onClick={() => setDeletingReportId(rep.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                            title="Hapus Data Pelaporan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Top author details */}
                        <div className="flex items-center gap-3">
                          <div className="bg-[#e0f1fe] border border-sky-200 text-[#0284c7] font-black font-mono text-[9px] px-2.5 py-1 rounded-lg">
                            {rep.department === 'Operations' ? 'OPERASIONAL' : rep.department.toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-xs leading-none">{rep.employeeName}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-tight">Tanggal Pengiriman: <span className="font-mono text-slate-600 font-bold">{rep.date}</span></p>
                          </div>
                        </div>

                        {/* Description Block */}
                        <div className="space-y-2 pl-1 font-sans">
                          <h5 className="font-black text-slate-900 text-sm leading-tight">{rep.title}</h5>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-w-4xl">{rep.description}</p>
                          
                          {/* Metadata row */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8fafc] p-3 rounded-xl border border-slate-200 text-[10px] my-3 max-w-3xl">
                            <div>
                              <span className="text-slate-450 block font-bold uppercase text-[9px]">NIP Personil:</span>
                              <span className="text-slate-700 font-mono font-bold leading-normal">{rep.nip || '199001150021'}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block font-bold uppercase text-[9px]">Jabatan:</span>
                              <span className="text-[#0284c7] font-bold leading-normal">{rep.role || 'Staf Teknik'}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block font-bold uppercase text-[9px]">Kategori Tugas:</span>
                              <span className="text-rose-500 font-black leading-normal">{rep.type || 'Laporan'}</span>
                            </div>
                            <div>
                              <span className="text-slate-450 block font-bold uppercase text-[9px]">Sandi Laporan:</span>
                              <span className="text-slate-700 font-mono font-bold leading-normal">{rep.id}</span>
                            </div>
                          </div>

                          {/* Photos Display (Indoor and Outdoor side-by-side) */}
                          <div className="grid grid-cols-2 gap-4 max-w-2xl my-3">
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">● Kamera Selfie Indoor:</span>
                              {rep.photoIndoor ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-350 bg-slate-100 group">
                                  <img src={rep.photoIndoor} alt="Indoor Selfie Shot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <span className="absolute bottom-1 right-1 bg-black/80 text-emerald-400 text-[8px] px-1 py-0.5 rounded border border-white/5 font-bold font-mono">GPS VERIFIED</span>
                                </div>
                              ) : (
                                <div className="aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] italic">
                                  Belum diunggah
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">● Kamera Sektor Outdoor:</span>
                              {rep.photoOutdoor ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-350 bg-slate-100 group">
                                  <img src={rep.photoOutdoor} alt="Outdoor Location Asset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <span className="absolute bottom-1 right-1 bg-black/80 text-emerald-400 text-[8px] px-1 py-0.5 rounded border border-white/5 font-bold font-mono">GPS VERIFIED</span>
                                </div>
                              ) : (
                                <div className="aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px] italic">
                                  Belum diunggah
                                </div>
                              )}
                            </div>
                          </div>

                          {/* GPS Placement Metadata */}
                          {rep.location && (
                            <div className="flex items-center gap-1.5 text-[10px] text-cyan-650 font-bold bg-[#ecfeff] border border-cyan-200 p-2 rounded-xl max-w-2xl">
                              <MapPin size={11} className="text-cyan-500" />
                              <span>Lokasi Geo-Tagging Verified: {rep.location.name} ({rep.location.coordinates})</span>
                            </div>
                          )}
                        </div>

                        {/* Interactive verification / delete confirmation block */}
                        {deletingReportId === rep.id ? (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fade-in pl-3.5 pr-3.5 pt-3.5 pb-3.5">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="text-rose-600 shrink-0" size={16} />
                              <div>
                                <span className="font-extrabold text-rose-950 block">Hapus Data Pelaporan Permanen?</span>
                                <span className="text-[10px] text-rose-600 block mt-0.5 font-semibold">Tindakan ini tidak dapat dibatalkan dan data laporan akan dihapus seketika.</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                id={`confirm_delete_cancel_${rep.id}`}
                                onClick={() => setDeletingReportId(null)}
                                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button 
                                id={`confirm_delete_yes_${rep.id}`}
                                onClick={() => {
                                  onDeleteReport(rep.id);
                                  setDeletingReportId(null);
                                }}
                                className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 size={12} />
                                <span>Ya, Hapus</span>
                              </button>
                            </div>
                          </div>
                        ) : rep.status === 'Pending' ? (
                          <div className="flex items-center gap-3 pl-1 pt-3 border-t border-slate-105">
                            <button
                              id={`report_approve_btn_${rep.id}`}
                              onClick={() => {
                                setSelectedReportForAction(rep);
                                setActionType('Approve');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] py-2 px-4 rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>Setujui Laporan Satgas</span>
                            </button>
                            <button
                              id={`report_reject_btn_${rep.id}`}
                              onClick={() => {
                                setSelectedReportForAction(rep);
                                setActionType('Reject');
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] py-2 px-4 rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              <XCircle size={13} />
                              <span>Tolak Laporan (Revisi)</span>
                            </button>
                          </div>
                        ) : (
                          rep.notes && (
                            <div className="ml-1 bg-indigo-50 border-l-4 border-indigo-400 p-3 rounded-r-xl text-[10px] text-indigo-900 leading-normal font-medium max-w-2xl">
                              <span className="font-extrabold text-slate-500 block mb-0.5 text-[9px] uppercase">Instruksi Tim Evaluator:</span>
                              {rep.notes}
                            </div>
                          )
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {reportSubTab === 'draft' && (
              <div className="space-y-4">
                {/* Draft Info Header */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-50 border border-amber-500/30 p-5 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle size={16} />
                    <span className="font-extrabold uppercase tracking-wide">Pemberitahuan Sistem Draft Offline (HPI CS System)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Laporan kerja di bawah ini saat ini tersimpan aman di <strong>Penyimpanan Lokal (Browser Storage)</strong> Anda karena disimpan manual atau saat koneksi internet terganggu. Anda dapat menyunting draft ini kembali atau mengunggahnya secara massal / satu-per-satu ke server utama setelah jaringan terhubung.
                  </p>
                  
                  {draftReports.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2.5">
                      <button
                        onClick={onSyncDrafts}
                        className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition text-[11px] uppercase tracking-wide"
                      >
                        <RefreshCw size={13} className="animate-spin" />
                        <span>SINKRONISASIKAN SEMUA DRAFT SEKARANG ({draftReports.length})</span>
                      </button>
                    </div>
                  )}
                </div>

                {draftReports.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 italic text-xs space-y-1">
                    <p>Tidak ada laporan draft yang tersimpan di perangkat ini.</p>
                    <p className="text-[10px] text-slate-400 not-italic font-sans">
                      💡 <em>Anda dapat menggunakan tombol "Tambah Data Pelaporan" lalu klik "Simpan sebagai Draft" untuk membuat laporan sementara.</em>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans">
                    {draftReports.map((rep) => (
                      <div key={rep.id} className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-sm relative hover:border-amber-500/40 transition text-slate-800">
                        {/* Actions bar top-right */}
                        <div className="absolute top-5 right-5 flex items-center gap-2">
                          <span className="text-[9px] font-black py-1 px-3 rounded-full border bg-amber-50 text-amber-700 border-amber-300 select-none uppercase">
                            Draft Lokal
                          </span>
                          
                          <button
                            onClick={() => onDeleteDraftReport(rep.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
                            title="Hapus Draft"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Author details */}
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 font-mono font-black text-[9px] px-2.5 py-1 rounded-lg">
                            {rep.department ? rep.department.toUpperCase() : 'OPERASIONAL'}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs leading-none">{rep.employeeName}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-tight">Tanggal Buat: <span className="font-mono text-slate-600 font-bold">{rep.date}</span></p>
                          </div>
                        </div>

                        {/* Body contents */}
                        <div className="space-y-2 pl-1 font-sans">
                          <h5 className="font-black text-slate-900 text-sm leading-tight">{rep.title}</h5>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-w-4xl">{rep.description}</p>
                          
                          {/* Metadata list */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8fafc] p-3 rounded-xl border border-slate-200 text-[10px] my-3 max-w-3xl">
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[9px]">NIP Personil:</span>
                              <span className="text-slate-700 font-mono font-bold leading-normal">{rep.nip}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[9px]">Jabatan:</span>
                              <span className="text-[#0284c7] font-bold leading-normal">{rep.role}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[9px]">Unit Kerja:</span>
                              <span className="text-slate-700 font-bold leading-normal">{rep.department}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[9px]">Sandi Laporan:</span>
                              <span className="text-slate-700 font-mono font-bold leading-normal">{rep.id}</span>
                            </div>
                          </div>

                          {/* Interactive Action Controls */}
                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dashed border-amber-500/15">
                            <button
                              onClick={() => handleQuickUploadDraft(rep)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer uppercase tracking-wider"
                            >
                              <Send size={12} />
                              <span>Kirim Sekarang</span>
                            </button>
                            <button
                              onClick={() => handleEditDraft(rep)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer uppercase tracking-wider"
                            >
                              <Settings size={12} />
                              <span>Edit Draft</span>
                            </button>
                            <button
                              onClick={() => onDeleteDraftReport(rep.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[10px] py-1.5 px-3.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer uppercase tracking-wider"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {reportSubTab === 'rekap_kinerja' && (() => {
              const belongsToMonthYear = (dateStr: string, targetMonth: number, targetYear: number) => {
                if (!dateStr) return false;
                const parts = dateStr.split('-');
                if (parts.length < 2) return false;
                const yr = parseInt(parts[0], 10);
                const mo = parseInt(parts[1], 10);
                return yr === targetYear && mo === targetMonth;
              };

              const monthsList = [
                { value: 1, label: 'Januari' },
                { value: 2, label: 'Februari' },
                { value: 3, label: 'Maret' },
                { value: 4, label: 'April' },
                { value: 5, label: 'Mei' },
                { value: 6, label: 'Juni' },
                { value: 7, label: 'Juli' },
                { value: 8, label: 'Agustus' },
                { value: 9, label: 'September' },
                { value: 10, label: 'Oktober' },
                { value: 11, label: 'November' },
                { value: 12, label: 'Desember' }
              ];

              const yearsList = [2024, 2025, 2026, 2027];

              const filteredEmployees = employees.filter(emp => {
                if (!rekapSearchText.trim()) return true;
                const query = rekapSearchText.toLowerCase();
                return emp.name.toLowerCase().includes(query) ||
                       emp.nip.toLowerCase().includes(query) ||
                       (emp.department && emp.department.toLowerCase().includes(query)) ||
                       (emp.role && emp.role.toLowerCase().includes(query));
              });

              const employeePerformance = filteredEmployees.map(emp => {
                const empReports = reports.filter(r => r.employeeId === emp.id && belongsToMonthYear(r.date, rekapMonth, rekapYear));
                
                const uniqueDates = Array.from(new Set(empReports.map(r => r.date)));
                const workingDaysCount = uniqueDates.length;

                const indoorDates = Array.from(new Set(
                  empReports
                    .filter(r => r.photoIndoor && r.photoIndoor.trim() !== '')
                    .map(r => r.date)
                ));
                const countIndoorDays = indoorDates.length;

                const outdoorDates = Array.from(new Set(
                  empReports
                    .filter(r => r.photoOutdoor && r.photoOutdoor.trim() !== '')
                    .map(r => r.date)
                ));
                const countOutdoorDays = outdoorDates.length;

                const totalReports = empReports.length;

                const indoorPercentage = workingDaysCount > 0 ? Math.round((countIndoorDays / workingDaysCount) * 100) : 0;
                const outdoorPercentage = workingDaysCount > 0 ? Math.round((countOutdoorDays / workingDaysCount) * 100) : 0;

                const finalIndoorPercentage = indoorPercentage > 100 ? 100 : indoorPercentage;
                const finalOutdoorPercentage = outdoorPercentage > 100 ? 100 : outdoorPercentage;

                let scoreText = 'KURANG';
                let scoreColor = 'bg-rose-500 text-white';
                if (workingDaysCount > 0) {
                  const combinedPct = (finalIndoorPercentage + finalOutdoorPercentage) / 2;
                  if (combinedPct >= 90) {
                    scoreText = 'SANGAT BAIK';
                    scoreColor = 'bg-emerald-600 text-white';
                  } else if (combinedPct >= 60) {
                    scoreText = 'BAIK (OPTIMAL)';
                    scoreColor = 'bg-sky-600 text-white font-black';
                  } else if (combinedPct >= 30) {
                    scoreText = 'CUKUP';
                    scoreColor = 'bg-amber-500 text-slate-950 font-black';
                  } else {
                    scoreText = 'KURANG';
                    scoreColor = 'bg-rose-500 text-white';
                  }
                }

                return {
                  employee: emp,
                  reportsCount: totalReports,
                  workingDaysCount,
                  countIndoorDays,
                  countOutdoorDays,
                  indoorPercentage: finalIndoorPercentage,
                  outdoorPercentage: finalOutdoorPercentage,
                  scoreText,
                  scoreColor
                };
              });

              const totalActiveInRekap = employeePerformance.filter(x => x.reportsCount > 0).length;
              const perfectPerformers = employeePerformance.filter(x => x.indoorPercentage >= 90 && x.outdoorPercentage >= 90).length;
              const totalMonthlyIndoor = reports.filter(r => belongsToMonthYear(r.date, rekapMonth, rekapYear) && r.photoIndoor && r.photoIndoor.trim() !== '').length;
              const totalMonthlyOutdoor = reports.filter(r => belongsToMonthYear(r.date, rekapMonth, rekapYear) && r.photoOutdoor && r.photoOutdoor.trim() !== '').length;

              return (
                <div className="space-y-5 text-slate-800 font-sans mt-3">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col gap-1.5 text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">PILIH BULAN</span>
                        <select
                          value={rekapMonth}
                          onChange={(e) => setRekapMonth(Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 transition-colors w-40 cursor-pointer text-left"
                        >
                          {monthsList.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">TAHUN</span>
                        <select
                          value={rekapYear}
                          onChange={(e) => setRekapYear(Number(e.target.value))}
                          className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 transition-colors w-28 cursor-pointer text-left"
                        >
                          {yearsList.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-[200px] text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">PENCARIAN PEGAWAI</span>
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama, NIP, atau unit kerja..."
                            value={rekapSearchText}
                            onChange={(e) => setRekapSearchText(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 transition-colors placeholder:text-slate-400 placeholder:font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end gap-2 shrink-0 self-end lg:self-auto">
                      <button
                        onClick={() => {
                          setRekapMonth(new Date().getMonth() + 1);
                          setRekapYear(new Date().getFullYear());
                          setRekapSearchText('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer active:scale-95"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-sky-600 block uppercase tracking-wider">● Pegawai Kirim Laporan</span>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{totalActiveInRekap} / {employees.length}</h3>
                        <p className="text-[9px] text-slate-400 font-semibold">Tercatat aktif di bulan {monthsList.find(m => m.value === rekapMonth)?.label}</p>
                      </div>
                      <div className="bg-sky-100/85 text-sky-600 p-2.5 rounded-xl">
                        <Users size={18} />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider">● Kepatuhan Sempurna (≥90%)</span>
                        <h3 className="text-xl font-extrabold text-slate-905 tracking-tight">{perfectPerformers} Pegawai</h3>
                        <p className="text-[9px] text-slate-400 font-semibold">Mengirim foto Indoor & Outdoor rutin</p>
                      </div>
                      <div className="bg-emerald-100/85 text-emerald-600 p-2.5 rounded-xl">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-teal-600 block uppercase tracking-wider">● Total Foto Selfie Indoor</span>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{totalMonthlyIndoor} Foto</h3>
                        <p className="text-[9px] text-slate-400 font-semibold">Dokumentasi absensi selfie pegawai</p>
                      </div>
                      <div className="bg-teal-100/85 text-teal-600 p-2.5 rounded-xl">
                        <UserCheck size={18} />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-amber-600 block uppercase tracking-wider">● Total Foto Sektor Outdoor</span>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{totalMonthlyOutdoor} Foto</h3>
                        <p className="text-[9px] text-slate-400 font-semibold">Dokumentasi hasil kerja sektor lapangan</p>
                      </div>
                      <div className="bg-amber-100/85 text-amber-600 p-2.5 rounded-xl">
                        <MapPin size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                            <th className="py-3 px-4 text-center w-12">No</th>
                            <th className="py-3 px-4">Nama Personil / NIP</th>
                            <th className="py-3 px-4">Jabatan & Unit</th>
                            <th className="py-3 px-4 text-center">Hari Kerja Pelaporan</th>
                            <th className="py-3 px-4 text-center">Foto Selfie Indoor</th>
                            <th className="py-3 px-4 text-center">Foto Sektor Outdoor</th>
                            <th className="py-3 px-4 text-center">Status Rekapitulasi</th>
                            <th className="py-3 px-4 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {employeePerformance.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-10 text-center text-slate-400 italic font-semibold">
                                Tidak ada pegawai yang ditemukan. Silakan sesuaikan pencarian.
                              </td>
                            </tr>
                          ) : (
                            employeePerformance.map((item, index) => {
                              const emp = item.employee;
                              return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-4 text-center text-slate-400 font-bold font-mono">
                                    {index + 1}
                                  </td>
                                  
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      {emp.avatar ? (
                                        <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center shrink-0 uppercase border border-slate-200">
                                          {emp.name.slice(0, 2)}
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-extrabold text-slate-800 tracking-tight leading-tight">{emp.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">NIP {emp.nip}</div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-left">
                                    <div className="font-bold text-slate-700 leading-tight">
                                      {emp.role || 'Tenaga Lapangan'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold tracking-tight uppercase mt-0.5">
                                      {emp.department || 'Operasional'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-center">
                                    <span className="font-mono bg-slate-100 text-slate-705 border border-slate-200/60 px-2 rounded-lg font-bold">
                                      {item.workingDaysCount} Hari
                                    </span>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      <div className="font-mono font-bold text-slate-700 text-[11px]">
                                        {item.countIndoorDays} / {item.workingDaysCount || '—'}
                                      </div>
                                      {item.workingDaysCount > 0 ? (
                                        <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
                                          <div 
                                            className={`h-full rounded-full ${item.indoorPercentage >= 80 ? 'bg-emerald-500' : item.indoorPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                            style={{ width: `${item.indoorPercentage}%` }}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Tidak ada laporan</span>
                                      )}
                                      {item.workingDaysCount > 0 && (
                                        <span className={`text-[9px] font-bold ${item.indoorPercentage >= 80 ? 'text-emerald-600' : item.indoorPercentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                          {item.indoorPercentage}% Selesai
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      <div className="font-mono font-bold text-slate-700 text-[11px]">
                                        {item.countOutdoorDays} / {item.workingDaysCount || '—'}
                                      </div>
                                      {item.workingDaysCount > 0 ? (
                                        <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
                                          <div 
                                            className={`h-full rounded-full ${item.outdoorPercentage >= 80 ? 'bg-sky-500' : item.outdoorPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                            style={{ width: `${item.outdoorPercentage}%` }}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">Tidak ada laporan</span>
                                      )}
                                      {item.workingDaysCount > 0 && (
                                        <span className={`text-[9px] font-bold ${item.outdoorPercentage >= 80 ? 'text-sky-600' : item.outdoorPercentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                          {item.outdoorPercentage}% Selesai
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 text-center select-none">
                                    <span className={`inline-block py-1 px-3.5 rounded-full text-[9px] font-black tracking-wider uppercase ${item.scoreColor}`}>
                                      {item.scoreText}
                                    </span>
                                  </td>

                                  <td className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => setSelectedEmpForRekapDetail(emp.id)}
                                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all mx-auto active:scale-95 cursor-pointer"
                                      title="Lihat Detail Foto Bulanan"
                                    >
                                      <Eye size={12} />
                                      <span>Rincian</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

            {/* TAB 4: DATA MASTER (LOKASI KERJA, JABATAN & STRUKTUR ORGANISASI) */}
            {activeSubTab === 'kehadiran' && (
              <motion.div
                key="tab_prisma_kehadiran"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left font-sans"
              >
                {/* Horizontal sub-tabs for Data Master */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-205 pb-3 gap-3">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">
                      Master {masterSubTab === 'lokasi' ? 'Lokasi Kerja' : masterSubTab === 'jabatan' ? 'Manajemen Jabatan' : 'Struktur Organisasi'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {masterSubTab === 'lokasi' 
                        ? 'Manajemen lokasi & penempatan wilayah kerja pegawai terintegrasi' 
                        : masterSubTab === 'jabatan'
                          ? 'Konfigurasi profil jabatan dan tingkat kewenangan'
                          : 'Visualisasi bagan struktur komando formal PT Haleyora Powerindo'}
                    </p>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto shadow-inner">
                    <button
                      onClick={() => { setMasterSubTab('lokasi'); setMasterSearchQuery(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === 'lokasi' 
                          ? 'bg-white text-sky-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-933'
                      }`}
                    >
                      Lokasi Kerja
                    </button>
                    <button
                      onClick={() => { setMasterSubTab('jabatan'); setMasterSearchQuery(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === 'jabatan' 
                          ? 'bg-white text-sky-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-933'
                      }`}
                    >
                      Daftar Jabatan
                    </button>
                    <button
                      onClick={() => { setMasterSubTab('struktur'); setMasterSearchQuery(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === 'struktur' 
                          ? 'bg-white text-sky-600 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-933'
                      }`}
                    >
                      Hirarki & Struktur
                    </button>
                  </div>
                </div>

                {/* 1. SUB-TAB: LOKASI KERJA */}
                {masterSubTab === 'lokasi' && (
                  <div className="space-y-4">
                    {/* Stats Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex bg-[#009bca] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#0089b2] flex items-center justify-center w-14">
                          <MapPin size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">TOTAL LOKASI KERJA</p>
                          <p className="text-xl font-black mt-0.5">{locations.length}</p>
                        </div>
                      </div>

                      <div className="flex bg-[#10b981] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#059669] flex items-center justify-center w-14">
                          <Check size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">LOKASI SUDAH ADA PEGAWAI</p>
                          <p className="text-xl font-black mt-0.5">
                            {locations.filter(loc => Object.values(employeeLocations).includes(loc.id)).length}
                          </p>
                        </div>
                      </div>

                      <div className="flex bg-[#f97316] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#ea580c] flex items-center justify-center w-14">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">LOKASI BELUM ADA PEGAWAI</p>
                          <p className="text-xl font-black mt-0.5">
                            {locations.filter(loc => !Object.values(employeeLocations).includes(loc.id)).length}
                          </p>
                        </div>
                      </div>

                      <div className="flex bg-[#2563eb] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#1d4ed8] flex items-center justify-center w-14">
                          <Users size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">TOTAL PEGAWAI</p>
                          <p className="text-xl font-black mt-0.5">{employees.length}</p>
                        </div>
                      </div>

                      <div className="flex bg-[#12a176] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#0d845f] flex items-center justify-center w-14">
                          <UserCheck size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">PEGAWAI SUDAH PUNYA LOKASI</p>
                          <p className="text-xl font-black mt-0.5">
                            {employees.filter(emp => employeeLocations[emp.id]).length}
                          </p>
                        </div>
                      </div>

                      <div className="flex bg-[#ef4444] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#dc2626] flex items-center justify-center w-14">
                          <XCircle size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">PEGAWAI BELUM PUNYA LOKASI</p>
                          <p className="text-xl font-black mt-0.5">
                            {employees.filter(emp => !employeeLocations[emp.id]).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filter and search bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-205 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={13} />
                        <input
                          id="loc_search_query"
                          type="text"
                          placeholder="Cari ID / Lokasi / Barcode..."
                          value={masterSearchQuery}
                          onChange={(e) => setMasterSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-slate-800 text-xs outline-none focus:bg-white focus:border-sky-500 transition-colors"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-400">Filter Parent:</span>
                        <select
                          id="loc_parent_filter"
                          value={masterParentFilter}
                          onChange={(e) => setMasterParentFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-slate-705 text-xs outline-none font-bold"
                        >
                          <option value="Semua">-- Semua Parent --</option>
                          {locations.filter(l => l.level === 1).map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            setMasterSearchQuery('');
                            setMasterParentFilter('Semua');
                          }}
                          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    {/* Dark headers with locations list */}
                    <div className="bg-[#2a3042] text-white rounded-2xl border border-slate-700 shadow-md overflow-hidden">
                      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-700 bg-[#222736]">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-sky-400" />
                          <h2 className="text-sm font-black tracking-wider uppercase">Daftar Lokasi Kerja</h2>
                        </div>
                        <button
                          onClick={() => {
                            setEditingLocationId(null);
                            setLocationNameInput('');
                            setLocationLevelInput(1);
                            setLocationParentInput('');
                            setLocationBarcodeInput('');
                            setLocationJamInput('8 Jam Kerja');
                            setLocationPosInput(1);
                            setIsAddLocationModalOpen(true);
                          }}
                          className="bg-white text-slate-900 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 transition"
                        >
                          <Plus size={13} className="stroke-[3]" />
                          <span>Tambah Lokasi</span>
                        </button>
                      </div>

                      <div className="p-4 bg-slate-50 text-slate-800 divide-y divide-slate-100">
                        {locations.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 italic">
                            Belum ada lokasi kerja. Silakan klik "Tambah Lokasi" untuk mendaftarkan wilayah tugas satgas baru.
                          </div>
                        ) : (
                          (() => {
                            const filtered = locations.filter(loc => {
                              const matchSearch = masterSearchQuery ? (
                                loc.name.toLowerCase().includes(masterSearchQuery.toLowerCase()) ||
                                (loc.barcode && loc.barcode.toLowerCase().includes(masterSearchQuery.toLowerCase())) ||
                                loc.id.toLowerCase().includes(masterSearchQuery.toLowerCase())
                              ) : true;
                              const matchParent = masterParentFilter !== 'Semua' ? loc.parentId === masterParentFilter : true;
                              return matchSearch && matchParent;
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="text-center py-8 text-slate-400 italic">
                                  Laporan pencarian lokasi kosong.
                                </div>
                              );
                            }

                            return filtered.map((loc) => {
                              const assignedToThisLoc = employees.filter(emp => employeeLocations[emp.id] === loc.id);
                              
                              return (
                                <div key={loc.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/50 px-2.5 rounded-xl transition font-sans">
                                  <div className="flex items-start gap-2.5">
                                    <MapPin size={16} className="text-sky-500 shrink-0 mt-0.5" />
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{loc.name}</h3>
                                        {loc.level > 1 && (
                                          <span className="bg-slate-100 text-slate-605 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                            Sub Level {loc.level - 1}
                                          </span>
                                        )}
                                      </div>
                                      {loc.parentId && (
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          Parent Unit: <span className="font-bold text-sky-600">{locations.find(p => p.id === loc.parentId)?.name || loc.parentId}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto font-sans">
                                    {/* Assigned employees display and management button */}
                                    <button
                                      onClick={() => {
                                        setSelectedLocationForAssignment(loc.id);
                                        setIsAssignEmployeeModalOpen(true);
                                      }}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer"
                                      title="Daftar Pegawai"
                                    >
                                      <Users size={11} />
                                      <span>{assignedToThisLoc.length} Pegawai</span>
                                    </button>

                                    {/* Feature: Add Employee directly */}
                                    <button
                                      onClick={() => {
                                        setSelectedLocationForAssignment(loc.id);
                                        setIsAssignEmployeeModalOpen(true);
                                      }}
                                      className="bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 text-[10px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer"
                                      title="Placing / Tambah Pegawai di Lokasi"
                                    >
                                      <UserCheck size={11} className="text-sky-600" />
                                      <span>+ Pegawai</span>
                                    </button>

                                    {/* Feature: Add Sub location */}
                                    {loc.level < 6 && (
                                      <button
                                        onClick={() => {
                                          setEditingLocationId(null);
                                          setLocationNameInput('');
                                          setLocationLevelInput(loc.level + 1);
                                          setLocationParentInput(loc.id);
                                          setLocationBarcodeInput('');
                                          setLocationJamInput('8 Jam Kerja');
                                          setLocationPosInput(1);
                                          setIsAddLocationModalOpen(true);
                                        }}
                                        className="bg-[#24b071]/10 hover:bg-[#24b071]/20 text-[#15803d] border border-[#24b071]/25 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus size={11} className="stroke-[3]" />
                                        <span>+ Sub Lokasi</span>
                                      </button>
                                    )}

                                    {/* Edit buttons */}
                                    <button
                                      onClick={() => {
                                        setEditingLocationId(loc.id);
                                        setLocationNameInput(loc.name);
                                        setLocationLevelInput(loc.level);
                                        setLocationParentInput(loc.parentId || '');
                                        setLocationBarcodeInput(loc.barcode || '');
                                        setLocationJamInput(loc.jamKerja || '8 Jam Kerja');
                                        setLocationPosInput(loc.posCount || 1);
                                        setIsAddLocationModalOpen(true);
                                      }}
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                                      title="Edit lokasi"
                                    >
                                      <FileText size={12} className="text-amber-650" />
                                    </button>

                                    <button
                                      onClick={() => setLocationIdToDelete(loc.id)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                                      title="Hapus lokasi"
                                    >
                                      <Trash2 size={12} className="text-rose-650" />
                                    </button>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SUB-TAB: JABATAN / POSISI */}
                {masterSubTab === 'jabatan' && (
                  <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                          <Layers size={16} className="text-sky-500" />
                          <span>Daftar Jabatan Resmi</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                          Menampilkan {jabatans.length} Jabatan formal di unit kerja HPI
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingJabatanId(null);
                            setJabatanNameInput('');
                            setJabatanLevelInput(1);
                            setJabatanParentInput('');
                            setIsAddJabatanModalOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                        >
                          <Plus size={13} className="stroke-[3]" />
                          <span>+ Tambah Jabatan</span>
                        </button>

                        <button
                          onClick={() => {
                            const newLevelOrder = window.confirm("Aktifkan penukaran mode level hierarki jabatan?");
                            if (newLevelOrder) onShowAlert("Struktur Diperbarui", "Tukar Level hierarki jabatan berhasil diaktifkan.", "success");
                          }}
                          className="bg-sky-550 border border-sky-600 text-sky-800 hover:bg-sky-100 font-extrabold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1 active:scale-95 transition cursor-pointer"
                        >
                          <Layers size={13} />
                          <span>Tukar Level</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-black text-[10px] text-slate-500 uppercase select-none">
                            <th className="p-3 pl-5 text-center w-12">#</th>
                            <th className="p-3">ID JABATAN</th>
                            <th className="p-3">Nama Posisi / Jabatan</th>
                            <th className="p-3 text-center">Level Hierarki</th>
                            <th className="p-3">Atasan Langsung (Parent)</th>
                            <th className="p-3 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {jabatans.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-10 text-slate-400 italic text-center">
                                Belum ada jabatan tersimpan. Klik "+ Tambah Jabatan" untuk memulai membuat hierarki komando organisasi.
                              </td>
                            </tr>
                          ) : (
                            jabatans.map((jab, index) => {
                              const parentJab = jabatans.find(j => j.id === jab.parentId);
                              return (
                                <tr key={jab.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-3 pl-5 text-center font-bold text-slate-405">{index + 1}</td>
                                  <td className="p-3 font-mono font-bold text-sky-700">{jab.id}</td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-900 text-xs tracking-tight">{jab.name}</div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${
                                      jab.level === 1 ? 'bg-red-500' :
                                      jab.level === 2 ? 'bg-orange-500' :
                                      jab.level === 3 ? 'bg-sky-500' :
                                      jab.level === 4 ? 'bg-blue-600' :
                                      'bg-slate-500'
                                    }`}>
                                      Level {jab.level}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {parentJab ? (
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-slate-700">{parentJab.name}</span>
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">Lvl {parentJab.level}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-350 font-bold">-</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center gap-1"/>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setSelectedJabatanForAssignment(jab.id);
                                          setIsAssignJabatanModalOpen(true);
                                        }}
                                        className="p-1 px-2 text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-md hover:bg-sky-100 transition"
                                        title="Assign pegawai ke jabatan"
                                      >
                                        Assign ({employees.filter(emp => employeeJabatans[emp.id] === jab.id).length})
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setEditingJabatanId(jab.id);
                                          setJabatanNameInput(jab.name);
                                          setJabatanLevelInput(jab.level);
                                          setJabatanParentInput(jab.parentId || '');
                                          setIsAddJabatanModalOpen(true);
                                        }}
                                        className="p-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg transition"
                                      >
                                        <FileText size={12} />
                                      </button>

                                      <button
                                        onClick={() => setJabatanIdToDelete(jab.id)}
                                        className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. SUB-TAB: HIRARKI & STRUKTUR ORGANISASI */}
                {masterSubTab === 'struktur' && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div>
                          <h2 className="text-base font-black text-slate-800">Hirarki Pegawai</h2>
                          <p className="text-xs text-slate-450">Bagan komando dan distribusi jumlah tenaga kerja di unit kerja</p>
                        </div>

                        <button
                          onClick={() => setIsOrgModalOpen(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
                        >
                          <Layers size={13} />
                          <span>Lihat Struktur Organisasi</span>
                        </button>
                      </div>

                      {/* Stat grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-bold mb-6">
                        <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-blue-500">TOTAL TENAGA KERJA</p>
                          <p className="text-xl font-black mt-1">{employees.length} <span className="text-[10px] font-normal text-slate-400">Pegawai</span></p>
                        </div>
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-emerald-500">SUDAH ADA DI HIRARKI</p>
                          <p className="text-xl font-black mt-1">
                            {employees.filter(emp => employeeJabatans[emp.id]).length} <span className="text-[10px] font-normal text-slate-400">Pegawai</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-amber-500">BELUM DI-SET HIRARKI</p>
                          <p className="text-xl font-black mt-1">
                            {employees.filter(emp => !employeeJabatans[emp.id]).length} <span className="text-[10px] font-normal text-slate-400">Pegawai</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-rose-500">BELUM PUNYA JABATAN</p>
                          <p className="text-xl font-black mt-1">
                            {employees.filter(emp => !emp.role || emp.role === '-').length} <span className="text-[10px] font-normal text-slate-400">Pegawai</span>
                          </p>
                        </div>
                      </div>

                      {/* Jumlah TK per Jabatan cards */}
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                          🔬 Jumlah TK per Jabatan (Klik card untuk lihat daftar pegawai)
                        </h3>

                        {jabatans.length === 0 ? (
                          <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic">
                            Belum ada struktur jabatan yang dikonfigurasi. Silakan buat Jabatan baru di tab sebelah kiri.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {jabatans.sort((a,b) => a.level - b.level).map(jab => {
                              const assignedToJab = employees.filter(emp => employeeJabatans[emp.id] === jab.id);
                              
                              const sideColor = 
                                jab.level === 1 ? 'border-l-red-500' :
                                jab.level === 2 ? 'border-l-orange-500' :
                                jab.level === 3 ? 'border-l-sky-400' :
                                jab.level === 4 ? 'border-l-blue-650' :
                                'border-l-slate-400';

                              return (
                                <div
                                  key={jab.id}
                                  onClick={() => setSelectedJabatanForDetail(jab.id)}
                                  className={`bg-white hover:bg-slate-50 border border-slate-200 border-l-4 ${sideColor} rounded-xl p-4 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md select-none`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 block uppercase">
                                      LEVEL {jab.level}
                                    </span>
                                    <ChevronRight size={14} className="text-slate-300" />
                                  </div>
                                  <h4 className="font-extrabold text-sm text-slate-800 my-1 tracking-tight truncate">
                                    {jab.name}
                                  </h4>
                                  <p className="text-xl font-black text-slate-900 mt-2">
                                    {assignedToJab.length} <span className="text-[10px] font-bold text-slate-400">orang</span>
                                  </p>
                                  <p className="text-[9.5px] text-sky-600 mt-3 flex items-center gap-1 font-bold">
                                    <span>🖱️ Klik untuk lihat detail</span>
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeSubTab === 'pengaturan' && (
              <motion.div
                key="tab_prisma_pengaturan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left font-sans"
              >
                <div className="pb-2 border-b border-slate-300">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 font-sans">Pengaturan Akun Administrator</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Ubah nama taktis, tautan foto avatar profil, serta kunci sandi enkripsi login</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Visual Card Preview of Active Admin Profile */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 text-center relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
                      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl"></div>
                      
                      <div className="relative inline-block mb-4 mt-2">
                        <img 
                          src={settingAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                          alt="Avatar Administrator Preview"
                          className="w-24 h-24 rounded-full border-4 border-indigo-500/50 object-cover mx-auto shadow-lg"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';
                          }}
                        />
                        <div className="absolute bottom-0 right-0 p-1 px-2.5 bg-indigo-650 border border-indigo-400 rounded-full text-[9px] font-bold text-white shadow">
                          Admin
                        </div>
                      </div>

                      <h3 className="text-base font-black text-white">{settingName || "Administrator"}</h3>
                      <p className="text-[10px] text-sky-450 font-bold uppercase tracking-widest mt-1">PT. Haleyora Powerindo</p>
                      
                      <div className="mt-6 pt-5 border-t border-slate-850 grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-500 uppercase font-black block">ID Login</span>
                          <span className="text-xs font-mono font-bold text-slate-300">admin</span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[9px] text-slate-500 uppercase font-black block">Level Akses</span>
                          <span className="text-xs text-sky-400 font-bold">SU / Supervisor</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-850 text-[10px] text-slate-400 leading-relaxed text-left">
                        <p className="italic">Gunakan formulir di sebelah kanan untuk memperbarui identitas kredensial keamanan Anda secara langsung.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Update Forms */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      
                      if (!settingName.trim()) {
                        onShowAlert('Nama Diperlukan', 'Nama administrator tidak boleh kosong.', 'alert');
                        return;
                      }
                      if (!settingPassword.trim()) {
                        onShowAlert('Password Diperlukan', 'Password tidak boleh kosong.', 'alert');
                        return;
                      }

                      // Check if password has changed from current adminPassword
                      if (settingPassword !== adminPassword) {
                        if (!settingOldPassword) {
                          onShowAlert('Sandi Lama Diperlukan', 'Konfirmasi kata sandi lama diperlukan untuk memperbarui keamanan password baru.', 'alert');
                          return;
                        }
                        if (settingOldPassword !== adminPassword) {
                          onShowAlert('Sandi Lama Salah', 'Kata sandi saat ini yang Anda masukkan salah. Perubahan sandi baru ditolak.', 'alert');
                          return;
                        }
                        if (settingPassword !== settingPasswordConfirm) {
                          onShowAlert('Sandi Tidak Cocok', 'Silakan periksa kembali kecocokan password baru Anda.', 'alert');
                          return;
                        }
                      }

                      onUpdateAdminProfile(settingName, settingAvatar, settingPassword);
                      onShowAlert('Kredensial Diperbarui', 'Konfigurasi identitas & password baru admin berhasil disimpan sistem.', 'success');
                    }} className="space-y-5">
                      
                      {/* Section 1: Profil Akun */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full"></span>
                          Detail Profil Administrator
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nama */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">Nama Sektor / Sebutan Taktis *</label>
                            <input 
                              id="setting_admin_name"
                              type="text" 
                              required
                              placeholder="Contoh: Bangka Belitung atau Jakarta Barat"
                              value={settingName}
                              onChange={(e) => setSettingName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-bold text-slate-800"
                            />
                            <p className="text-[9px] text-slate-400 leading-normal">Nama ini akan tercantum sebagai nama administrator di header atas dashboard.</p>
                          </div>

                          {/* Avatar URL / Local File Upload */}
                          <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">Avatar Foto (File lokal / URL) *</label>
                            
                            <div className="flex gap-2">
                              <input 
                                id="setting_admin_avatar_url"
                                type="text" 
                                required
                                placeholder="Pilih file lokal atau masukkan URL foto profil (https://...)"
                                value={settingAvatar}
                                onChange={(e) => setSettingAvatar(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-700 truncate"
                              />
                              <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 select-none">
                                <Upload size={14} />
                                <span>Pilih Berkas</span>
                                <input 
                                  id="setting_admin_avatar_file"
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        onShowAlert('Kapasitas Penuh', 'Batas maksimal ukuran file gambar adalah 2MB.', 'alert');
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        if (typeof reader.result === 'string') {
                                          setSettingAvatar(reader.result);
                                          onShowAlert('File Terunggah', 'Berhasil memproses & mengunggah file foto lokal Anda.', 'success');
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden" 
                                />
                              </label>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-normal">Mendukung unggah berkas langsung dari komputer Anda atau sematkan alamat url gambar eksternal.</p>
                          </div>
                        </div>


                      </div>

                      {/* Section 2: Kredensial Keamanan */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                          Ubah Kunci Sandi Keamanan
                        </h4>

                        {/* Old password field - ONLY required and shown when password is changed */}
                        {settingPassword !== adminPassword && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 bg-amber-50/50 border border-amber-250 p-3.5 rounded-2xl"
                          >
                            <label className="text-[10px] text-amber-805 uppercase font-bold pl-0.5 flex items-center gap-1.5">
                              <span>Masukkan Kata Sandi Lama Saat Ini *</span>
                              <span className="text-[9px] font-normal text-amber-600">(Wajib diisi untuk memverifikasi penggantian sandi baru)</span>
                            </label>
                            <input 
                              id="setting_admin_old_password"
                              type={showPassword ? "text" : "password"}
                              required={settingPassword !== adminPassword}
                              placeholder="Masukkan kata sandi lama Anda saat ini"
                              value={settingOldPassword}
                              onChange={(e) => setSettingOldPassword(e.target.value)}
                              className="w-full bg-white border border-amber-300 p-2.5 rounded-xl text-xs outline-none focus:border-amber-400 font-mono text-slate-850 font-bold"
                            />
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Kata Sandi Baru */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">Kata Sandi Baru *</label>
                            <input 
                              id="setting_admin_password"
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Masukkan password baru"
                              value={settingPassword}
                              onChange={(e) => setSettingPassword(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-850"
                            />
                          </div>

                          {/* Konfirmasi Kata Sandi Baru */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">Konfirmasi Kata Sandi Baru *</label>
                            <input 
                              id="setting_admin_password_confirm"
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Ketik ulang password baru"
                              value={settingPasswordConfirm}
                              onChange={(e) => setSettingPasswordConfirm(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-850"
                            />
                          </div>
                        </div>

                        {/* Show/Hide password checkbox toggle */}
                        <div className="flex items-center gap-2 pl-0.5">
                          <input 
                            id="toggle_setting_show_pass"
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="bg-slate-100 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <label htmlFor="toggle_setting_show_pass" className="text-[11px] text-slate-600 select-none cursor-pointer font-medium">
                            Tampilkan Password Enkripsi
                          </label>
                        </div>
                      </div>

                      {/* Action buttons footer */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          id="btn_cancel_settings"
                          onClick={() => {
                            setSettingName(adminName);
                            setSettingAvatar(adminAvatar);
                            setSettingPassword(adminPassword);
                            setSettingPasswordConfirm(adminPassword);
                            setActiveSubTab('ringkasan');
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          id="btn_save_settings"
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Check size={14} className="text-white" strokeWidth={3} />
                          Simpan Perubahan Kredensial
                        </button>
                      </div>

                    </form>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>

      {/* --- ADD EMPLOYEE MODAL DIALOG --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-350 w-full max-w-md p-6 rounded-3xl space-y-4 shadow-xl text-xs text-slate-800 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-205">
                <h3 className="text-sm font-black text-slate-900">Tambah Data Pegawai Baru</h3>
                <button 
                  id="btn_cls_add_mod"
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 cursor-pointer"
                >
                  X
                </button>
              </div>

              <form id="form_tambah_pegawai" onSubmit={handleAddEmployeeSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Nama Lengkap *</label>
                    <input 
                      id="input_add_emp_name"
                      type="text" 
                      required 
                      placeholder="Zulfikar Murfhy"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">NIP (Nomor Induk) *</label>
                    <input 
                      id="input_add_emp_nip"
                      type="text" 
                      required 
                      placeholder="199308012015"
                      value={newEmpNip}
                      onChange={(e) => setNewEmpNip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Jabatan (Role) *</label>
                    <input 
                      id="input_add_emp_role"
                      type="text" 
                      required 
                      placeholder="Contoh: Pelaksana"
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Unit Kerja / Divisi *</label>
                    <input 
                      id="select_add_emp_dept"
                      type="text"
                      required
                      placeholder="Contoh: PT. PLN ( Persero ) UP3 Bangka"
                      value={newEmpDept}
                      onChange={(e) => setNewEmpDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-slate-700 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-in bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5 block">Avatar Profil (File lokal / URL) *</label>
                  <div className="flex gap-2">
                    <input 
                      id="select_add_emp_avatar_url"
                      type="text" 
                      required
                      placeholder="Masukkan URL foto atau unggah berkas"
                      value={newEmpAvatar}
                      onChange={(e) => setNewEmpAvatar(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-700 truncate"
                    />
                    <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 select-none">
                      <Upload size={14} />
                      <span>Pilih Berkas</span>
                      <input 
                        id="select_add_emp_avatar_file"
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              onShowAlert('Kapasitas Penuh', 'Batas maksimal ukuran file gambar adalah 2MB.', 'alert');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setNewEmpAvatar(reader.result);
                                onShowAlert('File Terunggah', 'Berhasil memproses & mengunggah file foto lokal Anda.', 'success');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal pl-0.5">Mendukung unggah berkas langsung dari komputer Anda atau sematkan alamat url gambar eksternal.</p>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-150">
                  <button 
                    id="btn_cls_add_mod_cancel"
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)} 
                    className="p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    id="btn_submit_add_emp"
                    type="submit" 
                    className="p-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer shadow"
                  >
                    Simpan Database
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EVALUATION DECISION DIALOG MODAL (APPROVE/REJECT NOTES) --- */}
      <AnimatePresence>
        {selectedReportForAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-350 w-full max-w-sm p-6 rounded-3xl space-y-4 shadow-xl text-xs text-slate-850 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                  {actionType === 'Approve' ? 'Konfirmasi Setujui Laporan' : 'Konfirmasi Tolak Laporan'}
                </h3>
                <button 
                  id="btn_cls_eval_mod"
                  onClick={() => { setSelectedReportForAction(null); setActionType(null); }} 
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 cursor-pointer"
                >
                  X
                </button>
              </div>

              <form id="form_proses_evaluasi" onSubmit={handleProcessReportAction} className="space-y-3">
                <p className="text-slate-600 leading-relaxed text-xs">
                  Harap masukkan catatan respon evaluator untuk personil <span className="font-extrabold text-[#0284c7]">{selectedReportForAction.employeeName}</span> terkait penugasan ini:
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">Catatan Respon Evaluasi *</label>
                  <textarea 
                    id="input_eval_notes"
                    required
                    rows={3}
                    placeholder={actionType === 'Approve' ? 'Contoh: Pekerjaan bagus, geo-tagging terverifikasi cocok.' : 'Contoh: Revisi diperlukan, foto outdoor buram.'}
                    value={adminFeedbackNotes}
                    onChange={(e) => setAdminFeedbackNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-slate-800 outline-none focus:border-indigo-400 resize-none font-sans text-xs shadow-inner"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button 
                    id="btn_eval_cancel"
                    type="button" 
                    onClick={() => { setSelectedReportForAction(null); setActionType(null); }} 
                    className="p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    id="btn_eval_submit"
                    type="submit" 
                    className={`p-2.5 px-5 font-bold text-white rounded-xl cursor-pointer shadow ${
                      actionType === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    Ya, Kirim Status
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD REPORT MANUAL DIALOG (ADMIN OVERRIDE) --- */}
      <AnimatePresence>
        {isAddReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-300 w-full max-w-lg p-6 rounded-3xl space-y-4 shadow-xl text-xs text-slate-800 text-left overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-900 leading-none">Buat Data Laporan Kerja Manual</h3>
                  <p className="text-[10px] text-slate-450 leading-tight">Sisipkan data laporan taktis langsung dari otoritas supervisor</p>
                </div>
                <button 
                  id="btn_cls_add_rep_mod"
                  onClick={() => setIsAddReportModalOpen(false)} 
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 cursor-pointer"
                >
                  X
                </button>
              </div>

              {/* Quick Select Employee Dropdown */}
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200 space-y-1.5">
                <label className="text-[10px] text-[#0284c7] font-black uppercase tracking-wider block">Cepat Isi dari Database Pegawai:</label>
                <select
                  id="select_quick_fill_employee"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectEmployeeForReport(e.target.value);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 p-2 rounded-lg text-slate-700 outline-none focus:border-indigo-400 text-xs shadow-sm font-bold cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>-- Pilih Pegawai Lapangan --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role} - {e.department})</option>
                  ))}
                </select>
              </div>

              <form id="form_tambah_laporan_manual" onSubmit={handleAddReportSubmit} className="space-y-3.5">
                {/* Row 1: Identitas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Nama Pegawai *</label>
                    <input 
                      id="input_manual_rep_name"
                      type="text" 
                      required 
                      placeholder="Masukkan nama pegawai"
                      value={addRepName}
                      onChange={(e) => setAddRepName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">NIP Pegawai *</label>
                    <input 
                      id="input_manual_rep_nip"
                      type="text" 
                      required 
                      placeholder="Contoh: 199307040102"
                      value={addRepNip}
                      onChange={(e) => setAddRepNip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Row 2: Jabatan & Unit Kerja */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Jabatan (Role) *</label>
                    <input 
                      id="input_manual_rep_role"
                      type="text" 
                      required 
                      placeholder="Senior Engineer"
                      value={addRepRole}
                      onChange={(e) => setAddRepRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Unit Kerja / Divisi *</label>
                    <input 
                      id="input_manual_rep_dept"
                      type="text" 
                      required 
                      placeholder="PT PLN ( Persero ) UP3 Bangka"
                      value={addRepDept}
                      onChange={(e) => setAddRepDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Photo Upload Fields (Choose File & Camera) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-600 block pl-0.5 uppercase tracking-wider">● FOTO INDOOR *</span>
                    <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-dashed border-slate-300 items-center justify-center">
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {addRepIndoor ? (
                          <img src={addRepIndoor} alt="Indoor Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[9px] text-slate-400">Belum ada foto</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 w-full mt-1">
                        {/* Live Camera Button */}
                        <button
                          id="btn_live_camera_indoor"
                          type="button"
                          onClick={() => handleOpenLiveCamera('indoor')}
                          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-[9px] text-center py-2 px-1 rounded-lg transition shadow-sm active:scale-95 uppercase tracking-tight flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Camera size={10} /> Camera
                        </button>
                        {/* Gallery File Input Button */}
                        <label className="cursor-pointer">
                          <span className="w-full block bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] text-center py-2 px-1 rounded-lg transition shadow-sm active:scale-95 uppercase tracking-tight flex items-center justify-center gap-1">
                            <Plus size={10} /> File Galeri
                          </span>
                          <input 
                            id="file_input_indoor"
                            type="file" 
                            accept="image/*" 
                            onChange={handleIndoorFileChange} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-black text-slate-600 block pl-0.5 uppercase tracking-wider">● FOTO OUTDOOR *</span>
                    <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-dashed border-slate-300 items-center justify-center">
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {addRepOutdoor ? (
                          <img src={addRepOutdoor} alt="Outdoor Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[9px] text-slate-400">Belum ada foto</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 w-full mt-1 font-sans">
                        {/* Live Camera Button */}
                        <button
                          id="btn_live_camera_outdoor"
                          type="button"
                          onClick={() => handleOpenLiveCamera('outdoor')}
                          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-[9px] text-center py-2 px-0.5 rounded-lg transition shadow-sm active:scale-95 uppercase tracking-tight flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Camera size={10} /> Camera
                        </button>
                        {/* Gallery File Input Button */}
                        <label className="cursor-pointer">
                          <span className="w-full block bg-slate-800 hover:bg-slate-900 text-white font-bold text-[9px] text-center py-2 px-0.5 rounded-lg transition shadow-sm active:scale-95 uppercase tracking-tight flex items-center justify-center gap-1">
                            <Plus size={10} /> File Galeri
                          </span>
                          <input 
                            id="file_input_outdoor"
                            type="file" 
                            accept="image/*" 
                            onChange={handleOutdoorFileChange} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geotagging & GPS Tag Input */}
                <div className="bg-sky-500/5 p-4 rounded-2xl border border-sky-500/15 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-sky-600 animate-bounce" />
                      <span className="text-[10px] font-black uppercase text-sky-900 tracking-wider">● Lokasi Geotagging GPS</span>
                    </div>
                    
                    <button
                      id="btn_refetch_gps"
                      type="button"
                      disabled={isFetchingGPS}
                      onClick={handleFetchGPS}
                      className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-[10px] uppercase font-black px-3 py-1.5 rounded-xl transition shadow active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      {isFetchingGPS ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Mencari GPS...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={11} />
                          <span>Pindai GPS Lapangan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">Koordinat Deteksi GPS *</span>
                      <input 
                        id="input_manual_rep_coord"
                        type="text"
                        required
                        placeholder="-2.1299, 106.1138"
                        value={addRepCoord}
                        onChange={(e) => setAddRepCoord(e.target.value)}
                        className="w-full bg-white border border-slate-300 p-2 rounded-lg text-slate-800 text-xs font-mono font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">Nama Tempat / Deskripsi Lokasi *</span>
                      <input 
                        id="input_manual_rep_loc_name"
                        type="text"
                        required
                        placeholder="Sektor Bangka Belitung"
                        value={addRepLocName}
                        onChange={(e) => setAddRepLocName(e.target.value)}
                        className="w-full bg-white border border-slate-300 p-2 rounded-lg text-slate-800 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submissions */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                  <button 
                    id="btn_manual_rep_cancel"
                    type="button" 
                    onClick={() => setIsAddReportModalOpen(false)} 
                    className="p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl cursor-pointer text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    id="btn_manual_rep_draft"
                    type="button" 
                    onClick={handleSaveReportAsDraft} 
                    className="p-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl cursor-pointer text-xs"
                  >
                    Simpan sebagai Draft
                  </button>
                  <button 
                    id="btn_manual_rep_submit"
                    type="submit" 
                    className="p-2.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl cursor-pointer shadow text-xs"
                  >
                    Kirim & Masukkan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 1. Add/Edit Lokasi Kerja Modal */}
        {isAddLocationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-800 space-y-4 font-sans border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <MapPin size={16} className="text-sky-500" />
                  <span>{editingLocationId ? 'Edit Lokasi Kerja' : 'Tambah Lokasi Kerja Baru'}</span>
                </h3>
                <button 
                  onClick={() => setIsAddLocationModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-650"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveLocation} className="space-y-4">
                {locationParentInput && (
                  <div className="bg-sky-50 text-sky-800 p-3 rounded-xl border border-sky-100 text-xs font-bold font-sans">
                    Sub-lokasi untuk: <span className="text-sky-900">{locations.find(l => l.id === locationParentInput)?.name || locationParentInput}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">Nama Lokasi Kerja *</label>
                  <input
                    type="text"
                    required
                    placeholder="PT. PLN ( Persero ) UP3 Bangka"
                    value={locationNameInput}
                    onChange={(e) => setLocationNameInput(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-350 p-2.5 rounded-xl outline-none text-xs text-slate-900 font-bold focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddLocationModalOpen(false)}
                    className="p-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="p-2 py-2 px-5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition shadow-sm"
                  >
                    Simpan Lokasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Add/Edit Jabatan Modal */}
        {isAddJabatanModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-800 space-y-4 font-sans border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Layers size={16} className="text-sky-500" />
                  <span>{editingJabatanId ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}</span>
                </h3>
                <button 
                  onClick={() => setIsAddJabatanModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-655"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveJabatan} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">Nama Posisi / Jabatan *</label>
                  <input
                    type="text"
                    required
                    placeholder="KOORDINATOR"
                    value={jabatanNameInput}
                    onChange={(e) => setJabatanNameInput(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-350 p-2.5 rounded-xl outline-none text-xs text-slate-900 font-bold focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">Tingkatan Level Hierarki (Kewenangan) *</label>
                  <select
                    value={jabatanLevelInput}
                    onChange={(e) => setJabatanLevelInput(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-slate-355 p-2.5 rounded-xl outline-none text-xs font-bold text-slate-800"
                  >
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                </div>

                {jabatanLevelInput > 1 && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">Atasan Langsung (Parent Jabatan)</label>
                    <select
                      value={jabatanParentInput}
                      onChange={(e) => setJabatanParentInput(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-355 p-2.5 rounded-xl outline-none text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Tanpa Atasan (Tertinggi) --</option>
                      {jabatans.filter(j => j.level < jabatanLevelInput).map(j => (
                        <option key={j.id} value={j.id}>{j.name} (Level {j.level})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddJabatanModalOpen(false)}
                    className="p-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="p-2 py-2 px-5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition shadow-sm"
                  >
                    Simpan Jabatan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Assign Employee to Location Modal */}
        {isAssignEmployeeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-800 space-y-4 font-sans border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-sky-500" />
                    <span>Penempatan Pegawai di Lokasi</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Lokasi: <span className="text-indigo-600 font-bold">{locations.find(l => l.id === selectedLocationForAssignment)?.name}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setIsAssignEmployeeModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Ceklis nama pegawai di bawah ini untuk menempatkan mereka secara resmi di area kerja terpilih. Pegawai yang tidak dicentang akan dilepaskan dari lokasi kerja ini.
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-[#f8fafc]">
                  {employees.length === 0 ? (
                    <p className="p-4 text-center text-slate-400 italic text-xs">Belum ada pegawai terdaftar di sistem.</p>
                  ) : (
                    employees.map(emp => {
                      const isAssigned = employeeLocations[emp.id] === selectedLocationForAssignment;
                      return (
                        <label key={emp.id} className="flex items-center justify-between p-2.5 hover:bg-white rounded-lg transition cursor-pointer">
                          <div className="flex items-center gap-2.5 font-sans">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updated = { ...employeeLocations };
                                if (checked) {
                                  updated[emp.id] = selectedLocationForAssignment!;
                                } else {
                                  delete updated[emp.id];
                                }
                                setEmployeeLocations(updated);
                              }}
                              className="w-4 h-4 text-sky-600 rounded border-slate-350 focus:ring-sky-500"
                            />
                            <div>
                              <p className="text-xs font-extrabold text-slate-800 leading-tight">{emp.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                NIP: {emp.nip} • <span className="font-bold">{emp.role}</span>
                              </p>
                            </div>
                          </div>
                          
                          {employeeLocations[emp.id] && !isAssigned && (
                            <span className="text-[8.5px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                              Pindah dr: {locations.find(l => l.id === employeeLocations[emp.id])?.name?.slice(0, 15)}...
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end font-sans">
                <button 
                  onClick={() => setIsAssignEmployeeModalOpen(false)}
                  className="py-2.5 px-6 bg-slate-900 text-white hover:bg-slate-800 font-black rounded-xl text-xs cursor-pointer shadow transition animate-none"
                >
                  Selesai & Simpan Penempatan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. Assign Employee to Jabatan Modal */}
        {isAssignJabatanModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-800 space-y-4 font-sans border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Layers size={16} className="text-sky-500" />
                    <span>Penugasan Jabatan Struktural</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Jabatan: <span className="text-sky-700 font-bold">{jabatans.find(j => j.id === selectedJabatanForAssignment)?.name}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setIsAssignJabatanModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3 font-sans">
                <p className="text-xs text-slate-500 font-medium">
                  Ceklis nama pegawai untuk memasukkan mereka ke struktur komando jabatan di bawah level ini.
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-[#f8fafc]">
                  {employees.map(emp => {
                    const isAssigned = employeeJabatans[emp.id] === selectedJabatanForAssignment;
                    return (
                      <label key={emp.id} className="flex items-center justify-between p-2.5 hover:bg-white rounded-lg transition cursor-pointer font-sans">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = { ...employeeJabatans };
                              if (checked) {
                                updated[emp.id] = selectedJabatanForAssignment!;
                              } else {
                                delete updated[emp.id];
                              }
                              setEmployeeJabatans(updated);
                            }}
                            className="w-4 h-4 text-sky-600 rounded border-slate-350 focus:ring-sky-500"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 leading-tight">{emp.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold">NIP: {emp.nip} • Unit: {emp.department}</p>
                          </div>
                        </div>

                        {employeeJabatans[emp.id] && !isAssigned && (
                          <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black">
                            Lvl: {jabatans.find(j => j.id === employeeJabatans[emp.id])?.name}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end font-sans">
                <button 
                  onClick={() => setIsAssignJabatanModalOpen(false)}
                  className="py-2.5 px-6 bg-[#16a34a] text-white hover:bg-[#15803d] font-black rounded-xl text-xs cursor-pointer shadow transition"
                >
                  Konfirmasi Jabatan Organisasi
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 5. Org Chart Visual Modal */}
        {isOrgModalOpen && (
          <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1e293b] rounded-3xl p-6 shadow-2xl max-w-4xl w-full text-white space-y-4 font-sans border border-slate-705"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-700 font-sans">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <Layers size={16} className="text-sky-400" />
                    <span>Sistem Bagan Organisasi (Hirarki Komando)</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Visualisasi struktur komando level 1 s.d level 5</p>
                </div>
                <button 
                  onClick={() => setIsOrgModalOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px] overflow-x-auto flex flex-col items-center justify-start space-y-6">
                {jabatans.length === 0 ? (
                  <div className="text-slate-500 italic text-center py-24 text-xs font-sans">
                    Belum ada data struktur komando jabatan untuk divisualisasikan. Silakan tambahkan jabatan baru terlebih dahulu.
                  </div>
                ) : (
                  [1, 2, 3, 4, 5].map(lvl => {
                    const rowJabs = jabatans.filter(j => j.level === lvl);
                    if (rowJabs.length === 0) return null;
                    return (
                      <div key={lvl} className="flex flex-col items-center space-y-2 w-full font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            lvl === 1 ? 'bg-red-500' :
                            lvl === 2 ? 'bg-orange-500' :
                            lvl === 3 ? 'bg-sky-400' :
                            lvl === 4 ? 'bg-blue-500' :
                            'bg-slate-400'
                          }`}></span>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 font-sans">LEVEL {lvl}</span>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-4 w-full">
                          {rowJabs.map(jab => {
                            const emps = employees.filter(e => employeeJabatans[e.id] === jab.id);
                            const parentName = jabatans.find(p => p.id === jab.parentId)?.name;
                            
                            return (
                              <div key={jab.id} className="bg-slate-800 border-2 border-slate-700 hover:border-sky-500 hover:bg-slate-750 p-3 rounded-xl shadow text-center w-56 shrink-0 transition-all duration-200">
                                <h4 className="text-xs font-black text-sky-400 tracking-tight block uppercase truncate">{jab.name}</h4>
                                <p className="text-[10px] text-slate-300 font-bold mt-1">
                                  {parentName ? `Atasan: ${parentName.slice(0, 15)}...` : 'Tingkat Tertinggi'}
                                </p>
                                
                                <div className="mt-2.5 pt-1.5 border-t border-slate-700 flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 font-bold">Anggota:</span>
                                  <span className="bg-[#24b071]/20 text-[#24b071] font-black text-[10px] px-2 py-0.5 rounded-md">
                                    {emps.length} orang
                                  </span>
                                </div>
                                
                                {emps.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 text-left font-sans">
                                    <div className="flex -space-x-1.5 justify-center overflow-hidden mb-2">
                                      {emps.slice(0, 4).map(e => (
                                        <img
                                          key={e.id}
                                          src={e.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                                          alt={e.name}
                                          className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-slate-800 object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-black tracking-wider uppercase block mb-1">Daftar Pegawai:</span>
                                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                                      {emps.map(e => {
                                        const empLocId = employeeLocations[e.id];
                                        const locObj = locations.find(l => l.id === empLocId);
                                        const locName = locObj ? locObj.name : 'Belum ditentukan';
                                        return (
                                          <div key={e.id} className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-700/30 text-left font-sans">
                                            <img
                                              src={e.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                                              alt={e.name}
                                              className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-slate-700"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="min-w-0 flex-1 font-sans">
                                              <p className="text-[9.5px] text-slate-100 font-black leading-tight truncate" title={e.name}>
                                                {e.name}
                                              </p>
                                              <p className="text-[8px] text-slate-400 font-bold leading-none mt-0.5">
                                                NIP: {e.nip || '-'}
                                              </p>
                                              <p className="text-[8px] text-sky-400 font-bold leading-none mt-1 truncate flex items-center gap-0.5" title={locName}>
                                                <span className="shrink-0">📍</span> {locName}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {lvl < 5 && jabatans.some(j => j.level > lvl) && (
                          <div className="w-0.5 h-6 bg-slate-700 my-1 font-sans"></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex justify-end font-sans">
                <button 
                  onClick={() => setIsOrgModalOpen(false)}
                  className="py-2.5 px-6 bg-slate-800 text-white hover:bg-slate-700 font-extrabold rounded-xl text-xs cursor-pointer shadow transition"
                  type="button"
                >
                  Tutup Bagan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 6. Selected Jabatan Detail list modal */}
        {selectedJabatanForDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto min-w-[320px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-800 space-y-4 font-sans border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans text-left">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Users size={16} className="text-sky-500" />
                    <span>Daftarisasi Pegawai</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Jabatan: <span className="text-indigo-600">{jabatans.find(j => j.id === selectedJabatanForDetail)?.name}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedJabatanForDetail(null)}
                  className="p-1 hover:bg-slate-100/70 rounded-full transition text-slate-40s hover:text-slate-655"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {employees.filter(emp => employeeJabatans[emp.id] === selectedJabatanForDetail).length === 0 ? (
                  <p className="text-center py-10 text-slate-400 italic text-xs">
                    Belum ada pegawai resmi yang ditempatkan di jabatan struktural ini.
                  </p>
                ) : (
                  employees.filter(emp => employeeJabatans[emp.id] === selectedJabatanForDetail).map(emp => (
                    <div key={emp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={emp.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                          alt={emp.name}
                          className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-800">{emp.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            NIP: {emp.nip} • Sektor: {emp.department} • <span className="text-emerald-700 font-black">{emp.status}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm(`Lepaskan jabatan ${jabatans.find(j => j.id === selectedJabatanForDetail)?.name} dari ${emp.name}?`)) {
                            const updated = { ...employeeJabatans };
                            delete updated[emp.id];
                            setEmployeeJabatans(updated);
                            onShowAlert('Penugasan Dibuat', 'Berhasil melepaskan penugasan jabatan.', 'success');
                          }
                        }}
                        className="text-[9px] font-black text-rose-550 hover:text-rose-700 uppercase"
                      >
                        Lepas
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-1 flex justify-end font-sans">
                <button 
                  onClick={() => setSelectedJabatanForDetail(null)}
                  className="py-2.5 px-6 bg-slate-900 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow transition"
                  type="button"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Edit Employee Data */}
        {editingEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto min-w-[320px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-800 space-y-4 font-sans border border-slate-200 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <User size={16} className="text-blue-600" />
                  <span>Edit Data Pegawai - {editingEmployee.name}</span>
                </h3>
                <button 
                  onClick={() => setEditingEmployee(null)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                {/* Nama & NIP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">Nama Lengkap Pegawai *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama lengkap (contoh: Zulfikar Murfhy)"
                      value={editingEmployee.name}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">NIP (Nomor Induk Pegawai) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: 19930801201509"
                      value={editingEmployee.nip}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, nip: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>
                </div>

                {/* Jabatan & Divisi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">Jabatan Kerja *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: Pelaksana"
                      value={editingEmployee.role}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-555 uppercase font-black pl-0.5">Unit Kerja / Divisi *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: PT. PLN ( Persero ) UP3 Bangka"
                      value={editingEmployee.department}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner font-bold"
                    />
                  </div>
                </div>

                {/* Avatar Picker Choice (File Upload / URL Input) */}
                <div className="space-y-2 animate-fade-in bg-slate-50/55 p-3 rounded-2xl border border-slate-200">
                  <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5 block">Avatar Profil (File lokal / URL) *</label>
                  <div className="flex gap-2">
                    <input 
                      id="edit_emp_avatar_url"
                      type="text" 
                      required
                      placeholder="Masukkan URL foto atau unggah berkas lokal"
                      value={editingEmployee.avatar}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, avatar: e.target.value })}
                      className="flex-1 bg-white border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-700 truncate"
                    />
                    <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 select-none">
                      <Upload size={14} />
                      <span>Pilih Berkas</span>
                      <input 
                        id="edit_emp_avatar_file"
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              onShowAlert('Kapasitas Penuh', 'Batas maksimal ukuran file gambar adalah 2MB.', 'alert');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setEditingEmployee({ ...editingEmployee, avatar: reader.result });
                                onShowAlert('File Terunggah', 'Berhasil memproses & mengganti file foto lokal Anda.', 'success');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal pl-0.5">Mendukung unggah berkas langsung dari komputer Anda atau sematkan alamat url gambar eksternal.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 font-sans">
                <button 
                  onClick={() => setEditingEmployee(null)}
                  className="py-2.5 px-5 bg-slate-100 text-slate-605 hover:bg-slate-200 font-bold rounded-xl text-xs cursor-pointer shadow transition"
                  type="button"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    if (!editingEmployee.name.trim() || !editingEmployee.role.trim()) {
                      onShowAlert('Validasi Gagal', 'Nama Lengkap dan Jabatan tidak boleh kosong!', 'alert');
                      return;
                    }
                    onAddEmployee(editingEmployee);
                    setEditingEmployee(null);
                    onShowAlert('Pegawai Diperbarui', `Informasi ${editingEmployee.name} berhasil diperbarui secara permanen.`, 'success');
                  }}
                  className="py-2.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl text-xs cursor-pointer shadow transition active:scale-95"
                  type="button"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 7. Confirm Delete Location Modal */}
        {locationIdToDelete && (() => {
          const loc = locations.find(l => l.id === locationIdToDelete);
          if (!loc) return null;
          
          // Count sub-levels recursively
          const recursiveSubCount = (parentId: string): number => {
            let count = 0;
            const subs = locations.filter(l => l.parentId === parentId);
            count += subs.length;
            subs.forEach(s => {
              count += recursiveSubCount(s.id);
            });
            return count;
          };
          const totalSubs = recursiveSubCount(locationIdToDelete);
          const affectedEmployeesCount = employees.filter(emp => {
            // Check if employee is at this location or any sub-location
            const empLocId = employeeLocations[emp.id];
            if (!empLocId) return false;
            if (empLocId === locationIdToDelete) return true;
            
            // Check recursive parent
            let currentParentId = locations.find(l => l.id === empLocId)?.parentId;
            while (currentParentId) {
              if (currentParentId === locationIdToDelete) return true;
              currentParentId = locations.find(l => l.id === currentParentId)?.parentId;
            }
            return false;
          }).length;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-800 space-y-4 border border-rose-100 font-sans"
              >
                <div className="flex items-center gap-3 pb-2 border-b border-rose-50 text-rose-600">
                  <AlertTriangle size={20} className="shrink-0" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">Hapus Lokasi Kerja?</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Konfirmasi Tindakan Permanen</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Anda akan menghapus lokasi kerja <span className="font-black text-rose-600">{loc.name}</span>.
                  </p>
                  {totalSubs > 0 && (
                    <p className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl font-bold">
                      ⚠️ Perhatian: Tindakan ini juga akan menghapus secara otomatis <span className="font-black text-red-655">{totalSubs} sub-lokasi</span> yang terdaftar di bawah unit ini!
                    </p>
                  )}
                  {affectedEmployeesCount > 0 && (
                    <p className="bg-rose-50 border border-rose-250 text-rose-800 p-2.5 rounded-xl font-bold">
                      👥 Pegawai Terdampak: Sebanyak <span className="font-extrabold">{affectedEmployeesCount} pegawai</span> yang bertugas di lokasi ini akan secara otomatis dilepas dari penempatan area kerja.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    Tindakan ini permanen dan database lokal akan segera diperbarui.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLocationIdToDelete(null)}
                    className="p-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteLocation(locationIdToDelete);
                      setLocationIdToDelete(null);
                    }}
                    className="p-2 py-2 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition shadow-md active:scale-95 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Ya, Hapus Lokasi</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* 8. Confirm Delete Jabatan Modal */}
        {jabatanIdToDelete && (() => {
          const jab = jabatans.find(j => j.id === jabatanIdToDelete);
          if (!jab) return null;

          const affectedCount = employees.filter(emp => employeeJabatans[emp.id] === jabatanIdToDelete).length;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-800 space-y-4 border border-rose-100 font-sans"
              >
                <div className="flex items-center gap-3 pb-2 border-b border-rose-50 text-rose-600">
                  <AlertTriangle size={20} className="shrink-0" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">Hapus Jabatan?</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Konfirmasi Struktur Komando</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Anda akan menghapus jabatan struktural <span className="font-black text-rose-600">{jab.name}</span>.
                  </p>
                  {affectedCount > 0 && (
                    <p className="bg-rose-50 border border-rose-250 text-rose-800 p-2.5 rounded-xl font-bold">
                      👥 Pegawai Aktif: Jabatan ini saat ini ditugaskan kepada <span className="font-extrabold text-rose-600">{affectedCount} pegawai</span>. Penugasan mereka akan dibatalkan/dilepas secara otomatis.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    Tindakan ini permanen dan database lokal akan segera diperbarui.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setJabatanIdToDelete(null)}
                    className="p-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteJabatan(jabatanIdToDelete);
                      setJabatanIdToDelete(null);
                    }}
                    className="p-2 py-2 px-5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition shadow-md active:scale-95 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Ya, Hapus Jabatan</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* 9. Monthly Performance Detail Modal */}
        {selectedEmpForRekapDetail && (() => {
          const emp = employees.find(e => e.id === selectedEmpForRekapDetail);
          if (!emp) return null;

          const monthsNamesIndo = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];

          const daysInMonth = new Date(rekapYear, rekapMonth, 0).getDate();
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          const belongsToMonthYear = (dateStr: string, targetMonth: number, targetYear: number) => {
            if (!dateStr) return false;
            const parts = dateStr.split('-');
            if (parts.length < 2) return false;
            const yr = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10);
            return yr === targetYear && mo === targetMonth;
          };

          const empReports = reports.filter(r => r.employeeId === emp.id && belongsToMonthYear(r.date, rekapMonth, rekapYear));

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full text-slate-800 flex flex-col h-[85vh] border border-slate-100 font-sans overflow-hidden"
              >
                <div className="bg-slate-950 text-white p-5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 text-left">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-extrabold flex items-center justify-center shrink-0 uppercase border border-slate-700">
                        {emp.name.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight text-white leading-tight">{emp.name}</h3>
                      <p className="text-[10px] text-slate-450 font-mono font-bold mt-0.5">NIP {emp.nip}  |  {emp.role || 'Tenaga Lapangan'} — {emp.department || 'Operasional'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-sky-500/10 border border-sky-500/30 text-sky-305 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider">
                    REKAP DETAIL: {monthsNamesIndo[rekapMonth - 1]} {rekapYear}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 text-left">
                  <div className="bg-white border border-slate-205 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wide text-left">Ringkasan Pelaporan Bulan Ini</h4>
                      <p className="text-xs text-slate-600 leading-normal text-left">
                        Karyawan merekam <span className="font-extrabold text-[#0284c7]">{Array.from(new Set(empReports.map(r => r.date))).length} hari</span> pelaporan aktif dari total {daysInMonth} hari di bulan {monthsNamesIndo[rekapMonth - 1]}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {daysArray.map(day => {
                      const dayStr = `${rekapYear}-${String(rekapMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const reportsOnDay = empReports.filter(r => r.date === dayStr);
                      const reportOnDay = reportsOnDay[0];
                      
                      const hasIndoor = reportsOnDay.some(r => r.photoIndoor && r.photoIndoor.trim() !== '');
                      const hasOutdoor = reportsOnDay.some(r => r.photoOutdoor && r.photoOutdoor.trim() !== '');
                      
                      return (
                        <div key={day} className="bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between gap-3 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="text-slate-800 font-bold text-xs">
                              {day} {monthsNamesIndo[rekapMonth - 1]} {rekapYear}
                            </div>
                            <div className="flex gap-1 animate-pulse">
                              {reportsOnDay.length > 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                  {reportsOnDay.length} LAPORAN
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                  BELUM KIRIM
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5 text-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">● FOTO INDOOR</span>
                              {hasIndoor ? (() => {
                                const repWithIndoor = reportsOnDay.find(r => r.photoIndoor && r.photoIndoor.trim() !== '');
                                return (
                                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-250 bg-slate-50 group">
                                    <img src={repWithIndoor?.photoIndoor} alt="Selfie Indoor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <span className="absolute bottom-1 right-1 bg-black/85 text-emerald-400 text-[6.5px] px-1 py-0.5 rounded border border-white/5 font-bold font-mono">GPS OK</span>
                                  </div>
                                );
                              })() : (
                                <div className="aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[9px] italic p-1.5 min-h-[60px]">
                                  <XCircle size={14} className="text-rose-400 mb-1" />
                                  <span>Kosong</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5 text-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">● FOTO OUTDOOR</span>
                              {hasOutdoor ? (() => {
                                const repWithOutdoor = reportsOnDay.find(r => r.photoOutdoor && r.photoOutdoor.trim() !== '');
                                return (
                                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-250 bg-slate-50 group">
                                    <img src={repWithOutdoor?.photoOutdoor} alt="Sektor Outdoor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <span className="absolute bottom-1 right-1 bg-black/85 text-emerald-400 text-[6.5px] px-1 py-0.5 rounded border border-white/5 font-bold font-mono">GPS OK</span>
                                  </div>
                                );
                              })() : (
                                <div className="aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[9px] italic p-1.5 min-h-[60px]">
                                  <XCircle size={14} className="text-rose-400 mb-1" />
                                  <span>Kosong</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {reportOnDay && (
                            <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-600 mt-1 space-y-0.5 border border-slate-200/50 text-left">
                              <span className="font-extrabold text-slate-800 block text-[9px] truncate">● {reportOnDay.title}</span>
                              <p className="text-[9px] text-slate-500 truncate">{reportOnDay.description}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-150 p-4 bg-white flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedEmpForRekapDetail(null)}
                    className="p-2.5 py-2 px-5 bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl text-xs cursor-pointer transition active:scale-95"
                  >
                    Tutup Rincian Kinerja
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* 10. Live Camera Viewfinder Modal */}
        {cameraModalTarget && (() => {
          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[150]">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full text-white flex flex-col overflow-hidden border border-slate-800 font-sans"
              >
                <div className="bg-slate-950 p-4 flex items-center justify-between border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <Camera size={18} className="text-sky-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Ambil Foto Live {cameraModalTarget === 'indoor' ? 'Indoor (Selfie)' : 'Outdoor Sektor'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleCloseLiveCamera}
                    className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col items-center justify-center space-y-4">
                  {cameraError ? (
                    <div className="bg-red-500/10 border border-red-500/30 text-rose-300 p-4 rounded-2xl text-center text-xs space-y-3">
                      <AlertCircle size={24} className="mx-auto" />
                      <p className="font-semibold leading-relaxed">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => handleOpenLiveCamera(cameraModalTarget)}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition uppercase tracking-wider cursor-pointer active:scale-95"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                      {!activeCameraStream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-3">
                          <RefreshCw size={22} className="animate-spin text-sky-400" />
                          <span className="text-xs font-bold animate-pulse text-slate-300">Menunggu Izin Kamera...</span>
                          <span className="text-[10px] text-slate-500">Silakan izinkan kamera laptop atau handphone jika muncul permintaan</span>
                        </div>
                      )}
                      
                      <video
                        id="camera_preview_video"
                        ref={videoRefCallback}
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
                        style={{ transform: cameraModalTarget === 'indoor' ? 'scaleX(-1)' : 'none' }}
                      />
                      
                      {activeCameraStream && (
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-mono border border-slate-800/50 flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          <span>LIVE FEED OK | {cameraModalTarget === 'indoor' ? 'FRONT' : 'REAR'} CAMERA</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic text-center max-w-xs">
                    Sentuh atau Klik tombol di bawah ini untuk mengabadikan momen laporan secara real-time.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 flex items-center justify-between border-t border-slate-850">
                  <button
                    type="button"
                    onClick={handleCloseLiveCamera}
                    className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold rounded-xl text-xs transition active:scale-95 cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={!activeCameraStream}
                    onClick={handleCapturePhoto}
                    className="py-2.5 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-40 text-white font-black rounded-xl text-xs transition active:scale-95 flex items-center gap-2 shadow-lg tracking-wider uppercase cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Jepret Foto</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
