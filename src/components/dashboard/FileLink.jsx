import React, { useState } from 'react';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';

export default function FileLink({
  bucket = 'cvs',
  path,
  label = null,
  expiresIn = 60,
  style = {},
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!path) {
    return (
      <span style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
        {isAr ? 'لا يوجد ملف مرفق' : 'No file attached'}
      </span>
    );
  }

  const handleOpen = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (signedErr || !data?.signedUrl) {
        throw signedErr || new Error('Failed to generate signed download link');
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[FileLink] Signed URL generation error:', err);
      setError(isAr ? 'فشل استخراج رابط الملف' : 'Failed to retrieve file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', ...style }}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.85rem',
          fontSize: '0.82rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileText size={15} color="#ffb800" />
        )}
        <span>{label || (isAr ? 'عرض وتحميل السيرة الذاتية (CV)' : 'View & Download CV')}</span>
        <ExternalLink size={13} color="#a0a0b2" />
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
          {error}
        </span>
      )}
    </div>
  );
}

