import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Check,
  Layers,
  AlertTriangle,
  Play,
  Pause,
  Terminal,
  Loader2,
  Cpu,
  FileText,
  Lock,
  Download,
  CheckSquare,
  Sparkles
} from "lucide-react";
import { getSourceFirestore, getTargetFirestore, OLD_FIREBASE_CONFIG, NEW_FIREBASE_CONFIG } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc } from "firebase/firestore";

interface DatabaseMigrationCenterProps {
  onShowAlert: (title: string, message: string, type: "success" | "alert") => void;
  onRefreshAllData?: () => void;
  employees?: any;
  attendance?: any;
  reports?: any;
  userAccounts?: any;
  googleToken?: any;
  sheetsSpreadsheetId?: any;
}

const FIREBASE_COLLECTIONS = [
  "dashboard",
  "employees",
  "attendance",
  "hpi_user_accounts",
  "hpi_locations",
  "hpi_employee_locations",
  "hpi_jabatans",
  "hpi_employee_jabatans"
];

const COLLECTION_LABELS: Record<string, string> = {
  dashboard: "Data Pelaporan / Patroli",
  employees: "Data Pegawai Lapangan",
  attendance: "Data Presensi / Kehadiran",
  hpi_user_accounts: "Akun Pengguna Tambahan",
  hpi_locations: "Sektor / Wilayah Kerja",
  hpi_employee_locations: "Penempatan Lokasi Pegawai",
  hpi_jabatans: "Master Jabatan Kerja",
  hpi_employee_jabatans: "Penempatan Jabatan Pegawai"
};

const LOCAL_STORAGE_KEYS: Record<string, string> = {
  dashboard: "db_reports",
  employees: "db_employees",
  attendance: "db_attendance",
  hpi_user_accounts: "db_user_accounts",
  hpi_locations: "hpi_locations",
  hpi_employee_locations: "hpi_employee_locations",
  hpi_jabatans: "hpi_jabatans",
  hpi_employee_jabatans: "hpi_employee_jabatans"
};

