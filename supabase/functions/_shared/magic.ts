// supabase/functions/_shared/magic.ts

/**
 * Validates that binary data starts with the PDF magic number `%PDF` (0x25, 0x50, 0x44, 0x46).
 */
export function validatePdfBytes(bytes: Uint8Array): boolean {
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
export function validatePdfUpload(file: {
  type?: string;
  size: number;
  bytes: Uint8Array;
}): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  if (file.size > MAX_SIZE || file.bytes.length > MAX_SIZE) {
    return { valid: false, error: 'File exceeds maximum allowed size of 5 MB' };
  }

  if (file.type && !['application/pdf', 'application/x-pdf'].includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Invalid file MIME type. Only PDF documents are allowed.' };
  }

  if (!validatePdfBytes(file.bytes)) {
    return { valid: false, error: 'File contents do not match PDF signature (%PDF)' };
  }

  return { valid: true };
}

