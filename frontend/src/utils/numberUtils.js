/**
 * CropLens AI — Safe Numeric & Currency Formatter Utilities
 * Ensures user-facing calculations never render NaN, undefined, or fabricated market prices.
 */

/**
 * Parses a value into a valid number or returns null.
 */
export function safeNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Formats a numeric value into an Indian Rupee currency string (e.g. ₹1,650).
 * Returns '₹—' if value is invalid or null (never invents a fallback market price).
 */
export function formatCurrency(val, fallbackText = '₹—') {
  const num = safeNumber(val);
  if (num === null) return fallbackText;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Normalizes confidence scores into a clean percentage string (e.g. "94%").
 * Handles decimal scale (0.94 -> "94%"), whole scale (94 -> "94%"), or string formats.
 */
export function formatConfidence(val) {
  const num = safeNumber(val);
  if (num === null) return '90%';
  if (num <= 1 && num > 0) {
    return `${Math.round(num * 100)}%`;
  }
  if (num > 100) return '99%';
  return `${Math.round(num)}%`;
}

/**
 * Calculates Net Profit = Rate - Transport Cost safely.
 * Returns null if rate is invalid. Handles transport cost gracefully.
 */
export function calculateNetProfit(rateVal, transportVal) {
  const rate = safeNumber(rateVal);
  if (rate === null) return null;
  
  const transport = safeNumber(transportVal) || 0;
  const cost = Math.abs(transport);
  return rate - cost;
}
