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
