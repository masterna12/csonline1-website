/**
 * Google Sheets Service for STEP PresensiKu
 * Manages Firebase OAuth and Google Sheets API REST calls.
 */

import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { Report } from '../types';
import { auth } from '../firebase';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Internal Memory cache for OAuth state
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem("google_sheets_token") : null;
let isSigningIn = false;

export const getCachedSheetsToken = (): string | null => {
  return cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem("google_sheets_token") : null);
};

// Initialize observer
export const initSheetsAuth = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check memory or localStorage cache
      const activeToken = getCachedSheetsToken();
      if (activeToken) {
        onSuccess(user, activeToken);
      } else {
        onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') localStorage.removeItem("google_sheets_token");
      onFailure();
    }
  });
};

/**
 * Sign in with Google to retrieve Google Sheets scope access token
 */
export const signInGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('Access token Google Sheets tidak ditemukan dari hasil autentikasi.');
    }
    cachedAccessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem("google_sheets_token", token);
    }
    return { user: result.user, accessToken: token };
  } catch (err) {
    console.error('SignIn Google Sheets Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Auth
 */
export const signOutGoogleSheets = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem("google_sheets_token");
  }
};

/**
 * Helper to call Google Sheets REST API
 */
async function sheetsApiCall(endpoint: string, method: string, token: string, body?: any) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sheets API Error (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Create a new spreadsheet with proper heads and reports payload
 */
export const createNewReportsSpreadsheet = async (
  token: string, 
  spreadsheetTitle: string, 
  reports: Report[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  
  // 1. Create spreadsheet structure
  const createRes = await sheetsApiCall('', 'POST', token, {
    properties: {
      title: spreadsheetTitle
    },
    sheets: [
      {
        properties: {
          title: 'Data Pelaporan',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    ]
  });

  const spreadsheetId = createRes.spreadsheetId;
  const spreadsheetUrl = createRes.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Format grid data
  await writeReportsToSpreadsheet(token, spreadsheetId, reports);

  return { spreadsheetId, spreadsheetUrl };
};

const formatPhotoCell = (url: string | undefined): string => {
  if (url && url.startsWith('http')) {
    return `=IMAGE("${url}")`;
  }
  return '-';
};

const cleanPhotoUrl = (val: string | undefined): string | undefined => {
  if (!val || val === '-') return undefined;
  if (val.startsWith('=IMAGE("') && val.endsWith('")')) {
    return val.substring(8, val.length - 2);
  }
  return val;
};

/**
 * Write reports list into an existing spreadsheet ID
 */
export const writeReportsToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  reports: Report[]
): Promise<void> => {
  const headerRow = [
    'No',
    'ID Laporan',
    'NIP',
    'Nama Pegawai',
    'Jabatan',
    'Unit Kerja',
    'Tanggal',
    'Tipe Laporan',
    'Judul Laporan',
    'Keterangan / Deskripsi',
    'Status Pertanggungjawaban',
    'Foto Sebelum URL',
    'Foto Sesudah URL'
  ];

  const valueRows = reports.map((rep, idx) => [
    idx + 1,
    rep.id,
    rep.nip || '-',
    rep.employeeName || '-',
    rep.role || '-',
    rep.department || '-',
    rep.date || '-',
    rep.type || '-',
    rep.title || '-',
    rep.description || '-',
    rep.status || 'Pending',
    formatPhotoCell(rep.photoIndoor),
    formatPhotoCell(rep.photoOutdoor)
  ]);

  const values = [headerRow, ...valueRows];

  // We write to the Data Pelaporan sheet. If it doesn't exist, it defaults to first sheet.
  // Using valueInputOption=USER_ENTERED
  await sheetsApiCall(`/${spreadsheetId}/values/A1:M${values.length + 10}?valueInputOption=USER_ENTERED`, 'PUT', token, {
    range: `A1:M${values.length + 10}`,
    majorDimension: 'ROWS',
    values
  });
};

/**
 * Read and import reports from an existing spreadsheet
 */
export const parseSpreadsheetToReports = async (
  token: string,
  spreadsheetId: string
): Promise<Report[]> => {
  
  // Try to retrieve sheet values from the spreadsheet
  // We'll query first 200 rows
  const range = 'A1:M200';
  const getRes = await sheetsApiCall(`/${spreadsheetId}/values/${range}`, 'GET', token);

  const rows: string[][] = getRes.values;
  if (!rows || rows.length <= 1) {
    throw new Error('Spreadsheet kosong atau tidak memiliki baris data di rentang A2:M200.');
  }

  // Row 0 is header. Let's find map of column indexes just in case user reshaped it, otherwise fallback to index order
  // Col 0: No
  // Col 1: ID Laporan
  // Col 2: NIP
  // Col 3: Nama Pegawai
  // Col 4: Jabatan
  // Col 5: Unit Kerja
  // Col 6: Tanggal
  // Col 7: Tipe Laporan
  // Col 8: Judul Laporan
  // Col 9: Keterangan
  // Col 10: Status
  // Col 11: Foto Indoor
  // Col 12: Foto Outdoor

  const importedReports: Report[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue; // skip blank row

    const id = row[1] || `REP_S_` + Math.floor(100 + Math.random() * 900);
    const nip = row[2] || '19900101';
    const employeeName = row[3] || 'Pegawai Impor';
    const role = row[4] || 'Petugas Lapangan';
    const department = row[5] || 'Operations';
    const date = row[6] || new Date().toISOString().split('T')[0];
    const typeStr = row[7] || 'Operasional';
    const title = row[8] || 'Aktivitas Sektor';
    const description = row[9] || 'Laporan disinkronisasi dari Google Sheet';
    const statusStr = row[10] || 'Disetujui';
    const photoIndoor = cleanPhotoUrl(row[11]);
    const photoOutdoor = cleanPhotoUrl(row[12]);

    // Type casting safeguard
    const type = ['Operasional', 'Teknis', 'Penjualan', 'Administrasi', 'Lainnya'].includes(typeStr)
      ? typeStr as any
      : 'Operasional';

    const status = ['Pending', 'Disetujui', 'Ditolak'].includes(statusStr)
      ? statusStr as any
      : 'Disetujui';

    importedReports.push({
      id,
      employeeId: `EMP_${nip}`,
      nip,
      employeeName,
      role,
      department,
      date,
      type,
      title,
      description,
      status,
      photoIndoor,
      photoOutdoor
    });
  }

  return importedReports;
};

/**
 * Append a single report as a new row to the Google Spreadsheet
 */
export const appendReportToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  rep: Report,
  index?: number
): Promise<void> => {
  const row = [
    index !== undefined ? index : '=ROW()-1',
    rep.id,
    rep.nip || '-',
    rep.employeeName || '-',
    rep.role || '-',
    rep.department || '-',
    rep.date || '-',
    rep.type || '-',
    rep.title || '-',
    rep.description || '-',
    rep.status || 'Pending',
    formatPhotoCell(rep.photoIndoor),
    formatPhotoCell(rep.photoOutdoor)
  ];

  // We append to 'Data Pelaporan' sheet. It will automatically insert after the last row in range A:M.
  await sheetsApiCall(`/${spreadsheetId}/values/Data Pelaporan!A:M:append?valueInputOption=USER_ENTERED`, 'POST', token, {
    range: 'Data Pelaporan!A:M',
    majorDimension: 'ROWS',
    values: [row]
  });
};
