/**
 * Region Filter & Role-Scope Management
 * 
 * Supports:
 * 1. `admin`: Khusus Bangka Belitung (termasuk Pangkalpinang).
 * 2. `adminJatim`: Khusus Jawa Timur (Surabaya, Malang, Sektor Jawa Timur, dll). Data Bangka Belitung tidak masuk.
 * 3. `adminUtama`: Akun Utama (Super Admin / Nasional). Memantau seluruh data dari semua wilayah.
 */

import { UserAccount, Employee } from '../types';

export type AdminScope = 'babel' | 'jatim' | 'all';

/**
 * Determines the administrative scope based on the logged-in user ID, user accounts, and employee data.
 */
export function getAdminScope(
  userId?: string,
  userAccounts?: UserAccount[],
  employeesList?: Employee[]
): AdminScope {
  if (!userId) return 'babel';
  const clean = userId.trim();
  if (clean === 'adminJatim' || clean.toLowerCase() === 'adminjatim') return 'jatim';
  if (clean === 'adminUtama' || clean.toLowerCase() === 'adminutama') return 'all';
  if (clean.toLowerCase() === 'admin') return 'babel';

  // 1. Check if user belongs to userAccounts
  if (userAccounts && userAccounts.length > 0) {
    const acc = userAccounts.find(
      a => a.userId && a.userId.toLowerCase() === clean.toLowerCase()
    );
    if (acc) {
      if (acc.region === 'jatim' || acc.region === 'babel' || acc.region === 'all') {
        return acc.region;
      }
      const scope = getUserAccountScope(acc, employeesList);
      if (scope === 'jatim' || scope === 'babel' || scope === 'all') return scope;
    }
  }

  // Heuristics for regional admin user IDs (e.g. adminJatim, adminBabel, adminSurabaya)
  if (/jatim|surabaya|malang|sidoarjo|gresik/i.test(clean)) {
    return 'jatim';
  }
  if (/babel|bangka|belitung|pangkalpinang/i.test(clean)) {
    return 'babel';
  }

  // 2. Check if user is in employee list
  if (employeesList && employeesList.length > 0) {
    const emp = employeesList.find(
      e => (e.nip && e.nip.toLowerCase() === clean.toLowerCase()) ||
           (e.id && e.id.toLowerCase() === clean.toLowerCase())
    );
    if (emp) {
      if (emp.region === 'jatim' || emp.createdBy === 'adminJatim') return 'jatim';
      if (emp.region === 'babel' || emp.createdBy === 'admin') return 'babel';
      const empDept = emp.department || '';
      if (/jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun/i.test(empDept)) return 'jatim';
      if (/bangka|belitung|pangkalpinang|babel/i.test(empDept)) return 'babel';
    }
  }

  // 3. Fallback heuristics: 9826010-9826019 are Jatim staff, 9826001-9826009 are Babel staff
  if (/982601[0-9]/i.test(clean)) {
    return 'jatim';
  }
  if (/982600[0-9]/i.test(clean)) {
    return 'babel';
  }

  return 'all';
}

export interface ResolveEntityRegionParams {
  region?: 'babel' | 'jatim' | 'all' | string;
  createdBy?: string;
  nip?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  locationName?: string;
  title?: string;
  extraText?: string;
  currentScope?: AdminScope;
  userAccounts?: UserAccount[];
  employees?: Employee[];
}

/**
 * Resolves the accurate regional scope ('jatim' | 'babel' | 'all') of any entity
 * (report, draft, employee, attendance) using accounts, employee identities, and keywords.
 */
