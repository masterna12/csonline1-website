import React, { useState } from "react";
import {
  Users,
  FileText,
  CheckSquare,
  Clock,
  MapPin,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  UserX,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  ArrowUpRight,
  Building2,
  UserCheck,
  Eye,
  Trash2,
  Shield,
  Settings,
  Menu,
  ChevronRight,
  HardHat,
  AlertTriangle,
  RefreshCw,
  Layers,
  Bell,
  Package,
  ArrowRight,
  Download,
  Send,
  Globe,
  Check,
  User,
  UserPlus,
  LogOut,
  Upload,
  Camera,
  CameraOff,
  FileSpreadsheet,
  Printer,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Employee, Report, Attendance, UserAccount } from "../types";
import {
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_REPORTS,
} from "../data";
import {
  initSheetsAuth,
  signInGoogleSheets,
  signOutGoogleSheets,
  createNewReportsSpreadsheet,
  writeReportsToSpreadsheet,
  parseSpreadsheetToReports,
} from "../lib/sheetsService";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";
// @ts-ignore
import hpiLogo from "../assets/images/hpi_cs_logo_dark_1781488961865.jpg";

const INDONESIA_HOLIDAYS_2026 = new Set([
  "2026-01-01", // Tahun Baru Masehi
  "2026-01-19", // Isra Mikraj Muhammad SAW
  "2026-02-17", // Tahun Baru Imlek
  "2026-03-19", // Hari Raya Nyepi
  "2026-03-20", // Idul Fitri Hari 1 / Cuti Bersama
  "2026-03-21", // Idul Fitri Hari 2
  "2026-03-23", // Cuti Bersama Idul Fitri
  "2026-03-24", // Cuti Bersama Idul Fitri
  "2026-03-25", // Cuti Bersama Idul Fitri
  "2026-04-03", // Wafat Yesus Kristus
  "2026-05-01", // Hari Buruh Internasional
  "2026-05-14", // Kenaikan Yesus Kristus
  "2026-05-25", // Hari Raya Waisak
  "2026-05-26", // Cuti Bersama Waisak
  "2026-06-01", // Hari Lahir Pancasila
  "2026-06-26", // Hari Raya Idul Adha
  "2026-07-16", // Tahun Baru Islam 1448 H
  "2026-08-17", // Hari Kemerdekaan RI
  "2026-09-25", // Maulid Nabi Muhammad SAW
  "2026-12-25", // Hari Raya Natal
  "2026-12-26", // Cuti Bersama Natal
]);

const isGenericHoliday = (month: number, day: number) => {
  if (month === 1 && day === 1) return true;
  if (month === 5 && day === 1) return true;
  if (month === 8 && day === 1) return true;
  if (month === 12 && day === 25) return true;
  return false;
};

const isTanggalMerah = (year: number, month: number, day: number) => {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dateStr = `${year}-${mm}-${dd}`;
  if (year === 2026) {
    return INDONESIA_HOLIDAYS_2026.has(dateStr);
  }
  return isGenericHoliday(month, day);
};

const LeafletMap = ({ coordinates, name }: { coordinates: string; name: string }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<any>(null);

  React.useEffect(() => {
    // Dynamically inject stylesheet
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const run = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const parts = coordinates.split(",").map((c) => Number(c.trim()));
      const lat = isNaN(parts[0]) ? -2.865351 : parts[0];
      const lng = isNaN(parts[1]) ? 108.2793028 : parts[1];

      try {
        if (mapInstance.current) {
          mapInstance.current.remove();
        }

        mapInstance.current = L.map(mapRef.current).setView([lat, lng], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstance.current);

        const marker = L.marker([lat, lng]).addTo(mapInstance.current);
        marker.bindPopup(`<b>${name}</b><br/>${lat}, ${lng}`).openPopup();
      } catch (err) {
        console.error("Leaflet initialization error:", err);
      }
    };

    if ((window as any).L) {
      run();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = run;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }
    };
  }, [coordinates, name]);

  return (
    <div
      ref={mapRef}
      className="w-full h-80 sm:h-[400px] rounded-xl border border-slate-200 z-10"
    />
  );
};

interface AdminDashboardProps {
  employees: Employee[];
  attendance: Attendance[];
  reports: Report[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateReportStatus: (
    id: string,
    status: "Disetujui" | "Ditolak",
    notes?: string,
  ) => void;
  onUpdateReport?: (rep: Report) => void;
  onDeleteEmployee: (id: string) => void;
  onDeleteReport: (id: string) => void;
  onShowAlert: (
    title: string,
    message: string,
    type: "success" | "alert",
  ) => void;
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
  isDarkMode?: boolean;
  loggedInUserId?: string;
  userAccounts?: UserAccount[];
  onAddUserAccount?: (acc: UserAccount) => void;
  onDeleteUserAccount?: (id: string) => void;
  dbError?: string | null;
}

export default function AdminDashboard({
  employees,
  attendance,
  reports,
  onAddEmployee,
  onUpdateReportStatus,
  onUpdateReport = () => {},
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
  onSyncDrafts = async () => {},
  isDarkMode = true,
  loggedInUserId = "admin",
  userAccounts = [],
  onAddUserAccount = () => {},
  onDeleteUserAccount = () => {},
  dbError = null,
}: AdminDashboardProps) {
  const isAdmin = loggedInUserId === "admin" || !loggedInUserId;
  // Sidebar tab management
  // 'ringkasan' = Dashboard, 'pegawai' = Data Pegawai, 'laporan' = Data Laporan, 'kehadiran' = Data Master, 'pengaturan' = Pengaturan Akun, 'kelola_akun' = Kelola Akun
  const [activeSubTab, setActiveSubTab] = useState<
    "ringkasan" | "pegawai" | "laporan" | "kehadiran" | "pengaturan" | "kelola_akun"
  >(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    const validTabs = ["ringkasan", "pegawai", "laporan", "kehadiran", "pengaturan", "kelola_akun"];
    if (validTabs.includes(hash)) {
      return hash as any;
    }
    return "ringkasan";
  });

