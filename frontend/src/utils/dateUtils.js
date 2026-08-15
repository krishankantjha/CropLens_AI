/**
 * dateUtils.js - Timezone-safe date utility module for CropLens AI.
 * Ensures local YYYY-MM-DD formatting without UTC shift offsets (-1 day bug).
 */

/**
 * Returns today's date in local YYYY-MM-DD format (timezone-safe).
 * @param {Date} [d=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export function getTodayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string safely into a local Date object (at 00:00 local time).
 * Prevents new Date("YYYY-MM-DD") UTC midnight shift bugs.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

/**
 * Formats a Date object or YYYY-MM-DD string into short weekday name (Mon, Tue, etc.).
 * @param {Date|string} dateInput
 * @param {string} [locale='en-US']
 * @returns {string}
 */
export function formatWeekday(dateInput, locale = 'en-US') {
  const d = typeof dateInput === 'string' ? parseLocalDate(dateInput) : dateInput;
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

/**
 * Generates dynamic recent historical points for initial fallback state.
 * @param {number} days
 * @returns {Array<{date: string, modal_price: number, arrivals_in_qtl: number}>}
 */
export function getRecentHistoricalSequence(days = 7) {
  const list = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    list.push({
      date: getTodayDateString(d),
      modal_price: Math.round(2000 + (7 - i) * 18.5),
      arrivals_in_qtl: Math.round(1100 + (7 - i) * 25)
    });
  }
  return list;
}
