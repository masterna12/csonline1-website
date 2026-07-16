/**
 * Time Service for validation and server-time synchronization.
 * Prevents report submission with manipulated device date/time.
 */

export interface TimeValidationResult {
  isValid: boolean;
  serverDate: Date;
  localDate: Date;
  differenceMinutes: number;
}

/**
 * Fetches the authentic server time using multiple methods for reliability:
 * 1. HEAD request to `/index.html` (retrieves the Cloud Run container/Nginx server date header).
 * 2. Public API fallbacks if server HEAD request fails.
 * 3. Fallback to local system clock only as a absolute last resort if entirely offline.
 */
export async function fetchServerTime(): Promise<Date> {
  // 1. Same-origin HEAD request (Highly accurate & CORS-safe)
  try {
    const response = await fetch('/index.html?t=' + Date.now(), {
      method: 'HEAD',
      headers: { 'Cache-Control': 'no-cache' }
    });
    const serverDateHeader = response.headers.get('Date');
    if (serverDateHeader) {
      const parsed = new Date(serverDateHeader);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("HEAD /index.html failed, trying public API fallbacks:", err);
  }

  // 2. Fallbacks to public NTP-synchronized API servers
  const fallbackUrls = [
    'https://worldtimeapi.org/api/timezone/Etc/UTC',
    'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta'
  ];

  for (const url of fallbackUrls) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      
      const data = await response.json();
      if (data && data.utc_datetime) {
        return new Date(data.utc_datetime);
      } else if (data && data.dateTime) {
        return new Date(data.dateTime);
      }
    } catch (err) {
      console.warn(`Fallback time API ${url} failed:`, err);
    }
  }

  // 3. Fallback to local time (safe catch-all if totally offline)
  return new Date();
}

/**
 * Validates whether the user's device/browser clock matches the authentic server clock.
 * Discrepancies greater than 10 minutes indicate manual date/time modification.
 */
export async function validateDeviceTime(): Promise<TimeValidationResult> {
  const localDate = new Date();
  const serverDate = await fetchServerTime();
  
  const diffMs = Math.abs(serverDate.getTime() - localDate.getTime());
  const differenceMinutes = diffMs / (1000 * 60);
  
  // Allow a standard 10-minute threshold to accommodate slight NTP offsets and network roundtrip lags.
  const isValid = differenceMinutes <= 10;
  
  return {
    isValid,
    serverDate,
    localDate,
    differenceMinutes
  };
}

/**
 * Formats a Date object to the standard 'YYYY-MM-DD HH:mm' format used by the application,
 * respecting the local timezone representation.
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