  // Listen to hash change to support standard browser links/tabs natively
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = ["ringkasan", "pegawai", "laporan", "kehadiran", "pengaturan", "kelola_akun"];
      if (validTabs.includes(hash)) {
        setActiveSubTab(hash as any);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Sync hash with active tab state
  React.useEffect(() => {
    if (activeSubTab) {
      window.location.hash = activeSubTab;
    }
  }, [activeSubTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportSubTab, setReportSubTab] = useState<
    "semua" | "draft" | "rekap_kinerja"
  >("semua");
  const [deptFilter, setDeptFilter] = useState<string>("Semua");
  const [reportDeptFilter, setReportDeptFilter] = useState<string>("Semua");
  const [locationFilter, setLocationFilter] = useState("Semua Lokasi");
  const [periodFilter, setPeriodFilter] = useState("25A - JUNI 2026");

  // Google Sheets Integration State
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("step_sheets_spreadsheet_id") || "";
  });
  const [sheetsSpreadsheetUrl, setSheetsSpreadsheetUrl] = useState<string>(
    () => {
      return localStorage.getItem("step_sheets_spreadsheet_url") || "";
    },
  );
  const [sheetsTitle, setSheetsTitle] = useState(
    "HPI Haleyora Powerindo - Data Pelaporan",
  );
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
      },
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
        onShowAlert(
          "Koneksi Google Sukses",
          "Sistem berhasil terhubung dengan akun Google Workspace Anda.",
          "success",
        );
      }
    } catch (err: any) {
      console.error(err);
      onShowAlert(
        "Koneksi Google Gagal",
        err.message || "Gagal masuk akun Google.",
        "alert",
      );
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
      onShowAlert(
        "Google Terputus",
        "Akun Google berhasil diputuskan secara aman.",
        "success",
      );
    } catch (err: any) {
      console.error(err);
      onShowAlert("Error", "Gagal memutus akun Google.", "alert");
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!googleToken) {
      onShowAlert(
        "Autentikasi Diperlukan",
        "Harap hubungkan akun Google Sheets terlebih dahulu.",
        "alert",
      );
      return;
    }

    setIsLoaderSheets(true);
    try {
      const res = await createNewReportsSpreadsheet(
        googleToken,
        sheetsTitle || "HPI Data Pelaporan",
        reports,
      );
      setSheetsSpreadsheetId(res.spreadsheetId);
      setSheetsSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem("step_sheets_spreadsheet_id", res.spreadsheetId);
      localStorage.setItem("step_sheets_spreadsheet_url", res.spreadsheetUrl);
      onShowAlert(
        "Spreadsheet Baru",
        "Hore! Spreadsheet baru berhasil dibuat dan seluruh data pelaporan diekspor.",
        "success",
      );
    } catch (err: any) {
      console.error(err);
      onShowAlert(
        "Gagal Membuat Sheet",
        err.message || "Gagal membuat spreadsheet baru.",
        "alert",
      );
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleExportToExistingSheet = async () => {
    if (!googleToken) {
      onShowAlert(
        "Autentikasi Diperlukan",
        "Harap hubungkan akun Google Sheets terlebih dahulu.",
        "alert",
      );
      return;
    }
    if (!sheetsSpreadsheetId.trim()) {
      onShowAlert(
        "ID Spreasheet Diperlukan",
        "Silakan masukkan ID Spreadsheet Google tujuan.",
        "alert",
      );
      return;
    }

    const conf = window.confirm(
      `Apakah Anda yakin ingin menimpa data spreadsheet dengan ${reports.length} laporan saat ini?`,
    );
    if (!conf) return;

    setIsLoaderSheets(true);
    try {
      await writeReportsToSpreadsheet(
        googleToken,
        sheetsSpreadsheetId.trim(),
        reports,
      );
      onShowAlert(
        "Ekspor Berhasil",
        "Data pelaporan berhasil ditimpa ke Google Spreadsheet terpilih.",
        "success",
      );
    } catch (err: any) {
      console.error(err);
      onShowAlert(
        "Ekspor Gagal",
        err.message || "Gagal mengekspor data.",
        "alert",
      );
    } finally {
      setIsLoaderSheets(false);
    }
  };

  const handleImportFromSheet = async () => {
    if (!googleToken) {
      onShowAlert(
        "Autentikasi Diperlukan",
        "Harap hubungkan akun Google Sheets terlebih dahulu.",
        "alert",
      );
      return;
    }
    if (!sheetsSpreadsheetId.trim()) {
      onShowAlert(
        "ID Spreasheet Diperlukan",
        "Silakan masukkan ID Spreadsheet Google yang valid.",
        "alert",
      );
      return;
    }

    setIsLoaderSheets(true);
    try {
      const imported = await parseSpreadsheetToReports(
        googleToken,
        sheetsSpreadsheetId.trim(),
      );
      if (onImportReports) {
        onImportReports(imported);
      } else {
        onShowAlert(
          "Impor Sukses",
          `Ditemukan ${imported.length} data laporan di Google Sheet.`,
          "success",
        );
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("404")) {
        onShowAlert(
          "Gagal Sinkronisasi",
          "ID Spreadsheet tidak ditemukan. Harap pastikan ID yang dimasukkan sesuai.",
          "alert",
        );
      } else {
        onShowAlert(
          "Gagal Sinkronisasi",
          err.message || "Gagal mengimpor data spreadsheet.",
          "alert",
        );
      }
    } finally {
      setIsLoaderSheets(false);
    }
  };

  // Modal State & Inline Form state for registering new employees
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpNip, setNewEmpNip] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("-");
  const [newEmpPhone, setNewEmpPhone] = useState("-");
  const [newEmpAvatar, setNewEmpAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  );
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Modal state for manual report inputs
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);

  React.useEffect(() => {
    if (isAddReportModalOpen && !isAdmin && loggedInUserId) {
      const selfEmp = employees.find(e => e.nip === loggedInUserId);
      if (selfEmp) {
        setAddRepName(selfEmp.name);
        setAddRepNip(selfEmp.nip);
        setAddRepRole(selfEmp.role);
        setAddRepDept(selfEmp.department);
      } else {
        setAddRepNip(loggedInUserId);
      }
    }
  }, [isAddReportModalOpen, isAdmin, loggedInUserId, employees]);

  const [addRepName, setAddRepName] = useState("");
  const [addRepNip, setAddRepNip] = useState("");
  const [addRepRole, setAddRepRole] = useState("");
  const [addRepDept, setAddRepDept] = useState("");
  const [addRepType, setAddRepType] = useState<
    "Operasional" | "Teknis" | "Penjualan" | "Administrasi" | "Lainnya"
  >("Operasional");
  const [addRepTitle, setAddRepTitle] = useState("");
  const [addRepDesc, setAddRepDesc] = useState("");
  const [addRepIndoor, setAddRepIndoor] = useState("");
  const [addRepOutdoor, setAddRepOutdoor] = useState("");
  const [addRepLocName, setAddRepLocName] = useState("Sektor Bangka Belitung");
  const [addRepCoord, setAddRepCoord] = useState("-2.1299, 106.1138");
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  // Date range filters for reports
  const [reportStartDateFilter, setReportStartDateFilter] = useState("");
  const [reportEndDateFilter, setReportEndDateFilter] = useState("");
  const [reportLocationFilter, setReportLocationFilter] = useState("Semua");
  const [activePhotoModalRow, setActivePhotoModalRow] = useState<Report | null>(null);
  const [activeMapModalRow, setActiveMapModalRow] = useState<Report | null>(null);

  // Decision feedback modal
  const [selectedReportForAction, setSelectedReportForAction] =
    useState<Report | null>(null);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(
    null,
  );
  const [adminFeedbackNotes, setAdminFeedbackNotes] = useState("");
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Active logged-in user details determination
  const activeEmpInfo = React.useMemo(() => {
    if (loggedInUserId && loggedInUserId !== "admin") {
      return employees.find((e) => e.nip === loggedInUserId) || null;
    }
    return null;
  }, [employees, loggedInUserId]);

  const currentUserName = activeEmpInfo ? activeEmpInfo.name : (loggedInUserId === "admin" ? adminName : "Petugas Lapangan");
  const currentUserAvatar = activeEmpInfo ? activeEmpInfo.avatar : (loggedInUserId === "admin" ? adminAvatar : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200");
  const currentUserPassword = loggedInUserId && loggedInUserId !== "admin"
    ? (localStorage.getItem("step_user_password_" + loggedInUserId) || "27111998")
    : adminPassword;
  const currentUserRole = activeEmpInfo ? activeEmpInfo.role : (loggedInUserId === "admin" ? "SU / Supervisor" : "Petugas Lapangan");

  // Settings Form State
  const [settingName, setSettingName] = useState(currentUserName);
  const [settingAvatar, setSettingAvatar] = useState(currentUserAvatar);
  const [settingPassword, setSettingPassword] = useState(currentUserPassword);
  const [settingPasswordConfirm, setSettingPasswordConfirm] =
    useState(currentUserPassword);
  const [settingOldPassword, setSettingOldPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    setSettingName(currentUserName);
    setSettingAvatar(currentUserAvatar);
    setSettingPassword(currentUserPassword);
    setSettingPasswordConfirm(currentUserPassword);
    setSettingOldPassword("");
  }, [currentUserName, currentUserAvatar, currentUserPassword, activeSubTab]);

  // Master Sub-Tab state
  const [masterSubTab, setMasterSubTab] = useState<
    "lokasi" | "jabatan" | "struktur"
  >("lokasi");

  // Master Lokasi Kerja states
  const [locations, setLocations] = useState<
    {
      id: string;
      name: string;
      level: number;
      parentId?: string;
      barcode?: string;
      jamKerja?: string;
      posCount?: number;
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem("hpi_locations");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employeeLocations, setEmployeeLocations] = useState<{
    [employeeId: string]: string;
  }>(() => {
    try {
      const saved = localStorage.getItem("hpi_employee_locations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Master Jabatan states
  const [jabatans, setJabatans] = useState<
    { id: string; name: string; level: number; parentId?: string }[]
  >(() => {
    try {
      const saved = localStorage.getItem("hpi_jabatans");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [employeeJabatans, setEmployeeJabatans] = useState<{
    [employeeId: string]: string;
  }>(() => {
    try {
      const saved = localStorage.getItem("hpi_employee_jabatans");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Master Search & Filter states
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [masterParentFilter, setMasterParentFilter] = useState("Semua");

  // Modal states for adding/editing Master items
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [locationNameInput, setLocationNameInput] = useState("");
  const [locationLevelInput, setLocationLevelInput] = useState(1);
  const [locationParentInput, setLocationParentInput] = useState("");
  const [locationBarcodeInput, setLocationBarcodeInput] = useState("");
  const [locationJamInput, setLocationJamInput] = useState("8 Jam Kerja");
  const [locationPosInput, setLocationPosInput] = useState(1);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );

  // Modal states for adding/editing Jabatan items
  const [isAddJabatanModalOpen, setIsAddJabatanModalOpen] = useState(false);
  const [jabatanNameInput, setJabatanNameInput] = useState("");
  const [jabatanLevelInput, setJabatanLevelInput] = useState(1);
  const [jabatanParentInput, setJabatanParentInput] = useState("");
  const [editingJabatanId, setEditingJabatanId] = useState<string | null>(null);

  // Modal states for assigning Employees to Locations
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] =
    useState(false);
  const [selectedLocationForAssignment, setSelectedLocationForAssignment] =
    useState<string | null>(null);

  // Modal states for assigning Employees to Jabatan
  const [isAssignJabatanModalOpen, setIsAssignJabatanModalOpen] =
    useState(false);
  const [selectedJabatanForAssignment, setSelectedJabatanForAssignment] =
    useState<string | null>(null);

  // Modal state for structural view of Organization
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  // Detail view of employees assigned to a specific Jabatan
  const [selectedJabatanForDetail, setSelectedJabatanForDetail] = useState<
    string | null
  >(null);

  // Confirmation states for deleting Master items
  const [locationIdToDelete, setLocationIdToDelete] = useState<string | null>(
    null,
  );
  const [jabatanIdToDelete, setJabatanIdToDelete] = useState<string | null>(
    null,
  );

  // States for Rekap Kinerja Bulanan
  const [rekapMonth, setRekapMonth] = useState<number>(() => {
    // Default to current month of latest report or current date
    return new Date().getMonth() + 1;
  });
  const [rekapYear, setRekapYear] = useState<number>(() => {
    return new Date().getFullYear();
  });
  const [rekapSearchText, setRekapSearchText] = useState<string>("");
  const [selectedEmpForRekapDetail, setSelectedEmpForRekapDetail] = useState<
    string | null
  >(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [clickedStatType, setClickedStatType] = useState<'total' | 'sudah' | 'belum' | 'lokasi_ada_pegawai' | 'lokasi_tanpa_pegawai' | 'pegawai_punya_lokasi' | 'pegawai_tanpa_lokasi' | null>(null);
  const [statModalSearch, setStatModalSearch] = useState("");

  // Self-healing for Photo Viewer: if opening a report and its photos are trimmed, fetch live photos from Firestore
  React.useEffect(() => {
    if (!activePhotoModalRow) return;

    const hasTrimmedPhotos = 
      (activePhotoModalRow.photoIndoor && activePhotoModalRow.photoIndoor.includes("placeholder_trimmed")) ||
      (activePhotoModalRow.photoOutdoor && activePhotoModalRow.photoOutdoor.includes("placeholder_trimmed")) ||
      (activePhotoModalRow.photo && activePhotoModalRow.photo.includes("placeholder_trimmed")) ||
      (activePhotoModalRow.imagePath && activePhotoModalRow.imagePath.includes("placeholder_trimmed"));

    if (hasTrimmedPhotos) {
      const fetchLivePhotos = async () => {
        try {
          const reportRef = doc(db, 'dashboard', activePhotoModalRow.id);
          const snap = await getDoc(reportRef);
          if (snap.exists()) {
            const data = snap.data() as any;
            if (data) {
              setActivePhotoModalRow(prev => {
                if (!prev || prev.id !== activePhotoModalRow.id) return prev;
                return {
                  ...prev,
                  photoIndoor: data.photoIndoor || data.photo_indoor || data.photo || data.imagePath || "",
                  photoOutdoor: data.photoOutdoor || data.photo_outdoor || data.photo || data.imagePath || "",
                  photo: data.photo || "",
                  imagePath: data.imagePath || ""
                };
              });
            }
          }
        } catch (e) {
          console.error("Gagal mengambil foto dari cloud:", e);
        }
      };
      fetchLivePhotos();
    }
  }, [activePhotoModalRow]);

  // Self-healing for Editing: if opening a report to edit and its photos are trimmed, fetch live photos from Firestore
  React.useEffect(() => {
    if (!editingReport) return;

    const hasTrimmedPhotos = 
      (editingReport.photoIndoor && editingReport.photoIndoor.includes("placeholder_trimmed")) ||
      (editingReport.photoOutdoor && editingReport.photoOutdoor.includes("placeholder_trimmed")) ||
      (editingReport.photo && editingReport.photo.includes("placeholder_trimmed")) ||
      (editingReport.imagePath && editingReport.imagePath.includes("placeholder_trimmed"));

    if (hasTrimmedPhotos) {
      const restorePhotos = async () => {
        try {
          const reportRef = doc(db, 'dashboard', editingReport.id);
          const snap = await getDoc(reportRef);
          if (snap.exists()) {
            const data = snap.data() as any;
            if (data) {
              setEditingReport(prev => {
                if (!prev || prev.id !== editingReport.id) return prev;
                return {
                  ...prev,
                  photoIndoor: data.photoIndoor || data.photo_indoor || data.photo || data.imagePath || "",
                  photoOutdoor: data.photoOutdoor || data.photo_outdoor || data.photo || data.imagePath || "",
                  photo: data.photo || "",
                  imagePath: data.imagePath || ""
                };
              });
            }
          }
        } catch (e) {
          console.error("Gagal mengunduh foto asli untuk pengeditan laporan:", e);
        }
      };
      restorePhotos();
    }
  }, [editingReport]);

  // Live Camera Capture States & Lifecycle Methods
  const [activeCameraStream, setActiveCameraStream] =
    useState<MediaStream | null>(null);
  const [cameraModalTarget, setCameraModalTarget] = useState<
    "indoor" | "outdoor" | null
  >(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRefCallback = React.useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && activeCameraStream) {
        node.srcObject = activeCameraStream;
        node.play().catch((e) => console.error("Error playing video feed:", e));
      }
    },
    [activeCameraStream],
  );

  const handleOpenLiveCamera = async (target: "indoor" | "outdoor") => {
    setCameraModalTarget(target);
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: target === "indoor" ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setActiveCameraStream(stream);
    } catch (err: any) {
      console.error("Camera access with facingMode failed, falling back:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setActiveCameraStream(stream);
      } catch (errFallback: any) {
        setCameraError(
          "Gagal mengakses kamera perangkat Anda. Silakan beri izin kamera pada perangkat browser Laptop / HP.",
        );
        onShowAlert(
          "Gagal Membuka Kamera",
          "Izin kamera ditolak atau kamera tidak didukung perangkat.",
          "alert",
        );
      }
    }
  };

  const handleCloseLiveCamera = () => {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      setActiveCameraStream(null);
    }
    setCameraModalTarget(null);
    setCameraError(null);
  };

  const handleCapturePhoto = () => {
    const videoElement = document.getElementById(
      "camera_preview_video",
    ) as HTMLVideoElement;
    if (videoElement) {
      const canvas = document.createElement("canvas");
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (cameraModalTarget === "indoor") {
          setAddRepIndoor(dataUrl);
        } else if (cameraModalTarget === "outdoor") {
          setAddRepOutdoor(dataUrl);
        }
        handleCloseLiveCamera();
        onShowAlert(
          "Foto Diambil",
          "Berhasil menyimpan hasil potret kamera.",
          "success",
        );
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCameraStream]);

  // Real-time synchronization for locations to/from Firestore (Fully real-time)
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "hpi_locations"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docVal) => {
        list.push(docVal.data());
      });
      if (!snapshot.empty) {
        setLocations(list);
        localStorage.setItem("hpi_locations", JSON.stringify(list));
      } else {
        // Seed from existing local storage if available
        const local = localStorage.getItem("hpi_locations");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((loc) => {
                setDoc(doc(db, "hpi_locations", loc.id), loc).catch(e => console.error("Error seeding location: ", e));
              });
            }
          } catch(e){}
        }
      }
    }, (error) => {
      console.error("Firestore 'hpi_locations' error: ", error);
      const local = localStorage.getItem("hpi_locations");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            setLocations(parsed);
          }
        } catch(e){}
      }
    });
    return () => unsub();
  }, []);

  // Real-time synchronization for employeeLocations to/from Firestore (Fully real-time)
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "hpi_employee_locations"), (snapshot) => {
      const mapping: { [key: string]: string } = {};
      snapshot.forEach((docVal) => {
        const data = docVal.data();
        if (data && data.id && data.locationId) {
          mapping[data.id] = data.locationId;
        }
      });
      if (!snapshot.empty) {
        setEmployeeLocations(mapping);
        localStorage.setItem("hpi_employee_locations", JSON.stringify(mapping));
      } else {
        // Seed from existing local storage
        const local = localStorage.getItem("hpi_employee_locations");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed && typeof parsed === "object") {
              Object.entries(parsed).forEach(([empId, locId]) => {
                if (empId && locId) {
                  setDoc(doc(db, "hpi_employee_locations", empId), { id: empId, locationId: locId }).catch(e => console.error("Error seeding employee location: ", e));
                }
              });
            }
          } catch(e){}
        }
      }
    }, (error) => {
      console.error("Firestore 'hpi_employee_locations' error: ", error);
      const local = localStorage.getItem("hpi_employee_locations");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === "object") {
            setEmployeeLocations(parsed);
          }
        } catch(e){}
      }
    });
    return () => unsub();
  }, []);

  // Real-time synchronization for jabatans to/from Firestore (Fully real-time)
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "hpi_jabatans"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docVal) => {
        list.push(docVal.data());
      });
      if (!snapshot.empty) {
        setJabatans(list);
        localStorage.setItem("hpi_jabatans", JSON.stringify(list));
      } else {
        // Seed from existing local storage
        const local = localStorage.getItem("hpi_jabatans");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((jab) => {
                setDoc(doc(db, "hpi_jabatans", jab.id), jab).catch(e => console.error("Error seeding jabatan: ", e));
              });
            }
          } catch(e){}
        }
      }
    }, (error) => {
      console.error("Firestore 'hpi_jabatans' error: ", error);
      const local = localStorage.getItem("hpi_jabatans");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            setJabatans(parsed);
          }
        } catch(e){}
      }
    });
    return () => unsub();
  }, []);

  // Real-time synchronization for employeeJabatans to/from Firestore (Fully real-time)
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, "hpi_employee_jabatans"), (snapshot) => {
      const mapping: { [key: string]: string } = {};
      snapshot.forEach((docVal) => {
        const data = docVal.data();
        if (data && data.id && data.jabatanId) {
          mapping[data.id] = data.jabatanId;
        }
      });
      if (!snapshot.empty) {
        setEmployeeJabatans(mapping);
        localStorage.setItem("hpi_employee_jabatans", JSON.stringify(mapping));
      } else {
        // Seed from existing local storage
        const local = localStorage.getItem("hpi_employee_jabatans");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed && typeof parsed === "object") {
              Object.entries(parsed).forEach(([empId, jabId]) => {
                if (empId && jabId) {
                  setDoc(doc(db, "hpi_employee_jabatans", empId), { id: empId, jabatanId: jabId }).catch(e => console.error("Error seeding employee jabatan: ", e));
                }
              });
            }
          } catch(e){}
        }
      }
    }, (error) => {
      console.error("Firestore 'hpi_employee_jabatans' error: ", error);
      const local = localStorage.getItem("hpi_employee_jabatans");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === "object") {
            setEmployeeJabatans(parsed);
          }
        } catch(e){}
      }
    });
    return () => unsub();
  }, []);

  // Sidebar responsive collapse
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Stats Calculations
  const totalEmployees = employees.length;
  const activeEmployeesCount = employees.filter(
    (e) => e.status === "Aktif",
  ).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const attendanceToday = attendance.filter((a) => a.date === todayStr);
  const presentTodayCount = attendanceToday.filter((a) => a.clockIn).length;
  const lateTodayCount = attendanceToday.filter(
    (a) => a.status === "Terlambat",
  ).length;
  const pendingReportsCount = reports.filter(
    (r) => r.status === "Pending",
  ).length;

  // Render stats matching the PRISMA screenshot (scaled dynamically based on database state!)
  const scanPatroliCount =
    17929 + (reports.length - INITIAL_REPORTS.length) * 15;
  const absensiMasukCount =
    738 + (attendance.length - INITIAL_ATTENDANCE.length) * 3;
  const pergantianShiftCount =
    528 + reports.filter((r) => r.type === "Operasional").length;
  const tamuMasukCount = 0;
  const kirimanBarangCount = 0;
  const kerawananCount =
    26 + reports.filter((r) => r.status === "Ditolak").length;
  const insidenCount =
    2 +
    reports.filter(
      (r) =>
        r.title.toLowerCase().includes("darurat") ||
        r.description.toLowerCase().includes("insiden"),
    ).length;

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpRole.trim()) {
      onShowAlert(
        "Validasi Gagal",
        "Harap isi semua kolom wajib untuk mendaftarkan pegawai!",
        "alert",
      );
      return;
    }

    let nextNum = 1;
    if (employees && employees.length > 0) {
      const ids = employees.map((emp) => {
        const match = emp.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      nextNum = Math.max(...ids) + 1;
    }
    const brandNewId = `EMP${nextNum.toString().padStart(3, "0")}`;

    const brandNewNip =
      newEmpNip || `199${Math.floor(100000 + Math.random() * 899999)}`;
    const newEmp: Employee = {
      id: brandNewId,
      name: newEmpName,
      nip: brandNewNip,
      role: newEmpRole,
      department: newEmpDept,
      email: "-",
      phone: "-",
      avatar: newEmpAvatar,
      status: "Aktif",
      joinDate: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };

    onAddEmployee(newEmp);
    onShowAlert(
      "Pegawai Berhasil Ditambahkan",
      `${newEmp.name} (NIP: ${newEmp.nip}) terdaftar dengan sukses!`,
      "success",
    );

    // Clear State
    setNewEmpName("");
    setNewEmpNip("");
    setNewEmpRole("");
    setNewEmpEmail("-");
    setNewEmpPhone("-");
    setIsAddModalOpen(false);
    setIsAddingInline(false);
  };

  const handleProcessReportAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForAction || !actionType) return;

    onUpdateReportStatus(
      selectedReportForAction.id,
      actionType === "Approve" ? "Disetujui" : "Ditolak",
      adminFeedbackNotes,
    );

    onShowAlert(
      actionType === "Approve" ? "Laporan Disetujui" : "Laporan Ditolak",
      `Laporan dari ${selectedReportForAction.employeeName} telah dievaluasi.`,
      "success",
    );

    setSelectedReportForAction(null);
    setActionType(null);
    setAdminFeedbackNotes("");
  };

  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      onShowAlert(
        "GPS Tidak Didukung",
        "Perangkat/browser ini tidak mendukung Geolocation API untuk koordinat GPS.",
        "alert",
      );
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
        onShowAlert(
          "GPS Sinkron",
          `Sukses mendapatkan lokasi GPS presisi: ${lat}, ${lng}`,
          "success",
        );
      },
      (error) => {
        setIsFetchingGPS(false);
        let errorMsg = "Gagal mengakses GPS perangkat.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Akses lokasi ditolak oleh browser/pengguna.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Sinyal lokasi atau satelit GPS tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Waktu permintaan akses GPS habis (timeout).";
        }
        onShowAlert(
          "GPS Tertunda",
          `${errorMsg} Menggunakan koordinat default Sektor Bangka Belitung.`,
          "alert",
        );
        setAddRepCoord("-2.1299, 106.1138");
        setAddRepLocName("Sektor Bangka (Default)");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  React.useEffect(() => {
    if (isAddReportModalOpen) {
      handleFetchGPS();
    }
  }, [isAddReportModalOpen]);

  const handleSelectEmployeeForReport = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setAddRepName(emp.name);
      setAddRepNip(emp.nip || "");
      setAddRepRole(emp.role);
      setAddRepDept(emp.department);
    }
  };

  const compressAndGetBase64 = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Limit maximum dimensions to 480px to fit perfectly into database/localStorage limits
        const MAX_DIMENSION = 480;
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress base64 as JPEG with 0.50 quality to ensure it fits comfortably under database limits
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.50);
          callback(compressedDataUrl);
        } else {
          callback(event.target?.result as string || "");
        }
      };
      img.onerror = () => {
        callback(event.target?.result as string || "");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleIndoorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        onShowAlert(
          "Berkas Terlalu Besar",
          `Batas maksimal ukuran file foto adalah 10 MB. File Anda berukuran ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
          "alert"
        );
        e.target.value = "";
        return;
      }
      onShowAlert(
        "Memproses Foto",
        "Foto sedang dikompres secara otomatis agar pas untuk database...",
        "success"
      );
      compressAndGetBase64(file, (base64) => {
        setAddRepIndoor(base64);
        onShowAlert(
          "Foto Berhasil Diproses",
          "Foto berhasil diringkas dan diperkecil ukurannya dengan aman.",
          "success"
        );
      });
    }
  };

  const handleOutdoorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        onShowAlert(
          "Berkas Terlalu Besar",
          `Batas maksimal ukuran file foto adalah 10 MB. File Anda berukuran ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
          "alert"
        );
        e.target.value = "";
        return;
      }
      onShowAlert(
        "Memproses Foto",
        "Foto sedang dikompres secara otomatis agar pas untuk database...",
        "success"
      );
      compressAndGetBase64(file, (base64) => {
        setAddRepOutdoor(base64);
        onShowAlert(
          "Foto Berhasil Diproses",
          "Foto berhasil diringkas dan diperkecil ukurannya dengan aman.",
          "success"
        );
      });
    }
  };

  const handleAddReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRepName.trim()) {
      onShowAlert("Validasi Gagal", "Harap isi Nama Pegawai!", "alert");
      return;
    }
    if (!addRepNip.trim()) {
      onShowAlert("Validasi Gagal", "Harap isi NIP Pegawai!", "alert");
      return;
    }
    if (!addRepRole.trim()) {
      onShowAlert("Validasi Gagal", "Harap isi Jabatan!", "alert");
      return;
    }
    if (!addRepDept.trim()) {
      onShowAlert("Validasi Gagal", "Harap isi Unit Kerja / Divisi!", "alert");
      return;
    }

    const finalTitle = addRepTitle.trim() || `Laporan - ${addRepDept}`;
    const finalDesc =
      addRepDesc.trim() ||
      "Menyelesaikan aktivitas patroli harian, inspeksi kelayakan instrumen, dan sinkronisasi laporan koordinat lapangan PT Haleyora Powerindo.";

    // Find actual employee ID if possible to sync with Rekap Kinerja
    const resolvedEmp = employees.find((e) => {
      const nipMatch = e.nip && addRepNip && e.nip.trim() === addRepNip.trim();
      const nameMatch =
        e.name &&
        addRepName &&
        e.name.toLowerCase().trim() === addRepName.toLowerCase().trim();
      return nipMatch || nameMatch;
    });
    const matchedEmployeeId = resolvedEmp
      ? resolvedEmp.id
      : `EMP_ADM_${Math.floor(100 + Math.random() * 899)}`;

    const newReport: Report = {
      id: `REP${Math.floor(200 + Math.random() * 800)}`,
      employeeId: matchedEmployeeId,
      nip: addRepNip,
      employeeName: addRepName,
      role: addRepRole,
      department: addRepDept,
      date: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      })(),
      type: addRepType,
      title: finalTitle,
      description: finalDesc,
      status: "Disetujui", // Admin generated reports are directly set as approved
      photoIndoor: addRepIndoor,
      photoOutdoor: addRepOutdoor || addRepIndoor,
      location: {
        name: addRepLocName,
        coordinates: addRepCoord,
      },
    };

    if (!navigator.onLine) {
      // Offline mode auto-save to draft!
      const draftId = `DRAFT${Math.floor(100 + Math.random() * 900)}`;
      newReport.id = draftId;
      newReport.status = "Pending";
      onAddDraftReport(newReport);
      onShowAlert(
        "Offline Terdeteksi",
        "Koneksi terganggu. Laporan Anda berhasil disimpan ke menu Draft secara otomatis!",
        "success",
      );
    } else {
      onAddReport(newReport);
      onShowAlert(
        "Laporan Sukses",
        `Laporan kerja penugasan untuk ${addRepName} berhasil diunggah dengan sukses.`,
        "success",
      );
    }

    // Reset fields
    setAddRepName("");
    setAddRepNip("");
    setAddRepRole("");
    setAddRepDept("");
    setAddRepTitle("");
    setAddRepDesc("");
    setAddRepIndoor("");
    setAddRepOutdoor("");
    setAddRepLocName("Sektor Bangka Belitung");
    setAddRepCoord("-2.1299, 106.1138");
    setIsAddReportModalOpen(false);
  };

  const handleSaveReportAsDraft = () => {
    if (!addRepName.trim()) {
      onShowAlert(
        "Validasi Gagal",
        "Harap isi Nama Pegawai sebelum menyimpan draft!",
        "alert",
      );
      return;
    }
    if (!addRepNip.trim()) {
      onShowAlert(
        "Validasi Gagal",
        "Harap isi NIP Pegawai sebelum menyimpan draft!",
        "alert",
      );
      return;
    }
    if (!addRepRole.trim()) {
      onShowAlert(
        "Validasi Gagal",
        "Harap isi Jabatan sebelum menyimpan draft!",
        "alert",
      );
      return;
    }
    if (!addRepDept.trim()) {
      onShowAlert(
        "Validasi Gagal",
        "Harap isi Unit Kerja / Divisi sebelum menyimpan draft!",
        "alert",
      );
      return;
    }

    const finalTitle = addRepTitle.trim() || `Laporan (Draft) - ${addRepDept}`;
    const finalDesc =
      addRepDesc.trim() ||
      "Menyelesaikan aktivitas patroli harian, inspeksi kelayakan instrumen, dan sinkronisasi laporan koordinat lapangan PT Haleyora Powerindo.";

    const draftReport: Report = {
      id: `DRAFT${Math.floor(100 + Math.random() * 900)}`,
      employeeId: `EMP_DFT_${Math.floor(100 + Math.random() * 899)}`,
      nip: addRepNip,
      employeeName: addRepName,
      role: addRepRole,
      department: addRepDept,
      date: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      })(),
      type: addRepType,
      title: finalTitle,
      description: finalDesc,
      status: "Pending",
      photoIndoor: addRepIndoor,
      photoOutdoor: addRepOutdoor || addRepIndoor,
      location: {
        name: addRepLocName,
        coordinates: addRepCoord,
      },
    };

    onAddDraftReport(draftReport);

    // Reset fields
    setAddRepName("");
    setAddRepNip("");
    setAddRepRole("");
    setAddRepDept("");
    setAddRepTitle("");
    setAddRepDesc("");
    setAddRepIndoor("");
    setAddRepOutdoor("");
    setAddRepLocName("Sektor Bangka Belitung");
    setAddRepCoord("-2.1299, 106.1138");
    setIsAddReportModalOpen(false);
  };

  const handleQuickUploadDraft = async (draft: Report) => {
    onAddReport(draft);
    onDeleteDraftReport(draft.id);
    onShowAlert(
      "Draft Terkirim",
      `Laporan draft untuk ${draft.employeeName} berhasil diunggah ke server!`,
      "success",
    );
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
    onShowAlert(
      "Draft Dimuat",
      "Laporan draft berhasil dimuat kembali ke formulir pengisian.",
      "success",
    );
  };

  const handleRefresh = () => {
    // Clear all synchronization cooldown trackers
    localStorage.removeItem("last_sync_employees");
    localStorage.removeItem("last_sync_attendance");
    localStorage.removeItem("last_sync_user_accounts");
    localStorage.removeItem("last_sync_locations");
    localStorage.removeItem("last_sync_employee_locations");
    localStorage.removeItem("last_sync_jabatans");
    localStorage.removeItem("last_sync_employee_jabatans");

    // Clear actual database caches to force the client to completely re-download all documents from Cloud Firestore
    localStorage.removeItem("db_reports");
    localStorage.removeItem("db_attendance");
    localStorage.removeItem("db_employees");
    localStorage.removeItem("db_user_accounts");
    localStorage.removeItem("hpi_locations");
    localStorage.removeItem("hpi_employee_locations");
    localStorage.removeItem("hpi_jabatans");
    localStorage.removeItem("hpi_employee_jabatans");

    onShowAlert(
      "Sinkronisasi Cloud",
      "Seluruh cache lokal dihapus. Membuka koneksi segar dan mengambil seluruh data terbaru langsung dari Cloud Firestore...",
      "success",
    );

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationNameInput.trim()) {
      onShowAlert("Nama Kosong", "Nama lokasi kerja harus diisi.", "alert");
      return;
    }
    if (editingLocationId) {
      const updatedList = locations.map((loc) =>
        loc.id === editingLocationId
          ? {
              ...loc,
              name: locationNameInput.trim(),
            }
          : loc,
      );
      setLocations(updatedList);
      const updatedLoc = updatedList.find((l) => l.id === editingLocationId);
      if (updatedLoc) {
        setDoc(doc(db, "hpi_locations", editingLocationId), updatedLoc).catch((err) =>
          console.error("Error updating location in Firestore:", err),
        );
      }
      onShowAlert("Sukses", "Lokasi kerja berhasil diperbarui.", "success");
    } else {
      const parentId = locationParentInput || "";
      const level = parentId
        ? (locations.find((l) => l.id === parentId)?.level || 1) + 1
        : 1;
      const newLoc = {
        id: "LOC_" + Date.now().toString().slice(-6),
        name: locationNameInput.trim(),
        level: level,
        parentId: parentId,
        barcode: "LOC-" + Math.floor(100 + Math.random() * 900),
        jamKerja: "8 Jam Kerja",
        posCount: 1,
      };
      setLocations([...locations, newLoc]);
      setDoc(doc(db, "hpi_locations", newLoc.id), newLoc).catch((err) =>
        console.error("Error adding location to Firestore:", err),
      );
      onShowAlert(
        "Sukses",
        "Lokasi kerja baru berhasil ditambahkan.",
        "success",
      );
    }
    setIsAddLocationModalOpen(false);
    setLocationNameInput("");
    setLocationLevelInput(1);
    setLocationParentInput("");
    setLocationBarcodeInput("");
    setLocationJamInput("8 Jam Kerja");
    setLocationPosInput(1);
    setEditingLocationId(null);
  };

  const handleDeleteLocation = (id: string) => {
    // Delete location and its sub-locations recursively
    const locationsToDelete = [id];

    // Find nested sub-locations
    const getChildrenIds = (parentId: string) => {
      locations.forEach((loc) => {
        if (loc.parentId === parentId && !locationsToDelete.includes(loc.id)) {
          locationsToDelete.push(loc.id);
          getChildrenIds(loc.id);
        }
      });
    };
    getChildrenIds(id);

    setLocations(
      locations.filter((loc) => !locationsToDelete.includes(loc.id)),
    );

    // Delete from Firestore
    locationsToDelete.forEach((locId) => {
      deleteDoc(doc(db, "hpi_locations", locId)).catch((err) =>
        console.error("Error deleting location from Firestore:", err),
      );
    });

    // Clean up employee locations assignments mapping
    const updatedAssignments = { ...employeeLocations };
    Object.keys(updatedAssignments).forEach((empId) => {
      if (locationsToDelete.includes(updatedAssignments[empId])) {
        delete updatedAssignments[empId];
        deleteDoc(doc(db, "hpi_employee_locations", empId)).catch((err) =>
          console.error("Error deleting employee location from Firestore:", err),
        );
      }
    });
    setEmployeeLocations(updatedAssignments);
    onShowAlert(
      "Sukses",
      "Lokasi kerja dan seluruh sub-lokasinya berhasil dihapus.",
      "success",
    );
  };

  const handleSaveJabatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jabatanNameInput.trim()) {
      onShowAlert("Nama Kosong", "Nama jabatan / posisi harus diisi.", "alert");
      return;
    }
    if (editingJabatanId) {
      const updatedList = jabatans.map((j) =>
        j.id === editingJabatanId
          ? {
              ...j,
              name: jabatanNameInput.trim(),
              level: jabatanLevelInput,
              parentId: jabatanParentInput || "",
            }
          : j,
      );
      setJabatans(updatedList);
      const updatedJab = updatedList.find((j) => j.id === editingJabatanId);
      if (updatedJab) {
        setDoc(doc(db, "hpi_jabatans", editingJabatanId), updatedJab).catch((err) =>
          console.error("Error updating jabatan in Firestore:", err),
        );
      }
      onShowAlert("Sukses", "Jabatan berhasil diperbarui.", "success");
    } else {
      const newJab = {
        id: "JAB_" + Date.now().toString().slice(-6),
        name: jabatanNameInput.trim(),
        level: jabatanLevelInput,
        parentId: jabatanParentInput || "",
      };
      setJabatans([...jabatans, newJab]);
      setDoc(doc(db, "hpi_jabatans", newJab.id), newJab).catch((err) =>
        console.error("Error adding jabatan to Firestore:", err),
      );
      onShowAlert("Sukses", "Jabatan baru berhasil ditambahkan.", "success");
    }
    setIsAddJabatanModalOpen(false);
    setJabatanNameInput("");
    setJabatanLevelInput(1);
    setJabatanParentInput("");
    setEditingJabatanId(null);
  };

  const handleDeleteJabatan = (id: string) => {
    setJabatans(jabatans.filter((j) => j.id !== id));
    deleteDoc(doc(db, "hpi_jabatans", id)).catch((err) =>
      console.error("Error deleting jabatan from Firestore:", err),
    );

    // Clean up employee assignments mapping
    const updatedAssignments = { ...employeeJabatans };
    Object.keys(updatedAssignments).forEach((empId) => {
      if (updatedAssignments[empId] === id) {
        delete updatedAssignments[empId];
        deleteDoc(doc(db, "hpi_employee_jabatans", empId)).catch((err) =>
          console.error("Error deleting employee jabatan from Firestore:", err),
        );
      }
    });
    setEmployeeJabatans(updatedAssignments);
    onShowAlert("Sukses", "Jabatan berhasil dihapus.", "success");
  };

  const handleExportExcel = () => {
    // Group reports by combination of employee (nip/name) and date
    const groups: { [key: string]: Report[] } = {};
    filteredReports.forEach((rep) => {
      const groupKey = `${rep.nip || "NONIP"}_${rep.date || "NODATE"}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(rep);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      const dateA = a.split("_")[1] || "";
      const dateB = b.split("_")[1] || "";
      return dateB.localeCompare(dateA); // Date descending
    });

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
        <div class="title">REKAPITULASI PELAPORAN HARIAN PEGAWAI GABUNGAN</div>
        <div class="meta">PT HALEYORA POWERINDO - Filter: ${reportStartDateFilter || "Semua"} s.d ${reportEndDateFilter || "Semua"} | Diekspor pada: ${new Date().toLocaleString("id-ID")} | Total: ${sortedGroupKeys.length} Tanggal Kerja Berbeda</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Pegawai</th>
              <th>NIP</th>
              <th>Unit Kerja / Dept</th>
              <th>Jabatan</th>
              <th>Tanggal Kerja</th>
              <th>Sandi-Sandi Laporan</th>
              <th>Aktivitas Kerja / Judul & Kategori (Gabungan)</th>
              <th>GPS Koordinat (Gabungan)</th>
              <th>Status Persetujuan</th>
              <th style="background-color: #0d9488; min-width: 280px;">Dokumentasi Foto Kerja (Maksimal 4 Foto Per Hari)</th>
            </tr>
          </thead>
          <tbody>
    `;

    sortedGroupKeys.forEach((key, index) => {
      const reps = groups[key];
      const sortedReps = [...reps].sort((a, b) => a.id.localeCompare(b.id));

      const firstRep = sortedReps[0];
      const combinedSandi = sortedReps.map((r) => r.id).join(", ");

      const combinedActivities = sortedReps
        .map((r, ri) => {
          return `[Laporan ${ri + 1}] Kategori: ${r.type || "Operasional"}<br/>Judul: <strong>${r.title}</strong><br/>Deskripsi: ${r.description || "-"}`;
        })
        .join("<br/><br/>");

      const combinedCoordinates =
        Array.from(
          new Set(
            sortedReps.map((r) => r.location?.coordinates).filter(Boolean),
          ),
        ).join("; ") || "-";
      const combinedStatuses = Array.from(
        new Set(sortedReps.map((r) => r.status)),
      ).join(", ");

      const photoUrls: string[] = [];
      sortedReps.forEach((r) => {
        if (r.photoIndoor && r.photoIndoor.trim() !== "")
          photoUrls.push(r.photoIndoor);
        if (
          r.photoOutdoor &&
          r.photoOutdoor.trim() !== "" &&
          r.photoOutdoor !== r.photoIndoor
        ) {
          photoUrls.push(r.photoOutdoor);
        }
      });
      const uniquePhotoUrls = Array.from(
        new Set(photoUrls.filter(Boolean)),
      ).slice(0, 4);

      let photosImgHtml = "";
      if (uniquePhotoUrls.length > 0) {
        photosImgHtml = uniquePhotoUrls
          .map(
            (pUrl, pi) => `
          <div style="display: inline-block; margin: 4px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: white; text-align: center;">
            <img src="${pUrl}" width="100" height="75" style="border-radius: 2px; object-fit: cover;" />
            <div style="font-size: 7.5px; color: #64748b; font-weight: bold; margin-top: 1px;">Foto ${pi + 1}</div>
          </div>
        `,
          )
          .join("");
      } else {
        photosImgHtml =
          '<span style="color: #94a3b8; font-size: 9px;">Tidak ada foto</span>';
      }

      html += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td><strong>${firstRep.employeeName}</strong></td>
          <td>'${firstRep.nip}</td>
          <td>${firstRep.department}</td>
          <td>${firstRep.role}</td>
          <td style="text-align: center; white-space: nowrap;">${firstRep.date}</td>
          <td>${combinedSandi}</td>
          <td style="word-wrap: break-word; max-width: 400px;">${combinedActivities}</td>
          <td style="font-family: monospace;">${combinedCoordinates}</td>
          <td style="text-align: center; font-weight: bold; color: ${combinedStatuses.includes("Disetujui") ? "#047857" : "#b45309"}">${combinedStatuses}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${photosImgHtml}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HPI_Laporan_Gabungan_Harian_${reportStartDateFilter || "Awal"}_s.d_${reportEndDateFilter || "Akhir"}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowAlert(
      "Selesai Ekspor",
      `Berhasil mengelompokkan & mengekspor ${sortedGroupKeys.length} tanggal kerja pegawai beserta gabungan dokumen foto ke Excel!`,
      "success",
    );
  };

  const handleExportWord = () => {
    if (filteredReports.length === 0) {
      onShowAlert(
        "Ekspor Kosong",
        "Tidak ada data laporan untuk diekspor pada rentang filter ini.",
        "alert",
      );
      return;
    }

    onShowAlert(
      "Mempersiapkan Word",
      "Sedang memuat engine dokumen Word untuk mengunduh rekapitulasi data...",
      "success",
    );

    // Group reports by combination of employee (nip/name) and date
    const groups: { [key: string]: Report[] } = {};
    filteredReports.forEach((rep) => {
      const groupKey = `${rep.nip || "NONIP"}_${rep.date || "NODATE"}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(rep);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      const dateA = a.split("_")[1] || "";
      const dateB = b.split("_")[1] || "";
      return dateB.localeCompare(dateA); // Date descending
    });

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
                <div style="font-size: 11pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">REKAPITULASI DOKUMEN LAPORAN HARIAN (GABUNGAN)</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 2px; line-height: 1.2;">
                  Filter: ${reportStartDateFilter || "Semua Tanggal"} s.d ${reportEndDateFilter || "Semua Tanggal"}<br/>
                  Ekspor Tanggal: ${new Date().toLocaleDateString("id-ID")} | Unit: ${reportDeptFilter}
                </div>
              </td>
            </tr>
          </table>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 3%; background-color: #0f172a; color: white;">No</th>
              <th style="width: 16%; background-color: #0284c7; color: white;">Pegawai</th>
              <th style="width: 14%; background-color: #0284c7; color: white;">Unit Kerja / Jabatan</th>
              <th style="width: 10%; background-color: #0284c7; color: white;">Tanggal</th>
              <th style="width: 33%; background-color: #0284c7; color: white;">Rangkuman Aktivitas & Judul Kerja</th>
              <th style="width: 12%; background-color: #0284c7; color: white;">Sektor / GPS</th>
              <th style="width: 6%; background-color: #0284c7; color: white;">Status</th>
              <th style="width: 20%; background-color: #0d9488; color: white;">Lampiran Foto (Maks 4 Foto)</th>
            </tr>
          </thead>
          <tbody>
    `;

    sortedGroupKeys.forEach((key, index) => {
      const reps = groups[key];
      const sortedReps = [...reps].sort((a, b) => a.id.localeCompare(b.id));

      const firstRep = sortedReps[0];
      const combinedActivitiesWord = sortedReps
        .map((r, ri) => {
          return `<div style="margin-bottom: 7px;"><strong>Laporan ${ri + 1}:</strong> ${r.title}<br/><span style="color: #475569; font-size: 8.5pt;">${r.description || "-"}</span></div>`;
        })
        .join("");

      const combinedCoordinates =
        Array.from(
          new Set(
            sortedReps.map((r) => r.location?.coordinates).filter(Boolean),
          ),
        ).join("; ") || "-";
      const combinedLocNames =
        Array.from(
          new Set(sortedReps.map((r) => r.location?.name).filter(Boolean)),
        ).join(" / ") || "-";
      const combinedStatuses = Array.from(
        new Set(sortedReps.map((r) => r.status)),
      ).join(", ");

      const photoUrls: string[] = [];
      sortedReps.forEach((r) => {
        if (r.photoIndoor && r.photoIndoor.trim() !== "")
          photoUrls.push(r.photoIndoor);
        if (
          r.photoOutdoor &&
          r.photoOutdoor.trim() !== "" &&
          r.photoOutdoor !== r.photoIndoor
        ) {
          photoUrls.push(r.photoOutdoor);
        }
      });
      const uniquePhotoUrls = Array.from(
        new Set(photoUrls.filter(Boolean)),
      ).slice(0, 4);

      let photosImgHtml = "";
      if (uniquePhotoUrls.length > 0) {
        photosImgHtml = uniquePhotoUrls
          .map(
            (pUrl, pi) => `
          <div style="display: inline-block; margin: 3px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; background: white; text-align: center;">
            <img src="${pUrl}" width="100" height="75" style="border-radius: 2px; object-fit: cover;" />
            <div style="font-size: 7.5px; color: #64748b; font-weight: bold; margin-top: 1px;">Foto ${pi + 1}</div>
          </div>
        `,
          )
          .join("");
      } else {
        photosImgHtml =
          '<span style="color: #64748b; font-size: 8.5pt;">Tidak ada foto</span>';
      }

      html += `
        <tr>
          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
          <td>
            <strong>${firstRep.employeeName}</strong><br/>
            NIP. ${firstRep.nip}
          </td>
          <td>
            <strong>${firstRep.department}</strong><br/>
            <span style="color: #64748b; font-size: 8pt;">${firstRep.role}</span>
          </td>
          <td style="text-align: center; white-space: nowrap;">${firstRep.date}</td>
          <td>
            ${combinedActivitiesWord}
          </td>
          <td>
            <strong>${combinedLocNames}</strong><br/>
            <span style="font-family: monospace; font-size: 7.5pt; color: #0284c7;">(${combinedCoordinates})</span>
          </td>
          <td style="text-align: center; font-weight: bold; color: ${combinedStatuses.includes("Disetujui") ? "#047857" : "#b45309"};">
            ${combinedStatuses}
          </td>
          <td style="text-align: center;">${photosImgHtml}</td>
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

    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HPI_Laporan_Gabungan_Harian_${reportStartDateFilter || "Awal"}_s.d_${reportEndDateFilter || "Akhir"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowAlert(
      "Ekspor Word Sukses",
      `Laporan Word (.doc) berhasil diunduh (${sortedGroupKeys.length} tanggal kerja pegawai beserta gabungan dokumen foto)!`,
      "success",
    );
  };

  const uniqueDepartments = Array.from(
    new Set(employees.map((emp) => emp.department).filter(Boolean)),
  );

  // Searching and category filtering routines
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      deptFilter === "Semua" || emp.department === deptFilter;
    return matchesSearch && matchesFilter;
  });

  const uniqueReportDepartments = Array.from(
    new Set(reports.map((rep) => rep.department).filter(Boolean)),
  );

  const filteredReports = reports.filter((rep) => {
    const matchesSearch =
      rep.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.nip && rep.nip.toLowerCase().includes(searchQuery.toLowerCase())) ||
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      reportDeptFilter === "Semua" || rep.department === reportDeptFilter;
    const matchesLocation =
      reportLocationFilter === "Semua" ||
      (rep.location && rep.location.name === reportLocationFilter);

    let matchesDate = true;
    if (rep.date) {
      if (reportStartDateFilter && rep.date < reportStartDateFilter) {
        matchesDate = false;
      }
      if (reportEndDateFilter && rep.date > reportEndDateFilter) {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesFilter && matchesLocation && matchesDate;
  });

  const filteredAttendance = attendance.filter((att) => {
    const matchesSearch =
      att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      deptFilter === "Semua" || att.department === deptFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      className={`flex-1 flex flex-col md:flex-row min-w-0 ${isDarkMode ? "theme-dark bg-[#0a0f1d] border-slate-800 text-slate-100" : "theme-light bg-[#f1f5f9] border-slate-300 text-slate-800"} rounded-3xl border shadow-2xl overflow-hidden min-h-[720px] font-sans transition-all duration-200`}
    >
      {/* 1. LEFT SIDEBAR: PRISMA BRANDING & MENU CATEGORIES (DARK BLUE - #0e1623) */}
      <aside
        id="prisma_sidebar"
        className={`${isSidebarOpen ? "w-full md:w-64" : "w-0 md:w-16"} shrink-0 bg-[#0e1623] text-slate-300 transition-all duration-350 ease-in-out flex flex-col border-r border-[#1e293b] select-none overflow-hidden`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-3 bg-[#090d16] border-b border-[#1e2a3f] flex items-center gap-3">
          <div className={`${isSidebarOpen ? "w-14 h-14" : "w-10 h-10"} p-1 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300`}>
            <img 
              src={hpiLogo} 
              alt="HPI Logo" 
              className="w-full h-full object-contain rounded-lg" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className={isSidebarOpen ? "block" : "hidden md:hidden"}>
            <h2 className="font-sans font-black text-white tracking-widest text-sm leading-none">
              CS online
            </h2>
            <p className="text-[7.5px] font-sans font-bold text-slate-400 tracking-tighter mt-1">
              PT. HALEYORA POWERINDO BANGKA BELITUNG
            </p>
          </div>
        </div>

        {/* Sidebar Navigations */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {/* Section: Menu Utama */}
          <div className="space-y-1">
            <span
              className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
            >
              Menu Utama
            </span>
            <a
              id="sidebar_btn_dashboard"
              href="#ringkasan"
              onClick={(e) => {
                e.preventDefault();
                setActiveSubTab("ringkasan");
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "ringkasan"
                  ? "bg-[#1e293b] text-white border-l-4 border-sky-500 shadow-inner"
                  : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
              }`}
            >
              <FileText
                size={15}
                className={
                  activeSubTab === "ringkasan"
                    ? "text-sky-400"
                    : "text-slate-400"
                }
              />
              {isSidebarOpen && <span>Dashboard</span>}
            </a>

            <a
              id="sidebar_btn_pegawai"
              href="#pegawai"
              onClick={(e) => {
                e.preventDefault();
                setActiveSubTab("pegawai");
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "pegawai"
                  ? "bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner"
                  : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
              }`}
            >
              <Users
                size={15}
                className={
                  activeSubTab === "pegawai" ? "text-sky-400" : "text-slate-400"
                }
              />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Data Pegawai</span>
                  <span className="bg-[#3b82f6]/10 text-[#38bdf8] text-[9px] px-1.5 py-0.5 rounded-md font-mono border border-sky-500/20">
                    {employees.length}
                  </span>
                </div>
              )}
            </a>
          </div>

          {/* Section: Pelaporan */}
          <div className="space-y-1">
            <span
              className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
            >
              Data Pelaporan
            </span>
            <a
              id="sidebar_btn_laporan_primary"
              href="#laporan"
              onClick={(e) => {
                e.preventDefault();
                setActiveSubTab("laporan");
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "laporan"
                  ? "bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner"
                  : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
              }`}
            >
              <CheckSquare
                size={15}
                className={
                  activeSubTab === "laporan" ? "text-sky-450" : "text-slate-450"
                }
              />
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
            </a>
          </div>

          {/* Section: Master & Sistem */}
          <div className="space-y-1">
            <span
              className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
            >
              Sistem Master
            </span>
            <a
              id="sidebar_btn_master"
              href="#kehadiran"
              onClick={(e) => {
                e.preventDefault();
                setActiveSubTab("kehadiran");
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "kehadiran"
                  ? "bg-[#1e293b] text-white border-l-4 border-sky-500 shadow-inner"
                  : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
              }`}
            >
              <Layers
                size={15}
                className={
                  activeSubTab === "kehadiran"
                    ? "text-sky-400"
                    : "text-slate-400"
                }
              />
              {isSidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Data Master</span>
                  <ChevronRight size={12} className="text-slate-500" />
                </div>
              )}
            </a>
          </div>

          {/* Section: Akun */}
          <div className="space-y-1">
            <span
              className={`px-3 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block mb-2 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
            >
              Sesi Akun
            </span>
            <a
              id="sidebar_btn_pengaturan"
              href="#pengaturan"
              onClick={(e) => {
                e.preventDefault();
                setActiveSubTab("pengaturan");
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeSubTab === "pengaturan"
                  ? "bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner"
                  : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
              }`}
            >
              <Settings
                size={15}
                className={
                  activeSubTab === "pengaturan"
                    ? "text-sky-400"
                    : "text-slate-400"
                }
              />
              {isSidebarOpen && <span>Pengaturan Akun</span>}
            </a>
            {loggedInUserId === "admin" && (
              <a
                id="sidebar_btn_kelola_akun"
                href="#kelola_akun"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSubTab("kelola_akun");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer active:scale-95 ${
                  activeSubTab === "kelola_akun"
                    ? "bg-[#1e293b] text-[#38bdf8] border-l-4 border-sky-500 shadow-inner"
                    : "text-slate-400 hover:bg-[#151f32] hover:text-slate-100"
                }`}
              >
                <UserPlus
                  size={15}
                  className={
                    activeSubTab === "kelola_akun"
                      ? "text-sky-400"
                      : "text-slate-400"
                  }
                />
                {isSidebarOpen && <span>Kelola Akun User</span>}
              </a>
            )}
            <a
              id="sidebar_btn_logout"
              href="#logout"
              onClick={(e) => {
                e.preventDefault();
                if (onLogout) {
                  onLogout();
                } else {
                  onShowAlert(
                    "Pemberitahuan",
                    "Sesi login administrator terenkripsi aman.",
                    "alert"
                  );
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left cursor-pointer active:scale-95"
            >
              <LogOut size={15} />
              {isSidebarOpen && <span>Logout</span>}
            </a>
          </div>
        </div>

        {/* Footer Credit */}
        {isSidebarOpen && (
          <div className="p-4 bg-[#090d16] border-t border-[#1e2a3f] text-center">
            <span className="text-[9px] font-mono tracking-wider text-slate-500">
              v3.1 CS online SECURITY
            </span>
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
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-800/80">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold hidden sm:inline">
                ● Posko Bangka Belitung Online
              </span>
            </div>
          </div>

          {/* User Profile and Configuration Settings */}
          <div className="flex items-center gap-4">
            {/* Notification Indicator */}
            <div
              className="relative shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              onClick={() =>
                onShowAlert(
                  "Notifikasi",
                  "Database sistem terhubung real-time dengan aplikasi android.",
                  "success",
                )
              }
            >
              <Bell size={16} className="text-slate-400 hover:text-slate-200" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-550 rounded-full border border-[#0e1623]"></span>
            </div>

            {/* Admin Settings Gear */}
            <div
              className="shrink-0 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              onClick={() => {
                setActiveSubTab("pengaturan");
                setSearchQuery("");
              }}
            >
              <Settings
                size={16}
                className="text-slate-400 hover:text-slate-200"
              />
            </div>

            {/* Profile Avatar & Metadata */}
            <div
              className="flex items-center gap-2.5 pl-3 border-l border-slate-850 cursor-pointer select-none"
              onClick={() => {
                setActiveSubTab("pengaturan");
                setSearchQuery("");
              }}
            >
              <img
                src={currentUserAvatar}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border-2 border-indigo-500 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="hidden sm:block text-left text-xs leading-none">
                <p className="font-extrabold text-white">{currentUserName}</p>
                <span className="text-[9px] text-[#38bdf8] font-semibold mt-1 block">
                  {currentUserRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* B. DUAL DYNAMIC PANEL DISPLAY */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* TAB 1: DASHBOARD VIEW (RINGKASAN) */}
            {activeSubTab === "ringkasan" && (
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
                    <h1
                      id="prisma_dashboard_title"
                      className="text-xl md:text-2xl font-black text-slate-900 tracking-tight text-left"
                    >
                      Dashboard{" "}
                      <span className="text-[#0284c7]">
                        Pegawai & Pelaporan
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 text-left inline-block mr-2">
                      SISTEM INTEGRASI PENMAPILAN DATA UTAMA
                    </p>
                    <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full align-middle">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dbError ? "bg-rose-500 animate-pulse" : "bg-[#10b981] animate-pulse"}`} />
                      <span className="text-[8.5px] font-black tracking-wide text-slate-600 uppercase">
                        {dbError ? "OFFLINE" : "CLOUD REAL-TIME LISTENER ACTIVE (FIREBASE)"}
                      </span>
                    </div>
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
                      <h3 className="text-3xl font-black tracking-tight">
                        {employees.length}
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#e0f2fe]">
                        Total Pegawai
                      </p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <User size={24} className="fill-white" />
                    </div>
                  </div>

                  {/* Card 2: Total Pelaporan */}
                  <div className="bg-[#10b981] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">
                        {reports.length}
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#ecfdf5]">
                        Total Pelaporan
                      </p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <CheckSquare size={24} />
                    </div>
                  </div>

                  {/* Card 3: Laporan yang Disetujui */}
                  <div className="bg-[#8b5cf6] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">
                        {reports.filter((r) => r.status === "Disetujui").length}
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#f5f3ff]">
                        Laporan Disetujui
                      </p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl text-white">
                      <UserCheck size={24} className="fill-white" />
                    </div>
                  </div>

                  {/* Card 4: Laporan yang Pending */}
                  <div className="bg-[#f97316] p-5 rounded-2xl flex items-center justify-between text-white shadow-lg transition-transform hover:-translate-y-1 text-left">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">
                        {pendingReportsCount}
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[#fff7ed]">
                        Laporan Pending
                      </p>
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
                        <p className="text-[10px] text-slate-400">
                          Daftar Personil aktif Bangka Belitung.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveSubTab("pegawai");
                        }}
                        className="text-[#0284c7] hover:underline text-[10px] font-bold shrink-0"
                      >
                        Kelola Pegawai &gt;&gt;
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                      {employees.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">
                          Belum ada data pegawai terdaftar.
                        </div>
                      ) : (
                        employees.slice(0, 5).map((emp) => (
                          <div
                            key={emp.id}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-1 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {emp.avatar ? (
                                <img
                                  src={emp.avatar}
                                  alt={emp.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="bg-sky-100 text-sky-700 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs shrink-0">
                                  P
                                </div>
                              )}
                              <div className="text-left min-w-0">
                                <span className="font-bold text-slate-800 text-xs block truncate">
                                  {emp.name}
                                </span>
                                <span className="text-[9px] text-slate-404 font-mono block">
                                  NIP: {emp.nip}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg block max-w-xs truncate font-sans">
                                {emp.role}
                              </span>
                              <span className="text-[9px] text-indigo-550 uppercase tracking-widest font-black mt-0.5 block">
                                {emp.department}
                              </span>
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
                          LAPORAN TERBARU
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Aktivitas dan pertanggungjawaban lapangan terkini
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveSubTab("laporan");
                        }}
                        className="text-[#10b981] hover:underline text-[10px] font-bold shrink-0"
                      >
                        Kelola Laporan &gt;&gt;
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                      {reports.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-sans">
                          Belum ada data pelaporan masuk.
                        </div>
                      ) : (
                        reports.slice(0, 5).map((rep) => (
                          <div
                            key={rep.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50 px-1 rounded-lg transition-colors"
                          >
                            <div className="text-left space-y-0.5 min-w-0">
                              <span className="font-bold text-slate-850 text-xs block truncate max-w-[200px] sm:max-w-[240px]">
                                {rep.title}
                              </span>
                              <div className="flex items-center gap-2 text-[9px] text-slate-450 font-semibold flex-wrap">
                                <span className="font-extrabold text-slate-750">
                                  {rep.employeeName}
                                </span>
                                <span>•</span>
                                <span>{rep.date}</span>
                                <span>•</span>
                                <span className="bg-sky-50 text-[#0284c7] px-1.5 py-0.2 rounded text-[8px] font-black">
                                  {rep.type}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  rep.status === "Disetujui"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : rep.status === "Ditolak"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                }`}
                              >
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
                      <p className="font-extrabold leading-none">
                        Database Bangka Belitung Terverifikasi
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Data mutakhir: {employees.length} Pegawai,{" "}
                        {reports.length} Laporan Kerja.
                      </span>
                    </div>
                  </div>
                  <button
                    id="btn_view_report_shortcut"
                    onClick={() => setActiveSubTab("laporan")}
                    className="p-1 px-3 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Tinjau Laporan &gt;&gt;
                  </button>
                </div>
              </motion.div>
            )}

            {/* TAB 2: DATA PEGAWAI VIEW (With user request: includes and replaces previous KTA & Kehadiran, contains Add Employee Form Menu) */}
            {activeSubTab === "pegawai" && (
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
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">
                      Database & Data Pegawai
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Seluruh informasi data pokok pegawai PT. Haleyora
                      Powerindo Bangka Belitung
                    </p>
                  </div>

                  {/* Master triggers: tambah pegawai button */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        id="btn_tambah_pegawai_view"
                        onClick={() => setIsAddingInline(!isAddingInline)}
                        className="bg-[#0284c7] hover:bg-[#0369a1] text-white p-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow active:scale-95 cursor-pointer w-full sm:w-auto"
                      >
                        <Plus size={14} />
                        <span>
                          {isAddingInline
                            ? "Batal Tambah"
                            : "Tambah Pegawai Baru"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline form card panel for "+ Tambah Pegawai Baru" */}
                <AnimatePresence>
                  {isAddingInline && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-white border-2 border-indigo-200 p-5 rounded-2xl shadow-md overflow-hidden text-xs"
                    >
                      <div className="border-b border-slate-100 pb-2 mb-4">
                        <h3 className="text-sm font-black text-slate-800">
                          Formuler Tambah Data Pegawai Baru
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Silakan isi formulir dengan lengkap untuk mendaftarkan
                          personil baru ke database
                        </p>
                      </div>

                      <form
                        id="form_tambah_inline"
                        onSubmit={handleAddEmployeeSubmit}
                        className="space-y-4"
                      >
                        {/* Nama & NIP */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                              Nama Lengkap Pegawai *
                            </label>
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
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                              NIP (Nomor Induk Pegawai) *
                            </label>
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
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                              Jabatan Kerja *
                            </label>
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
                            <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                              Unit Kerja / Divisi *
                            </label>
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
                          <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5 block">
                            Avatar Profil (File lokal / URL) *
                          </label>
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
                                      onShowAlert(
                                        "Kapasitas Penuh",
                                        "Batas maksimal ukuran file gambar adalah 2MB.",
                                        "alert",
                                      );
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === "string") {
                                        setNewEmpAvatar(reader.result);
                                        onShowAlert(
                                          "File Terunggah",
                                          "Berhasil memproses & mengunggah file foto lokal Anda.",
                                          "success",
                                        );
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-normal pl-0.5">
                            Mendukung unggah berkas langsung dari komputer Anda
                            atau sematkan alamat url gambar eksternal.
                          </p>
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
                    <Search
                      className="absolute left-3 top-3 text-slate-400"
                      size={15}
                    />
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
                    <span className="text-[10px] uppercase font-black text-slate-400">
                      Filter Unit:
                    </span>
                    <select
                      id="pegawai_dept_filter"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="bg-[#f8fafc] border border-slate-300 rounded-xl p-2 px-3 text-slate-650 text-xs outline-none font-bold"
                    >
                      <option value="Semua">Semua Divisi / Unit Kerja</option>
                      {uniqueDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
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
                            <td
                              colSpan={5}
                              className="p-12 text-center text-slate-400 italic"
                            >
                              Tidak ditemukan data personil/pegawai yang sesuai
                              pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-55/70 transition-colors"
                            >
                              <td className="p-4 pl-6 flex items-center gap-3">
                                <img
                                  src={
                                    emp.avatar ||
                                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
                                  }
                                  alt={emp.name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <p className="font-sans font-extrabold text-slate-800 leading-tight text-xs">
                                    {emp.name}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-600">
                                {emp.nip || "199001150021"}
                              </td>
                              <td className="p-4 text-slate-705 font-bold">
                                {emp.department}
                              </td>
                              <td className="p-4 text-slate-700 font-extrabold">
                                {emp.role}
                              </td>
                              <td className="p-4 text-center pr-6">
                                {(isAdmin || emp.nip === loggedInUserId) && (
                                  <button
                                    id={`edit_emp_view_btn_${emp.id}`}
                                    onClick={() => setEditingEmployee(emp)}
                                    className="p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-colors inline-block cursor-pointer shadow-sm border border-slate-100 mr-1.5"
                                    title="Edit Pegawai"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    id={`delete_emp_view_btn_${emp.id}`}
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Apakah Anda yakin ingin menghapus data personil ${emp.name} (NIP: ${emp.nip}) dari database?`,
                                        )
                                      ) {
                                        onDeleteEmployee(emp.id);
                                        onShowAlert(
                                          "Pegawai Dihapus",
                                          `${emp.name} berhasil dihapus dari direktori database lokal.`,
                                          "success",
                                        );
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-colors inline-block cursor-pointer shadow-sm border border-slate-100"
                                    title="Hapus Pegawai"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
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
            {activeSubTab === "laporan" && (
              <motion.div
                key="tab_prisma_laporan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left font-sans"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-300">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900">
                      Data Pelaporan
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pantau, verifikasi, dan kelola pertanggungjawaban laporan
                      tugas personil lapangan
                    </p>
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
                    onClick={() => setReportSubTab("semua")}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all ${
                      reportSubTab === "semua"
                        ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    Laporan Terkirim ({reports.length})
                  </button>
                  <button
                    onClick={() => setReportSubTab("draft")}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all flex items-center gap-1.5 ${
                      reportSubTab === "draft"
                        ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                        : "text-slate-400 hover:text-slate-600"
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
                    onClick={() => setReportSubTab("rekap_kinerja")}
                    className={`pb-2 px-4 font-black uppercase tracking-wider relative transition-all flex items-center gap-1.5 ${
                      reportSubTab === "rekap_kinerja"
                        ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <span>Rekap Kinerja Bulanan</span>
                  </button>
                </div>

                {reportSubTab === "semua" && (
                  <>
                    {/* GOOGLE SHEETS INTEGRATION DASH WIDGET */}
                    <div
                      id="google_sheets_sync_card"
                      className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-sky-500/25 shadow-lg relative overflow-hidden"
                    >
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
                            <p className="text-[10px] text-slate-300 mt-1 font-sans">
                              Hubungkan database pelaporan PT Haleyora Powerindo
                              dengan Google Spreadsheet secara instan.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setIsSheetsWidgetCollapsed(!isSheetsWidgetCollapsed)
                          }
                          className="text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider bg-slate-900/40 p-1.5 px-3 rounded-lg border border-white/10 active:scale-95 transition cursor-pointer"
                        >
                          {isSheetsWidgetCollapsed
                            ? "Buka Monitor"
                            : "Sembunyikan"}
                        </button>
                      </div>

                      {!isSheetsWidgetCollapsed && (
                        <div className="pt-4 space-y-4 relative z-10 transition-all duration-300 text-left">
                          {!googleUser ? (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                              <div className="space-y-1 text-center md:text-left">
                                <span className="text-xs font-bold text-slate-200 block">
                                  Autentikasi Akun Google Dibutuhkan
                                </span>
                                <span className="text-[10px] text-slate-400 block max-w-xl leading-relaxed">
                                  Untuk mengaktifkan sinkronisasi otomatis,
                                  ekspor bulk, atau mengimpor data laporan
                                  eksternal, Anda harus menghubungkan sesi ke
                                  akun Google Drive/Sheets Anda.
                                </span>
                              </div>

                              <button
                                id="btn_google_signin_sheets"
                                disabled={isLoaderSheets}
                                onClick={handleConnectGoogle}
                                className="bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl transition shadow flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                              >
                                <svg
                                  version="1.1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 48 48"
                                  className="w-4 h-4"
                                >
                                  <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                  ></path>
                                  <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                  ></path>
                                  <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                  ></path>
                                  <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                  ></path>
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
                                    <img
                                      src={googleUser.photoURL}
                                      alt="Google avatar"
                                      className="w-8 h-8 rounded-full border border-sky-450"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="bg-sky-500 text-slate-950 w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono">
                                      G
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-bold text-sky-100 block text-xs">
                                      {googleUser.displayName ||
                                        "Google Account Connected"}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block font-mono">
                                      {googleUser.email}
                                    </span>
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
                                    <h4 className="text-[10px] uppercase font-black text-slate-300 tracking-wider">
                                      ● Opsi 1: Buat Spreadsheet Baru
                                    </h4>
                                    <p className="text-[10px] text-slate-400">
                                      Buat file spreadsheet kosong baru di
                                      Google Drive Anda lalu ekspor semua data
                                      pelaporan saat ini.
                                    </p>

                                    <div className="space-y-1 pt-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                        Judul Spreadsheet:
                                      </label>
                                      <input
                                        type="text"
                                        value={sheetsTitle}
                                        onChange={(e) =>
                                          setSheetsTitle(e.target.value)
                                        }
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
                                      <RefreshCw
                                        className="animate-spin"
                                        size={13}
                                      />
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
                                    <h4 className="text-[10px] uppercase font-black text-slate-300 tracking-wider">
                                      ● Opsi 2: Spreadsheet Tertarget (Dua Arah)
                                    </h4>
                                    <p className="text-[10px] text-slate-400">
                                      Gunakan ID Google Spreadsheet yang sudah
                                      ada untuk menimpa data atau mengimpor data
                                      balik ke sistem.
                                    </p>

                                    <div className="space-y-1 pt-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                        ID Spreadsheet Google:
                                      </label>
                                      <div className="flex gap-1.5">
                                        <input
                                          type="text"
                                          value={sheetsSpreadsheetId}
                                          onChange={(e) =>
                                            setSheetsSpreadsheetId(
                                              e.target.value,
                                            )
                                          }
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
                                      disabled={
                                        isLoaderSheets || !sheetsSpreadsheetId
                                      }
                                      className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow"
                                    >
                                      {isLoaderSheets ? (
                                        <RefreshCw
                                          className="animate-spin"
                                          size={12}
                                        />
                                      ) : (
                                        "Ekspor Timpa"
                                      )}
                                    </button>
                                    <button
                                      onClick={handleImportFromSheet}
                                      disabled={
                                        isLoaderSheets || !sheetsSpreadsheetId
                                      }
                                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow"
                                    >
                                      {isLoaderSheets ? (
                                        <RefreshCw
                                          className="animate-spin"
                                          size={12}
                                        />
                                      ) : (
                                        "Tarik Impor"
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Quick details */}
                              {sheetsSpreadsheetId && (
                                <div className="bg-slate-950/40 p-2.5 px-3 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
                                  <span className="truncate max-w-full font-mono">
                                    ID Aktif:{" "}
                                    <strong className="text-sky-305">
                                      {sheetsSpreadsheetId}
                                    </strong>
                                  </span>
                                  {sheetsSpreadsheetUrl && (
                                    <a
                                      href={sheetsSpreadsheetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-400 font-bold hover:underline flex items-center gap-1 shrink-0"
                                    >
                                      Buka Google Sheets di tab baru{" "}
                                      <ArrowUpRight size={10} />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Redesigned Patrol Data Controls & Table View */}
                    {(() => {
                      const totalPatroli = filteredReports.length;
                      const lokasiAktif = Array.from(new Set(reports.map(r => r.location?.name).filter(Boolean))).length;
                      
                      // SUDAH LAPORAN dibikin harian sesuai request user
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const todayPrefix = `${year}-${month}-${day}`;
                      const todayReports = reports.filter(r => r.date && (r.date.startsWith(todayPrefix) || r.date.includes(todayPrefix)));
                      
                      const sudahPatroli = Array.from(new Set(todayReports.map(r => r.employeeId))).length;
                      const belumPatroli = Math.max(0, employees.length - sudahPatroli);

                      const handleExportTableCurrent = () => {
                        const headers = ["NO INDUK", "NAMA & JABATAN", "UNIT KERJA", "WAKTU", "DESKRIPSI"];
                        const rows = filteredReports.map((r) => [
                          r.nip || "-",
                          `"${r.employeeName} (${r.role || 'SATPAM'})"`,
                          `"${r.department || r.location?.name || "-"}"`,
                          `"${r.date || "-"}"`,
                          `"${(r.description || "").replace(/"/g, '""')}"`
                        ]);
                        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                          + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `HPI_Data_Kegiatan_Filtered_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        onShowAlert("Ekspor Berhasil", "Tabel data kegiatan yang terfilter berhasil diekspor.", "success");
                      };

                      const handleDownloadImage = (url: string, filename: string) => {
                        fetch(url)
                          .then(resp => resp.blob())
                          .then(blob => {
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                          })
                          .catch(() => {
                            // fallback if CORS block
                            const link = document.createElement('a');
                            link.href = url;
                            link.target = "_blank";
                            link.click();
                          });
                      };

                      return (
                        <div className="space-y-6">
                          {/* 1. TOP STATS PANEL */}
                          <div id="patroli_stats_bento" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                            {/* TOTAL PATROLI */}
                            <div 
                              onClick={() => { setClickedStatType('total'); setStatModalSearch(''); }}
                              className="bg-[#2980b9] hover:bg-[#206390] rounded-xl shadow-sm text-white overflow-hidden flex items-stretch cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                              title="Klik untuk melihat daftar semua pegawai dikoordinasikan"
                            >
                              <div className="bg-black/15 p-4 px-6 flex items-center justify-center">
                                <Shield size={34} className="text-white" />
                              </div>
                              <div className="p-4 flex flex-col justify-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-1 font-sans">
                                  TOTAL LAPORAN
                                  <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Detail</span>
                                </span>
                                <h3 className="text-2xl font-black mt-0.5 font-mono">{totalPatroli}</h3>
                              </div>
                            </div>

                            {/* LOKASI AKTIF */}
                            <div className="bg-[#27ae60] rounded-xl shadow-sm text-white overflow-hidden flex items-stretch select-none">
                              <div className="bg-black/15 p-4 px-6 flex items-center justify-center">
                                <MapPin size={34} className="text-white" />
                              </div>
                              <div className="p-4 flex flex-col justify-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 font-sans">
                                  LOKASI AKTIF
                                </span>
                                <h3 className="text-2xl font-black mt-0.5 font-mono">{lokasiAktif}</h3>
                              </div>
                            </div>

                            {/* SUDAH PATROLI */}
                            <div 
                              onClick={() => { setClickedStatType('sudah'); setStatModalSearch(''); }}
                              className="bg-[#0097a7] hover:bg-[#007b88] rounded-xl shadow-sm text-white overflow-hidden flex items-stretch cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                              title="Klik untuk melihat daftar pegawai yang SUDAH mengirim laporan hari ini"
                            >
                              <div className="bg-black/15 p-4 px-6 flex items-center justify-center">
                                <UserCheck size={34} className="text-white" />
                              </div>
                              <div className="p-4 flex flex-col justify-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-100 flex items-center gap-1 font-sans">
                                  SUDAH LAPORAN (HARI INI)
                                  <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Detail</span>
                                </span>
                                <h3 className="text-2xl font-black mt-0.5 font-mono">{sudahPatroli}</h3>
                              </div>
                            </div>

                            {/* BELUM PATROLI */}
                            <div 
                              onClick={() => { setClickedStatType('belum'); setStatModalSearch(''); }}
                              className="bg-[#c0392b] hover:bg-[#a62c1f] rounded-xl shadow-sm text-white overflow-hidden flex items-stretch cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                              title="Klik untuk melihat daftar pegawai yang BELUM mengirim laporan hari ini"
                            >
                              <div className="bg-black/15 p-4 px-6 flex items-center justify-center">
                                <UserX size={34} className="text-white" />
                              </div>
                              <div className="p-4 flex flex-col justify-center">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-100 flex items-center gap-1 font-sans">
                                  BELUM LAPORAN (HARI INI)
                                  <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Detail</span>
                                </span>
                                <h3 className="text-2xl font-black mt-0.5 font-mono">{belumPatroli}</h3>
                              </div>
                            </div>
                          </div>

                          {/* 2. EXPORT BULK CONTROL ROW */}
                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              onClick={handleExportExcel}
                              className="bg-[#27ae60] hover:bg-[#219150] text-white p-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-extrabold transition cursor-pointer active:scale-95 shadow font-sans uppercase tracking-wider border-none"
                            >
                              <Download size={13} />
                              <span>Export Harian</span>
                            </button>
                            <button
                              onClick={handleExportExcel}
                              className="bg-[#2980b9] hover:bg-[#1f5f8a] text-white p-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-extrabold transition cursor-pointer active:scale-95 shadow font-sans uppercase tracking-wider border-none"
                            >
                              <Calendar size={13} />
                              <span>Export Bulanan</span>
                            </button>
                            <button
                              onClick={handleExportWord}
                              className="bg-[#2c3e50] hover:bg-[#1a252f] text-white p-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-extrabold transition cursor-pointer active:scale-95 shadow font-sans uppercase tracking-wider border-none"
                              title="Export gabungan harian ke format Word"
                            >
                              <FileText size={13} />
                              <span>Export Word</span>
                            </button>
                            <button
                              onClick={handleExportTableCurrent}
                              className="bg-[#e67e22] hover:bg-[#d35400] text-white p-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs font-extrabold transition cursor-pointer active:scale-95 shadow font-sans uppercase tracking-wider border-none"
                            >
                              <Download size={13} />
                              <span>Export Tabel Ini</span>
                            </button>
                          </div>

                          {/* 3. DATE & LOCATION FILTERS CARD */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                              {/* DARI */}
                              <div className="space-y-1 text-left">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  DARI
                                </label>
                                <input
                                  type="date"
                                  value={reportStartDateFilter}
                                  onChange={(e) => setReportStartDateFilter(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-sky-500/50 font-bold"
                                />
                              </div>

                              {/* SAMPAI */}
                              <div className="space-y-1 text-left">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  SAMPAI
                                </label>
                                <input
                                  type="date"
                                  value={reportEndDateFilter}
                                  onChange={(e) => setReportEndDateFilter(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-sky-500/50 font-bold"
                                />
                              </div>

                              {/* UNIT KERJA */}
                              <div className="space-y-1 text-left">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                  UNIT KERJA
                                </label>
                                <select
                                  value={reportDeptFilter}
                                  onChange={(e) => setReportDeptFilter(e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-sky-500/50 font-bold"
                                >
                                  <option value="Semua">Semua Unit Kerja</option>
                                  {Array.from(new Set([
                                    ...employees.map(e => e.department).filter(Boolean),
                                    ...reports.map(r => r.department).filter(Boolean)
                                  ])).sort().map((dept) => (
                                    <option key={dept} value={dept}>
                                      {dept}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* ACTIONS */}
                              <div className="flex gap-2 w-full">
                                <button
                                  onClick={() => {
                                    onShowAlert("Tampilkan Data", `Menampilkan ${totalPatroli} laporan patroli.`, "success");
                                  }}
                                  className="flex-1 bg-[#1e88e5] hover:bg-[#1565c0] text-white font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Search size={14} />
                                  <span>Tampilkan</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setReportStartDateFilter("");
                                    setReportEndDateFilter("");
                                    setReportLocationFilter("Semua");
                                    setReportDeptFilter("Semua");
                                    setSearchQuery("");
                                  }}
                                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs p-2.5 px-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
                                  title="Reset filter"
                                >
                                  <RefreshCw size={13} />
                                  <span>Reset</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 4. DATA KEGIATAN TABLE CONTAINER */}
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                            {/* Blue Header Row */}
                            <div className="bg-[#1e2d40] text-white p-4 px-5 flex flex-col md:flex-row items-center justify-between gap-3 font-sans">
                              <div className="flex items-center gap-2">
                                <Database size={15} className="text-sky-300" />
                                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-100">Data Kegiatan</span>
                              </div>

                              <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                                <input
                                  type="text"
                                  id="report_table_inner_search"
                                  placeholder="Cari Nama, No Induk, Lokasi..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full bg-[#27384d] border border-[#324861] rounded-lg py-1.5 pl-8.5 pr-3 text-white text-xs outline-none focus:ring-1 focus:ring-sky-500/50"
                                />
                              </div>

                              <div className="text-[10px] text-slate-300 tracking-wider font-semibold">
                                Menampilkan <strong className="text-white">{totalPatroli}</strong> dari <strong className="text-white">{reports.length}</strong> data
                              </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-[#1f364d] text-slate-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-700/50">
                                    <th className="p-4 text-center w-12 font-black text-slate-200">#</th>
                                    <th className="p-4 font-black text-slate-200">NO INDUK</th>
                                    <th className="p-4 font-black text-slate-200">NAMA & JABATAN</th>
                                    <th className="p-4 font-black text-slate-200">UNIT KERJA</th>
                                    <th className="p-4 font-black text-slate-200">WAKTU</th>
                                    <th className="p-4 font-black text-slate-200">DESKRIPSI</th>
                                    <th className="p-4 text-center w-24 font-black text-slate-200">FOTO</th>
                                    <th className="p-4 text-center w-24 font-black text-slate-200">LOKASI</th>
                                    <th className="p-4 text-center w-20 font-black text-slate-200 text-sky-400">AKSI</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-sans text-slate-700 text-xs font-semibold">
                                  {filteredReports.length === 0 ? (
                                    <tr>
                                      <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                                        Tidak ada data laporan harian yang ditemukan.
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredReports.map((rep, idx) => {
                                      // Clean and split date and time values
                                      const dateParts = rep.date ? rep.date.split(' ') : ['2026-06-11'];
                                      const dateStr = dateParts[0];
                                      const timeStr = dateParts[1] || '00:04';
                                      const displayNip = rep.nip || "00265074BBL";

                                      return (
                                        <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                                          <td className="p-4 text-center text-slate-400 font-bold font-mono">{idx + 1}</td>
                                          <td className="p-4 font-mono font-bold text-slate-600">{displayNip}</td>
                                          <td className="p-4">
                                            <div className="font-extrabold text-slate-900 uppercase text-xs">{rep.employeeName}</div>
                                            <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wide mt-0.5">{rep.role || "SATPAM"}</div>
                                          </td>
                                          <td className="p-4 text-slate-600">{rep.department || rep.location?.name || "PT. PLN (PERSERO) ULP MANGGAR"}</td>
                                          <td className="p-4 font-mono text-slate-500">
                                            <div className="font-bold">{dateStr}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 font-bold">{timeStr}</div>
                                          </td>
                                          <td className="p-4 text-slate-500 max-w-xs truncate" title={rep.description}>
                                            {rep.description || `Laporan patroli dari ${rep.location?.name}`}
                                          </td>
                                          <td className="p-4 text-center">
                                            <button
                                              onClick={() => setActivePhotoModalRow(rep)}
                                              className="mx-auto w-8 h-8 rounded-lg bg-[#4fc3f7] hover:bg-[#29b6f6] text-white flex items-center justify-center transition active:scale-95 shadow-sm cursor-pointer border-none"
                                              title="Lihat Foto Kerja"
                                            >
                                              <Camera size={14} />
                                            </button>
                                          </td>
                                          <td className="p-4 text-center">
                                            <button
                                              onClick={() => setActiveMapModalRow(rep)}
                                              className="mx-auto w-8 h-8 rounded-lg bg-[#4caf50] hover:bg-[#43a047] text-white flex items-center justify-center transition active:scale-95 shadow-sm cursor-pointer border-none"
                                              title="Lihat Peta Lokasi"
                                            >
                                              <MapPin size={14} />
                                            </button>
                                          </td>
                                          <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                              {(isAdmin || rep.nip === loggedInUserId) && (
                                                <>
                                                  <button
                                                    onClick={() => setEditingReport(rep)}
                                                    className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700/90 text-white flex items-center justify-center transition active:scale-95 shadow-sm cursor-pointer border-none"
                                                    title="Edit Data Laporan"
                                                  >
                                                    <Pencil size={11} />
                                                  </button>
                                                  <button
                                                    onClick={() => setDeletingReportId(rep.id)}
                                                    className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition active:scale-95 shadow-sm cursor-pointer border-none"
                                                    title="Hapus Data Laporan"
                                                  >
                                                    <Trash2 size={11} />
                                                  </button>
                                                </>
                                              )}
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

                          {/* 5. DYNAMIC VIEWER MODALS FOR FOTO & MAP */}
                          {/* Photo Viewer Modal */}
                          {activePhotoModalRow && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                              <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-left">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                  <h3 className="font-extrabold text-slate-900 text-sm">
                                    Dokumentasi Kegiatan — {activePhotoModalRow.employeeName}
                                  </h3>
                                  <button
                                    onClick={() => setActivePhotoModalRow(null)}
                                    className="text-slate-400 hover:text-slate-600 border border-slate-200 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>

                                {/* Body */}
                                <div className="p-5 flex flex-col items-center justify-center bg-slate-50 min-h-[300px]">
                                  {(() => {
                                    const photos: { label: string; url: string }[] = [];
                                    if (activePhotoModalRow.photoIndoor) {
                                      photos.push({ label: "SEBELUM KERJA", url: activePhotoModalRow.photoIndoor });
                                    }
                                    if (activePhotoModalRow.photoOutdoor && activePhotoModalRow.photoOutdoor !== activePhotoModalRow.photoIndoor) {
                                      photos.push({ label: "SETELAH KERJA", url: activePhotoModalRow.photoOutdoor });
                                    }
                                    if (photos.length === 0 && activePhotoModalRow.imagePath) {
                                      photos.push({ label: "DOKUMENTASI LAPANGAN", url: activePhotoModalRow.imagePath });
                                    }

                                    if (photos.length === 0) {
                                      return (
                                        <div className="flex flex-col items-center space-y-2 text-slate-400 py-10">
                                          <CameraOff size={24} className="text-slate-300" />
                                          <span className="text-slate-450 italic text-xs">
                                            Tidak ada dokumentasi foto kerja yang tersedia.
                                          </span>
                                        </div>
                                      );
                                    }

                                     return (
                                       <div className={`grid ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 w-full`}>
                                         {photos.map((item, idx) => {
                                           const isTrimmed = item.url && item.url.includes("placeholder_trimmed");

                                           return (
                                             <div key={idx} className="flex flex-col items-stretch space-y-2 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs">
                                               <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 text-center block pt-1">
                                                 {item.label}
                                               </span>
                                               <div className="border border-slate-150 bg-slate-100 rounded-xl overflow-hidden relative flex items-center justify-center aspect-square shadow-inner py-6">
                                                 {isTrimmed ? (
                                                   <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 h-full w-full">
                                                     <div className="p-1 px-2.5 bg-amber-50 rounded-full text-amber-600 font-extrabold text-[9px] tracking-wide uppercase border border-amber-100 animate-pulse">
                                                       Sinkronisasi Cloud...
                                                     </div>
                                                     <span className="text-[10.5px] font-bold text-slate-500 leading-normal max-w-[150px]">
                                                       Foto diringkas lokal. Sedang mengunduh foto asli dari Cloud secara otomatis...
                                                     </span>
                                                   </div>
                                                 ) : (
                                                   <img
                                                     src={item.url}
                                                     alt={item.label}
                                                     className="w-full h-full object-cover rounded-xl"
                                                     referrerPolicy="no-referrer"
                                                   />
                                                 )}
                                               </div>

                                               {/* Per-photo download action button */}
                                               <button
                                                 type="button"
                                                 disabled={isTrimmed}
                                                 onClick={() => {
                                                   handleDownloadImage(item.url, `HPI_${item.label.replace(/\s+/g, '_')}_${activePhotoModalRow.employeeName.replace(/\s+/g, '_')}_${activePhotoModalRow.date.replace(/[\s:]+/g, '_')}.jpg`);
                                                 }}
                                                 className={`mt-1 w-full text-xs font-black py-2.5 px-3 rounded-xl transition duration-150 border-none flex items-center justify-center gap-1.5 shadow-xs ${
                                                   isTrimmed 
                                                     ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                                     : "bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-850 cursor-pointer"
                                                 }`}
                                               >
                                                 <Download size={11} />
                                                 <span>{isTrimmed ? "Mengunduh Foto..." : "Unduh Foto"}</span>
                                               </button>
                                             </div>
                                           );
                                         })}
                                       </div>
                                     );
                                   })()}
                                 </div>

                                 {/* Footer */}
                                 <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                                   <div className="text-[10px] text-slate-400 font-bold max-w-[200px]">
                                     Format: JPEG • Resolusi Terkompresi Pintar
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <button
                                       onClick={() => {
                                         const photosToDownload: { label: string; url: string }[] = [];
                                         if (activePhotoModalRow.photoIndoor) {
                                           photosToDownload.push({ label: "SEBELUM", url: activePhotoModalRow.photoIndoor });
                                         }
                                         if (activePhotoModalRow.photoOutdoor && activePhotoModalRow.photoOutdoor !== activePhotoModalRow.photoIndoor) {
                                           photosToDownload.push({ label: "SETELAH", url: activePhotoModalRow.photoOutdoor });
                                         }
                                         if (photosToDownload.length === 0 && activePhotoModalRow.imagePath) {
                                           photosToDownload.push({ label: "DOKUMENTASI", url: activePhotoModalRow.imagePath });
                                         }

                                         const validPhotos = photosToDownload.filter(p => p.url && !p.url.includes("placeholder_trimmed"));

                                         if (validPhotos.length === 0) {
                                           onShowAlert("Foto Sedang Dimuat", "Silakan tunggu sampai seluruh lampiran foto selesai diunduh dari Cloud Database.", "alert");
                                           return;
                                         }

                                        validPhotos.forEach((item, index) => {
                                          setTimeout(() => {
                                            handleDownloadImage(item.url, `HPI_${item.label}_${activePhotoModalRow.employeeName.replace(/\s+/g, '_')}_${activePhotoModalRow.date.replace(/[\s:]+/g, '_')}.jpg`);
                                          }, index * 400); // delay to prevent popups from getting blocked
                                        });

                                        onShowAlert("Unduhan Dimulai", `Memproses ${validPhotos.length} foto kegiatan untuk diunduh ke perangkat Anda.`, "success");
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer border-none"
                                    >
                                      <Download size={13} />
                                      <span>Download Semua</span>
                                    </button>
                                    <button
                                      onClick={() => setActivePhotoModalRow(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer border border-slate-300"
                                    >
                                      Tutup
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Map Viewer Modal */}
                          {activeMapModalRow && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-left">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                  <h3 className="font-extrabold text-slate-900 text-sm">
                                    Lokasi — {activeMapModalRow.employeeName}
                                  </h3>
                                  <button
                                    onClick={() => setActiveMapModalRow(null)}
                                    className="text-slate-400 hover:text-slate-600 border border-slate-200 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>

                                {/* Body */}
                                <div className="p-4 bg-slate-50">
                                  {activeMapModalRow.location?.coordinates ? (
                                    <LeafletMap
                                      coordinates={activeMapModalRow.location.coordinates}
                                      name={activeMapModalRow.location.name}
                                    />
                                  ) : (
                                    <div className="w-full h-80 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-450 italic text-xs">
                                      GPS Koordinat tidak tersedia untuk laporan ini.
                                    </div>
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/50">
                                  {activeMapModalRow.location?.coordinates && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeMapModalRow.location.coordinates)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-[#2980b9] hover:bg-[#1a5f8a] text-white text-xs font-bold py-2 px-4 rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 text-center leading-loose font-sans uppercase tracking-wider text-white"
                                    >
                                      <Globe size={13} />
                                      <span>Buka Google Maps</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setActiveMapModalRow(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold py-2 px-4 rounded-xl transition active:scale-95 cursor-pointer border border-slate-350"
                                  >
                                    Tutup
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {reportSubTab === "draft" && (
                  <div className="space-y-4">
                    {/* Draft Info Header */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-50 border border-amber-500/30 p-5 rounded-2xl text-xs space-y-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle size={16} />
                        <span className="font-extrabold uppercase tracking-wide">
                          Pemberitahuan Sistem Draft Offline (HPI CS System)
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Laporan kerja di bawah ini saat ini tersimpan aman di{" "}
                        <strong>Penyimpanan Lokal (Browser Storage)</strong>{" "}
                        Anda karena disimpan manual atau saat koneksi internet
                        terganggu. Anda dapat menyunting draft ini kembali atau
                        mengunggahnya secara massal / satu-per-satu ke server
                        utama setelah jaringan terhubung.
                      </p>

                      {draftReports.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2.5">
                          <button
                            onClick={onSyncDrafts}
                            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition text-[11px] uppercase tracking-wide"
                          >
                            <RefreshCw size={13} className="animate-spin" />
                            <span>
                              SINKRONISASIKAN SEMUA DRAFT SEKARANG (
                              {draftReports.length})
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {draftReports.length === 0 ? (
                      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 italic text-xs space-y-1">
                        <p>
                          Tidak ada laporan draft yang tersimpan di perangkat
                          ini.
                        </p>
                        <p className="text-[10px] text-slate-400 not-italic font-sans">
                          💡{" "}
                          <em>
                            Anda dapat menggunakan tombol "Tambah Data
                            Pelaporan" lalu klik "Simpan sebagai Draft" untuk
                            membuat laporan sementara.
                          </em>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 font-sans">
                        {draftReports.map((rep) => (
                          <div
                            key={rep.id}
                            className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4 shadow-sm relative hover:border-amber-500/40 transition text-slate-800"
                          >
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
                                {rep.department
                                  ? rep.department.toUpperCase()
                                  : "OPERASIONAL"}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-xs leading-none">
                                  {rep.employeeName}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-tight">
                                  Tanggal Buat:{" "}
                                  <span className="font-mono text-slate-600 font-bold">
                                    {rep.date}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Body contents */}
                            <div className="space-y-2 pl-1 font-sans">
                              <h5 className="font-black text-slate-900 text-sm leading-tight">
                                {rep.title}
                              </h5>
                              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-w-4xl">
                                {rep.description}
                              </p>

                              {/* Metadata list */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8fafc] p-3 rounded-xl border border-slate-200 text-[10px] my-3 max-w-3xl">
                                <div>
                                  <span className="text-slate-400 block font-bold uppercase text-[9px]">
                                    NIP Personil:
                                  </span>
                                  <span className="text-slate-700 font-mono font-bold leading-normal">
                                    {rep.nip}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold uppercase text-[9px]">
                                    Jabatan:
                                  </span>
                                  <span className="text-[#0284c7] font-bold leading-normal">
                                    {rep.role}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold uppercase text-[9px]">
                                    Unit Kerja:
                                  </span>
                                  <span className="text-slate-700 font-bold leading-normal">
                                    {rep.department}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold uppercase text-[9px]">
                                    Sandi Laporan:
                                  </span>
                                  <span className="text-slate-700 font-mono font-bold leading-normal">
                                    {rep.id}
                                  </span>
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

                {reportSubTab === "rekap_kinerja" &&
                  (() => {
                    const belongsToMonthYear = (
                      dateStr: string,
                      targetMonth: number,
                      targetYear: number,
                    ) => {
                      if (!dateStr) return false;
                      const parts = dateStr.split("-");
                      if (parts.length < 2) return false;
                      const yr = parseInt(parts[0], 10);
                      const mo = parseInt(parts[1], 10);
                      return yr === targetYear && mo === targetMonth;
                    };

                    const monthsList = [
                      { value: 1, label: "Januari" },
                      { value: 2, label: "Februari" },
                      { value: 3, label: "Maret" },
                      { value: 4, label: "April" },
                      { value: 5, label: "Mei" },
                      { value: 6, label: "Juni" },
                      { value: 7, label: "Juli" },
                      { value: 8, label: "Agustus" },
                      { value: 9, label: "September" },
                      { value: 10, label: "Oktober" },
                      { value: 11, label: "November" },
                      { value: 12, label: "Desember" },
                    ];

                    const yearsList = [2024, 2025, 2026, 2027];

                    const filteredEmployees = employees.filter((emp) => {
                      if (!rekapSearchText.trim()) return true;
                      const query = rekapSearchText.toLowerCase();
                      return (
                        emp.name.toLowerCase().includes(query) ||
                        emp.nip.toLowerCase().includes(query) ||
                        (emp.department &&
                          emp.department.toLowerCase().includes(query)) ||
                        (emp.role && emp.role.toLowerCase().includes(query))
                      );
                    });

                    const getWeekdaysInMonth = (month: number, year: number) => {
                      const list: string[] = [];
                      const daysInMonthVal = new Date(year, month, 0).getDate();
                      for (let d = 1; d <= daysInMonthVal; d++) {
                        const dateObj = new Date(year, month - 1, d);
                        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                          if (!isTanggalMerah(year, month, d)) {
                            const mmStr = String(month).padStart(2, "0");
                            const ddStr = String(d).padStart(2, "0");
                            list.push(`${year}-${mmStr}-${ddStr}`);
                          }
                        }
                      }
                      return list;
                    };

                    const weekdaysInMonthList = getWeekdaysInMonth(rekapMonth, rekapYear);
                    const activeWeekdaysList = weekdaysInMonthList;

                    const totalHariKerja = activeWeekdaysList.length;

                    const employeePerformance = filteredEmployees.map((emp) => {
                      const empReports = reports.filter((r) => {
                        const isSameId = r.employeeId === emp.id;
                        const isSameNip =
                          r.nip && emp.nip && r.nip.trim() === emp.nip.trim();
                        const isSameName =
                          r.employeeName &&
                          emp.name &&
                          r.employeeName.toLowerCase().trim() ===
                            emp.name.toLowerCase().trim();
                        return (
                          (isSameId || isSameNip || isSameName) &&
                          belongsToMonthYear(r.date, rekapMonth, rekapYear)
                        );
                      });

                      const uniqueDates = Array.from(
                        new Set(empReports.map((r) => r.date).filter(Boolean)),
                      );
                      const workingDaysCount = uniqueDates.length;

                      // Check which weekdays has valid reporting photo
                      let countHariKirimLaporan = 0;
                      activeWeekdaysList.forEach(dayStr => {
                        const repsOnDay = empReports.filter((r) => {
                          if (!r.date) return false;
                          if (r.date.startsWith(dayStr)) return true;
                          return r.date.slice(0, 10) === dayStr;
                        });

                        const hasPhoto = repsOnDay.some(r => 
                          (r.photoIndoor && r.photoIndoor.trim() !== "") ||
                          (r.photoOutdoor && r.photoOutdoor.trim() !== "")
                        );
                        if (hasPhoto) {
                          countHariKirimLaporan++;
                        }
                      });

                      const photoPercentage = totalHariKerja > 0 
                        ? Math.round((countHariKirimLaporan / totalHariKerja) * 100)
                        : 0;

                      // Count total photos
                      const totalPhotosOnWorkingDays = uniqueDates.reduce(
                        (sum, date) => {
                          const repsOnDate = empReports.filter(
                            (r) => r.date === date || (r.date && r.date.slice(0, 10) === date),
                          );
                          const countIndoor = repsOnDate.filter(
                            (r) => r.photoIndoor && r.photoIndoor.trim() !== ""
                          ).length;
                          const countOutdoor = repsOnDate.filter(
                            (r) => r.photoOutdoor && r.photoOutdoor.trim() !== ""
                          ).length;
                          return sum + Math.min(4, countIndoor) + Math.min(4, countOutdoor);
                        },
                        0,
                      );

                      const countIndoorDays = empReports.filter(
                        (r) => r.photoIndoor && r.photoIndoor.trim() !== "",
                      ).length;
                      const countOutdoorDays = empReports.filter(
                        (r) => r.photoOutdoor && r.photoOutdoor.trim() !== "",
                      ).length;

                      let scoreText = "KURANG";
                      let scoreColor = "bg-rose-500 text-white";
                      if (totalHariKerja > 0) {
                        if (photoPercentage >= 90) {
                          scoreText = "SANGAT BAIK";
                          scoreColor = "bg-emerald-600 text-white";
                        } else if (photoPercentage >= 60) {
                          scoreText = "BAIK (OPTIMAL)";
                          scoreColor = "bg-sky-600 text-white font-black";
                        } else if (photoPercentage >= 30) {
                          scoreText = "CUKUP";
                          scoreColor = "bg-amber-500 text-slate-950 font-black";
                        } else {
                          scoreText = "KURANG";
                          scoreColor = "bg-rose-500 text-white";
                        }
                      }

                      return {
                        employee: emp,
                        reportsCount: empReports.length,
                        workingDaysCount,
                        totalPhotosOnWorkingDays,
                        targetPhotosCount: totalHariKerja * 8, // custom target representation
                        photoPercentage,
                        countIndoorDays,
                        countOutdoorDays,
                        indoorPercentage: photoPercentage, // fallback support
                        outdoorPercentage: photoPercentage, // fallback support
                        scoreText,
                        scoreColor,
                        countHariKirimLaporan,
                        totalHariKerja,
                        performancePercent: photoPercentage,
                      };
                    });

                    const totalActiveInRekap = employeePerformance.filter(
                      (x) => x.reportsCount > 0,
                    ).length;
                    const perfectPerformers = employeePerformance.filter(
                      (x) => x.photoPercentage >= 90,
                    ).length;
                    const totalMonthlyPhotos = reports.filter(
                      (r) =>
                        belongsToMonthYear(r.date, rekapMonth, rekapYear)
                    ).reduce((acc, r) => {
                      let cnt = 0;
                      if (r.photoIndoor && r.photoIndoor.trim() !== "") cnt++;
                      if (r.photoOutdoor && r.photoOutdoor.trim() !== "" && r.photoOutdoor !== r.photoIndoor) cnt++;
                      return acc + cnt;
                    }, 0);

                    return (
                      <div className="space-y-5 text-slate-800 font-sans mt-3">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-col gap-1.5 text-left">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                PILIH BULAN
                              </span>
                              <select
                                value={rekapMonth}
                                onChange={(e) =>
                                  setRekapMonth(Number(e.target.value))
                                }
                                className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 transition-colors w-40 cursor-pointer text-left"
                              >
                                {monthsList.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 text-left">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                TAHUN
                              </span>
                              <select
                                value={rekapYear}
                                onChange={(e) =>
                                  setRekapYear(Number(e.target.value))
                                }
                                className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-sky-500 transition-colors w-28 cursor-pointer text-left"
                              >
                                {yearsList.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px] text-left">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                PENCARIAN PEGAWAI
                              </span>
                              <div className="relative">
                                <Search
                                  size={14}
                                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Cari nama, NIP, atau unit kerja..."
                                  value={rekapSearchText}
                                  onChange={(e) =>
                                    setRekapSearchText(e.target.value)
                                  }
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
                                setRekapSearchText("");
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer active:scale-95"
                            >
                              Reset Filter
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="space-y-1 text-left">
                              <span className="text-[9px] font-black text-sky-600 block uppercase tracking-wider">
                                ● Pegawai Kirim Laporan
                              </span>
                              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                {totalActiveInRekap} / {employees.length}
                              </h3>
                              <p className="text-[9px] text-slate-400 font-semibold">
                                Tercatat aktif di bulan{" "}
                                {
                                  monthsList.find((m) => m.value === rekapMonth)
                                    ?.label
                                }
                              </p>
                            </div>
                            <div className="bg-sky-100/85 text-sky-600 p-2.5 rounded-xl">
                              <Users size={18} />
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="space-y-1 text-left">
                              <span className="text-[9px] font-black text-emerald-600 block uppercase tracking-wider">
                                ● Kepatuhan Sempurna (≥90%)
                              </span>
                              <h3 className="text-xl font-extrabold text-slate-905 tracking-tight">
                                {perfectPerformers} Pegawai
                              </h3>
                              <p className="text-[9px] text-slate-400 font-semibold">
                                Mengirim foto Indoor & Outdoor rutin
                              </p>
                            </div>
                            <div className="bg-emerald-100/85 text-emerald-600 p-2.5 rounded-xl">
                              <CheckCircle2 size={18} />
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="space-y-1 text-left">
                              <span className="text-[9px] font-black text-teal-600 block uppercase tracking-wider">
                                ● Total Foto Sebelum & Sesudah
                              </span>
                              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                {totalMonthlyPhotos} Foto
                              </h3>
                              <p className="text-[9px] text-slate-400 font-semibold">
                                Total dokumentasi foto masuk dan pulang kerja terkirim
                              </p>
                            </div>
                            <div className="bg-teal-100/85 text-teal-600 p-2.5 rounded-xl">
                              <Camera size={18} />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-205 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                                  <th className="py-3 px-4 text-center w-12">
                                    No
                                  </th>
                                  <th className="py-3 px-4">
                                    Nama Personil / NIP
                                  </th>
                                  <th className="py-3 px-4">Jabatan & Unit</th>
                                  <th className="py-3 px-4 text-center">
                                    Hari Memenuhi Kewajiban (Kirim Foto)
                                  </th>
                                  <th className="py-3 px-4 text-center">
                                    Persentase Kinerja Bulanan
                                  </th>
                                  <th className="py-3 px-4 text-center">
                                    Status Rekapitulasi
                                  </th>
                                  <th className="py-3 px-4 text-center w-24">
                                    Aksi
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {employeePerformance.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="py-10 text-center text-slate-400 italic font-semibold"
                                    >
                                      Tidak ada pegawai yang ditemukan. Silakan
                                      sesuaikan pencarian.
                                    </td>
                                  </tr>
                                ) : (
                                  employeePerformance.map((item, index) => {
                                    const emp = item.employee;
                                    return (
                                      <tr
                                        key={emp.id}
                                        className="hover:bg-slate-50/50 transition-colors"
                                      >
                                        <td className="py-3 px-4 text-center text-slate-400 font-bold font-mono">
                                          {index + 1}
                                        </td>

                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-3">
                                            {emp.avatar ? (
                                              <img
                                                src={emp.avatar}
                                                alt={emp.name}
                                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                referrerPolicy="no-referrer"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center shrink-0 uppercase border border-slate-200">
                                                {emp.name.slice(0, 2)}
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-extrabold text-slate-800 tracking-tight leading-tight">
                                                {emp.name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                                                NIP {emp.nip}
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        <td className="py-3 px-4 text-left">
                                          <div className="font-bold text-slate-700 leading-tight">
                                            {emp.role || "Tenaga Lapangan"}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-bold tracking-tight uppercase mt-0.5">
                                            {emp.department || "Operasional"}
                                          </div>
                                        </td>

                                        <td className="py-3 px-4 text-center">
                                          <span className="font-mono bg-slate-100 text-[#0f766e] border border-slate-200 px-2 rounded-lg font-bold whitespace-nowrap">
                                            {item.countHariKirimLaporan} / {item.totalHariKerja} Hari
                                          </span>
                                        </td>

                                        <td className="py-3 px-4">
                                          <div className="flex flex-col items-center justify-center gap-1.5">
                                            <div className="font-mono font-black text-slate-700 text-[11px] flex items-center gap-1">
                                              <span>
                                                {item.performancePercent}% Kinerja
                                              </span>
                                            </div>
                                            {item.totalHariKerja > 0 ? (
                                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-300 ${item.photoPercentage >= 80 ? "bg-emerald-500" : item.photoPercentage >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                                                  style={{
                                                    width: `${item.photoPercentage}%`,
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-[10px] text-slate-400 italic">
                                                Tidak ada hari kerja
                                              </span>
                                            )}
                                            {item.totalHariKerja > 0 && (
                                              <span
                                                className={`text-[9px] font-black ${item.performancePercent >= 80 ? "text-emerald-600" : item.performancePercent >= 50 ? "text-amber-600" : "text-rose-600"}`}
                                              >
                                                {item.countHariKirimLaporan} Hari Kirim Foto
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="py-3 px-4 text-center select-none">
                                          <span
                                            className={`inline-block py-1 px-3.5 rounded-full text-[9px] font-black tracking-wider uppercase ${item.scoreColor}`}
                                          >
                                            {item.scoreText}
                                          </span>
                                        </td>

                                        <td className="py-3 px-4 text-center">
                                          <button
                                            onClick={() =>
                                              setSelectedEmpForRekapDetail(
                                                emp.id,
                                              )
                                            }
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
            {activeSubTab === "kehadiran" && (
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
                      Master{" "}
                      {masterSubTab === "lokasi"
                        ? "Lokasi Kerja"
                        : masterSubTab === "jabatan"
                          ? "Manajemen Jabatan"
                          : "Struktur Organisasi"}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {masterSubTab === "lokasi"
                        ? "Manajemen lokasi & penempatan wilayah kerja pegawai terintegrasi"
                        : masterSubTab === "jabatan"
                          ? "Konfigurasi profil jabatan dan tingkat kewenangan"
                          : "Visualisasi bagan struktur komando formal PT Haleyora Powerindo"}
                    </p>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto shadow-inner">
                    <button
                      onClick={() => {
                        setMasterSubTab("lokasi");
                        setMasterSearchQuery("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === "lokasi"
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-933"
                      }`}
                    >
                      Lokasi Kerja
                    </button>
                    <button
                      onClick={() => {
                        setMasterSubTab("jabatan");
                        setMasterSearchQuery("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === "jabatan"
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-933"
                      }`}
                    >
                      Daftar Jabatan
                    </button>
                    <button
                      onClick={() => {
                        setMasterSubTab("struktur");
                        setMasterSearchQuery("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        masterSubTab === "struktur"
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-933"
                      }`}
                    >
                      Hirarki & Struktur
                    </button>
                  </div>
                </div>

                {/* 1. SUB-TAB: LOKASI KERJA */}
                {masterSubTab === "lokasi" && (
                  <div className="space-y-4">
                    {/* Stats Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex bg-[#009bca] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#0089b2] flex items-center justify-center w-14">
                          <MapPin size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">
                            TOTAL LOKASI KERJA
                          </p>
                          <p className="text-xl font-black mt-0.5">
                            {locations.length}
                          </p>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setClickedStatType('lokasi_ada_pegawai'); setStatModalSearch(''); }}
                        className="flex bg-[#10b981] hover:bg-[#0d9a6c] text-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                        title="Klik untuk melihat daftar lokasi yang sudah ditempatkan pegawai"
                      >
                        <div className="p-4 bg-[#059669] flex items-center justify-center w-14">
                          <Check size={24} />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase flex items-center gap-1 font-sans">
                            LOKASI SUDAH ADA PEGAWAI
                            <span className="text-[8px] bg-white/20 px-1 rounded font-bold">Detail</span>
                          </p>
                          <p className="text-xl font-black mt-0.5 font-mono">
                            {
                              locations.filter((loc) =>
                                Object.values(employeeLocations).includes(
                                  loc.id,
                                ),
                              ).length
                            }
                          </p>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setClickedStatType('lokasi_tanpa_pegawai'); setStatModalSearch(''); }}
                        className="flex bg-[#f97316] hover:bg-[#e0630d] text-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                        title="Klik untuk melihat daftar lokasi yang belum diisi pegawai"
                      >
                        <div className="p-4 bg-[#ea580c] flex items-center justify-center w-14">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase flex items-center gap-1 font-sans">
                            LOKASI BELUM ADA PEGAWAI
                            <span className="text-[8px] bg-white/20 px-1 rounded font-bold">Detail</span>
                          </p>
                          <p className="text-xl font-black mt-0.5 font-mono">
                            {
                              locations.filter(
                                (loc) =>
                                  !Object.values(employeeLocations).includes(
                                    loc.id,
                                  ),
                              ).length
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex bg-[#2563eb] text-white rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-[#1d4ed8] flex items-center justify-center w-14">
                          <Users size={24} />
                        </div>
                        <div className="p-3 flex-1">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase">
                            TOTAL PEGAWAI
                          </p>
                          <p className="text-xl font-black mt-0.5">
                            {employees.length}
                          </p>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setClickedStatType('pegawai_punya_lokasi'); setStatModalSearch(''); }}
                        className="flex bg-[#12a176] hover:bg-[#0e805d] text-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                        title="Klik untuk melihat daftar pegawai yang sudah memiliki lokasi tugas"
                      >
                        <div className="p-4 bg-[#0d845f] flex items-center justify-center w-14">
                          <UserCheck size={24} />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase flex items-center gap-1 font-sans">
                            PEGAWAI SUDAH PUNYA LOKASI
                            <span className="text-[8px] bg-white/20 px-1 rounded font-bold">Detail</span>
                          </p>
                          <p className="text-xl font-black mt-0.5 font-mono">
                            {
                              employees.filter(
                                (emp) => employeeLocations[emp.id],
                              ).length
                            }
                          </p>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setClickedStatType('pegawai_tanpa_lokasi'); setStatModalSearch(''); }}
                        className="flex bg-[#ef4444] hover:bg-[#d63434] text-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:scale-[1.03] transition-all duration-200 active:scale-95 select-none"
                        title="Klik untuk melihat daftar pegawai yang belum memiliki lokasi tugas"
                      >
                        <div className="p-4 bg-[#dc2626] flex items-center justify-center w-14">
                          <XCircle size={24} />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-center">
                          <p className="text-[9px] font-black tracking-wider opacity-85 uppercase flex items-center gap-1 font-sans">
                            PEGAWAI BELUM PUNYA LOKASI
                            <span className="text-[8px] bg-white/20 px-1 rounded font-bold">Detail</span>
                          </p>
                          <p className="text-xl font-black mt-0.5 font-mono">
                            {
                              employees.filter(
                                (emp) => !employeeLocations[emp.id],
                              ).length
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filter and search bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-205 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
                      <div className="relative flex-1">
                        <Search
                          className="absolute left-3 top-3.5 text-slate-400"
                          size={13}
                        />
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
                        <span className="text-[10px] uppercase font-black text-slate-400">
                          Filter Parent:
                        </span>
                        <select
                          id="loc_parent_filter"
                          value={masterParentFilter}
                          onChange={(e) =>
                            setMasterParentFilter(e.target.value)
                          }
                          className="bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-slate-705 text-xs outline-none font-bold"
                        >
                          <option value="Semua">-- Semua Parent --</option>
                          {locations
                            .filter((l) => l.level === 1)
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                        </select>

                        <button
                          onClick={() => {
                            setMasterSearchQuery("");
                            setMasterParentFilter("Semua");
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
                          <h2 className="text-sm font-black tracking-wider uppercase">
                            Daftar Lokasi Kerja
                          </h2>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingLocationId(null);
                              setLocationNameInput("");
                              setLocationLevelInput(1);
                              setLocationParentInput("");
                              setLocationBarcodeInput("");
                              setLocationJamInput("8 Jam Kerja");
                              setLocationPosInput(1);
                              setIsAddLocationModalOpen(true);
                            }}
                            className="bg-white text-slate-900 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 transition"
                          >
                            <Plus size={13} className="stroke-[3]" />
                            <span>Tambah Lokasi</span>
                          </button>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 text-slate-800 divide-y divide-slate-100">
                        {locations.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 italic">
                            Belum ada lokasi kerja. Silakan klik "Tambah Lokasi"
                            untuk mendaftarkan wilayah tugas satgas baru.
                          </div>
                        ) : (
                          (() => {
                            const filtered = locations.filter((loc) => {
                              const matchSearch = masterSearchQuery
                                ? loc.name
                                    .toLowerCase()
                                    .includes(
                                      masterSearchQuery.toLowerCase(),
                                    ) ||
                                  (loc.barcode &&
                                    loc.barcode
                                      .toLowerCase()
                                      .includes(
                                        masterSearchQuery.toLowerCase(),
                                      )) ||
                                  loc.id
                                    .toLowerCase()
                                    .includes(masterSearchQuery.toLowerCase())
                                : true;
                              const matchParent =
                                masterParentFilter !== "Semua"
                                  ? loc.parentId === masterParentFilter
                                  : true;
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
                              const assignedToThisLoc = employees.filter(
                                (emp) => employeeLocations[emp.id] === loc.id,
                              );

                              return (
                                <div
                                  key={loc.id}
                                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/50 px-2.5 rounded-xl transition font-sans"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <MapPin
                                      size={16}
                                      className="text-sky-500 shrink-0 mt-0.5"
                                    />
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                                          {loc.name}
                                        </h3>
                                        {loc.level > 1 && (
                                          <span className="bg-slate-100 text-slate-605 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                            Sub Level {loc.level - 1}
                                          </span>
                                        )}
                                      </div>
                                      {loc.parentId && (
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          Parent Unit:{" "}
                                          <span className="font-bold text-sky-600">
                                            {locations.find(
                                              (p) => p.id === loc.parentId,
                                            )?.name || loc.parentId}
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto font-sans">
                                    {/* Assigned employees display and management button */}
                                    {isAdmin ? (
                                      <button
                                        onClick={() => {
                                          setSelectedLocationForAssignment(
                                            loc.id,
                                          );
                                          setIsAssignEmployeeModalOpen(true);
                                        }}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer"
                                        title="Daftar Pegawai"
                                      >
                                        <Users size={11} />
                                        <span>
                                          {assignedToThisLoc.length} Pegawai
                                        </span>
                                      </button>
                                    ) : (
                                      <div
                                        className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                                        title="Daftar Pegawai (Hanya Baca)"
                                      >
                                        <Users size={11} />
                                        <span>
                                          {assignedToThisLoc.length} Pegawai
                                        </span>
                                      </div>
                                    )}

                                    {/* Feature: Add Employee directly */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setSelectedLocationForAssignment(
                                            loc.id,
                                          );
                                          setIsAssignEmployeeModalOpen(true);
                                        }}
                                        className="bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 text-[10px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition active:scale-95 cursor-pointer"
                                        title="Placing / Tambah Pegawai di Lokasi"
                                      >
                                        <UserCheck
                                          size={11}
                                          className="text-sky-600"
                                        />
                                        <span>+ Pegawai</span>
                                      </button>
                                    )}

                                    {/* Feature: Add Sub location */}
                                    {isAdmin && loc.level < 6 && (
                                      <button
                                        onClick={() => {
                                          setEditingLocationId(null);
                                          setLocationNameInput("");
                                          setLocationLevelInput(loc.level + 1);
                                          setLocationParentInput(loc.id);
                                          setLocationBarcodeInput("");
                                          setLocationJamInput("8 Jam Kerja");
                                          setLocationPosInput(1);
                                          setIsAddLocationModalOpen(true);
                                        }}
                                        className="bg-[#24b071]/10 hover:bg-[#24b071]/20 text-[#15803d] border border-[#24b071]/25 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus
                                          size={11}
                                          className="stroke-[3]"
                                        />
                                        <span>+ Sub Lokasi</span>
                                      </button>
                                    )}

                                    {/* Edit buttons */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setEditingLocationId(loc.id);
                                          setLocationNameInput(loc.name);
                                          setLocationLevelInput(loc.level);
                                          setLocationParentInput(
                                            loc.parentId || "",
                                          );
                                          setLocationBarcodeInput(
                                            loc.barcode || "",
                                          );
                                          setLocationJamInput(
                                            loc.jamKerja || "8 Jam Kerja",
                                          );
                                          setLocationPosInput(loc.posCount || 1);
                                          setIsAddLocationModalOpen(true);
                                        }}
                                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                                        title="Edit lokasi"
                                      >
                                        <FileText
                                          size={12}
                                          className="text-amber-650"
                                        />
                                      </button>
                                    )}

                                    {isAdmin && (
                                      <button
                                        onClick={() =>
                                          setLocationIdToDelete(loc.id)
                                        }
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                                        title="Hapus lokasi"
                                      >
                                        <Trash2
                                          size={12}
                                          className="text-rose-650"
                                        />
                                      </button>
                                    )}
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
                {masterSubTab === "jabatan" && (
                  <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                          <Layers size={16} className="text-sky-500" />
                          <span>Daftar Jabatan Resmi</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                          Menampilkan {jabatans.length} Jabatan formal di unit
                          kerja HPI
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingJabatanId(null);
                              setJabatanNameInput("");
                              setJabatanLevelInput(1);
                              setJabatanParentInput("");
                              setIsAddJabatanModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1 active:scale-95 transition cursor-pointer shadow-sm"
                          >
                            <Plus size={13} className="stroke-[3]" />
                            <span>+ Tambah Jabatan</span>
                          </button>

                          <button
                            onClick={() => {
                              const newLevelOrder = window.confirm(
                                "Aktifkan penukaran mode level hierarki jabatan?",
                              );
                              if (newLevelOrder)
                                onShowAlert(
                                  "Struktur Diperbarui",
                                  "Tukar Level hierarki jabatan berhasil diaktifkan.",
                                  "success",
                                );
                            }}
                            className="bg-sky-550 border border-sky-600 text-sky-800 hover:bg-sky-100 font-extrabold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1 active:scale-95 transition cursor-pointer"
                          >
                            <Layers size={13} />
                            <span>Tukar Level</span>
                          </button>
                        </div>
                      )}
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
                              <td
                                colSpan={6}
                                className="p-10 text-slate-400 italic text-center"
                              >
                                Belum ada jabatan tersimpan. Klik "+ Tambah
                                Jabatan" untuk memulai membuat hierarki komando
                                organisasi.
                              </td>
                            </tr>
                          ) : (
                            jabatans.map((jab, index) => {
                              const parentJab = jabatans.find(
                                (j) => j.id === jab.parentId,
                              );
                              return (
                                <tr
                                  key={jab.id}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="p-3 pl-5 text-center font-bold text-slate-405">
                                    {index + 1}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-sky-700">
                                    {jab.id}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-900 text-xs tracking-tight">
                                      {jab.name}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm ${
                                        jab.level === 1
                                          ? "bg-red-500"
                                          : jab.level === 2
                                            ? "bg-orange-500"
                                            : jab.level === 3
                                              ? "bg-sky-500"
                                              : jab.level === 4
                                                ? "bg-blue-600"
                                                : "bg-slate-500"
                                      }`}
                                    >
                                      Level {jab.level}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {parentJab ? (
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-slate-700">
                                          {parentJab.name}
                                        </span>
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">
                                          Lvl {parentJab.level}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-350 font-bold">
                                        -
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center gap-1" />
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isAdmin ? (
                                        <button
                                          onClick={() => {
                                            setSelectedJabatanForAssignment(
                                              jab.id,
                                            );
                                            setIsAssignJabatanModalOpen(true);
                                          }}
                                          className="p-1 px-2 text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-md hover:bg-sky-100 transition"
                                          title="Assign pegawai ke jabatan"
                                        >
                                          Assign (
                                          {
                                            employees.filter(
                                              (emp) =>
                                                employeeJabatans[emp.id] ===
                                                jab.id,
                                            ).length
                                          }
                                          )
                                        </button>
                                      ) : (
                                        <div
                                          className="p-1 px-2 text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-md"
                                          title="Jumlah pegawai dengan jabatan ini (Hanya Baca)"
                                        >
                                          Total: (
                                          {
                                            employees.filter(
                                              (emp) =>
                                                employeeJabatans[emp.id] ===
                                                jab.id,
                                            ).length
                                          }
                                          )
                                        </div>
                                      )}

                                      {isAdmin && (
                                        <button
                                          onClick={() => {
                                            setEditingJabatanId(jab.id);
                                            setJabatanNameInput(jab.name);
                                            setJabatanLevelInput(jab.level);
                                            setJabatanParentInput(
                                              jab.parentId || "",
                                            );
                                            setIsAddJabatanModalOpen(true);
                                          }}
                                          className="p-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg transition"
                                        >
                                          <FileText size={12} />
                                        </button>
                                      )}

                                      {isAdmin && (
                                        <button
                                          onClick={() =>
                                            setJabatanIdToDelete(jab.id)
                                          }
                                          className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition-all cursor-pointer"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
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
                {masterSubTab === "struktur" && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div>
                          <h2 className="text-base font-black text-slate-800">
                            Hirarki Pegawai
                          </h2>
                          <p className="text-xs text-slate-450">
                            Bagan komando dan distribusi jumlah tenaga kerja di
                            unit kerja
                          </p>
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
                          <p className="text-[9px] uppercase tracking-wider text-blue-500">
                            TOTAL TENAGA KERJA
                          </p>
                          <p className="text-xl font-black mt-1">
                            {employees.length}{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              Pegawai
                            </span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-emerald-500">
                            SUDAH ADA DI HIRARKI
                          </p>
                          <p className="text-xl font-black mt-1">
                            {
                              employees.filter(
                                (emp) => employeeJabatans[emp.id],
                              ).length
                            }{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              Pegawai
                            </span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-amber-500">
                            BELUM DI-SET HIRARKI
                          </p>
                          <p className="text-xl font-black mt-1">
                            {
                              employees.filter(
                                (emp) => !employeeJabatans[emp.id],
                              ).length
                            }{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              Pegawai
                            </span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl">
                          <p className="text-[9px] uppercase tracking-wider text-rose-500">
                            BELUM PUNYA JABATAN
                          </p>
                          <p className="text-xl font-black mt-1">
                            {
                              employees.filter(
                                (emp) => !emp.role || emp.role === "-",
                              ).length
                            }{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              Pegawai
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Jumlah TK per Jabatan cards */}
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                          🔬 Jumlah TK per Jabatan (Klik card untuk lihat daftar
                          pegawai)
                        </h3>

                        {jabatans.length === 0 ? (
                          <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic">
                            Belum ada struktur jabatan yang dikonfigurasi.
                            Silakan buat Jabatan baru di tab sebelah kiri.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {jabatans
                              .sort((a, b) => a.level - b.level)
                              .map((jab) => {
                                const assignedToJab = employees.filter(
                                  (emp) => employeeJabatans[emp.id] === jab.id,
                                );

                                const sideColor =
                                  jab.level === 1
                                    ? "border-l-red-500"
                                    : jab.level === 2
                                      ? "border-l-orange-500"
                                      : jab.level === 3
                                        ? "border-l-sky-400"
                                        : jab.level === 4
                                          ? "border-l-blue-650"
                                          : "border-l-slate-400";

                                return (
                                  <div
                                    key={jab.id}
                                    onClick={() =>
                                      setSelectedJabatanForDetail(jab.id)
                                    }
                                    className={`bg-white hover:bg-slate-50 border border-slate-200 border-l-4 ${sideColor} rounded-xl p-4 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md select-none`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black text-slate-400 block uppercase">
                                        LEVEL {jab.level}
                                      </span>
                                      <ChevronRight
                                        size={14}
                                        className="text-slate-300"
                                      />
                                    </div>
                                    <h4 className="font-extrabold text-sm text-slate-800 my-1 tracking-tight truncate">
                                      {jab.name}
                                    </h4>
                                    <p className="text-xl font-black text-slate-900 mt-2">
                                      {assignedToJab.length}{" "}
                                      <span className="text-[10px] font-bold text-slate-400">
                                        orang
                                      </span>
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

            {activeSubTab === "pengaturan" && (
              <motion.div
                key="tab_prisma_pengaturan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left font-sans"
              >
                <div className="pb-2 border-b border-slate-300">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 font-sans">
                    Pengaturan Akun Pengguna
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ubah nama profil, tautan foto avatar, serta kata sandi login untuk akun Anda ({loggedInUserId})
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Visual Card Preview of Active Profile */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 text-center relative overflow-hidden">
                      <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
                      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl"></div>

                      <div className="relative inline-block mb-4 mt-2">
                        <img
                          src={
                            settingAvatar ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
                          }
                          alt="Avatar Preview"
                          className="w-24 h-24 rounded-full border-4 border-indigo-500/50 object-cover mx-auto shadow-lg"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
                          }}
                        />
                        <div className="absolute bottom-0 right-0 p-1 px-2.5 bg-indigo-650 border border-indigo-400 rounded-full text-[9px] font-bold text-white shadow">
                          {currentUserRole}
                        </div>
                      </div>

                      <h3 className="text-base font-black text-white">
                        {settingName || "Pengguna"}
                      </h3>
                      <p className="text-[10px] text-sky-450 font-bold uppercase tracking-widest mt-1">
                        PT. Haleyora Powerindo
                      </p>

                      <div className="mt-6 pt-5 border-t border-slate-850 grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-500 uppercase font-black block">
                            ID Login
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {loggedInUserId}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[9px] text-slate-500 uppercase font-black block">
                            Level Akses
                          </span>
                          <span className="text-xs text-sky-400 font-bold">
                            {currentUserRole}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-850 text-[10px] text-slate-400 leading-relaxed text-left">
                        <p className="italic">
                          Gunakan formulir di sebelah kanan untuk memperbarui
                          identitas kredensial keamanan Anda secara langsung.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Interactive Update Forms */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();

                        if (!settingName.trim()) {
                          onShowAlert(
                            "Nama Diperlukan",
                            "Nama profil Anda tidak boleh kosong.",
                            "alert",
                          );
                          return;
                        }
                        if (!settingPassword.trim()) {
                          onShowAlert(
                            "Password Diperlukan",
                            "Password tidak boleh kosong.",
                            "alert",
                          );
                          return;
                        }

                        // Check if password has changed from current password
                        if (settingPassword !== currentUserPassword) {
                          if (!settingOldPassword) {
                            onShowAlert(
                              "Sandi Lama Diperlukan",
                              "Konfirmasi kata sandi lama diperlukan untuk memperbarui keamanan password baru.",
                              "alert",
                            );
                            return;
                          }
                          if (settingOldPassword !== currentUserPassword) {
                            onShowAlert(
                              "Sandi Lama Salah",
                              "Kata sandi saat ini yang Anda masukkan salah. Perubahan sandi baru ditolak.",
                              "alert",
                            );
                            return;
                          }
                          if (settingPassword !== settingPasswordConfirm) {
                            onShowAlert(
                              "Sandi Tidak Cocok",
                              "Silakan periksa kembali kecocokan password baru Anda.",
                              "alert",
                            );
                            return;
                          }
                        }

                        if (loggedInUserId === "admin" || !loggedInUserId) {
                          onUpdateAdminProfile(
                            settingName,
                            settingAvatar,
                            settingPassword,
                          );
                        } else {
                          // Save the employee password in local storage
                          localStorage.setItem("step_user_password_" + loggedInUserId, settingPassword);
                          
                          // If there's a matching employee record, update their details
                          if (activeEmpInfo) {
                            const updatedEmp = {
                              ...activeEmpInfo,
                              name: settingName,
                              avatar: settingAvatar,
                            };
                            onAddEmployee(updatedEmp);
                          }
                        }

                        onShowAlert(
                          "Kredensial Diperbarui",
                          "Konfigurasi identitas & password baru Anda berhasil disimpan sistem.",
                          "success",
                        );
                      }}
                      className="space-y-5"
                    >
                      {/* Section 1: Profil Akun */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full"></span>
                          Detail Profil {currentUserRole}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nama */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">
                              Nama Lengkap / Sebutan Akun *
                            </label>
                            <input
                              id="setting_admin_name"
                              type="text"
                              required
                              placeholder="Masukkan nama lengkap profil Anda"
                              value={settingName}
                              onChange={(e) => setSettingName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-bold text-slate-800"
                            />
                            <p className="text-[9px] text-slate-400 leading-normal">
                              Nama ini akan tercantum sebagai nama pengguna Anda di seluruh sistem.
                            </p>
                          </div>

                          {/* Avatar URL / Local File Upload */}
                          <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">
                              Avatar Foto (File lokal / URL) *
                            </label>

                            <div className="flex gap-2">
                              <input
                                id="setting_admin_avatar_url"
                                type="text"
                                required
                                placeholder="Pilih file lokal atau masukkan URL foto profil (https://...)"
                                value={settingAvatar}
                                onChange={(e) =>
                                  setSettingAvatar(e.target.value)
                                }
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
                                        onShowAlert(
                                          "Kapasitas Penuh",
                                          "Batas maksimal ukuran file gambar adalah 2MB.",
                                          "alert",
                                        );
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        if (typeof reader.result === "string") {
                                          setSettingAvatar(reader.result);
                                          onShowAlert(
                                            "File Terunggah",
                                            "Berhasil memproses & mengunggah file foto lokal Anda.",
                                            "success",
                                          );
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-normal">
                              Mendukung unggah berkas langsung dari komputer
                              Anda atau sematkan alamat url gambar eksternal.
                            </p>
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
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 bg-amber-50/50 border border-amber-250 p-3.5 rounded-2xl"
                          >
                            <label className="text-[10px] text-amber-805 uppercase font-bold pl-0.5 flex items-center gap-1.5">
                              <span>Masukkan Kata Sandi Lama Saat Ini *</span>
                              <span className="text-[9px] font-normal text-amber-600">
                                (Wajib diisi untuk memverifikasi penggantian
                                sandi baru)
                              </span>
                            </label>
                            <input
                              id="setting_admin_old_password"
                              type={showPassword ? "text" : "password"}
                              required={settingPassword !== adminPassword}
                              placeholder="Masukkan kata sandi lama Anda saat ini"
                              value={settingOldPassword}
                              onChange={(e) =>
                                setSettingOldPassword(e.target.value)
                              }
                              className="w-full bg-white border border-amber-300 p-2.5 rounded-xl text-xs outline-none focus:border-amber-400 font-mono text-slate-850 font-bold"
                            />
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Kata Sandi Baru */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">
                              Kata Sandi Baru *
                            </label>
                            <input
                              id="setting_admin_password"
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Masukkan password baru"
                              value={settingPassword}
                              onChange={(e) =>
                                setSettingPassword(e.target.value)
                              }
                              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs outline-none focus:border-indigo-400 font-mono text-slate-850"
                            />
                          </div>

                          {/* Konfirmasi Kata Sandi Baru */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-550 uppercase font-bold pl-0.5">
                              Konfirmasi Kata Sandi Baru *
                            </label>
                            <input
                              id="setting_admin_password_confirm"
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Ketik ulang password baru"
                              value={settingPasswordConfirm}
                              onChange={(e) =>
                                setSettingPasswordConfirm(e.target.value)
                              }
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
                          <label
                            htmlFor="toggle_setting_show_pass"
                            className="text-[11px] text-slate-600 select-none cursor-pointer font-medium"
                          >
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
                            setActiveSubTab("ringkasan");
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
                          <Check
                            size={14}
                            className="text-white"
                            strokeWidth={3}
                          />
                          Simpan Perubahan Kredensial
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === "kelola_akun" && loggedInUserId === "admin" && (
              <motion.div
                key="tab_prisma_kelola_akun"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left font-sans"
              >
                <div className="pb-2 border-b border-slate-300 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 font-sans">
                      Kelola Akun Pengguna CS Online
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tambahkan dan kelola hak akses log masuk (ID User & Password) untuk petugas lapangan/pengguna tambahan.
                    </p>
                  </div>
                  <div className="bg-sky-500/10 text-sky-600 border border-sky-500/20 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                    Akun: {userAccounts.length + 2} Terdaftar
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Form Tambah Akun Baru */}
                  <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <UserPlus size={14} className="text-indigo-600" />
                      Tambah Akun Baru
                    </h3>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const fd = new FormData(target);
                        const userIdVal = (fd.get("new_user_id") as string || "").trim();
                        const passwordVal = (fd.get("new_password") as string || "").trim();

                        if (!userIdVal || !passwordVal) {
                          onShowAlert("Error", "ID User dan Password harus diisi!", "alert");
                          return;
                        }

                        // Prevent duplicate usernames
                        if (userIdVal.toLowerCase() === "admin" || userIdVal === "9826003HPI") {
                          onShowAlert("Gagal", "ID User ini adalah akun default sistem!", "alert");
                          return;
                        }

                        if (userAccounts.some(acc => acc.userId.toLowerCase() === userIdVal.toLowerCase())) {
                          onShowAlert("Gagal", "ID User telah terdaftar sebelumnya!", "alert");
                          return;
                        }

                        const newAccId = `acc_${Date.now()}`;
                        onAddUserAccount({
                          id: newAccId,
                          userId: userIdVal,
                          password: passwordVal,
                          createdAt: new Date().toLocaleDateString("id-ID")
                        });

                        onShowAlert(
                          "Sukses",
                          `Akun untuk ID User "${userIdVal}" berhasil dibuat secara permanen.`,
                          "success"
                        );
                        target.reset();
                      }}
                      className="space-y-4 text-xs"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                          ID User / Username
                        </label>
                        <input
                          name="new_user_id"
                          type="text"
                          required
                          placeholder="Masukkan ID User (ex: NIP pegawai)"
                          className="w-full bg-slate-50 border border-slate-350 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                          Kata Sandi (Password)
                        </label>
                        <input
                          name="new_password"
                          type="password"
                          required
                          placeholder="Masukkan Password"
                          className="w-full bg-slate-50 border border-slate-350 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs text-center"
                      >
                        <Plus size={14} />
                        Simpan Akun Pengguna
                      </button>
                    </form>
                  </div>

                  {/* Right Column: List of accounts */}
                  <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Users size={14} className="text-indigo-600" />
                      Daftar Akun Terdaftar
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">ID User</th>
                            <th className="p-3">Password</th>
                            <th className="p-3">Tanggal Dibuat</th>
                            <th className="p-3">Tipe Sesi</th>
                            <th className="p-3 text-center w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* Default admin account row */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">admin</td>
                            <td className="p-3 font-mono text-slate-500 bg-slate-100/50 rounded px-1.5 py-0.5 text-[10px]">****** (Admin Profile)</td>
                            <td className="p-3 text-slate-400">Default</td>
                            <td className="p-3">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase">
                                Administrator
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-400 italic text-[10px]">System Lock</td>
                          </tr>

                          {/* Default 9826003HPI account row */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">9826003HPI</td>
                            <td className="p-3 font-mono text-slate-500 bg-slate-100/50 rounded px-1.5 py-0.5 text-[10px]">****** (Kunci Pengaturan)</td>
                            <td className="p-3 text-slate-400">Default</td>
                            <td className="p-3">
                              <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase">
                                Petugas Utama
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-400 italic text-[10px]">System Lock</td>
                          </tr>

                          {/* Dynamic user accounts */}
                          {userAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold italic">
                                Belum ada akun tambahan yang ditambahkan. Silakan gunakan panel di sebelah kiri untuk menambah akun.
                              </td>
                            </tr>
                          ) : (
                            userAccounts.map((acc) => (
                              <tr key={acc.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-900">{acc.userId}</td>
                                <td className="p-3 font-mono text-slate-500 bg-slate-100/50 rounded px-1.5 py-0.5 text-[10px]">{acc.password}</td>
                                <td className="p-3 text-slate-500">{acc.createdAt}</td>
                                <td className="p-3">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase">
                                    Operator Lapangan
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      if (confirm(`Apakah Anda yakin ingin menghapus akun "${acc.userId}"? Pengguna tidak akan bisa log masuk lagi.`)) {
                                        onDeleteUserAccount(acc.id);
                                        onShowAlert("Sukses", `User ID "${acc.userId}" berhasil dihapus secara permanen.`, "success");
                                      }
                                    }}
                                    className="mx-auto flex items-center justify-center p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition active:scale-95 cursor-pointer border-none"
                                    title="Hapus Akun Pengguna"
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
                <h3 className="text-sm font-black text-slate-900">
                  Tambah Data Pegawai Baru
                </h3>
                <button
                  id="btn_cls_add_mod"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 cursor-pointer"
                >
                  X
                </button>
              </div>

              <form
                id="form_tambah_pegawai"
                onSubmit={handleAddEmployeeSubmit}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Nama Lengkap *
                    </label>
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
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      NIP (Nomor Induk) *
                    </label>
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
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Jabatan (Role) *
                    </label>
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
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Unit Kerja / Divisi *
                    </label>
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
                  <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5 block">
                    Avatar Profil (File lokal / URL) *
                  </label>
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
                              onShowAlert(
                                "Kapasitas Penuh",
                                "Batas maksimal ukuran file gambar adalah 2MB.",
                                "alert",
                              );
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setNewEmpAvatar(reader.result);
                                onShowAlert(
                                  "File Terunggah",
                                  "Berhasil memproses & mengunggah file foto lokal Anda.",
                                  "success",
                                );
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal pl-0.5">
                    Mendukung unggah berkas langsung dari komputer Anda atau
                    sematkan alamat url gambar eksternal.
                  </p>
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
                  {actionType === "Approve"
                    ? "Konfirmasi Setujui Laporan"
                    : "Konfirmasi Tolak Laporan"}
                </h3>
                <button
                  id="btn_cls_eval_mod"
                  onClick={() => {
                    setSelectedReportForAction(null);
                    setActionType(null);
                  }}
                  className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 cursor-pointer"
                >
                  X
                </button>
              </div>

              <form
                id="form_proses_evaluasi"
                onSubmit={handleProcessReportAction}
                className="space-y-3"
              >
                <p className="text-slate-600 leading-relaxed text-xs">
                  Harap masukkan catatan respon evaluator untuk personil{" "}
                  <span className="font-extrabold text-[#0284c7]">
                    {selectedReportForAction.employeeName}
                  </span>{" "}
                  terkait penugasan ini:
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                    Catatan Respon Evaluasi *
                  </label>
                  <textarea
                    id="input_eval_notes"
                    required
                    rows={3}
                    placeholder={
                      actionType === "Approve"
                        ? "Contoh: Pekerjaan bagus, geo-tagging terverifikasi cocok."
                        : "Contoh: Revisi diperlukan, foto outdoor buram."
                    }
                    value={adminFeedbackNotes}
                    onChange={(e) => setAdminFeedbackNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-slate-800 outline-none focus:border-indigo-400 resize-none font-sans text-xs shadow-inner"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    id="btn_eval_cancel"
                    type="button"
                    onClick={() => {
                      setSelectedReportForAction(null);
                      setActionType(null);
                    }}
                    className="p-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="btn_eval_submit"
                    type="submit"
                    className={`p-2.5 px-5 font-bold text-white rounded-xl cursor-pointer shadow ${
                      actionType === "Approve"
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-rose-600 hover:bg-rose-500"
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

      {/* --- CUSTOM REPORT DELETION CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {deletingReportId && (() => {
          const rep = reports.find(r => r.id === deletingReportId);
          if (!rep) return null;
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs font-sans">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl text-xs text-slate-800 text-left"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm">
                    <Trash2 size={16} />
                    <span>Konfirmasi Hapus Laporan</span>
                  </div>
                  <button
                    onClick={() => setDeletingReportId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 border-none bg-transparent cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed font-semibold">
                    Apakah Anda yakin ingin menghapus data laporan kegiatan ini secara permanen? Tindakan ini tidak dapat dibatalkan.
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-black uppercase">NAMA PERSONIL</span>
                      <span className="font-extrabold text-slate-800 uppercase">{rep.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-black uppercase">NIP / NO INDUK</span>
                      <span className="font-mono text-slate-700 font-bold">{rep.nip || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-black uppercase">JABATAN &amp; UNIT</span>
                      <span className="font-bold text-sky-600 uppercase text-[10px]">{rep.role || "SATGAS"} - {rep.department || "SEKTOR"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-black uppercase">TANGGAL LAPORAN</span>
                      <span className="font-mono text-slate-700 font-bold">{rep.date}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex flex-col gap-0.5">
                      <span className="text-slate-400 font-black uppercase">RINGKASAN KEGIATAN:</span>
                      <span className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200 mt-1 block max-h-20 overflow-y-auto leading-relaxed">
                        {rep.description || "Aktivitas Patroli Lapangan"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setDeletingReportId(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition cursor-pointer border-none text-xs"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      onDeleteReport(rep.id);
                      setDeletingReportId(null);
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition cursor-pointer border-none text-xs flex items-center gap-1.5 shadow"
                  >
                    <Trash2 size={13} />
                    <span>Ya, Hapus Laporan</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
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
                  <h3 className="text-sm font-black text-slate-900 leading-none">
                    Buat Data Laporan Kerja Manual
                  </h3>
                  <p className="text-[10px] text-slate-450 leading-tight">
                    Sisipkan data laporan taktis langsung dari otoritas
                    supervisor
                  </p>
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
                <label className="text-[10px] text-[#0284c7] font-black uppercase tracking-wider block">
                  Cepat Isi dari Database Pegawai:
                </label>
                <select
                  id="select_quick_fill_employee"
                  disabled={!isAdmin}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectEmployeeForReport(e.target.value);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 p-2 rounded-lg text-slate-700 outline-none focus:border-indigo-400 text-xs shadow-sm font-bold cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  defaultValue=""
                >
                  <option value="" disabled>
                    -- Pilih Pegawai Lapangan --
                  </option>
                  {employees
                    .filter((e) => isAdmin || e.nip === loggedInUserId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.role} - {e.department})
                      </option>
                    ))}
                </select>
              </div>

              <form
                id="form_tambah_laporan_manual"
                onSubmit={handleAddReportSubmit}
                className="space-y-3.5"
              >
                {/* Row 1: Identitas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Nama Pegawai *
                    </label>
                    <input
                      id="input_manual_rep_name"
                      type="text"
                      required
                      placeholder="Masukkan nama pegawai"
                      value={addRepName}
                      onChange={(e) => setAddRepName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      NIP Pegawai *
                    </label>
                    <input
                      id="input_manual_rep_nip"
                      type="text"
                      required
                      placeholder="Contoh: 199307040102"
                      value={addRepNip}
                      onChange={(e) => setAddRepNip(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700"
                    />
                  </div>
                </div>

                {/* Row 2: Jabatan & Unit Kerja */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Jabatan (Role) *
                    </label>
                    <input
                      id="input_manual_rep_role"
                      type="text"
                      required
                      placeholder="Senior Engineer"
                      value={addRepRole}
                      onChange={(e) => setAddRepRole(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-0.5">
                      Unit Kerja / Divisi *
                    </label>
                    <input
                      id="input_manual_rep_dept"
                      type="text"
                      required
                      placeholder="PT PLN ( Persero ) UP3 Bangka"
                      value={addRepDept}
                      onChange={(e) => setAddRepDept(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none text-xs text-slate-800 placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Row 3: Deskripsi Pekerjaan */}
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5 text-sky-600">
                      Deskripsi Pekerjaan / Aktivitas Detail *
                    </label>
                    <textarea
                      id="input_manual_rep_description"
                      rows={3.5}
                      required
                      placeholder="Tulis rincian aktivitas pekerjaan lapangan secara detail..."
                      value={addRepDesc}
                      onChange={(e) => setAddRepDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Photo Upload Fields (Choose File & Camera) */}
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center pl-0.5 mb-1">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        ● FOTO SEBELUM & SESUDAH *
                      </span>
                      <span className="text-[8.5px] font-black text-[#0284c7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-150">
                        MAKS 10 MB
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-dashed border-slate-300 items-center justify-center">
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {addRepIndoor ? (
                          <img
                            src={addRepIndoor}
                            alt="Sebelum & Sesudah Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-100/50 px-2 py-1.5 rounded-md border border-slate-200/40">
                            Belum Ada Foto
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 w-full mt-1">
                        {/* Live Camera Button */}
                        <button
                          id="btn_live_camera_indoor"
                          type="button"
                          onClick={() => handleOpenLiveCamera("indoor")}
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
                </div>

                {/* Geotagging & GPS Tag Input */}
                <div className="bg-sky-500/5 p-4 rounded-2xl border border-sky-500/15 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        size={13}
                        className="text-sky-600 animate-bounce"
                      />
                      <span className="text-[10px] font-black uppercase text-sky-900 tracking-wider">
                        ● Lokasi Geotagging GPS
                      </span>
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

                  <div className="text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">
                        Koordinat Deteksi GPS *
                      </span>
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
                  <span>
                    {editingLocationId
                      ? "Edit Lokasi Kerja"
                      : "Tambah Lokasi Kerja Baru"}
                  </span>
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
                    Sub-lokasi untuk:{" "}
                    <span className="text-sky-900">
                      {locations.find((l) => l.id === locationParentInput)
                        ?.name || locationParentInput}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">
                    Nama Lokasi Kerja *
                  </label>
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
                  <span>
                    {editingJabatanId ? "Edit Jabatan" : "Tambah Jabatan Baru"}
                  </span>
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
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">
                    Nama Posisi / Jabatan *
                  </label>
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
                  <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">
                    Tingkatan Level Hierarki (Kewenangan) *
                  </label>
                  <select
                    value={jabatanLevelInput}
                    onChange={(e) =>
                      setJabatanLevelInput(Number(e.target.value))
                    }
                    className="w-full bg-[#f8fafc] border border-slate-355 p-2.5 rounded-xl outline-none text-xs font-bold text-slate-800"
                  >
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                </div>

                {jabatanLevelInput > 1 && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-500 pl-0.5">
                      Atasan Langsung (Parent Jabatan)
                    </label>
                    <select
                      value={jabatanParentInput}
                      onChange={(e) => setJabatanParentInput(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-355 p-2.5 rounded-xl outline-none text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Tanpa Atasan (Tertinggi) --</option>
                      {jabatans
                        .filter((j) => j.level < jabatanLevelInput)
                        .map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.name} (Level {j.level})
                          </option>
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
                    Lokasi:{" "}
                    <span className="text-indigo-600 font-bold">
                      {
                        locations.find(
                          (l) => l.id === selectedLocationForAssignment,
                        )?.name
                      }
                    </span>
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
                  Ceklis nama pegawai di bawah ini untuk menempatkan mereka
                  secara resmi di area kerja terpilih. Pegawai yang tidak
                  dicentang akan dilepaskan dari lokasi kerja ini.
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-[#f8fafc]">
                  {employees.length === 0 ? (
                    <p className="p-4 text-center text-slate-400 italic text-xs">
                      Belum ada pegawai terdaftar di sistem.
                    </p>
                  ) : (
                    employees.map((emp) => {
                      const isAssigned =
                        employeeLocations[emp.id] ===
                        selectedLocationForAssignment;
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center justify-between p-2.5 hover:bg-white rounded-lg transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 font-sans">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const updated = { ...employeeLocations };
                                if (checked) {
                                  updated[emp.id] =
                                    selectedLocationForAssignment!;
                                  setDoc(doc(db, "hpi_employee_locations", emp.id), { id: emp.id, locationId: selectedLocationForAssignment! }).catch((err) =>
                                    console.error("Error setting employee location assignment in Firestore:", err),
                                  );
                                } else {
                                  delete updated[emp.id];
                                  deleteDoc(doc(db, "hpi_employee_locations", emp.id)).catch((err) =>
                                    console.error("Error deleting employee location assignment in Firestore:", err),
                                  );
                                }
                                setEmployeeLocations(updated);
                              }}
                              className="w-4 h-4 text-sky-600 rounded border-slate-350 focus:ring-sky-500"
                            />
                            <div>
                              <p className="text-xs font-extrabold text-slate-800 leading-tight">
                                {emp.name}
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                NIP: {emp.nip} •{" "}
                                <span className="font-bold">{emp.role}</span>
                              </p>
                            </div>
                          </div>

                          {employeeLocations[emp.id] && !isAssigned && (
                            <span className="text-[8.5px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                              Pindah dr:{" "}
                              {locations
                                .find((l) => l.id === employeeLocations[emp.id])
                                ?.name?.slice(0, 15)}
                              ...
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
                    Jabatan:{" "}
                    <span className="text-sky-700 font-bold">
                      {
                        jabatans.find(
                          (j) => j.id === selectedJabatanForAssignment,
                        )?.name
                      }
                    </span>
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
                  Ceklis nama pegawai untuk memasukkan mereka ke struktur
                  komando jabatan di bawah level ini.
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-[#f8fafc]">
                  {employees.map((emp) => {
                    const isAssigned =
                      employeeJabatans[emp.id] === selectedJabatanForAssignment;
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between p-2.5 hover:bg-white rounded-lg transition cursor-pointer font-sans"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = { ...employeeJabatans };
                              if (checked) {
                                updated[emp.id] = selectedJabatanForAssignment!;
                                setDoc(doc(db, "hpi_employee_jabatans", emp.id), { id: emp.id, jabatanId: selectedJabatanForAssignment! }).catch((err) =>
                                  console.error("Error setting employee jabatan assignment in Firestore:", err),
                                );
                              } else {
                                delete updated[emp.id];
                                deleteDoc(doc(db, "hpi_employee_jabatans", emp.id)).catch((err) =>
                                  console.error("Error deleting employee jabatan assignment from Firestore:", err),
                                );
                              }
                              setEmployeeJabatans(updated);
                            }}
                            className="w-4 h-4 text-sky-600 rounded border-slate-350 focus:ring-sky-500"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-slate-800 leading-tight">
                              {emp.name}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold">
                              NIP: {emp.nip} • Unit: {emp.department}
                            </p>
                          </div>
                        </div>

                        {employeeJabatans[emp.id] && !isAssigned && (
                          <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black">
                            Lvl:{" "}
                            {
                              jabatans.find(
                                (j) => j.id === employeeJabatans[emp.id],
                              )?.name
                            }
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
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Visualisasi struktur komando level 1 s.d level 5
                  </p>
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
                    Belum ada data struktur komando jabatan untuk
                    divisualisasikan. Silakan tambahkan jabatan baru terlebih
                    dahulu.
                  </div>
                ) : (
                  [1, 2, 3, 4, 5].map((lvl) => {
                    const rowJabs = jabatans.filter((j) => j.level === lvl);
                    if (rowJabs.length === 0) return null;
                    return (
                      <div
                        key={lvl}
                        className="flex flex-col items-center space-y-2 w-full font-sans"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              lvl === 1
                                ? "bg-red-500"
                                : lvl === 2
                                  ? "bg-orange-500"
                                  : lvl === 3
                                    ? "bg-sky-400"
                                    : lvl === 4
                                      ? "bg-blue-500"
                                      : "bg-slate-400"
                            }`}
                          ></span>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 font-sans">
                            LEVEL {lvl}
                          </span>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 w-full">
                          {rowJabs.map((jab) => {
                            const emps = employees.filter(
                              (e) => employeeJabatans[e.id] === jab.id,
                            );
                            const parentName = jabatans.find(
                              (p) => p.id === jab.parentId,
                            )?.name;

                            return (
                              <div
                                key={jab.id}
                                className="bg-slate-800 border-2 border-slate-700 hover:border-sky-500 hover:bg-slate-750 p-3 rounded-xl shadow text-center w-56 shrink-0 transition-all duration-200"
                              >
                                <h4 className="text-xs font-black text-sky-400 tracking-tight block uppercase truncate">
                                  {jab.name}
                                </h4>
                                <p className="text-[10px] text-slate-300 font-bold mt-1">
                                  {parentName
                                    ? `Atasan: ${parentName.slice(0, 15)}...`
                                    : "Tingkat Tertinggi"}
                                </p>

                                <div className="mt-2.5 pt-1.5 border-t border-slate-700 flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 font-bold">
                                    Anggota:
                                  </span>
                                  <span className="bg-[#24b071]/20 text-[#24b071] font-black text-[10px] px-2 py-0.5 rounded-md">
                                    {emps.length} orang
                                  </span>
                                </div>

                                {emps.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 text-left font-sans">
                                    <div className="flex -space-x-1.5 justify-center overflow-hidden mb-2">
                                      {emps.slice(0, 4).map((e) => (
                                        <img
                                          key={e.id}
                                          src={
                                            e.avatar ||
                                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
                                          }
                                          alt={e.name}
                                          className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-slate-800 object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-black tracking-wider uppercase block mb-1">
                                      Daftar Pegawai:
                                    </span>
                                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                                      {emps.map((e) => {
                                        const empLocId =
                                          employeeLocations[e.id];
                                        const locObj = locations.find(
                                          (l) => l.id === empLocId,
                                        );
                                        const locName = locObj
                                          ? locObj.name
                                          : "Belum ditentukan";
                                        return (
                                          <div
                                            key={e.id}
                                            className="flex items-start gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-700/30 text-left font-sans"
                                          >
                                            <img
                                              src={
                                                e.avatar ||
                                                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
                                              }
                                              alt={e.name}
                                              className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-slate-700"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="min-w-0 flex-1 font-sans">
                                              <p
                                                className="text-[9.5px] text-slate-100 font-black leading-tight truncate"
                                                title={e.name}
                                              >
                                                {e.name}
                                              </p>
                                              <p className="text-[8px] text-slate-400 font-bold leading-none mt-0.5">
                                                NIP: {e.nip || "-"}
                                              </p>
                                              <p
                                                className="text-[8px] text-sky-400 font-bold leading-none mt-1 truncate flex items-center gap-0.5"
                                                title={locName}
                                              >
                                                <span className="shrink-0">
                                                  📍
                                                </span>{" "}
                                                {locName}
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

                        {lvl < 5 && jabatans.some((j) => j.level > lvl) && (
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
                    Jabatan:{" "}
                    <span className="text-indigo-600">
                      {
                        jabatans.find((j) => j.id === selectedJabatanForDetail)
                          ?.name
                      }
                    </span>
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
                {employees.filter(
                  (emp) =>
                    employeeJabatans[emp.id] === selectedJabatanForDetail,
                ).length === 0 ? (
                  <p className="text-center py-10 text-slate-400 italic text-xs">
                    Belum ada pegawai resmi yang ditempatkan di jabatan
                    struktural ini.
                  </p>
                ) : (
                  employees
                    .filter(
                      (emp) =>
                        employeeJabatans[emp.id] === selectedJabatanForDetail,
                    )
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 font-sans"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              emp.avatar ||
                              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
                            }
                            alt={emp.name}
                            className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {emp.name}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              NIP: {emp.nip} • Sektor: {emp.department} •{" "}
                              <span className="text-emerald-700 font-black">
                                {emp.status}
                              </span>
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Lepaskan jabatan ${jabatans.find((j) => j.id === selectedJabatanForDetail)?.name} dari ${emp.name}?`,
                                )
                              ) {
                                const updated = { ...employeeJabatans };
                                delete updated[emp.id];
                                deleteDoc(doc(db, "hpi_employee_jabatans", emp.id)).catch((err) =>
                                  console.error("Error releasing employee jabatan in Firestore:", err),
                                );
                                setEmployeeJabatans(updated);
                                onShowAlert(
                                  "Penugasan Dibuat",
                                  "Berhasil melepaskan penugasan jabatan.",
                                  "success",
                                );
                              }
                            }}
                            className="text-[9px] font-black text-rose-550 hover:text-rose-700 uppercase"
                          >
                            Lepas
                          </button>
                        )}
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
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                      Nama Lengkap Pegawai *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap (contoh: Zulfikar Murfhy)"
                      value={editingEmployee.name}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                      NIP (Nomor Induk Pegawai) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 19930801201509"
                      value={editingEmployee.nip}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          nip: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>
                </div>

                {/* Jabatan & Divisi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5">
                      Jabatan Kerja *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pelaksana"
                      value={editingEmployee.role}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          role: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-555 uppercase font-black pl-0.5">
                      Unit Kerja / Divisi *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PT. PLN ( Persero ) UP3 Bangka"
                      value={editingEmployee.department}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          department: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-305 p-3 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner font-bold"
                    />
                  </div>
                </div>

                {/* Avatar Picker Choice (File Upload / URL Input) */}
                <div className="space-y-2 animate-fade-in bg-slate-50/55 p-3 rounded-2xl border border-slate-200">
                  <label className="text-[10px] text-slate-550 uppercase font-black pl-0.5 block">
                    Avatar Profil (File lokal / URL) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="edit_emp_avatar_url"
                      type="text"
                      required
                      placeholder="Masukkan URL foto atau unggah berkas lokal"
                      value={editingEmployee.avatar}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          avatar: e.target.value,
                        })
                      }
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
                              onShowAlert(
                                "Kapasitas Penuh",
                                "Batas maksimal ukuran file gambar adalah 2MB.",
                                "alert",
                              );
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === "string") {
                                setEditingEmployee({
                                  ...editingEmployee,
                                  avatar: reader.result,
                                });
                                onShowAlert(
                                  "File Terunggah",
                                  "Berhasil memproses & mengganti file foto lokal Anda.",
                                  "success",
                                );
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal pl-0.5">
                    Mendukung unggah berkas langsung dari komputer Anda atau
                    sematkan alamat url gambar eksternal.
                  </p>
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
                    if (
                      !editingEmployee.name.trim() ||
                      !editingEmployee.role.trim()
                    ) {
                      onShowAlert(
                        "Validasi Gagal",
                        "Nama Lengkap dan Jabatan tidak boleh kosong!",
                        "alert",
                      );
                      return;
                    }
                    onAddEmployee(editingEmployee);
                    setEditingEmployee(null);
                    onShowAlert(
                      "Pegawai Diperbarui",
                      `Informasi ${editingEmployee.name} berhasil diperbarui secara permanen.`,
                      "success",
                    );
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

        {/* Modal: Edit Report Data */}
        {editingReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto min-w-[320px]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-800 space-y-4 font-sans border border-slate-200 text-left cursor-default"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 animate-pulse">
                  <Pencil size={16} className="text-blue-600" />
                  <span>Edit Data Laporan Kerja</span>
                </h3>
                <button
                  onClick={() => setEditingReport(null)}
                  className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600 cursor-pointer"
                  type="button"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {/* Row 1: Identitas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                      Nama Pegawai *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingReport.employeeName ?? ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          employeeName: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                      NIP Pegawai *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingReport.nip ?? ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          nip: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>
                </div>

                {/* Row 2: Jabatan & Unit Kerja */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                      Jabatan (Role) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingReport.role ?? ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          role: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                      Unit Kerja / Divisi *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingReport.department ?? ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          department: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner font-bold"
                    />
                  </div>
                </div>

                {/* Row 3: Tanggal Laporan */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                      Tanggal Laporan *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingReport.date ?? ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          date: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                    />
                  </div>
                </div>

                {/* Deskripsi Pekerjaan */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-black pl-0.5">
                    Deskripsi Pekerjaan *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={editingReport.description ?? ""}
                    onChange={(e) =>
                      setEditingReport({
                        ...editingReport,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl outline-none focus:border-indigo-400 text-slate-800 text-xs shadow-inner"
                  />
                </div>

                {/* Sektor & GPS Coordinates */}
                <div className="bg-sky-50 p-3 rounded-2xl border border-sky-100 space-y-2">
                  <div className="text-[9.5px] text-sky-900 font-extrabold flex items-center gap-1 uppercase tracking-wide">
                    <MapPin size={11} className="text-sky-600" />
                    <span>Informasi Geotagging GPS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold">Nama Lokasi</span>
                      <input
                        type="text"
                        required
                        value={editingReport.location?.name ?? ""}
                        onChange={(e) =>
                          setEditingReport({
                            ...editingReport,
                            location: {
                              name: e.target.value,
                              coordinates: editingReport.location?.coordinates ?? "",
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-slate-800 text-xs shadow-sm focus:border-sky-400 outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-500 uppercase font-bold">Koordinat</span>
                      <input
                        type="text"
                        required
                        value={editingReport.location?.coordinates ?? ""}
                        onChange={(e) =>
                          setEditingReport({
                            ...editingReport,
                            location: {
                              name: editingReport.location?.name ?? "",
                              coordinates: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-slate-800 text-xs font-mono shadow-sm focus:border-sky-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Input Edit Foto Sebelum & Sesudah */}
                <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-200/80 space-y-3 text-left">
                  <div className="text-[10px] text-slate-600 font-black block uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Camera size={12} className="text-[#0284c7]" />
                    <span>FOTO DOKUMENTASI KERJA (SEBELUM & SESUDAH)</span>
                  </div>

                  <div className="font-sans">
                    {/* FOTO SEBELUM & SESUDAH */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">FOTO SEBELUM &amp; SESUDAH</span>
                          <span className="text-[8px] font-black text-[#0284c7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-120 uppercase">Maks 10 MB</span>
                        </div>
                        {editingReport.photoIndoor && (
                          <button
                            type="button"
                            onClick={() => setEditingReport({ ...editingReport, photoIndoor: "", photoOutdoor: "" })}
                            className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black hover:bg-rose-200 transition cursor-pointer border-none uppercase"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                        {editingReport.photoIndoor ? (
                          <img
                            src={editingReport.photoIndoor}
                            alt="Foto Sebelum &amp; Sesudah Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400 italic text-center p-1 font-semibold">Belum ada Foto Sebelum &amp; Sesudah</span>
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <span className="w-full block bg-slate-800 hover:bg-slate-900 text-white font-black text-[9px] text-center py-2 px-1 rounded-lg transition shadow-xs active:scale-95 uppercase tracking-wider">
                          Ubah Foto Sebelum &amp; Sesudah
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                onShowAlert(
                                  "Berkas Terlalu Besar",
                                  `Batas maksimal ukuran file foto adalah 10 MB. File Anda berukuran ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
                                  "alert"
                                );
                                e.target.value = "";
                                return;
                              }
                              onShowAlert(
                                "Memproses Foto",
                                "Foto sedang dikompres secara otomatis agar pas untuk database...",
                                "success"
                              );
                              compressAndGetBase64(file, (base64) => {
                                setEditingReport({
                                  ...editingReport,
                                  photoIndoor: base64,
                                  photoOutdoor: base64,
                                });
                                onShowAlert(
                                  "Foto Berhasil Diproses",
                                  "Foto berhasil diringkas dan diperkecil ukurannya dengan aman.",
                                  "success"
                                );
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 font-sans">
                <button
                  onClick={() => setEditingReport(null)}
                  className="py-2.5 px-5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl text-xs cursor-pointer shadow transition animate-fade-in"
                  type="button"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (!editingReport.employeeName.trim()) {
                      onShowAlert("Validasi Gagal", "Nama Pegawai tidak boleh kosong!", "alert");
                      return;
                    }
                    const updatedReport = {
                      ...editingReport,
                      title: editingReport.title?.trim() || "Laporan Kerja"
                    };
                    onUpdateReport(updatedReport);
                    setEditingReport(null);
                    onShowAlert(
                      "Laporan Diperbarui",
                      `Laporan harian ${editingReport.employeeName} berhasil diperbarui secara permanen.`,
                      "success"
                    );
                  }}
                  className="py-2.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl text-xs cursor-pointer shadow transition active:scale-95"
                  type="button"
                >
                  Simpan Laporan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Interactive Statistics Detail */}
        {clickedStatType && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto min-w-[320px]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-800 space-y-4 font-sans border border-slate-200 text-left cursor-default"
            >
              {/* Header */}
              {(() => {
                let modalTitle = 'Data Detail Statistics';
                let modalSubtitle = 'Daftar data laporan kerja & karyawan';
                let headerBg = 'bg-slate-700';
                let headerIcon = <Shield size={18} />;

                if (clickedStatType === 'total') {
                  modalTitle = 'Data Pegawai (Semua Pegawai)';
                  modalSubtitle = 'Daftar semua pegawai dikoordinasikan';
                  headerBg = 'bg-[#2980b9]';
                  headerIcon = <Shield size={18} />;
                } else if (clickedStatType === 'sudah') {
                  modalTitle = 'Pegawai Sudah Laporan';
                  modalSubtitle = 'Daftar pegawai yang telah mengirimkan laporan harian hari ini';
                  headerBg = 'bg-[#0097a7]';
                  headerIcon = <UserCheck size={18} />;
                } else if (clickedStatType === 'belum') {
                  modalTitle = 'Pegawai Belum Laporan';
                  modalSubtitle = 'Daftar pegawai yang belum mengirimkan laporan harian hari ini';
                  headerBg = 'bg-[#c0392b]';
                  headerIcon = <UserX size={18} />;
                } else if (clickedStatType === 'lokasi_ada_pegawai') {
                  modalTitle = 'Lokasi Sudah Ada Pegawai';
                  modalSubtitle = 'Daftar lokasi kerja yang sudah memiliki penugasan pegawai';
                  headerBg = 'bg-[#10b981]';
                  headerIcon = <Check size={18} />;
                } else if (clickedStatType === 'lokasi_tanpa_pegawai') {
                  modalTitle = 'Lokasi Belum Ada Pegawai';
                  modalSubtitle = 'Daftar lokasi kerja kosong tanpa penugasan pegawai';
                  headerBg = 'bg-[#f97316]';
                  headerIcon = <AlertTriangle size={18} />;
                } else if (clickedStatType === 'pegawai_punya_lokasi') {
                  modalTitle = 'Pegawai Sudah Punya Lokasi';
                  modalSubtitle = 'Daftar seluruh pegawai yang telah ditempatkan di lokasi kerja';
                  headerBg = 'bg-[#12a176]';
                  headerIcon = <UserCheck size={18} />;
                } else if (clickedStatType === 'pegawai_tanpa_lokasi') {
                  modalTitle = 'Pegawai Belum Punya Lokasi';
                  modalSubtitle = 'Daftar karyawan yang belum memiliki penugasan lokasi kerja';
                  headerBg = 'bg-[#ef4444]';
                  headerIcon = <XCircle size={18} />;
                }

                return (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-sans">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl text-white ${headerBg}`}>
                        {headerIcon}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {modalTitle}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                          {modalSubtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setClickedStatType(null)}
                      className="p-1 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600 cursor-pointer border-none"
                      type="button"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                );
              })()}

              {/* Search Bar inside Modal */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder={
                    clickedStatType.startsWith('lokasi_') 
                      ? "Cari lokasi berdasarkan nama, kode, atau alamat..." 
                      : "Cari pegawai berdasarkan nama, NIP, atau divisi..."
                  }
                  value={statModalSearch}
                  onChange={(e) => setStatModalSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-9 rounded-xl outline-none text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-400 transition font-sans"
                />
              </div>

              {/* List Container */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {(() => {
                  // --- RENDER FOR LOCATIONS (lokasi_ada_pegawai | lokasi_tanpa_pegawai) ---
                  if (clickedStatType.startsWith('lokasi_')) {
                    const matchingLocations = locations.filter(loc => {
                      const assignedEmployees = employees.filter(emp => employeeLocations[emp.id] === loc.id);
                      const hasEmployees = assignedEmployees.length > 0;
                      const isMatch = clickedStatType === 'lokasi_ada_pegawai' ? hasEmployees : !hasEmployees;
                      
                      if (!isMatch) return false;

                      if (!statModalSearch.trim()) return true;
                      const searchLower = statModalSearch.toLowerCase();
                      return (
                        loc.name.toLowerCase().includes(searchLower) ||
                        (loc.address && loc.address.toLowerCase().includes(searchLower)) ||
                        (loc.code && loc.code.toLowerCase().includes(searchLower))
                      );
                    });

                    if (matchingLocations.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-400 italic text-xs">
                          Tidak ada lokasi yang cocok dengan kriteria pencarian.
                        </div>
                      );
                    }

                    return matchingLocations.map((loc) => {
                      const assignedEmployees = employees.filter(emp => employeeLocations[emp.id] === loc.id);
                      return (
                        <div key={loc.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition text-left space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 uppercase">
                                <MapPin size={12} className="text-sky-600 shrink-0" />
                                <span>{loc.name}</span>
                              </h4>
                              {loc.address && (
                                <p className="text-[10px] text-slate-500 mt-0.5">{loc.address}</p>
                              )}
                            </div>
                            <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              {loc.code || "SEC-00"}
                            </span>
                          </div>

                          {/* List assigned employees for this location */}
                          {assignedEmployees.length > 0 ? (
                            <div className="pt-2 border-t border-slate-100/70 space-y-1.5">
                              <p className="text-[9px] text-[#059669] font-black uppercase tracking-wider flex items-center gap-1">
                                <Users size={10} />
                                <span>Petugas Ditugaskan ({assignedEmployees.length}):</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {assignedEmployees.map((emp) => (
                                  <div key={emp.id} className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-150/80 text-[11px]">
                                    <div className="w-5 h-5 rounded-full bg-slate-150 text-slate-700 flex items-center justify-center font-bold text-[9px] uppercase">
                                      {emp.name.substring(0, 2)}
                                    </div>
                                    <div className="truncate">
                                      <span className="font-extrabold text-slate-800 uppercase block leading-tight">{emp.name}</span>
                                      <span className="text-[8.5px] text-slate-400 font-semibold">{emp.nip} • {emp.role || 'PETUGAS'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1.5 border-t border-slate-100/70 text-left">
                              <p className="text-[9px] text-rose-500 font-extrabold uppercase italic">
                                Belum ada pegawai ditugaskan ke lokasi ini.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    });
                  }

                  // --- RENDER FOR EMPLOYEES (total | sudah | belum | pegawai_punya_lokasi | pegawai_tanpa_lokasi) ---
                  const nowE = new Date();
                  const yearE = nowE.getFullYear();
                  const monthE = String(nowE.getMonth() + 1).padStart(2, '0');
                  const dayE = String(nowE.getDate()).padStart(2, '0');
                  const todayPrefixE = `${yearE}-${monthE}-${dayE}`;
                  const todayReportsE = reports.filter(r => r.date && (r.date.startsWith(todayPrefixE) || r.date.includes(todayPrefixE)));

                  const matchingEmployees = employees.filter(emp => {
                    let isMatch = false;
                    const reportsSubmittedAll = reports.filter(r => r.employeeId === emp.id || r.nip === emp.nip);
                    const reportsSubmittedToday = todayReportsE.filter(r => r.employeeId === emp.id || r.nip === emp.nip);
                    const hasLoc = !!employeeLocations[emp.id];

                    if (clickedStatType === 'total') {
                      isMatch = true;
                    } else if (clickedStatType === 'sudah') {
                      isMatch = reportsSubmittedToday.length > 0;
                    } else if (clickedStatType === 'belum') {
                      isMatch = reportsSubmittedToday.length === 0;
                    } else if (clickedStatType === 'pegawai_punya_lokasi') {
                      isMatch = hasLoc;
                    } else if (clickedStatType === 'pegawai_tanpa_lokasi') {
                      isMatch = !hasLoc;
                    }

                    if (!isMatch) return false;

                    if (!statModalSearch.trim()) return true;
                    const searchLower = statModalSearch.toLowerCase();
                    return (
                      emp.name.toLowerCase().includes(searchLower) ||
                      emp.nip.toLowerCase().includes(searchLower) ||
                      (emp.role && emp.role.toLowerCase().includes(searchLower)) ||
                      (emp.department && emp.department.toLowerCase().includes(searchLower))
                    );
                  });

                  if (matchingEmployees.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 italic text-xs">
                        Tidak ada pegawai yang cocok dengan kriteria pencarian.
                      </div>
                    );
                  }

                  return matchingEmployees.map((emp) => {
                    const submissionCount = reports.filter(r => r.employeeId === emp.id || r.nip === emp.nip).length;
                    const todaySubmissionCount = todayReportsE.filter(r => r.employeeId === emp.id || r.nip === emp.nip).length;
                    const locId = employeeLocations[emp.id];
                    const assignedLoc = locations.find(l => l.id === locId);

                    return (
                      <div 
                        key={emp.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition gap-2 text-left"
                      >
                        <div className="flex items-center gap-3">
                          {emp.avatar ? (
                            <img 
                              src={emp.avatar} 
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
                              alt={emp.name} 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {emp.name ? emp.name.substring(0, 2) : "E"}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{emp.name}</span>
                              <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                                {emp.nip}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium text-slate-500">
                              {emp.role || "Petugas Lapangan"} • <strong className="text-slate-600 font-bold">{emp.department || "PT. HPI"}</strong>
                            </div>

                            {/* Show details of assigned location if applicable */}
                            {assignedLoc ? (
                              <div className="text-[9px] text-[#059669] font-bold flex items-center gap-0.5 mt-0.5">
                                <MapPin size={9} />
                                <span>Lokasi Tugas: <strong>{assignedLoc.name}</strong></span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-rose-500 font-bold italic mt-0.5">
                                Belum ditempatkan di lokasi kerja
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {clickedStatType === 'belum' ? (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-lg uppercase tracking-wider">
                              Belum Laporan
                            </span>
                          ) : clickedStatType === 'sudah' ? (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                              <span>{todaySubmissionCount} Laporan Hari Ini</span>
                            </span>
                          ) : clickedStatType === 'total' ? (
                            <span className="text-[9px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                              <span>{submissionCount} Laporan</span>
                            </span>
                          ) : null}

                          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${
                            emp.status === 'Aktif' ? 'bg-sky-100 text-sky-700' :
                            emp.status === 'Cuti' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {emp.status}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Close Footer Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setClickedStatType(null)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer shadow transition border-none"
                  type="button"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 7. Confirm Delete Location Modal */}
        {locationIdToDelete &&
          (() => {
            const loc = locations.find((l) => l.id === locationIdToDelete);
            if (!loc) return null;

            // Count sub-levels recursively
            const recursiveSubCount = (parentId: string): number => {
              let count = 0;
              const subs = locations.filter((l) => l.parentId === parentId);
              count += subs.length;
              subs.forEach((s) => {
                count += recursiveSubCount(s.id);
              });
              return count;
            };
            const totalSubs = recursiveSubCount(locationIdToDelete);
            const affectedEmployeesCount = employees.filter((emp) => {
              // Check if employee is at this location or any sub-location
              const empLocId = employeeLocations[emp.id];
              if (!empLocId) return false;
              if (empLocId === locationIdToDelete) return true;

              // Check recursive parent
              let currentParentId = locations.find(
                (l) => l.id === empLocId,
              )?.parentId;
              while (currentParentId) {
                if (currentParentId === locationIdToDelete) return true;
                currentParentId = locations.find(
                  (l) => l.id === currentParentId,
                )?.parentId;
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
                      <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">
                        Hapus Lokasi Kerja?
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Konfirmasi Tindakan Permanen
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Anda akan menghapus lokasi kerja{" "}
                      <span className="font-black text-rose-600">
                        {loc.name}
                      </span>
                      .
                    </p>
                    {totalSubs > 0 && (
                      <p className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl font-bold">
                        ⚠️ Perhatian: Tindakan ini juga akan menghapus secara
                        otomatis{" "}
                        <span className="font-black text-red-655">
                          {totalSubs} sub-lokasi
                        </span>{" "}
                        yang terdaftar di bawah unit ini!
                      </p>
                    )}
                    {affectedEmployeesCount > 0 && (
                      <p className="bg-rose-50 border border-rose-250 text-rose-800 p-2.5 rounded-xl font-bold">
                        👥 Pegawai Terdampak: Sebanyak{" "}
                        <span className="font-extrabold">
                          {affectedEmployeesCount} pegawai
                        </span>{" "}
                        yang bertugas di lokasi ini akan secara otomatis dilepas
                        dari penempatan area kerja.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-semibold italic">
                      Tindakan ini permanen dan database lokal akan segera
                      diperbarui.
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
        {jabatanIdToDelete &&
          (() => {
            const jab = jabatans.find((j) => j.id === jabatanIdToDelete);
            if (!jab) return null;

            const affectedCount = employees.filter(
              (emp) => employeeJabatans[emp.id] === jabatanIdToDelete,
            ).length;

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
                      <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">
                        Hapus Jabatan?
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Konfirmasi Struktur Komando
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      Anda akan menghapus jabatan struktural{" "}
                      <span className="font-black text-rose-600">
                        {jab.name}
                      </span>
                      .
                    </p>
                    {affectedCount > 0 && (
                      <p className="bg-rose-50 border border-rose-250 text-rose-800 p-2.5 rounded-xl font-bold">
                        👥 Pegawai Aktif: Jabatan ini saat ini ditugaskan kepada{" "}
                        <span className="font-extrabold text-rose-600">
                          {affectedCount} pegawai
                        </span>
                        . Penugasan mereka akan dibatalkan/dilepas secara
                        otomatis.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 font-semibold italic">
                      Tindakan ini permanen dan database lokal akan segera
                      diperbarui.
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
        {selectedEmpForRekapDetail &&
          (() => {
            const emp = employees.find(
              (e) => e.id === selectedEmpForRekapDetail,
            );
            if (!emp) return null;

            const monthsNamesIndo = [
              "Januari",
              "Februari",
              "Maret",
              "April",
              "Mei",
              "Juni",
              "Juli",
              "Agustus",
              "September",
              "Oktober",
              "November",
              "Desember",
            ];

            const daysInMonth = new Date(rekapYear, rekapMonth, 0).getDate();
            const daysArray = Array.from(
              { length: daysInMonth },
              (_, i) => i + 1,
            );

            const belongsToMonthYear = (
              dateStr: string,
              targetMonth: number,
              targetYear: number,
            ) => {
              if (!dateStr) return false;
              const parts = dateStr.split("-");
              if (parts.length < 2) return false;
              const yr = parseInt(parts[0], 10);
              const mo = parseInt(parts[1], 10);
              return yr === targetYear && mo === targetMonth;
            };

            const empReports = reports.filter((r) => {
              const isSameId = r.employeeId === emp.id;
              const isSameNip =
                r.nip && emp.nip && r.nip.trim() === emp.nip.trim();
              const isSameName =
                r.employeeName &&
                emp.name &&
                r.employeeName.toLowerCase().trim() ===
                  emp.name.toLowerCase().trim();
              return (
                (isSameId || isSameNip || isSameName) &&
                belongsToMonthYear(r.date, rekapMonth, rekapYear)
              );
            });

            const getWeekdaysInMonth = (month: number, year: number) => {
              const list: string[] = [];
              const daysInMonthVal = new Date(year, month, 0).getDate();
              for (let d = 1; d <= daysInMonthVal; d++) {
                const dateObj = new Date(year, month - 1, d);
                const dayOfWeek = dateObj.getDay(); 
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                  if (!isTanggalMerah(year, month, d)) {
                    const mmStr = String(month).padStart(2, "0");
                    const ddStr = String(d).padStart(2, "0");
                    list.push(`${year}-${mmStr}-${ddStr}`);
                  }
                }
              }
              return list;
            };

            const weekdaysM = getWeekdaysInMonth(rekapMonth, rekapYear);
            const activeWeekdaysM = weekdaysM;

            const totalHariKerjaM = activeWeekdaysM.length;
            let countHariKirimLaporanM = 0;
            activeWeekdaysM.forEach(dayStr => {
              const repsOnDay = empReports.filter(r => r.date && r.date.startsWith(dayStr));
              const hasPhoto = repsOnDay.some(r => 
                (r.photoIndoor && r.photoIndoor.trim() !== "") ||
                (r.photoOutdoor && r.photoOutdoor.trim() !== "")
              );
              if (hasPhoto) {
                countHariKirimLaporanM++;
              }
            });

            const currentScore = totalHariKerjaM > 0 
              ? Math.round((countHariKirimLaporanM / totalHariKerjaM) * 100)
              : 0;

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
                        <img
                           src={emp.avatar}
                           alt={emp.name}
                           className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shrink-0"
                           referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-extrabold flex items-center justify-center shrink-0 uppercase border border-slate-700">
                          {emp.name.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                          {emp.name}
                        </h3>
                        <p className="text-[10px] text-slate-450 font-mono font-bold mt-0.5">
                          NIP {emp.nip} | {emp.role || "Tenaga Lapangan"} —{" "}
                          {emp.department || "Operasional"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-sky-500/10 border border-sky-500/30 text-sky-305 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider">
                      REKAP DETAIL: {monthsNamesIndo[rekapMonth - 1]}{" "}
                      {rekapYear}
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 text-left">
                    <div className="bg-white border border-slate-205 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wide text-left">
                          Ringkasan Pelaporan Bulan Ini (Kerja Mon-Fri)
                        </h4>
                        <p className="text-xs text-slate-600 leading-normal text-left">
                          Karyawan memenuhi kewajiban mengirim foto sebanyak{" "}
                          <span className="font-extrabold text-[#0284c7]">
                            {countHariKirimLaporanM} hari
                          </span>{" "}
                          dari total {totalHariKerjaM} hari kerja (Sabtu & Minggu tidak dihitung). Nilai Kinerja Bulanan: <span className="font-extrabold text-emerald-600">{currentScore}%</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      {daysArray.map((day) => {
                        const dateObj = new Date(rekapYear, rekapMonth - 1, day);
                        const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        const isHoliday = isTanggalMerah(rekapYear, rekapMonth, day);

                        if (isWeekend || isHoliday) {
                          return (
                            <div
                              key={day}
                              className="bg-slate-100/60 opacity-75 rounded-2xl p-4 border border-slate-200/50 flex flex-col justify-between gap-1 shadow-xs"
                            >
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="text-slate-500 font-bold text-xs flex items-center gap-1.5">
                                  <span>{day} {monthsNamesIndo[rekapMonth - 1]} {rekapYear}</span>
                                  <span className="text-[10px] text-slate-400">
                                    ({isWeekend ? (dayOfWeek === 0 ? "Minggu" : "Sabtu") : "Tanggal Merah"})
                                  </span>
                                </div>
                                <div>
                                  <span className={`border text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${isWeekend ? "bg-slate-200 text-slate-500 border-slate-300" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                                    {isWeekend ? "WEEKEND" : "TANGGAL MERAH"}
                                  </span>
                                </div>
                              </div>
                              <div className={`py-8 text-center italic font-black text-[9px] tracking-widest uppercase ${isWeekend ? "text-slate-400" : "text-rose-500"}`}>
                                {isWeekend ? "HARI LIBUR / TIDAK ADA KEWAJIBAN" : "HARI LIBUR NASIONAL / TIDAK ADA KEWAJIBAN"}
                              </div>
                            </div>
                          );
                        }

                        const dayStr = `${rekapYear}-${String(rekapMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const reportsOnDay = empReports.filter((r) => {
                          if (!r.date) return false;
                          if (r.date === dayStr) return true;
                          const parts = r.date.split("-");
                          if (parts.length === 3) {
                            const yr = parseInt(parts[0], 10);
                            const mo = parseInt(parts[1], 10);
                            const dy = parseInt(parts[2], 10);
                            return (
                              yr === rekapYear &&
                              mo === rekapMonth &&
                              dy === day
                            );
                          }
                          return false;
                        });
                        const reportOnDay = reportsOnDay[0];

                        const hasIndoor = reportsOnDay.some(
                          (r) => r.photoIndoor && r.photoIndoor.trim() !== "",
                        );
                        const hasOutdoor = reportsOnDay.some(
                          (r) => r.photoOutdoor && r.photoOutdoor.trim() !== "",
                        );

                        return (
                          <div
                            key={day}
                            className="bg-white rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="text-slate-800 font-bold text-xs">
                                {day} {monthsNamesIndo[rekapMonth - 1]}{" "}
                                {rekapYear}
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

                            <div className="pt-1">
                              <div className="space-y-1.5 text-center">
                                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">
                                  ● FOTO SEBELUM & SESUDAH
                                </span>
                                {(() => {
                                  const dayPhotos: string[] = [];
                                  reportsOnDay.forEach((r) => {
                                    if (r.photoIndoor && r.photoIndoor.trim() !== "") {
                                      dayPhotos.push(r.photoIndoor);
                                    }
                                    if (r.photoOutdoor && r.photoOutdoor.trim() !== "" && r.photoOutdoor !== r.photoIndoor) {
                                      dayPhotos.push(r.photoOutdoor);
                                    }
                                  });
                                  const uniqueDayPhotos = Array.from(new Set(dayPhotos.filter(Boolean)));
                                  
                                  if (uniqueDayPhotos.length > 0) {
                                    return (
                                      <div className={`${uniqueDayPhotos.length === 1 ? 'max-w-sm mx-auto' : 'grid grid-cols-2 gap-1.5'}`}>
                                        {uniqueDayPhotos.map((pUrl, pIdx) => (
                                          <div key={pIdx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-250 bg-slate-50 group">
                                            <img
                                              src={pUrl}
                                              alt={`Foto ${pIdx + 1}`}
                                              className="w-full h-full object-cover animate-fade-in"
                                              referrerPolicy="no-referrer"
                                            />
                                            <span className="absolute bottom-1 right-1 bg-black/85 text-emerald-400 text-[6.5px] px-1.5 py-0.5 rounded border border-white/5 font-bold font-mono">
                                              FOTO {pIdx + 1}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="aspect-video rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[9px] italic p-1.5 min-h-[60px] max-w-sm mx-auto">
                                        <XCircle
                                          size={14}
                                          className="text-rose-400 mb-1"
                                        />
                                        <span>Kosong</span>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            </div>

                            {reportsOnDay.length > 0 && (
                              <div className="space-y-1.5 mt-1 max-h-[140px] overflow-y-auto pr-1">
                                {reportsOnDay.map((rep, rIdx) => (
                                  <div key={rep.id} className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-600 border border-slate-200/50 text-left">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="font-extrabold text-slate-800 text-[9px] truncate">
                                        ● Lap {rIdx + 1}: {rep.title}
                                      </span>
                                      <span className="text-[7.5px] font-mono text-slate-400 shrink-0">
                                        ID: {rep.id}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 whitespace-pre-wrap line-clamp-2">
                                      {rep.description || "-"}
                                    </p>
                                  </div>
                                ))}
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
        {cameraModalTarget &&
          (() => {
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
                      <Camera
                        size={18}
                        className="text-sky-400 animate-pulse"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Ambil Foto Laporan Kerja
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
                        <p className="font-semibold leading-relaxed">
                          {cameraError}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenLiveCamera(cameraModalTarget)
                          }
                          className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition uppercase tracking-wider cursor-pointer active:scale-95"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                        {!activeCameraStream && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-1.5 p-3">
                            <RefreshCw
                              size={22}
                              className="animate-spin text-sky-400"
                            />
                            <span className="text-xs font-bold animate-pulse text-slate-300">
                              Menunggu Izin Kamera...
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Silakan izinkan kamera laptop atau handphone jika
                              muncul permintaan
                            </span>
                          </div>
                        )}

                        <video
                          id="camera_preview_video"
                          ref={videoRefCallback}
                          playsInline
                          muted
                          className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
                          style={{
                            transform:
                              cameraModalTarget === "indoor"
                                ? "scaleX(-1)"
                                : "none",
                          }}
                        />

                        {activeCameraStream && (
                          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-mono border border-slate-800/50 flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            <span>LIVE FEED OK | CAMERA SENSOR</span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 italic text-center max-w-xs">
                      Sentuh atau Klik tombol di bawah ini untuk mengabadikan
                      momen laporan secara real-time.
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
