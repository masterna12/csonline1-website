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

export default function App() {
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('step_is_logged_in') === 'true';
  });
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Global React States
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  
  // Real-time floating notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif_1',
      title: 'Selamat Datang',
      message: 'Sistem Terintegrasi Eksekutif Pegawai Admin berhasil dimuat.',
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
    if (userId.trim().toLowerCase() === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      localStorage.setItem('step_is_logged_in', 'true');
      setLoginError('');
      handleShowAlert('Login Berhasil', 'Selamat datang kembali, Administrator.', 'success');
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

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees(prev => [...prev, newEmp]);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    // clean up reports or attendance
    setReports(prev => prev.filter(r => r.employeeId !== id));
    setAttendance(prev => prev.filter(a => a.employeeId !== id));
  };

  const handleAddAttendance = (newAtt: Attendance) => {
    setAttendance(prev => {
      // If today's attendance exists, update it, otherwise insert it
      const matchIndex = prev.findIndex(
        (a) => a.employeeId === newAtt.employeeId && a.date === newAtt.date
      );
      if (matchIndex > -1) {
        const updated = [...prev];
        updated[matchIndex] = {
          ...updated[matchIndex],
          ...newAtt
        };
        return updated;
      }
      return [newAtt, ...prev];
    });
  };

  const handleAddReport = (newRep: Report) => {
    setReports(prev => [newRep, ...prev]);
  };

  const handleUpdateReportStatus = (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => {
    setReports(prev => 
      prev.map(r => r.id === id ? { ...r, status, notes } : r)
    );
  };

  const handleImportReports = (imported: Report[]) => {
    setReports(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const filteredNew = imported.filter(r => !existingIds.has(r.id));
      if (filteredNew.length === 0) {
        handleShowAlert('Sinkronisasi Selesai', 'Semua data dari Google Sheet sudah ada di dalam sistem.', 'success');
        return prev;
      }
      handleShowAlert('Impor Berhasil', `Berhasil menyinkronkan & mengimpor ${filteredNew.length} laporan baru dari Google Sheets.`, 'success');
      return [...filteredNew, ...prev];
    });
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
            <p className="text-[10px] text-slate-400 font-bold tracking-tighter mt-1">PT. HALEYORA POWERINDO</p>
            <p className="text-xs text-indigo-400 font-medium mt-3 bg-indigo-950/40 py-1.5 px-3 rounded-full inline-block border border-indigo-900/30">
              Sistem Terintegrasi Eksekutif Pegawai Admin
            </p>
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
              Sign In ke Konsol
            </button>
          </form>

          {/* Hint credential */}
          <div className="mt-6 pt-4 border-t border-slate-900 text-center">
            <span className="text-[9px] font-mono text-slate-500">
              Hint: ID User & Password = <strong className="text-indigo-400">admin</strong>
            </span>
          </div>
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
            <p className="text-[10px] text-indigo-400 font-sans font-medium mt-1">Sistem Terintegrasi Eksekutif Pegawai Admin & Android v2.4</p>
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
            onShowAlert={handleShowAlert}
            onAddReport={handleAddReport}
            onLogout={handleLogout}
            onImportReports={handleImportReports}
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
          <span>Simulated Database: RAM Storage</span>
        </div>
      </footer>

    </div>
  );
}
