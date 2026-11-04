// src/lib/businessStorage.js
import { supabase } from './supabase';

/**
 * Generate a short-lived signed URL for private bucket objects.
 * Default expiration: 60 seconds.
 */
export async function getSignedFileUrl(bucket, path, expiresIn = 60) {
  if (!bucket || !path) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Failed to create signed URL:', err);
    return null;
  }
}

/**
 * Upload contract PDF to private 'contracts' bucket.
 * Path pattern: <agreement_id>/<sanitized_filename>
 * Limit: <= 10MB, PDF only
 */
export async function uploadContractPdf(agreementId, file) {
  if (!agreementId) throw new Error('Missing agreementId');
  if (!file) throw new Error('No file selected');

  if (file.type !== 'application/pdf') {
    throw new Error('Contract file must be a PDF document.');
  }

  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxBytes) {
    throw new Error('Contract file size must not exceed 10 MB.');
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${agreementId}/contract_${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage.from('contracts').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return data.path;
}

/**
 * Upload receipt image or PDF to private 'receipts' bucket.
 * Path pattern: <agreement_id>/<sanitized_filename>
 * Limit: <= 5MB, Image or PDF
 */
export async function uploadPaymentReceipt(agreementId, file) {
  if (!agreementId) throw new Error('Missing agreementId');
  if (!file) throw new Error('No file selected');

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Receipt file must be an image (JPEG, PNG, WEBP) or a PDF document.');
  }

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) {
    throw new Error('Receipt file size must not exceed 5 MB.');
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${agreementId}/receipt_${Date.now()}_${sanitizedName}`;

  const { data, error } = await supabase.storage.from('receipts').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return data.path;
}

