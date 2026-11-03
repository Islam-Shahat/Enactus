import React, { useState } from 'react';
import { newsArticles } from '../data/enactusData';
import { useNews } from '../hooks/usePublicContent';
import SEO from '../components/SEO';
import { Calendar, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { localizeNewsMock } from '../services/mockLocalization';

export default function NewsPage() {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const fallback = localizeNewsMock(newsArticles, lang);
  const { data: news = fallback, isLoading } = useNews(fallback);

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <SEO
        title={selectedArticle ? selectedArticle.title : (isAr ? 'الأخبار والبيانات الصحفية' : 'News & Press Releases')}
        description={selectedArticle ? selectedArticle.excerpt : (isAr ? 'أحدث أخبار وبيانات إيناكوس قنا الرسمية، الشراكات، وتغطيات الفعاليات.' : 'Official news, press releases, strategic partnerships, and coverage of Enactus Qena.')}
        image={selectedArticle?.image}
      />
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            NEWSROOM & PRESS RELEASES
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            {isAr ? (
              <>
                أخبار وإعلانات <span className="gold-gradient-text">النشاط الرسمي</span>
              </>
            ) : (
              <>
                Official News & <span className="gold-gradient-text">Press Releases</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            {isAr
              ? 'تابع البيانات الرسمية والشراكات وتغطيات الفعاليات وإنجازات مشاريع صعيد مصر أولاً بأول.'
              : 'Follow our official statements, corporate alliances, event coverage, and venture milestones across Upper Egypt.'}
          </p>
        </div>

        {/* Loading skeleton when empty & loading */}
        {isLoading && news.length === 0 && (
          <div className="grid-2" style={{ marginBottom: '4rem' }}>
            {[1, 2].map((n) => (
              <div
                key={n}
                className="glass-panel"
                style={{
                  height: '420px',
                  borderRadius: '24px',
                  background: 'rgba(255, 184, 0, 0.04)',
                  border: '1px dashed rgba(255, 184, 0, 0.25)',
                }}
              />
            ))}
          </div>
        )}

        {/* News Grid */}
        <div className="grid-2" style={{ marginBottom: '4rem' }}>
          {news.map((article) => (
            <div
              key={article.slug}
              className="glass-panel gold-glow-hover card-shine"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(255, 184, 0, 0.25)',
                textAlign: isAr ? 'right' : 'left',
              }}
            >
              <div>
                <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={article.image}
                    alt={article.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '16px', right: isAr ? '16px' : 'auto', left: isAr ? 'auto' : '16px' }}>
                    <span className="badge-gold">{article.category}</span>
                  </div>
                </div>

                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffd54f', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
                    <Calendar size={14} />
                    <span>{article.date}</span>
                  </div>

                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', lineHeight: 1.4 }}>
                    {article.title}
                  </h3>

                  <p style={{ color: '#b5b5c6', fontSize: '0.94rem', lineHeight: 1.7, margin: 0 }}>
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem 2rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setSelectedArticle(article)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffb800',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: 0,
                  }}
                >
                  <span>{isAr ? 'قراءة البيان كاملاً' : 'Read Full Article'}</span>
                  <ArrowIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Article Reader Modal */}
        {selectedArticle && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(5, 5, 8, 0.94)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setSelectedArticle(null)}
          >
            <div
              className="glass-panel gold-border-glow"
              style={{
                position: 'relative',
                maxWidth: '750px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                borderRadius: '24px',
                padding: '2.5rem',
                background: '#0e0f16',
                boxShadow: '0 30px 80px rgba(0,0,0,0.95)',
                textAlign: isAr ? 'right' : 'left',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedArticle(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: isAr ? 'auto' : '20px',
                  left: isAr ? '20px' : 'auto',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffd54f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>

              <div style={{ height: '260px', borderRadius: '18px', overflow: 'hidden', marginBottom: '1.75rem' }}>
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className="badge-gold">{selectedArticle.category}</span>
                <span style={{ fontSize: '0.85rem', color: '#ffd54f' }}>{selectedArticle.date}</span>
              </div>

              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: '#fff', marginBottom: '1.25rem', lineHeight: 1.3 }}>
                {selectedArticle.title}
              </h2>

              <div style={{ color: '#c5c5d8', fontSize: '1.02rem', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                {selectedArticle.content}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