export function resolveEntityRegion(params: ResolveEntityRegionParams): 'babel' | 'jatim' | 'all' {
  // 1. Direct explicit region property (handling custom typed strings like "Jawa Timur", "Bangka Belitung", etc.)
  if (params.region) {
    const r = params.region.toLowerCase().trim();
    if (r === 'jatim' || /jawa\s*timur|surabaya|malang|sidoarjo|gresik|madiun/i.test(r)) return 'jatim';
    if (r === 'babel' || /bangka|belitung|pangkalpinang/i.test(r)) return 'babel';
    if (r === 'all' || /semua|nasional/i.test(r)) return 'all';
  }

  // 2. Direct creator check
  const cleanCreator = (params.createdBy || '').trim();
  if (cleanCreator === 'adminJatim' || cleanCreator.toLowerCase() === 'adminjatim') {
    return 'jatim';
  }
  if (cleanCreator === 'admin' || cleanCreator.toLowerCase() === 'admin') {
    return 'babel';
  }

  // 3. Creator user account lookup
  if (cleanCreator && params.userAccounts && params.userAccounts.length > 0) {
    const acc = params.userAccounts.find(
      a => a.userId && a.userId.toLowerCase() === cleanCreator.toLowerCase()
    );
    if (acc) {
      const s = getUserAccountScope(acc, params.employees);
      if (s === 'jatim' || s === 'babel') return s;
    }
  }

  // 4. Employee NIP / user identifier check
  const cleanNip = (params.nip || '').trim();
  if (cleanNip) {
    if (params.userAccounts && params.userAccounts.length > 0) {
      const acc = params.userAccounts.find(
        a => a.userId && a.userId.toLowerCase() === cleanNip.toLowerCase()
      );
      if (acc) {
        const s = getUserAccountScope(acc, params.employees);
        if (s === 'jatim' || s === 'babel') return s;
      }
    }
    if (params.employees && params.employees.length > 0) {
      const emp = params.employees.find(
        e => (e.nip && e.nip.toLowerCase() === cleanNip.toLowerCase()) ||
             (e.id && e.id.toLowerCase() === cleanNip.toLowerCase())
      );
      if (emp) {
        if (emp.region === 'jatim' || emp.createdBy === 'adminJatim') return 'jatim';
        if (emp.region === 'babel' || emp.createdBy === 'admin') return 'babel';
        const empDept = emp.department || '';
        if (/jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun/i.test(empDept)) return 'jatim';
        if (/bangka|belitung|pangkalpinang|babel/i.test(empDept)) return 'babel';
      }
    }
    if (/982601[0-9]/i.test(cleanNip)) return 'jatim';
    if (/982600[0-9]/i.test(cleanNip)) return 'babel';
  }

  // 5. Employee ID / Name check in employees list
  if (params.employees && params.employees.length > 0) {
    const emp = params.employees.find(
      e => (params.employeeId && e.id === params.employeeId) ||
           (params.employeeName && e.name && e.name.toLowerCase().trim() === params.employeeName.toLowerCase().trim())
    );
    if (emp) {
      if (emp.region === 'jatim' || emp.createdBy === 'adminJatim') return 'jatim';
      if (emp.region === 'babel' || emp.createdBy === 'admin') return 'babel';
      const empDept = emp.department || '';
      if (/jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun/i.test(empDept)) return 'jatim';
      if (/bangka|belitung|pangkalpinang|babel/i.test(empDept)) return 'babel';
    }
  }

  // 6. Keywords in text, department, location, title, extraText
  const combined = `${params.department || ''} ${params.locationName || ''} ${params.title || ''} ${params.extraText || ''}`.toLowerCase();
  const isJatim = /jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun|kediri|jember|banyuwangi|mojokerto|pasuruan|probolinggo|blitar/i.test(combined);
  const isBabel = /bangka|belitung|pangkalpinang|babel|manggar|toboali|mentok|muntok|koba|tanjung\s*pandan/i.test(combined);

  if (isJatim && !isBabel) return 'jatim';
  if (isBabel && !isJatim) return 'babel';

  // 7. Context scope
  if (params.currentScope === 'jatim') return 'jatim';
  if (params.currentScope === 'babel') return 'babel';

  // 8. Creator string heuristic
  if (/jatim/i.test(cleanCreator)) return 'jatim';
  if (/babel/i.test(cleanCreator)) return 'babel';

  return 'babel';
}

/**
 * Checks whether an entity (employee, report, attendance, location) belongs to the given scope.
 */
export function isItemInScope(
  scope: AdminScope,
  department?: string,
  locationName?: string,
  extraText?: string,
  createdBy?: string,
  region?: 'babel' | 'jatim' | 'all' | string,
  nip?: string,
  employees?: Employee[],
  userAccounts?: UserAccount[],
  employeeId?: string,
  employeeName?: string
): boolean {
  if (scope === 'all') return true;

  const entityRegion = resolveEntityRegion({
    region,
    createdBy,
    nip,
    employeeId,
    employeeName,
    department,
    locationName,
    extraText,
    userAccounts,
    employees
  });

  if (scope === 'jatim') {
    return entityRegion === 'jatim';
  }
  if (scope === 'babel') {
    return entityRegion === 'babel';
  }

  return true;
}

