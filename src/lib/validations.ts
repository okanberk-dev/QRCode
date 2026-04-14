export function isValidRating(rating: unknown): boolean {
  if (typeof rating === 'string') {
    rating = parseInt(rating, 10);
  }
  return typeof rating === 'number' && rating >= 1 && rating <= 5;
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Optional field
  // Simple validation: Allow +, space, -, and digits. Should have at least 10 digits
  const cleaned = phone.replace(/[\s+-]/g, '');
  return /^\d{10,14}$/.test(cleaned);
}

export function sanitizeText(text: string | null | undefined, maxLength = 1000): string | null {
  if (!text) return null;
  return text.trim().substring(0, maxLength);
}

/**
 * Validate a table / location identifier used in QR URLs.
 * Rules: 1-20 chars, alphanumeric + `-_` only. Empty/null is allowed (general QR).
 */
export function isValidTableIdentifier(value: unknown): value is string {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  if (value.length > 20) return false;
  return /^[A-Za-z0-9_-]+$/.test(value);
}

/**
 * Validate a hex color (#RGB or #RRGGBB).
 */
export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * Minimal password strength check used for staff / admin accounts.
 * Requires 8+ chars plus at least one letter and one digit.
 */
export function isStrongPassword(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}
