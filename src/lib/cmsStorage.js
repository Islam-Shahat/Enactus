// src/lib/cmsStorage.js
import { supabase } from './supabase';

const MAX_IMAGE_DIMENSION = 1600;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Resizes an image in the browser via canvas, compressing to WebP (or JPEG fallback)
 * with max dimensions of 1600px.
 * @param {File} file
 * @param {number} maxDimension
 * @returns {Promise<Blob>}
 */
export async function resizeImageClientSide(file, maxDimension = MAX_IMAGE_DIMENSION) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('الملف المختار ليس صورة صالحة.');
  }

  // SVG images do not need canvas rasterization
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل معالجة أبعاد الصورة'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // fallback to original file
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try converting to image/webp first
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback to jpeg
              canvas.toBlob(
                (fallbackBlob) => {
                  resolve(fallbackBlob || file);
                },
                'image/jpeg',
                0.88
              );
            }
          },
          'image/webp',
          0.88
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to the 'site-assets' public bucket after client-side resize and size checks.
 * @param {File} file - Original file input
 * @param {string} destinationPath - E.g. "partners/123/logo.webp"
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadSiteAsset(file, destinationPath) {
  if (!file) throw new Error('يرجى اختيار ملف للرفع.');

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`حجم الملف يتجاوز الحد الأقصى المسموح (5 ميجابايت).`);
  }

  // Client-side resize
  const resizedBlob = await resizeImageClientSide(file);

  if (resizedBlob.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('حجم الصورة بعد الضغط يتجاوز 5 ميجابايت.');
  }

  const { error } = await supabase.storage
    .from('site-assets')
    .upload(destinationPath, resizedBlob, {
      upsert: true,
      contentType: resizedBlob.type || file.type || 'image/webp',
    });

  if (error) {
    throw new Error(`فشل رفع الصورة: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('site-assets')
    .getPublicUrl(destinationPath);

  return publicUrlData.publicUrl;
}

/**
 * Resolves an asset URL. If it's already a public URL or relative path (/assets/...), returns as is.
 */
export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }
  // Otherwise resolve from site-assets
  const { data } = supabase.storage.from('site-assets').getPublicUrl(url);
  return data.publicUrl;
}