/**
 * Returns human-readable region label for UI banners & headings.
 */
export function getScopeTitle(scope: AdminScope): string {
  switch (scope) {
    case 'babel':
      return 'Wilayah Bangka Belitung (Termasuk Pangkalpinang)';
    case 'jatim':
      return 'Wilayah Jawa Timur';
    case 'all':
      return 'Konsol Utama (Semua Wilayah)';
  }
}

/**
 * Returns distinct visual styling badges for the active region.
 */
export function getScopeBadge(scope: AdminScope) {
  switch (scope) {
    case 'babel':
      return {
        text: 'Bangka Belitung',
        subtext: 'Pangkalpinang Termasuk',
        bg: 'bg-sky-500/10',
        textCol: 'text-sky-400',
        border: 'border-sky-500/30'
      };
    case 'jatim':
      return {
        text: 'Jawa Timur',
        subtext: 'Khusus Jatim',
        bg: 'bg-amber-500/10',
        textCol: 'text-amber-400',
        border: 'border-amber-500/30'
      };
    case 'all':
      return {
        text: 'Admin Utama',
        subtext: 'Semua Wilayah',
        bg: 'bg-emerald-500/10',
        textCol: 'text-emerald-400',
        border: 'border-emerald-500/30'
      };
  }
}

/**
 * Default department and coordinates when adding reports or employees.
 */
export function getScopeDefaults(scope: AdminScope) {
  switch (scope) {
    case 'babel':
      return {
        department: 'Sektor Bangka Belitung',
        locationName: 'Sektor Bangka Belitung',
        coordinates: '-2.1299, 106.1138',
        availableDepartments: [
          'Sektor Bangka Belitung',
          'Kantor Wilayah Pangkalpinang',
          'ULP Manggar',
          'ULP Toboali',
          'ULP Mentok',
          'ULP Koba'
        ]
      };
    case 'jatim':
      return {
        department: 'Sektor Jawa Timur',
        locationName: 'Sektor Jawa Timur',
        coordinates: '-7.3512, 112.7278',
        availableDepartments: [
          'Sektor Jawa Timur',
          'Kantor Wilayah Surabaya',
          'Kantor Wilayah Malang',
          'UP3 Surabaya Barat',
          'UP3 Sidoarjo',
          'UP3 Madiun'
        ]
      };
    case 'all':
      return {
        department: 'Sektor Bangka Belitung',
        locationName: 'Sektor Bangka Belitung',
        coordinates: '-2.1299, 106.1138',
        availableDepartments: [
          'Sektor Bangka Belitung',
          'Kantor Wilayah Pangkalpinang',
          'Sektor Jawa Timur',
          'Kantor Wilayah Surabaya',
          'Kantor Wilayah Malang'
        ]
      };
  }
}

/**
 * Determines whether a user account belongs to the specified administrative scope.
 */
