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
 * Determines the administrative scope based on the logged-in user ID.
 */
export function getAdminScope(userId?: string): AdminScope {
  if (!userId) return 'babel';
  const clean = userId.trim();
  if (clean === 'adminJatim') return 'jatim';
  if (clean === 'adminUtama') return 'all';
  if (clean.toLowerCase() === 'admin') return 'babel';
  // Default for field staff or other users: show their regional scope (or all if not specified)
  return 'all';
}

/**
 * Checks whether an entity (employee, report, attendance, location) belongs to the given scope.
 */
export function isItemInScope(
  scope: AdminScope,
  department?: string,
  locationName?: string,
  extraText?: string
): boolean {
  if (scope === 'all') return true;

  const combined = `${department || ''} ${locationName || ''} ${extraText || ''}`.toLowerCase();

  // Pattern identifying Bangka Belitung, Pangkalpinang, and related regions
  const isBabel = /bangka|belitung|pangkalpinang|babel|manggar|toboali|mentok|muntok|koba|tanjung\s*pandan/i.test(combined);

  // Pattern identifying Jawa Timur, Surabaya, Malang, etc.
  const isJatim = /jawa\s*timur|jatim|surabaya|malang|sidoarjo|gresik|madiun|kediri|jember|banyuwangi|mojokerto|pasuruan|probolinggo|blitar/i.test(combined);

  if (scope === 'jatim') {
    // Bangka Belitung data must NEVER appear in Jawa Timur account
    if (isBabel) return false;
    return isJatim;
  }

  if (scope === 'babel') {
    // Jawa Timur data must NEVER appear in Bangka Belitung account
    if (isJatim) return false;
    return isBabel || !isJatim;
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
  if (acc.region === 'jatim' || acc.region === 'babel' || acc.region === 'all') {
    return acc.region;
  }

  // Admin user IDs
  if (acc.userId === 'adminJatim') return 'jatim';
  if (acc.userId === 'admin') return 'babel';
  if (acc.userId === 'adminUtama') return 'all';

  // Check matched employee NIP or ID
  const matchedEmp = employeesList?.find(
    e => (e.nip && e.nip.toLowerCase() === acc.userId.toLowerCase()) || 
         (e.id && e.id.toLowerCase() === acc.userId.toLowerCase())
  );
  if (matchedEmp) {
    if (isItemInScope('jatim', matchedEmp.department, undefined, matchedEmp.name)) {
      return 'jatim';
    }
    if (isItemInScope('babel', matchedEmp.department, undefined, matchedEmp.name)) {
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
  const accScope = getUserAccountScope(acc, employeesList);
  if (scope === 'jatim') {
    return accScope === 'jatim';
  }
  if (scope === 'babel') {
    return accScope === 'babel';
  }
  return true;
}
