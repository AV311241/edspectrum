/**
 * Number formatting helpers for the dashboard stat tiles.
 *
 * Tiles sit in narrow columns, so an exact rupee amount such as `₹45,00,000`
 * is wider than its tile and gets clipped by `text-overflow: ellipsis` (it
 * rendered as `₹ 45...`). These helpers give a tile a short, glanceable value
 * while `formatInr` still provides the exact figure for the tooltip and the
 * accessible label.
 *
 * Indian numbering (`en-IN`) is used throughout: amounts group as 45,00,000
 * rather than 4,500,000, and the compact form collapses onto the lakh/crore
 * units (`45L`, `18.2L`, `12Cr`) that the programme's reports already use.
 */

const INR_GROUPED = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0
});

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1
});

/** Rendered in place of a value that is missing or not a real number. */
export const NO_VALUE_PLACEHOLDER = '—';

/**
 * Exact rupee amount using Indian grouping: `₹45,00,000`.
 * Non-finite input (NaN / Infinity) yields the em-dash placeholder so a
 * missing figure can never surface as the string "NaN" in the UI.
 */
export function formatInr(value: number): string {
  return Number.isFinite(value) ? `₹${INR_GROUPED.format(value)}` : NO_VALUE_PLACEHOLDER;
}

/**
 * Short rupee amount for a stat tile: `₹45L`, `₹18.2L`, `₹12Cr`.
 * At most 5 characters, which keeps the value legible in a narrow column
 * instead of overflowing it.
 */
export function formatCompactInr(value: number): string {
  return Number.isFinite(value) ? `₹${INR_COMPACT.format(value)}` : NO_VALUE_PLACEHOLDER;
}

/**
 * Plain count with Indian grouping: `500`, `1,250`. Used for head-count
 * metrics so large numbers stay aligned without a currency symbol.
 */
export function formatCount(value: number): string {
  return Number.isFinite(value) ? INR_GROUPED.format(value) : NO_VALUE_PLACEHOLDER;
}
