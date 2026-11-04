// src/components/dashboard/business/ReceiptViewerModal.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, Download, FileText, X, AlertCircle } from 'lucide-react';
import { getSignedFileUrl } from '../../../lib/businessStorage';
import { useLanguage } from '../../../context/LanguageContext';

export default function ReceiptViewerModal({
  isOpen,
  onClose,
  bucket = 'receipts',
  filePath = null,
  title = null,
}) {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (isOpen && filePath) {
      setLoading(true);
      setError(null);
      getSignedFileUrl(bucket, filePath, 60)
        .then((url) => {
          if (!active) return;
          if (url) {
            setSignedUrl(url);
          } else {
            setError(isAr ? 'تعذر إنشاء رابط مؤمن للملف' : 'Could not generate secure file URL');
          }
        })
        .catch((err) => {
          if (!active) return;
          setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setSignedUrl(null);
    }
    return () => {
      active = false;
    };
  }, [isOpen, filePath, bucket, isAr]);

  if (!isOpen) return null;

  const isPdf = filePath?.toLowerCase().endsWith('.pdf');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(170deg, rgba(22, 24, 34, 0.99), rgba(12, 13, 18, 0.99))',
          borderRadius: '20px',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={20} color="#ffb800" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              {title || (isAr ? 'عرض المستند / الإيصال المؤمن' : 'Secure File Viewer')}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <ExternalLink size={14} />
                <span>{isAr ? 'فتح في نافذة جديدة' : 'Open in tab'}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#a0a0b2',
                cursor: 'pointer',
                padding: '0.4rem',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '1.5rem',
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          {loading ? (
            <div style={{ color: '#ffb800', textAlign: 'center', fontSize: '0.9rem' }}>
              {isAr ? 'جاري تجهيز الرابط الموقّع للملف...' : 'Generating secure signed URL...'}
            </div>
          ) : error ? (
            <div style={{ color: '#f87171', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <iframe
                src={signedUrl}
                title="Document Preview"
                style={{
                  width: '100%',
                  height: '550px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              />
            ) : (
              <img
                src={signedUrl}
                alt="Receipt Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '550px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            )
          ) : (
            <div style={{ color: '#88889a' }}>
              {isAr ? 'لا يوجد ملف متاح' : 'No file available'}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.75rem',
            color: '#a0a0b2',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {isAr
              ? '🔒 الرابط صالح لمدة 60 ثانية لحماية خصوصية الوثائق والبيانات المالية.'
              : '🔒 Signed URL valid for 60 seconds for security.'}
          </span>
        </div>
      </div>
    </div>
  );
}

