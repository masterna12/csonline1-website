/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  AlertCircle, CheckCircle2, Bell, X, Compass, Info,
  LogOut, Lock, User, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Report, Attendance, SystemNotification } from './types';
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_REPORTS } from './data';
import AdminDashboard from './components/AdminDashboard';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('step_is_logged_in') === 'true';
  });
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Administrator Profile states
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('step_admin_name') || 'Bangka Belitung';
  });
  const [adminAvatar, setAdminAvatar] = useState<string>(() => {
    return localStorage.getItem('step_admin_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
  });
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('step_admin_password') || 'admin';
  });

  const handleUpdateAdminProfile = (newName: string, newAvatar: string, newPass: string) => {
    setAdminName(newName);
    setAdminAvatar(newAvatar);
    setAdminPassword(newPass);
    localStorage.setItem('step_admin_name', newName);
    localStorage.setItem('step_admin_avatar', newAvatar);
    localStorage.setItem('step_admin_password', newPass);
  };

  // Global React States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Real-time synchronization and automatic seeding with Firestore
  React.useEffect(() => {
    // 1. Listen to dashboard (reports) collection
    const unsubReports = onSnapshot(collection(db, 'dashboard'), (snapshot) => {
      const docsList: Report[] = [];
      snapshot.forEach((docVal) => {
        docsList.push(docVal.data() as Report);
      });
      
      // Sort reports by date (latest first)
      docsList.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return b.id.localeCompare(a.id);
      });
      setReports(docsList);

      // Auto-feed initial reports if firestore is empty
      if (snapshot.empty) {
        const defaultReports: Report[] = [
          {
            id: 'REP301',
            employeeId: 'EMP001',
            nip: '19980512',
            employeeName: 'Zulfikar Murfhy',
            role: 'Sektor Leader',
            department: 'IT Sektor Bangka',
            date: '2026-06-09',
            type: 'Teknis',
            title: 'Patroli Gardu Induk Pangkalpinang',
            description: 'Melakukan inspeksi visual dan pemindaian termal pada kubikel Gardu Induk Pangkalpinang. Parameter operasional dalam batas aman.',
            status: 'Disetujui',
            notes: 'Pekerjaan sesuai dengan standard operating procedure.',
            location: {
              name: 'Gardu Induk Pangkalpinang',
              coordinates: '-2.1299, 106.1138'
            },
            photoIndoor: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300',
            photoOutdoor: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300'
          },
          {
            id: 'REP302',
            employeeId: 'EMP002',
            nip: '19971030',
            employeeName: 'Pratama Satria',
            role: 'Petugas Yantek',
            department: 'Yantek Belitung',
            date: '2026-06-08',
            type: 'Operasional',
            title: 'Perbaikan Jaringan Tegangan Rendah JTR',
            description: 'Mengatasi gangguan jaringan akibat ranting pohon tumbang di area Tanjung Pandan. Penormalan aliran listrik berhasil diselesaikan aman.',
            status: 'Pending',
            location: {
              name: 'Tanjung Pandan, Belitung',
              coordinates: '-2.7303, 107.6366'
            },
            photoIndoor: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300',
            photoOutdoor: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300'
          }
        ];
        defaultReports.forEach((rep) => {
          setDoc(doc(db, 'dashboard', rep.id), rep).catch(e => console.error('Error seeding report: ', e));
        });
      }
    }, (error) => {
      console.error("Firestore onSnapshot 'dashboard' error:", error);
    });

    // 2. Listen to employees collection
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const docsList: Employee[] = [];
      snapshot.forEach((docVal) => {
        docsList.push(docVal.data() as Employee);
      });
      // Sort employees
      docsList.sort((a, b) => a.id.localeCompare(b.id));
      setEmployees(docsList);

      if (snapshot.empty) {
        const defaultEmployees: Employee[] = [
          {
            id: 'EMP001',
            nip: '19980512',
            name: 'Zulfikar Murfhy',
            role: 'Sektor Leader',
            department: 'IT Sektor Bangka',
            email: 'zulfikarmurfhy12@gmail.com',
            phone: '081234567890',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
            status: 'Aktif',
            joinDate: '01 Jan 2024'
          },
          {
            id: 'EMP002',
            nip: '19971030',
            name: 'Pratama Satria',
            role: 'Petugas Yantek',
            department: 'Yantek Belitung',
            email: 'pratama.satria@haleyorapower.co.id',
            phone: '081234567891',
            avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200',
            status: 'Aktif',
            joinDate: '15 Mar 2024'
          }
        ];
        defaultEmployees.forEach((emp) => {
          setDoc(doc(db, 'employees', emp.id), emp).catch(e => console.error('Error seeding employee: ', e));
        });
      }
    }, (error) => {
      console.error("Firestore onSnapshot 'employees' error:", error);
    });

    // 3. Listen to attendance collection
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const docsList: Attendance[] = [];
      snapshot.forEach((docVal) => {
        docsList.push(docVal.data() as Attendance);
      });
      // Sort attendance by date/id
      docsList.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      setAttendance(docsList);

      if (snapshot.empty) {
        const defaultAttendance: Attendance[] = [
          {
            id: 'ATT501',
            employeeId: 'EMP001',
            employeeName: 'Zulfikar Murfhy',
            department: 'IT Sektor Bangka',
            date: '2026-06-09',
            clockIn: '07:42',
            clockOut: '16:05',
            status: 'Tepat Waktu',
            locationIn: 'Sektor Bangka Belitung Hub',
            locationOut: 'Sektor Bangka Belitung Hub'
          },
          {
            id: 'ATT502',
            employeeId: 'EMP002',
            employeeName: 'Pratama Satria',
            department: 'Yantek Belitung',
            date: '2026-06-09',
            clockIn: '07:58',
            clockOut: '16:00',
            status: 'Tepat Waktu',
            locationIn: 'Posko Yantek Belitung',
            locationOut: 'Posko Yantek Belitung'
          }
        ];
        defaultAttendance.forEach((att) => {
          setDoc(doc(db, 'attendance', att.id), att).catch(e => console.error('Error seeding attendance: ', e));
        });
      }
    }, (error) => {
      console.error("Firestore onSnapshot 'attendance' error:", error);
    });

    return () => {
      unsubReports();
      unsubEmployees();
      unsubAttendance();
    };
  }, []);
  
  // Real-time floating notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif_1',
      title: 'Selamat Datang',
      message: 'Sistem berhasil dimuat.',
      type: 'system',
      timestamp: 'Baru saja',
      read: false
    }
  ]);

  // Universal custom feedback alert
  const [alertInfo, setAlertInfo] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'alert';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Action methods
  const handleShowAlert = (title: string, message: string, type: 'success' | 'alert') => {
    setAlertInfo({
      visible: true,
      title,
      message,
      type
    });

    // Add automatic system notifications
    const newNotif: SystemNotification = {
      id: `notif_${Math.random()}`,
      title,
      message: message.length > 50 ? message.substring(0, 50) + "..." : message,
      type: type === 'success' ? 'attendance' : 'system',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    
    setNotifications(prev => [newNotif, ...prev]);

    // Fast decay alert
    setTimeout(() => {
      setAlertInfo(prev => ({ ...prev, visible: false }));
    }, 4500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim().toLowerCase() === 'admin' && password === adminPassword) {
      setIsLoggedIn(true);
      localStorage.setItem('step_is_logged_in', 'true');
      setLoginError('');
      handleShowAlert('Login Berhasil', `Selamat datang kembali, ${adminName}.`, 'success');
    } else {
      setLoginError('ID User atau Password salah!');
      handleShowAlert('Login Gagal', 'ID User atau Password tidak sesuai.', 'alert');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('step_is_logged_in');
    setUserId('');
    setPassword('');
    handleShowAlert('Logout Berhasil', 'Sesi administrasi telah diakhiri dengan aman.', 'success');
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    try {
      await setDoc(doc(db, 'employees', newEmp.id), newEmp);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `employees/${newEmp.id}`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
      // also cleanup standard reports and attendance in firestore to avoid orphaned documents
      reports.filter(r => r.employeeId === id).forEach(async (r) => {
        await deleteDoc(doc(db, 'dashboard', r.id));
      });
      attendance.filter(a => a.employeeId === id).forEach(async (a) => {
        await deleteDoc(doc(db, 'attendance', a.id));
      });
      handleShowAlert('Pegawai Dihapus', 'Data pegawai beserta laporan & kehadirannya telah dihapus.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  const handleAddAttendance = async (newAtt: Attendance) => {
    try {
      await setDoc(doc(db, 'attendance', newAtt.id), newAtt);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${newAtt.id}`);
    }
  };

  const handleAddReport = async (newRep: Report) => {
    try {
      await setDoc(doc(db, 'dashboard', newRep.id), newRep);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `dashboard/${newRep.id}`);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dashboard', id));
      handleShowAlert('Laporan Dihapus', 'Data laporan patroli berhasil dihapus dari sistem.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dashboard/${id}`);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => {
    try {
      const reportRef = doc(db, 'dashboard', id);
      const updateData: Partial<Report> = { status };
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      await updateDoc(reportRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dashboard/${id}`);
    }
  };

  const handleImportReports = async (imported: Report[]) => {
    try {
      const existingIds = new Set(reports.map(r => r.id));
      const filteredNew = imported.filter(r => !existingIds.has(r.id));
      if (filteredNew.length === 0) {
        handleShowAlert('Sinkronisasi Selesai', 'Semua data dari Google Sheet sudah ada di dalam sistem.', 'success');
        return;
      }
      for (const r of filteredNew) {
        await setDoc(doc(db, 'dashboard', r.id), r);
      }
      handleShowAlert('Impor Berhasil', `Berhasil menyinkronkan & mengimpor ${filteredNew.length} laporan baru dari Google Sheets.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dashboard-import');
    }
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 z-0"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md bg-[#0e1623]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl z-10 relative overflow-hidden"
        >
          {/* Logo Brand area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-sky-400 p-3.5 rounded-2xl text-slate-950 font-black mb-4 shadow-lg shadow-indigo-500/10 active:scale-95 transition-transform">
              <ShieldAlert size={28} className="text-indigo-950 fill-none" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">CS online</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-tighter mt-1">PT. HALEYORA POWERINDO BANGKA BELITUNG</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block pl-1">
                ID User
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan admin"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-[#121b2d] border border-slate-800 text-sm text-slate-100 rounded-2xl pl-10 pr-4 py-3 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block pl-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Masukkan admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121b2d] border border-slate-800 text-sm text-slate-100 rounded-2xl pl-10 pr-4 py-3 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs py-2 px-3.5 rounded-xl text-center font-bold"
              >
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-black py-3 px-4 rounded-2xl transition shadow-lg shadow-indigo-600/25 active:scale-[0.98] uppercase tracking-wider cursor-pointer"
            >
              LOGIN
            </button>
          </form>
        </motion.div>

        {/* Floating absolute alert toast */}
        <AnimatePresence>
          {alertInfo.visible && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-3xl border shadow-xl flex items-start gap-3 text-xs ${
                  alertInfo.type === 'success' 
                    ? 'bg-slate-900 border-emerald-500/30 text-slate-100' 
                    : 'bg-slate-900 border-rose-500/30 text-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-xl shrink-0 ${alertInfo.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {alertInfo.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
                <div className="flex-1 space-y-0.5">
                  <h4 className="font-bold text-white text-xs">{alertInfo.title}</h4>
                  <p className="text-[10px] text-slate-300 leading-relaxed">{alertInfo.message}</p>
                </div>
                <button
                  id="btn_cls_glob_alert_login"
                  onClick={() => setAlertInfo(prev => ({ ...prev, visible: false }))}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-600 selection:text-white">
      
      {/* Upper Navigation Rail */}
      <header className="bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-indigo-950/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-sky-400 p-2 rounded-xl text-slate-950 font-extrabold flex items-center justify-center tracking-tighter">
            STEP
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-white leading-none">PresensiKu System</h3>
            <p className="text-[10px] text-indigo-400 font-sans font-medium mt-1">Portal & Android v2.4</p>
          </div>
        </div>

        {/* Logout Button */}
        <div className="flex items-center gap-3">
          <button
            id="btn_auth_logout"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-500/20 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 text-center shadow font-sans"
          >
            <LogOut size={13} />
            <span className="font-bold">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        
        {/* Welcome information banner */}
        <div className="mb-6 bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-sky-400">
            <Info size={16} className="text-sky-500" />
            <span className="text-[11px] leading-relaxed text-slate-300 text-left">
              <strong>Konsol Administrasi Web:</strong> Selamat datang di portal utama PT Haleyora Powerindo. Di sini Anda dapat memantau data pegawai, laporan patroli sektor, status persetujuan, serta sinkronisasi Google Sheets dua arah secara real-time.
            </span>
          </div>
        </div>

        {/* Full-width Web Dashboard */}
        <div className="col-span-12">
          <AdminDashboard 
            employees={employees}
            attendance={attendance}
            reports={reports}
            onAddEmployee={handleAddEmployee}
            onUpdateReportStatus={handleUpdateReportStatus}
            onDeleteEmployee={handleDeleteEmployee}
            onDeleteReport={handleDeleteReport}
            onShowAlert={handleShowAlert}
            onAddReport={handleAddReport}
            onLogout={handleLogout}
            onImportReports={handleImportReports}
            adminName={adminName}
            adminAvatar={adminAvatar}
            adminPassword={adminPassword}
            onUpdateAdminProfile={handleUpdateAdminProfile}
          />
        </div>
      </main>

      {/* Live Event Activity Notifications popups */}
      <div id="logs_activity_feed_global" className="fixed bottom-6 left-6 z-[90] max-w-xs space-y-2 hidden sm:block">
        <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5 flex items-center gap-1">
          <Bell size={10} /> Live Event Log
        </h5>
        <AnimatePresence>
          {notifications.slice(0, 3).map((notif) => (
            <motion.div
              layout
              key={notif.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-start gap-2.5 shadow-xl text-xs relative"
            >
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                <CheckCircle2 size={12} />
              </div>
              <div className="pr-4 space-y-0.5">
                <p className="font-extrabold text-white text-[11px] truncate leading-tight">{notif.title}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{notif.message}</p>
                <span className="text-[8px] font-mono text-slate-500 block pt-1">{notif.timestamp}</span>
              </div>
              <button 
                id={`dismiss_notif_${notif.id}`}
                onClick={() => handleDismissNotification(notif.id)}
                className="absolute top-2 right-2 text-slate-650 hover:text-slate-350 p-0.5 rounded-md hover:bg-slate-850"
              >
                <X size={10} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Absolute Dynamic Pop-up Alert Toast */}
      <AnimatePresence>
        {alertInfo.visible && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-3xl border shadow-xl flex items-start gap-3 text-xs ${
                alertInfo.type === 'success' 
                  ? 'bg-slate-900 border-emerald-500/30 text-slate-100' 
                  : 'bg-slate-900 border-rose-500/30 text-slate-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl shrink-0 ${alertInfo.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {alertInfo.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="font-bold text-white text-xs">{alertInfo.title}</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed">{alertInfo.message}</p>
              </div>
              <button
                id="btn_cls_glob_alert"
                onClick={() => setAlertInfo(prev => ({ ...prev, visible: false }))}
                className="text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Footer */}
      <footer className="bg-slate-950 p-6 border-t border-slate-900/60 flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 select-none">
        <p>© 2026 PresensiKu STEP. Semua Hak Cipta Dilindungi.</p>
        <div className="flex items-center gap-4 mt-2 md:mt-0 font-mono">
          <span>Server: active (200 OK)</span>
          <span>•</span>
          <span>Database: Google Firestore (Real-Time)</span>
        </div>
      </footer>

    </div>
  );
}