export function getUserAccountScope(acc: UserAccount, employeesList?: Employee[]): AdminScope {
  // Direct creator check
  const cleanCreator = (acc.createdBy || '').trim();
  if (cleanCreator === 'adminJatim' || cleanCreator.toLowerCase() === 'adminjatim') {
    return 'jatim';
  }
  if (cleanCreator === 'admin' || cleanCreator.toLowerCase() === 'admin') {
    return 'babel';
  }

  if (acc.region) {
    const r = acc.region.toLowerCase().trim();
    if (r === 'jatim' || /jawa\s*timur|surabaya|malang|sidoarjo|gresik|madiun/i.test(r)) return 'jatim';
    if (r === 'babel' || /bangka|belitung|pangkalpinang/i.test(r)) return 'babel';
    if (r === 'all' || /semua|nasional/i.test(r)) return 'all';
  }

  // Admin user IDs
  if (acc.userId.toLowerCase() === 'adminjatim' || /jatim|surabaya|malang/i.test(acc.userId)) return 'jatim';
  if (acc.userId.toLowerCase() === 'admin' || /babel|bangka|belitung/i.test(acc.userId)) return 'babel';
  if (acc.userId.toLowerCase() === 'adminutama') return 'all';

  // Check matched employee NIP or ID
  const matchedEmp = employeesList?.find(
    e => (e.nip && e.nip.toLowerCase() === acc.userId.toLowerCase()) || 
         (e.id && e.id.toLowerCase() === acc.userId.toLowerCase())
  );
  if (matchedEmp) {
    if (matchedEmp.createdBy === 'adminJatim' || matchedEmp.region === 'jatim') {
      return 'jatim';
    }
    if (matchedEmp.createdBy === 'admin' || matchedEmp.region === 'babel') {
      return 'babel';
    }
    const empDept = matchedEmp.department || '';
    if (/jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun/i.test(empDept)) {
      return 'jatim';
    }
    if (/bangka|belitung|pangkalpinang|babel/i.test(empDept)) {
      return 'babel';
    }
  }

  // Fallback heuristics: 9826010-9826019 are Jatim staff, 9826001-9826009 are Babel staff
  if (/982601[0-9]/i.test(acc.userId)) {
    return 'jatim';
  }
  if (/982600[0-9]/i.test(acc.userId)) {
    return 'babel';
  }

  return 'all';
}

export function isUserAccountInScope(scope: AdminScope, acc: UserAccount, employeesList?: Employee[]): boolean {
  if (scope === 'all') return true;

  // Direct region check on account takes highest precedence!
  if (acc.region) {
    const r = acc.region.toLowerCase().trim();
    if (r === 'jatim' || /jawa\s*timur|surabaya|malang|sidoarjo|gresik|madiun/i.test(r)) {
      return scope === 'jatim';
    }
    if (r === 'babel' || /bangka|belitung|pangkalpinang/i.test(r)) {
      return scope === 'babel';
    }
    if (r === 'all' || /semua|nasional/i.test(r)) {
      return true;
    }
    if (r === scope.toLowerCase()) {
      return true;
    }
  }

  // Direct creator check
  const cleanCreator = (acc.createdBy || '').trim();
  if (cleanCreator === 'adminJatim' || cleanCreator.toLowerCase() === 'adminjatim') {
    return scope === 'jatim';
  }
  if (cleanCreator === 'admin' || cleanCreator.toLowerCase() === 'admin') {
    return scope === 'babel';
  }

  const accScope = getUserAccountScope(acc, employeesList);
  if (scope === 'jatim') {
    return accScope === 'jatim';
  }
  if (scope === 'babel') {
    return accScope === 'babel';
  }
  return true;
}

/**
 * Detects whether the 'before' (photoIndoor) and 'after' (photoOutdoor) photos in a report
 * are identical / duplicate (meaning no actual work or progress was done).
 * When identical, the report is deemed INVALID in monthly performance calculations,
 * with the note: "foto sebelum dan sesudah tersebut sama persis".
 */
export function isReportPhotosIdentical(r?: { 
  photoIndoor?: string; 
  photoOutdoor?: string; 
  imagePath?: string;
  photo?: string;
  statusKoreksiFoto?: string;
} | null): boolean {
  if (!r) return false;
  if (r.statusKoreksiFoto === 'tidak_valid_foto_sama') return true;

  const before = (r.photoIndoor || '').trim();
  const after = (r.photoOutdoor || r.imagePath || r.photo || '').trim();
  if (!before || !after) return false;
  if (before === after) return true;

  try {
    const cleanBefore = before.split('?')[0].split('#')[0].trim().toLowerCase();
    const cleanAfter = after.split('?')[0].split('#')[0].trim().toLowerCase();
    if (cleanBefore === cleanAfter && cleanBefore.length > 5) return true;

    // Compare filenames or Cloudinary public_ids if full path matches
    const getFileName = (url: string) => {
      const parts = url.split('/');
      return parts[parts.length - 1] || '';
    };
    const fnBefore = getFileName(cleanBefore);
    const fnAfter = getFileName(cleanAfter);
    if (fnBefore && fnAfter && fnBefore === fnAfter && fnBefore.length > 4 && !fnBefore.includes('placeholder')) {
      return true;
    }
  } catch {}
  return false;
}
