/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle2, Bell, X, Compass, Info,
  LogOut, Lock, User, ShieldAlert, Sun, Moon,
  ExternalLink, Layers, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Report, Attendance, SystemNotification, UserAccount } from './types';
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCE, INITIAL_REPORTS } from './data';
import AdminDashboard from './components/AdminDashboard';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { uploadImageToCloudinary } from './lib/cloudinary';
// @ts-ignore
import hpiLogo from './assets/images/hpi_cs_logo_dark_1781488961865.jpg';

export function safeSaveToLocalStorage(key: string, data: any) {
  try {
    // Proactively trim massive Base64 images to prevent localStorage QuotaExceededError entirely
    if ((key === 'db_reports' || key === 'db_attendance') && Array.isArray(data)) {
      const trimmed = data.map((item: any) => {
        if (item) {
          return {
            ...item,
            photoIndoor: item.photoIndoor && item.photoIndoor.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photoIndoor || ""),
            photoOutdoor: item.photoOutdoor && item.photoOutdoor.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photoOutdoor || ""),
            photo: item.photo && item.photo.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photo || ""),
            imagePath: item.imagePath && item.imagePath.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.imagePath || "")
          };
        }
        return item;
      });
      localStorage.setItem(key, JSON.stringify(trimmed));
      return;
    }

    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    if (
      e.name === 'QuotaExceededError' ||
      e.code === 22 ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      String(e).toLowerCase().includes('quota') ||
      String(e).toLowerCase().includes('exceeded')
    ) {
      console.warn("Local storage quota exceeded! Trimming photos from saved local cache to save space for key:", key);
      try {
        if (Array.isArray(data)) {
          const trimmed = data.map((item: any) => {
            if (item && (item.photoIndoor || item.photoOutdoor || item.photo || item.imagePath)) {
              return {
                ...item,
                photoIndoor: item.photoIndoor && item.photoIndoor.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photoIndoor || ""),
                photoOutdoor: item.photoOutdoor && item.photoOutdoor.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photoOutdoor || ""),
                photo: item.photo && item.photo.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.photo || ""),
                imagePath: item.imagePath && item.imagePath.length > 500 ? "data:image/jpeg;base64,placeholder_trimmed" : (item.imagePath || "")
              };
            }
            return item;
          });
          localStorage.setItem(key, JSON.stringify(trimmed));
        } else if (data && typeof data === 'object') {
          const trimmed = { ...data };
          for (const k of Object.keys(trimmed)) {
            if (typeof trimmed[k] === 'string' && trimmed[k].length > 500 && trimmed[k].startsWith('data:image')) {
              trimmed[k] = "data:image/jpeg;base64,placeholder_trimmed";
            }
          }
          localStorage.setItem(key, JSON.stringify(trimmed));
        } else {
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch (innerError) {
        console.error("Failed to save even with trimmed records:", innerError);
      }
    } else {
      console.error("Local storage error:", e);
    }
  }
}

