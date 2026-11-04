// src/lib/mediaStorage.js
import { supabase } from './supabase';

const BUCKET = 'event-media';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Returns the public URL for an asset in 'event-media'.
 */
export function getMediaPublicUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}

/**
 * Upload an image or MP4 video to the media library folder 'library/'.
 */
export async function uploadLibraryMedia(file, customFolder = 'library') {
  if (!file) throw new Error('No file provided');

  const isImage = file.type.startsWith('image/');
  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');

  if (!isImage && !isMp4) {
    throw new Error('Only image files and MP4 videos (up to 10 MB) are allowed.');
  }

  if (file.size > MAX_BYTES) {
    throw new Error('File size exceeds the 10 MB limit.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${customFolder}/${Date.now()}_${cleanName}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  return {
    path: data.path,
    publicUrl: getMediaPublicUrl(data.path),
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * List files stored in the library folder.
 */
export async function listLibraryMedia(folder = 'library') {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    console.error('Error listing media library:', error);
    return [];
  }

  return (data || [])
    .filter((item) => item.name && !item.name.startsWith('.'))
    .map((item) => {
      const fullPath = `${folder}/${item.name}`;
      const isVideo = item.name.toLowerCase().endsWith('.mp4');
      return {
        id: item.id || item.name,
        name: item.name,
        path: fullPath,
        publicUrl: getMediaPublicUrl(fullPath),
        size: item.metadata?.size || 0,
        createdAt: item.created_at,
        isVideo,
      };
    });
}

/**
 * Delete a media file from 'event-media'.
 */
export async function deleteLibraryMedia(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

