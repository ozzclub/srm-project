/**
 * Extract date part from various date formats (ISO string, datetime, etc.)
 * This prevents timezone offset issues
 * 
 * Input examples:
 * - "2026-03-13" → "2026-03-13"
 * - "2026-03-13T00:00:00.000Z" → "2026-03-13"
 * - "2026-03-11T15:00:00.000Z" → "2026-03-13" (if in UTC+7 timezone)
 */
function extractDatePart(dateString: string): string {
  if (!dateString) return '';
  
  // Already in YYYY-MM-DD format
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return dateString;
  }
  
  // ISO 8601 format: "2026-03-13T00:00:00.000Z" or "2026-03-11T15:00:00.000Z"
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Fallback: return as-is
  return dateString;
}

/**
 * Format date string WITHOUT timezone conversion
 * Input: "2026-03-13" or "2026-03-13T00:00:00.000Z"
 * Output: "Mar 13, 2026" or custom format
 * 
 * IMPORTANT: This avoids timezone offset issues that cause dates to shift by -1 day
 */
export function formatDateLocal(dateString: string, format: 'short' | 'long' = 'short'): string {
  if (!dateString) return '-';
  
  // Extract date part to avoid timezone issues
  const datePart = extractDatePart(dateString);
  if (!datePart) return dateString;
  
  // Parse YYYY-MM-DD manually
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return datePart;
  
  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // JS months are 0-indexed
  const day = parseInt(dayStr);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (format === 'long') {
    return `${fullMonths[month]} ${day}, ${year}`;
  }
  
  return `${months[month]} ${day.toString().padStart(2, '0')}, ${year}`;
}

/**
 * Format date to DD/MM/YY format (Indonesian style)
 * Input: "2026-03-13" or "2026-03-13T00:00:00.000Z"
 * Output: "13/03/26"
 */
export function formatDateDDMMYY(dateString: string): string {
  if (!dateString) return '-';
  
  // Extract date part to avoid timezone issues
  const datePart = extractDatePart(dateString);
  if (!datePart) return dateString;
  
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return datePart;
  
  const [, yearStr, monthStr, dayStr] = match;
  const year = yearStr.slice(2); // Get last 2 digits
  const month = monthStr;
  const day = dayStr;
  
  return `${day}/${month}/${year}`;
}
