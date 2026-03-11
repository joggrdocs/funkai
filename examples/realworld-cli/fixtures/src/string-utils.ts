/**
 * Capitalize the first letter of a string.
 */
export const capitalize = (s: string): string =>
  s.length === 0 ? "" : s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Truncate a string to maxLength, appending "..." if truncated.
 */
export const truncate = (s: string, maxLength: number): string =>
  s.length <= maxLength ? s : `${s.slice(0, maxLength)}...`;

/**
 * Check if a string is a valid email format.
 */
export const isValidEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Slugify a string for URL usage.
 */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
