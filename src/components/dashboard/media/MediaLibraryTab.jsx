// src/components/dashboard/media/MediaLibraryTab.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  Copy,
  Trash2,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../Toast';
import {
  listLibraryMedia,
  uploadLibraryMedia,
  deleteLibraryMedia,
} from '../../../lib/mediaStorage';

export default function MediaLibraryTab() {
  const { isSuperAdmin, hasRole } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const canDelete = isSuperAdmin || hasRole('media_admin') || hasRole('president');
  const canUpload = isSuperAdmin || hasRole(['media_admin', 'president', 'vice_president', 'oc_admin']) || hasRole('member');

  const [uploading, setUploading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch library media files
  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ['media_library_files'],
    queryFn: () => listLibraryMedia('library'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (path) => deleteLibraryMedia(path),
    onSuccess: () => {
      toast.show(isAr ? 'تم حذف الملف من المكتبة' : 'File deleted from library', 'success');
      queryClient.invalidateQueries({ queryKey: ['media_library_files'] });
    },
    onError: (err) => {
      toast.show(err.message || (isAr ? 'فشل حذف الملف' : 'Delete failed'), 'error');
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    try {
      for (const f of files) {
        await uploadLibraryMedia(f, 'library');
        successCount++;
      }
      toast.show(
        isAr ? `تم رفع ${successCount} ملف إلى مكتبة الميديا` : `${successCount} files uploaded`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['media_library_files'] });
    } catch (err) {
      toast.show(err.message || (isAr ? 'فشل رفع الملفات' : 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = (url, path) => {
    navigator.clipboard.writeText(url);
    setCopiedPath(path);
    toast.show(isAr ? 'تم نسخ الرابط العام للحافظة' : 'Public URL copied to clipboard', 'success');
    setTimeout(() => setCopiedPath(null), 2500);
  };

  const filteredItems = mediaItems.filter((item) => {
    if (!search.trim()) return true;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload Zone */}
      {canUpload && (
        <div
          style={{
            border: '2px dashed rgba(255, 184, 0, 0.35)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'background 0.2s ease',
          }}
          onClick={() => {
            if (!uploading) document.getElementById('library-file-input').click();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 184, 0, 0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
        >
          <input
            id="library-file-input"
            type="file"
            multiple
            accept="image/*,video/mp4"
            disabled={uploading}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <UploadCloud size={36} color="#ffb800" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            {uploading
              ? isAr ? 'جاري رفع الملفات إلى مكتبة الميديا...' : 'Uploading files to library...'
              : isAr ? 'رفع ملفات أو تصميمات إلى مكتبة الميديا' : 'Upload Media to Cloud Library'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#a0a0b2' }}>
            {isAr
              ? 'الصور بجميع الصيغ أو مقاطع الفيديو MP4 بحد أقصى 10 ميجابايت للملف الواحد'
              : 'PNG, JPG, WEBP or MP4 video up to 10 MB per file'}
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              insetInlineStart: '10px',
              color: '#88889a',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في ملفات المكتبة...' : 'Search library files...'}
            className="dashboard-input"
            style={{
              width: '100%',
              padding: '0.55rem 0.9rem',
              paddingInlineStart: '34px',
              borderRadius: '8px',
              fontSize: '0.85rem',
            }}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: '#c5c5d6', fontWeight: 600 }}>
          {filteredItems.length} {isAr ? 'ملف' : 'files'}
        </div>
      </div>

      {/* Grid of Media */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ffb800' }}>
          {isAr ? 'جاري تحميل ملفات المكتبة...' : 'Loading library assets...'}
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            color: '#88889a',
          }}
        >
          {isAr ? 'المكتبة فارغة، قم برفع صور أو فيديوهات للبدء.' : 'Media library is empty. Upload assets to start.'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.path}
              className="glass-panel"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  height: '140px',
                  background: '#0a0a0f',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {item.isVideo ? (
                  <video
                    src={item.publicUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={item.publicUrl}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: item.isVideo ? '#00f2fe' : '#ffb800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  {item.isVideo ? <Film size={11} /> : <ImageIcon size={11} />}
                  <span>{item.isVideo ? 'MP4' : 'IMG'}</span>
                </div>
              </div>

              {/* Details & Actions */}
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.name}
                >
                  {item.name}
                </span>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#88889a' }}>
                  <span>{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.publicUrl, item.path)}
                    className="btn-secondary"
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedPath === item.path ? (
                      <>
                        <Check size={12} color="#34d399" />
                        <span style={{ color: '#34d399' }}>{isAr ? 'تم النسخ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>{isAr ? 'نسخ الرابط' : 'Copy URL'}</span>
                      </>
                    )}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <a
                      href={item.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#60a5fa', padding: '0.25rem' }}
                      title={isAr ? 'معاينة' : 'Preview'}
                    >
                      <ExternalLink size={14} />
                    </a>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الملف؟' : 'Delete file?')) {
                            deleteMutation.mutate(item.path);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '0.25rem',
                        }}
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