const getLocalStorageData = (colName: string): any[] => {
  if (typeof window === "undefined") return [];
  const key = LOCAL_STORAGE_KEYS[colName];
  if (!key) return [];
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

interface CollectionProgress {
  name: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  currentId: string;
  status: "idle" | "pending" | "running" | "completed" | "failed" | "paused";
}

interface VerificationReport {
  collectionName: string;
  sourceCount: number;
  targetCount: number;
  matchedCount: number;
  unmatchedIds: string[];
  mismatchedFields: { id: string; fields: string[] }[];
  status: "matched" | "unmatched" | "not_scanned";
}

export default function DatabaseMigrationCenter({
  onShowAlert,
  onRefreshAllData
}: DatabaseMigrationCenterProps) {
  // Connection states
  const [activeDbMode, setActiveDbMode] = useState<"old" | "new">(() => {
    return localStorage.getItem("firebase_migration_completed_to_new") !== "false" ? "new" : "old";
  });
  const [migrationSource, setMigrationSource] = useState<"cloud" | "local_storage">("cloud");

  // Action status states
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "scanning" | "migrating" | "paused" | "verifying" | "success" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  
  // Scanned collections states
  const [scanData, setScanData] = useState<Record<string, { sourceCount: number; targetCount: number; status: "synced" | "mismatch" | "pending" }>>({});
  
  // Migration progress states
  const [progress, setProgress] = useState<Record<string, CollectionProgress>>(() => {
    const initial: Record<string, CollectionProgress> = {};
    FIREBASE_COLLECTIONS.forEach(col => {
      initial[col] = {
        name: col,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        currentId: "",
        status: "idle"
      };
    });
    return initial;
  });

  // Verification results
  const [verificationReports, setVerificationReports] = useState<Record<string, VerificationReport>>({});
  const [overallVerified, setOverallVerified] = useState<boolean | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const migrationRef = useRef<{ isPaused: boolean }>({ isPaused: false });

  // Add Log helper
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Scroll to logs end
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Download Logs Helper
  const downloadLogs = () => {
    const element = document.createElement("a");
    const file = new Blob([logs.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `migration_logs_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 1. Scan Collection Action
  const executeScanCollections = async () => {
    setMigrationStatus("scanning");
    setLogs([]);
    addLog("=== MEMULAI PEMINDAIAN KOLEKSI FIRESTORE ===");
    if (migrationSource === "cloud") {
      addLog(`Sumber Database (Lama): Cloud Firestore (${OLD_FIREBASE_CONFIG.projectId})`);
    } else {
      addLog(`Sumber Database (Lama): Penyimpanan Lokal Browser (Local Storage)`);
    }
    addLog(`Target Database (Baru): Cloud Firestore (${NEW_FIREBASE_CONFIG.projectId})`);

    try {
      const targetDb = getTargetFirestore();
      const newScanData: typeof scanData = {};

      for (const col of FIREBASE_COLLECTIONS) {
        addLog(`Memindai koleksi '${col}' (${COLLECTION_LABELS[col] || "Master Data"})...`);
        
        let sourceCount = 0;
        let targetCount = 0;

        if (migrationSource === "cloud") {
          try {
            const sourceDb = getSourceFirestore();
            const sourceSnap = await getDocs(collection(sourceDb, col));
            sourceCount = sourceSnap.size;
            addLog(`  -> Sumber (Cloud): ${sourceCount} dokumen ditemukan.`);
          } catch (e: any) {
            addLog(`  ❌ Gagal memindai database sumber cloud untuk koleksi '${col}': ${e.message || e}`);
          }
        } else {
          // Local Storage
          const localDocs = getLocalStorageData(col);
          sourceCount = localDocs.length;
          addLog(`  -> Sumber (Lokal Browser): ${sourceCount} dokumen ditemukan di key '${LOCAL_STORAGE_KEYS[col]}'.`);
        }

        try {
          const targetSnap = await getDocs(collection(targetDb, col));
          targetCount = targetSnap.size;
          addLog(`  -> Target (Cloud): ${targetCount} dokumen ditemukan.`);
        } catch (e: any) {
          addLog(`  ⚠️ Gagal memindai database target untuk koleksi '${col}' (mungkin belum dibuat): ${e.message || e}`);
        }

        const isSynced = sourceCount === targetCount && sourceCount > 0;
        newScanData[col] = {
          sourceCount,
          targetCount,
          status: isSynced ? "synced" : sourceCount === 0 ? "synced" : "mismatch"
        };

        // Seed initial progress numbers
        setProgress(prev => ({
          ...prev,
          [col]: {
            ...prev[col],
            total: sourceCount,
            status: "idle"
          }
        }));
      }

      setScanData(newScanData);
      setMigrationStatus("idle");
      addLog("=== PEMINDAIAN KOLEKSI SELESAI ===");
      onShowAlert("Pemindaian Selesai", "Koleksi berhasil dideteksi dan dihitung.", "success");
    } catch (err: any) {
      addLog(`❌ PEMINDAIAN GAGAL: ${err.message || err}`);
      setMigrationStatus("error");
      onShowAlert("Pemindaian Gagal", err.message || "Gagal memindai koleksi.", "alert");
    }
  };

  // Helper for deep equality comparison
  const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 instanceof Date && obj2 instanceof Date) return obj1.getTime() === obj2.getTime();
    
    // Check Firestore Timestamp equality
    if (obj1 && obj1.seconds !== undefined && obj1.nanoseconds !== undefined &&
        obj2 && obj2.seconds !== undefined && obj2.nanoseconds !== undefined) {
      return obj1.seconds === obj2.seconds && obj1.nanoseconds === obj2.nanoseconds;
    }
    
    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
      return false;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  };

  // Helper to extract mismatched field names
  const getMismatchedFields = (obj1: any, obj2: any): string[] => {
    const mismatched: string[] = [];
    if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object") {
      return ["_root_data_mismatch"];
    }
    const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
    for (const key of allKeys) {
      if (!(key in obj1)) {
        mismatched.push(`${key} (tambahan di target)`);
      } else if (!(key in obj2)) {
        mismatched.push(`${key} (hilang di target)`);
      } else if (!deepEqual(obj1[key], obj2[key])) {
        mismatched.push(key);
      }
    }
    return mismatched;
  };

  // 2. Start & Resume Migration Action
  const executeMigration = async (isResumeRun: boolean = false) => {
    migrationRef.current.isPaused = false;
    setMigrationStatus("migrating");
    
    if (!isResumeRun) {
      setLogs([]);
      addLog("=== MEMULAI MIGRASI DATABASE LENGKAP ===");
    } else {
      addLog("=== MELANJUTKAN MIGRASI DATABASE YANG TERTUNDA ===");
    }

    if (migrationSource === "cloud") {
      addLog("Sumber: Cloud Firestore (Lama)");
    } else {
      addLog("Sumber: Penyimpanan Lokal Browser (Local Storage)");
    }
    addLog(`Metode: ${isResumeRun ? "Resume (Melewati dokumen yang sudah ada di target)" : "Mulai Baru (Melewati dokumen yang sudah ada di target)"}`);

    try {
      const targetDb = getTargetFirestore();

      // Reset progress states if starting fresh
      if (!isResumeRun) {
        setProgress(prev => {
          const reset: typeof progress = {};
          Object.keys(prev).forEach(key => {
            reset[key] = {
              name: key,
              total: 0,
              success: 0,
              failed: 0,
              skipped: 0,
              currentId: "",
              status: "pending"
            };
          });
          return reset;
        });
      }

      for (const col of FIREBASE_COLLECTIONS) {
        if (migrationRef.current.isPaused) {
          addLog("⚠️ Migrasi dihentikan sementara oleh administrator.");
          setMigrationStatus("paused");
          setProgress(prev => {
            const updated: typeof progress = { ...prev };
            Object.keys(updated).forEach(k => {
              if (updated[k].status === "running" || updated[k].status === "pending") {
                updated[k].status = "paused";
              }
            });
            return updated;
          });
          onShowAlert("Migrasi Ditunda", "Sesi migrasi berhasil dijeda dengan aman.", "alert");
          return;
        }

        addLog(`Memproses Koleksi: '${col}'...`);
        
        // Mark as running
        setProgress(prev => ({
          ...prev,
          [col]: { ...prev[col], status: "running" }
        }));

        let docsList: any[] = [];
        let totalDocs = 0;

        if (migrationSource === "cloud") {
          try {
            const sourceDb = getSourceFirestore();
            const sourceSnap = await getDocs(collection(sourceDb, col));
            totalDocs = sourceSnap.size;
            docsList = sourceSnap.docs.map(docSnap => ({
              id: docSnap.id,
              data: docSnap.data()
            }));
          } catch (e: any) {
            addLog(`  ❌ Gagal mengambil dokumen cloud untuk koleksi '${col}': ${e.message || e}`);
          }
        } else {
          // Local Storage
          const localDocs = getLocalStorageData(col);
          totalDocs = localDocs.length;
          docsList = localDocs.map((item, index) => {
            const docId = item.id || item.userId || item.uid || `local_doc_${index}`;
            return {
              id: docId,
              data: item
            };
          });
        }
        
        setProgress(prev => ({
          ...prev,
          [col]: { ...prev[col], total: totalDocs }
        }));

        addLog(`  -> Total ${totalDocs} dokumen ditemukan.`);

        let success = isResumeRun ? progress[col]?.success || 0 : 0;
        let skipped = isResumeRun ? progress[col]?.skipped || 0 : 0;
        let failed = isResumeRun ? progress[col]?.failed || 0 : 0;

        for (let i = 0; i < docsList.length; i++) {
          if (migrationRef.current.isPaused) {
            addLog("⚠️ Jeda terdeteksi saat memproses item. Mengamankan status...");
            setMigrationStatus("paused");
            setProgress(prev => ({
              ...prev,
              [col]: { ...prev[col], status: "paused" }
            }));
            onShowAlert("Migrasi Ditunda", "Migrasi dijeda.", "alert");
            return;
          }

          const { id: docId, data: docData } = docsList[i];

          setProgress(prev => ({
            ...prev,
            [col]: {
              ...prev[col],
              currentId: docId
            }
          }));

          // Check if document already exists in destination
          try {
            const targetDocRef = doc(targetDb, col, docId);
            const targetSnap = await getDoc(targetDocRef);
            let shouldOverwrite = !isResumeRun;

            if (targetSnap.exists() && isResumeRun) {
              const targetData = targetSnap.data();
              if (targetData) {
                const targetHasTrimmed = 
                  (targetData.photoIndoor && targetData.photoIndoor.includes("placeholder_trimmed")) ||
                  (targetData.photoOutdoor && targetData.photoOutdoor.includes("placeholder_trimmed")) ||
                  (targetData.photo && targetData.photo.includes("placeholder_trimmed")) ||
                  (targetData.imagePath && targetData.imagePath.includes("placeholder_trimmed"));
                
                const sourceHasFull = docData && (
                  (docData.photoIndoor && !docData.photoIndoor.includes("placeholder_trimmed") && docData.photoIndoor.length > 500) ||
                  (docData.photoOutdoor && !docData.photoOutdoor.includes("placeholder_trimmed") && docData.photoOutdoor.length > 500) ||
                  (docData.photo && !docData.photo.includes("placeholder_trimmed") && docData.photo.length > 500) ||
                  (docData.imagePath && !docData.imagePath.includes("placeholder_trimmed") && docData.imagePath.length > 500)
                );

                if (targetHasTrimmed && sourceHasFull) {
                  shouldOverwrite = true;
                }
              }
            }

            if (targetSnap.exists() && !shouldOverwrite) {
              // Exists - Skip and count as skipped to prevent duplicates
              skipped++;
              setProgress(prev => ({
                ...prev,
                [col]: {
                  ...prev[col],
                  skipped
                }
              }));
              
              if (i % 20 === 0 || totalDocs < 10) {
                addLog(`  [SKIP] Dokumen '${docId}' sudah ada di target. Melewati...`);
              }
            } else {
              // Write new or updated document
              await setDoc(targetDocRef, docData);
              success++;
              setProgress(prev => ({
                ...prev,
                [col]: {
                  ...prev[col],
                  success
                }
              }));
              
              if (shouldOverwrite && targetSnap.exists()) {
                addLog(`  [OVERWRITE] Sukses memperbarui & memulihkan foto dokumen '${docId}'.`);
              } else if (i % 5 === 0 || totalDocs < 10) {
                addLog(`  [WRITE] Sukses memindahkan dokumen '${docId}'.`);
              }
            }
          } catch (writeErr: any) {
            failed++;
            addLog(`  ❌ Gagal memindahkan dokumen '${docId}': ${writeErr.message || writeErr}`);
            setProgress(prev => ({
              ...prev,
              [col]: {
                ...prev[col],
                failed
              }
            }));
          }
        }

        // Mark collection as completed
        setProgress(prev => ({
          ...prev,
          [col]: { ...prev[col], status: "completed" }
        }));
        
        addLog(`✅ Koleksi '${col}' selesai diproses. Sukses: ${success}, Dilewati: ${skipped}, Gagal: ${failed}`);
      }

      setMigrationStatus("success");
      addLog("=== PROSES MIGRASI LENGKAP SELESAI ===");
      addLog("Silakan lakukan Verifikasi Data untuk memastikan integritas data 100%.");
      onShowAlert("Migrasi Selesai", "Seluruh data telah berhasil dipindahkan. Lakukan verifikasi data sekarang.", "success");
    } catch (err: any) {
      addLog(`❌ MIGRASI GAGAL: ${err.message || err}`);
      setMigrationStatus("error");
      onShowAlert("Migrasi Gagal", err.message || "Terjadi kesalahan fatal selama migrasi.", "alert");
    }
  };

  // Pause migration handler
  const pauseMigration = () => {
    migrationRef.current.isPaused = true;
    addLog("Sedang mengirim sinyal jeda...");
  };

  // 3. Verify Data Action
  const executeVerification = async () => {
    setMigrationStatus("verifying");
    setLogs([]);
    addLog("=== MEMULAI VERIFIKASI INTEGRITAS DATA ===");
    if (migrationSource === "cloud") {
      addLog("Membandingkan: Cloud Firestore (Lama) vs Cloud Firestore (Baru)");
    } else {
      addLog("Membandingkan: Penyimpanan Lokal Browser (Local Storage) vs Cloud Firestore (Baru)");
    }
    addLog("Kriteria Uji: Jumlah Dokumen, ID Dokumen, dan kesamaan Field data...");

    try {
      const targetDb = getTargetFirestore();
      const reports: Record<string, VerificationReport> = {};
      let isAllPerfect = true;

      for (const col of FIREBASE_COLLECTIONS) {
        addLog(`Memverifikasi koleksi '${col}'...`);
        
        let sourceDocs: any[] = [];
        if (migrationSource === "cloud") {
          try {
            const sourceDb = getSourceFirestore();
            const sourceSnap = await getDocs(collection(sourceDb, col));
            sourceDocs = sourceSnap.docs.map(d => ({ id: d.id, data: d.data() }));
          } catch (e: any) {
            addLog(`  ❌ Gagal mengambil dokumen cloud untuk verifikasi koleksi '${col}': ${e.message || e}`);
          }
        } else {
          const localDocs = getLocalStorageData(col);
          sourceDocs = localDocs.map((item, index) => {
            const docId = item.id || item.userId || item.uid || `local_doc_${index}`;
            return { id: docId, data: item };
          });
        }

        const targetSnap = await getDocs(collection(targetDb, col));
        const targetDocs = targetSnap.docs.map(d => ({ id: d.id, data: d.data() }));

        const sourceCount = sourceDocs.length;
        const targetCount = targetDocs.length;

        const sourceMap = new Map(sourceDocs.map(d => [d.id, d.data]));
        const targetMap = new Map(targetDocs.map(d => [d.id, d.data]));

        let matchedCount = 0;
        const unmatchedIds: string[] = [];
        const mismatchedFields: { id: string; fields: string[] }[] = [];

        // 1. Compare Document IDs and values
        sourceMap.forEach((sourceVal, id) => {
          if (!targetMap.has(id)) {
            unmatchedIds.push(id);
            isAllPerfect = false;
          } else {
            const targetVal = targetMap.get(id);
            const isMatch = deepEqual(sourceVal, targetVal);
            if (isMatch) {
              matchedCount++;
            } else {
              const diff = getMismatchedFields(sourceVal, targetVal);
              mismatchedFields.push({ id, fields: diff });
              isAllPerfect = false;
            }
          }
        });

        const status = (sourceCount === targetCount && unmatchedIds.length === 0 && mismatchedFields.length === 0) ? "matched" : "unmatched";

        reports[col] = {
          collectionName: col,
          sourceCount,
          targetCount,
          matchedCount,
          unmatchedIds,
          mismatchedFields,
          status
        };

        if (status === "matched") {
          addLog(`  ✅ Koleksi '${col}' SINKRON SEMPURNA. (${matchedCount}/${sourceCount} dokumen cocok)`);
        } else {
          addLog(`  ❌ Koleksi '${col}' TIDAK COCOK!`);
          addLog(`    - Jumlah Dokumen: Sumber (${sourceCount}), Target (${targetCount})`);
          if (unmatchedIds.length > 0) {
            addLog(`    - Dokumen Hilang di Target: ${unmatchedIds.slice(0, 5).join(", ")}${unmatchedIds.length > 5 ? `... (+ ${unmatchedIds.length - 5} lainnya)` : ""}`);
          }
          if (mismatchedFields.length > 0) {
            addLog(`    - Dokumen Mismatch Nilai: ${mismatchedFields.slice(0, 5).map(f => `${f.id} (fields: ${f.fields.join(",")})`).join("; ")}`);
          }
        }
      }

      setVerificationReports(reports);
      setOverallVerified(isAllPerfect);
      setMigrationStatus("idle");
      addLog("=== VERIFIKASI SELESAI ===");

      if (isAllPerfect) {
        addLog("\n🎉 HASIL AKHIR: SINKRONISASI 100% SUKSES DAN SEMPURNA! Seluruh data identik secara menyeluruh.");
        onShowAlert("Verifikasi Sukses", "Integritas data cocok 100%. Firebase Baru siap diaktifkan!", "success");
      } else {
        addLog("\n⚠️ HASIL AKHIR: Ditemukan ketidakcocokan data di beberapa koleksi. Periksa laporan rincian di bawah.");
        onShowAlert("Verifikasi Selesai", "Ditemukan beberapa data yang tidak cocok antara sumber dan target.", "alert");
      }
    } catch (err: any) {
      addLog(`❌ VERIFIKASI GAGAL: ${err.message || err}`);
      setMigrationStatus("error");
      onShowAlert("Verifikasi Gagal", err.message || "Gagal memverifikasi kecocokan data.", "alert");
    }
  };

  // 4. Flip Connection Flag & Refresh App
  const activateNewFirebase = () => {
    localStorage.setItem("firebase_migration_completed_to_new", "true");
    setActiveDbMode("new");
    onShowAlert("Firebase Diaktifkan", "Menghubungkan aplikasi ke Firebase portal-dashboard-cs-online baru...", "success");
    addLog("=== MENGAKTIFKAN KONEKSI PORTAL-DASHBOARD-CS-ONLINE SECARA PERMANEN ===");
    
    if (onRefreshAllData) {
      setTimeout(() => {
        onRefreshAllData();
      }, 1500);
    }
  };

  // 5. Revert Connection Flag to Old Project
  const revertToOldFirebase = () => {
    localStorage.setItem("firebase_migration_completed_to_new", "false");
    setActiveDbMode("old");
    onShowAlert("Firebase Dikembalikan", "Mengembalikan koneksi aplikasi ke Firebase lama PT. HPI...", "alert");
    addLog("=== MENGEMBALIKAN KONEKSI KE FIREBASE LAMA ===");
    
    if (onRefreshAllData) {
      setTimeout(() => {
        onRefreshAllData();
      }, 1500);
    }
  };

  // Calculate global statistics
  const progressList = Object.values(progress) as CollectionProgress[];
  const totalSourceDocs = progressList.reduce((acc, curr) => acc + curr.total, 0);
  const totalSuccessDocs = progressList.reduce((acc, curr) => acc + curr.success, 0);
  const totalSkippedDocs = progressList.reduce((acc, curr) => acc + curr.skipped, 0);
  const totalFailedDocs = progressList.reduce((acc, curr) => acc + curr.failed, 0);
  const totalRemainingDocs = Math.max(0, totalSourceDocs - (totalSuccessDocs + totalSkippedDocs + totalFailedDocs));
  
  const migrationProgressPercentage = totalSourceDocs > 0 
    ? Math.floor(((totalSuccessDocs + totalSkippedDocs + totalFailedDocs) / totalSourceDocs) * 100) 
    : 0;

  return (
    <div id="firebase_migration_root" className="space-y-6 font-sans">
      
      {/* 1. Connection Status Banner */}
      <div className={`p-6 rounded-3xl border backdrop-blur-md transition-all duration-300 ${
        activeDbMode === "new"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          : "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className={`animate-pulse ${activeDbMode === "new" ? "text-emerald-400" : "text-amber-400"}`} size={20} />
              <span className="text-xs font-black uppercase tracking-widest font-mono">STATUS KONEKSI AKTIF SISTEM</span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white">
              Aplikasi Terhubung ke:{" "}
              <span className={activeDbMode === "new" ? "text-emerald-400" : "text-amber-400"}>
                {activeDbMode === "new" ? "portal-dashboard-cs-online (Baru)" : "quick-tract-wh7sp (Lama)"}
              </span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {activeDbMode === "new"
                ? "Selamat! Aplikasi Anda sekarang 100% menggunakan server Firebase mandiri Anda tanpa batasan kuota AI Studio. Login Google tetap berfungsi penuh."
                : "Aplikasi saat ini masih berjalan di database Firebase Starter (AI Studio Shared Quota). Silakan selesaikan proses migrasi di bawah ini sebelum mengaktifkan database baru."}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {activeDbMode === "old" ? (
              <button
                onClick={activateNewFirebase}
                disabled={migrationStatus !== "idle" && migrationStatus !== "success"}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none flex items-center gap-2"
              >
                <Sparkles size={14} />
                Aktifkan Firebase Baru
              </button>
            ) : (
              <button
                onClick={revertToOldFirebase}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs uppercase tracking-wider border border-amber-500/20 active:scale-95 transition cursor-pointer flex items-center gap-2"
              >
                <RefreshCw size={13} />
                Kembali ke Firebase Lama
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Source Selection Card */}
      <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Database className="text-indigo-400 animate-pulse" size={18} />
          <span className="text-xs font-black uppercase tracking-widest font-mono text-slate-200">PILIH SUMBER DATA MIGRASI</span>
        </div>
        <p className="text-xs text-slate-400">
          Pilih asal data yang ingin Anda migrasikan ke database Firebase baru Anda. Anda bisa memindahkan dari database Cloud lama atau langsung dari Penyimpanan Lokal Browser (Local Storage) yang menyimpan cache data kerja Anda.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Option 1: Cloud Firestore */}
          <div
            onClick={() => {
              if (migrationStatus === "idle" || migrationStatus === "success" || migrationStatus === "error") {
                setMigrationSource("cloud");
                addLog("Sumber migrasi diubah ke: Cloud Firestore (Proyek Lama)");
              }
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 text-left ${
              migrationSource === "cloud"
                ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 text-slate-400"
            } ${migrationStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${migrationSource === "cloud" ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-50"}`}>
              <Layers size={18} />
            </div>
            <div className="space-y-1">
              <span className="block font-black text-xs text-slate-100 uppercase tracking-wider">Cloud Firestore Lama</span>
              <span className="block text-[10px] text-slate-400">Proyek ID: <code className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300">{OLD_FIREBASE_CONFIG.projectId}</code></span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Mengambil seluruh data cloud yang tersimpan di server database Firestore default AI Studio.
              </p>
            </div>
          </div>

          {/* Option 2: Local Storage */}
          <div
            onClick={() => {
              if (migrationStatus === "idle" || migrationStatus === "success" || migrationStatus === "error") {
                setMigrationSource("local_storage");
                addLog("Sumber migrasi diubah ke: Penyimpanan Lokal Browser (Local Storage)");
              }
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 text-left ${
              migrationSource === "local_storage"
                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 text-slate-400"
            } ${migrationStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${migrationSource === "local_storage" ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-50"}`}>
              <FileText size={18} />
            </div>
            <div className="space-y-1">
              <span className="block font-black text-xs text-slate-100 uppercase tracking-wider">Penyimpanan Lokal Browser (Local Storage)</span>
              <span className="block text-[10px] text-indigo-400 font-black uppercase font-mono">Offline Cache</span>
              <p className="text-[10px] text-slate-500 leading-normal">
                Mengunggah data lokal pegawai, presensi, laporan, dan master data yang tersimpan aman di browser Anda ke database baru.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Control Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ACTION 1: Scan */}
        <button
          onClick={executeScanCollections}
          disabled={migrationStatus !== "idle"}
          className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-3xl text-center group active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl group-hover:bg-cyan-500/20 transition mb-3">
            {migrationStatus === "scanning" ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <RefreshCw size={22} />
            )}
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">1. Scan Collection</span>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Mendeteksi dan menghitung jumlah dokumen di Firebase lama</p>
        </button>

        {/* ACTION 2: Mulai Migrasi */}
        <button
          onClick={() => executeMigration(false)}
          disabled={migrationStatus !== "idle" && migrationStatus !== "paused"}
          className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 rounded-3xl text-center group active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:bg-emerald-500/20 transition mb-3">
            {migrationStatus === "migrating" ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <Play size={22} />
            )}
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">2. Mulai Migrasi</span>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Salin semua data secara utuh, skip jika id sudah ada</p>
        </button>

        {/* ACTION 3: Resume Migrasi */}
        <button
          onClick={() => executeMigration(true)}
          disabled={migrationStatus !== "paused" && migrationStatus !== "idle"}
          className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 rounded-3xl text-center group active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl group-hover:bg-amber-500/20 transition mb-3">
            <RefreshCw size={22} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">3. Resume Migrasi</span>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Lanjutkan proses migrasi terputus dari titik terakhir</p>
        </button>

        {/* ACTION 4: Verifikasi Data */}
        <button
          onClick={executeVerification}
          disabled={migrationStatus !== "idle"}
          className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-3xl text-center group active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:bg-indigo-500/20 transition mb-3">
            {migrationStatus === "verifying" ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <CheckSquare size={22} />
            )}
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">4. Verifikasi Data</span>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">Bandingkan jumlah, ID, dan kesesuaian nilai field data</p>
        </button>
      </div>

      {/* 3. Pause / Stop Button if Migrating */}
      {migrationStatus === "migrating" && (
        <div className="flex justify-center">
          <button
            onClick={pauseMigration}
            className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Pause size={14} />
            Jeda Sementara Migrasi
          </button>
        </div>
      )}

      {/* 4. Migration Progress Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Progress Table */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Database className="text-cyan-400" size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Progress Migrasi Per Koleksi</h3>
            </div>
            {migrationStatus === "migrating" && (
              <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-2.5 py-1 rounded-full text-[10px] font-black font-mono">
                <Loader2 className="animate-spin" size={10} />
                MIGRASI SEDANG BERJALAN: {migrationProgressPercentage}%
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {totalSourceDocs > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                <span>TOTAL PROGRESS: {totalSuccessDocs + totalSkippedDocs}/{totalSourceDocs} DOKUMEN</span>
                <span>{migrationProgressPercentage}% SINKRON</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${migrationProgressPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400">
                  <th className="p-3">Koleksi Firestore</th>
                  <th className="p-3 text-center">Jumlah Dokumen</th>
                  <th className="p-3 text-center text-emerald-400">Berhasil</th>
                  <th className="p-3 text-center text-amber-400 font-mono">Dilewati</th>
                  <th className="p-3 text-center text-rose-400">Gagal</th>
                  <th className="p-3 text-center">Sisa</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {FIREBASE_COLLECTIONS.map(col => {
                  const state = progress[col];
                  const scanCol = scanData[col];
                  const label = COLLECTION_LABELS[col];
                  const currentId = state.currentId;

                  // Counts
                  const total = scanCol ? scanCol.sourceCount : state.total;
                  const success = state.success;
                  const skipped = state.skipped;
                  const failed = state.failed;
                  const remaining = Math.max(0, total - (success + skipped + failed));

                  return (
                    <tr key={col} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-200">{col}</span>
                          <span className="block text-[9px] text-slate-500">{label}</span>
                          {state.status === "running" && currentId && (
                            <span className="block text-[8px] font-mono text-cyan-400 animate-pulse truncate max-w-[150px]">
                              → ID: {currentId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-300">
                        {total > 0 ? total : "-"}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400">
                        {success > 0 ? success : "-"}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-500 text-[10px]">
                        {skipped > 0 ? skipped : "-"}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-400">
                        {failed > 0 ? failed : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-400 font-bold">
                        {remaining > 0 ? remaining : "-"}
                      </td>
                      <td className="p-3 text-right">
                        {state.status === "completed" ? (
                          <span className="inline-block bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            Selesai
                          </span>
                        ) : state.status === "running" ? (
                          <span className="inline-block bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[9px] font-black uppercase animate-pulse">
                            Diproses
                          </span>
                        ) : state.status === "paused" ? (
                          <span className="inline-block bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            Dijeda
                          </span>
                        ) : (
                          <span className="inline-block bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                            Idle
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Verification & Summary Results */}
        <div className="lg:col-span-4 space-y-6">
          {/* Verification Box */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <CheckSquare className="text-indigo-400" size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Hasil Verifikasi Data</h3>
            </div>

            {overallVerified === null ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <AlertTriangle size={24} className="mx-auto text-slate-600 mb-2 animate-bounce" />
                Belum Diverifikasi. Silakan jalankan 'Verifikasi Data' untuk menguji integritas antar database.
              </div>
            ) : overallVerified ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-center space-y-2">
                  <CheckCircle2 size={32} className="mx-auto animate-pulse" />
                  <span className="block font-black text-xs uppercase tracking-widest font-mono">100% COCOK</span>
                  <p className="text-[10px] text-slate-300">
                    SINKRONISASI 100% SEMPURNA! Seluruh dokumen, ID, dan field data identik antara database lama dan database baru.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-center space-y-1">
                  <XCircle size={32} className="mx-auto text-rose-500 animate-pulse" />
                  <span className="block font-black text-xs uppercase tracking-widest font-mono">TIDAK SINKRON</span>
                  <p className="text-[10px] text-slate-300">
                    Ditemukan ketidakcocokan jumlah dokumen atau nilai field di beberapa koleksi. Silakan jalankan 'Mulai/Resume Migrasi' kembali.
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {(Object.values(verificationReports) as VerificationReport[]).map(rep => {
                    if (rep.status === "matched") return null;
                    return (
                      <div key={rep.collectionName} className="p-3 bg-slate-800/40 rounded-xl border border-rose-500/10 text-[10px] space-y-1 text-left">
                        <div className="flex justify-between font-bold text-rose-400 font-mono">
                          <span>{rep.collectionName}</span>
                          <span>Mismatch</span>
                        </div>
                        <div className="text-slate-400">
                          <span>Jumlah: Sumber ({rep.sourceCount}) vs Target ({rep.targetCount})</span>
                          {rep.unmatchedIds.length > 0 && (
                            <span className="block text-rose-300/80 mt-1">
                              * {rep.unmatchedIds.length} dokumen hilang di target.
                            </span>
                          )}
                          {rep.mismatchedFields.length > 0 && (
                            <span className="block text-amber-400 mt-1">
                              * {rep.mismatchedFields.length} dokumen mismatch field.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Migration Summary Stats */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Cpu className="text-emerald-400" size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Ringkasan Sesi</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/30 border border-slate-800/50 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-black">TOTAL SUMBER</span>
                <span className="text-lg font-black text-slate-200">{totalSourceDocs}</span>
              </div>
              <div className="bg-slate-800/30 border border-slate-800/50 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-emerald-500 uppercase tracking-widest font-black">MIGRASI</span>
                <span className="text-lg font-black text-emerald-400">{totalSuccessDocs}</span>
              </div>
              <div className="bg-slate-800/30 border border-slate-800/50 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-amber-500 uppercase tracking-widest font-black font-mono">DUPLIKAT (SKIP)</span>
                <span className="text-lg font-black text-amber-400">{totalSkippedDocs}</span>
              </div>
              <div className="bg-slate-800/30 border border-slate-800/50 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-black">SISA</span>
                <span className="text-lg font-black text-slate-400">{totalRemainingDocs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Live Scrolling Logs Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyan-400" size={16} />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Terminal Log Sinkronisasi</h3>
          </div>
          <button
            onClick={downloadLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none transition"
          >
            <Download size={11} />
            Unduh Log
          </button>
        </div>

        <div className="h-64 overflow-y-auto bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-slate-400 space-y-1.5 border border-slate-850 selection:bg-cyan-600 selection:text-white">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              Terminal siap. Sila jalankan Scan, Migrasi, atau Verifikasi untuk melihat aktivitas sinkronisasi.
            </div>
          ) : (
            logs.map((log, index) => {
              let color = "text-slate-400";
              if (log.includes("❌") || log.includes("FATAL") || log.includes("ERROR")) color = "text-rose-400";
              else if (log.includes("✅") || log.includes("SINKRON SEMPURNA")) color = "text-emerald-400";
              else if (log.includes("⚠️") || log.includes("[SKIP]")) color = "text-amber-400";
              else if (log.includes("===")) color = "text-cyan-400 font-bold border-b border-slate-900 pb-1 mt-3 first:mt-0";

              return (
                <div key={index} className={`${color} leading-relaxed text-left break-all`}>
                  {log}
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

    </div>
  );
}