export default function App() {
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('step_is_logged_in') === 'true' || localStorage.getItem('step_is_logged_in') === 'true';
  });
  const [loggedInUserId, setLoggedInUserId] = useState<string>(() => {
    return sessionStorage.getItem('step_logged_in_user_id') || localStorage.getItem('step_logged_in_user_id') || '';
  });
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_dark') !== 'false';
  });

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

  // Initial default datasets for automatic seeding / recovery
  const defaultEmployeesList: Employee[] = INITIAL_EMPLOYEES;

  const defaultReportsList: Report[] = INITIAL_REPORTS;

  const defaultAttendanceList: Attendance[] = INITIAL_ATTENDANCE;

  const defaultUserAccounts: UserAccount[] = [
    { id: 'ACC_1', userId: '9826003HPI', password: '27111998', createdAt: '2023-01-15' },
    { id: 'ACC_2', userId: '9826004HPI', password: '27111998', createdAt: '2023-03-20' },
    { id: 'ACC_3', userId: '9826005HPI', password: '27111998', createdAt: '2023-06-10' }
  ];

  // Global React States
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('db_employees');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultEmployeesList;
  });

  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('db_attendance');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultAttendanceList;
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('db_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultReportsList;
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('db_user_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return defaultUserAccounts;
  });

  const [dbError, setDbError] = useState<string | null>(null);

  const [draftReports, setDraftReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('db_draft_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [sheetReports, setSheetReports] = useState<Report[]>([]);

  // Memoize and merge Firestore/local reports with Google Sheets reports to avoid duplicates
  const mergedReports = React.useMemo(() => {
    const mergedMap = new Map<string, Report>();
    // 1. Add all local/Firestore reports
    reports.forEach(r => {
      if (r && r.id) mergedMap.set(r.id, r);
    });
    // 2. Add/overwrite with Google Sheets reports
    sheetReports.forEach(r => {
      if (r && r.id) mergedMap.set(r.id, r);
    });

    const list = Array.from(mergedMap.values());
    // Sort reports by date (latest first), then by id to ensure deterministic sorting
    list.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return b.id.localeCompare(a.id);
    });
    return list;
  }, [reports, sheetReports]);

  // Synchronize Google Sheets reports on load and on custom connection events
  useEffect(() => {
    const loadGoogleSheetsReports = async () => {
      const spreadsheetId = localStorage.getItem("step_sheets_spreadsheet_id");
      const googleToken = localStorage.getItem("google_sheets_token");

      if (spreadsheetId && googleToken) {
        try {
          console.log("Loading backup/merged reports from Google Sheets...", spreadsheetId);
          const { parseSpreadsheetToReports } = await import('./lib/sheetsService');
          const sheetData = await parseSpreadsheetToReports(googleToken, spreadsheetId);
          if (sheetData && sheetData.length > 0) {
            setSheetReports(sheetData);
            console.log("Successfully loaded", sheetData.length, "reports from Google Sheets.");
          }
        } catch (error) {
          console.warn("Failed to load Google Sheets background reports:", error);
        }
      }
    };

    // Load reports initially
    loadGoogleSheetsReports();

    // Custom event listeners to listen to connection / disconnection of Sheets
    const handleSheetsConnected = () => {
      console.log("Event google-sheets-connected received. Syncing Sheets reports...");
      loadGoogleSheetsReports();
    };

    const handleSheetsDisconnected = () => {
      console.log("Event google-sheets-disconnected received. Clearing Sheets reports.");
      setSheetReports([]);
    };

    window.addEventListener('google-sheets-connected', handleSheetsConnected);
    window.addEventListener('google-sheets-disconnected', handleSheetsDisconnected);
    return () => {
      window.removeEventListener('google-sheets-connected', handleSheetsConnected);
      window.removeEventListener('google-sheets-disconnected', handleSheetsDisconnected);
    };
  }, []);

  // Real-time synchronization and automatic seeding with Firestore
  React.useEffect(() => {
    // Cache configuration: 10 minutes cache validity for secondary metadata collections
    const CACHE_COOLDOWN = 10 * 60 * 1000;
    const isCacheValid = (key: string): boolean => {
      const lastSync = localStorage.getItem(key);
      if (!lastSync) return false;
      const now = Date.now();
      return now - parseInt(lastSync, 10) < CACHE_COOLDOWN;
    };

    // 1. Listen to dashboard (reports) collection (Keep completely real-time as requested!)
    const unsubReports = onSnapshot(collection(db, 'dashboard'), (snapshot) => {
      const docsList: Report[] = [];
      snapshot.forEach((docVal) => {
        const d = docVal.data() as any;
        if (d) {
          const reportId = d.id || docVal.id;
          const mappedReport: Report = {
            id: reportId,
            employeeId: d.employeeId || d.employee_id || "",
            nip: d.nip || "",
            employeeName: d.employeeName || d.employee_name || "Pegawai Lapangan",
            role: d.role || d.jabatan || "Satgas",
            department: d.department || d.unit_kerja || d.unit || "Sektor Lapangan",
            date: d.date || d.tanggal || new Date().toISOString().replace('T', ' ').substring(0, 16),
            type: d.type || d.kategori || "Operasional",
            title: d.title || d.judul || "Aktivitas Lapangan",
            description: d.description || d.deskripsi || "",
            status: d.status || "Disetujui",
            notes: d.notes || d.catat_admin || "",
            photoIndoor: d.photoIndoor || d.photo_indoor || d.photo || d.imagePath || "",
            photoOutdoor: d.photoOutdoor || d.photo_outdoor || d.photo || d.imagePath || "",
            location: d.location || (d.latitude && d.longitude ? {
              name: d.locationName || d.lokasi_nama || "Sektor Bangka Belitung",
              coordinates: `${d.latitude}, ${d.longitude}`
            } : {
              name: d.locationName || d.lokasi_nama || "Sektor Bangka Belitung",
              coordinates: "-2.1299, 106.1138"
            })
          };
          docsList.push(mappedReport);
        }
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

      if (snapshot.empty) {
        setReports(defaultReportsList);
        safeSaveToLocalStorage('db_reports', defaultReportsList);
        defaultReportsList.forEach((rep) => {
          setDoc(doc(db, 'dashboard', rep.id), rep).catch(e => console.error('Error seeding report: ', e));
        });
      } else {
        setReports(docsList);
        safeSaveToLocalStorage('db_reports', docsList);
      }
    }, (error) => {
      const isQuota = error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('limit');
      if (isQuota) {
        console.warn("Firestore onSnapshot 'dashboard' quota restriction active, falling back to local database. message:", error.message);
      } else {
        console.error("Firestore onSnapshot 'dashboard' error:", error);
      }
      setDbError(error.message);
      const saved = localStorage.getItem('db_reports');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed)) {
            setReports(parsed);
          }
        } catch (e) {}
      } else {
        setReports(defaultReportsList);
      }
    });

    // 2. Listen to employees collection (Cached to optimize read quota)
    let unsubEmployees = () => {};
    if (!isCacheValid('last_sync_employees')) {
      unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
        const docsList: Employee[] = [];
        snapshot.forEach((docVal) => {
          const d = docVal.data() as Employee;
          if (d && d.id) {
            docsList.push(d);
          }
        });
        // Sort employees
        docsList.sort((a, b) => a.id.localeCompare(b.id));

        if (snapshot.empty) {
          setEmployees(defaultEmployeesList);
          localStorage.setItem('db_employees', JSON.stringify(defaultEmployeesList));
          defaultEmployeesList.forEach((emp) => {
            setDoc(doc(db, 'employees', emp.id), emp).catch(e => console.error('Error seeding employee: ', e));
          });
        } else {
          setEmployees(docsList);
          localStorage.setItem('db_employees', JSON.stringify(docsList));
          localStorage.setItem('last_sync_employees', Date.now().toString());
        }
      }, (error) => {
        const isQuota = error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('limit');
        if (isQuota) {
          console.warn("Firestore onSnapshot 'employees' quota restriction active, falling back to local database. message:", error.message);
        } else {
          console.error("Firestore onSnapshot 'employees' error:", error);
        }
        setDbError(error.message);
        const saved = localStorage.getItem('db_employees');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed)) {
              setEmployees(parsed);
            }
          } catch (e) {}
        } else {
          setEmployees(defaultEmployeesList);
        }
      });
    } else {
      const saved = localStorage.getItem('db_employees');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed)) {
            setEmployees(parsed);
          }
        } catch (e) {}
      }
    }

    // 3. Listen to attendance collection (Cached to optimize read quota)
    let unsubAttendance = () => {};
    if (!isCacheValid('last_sync_attendance')) {
      unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const docsList: Attendance[] = [];
        snapshot.forEach((docVal) => {
          const d = docVal.data() as Attendance;
          if (d && d.id) {
            docsList.push(d);
          }
        });
        // Sort attendance by date/id
        docsList.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

        if (snapshot.empty) {
          setAttendance(defaultAttendanceList);
          localStorage.setItem('db_attendance', JSON.stringify(defaultAttendanceList));
          defaultAttendanceList.forEach((att) => {
            setDoc(doc(db, 'attendance', att.id), att).catch(e => console.error('Error seeding attendance: ', e));
          });
        } else {
          setAttendance(docsList);
          localStorage.setItem('db_attendance', JSON.stringify(docsList));
          localStorage.setItem('last_sync_attendance', Date.now().toString());
        }
      }, (error) => {
        const isQuota = error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('limit');
        if (isQuota) {
          console.warn("Firestore onSnapshot 'attendance' quota restriction active, falling back to local database. message:", error.message);
        } else {
          console.error("Firestore onSnapshot 'attendance' error:", error);
        }
        setDbError(error.message);
        const saved = localStorage.getItem('db_attendance');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed)) {
              setAttendance(parsed);
            }
          } catch (e) {}
        } else {
          setAttendance(defaultAttendanceList);
        }
      });
    } else {
      const saved = localStorage.getItem('db_attendance');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed)) {
            setAttendance(parsed);
          }
        } catch (e) {}
      }
    }

    // 4. Listen to user accounts collection (Cached to optimize read quota)
    let unsubUserAccounts = () => {};
    if (!isCacheValid('last_sync_user_accounts')) {
      unsubUserAccounts = onSnapshot(collection(db, 'hpi_user_accounts'), (snapshot) => {
        const docsList: UserAccount[] = [];
        snapshot.forEach((docVal) => {
          const d = docVal.data() as UserAccount;
          if (d && d.id) {
            docsList.push(d);
          }
        });
        docsList.sort((a, b) => a.userId.localeCompare(b.userId));
        setUserAccounts(docsList);
        localStorage.setItem('db_user_accounts', JSON.stringify(docsList));
        localStorage.setItem('last_sync_user_accounts', Date.now().toString());
      }, (error) => {
        const isQuota = error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('limit');
        if (isQuota) {
          console.warn("Firestore onSnapshot 'hpi_user_accounts' quota restriction active, falling back to local database. message:", error.message);
        } else {
          console.error("Firestore onSnapshot 'hpi_user_accounts' error:", error);
        }
        setDbError(error.message);
        const saved = localStorage.getItem('db_user_accounts');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed)) {
              setUserAccounts(parsed);
            }
          } catch (e) {}
        }
      });
    } else {
      const saved = localStorage.getItem('db_user_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed)) {
            setUserAccounts(parsed);
          }
        } catch (e) {}
      }
    }

    return () => {
      unsubReports();
      unsubEmployees();
      unsubAttendance();
      unsubUserAccounts();
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

  // Handle auto-dismissal of initial notification on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== 'notif_1'));
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

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

    // Auto-dismiss the system notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 4500);

    // Fast decay alert
    setTimeout(() => {
      setAlertInfo(prev => ({ ...prev, visible: false }));
    }, 4500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUserId = userId.trim();
    if (cleanUserId.toLowerCase() === 'admin' && password === adminPassword) {
      setIsLoggedIn(true);
      setLoggedInUserId('admin');
      sessionStorage.setItem('step_is_logged_in', 'true');
      sessionStorage.setItem('step_logged_in_user_id', 'admin');
      localStorage.setItem('step_is_logged_in', 'true');
      localStorage.setItem('step_logged_in_user_id', 'admin');
      localStorage.setItem('hide_migration_feature', 'true');
      setLoginError('');
      handleShowAlert('Login Berhasil', `Selamat datang kembali, ${adminName}.`, 'success');
    } else if (cleanUserId === '9826003HPI') {
      const savedUserPass = localStorage.getItem('step_user_password_' + cleanUserId) || '27111998';
      if (password === savedUserPass) {
        setIsLoggedIn(true);
        setLoggedInUserId('9826003HPI');
        sessionStorage.setItem('step_is_logged_in', 'true');
        sessionStorage.setItem('step_logged_in_user_id', '9826003HPI');
        localStorage.setItem('step_is_logged_in', 'true');
        localStorage.setItem('step_logged_in_user_id', '9826003HPI');
        localStorage.setItem('hide_migration_feature', 'true');
        setLoginError('');
        handleShowAlert('Login Berhasil', 'Selamat datang. Anda masuk sebagai petugas lapangan.', 'success');
      } else {
        setLoginError('ID User atau Password salah!');
        handleShowAlert('Login Gagal', 'ID User atau Password tidak sesuai.', 'alert');
      }
    } else {
      // Check dynamic user accounts
      const matchedAccount = userAccounts.find(acc => acc.userId === cleanUserId);
      if (matchedAccount) {
        if (matchedAccount.password === password) {
          setIsLoggedIn(true);
          setLoggedInUserId(matchedAccount.userId);
          sessionStorage.setItem('step_is_logged_in', 'true');
          sessionStorage.setItem('step_logged_in_user_id', matchedAccount.userId);
          localStorage.setItem('step_is_logged_in', 'true');
          localStorage.setItem('step_logged_in_user_id', matchedAccount.userId);
          localStorage.setItem('hide_migration_feature', 'true');
          setLoginError('');
          handleShowAlert('Login Berhasil', `Selamat datang kembali, ${matchedAccount.userId}.`, 'success');
        } else {
          setLoginError('ID User atau Password salah!');
          handleShowAlert('Login Gagal', 'ID User atau Password tidak sesuai.', 'alert');
        }
      } else {
        setLoginError('ID User atau Password salah!');
        handleShowAlert('Login Gagal', 'ID User atau Password tidak sesuai.', 'alert');
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUserId('');
    sessionStorage.removeItem('step_is_logged_in');
    sessionStorage.removeItem('step_logged_in_user_id');
    localStorage.removeItem('step_is_logged_in');
    localStorage.removeItem('step_logged_in_user_id');
    setUserId('');
    setPassword('');
    handleShowAlert('Logout Berhasil', 'Sesi administrasi telah diakhiri dengan aman.', 'success');
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    // 1. Save locally first (instant UI update)
    setEmployees(prev => {
      const updated = [...prev.filter(e => e.id !== newEmp.id), newEmp];
      localStorage.setItem('db_employees', JSON.stringify(updated));
      return updated;
    });

    // 2. Sync with Firestore in background
    try {
      await setDoc(doc(db, 'employees', newEmp.id), newEmp);
    } catch (error: any) {
      console.warn("Firestore save employee failed, stored locally instead:", error);
      setDbError(`Penyimpanan Lokal Aktif: Aturan Keamanan Firestore membatasi sinkronisasi cloud (${error.message || error})`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    // 1. Delete locally first (instant UI update)
    setEmployees(prev => {
      const updated = prev.filter(e => e.id !== id);
      safeSaveToLocalStorage('db_employees', updated);
      return updated;
    });
    setReports(prev => {
      const updated = prev.filter(r => r.employeeId !== id);
      safeSaveToLocalStorage('db_reports', updated);
      return updated;
    });
    setAttendance(prev => {
      const updated = prev.filter(a => a.employeeId !== id);
      safeSaveToLocalStorage('db_attendance', updated);
      return updated;
    });

    // 2. Sync with Firestore in background
    try {
      await deleteDoc(doc(db, 'employees', id));
      reports.filter(r => r.employeeId === id).forEach(async (r) => {
        await deleteDoc(doc(db, 'dashboard', r.id));
      });
      attendance.filter(a => a.employeeId === id).forEach(async (a) => {
        await deleteDoc(doc(db, 'attendance', a.id));
      });
      handleShowAlert('Pegawai Dihapus', 'Data pegawai beserta laporan & kehadirannya telah dihapus.', 'success');
    } catch (error: any) {
      console.warn("Firestore delete employee failed, stored locally instead:", error);
    }
  };

  const handleAddAttendance = async (newAtt: Attendance) => {
    // 1. Save locally first (instant UI update)
    setAttendance(prev => {
      const updated = [...prev.filter(a => a.id !== newAtt.id), newAtt];
      safeSaveToLocalStorage('db_attendance', updated);
      return updated;
    });

    // 2. Sync with Firestore in background
    try {
      await setDoc(doc(db, 'attendance', newAtt.id), newAtt);
    } catch (error: any) {
      console.warn("Firestore save attendance failed, stored locally instead:", error);
    }
  };

  const handleAddReport = async (newRep: Report) => {
    // 1. Save locally first (instant UI update)
    setReports(prev => {
      const updated = [...prev.filter(r => r.id !== newRep.id), newRep];
      updated.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return b.id.localeCompare(a.id);
      });
      safeSaveToLocalStorage('db_reports', updated);
      return updated;
    });

    // 2. Sync with Firestore in background
    let firestoreFailed = false;
    try {
      await setDoc(doc(db, 'dashboard', newRep.id), newRep);
    } catch (error: any) {
      firestoreFailed = true;
      console.warn("Firestore save report failed, stored locally instead:", error);
      const isQuota = error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exceeded') || error.message?.toLowerCase().includes('limit');
      if (isQuota && !dbError) {
        setDbError(error.message);
      }
    }

    // 3. Backup to Google Spreadsheet if Firestore fails/limited and Sheets is connected
    const spreadsheetId = localStorage.getItem("step_sheets_spreadsheet_id");
    const googleToken = localStorage.getItem("google_sheets_token");
    const isQuotaError = dbError && (
      dbError.toLowerCase().includes('quota') || 
      dbError.toLowerCase().includes('exceeded') || 
      dbError.toLowerCase().includes('limit')
    );

    if ((firestoreFailed || isQuotaError) && spreadsheetId && googleToken) {
      try {
        console.log("Database limit/offline mode active. Saving report to Google Spreadsheet as backup database...");
        const { appendReportToSpreadsheet } = await import('./lib/sheetsService');
        await appendReportToSpreadsheet(googleToken, spreadsheetId, newRep);
        console.log("Successfully saved report to Google Spreadsheet backup!");
        
        // Update sheetReports state immediately so it's merged and visible in the UI
        setSheetReports(prev => {
          const updated = [...prev.filter(r => r.id !== newRep.id), newRep];
          return updated;
        });

        handleShowAlert(
          "Backup Google Sheets Aktif",
          "Firestore quota limit terdeteksi! Laporan berhasil disimpan ke Google Spreadsheet cadangan secara otomatis.",
          "success"
        );
      } catch (sheetsError: any) {
        console.error("Gagal menyimpan laporan ke backup Google Sheets:", sheetsError);
      }
    }
  };

  const handleAddDraftReport = (draft: Report) => {
    setDraftReports(prev => {
      const updated = [...prev.filter(d => d.id !== draft.id), draft];
      safeSaveToLocalStorage('db_draft_reports', updated);
      return updated;
    });
    handleShowAlert('Draft Tersimpan', 'Laporan berhasil disimpan sebagai Draft lokal.', 'success');
  };

  const handleDeleteDraftReport = (id: string) => {
    setDraftReports(prev => {
      const updated = prev.filter(d => d.id !== id);
      safeSaveToLocalStorage('db_draft_reports', updated);
      return updated;
    });
    handleShowAlert('Draft Dihapus', 'Laporan draft berhasil dihapus.', 'success');
  };

  const handleSyncDrafts = async () => {
    if (draftReports.length === 0) {
      handleShowAlert('Tidak ada Draft', 'Tidak ada laporan draft yang perlu disinkronkan.', 'alert');
      return;
    }
    
    let successCount = 0;
    const remainingDrafts: Report[] = [];
    
    for (const draft of draftReports) {
      try {
        let updatedDraft = { ...draft };
        
        // Upload indoor photo to Cloudinary if it's a base64 string
        if (draft.photoIndoor && draft.photoIndoor.startsWith('data:image/')) {
          try {
            const meta = await uploadImageToCloudinary(draft.photoIndoor, `sync_indoor_${draft.id}.jpg`);
            updatedDraft.photoIndoor = meta.secure_url;
            updatedDraft.photoIndoorMetadata = meta;
          } catch (clErr) {
            console.error('Gagal upload indoor photo draft ke Cloudinary:', clErr);
          }
        }
        
        // Upload outdoor photo to Cloudinary if it's a base64 string
        if (draft.photoOutdoor && draft.photoOutdoor.startsWith('data:image/')) {
          try {
            const meta = await uploadImageToCloudinary(draft.photoOutdoor, `sync_outdoor_${draft.id}.jpg`);
            updatedDraft.photoOutdoor = meta.secure_url;
            updatedDraft.photoOutdoorMetadata = meta;
          } catch (clErr) {
            console.error('Gagal upload outdoor photo draft ke Cloudinary:', clErr);
          }
        }

        await setDoc(doc(db, 'dashboard', updatedDraft.id), updatedDraft);
        
        setReports(prev => {
          const updated = [...prev.filter(r => r.id !== updatedDraft.id), updatedDraft];
          updated.sort((a, b) => {
            const dateA = a.date || "";
            const dateB = b.date || "";
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return b.id.localeCompare(a.id);
          });
          safeSaveToLocalStorage('db_reports', updated);
          return updated;
        });
        
        successCount++;
      } catch (error) {
        console.warn(`Gagal sinkron draft ${draft.id}:`, error);
        remainingDrafts.push(draft);
      }
    }
    
    setDraftReports(remainingDrafts);
    safeSaveToLocalStorage('db_draft_reports', remainingDrafts);
    
    if (successCount > 0) {
      handleShowAlert(
        'Sinkronisasi Sukses', 
        `${successCount} laporan draft berhasil diunggah ke cloud database!`, 
        'success'
      );
    } else {
      handleShowAlert(
        'Sinkronisasi Gagal', 
        'Gagal mengunggah draft. Silakan periksa koneksi internet Anda atau atur hak akses Firestore.', 
        'alert'
      );
    }
  };

  const handleAddUserAccount = async (newAcc: UserAccount) => {
    setUserAccounts(prev => {
      const updated = [...prev.filter(a => a.id !== newAcc.id), newAcc];
      localStorage.setItem('db_user_accounts', JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'hpi_user_accounts', newAcc.id), newAcc);
    } catch (e: any) {
      console.warn("Firestore save user account failed, stored locally:", e);
    }
  };

  const handleDeleteUserAccount = async (id: string) => {
    setUserAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      localStorage.setItem('db_user_accounts', JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'hpi_user_accounts', id));
    } catch (e: any) {
      console.warn("Firestore delete user account failed, stored locally:", e);
    }
  };

  const handleDeleteReport = async (id: string) => {
    // 1. Delete locally first (instant UI update)
    setReports(prev => {
      const updated = prev.filter(r => r.id !== id);
      safeSaveToLocalStorage('db_reports', updated);
      return updated;
    });

    // 2. Sync with Firestore in background
    try {
      await deleteDoc(doc(db, 'dashboard', id));
      handleShowAlert('Laporan Dihapus', 'Data laporan patroli berhasil dihapus dari sistem.', 'success');
    } catch (error: any) {
      console.warn("Firestore delete report failed, stored locally instead:", error);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: 'Disetujui' | 'Ditolak', notes?: string) => {
    // 1. Save locally first (instant UI update)
    setReports(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          return { ...r, status, notes: notes !== undefined ? notes : r.notes };
        }
        return r;
      });
      safeSaveToLocalStorage('db_reports', updated);
      return updated;
    });

    // 2. Sync with Firestore in background
    try {
      const reportRef = doc(db, 'dashboard', id);
      const updateData: Partial<Report> = { status };
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      await updateDoc(reportRef, updateData);
    } catch (error: any) {
      console.warn("Firestore update report failed, stored locally instead:", error);
    }
  };

  const handleUpdateReport = async (updatedReport: Report) => {
    let targetReport = { ...updatedReport };
    
    // 1. Recover primary photo data from Firestore if the client holds trimmed placeholders
    try {
      const reportRef = doc(db, 'dashboard', updatedReport.id);
      const snap = await getDoc(reportRef);
      if (snap.exists()) {
        const currentData = snap.data() as any;
        if (currentData) {
          if (targetReport.photoIndoor && targetReport.photoIndoor.includes("placeholder_trimmed")) {
            targetReport.photoIndoor = currentData.photoIndoor || currentData.photo || currentData.imagePath || "";
          }
          if (targetReport.photoOutdoor && targetReport.photoOutdoor.includes("placeholder_trimmed")) {
            targetReport.photoOutdoor = currentData.photoOutdoor || currentData.photo || currentData.imagePath || "";
          }
          if ((targetReport as any).photo && (targetReport as any).photo.includes("placeholder_trimmed")) {
            (targetReport as any).photo = currentData.photo || "";
          }
          if (targetReport.imagePath && targetReport.imagePath.includes("placeholder_trimmed")) {
            targetReport.imagePath = currentData.imagePath || "";
          }
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve existing photo during report update:", e);
    }

    // 2. Save locally first (instant UI update)
    setReports(prev => {
      const updated = prev.map(r => r.id === targetReport.id ? targetReport : r);
      safeSaveToLocalStorage('db_reports', updated);
      return updated;
    });

    // 3. Sync with Firestore in background
    try {
      const reportRef = doc(db, 'dashboard', targetReport.id);
      await updateDoc(reportRef, targetReport as any);
    } catch (error: any) {
      console.warn("Firestore update report failed, stored locally instead:", error);
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

      // Save locally first
      setReports(prev => {
        const updated = [...prev, ...filteredNew];
        updated.sort((a, b) => {
          const dateA = a.date || "";
          const dateB = b.date || "";
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          return b.id.localeCompare(a.id);
        });
        safeSaveToLocalStorage('db_reports', updated);
        return updated;
      });

      // Firebase sync in background
      for (const r of filteredNew) {
        await setDoc(doc(db, 'dashboard', r.id), r);
      }
      handleShowAlert('Impor Berhasil', `Berhasil menyinkronkan & mengimpor ${filteredNew.length} laporan baru dari Google Sheets.`, 'success');
    } catch (error: any) {
      console.warn("Firestore import failed, stored locally instead:", error);
    }
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-center items-center p-4 selection:bg-cyan-600 selection:text-white relative overflow-hidden">
        {/* Modern Vibrant Gradient Base (Electrical Waves concept) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1221] via-[#09223c] to-[#041a1c] z-0"></div>
        
        {/* High-intensity Ambient Floating Light Blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px] mix-blend-screen animate-pulse z-0" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[140px] mix-blend-screen animate-pulse z-0" style={{ animationDuration: '12s' }}></div>
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[90px] mix-blend-screen z-0"></div>

        {/* Technical Vector Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-20 z-0"></div>

        {/* Floating White Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {[
            { left: "8%", size: "4px", delay: "0s", duration: "14s" },
            { left: "18%", size: "3px", delay: "3s", duration: "11s" },
            { left: "28%", size: "5px", delay: "1.5s", duration: "16s" },
            { left: "38%", size: "2px", delay: "5s", duration: "9s" },
            { left: "48%", size: "4px", delay: "0.5s", duration: "13s" },
            { left: "58%", size: "3px", delay: "7s", duration: "12s" },
            { left: "68%", size: "5px", delay: "2.5s", duration: "15s" },
            { left: "78%", size: "2.5px", delay: "4s", duration: "10s" },
            { left: "88%", size: "4px", delay: "1s", duration: "14s" },
            { left: "95%", size: "3px", delay: "8s", duration: "12s" },
            { left: "13%", size: "4.5px", delay: "6s", duration: "15s" },
            { left: "23%", size: "2px", delay: "10s", duration: "8s" },
            { left: "33%", size: "3.5px", delay: "4.5s", duration: "13s" },
            { left: "43%", size: "5px", delay: "9s", duration: "17s" },
            { left: "53%", size: "2.5px", delay: "2s", duration: "11s" },
            { left: "63%", size: "4px", delay: "7.5s", duration: "14s" },
            { left: "73%", size: "3px", delay: "11s", duration: "10s" },
            { left: "83%", size: "4.5px", delay: "5.5s", duration: "16s" },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-float-particle shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              style={{
                left: p.left,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                bottom: "-5%"
              }}
            />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md bg-slate-900/75 backdrop-blur-2xl border border-slate-800/80 rounded-[2.5rem] p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] z-10 relative overflow-hidden"
        >
          {/* Top Multi-Color Neon Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 via-indigo-500 to-amber-400"></div>

          {/* Logo & Brand Info Section */}
          <div className="text-center mb-8 relative">
            <div className="relative inline-flex items-center justify-center p-1.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 mb-4 shadow-lg hover:scale-[1.02] active:scale-98 transition-all max-w-[210px] mx-auto group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-amber-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur duration-500"></div>
              <img 
                src={hpiLogo} 
                alt="HPI CS Online Logo" 
                className="w-full h-auto object-contain rounded-xl relative z-10" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h1 className="text-2xl font-black tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent uppercase mt-1">
              CS ONLINE
            </h1>
            <p className="text-[9.5px] text-slate-300 font-bold tracking-[0.1em] uppercase mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              PT Haleyora Powerindo Bangka Belitung
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* ID User Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.15em] block pl-1">
                ID User
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-500 group-focus-within:text-cyan-400 transition-colors">
                  <User size={16} className="stroke-[2.5]" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukan NIP / ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 text-sm text-slate-100 rounded-2xl pl-11 pr-4 py-3.5 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-300"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.15em] block">
                  Password
                </label>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-500 group-focus-within:text-cyan-400 transition-colors">
                  <Lock size={16} className="stroke-[2.5]" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukan Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 text-sm text-slate-100 rounded-2xl pl-11 pr-12 py-3.5 placeholder-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                />
                <button
                  type="button"
                  id="btn_toggle_login_password_visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Login Error Notification */}
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-950/35 border border-rose-500/30 text-rose-300 text-xs py-2.5 px-4 rounded-xl text-center font-bold shadow-lg"
              >
                {loginError}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full relative overflow-hidden bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white text-xs font-black py-4 px-4 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.45)] active:scale-[0.98] uppercase tracking-[0.15em] cursor-pointer"
            >
              LOGIN KE SISTEM
            </button>

            {/* PLN/HPI Corporate Sinergi Badges */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-800/60 mt-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Andal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Sinergi
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Tangguh
              </span>
            </div>
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#0c1322] via-[#09203f] to-[#051a24] text-slate-100' : 'bg-gradient-to-br from-[#f0f9ff] via-[#f1f5f9] to-[#fae8ff] text-slate-800'} font-sans flex flex-col justify-between selection:bg-cyan-600 selection:text-white transition-all duration-300 relative overflow-hidden`}>
      {/* Dynamic Ambient Colorful Blur Spheres */}
      {isDarkMode ? (
        <>
          <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-blue-500/15 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-20 left-10 w-[550px] h-[550px] bg-orange-500/15 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[110px] pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[125px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />
        </>
      )}
      
      {/* Upper Navigation Rail */}
      <header className={`backdrop-blur-xl sticky top-0 z-50 border-b px-6 py-4 flex items-center justify-between transition-all duration-300 relative overflow-hidden ${isDarkMode ? 'bg-[#0f172a]/75 border-slate-800/80 text-white shadow-lg shadow-black/15' : 'bg-white/75 border-sky-100/80 text-slate-900 shadow-md shadow-sky-500/5'}`}>
        {/* Top Multi-Color Neon Accent Line */}
        <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${isDarkMode ? 'bg-gradient-to-r from-blue-500 via-sky-400 via-orange-400 to-amber-500 shadow-[0_1px_15px_rgba(56,189,248,0.8)]' : 'bg-gradient-to-r from-cyan-400 via-sky-400 via-indigo-500 via-purple-500 to-amber-400'}`} />

        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white font-extrabold flex items-center justify-center tracking-tighter shadow-md transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-tr from-blue-500 via-sky-500 to-orange-500 shadow-[0_0_15px_rgba(59,130,246,0.5),_0_0_15px_rgba(249,115,22,0.4)]' : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-500'}`}>
            HPI
          </div>
          <div>
            <h3 className={`font-black text-sm tracking-tight leading-none transition-all duration-300 ${isDarkMode ? 'text-transparent bg-gradient-to-r from-blue-400 via-sky-300 to-orange-400 bg-clip-text drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]' : 'text-[#0284c7]'}`}>HPI CS System</h3>
          </div>
        </div>

        {/* Centered CS ONLINE for Dark Mode */}
        {isDarkMode && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-20 flex items-center justify-center">
            <span className="font-sans font-black tracking-[0.2em] text-[11px] xs:text-xs sm:text-sm uppercase bg-gradient-to-r from-blue-400 via-sky-300 to-orange-400 text-transparent bg-clip-text animate-cs-glow pl-[0.2em]">
              CS ONLINE
            </span>
          </div>
        )}


        {/* Theme Toggle & Logout Button */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn_theme_toggle"
            type="button"
            onClick={() => {
              const newVal = !isDarkMode;
              setIsDarkMode(newVal);
              localStorage.setItem('theme_dark', String(newVal));
            }}
            className={`flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer active:scale-95 border ${
              isDarkMode 
                ? 'bg-slate-900 text-amber-400 hover:text-amber-300 border-slate-800' 
                : 'bg-slate-100 text-[#0284c7] hover:text-[#0369a1] border-slate-250'
            }`}
            title={isDarkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

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
      <main className="flex-1 w-full p-0 flex flex-col">
        


        {/* Welcome information banner */}
        <div className={`p-4 rounded-none border-x-0 border-t-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm border ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-sky-100/80 text-slate-800'}`}>
          <div className="flex items-center gap-2.5 text-sky-400">
            <Info size={16} className={isDarkMode ? 'text-sky-500' : 'text-[#0284c7]'} />
            <span className={`text-[11px] leading-relaxed text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <strong>Konsol Administrasi Web:</strong> Selamat datang di portal Cleaning Service PT Haleyora Powerindo Cabang Bangka Belitung. Di sini Anda dapat memantau data pegawai, serta Data Lapoan secara real-time.
            </span>
          </div>
        </div>

        {/* Full-width Web Dashboard */}
        <div className="w-full flex-1 flex flex-col">
          <AdminDashboard 
            employees={employees}
            attendance={attendance}
            reports={mergedReports}
            onAddEmployee={handleAddEmployee}
            onUpdateReportStatus={handleUpdateReportStatus}
            onUpdateReport={handleUpdateReport}
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
            draftReports={draftReports}
            onAddDraftReport={handleAddDraftReport}
            onDeleteDraftReport={handleDeleteDraftReport}
            onSyncDrafts={handleSyncDrafts}
            isDarkMode={isDarkMode}
            loggedInUserId={loggedInUserId}
            userAccounts={userAccounts}
            onAddUserAccount={handleAddUserAccount}
            onDeleteUserAccount={handleDeleteUserAccount}
            dbError={dbError}
            onDbError={setDbError}
          />
        </div>
      </main>

      {/* Live Event Activity Notifications popups */}
      <div id="logs_activity_feed_global" className="fixed bottom-6 left-6 z-[90] max-w-xs space-y-2 hidden sm:block">

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
      <footer className={`${isDarkMode ? 'bg-[#0f172a]/80 border-slate-800/80 text-slate-400' : 'bg-white/80 border-sky-100 text-slate-500'} p-6 border-t flex flex-col md:flex-row items-center justify-between text-[11px] select-none transition-all duration-300 relative z-10`}>
        <p>© 2026 HPI CS System. Semua Hak Cipta Dilindungi.</p>
        <div className="flex items-center gap-4 mt-2 md:mt-0 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Server: active (200 OK)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            Database: Google Firestore (Real-Time)
          </span>
        </div>
      </footer>

    </div>
  );
}
