import React, { useState } from 'react';
import { 
  Users, FileText, CheckSquare, Clock, MapPin, 
  Search, Plus, Filter, CheckCircle2, XCircle, 
  AlertCircle, Briefcase, Mail, Phone, Calendar, 
  ArrowUpRight, Building2, UserCheck, Eye, Trash2,
  Shield, Settings, Menu, ChevronRight, HardHat,
  AlertTriangle, RefreshCw, Layers, Bell, Package,
  ArrowRight, Download, Send, Globe, Check, User, LogOut, Upload
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
  onUpdateAdminProfile
}: AdminDashboardProps) {
  // Sidebar tab management
  // 'ringkasan' = Dashboard, 'pegawai' = Data Pegawai, 'laporan' = Data Laporan, 'kehadiran' = Data Master, 'pengaturan' = Pengaturan Akun
  const [activeSubTab, setActiveSubTab] = useState<'ringkasan' | 'pegawai' | 'laporan' | 'kehadiran' | 'pengaturan'>('ringkasan');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [sheetsTitle, setSheetsTitle] = useState('STEP Haleyora Powerindo - Data Pelaporan Sektor');
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
      const res = await createNewReportsSpreadsheet(googleToken, sheetsTitle || 'STEP Data Pelaporan', reports);
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

  // Modal state for manual report inputs
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [addRepName, setAddRepName] = useState('');
  const [addRepNip, setAddRepNip] = useState('');
  const [addRepRole, setAddRepRole] = useState('');
  const [addRepDept, setAddRepDept] = useState('IT');
  const [addRepType, setAddRepType] = useState<'Operasional' | 'Teknis' | 'Penjualan' | 'Administrasi' | 'Lainnya'>('Operasional');
  const [addRepTitle, setAddRepTitle] = useState('');
  const [addRepDesc, setAddRepDesc] = useState('');
  const [addRepIndoor, setAddRepIndoor] = useState('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300');
  const [addRepOutdoor, setAddRepOutdoor] = useState('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300');

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

    const brandNewNip = newEmpNip || `199${Math.floor(100000 + Math.random() * 899999)}`;
    const newEmp: Employee = {
      id: `EMP00${employees.length + 1}`,
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

    const finalTitle = addRepTitle.trim() || `Laporan Sektor - ${addRepDept}`;
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
        name: "Sektor Bangka Belitung (Admin Generated)",
        coordinates: "-2.1299, 106.1138"
      }
    };

    onAddReport(newReport);
    onShowAlert('Laporan Sukses', `Laporan kerja penugasan untuk ${addRepName} berhasil diunggah dengan sukses.`, 'success');

    // Reset fields
    setAddRepName('');
    setAddRepNip('');
    setAddRepRole('');
    setAddRepTitle('');
    setAddRepDesc('');
    setAddRepIndoor('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300');
    setAddRepOutdoor('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300');
    setIsAddReportModalOpen(false);
  };

  const handleRefresh = () => {
    onShowAlert('Data Disinkronkan', 'Mengambil data real-time terbaru dari satgas lapangan...', 'success');
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
    return matchesSearch && matchesFilter;
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
            <p className="text-[8px] font-sans font-bold text-slate-400 tracking-tighter mt-1">PT. HALEYORA POWERINDO</p>
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
              Pelaporan Sektor
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

                  {/* Card 2: Total Pelaporan Sektor */}
                  <div className="bg-[#10b981] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{reports.length}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#ecfdf5]">Total Pelaporan Sektor</p>
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
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">Data Pelaporan Sektor</h1>
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
                        <p className="text-[10px] text-slate-300 mt-1 font-sans">Hubungkan database pelaporan sektor PT Haleyora Powerindo dengan Google Spreadsheet secara instan.</p>
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
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input 
                      id="laporan_search_box"
                      type="text" 
                      placeholder="Cari Laporan (Nama, Judul, Keterangan)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-slate-700 text-xs outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-slate-400">Filter:</span>
                    <select 
                      id="laporan_dept_select"
                      value={reportDeptFilter} 
                      onChange={(e) => setReportDeptFilter(e.target.value)}
                      className="bg-[#f8fafc] border border-slate-300 rounded-xl p-2 px-3 text-slate-650 text-xs outline-none font-bold"
                    >
                      <option value="Semua">Semua Unit Kerja</option>
                      {uniqueReportDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
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
              </motion.div>
            )}

            {/* TAB 4: DATA MASTER (PRESENSI LOG REGISTER & ATTENDANCE RECAP) */}
            {activeSubTab === 'kehadiran' && (
              <motion.div
                key="tab_prisma_kehadiran"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left font-sans"
              >
                <div className="pb-2 border-b border-slate-350">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900">Data Master Register Presensi</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Rekapitulasi geo-absensi harian satgas lapangan terintegrasi jam digital</p>
                </div>

                {/* Stats recap row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 text-xs shadow-sm">
                  <div className="space-y-0.5 border-r border-slate-100 pr-2">
                    <p className="text-[10px] text-slate-400 uppercase font-black">Presentase Kehadiran</p>
                    <p className="text-xl font-black text-emerald-600">
                      {totalEmployees > 0 ? Math.round((presentTodayCount / totalEmployees) * 100) : 100}% <span className="text-[10px] text-slate-400 font-normal">hari ini</span>
                    </p>
                  </div>
                  <div className="space-y-0.5 border-r border-slate-100 pr-2">
                    <p className="text-[10px] text-slate-400 uppercase font-black">Pegawai Terlambat</p>
                    <p className="text-xl font-black text-amber-600">{lateTodayCount} <span className="text-[10px] text-slate-400 font-normal">personil</span></p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 uppercase font-black">Total Register Log</p>
                    <p className="text-xl font-black text-slate-800">{filteredAttendance.length} <span className="text-[10px] text-slate-400 font-normal">rekap</span></p>
                  </div>
                </div>

                {/* Filter and research */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input 
                      id="kehadiran_search"
                      type="text" 
                      placeholder="Cari register (Nama, Status, Unit)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-slate-705 text-xs outline-none"
                    />
                  </div>

                  <div className="flex gap-2.5 items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400">Unit Sektor:</span>
                    <select
                      id="kehadiran_dept_filter"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="bg-[#f8fafc] border border-slate-300 rounded-xl p-2 px-3 text-slate-650 text-xs outline-none font-bold"
                    >
                      <option value="Semua">Semua Divisi</option>
                      <option value="IT">IT</option>
                      <option value="Operations">Operations / Lapangan</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                </div>

                {/* Attendance master logs card table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                  <div className="min-w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase bg-slate-50 select-none">
                          <th className="p-4 pl-6">Nama Pegawai / Sektor</th>
                          <th className="p-4">Tanggal Presensi</th>
                          <th className="p-4">Waktu Masuk (Clock-In)</th>
                          <th className="p-4">Waktu Keluar (Clock-Out)</th>
                          <th className="p-4">Pos Koordinat Absen</th>
                          <th className="p-4">Status Verifikasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-10 text-slate-400 italic text-center">
                              Tidak ada log presensi harian yang sesuai filter pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendance.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-55/70 transition-colors">
                              <td className="p-4 pl-6">
                                <p className="font-extrabold text-slate-800 text-xs">{att.employeeName}</p>
                                <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block mt-0.5">{att.department === 'Operations' ? 'OPERASIONAL LAPANGAN' : att.department}</span>
                              </td>
                              <td className="p-4 font-mono text-slate-600 font-bold">{att.date}</td>
                              <td className="p-4 text-emerald-600 font-bold font-mono text-[11px]">{att.clockIn || '--:--'}</td>
                              <td className="p-4 text-slate-500 font-bold font-mono text-[11px]">{att.clockOut || 'Aktif'}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-1 text-slate-500">
                                  <MapPin size={11} className="text-sky-500 shrink-0" />
                                  <span className="truncate max-w-[190px]">{att.locationIn || 'GPS Terverifikasi'}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                  att.status === 'Tepat Waktu' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : att.status === 'Terlambat' 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-250' 
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {att.status}
                                </span>
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
                    <select 
                      id="select_manual_rep_dept"
                      value={addRepDept}
                      onChange={(e) => setAddRepDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs text-slate-705"
                    >
                      <option value="IT">IT</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Meta Kerja */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Kategori *</label>
                    <select 
                      id="select_manual_rep_type"
                      value={addRepType}
                      onChange={(e) => setAddRepType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs text-slate-705"
                    >
                      <option value="Operasional">Operasional</option>
                      <option value="Teknis">Teknis</option>
                      <option value="Penjualan">Penjualan</option>
                      <option value="Administrasi">Administrasi</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Judul Laporan Kerja *</label>
                    <input 
                      id="input_manual_rep_title"
                      type="text" 
                      required 
                      placeholder="Pemadam pemeliharaan gardu listrik Belitung"
                      value={addRepTitle}
                      onChange={(e) => setAddRepTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">Detail Detail aktivitas penugasan *</label>
                  <textarea 
                    id="textarea_manual_rep_desc"
                    required
                    rows={3}
                    placeholder="Tuliskan jabaran pekerjaan personil lapangan..."
                    value={addRepDesc}
                    onChange={(e) => setAddRepDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none resize-none text-xs"
                  />
                </div>

                {/* Photo Upload Fields (Choose File) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200">
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
                      <label className="w-full mt-1">
                        <span className="w-full block bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-bold text-center py-1.5 px-3 rounded-lg cursor-pointer transition shadow-sm active:scale-95">
                          Choose File (Indoor)
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
                      <label className="w-full mt-1">
                        <span className="w-full block bg-[#0f172a] hover:bg-[#1e293b] text-white text-[10px] font-bold text-center py-1.5 px-3 rounded-lg cursor-pointer transition shadow-sm active:scale-95">
                          Choose File (Outdoor)
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

                {/* Submissions */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                  <button 
                    id="btn_manual_rep_cancel"
                    type="button" 
                    onClick={() => setIsAddReportModalOpen(false)} 
                    className="p-2.5 px-4 bg-slate-100 hover:bg-slate-250 text-slate-600 font-extrabold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    id="btn_manual_rep_submit"
                    type="submit" 
                    className="p-2.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl cursor-pointer shadow"
                  >
                    Kirim & Masukkan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
