// src/lib/formHelpers.js

/**
 * Validates that binary data starts with the PDF magic number `%PDF` (0x25, 0x50, 0x44, 0x46).
 */
export function validatePdfBytes(bytes) {
  if (!bytes || bytes.length < 4) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46    // F
  );
}

/**
 * Validates file size, mime type, and magic bytes for PDF uploads.
 * Maximum allowed size is 5 MB.
 */
export function validatePdfUpload(file) {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  if (!file) return { valid: false, error: 'File is required' };

  if (file.size > MAX_SIZE || (file.bytes && file.bytes.length > MAX_SIZE)) {
    return { valid: false, error: 'File exceeds maximum allowed size of 5 MB' };
  }

  if (file.type && !['application/pdf', 'application/x-pdf'].includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Invalid file MIME type. Only PDF documents are allowed.' };
  }

  if (file.bytes && !validatePdfBytes(file.bytes)) {
    return { valid: false, error: 'File contents do not match PDF signature (%PDF)' };
  }

  return { valid: true };
}

/**
 * Strips ASCII control characters from text except \n, \r, \t.
 */
export function sanitizeText(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Helper to determine study year number from Arabic or English label.
 */
export function parseStudyYear(val) {
  if (typeof val === 'number') return Math.max(1, Math.min(8, Math.floor(val)));
  if (!val || typeof val !== 'string') return 1;

  const match = val.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  if (val.includes('أولى') || val.includes('first') || val.includes('1st')) return 1;
  if (val.includes('ثانية') || val.includes('second') || val.includes('2nd')) return 2;
  if (val.includes('ثالثة') || val.includes('third') || val.includes('3rd')) return 3;
  if (val.includes('رابعة') || val.includes('fourth') || val.includes('4th')) return 4;
  if (val.includes('خامسة') || val.includes('fifth') || val.includes('5th')) return 5;
  return 1;
}

/**
 * Pure rate limit check window logic.
 */
export function isRateLimitExceeded(recentSubmissionsCount, maxAllowed = 3) {
  return recentSubmissionsCount >= maxAllowed;
}

