import React, { useState } from 'react';
import { newsArticles } from '../data/enactusData';
import { Newspaper, Calendar, ArrowLeft, X, Sparkles } from 'lucide-react';

export default function NewsPage() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <div className="page-container-padding" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 4rem auto' }}>
          <span className="badge-gold font-cinzel" style={{ marginBottom: '1rem' }}>
            NEWSROOM & PRESS RELEASES
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', fontWeight: 900, marginBottom: '1.25rem', color: '#fff' }}>
            أخبار وإعلانات <span className="gold-gradient-text">النشاط الرسمي</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#c5c5d8', lineHeight: 1.8 }}>
            تابع البيانات الرسمية والشراكات وتغطيات الفعاليات وإنجازات مشاريع صعيد مصر أولاً بأول.
          </p>
        </div>

        {/* News Grid */}
        <div className="grid-2" style={{ marginBottom: '4rem' }}>
          {newsArticles.map((article) => (
            <div
              key={article.slug}
              className="glass-panel gold-glow-hover card-shine"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(255, 184, 0, 0.22)',
                background: 'rgba(18, 19, 28, 0.85)',
              }}
            >
              <div>
                <div className="news-card-img" style={{ height: '260px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={article.image}
                    alt={article.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                    <span className="badge-gold">{article.category}</span>
                  </div>
                </div>

                <div className="responsive-card-p" style={{ padding: '2rem 1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffd54f', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <Calendar size={14} />
                    <span>{article.date}</span>
                  </div>

                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                    {article.title}
                  </h2>

                  <p style={{ color: '#b5b5c6', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.25rem 1.75rem',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: 'rgba(10, 11, 16, 0.5)',
                }}
              >
                <button
                  onClick={() => setSelectedArticle(article)}
                  className="btn-primary"
                  style={{ fontSize: '0.88rem', padding: '0.55rem 1.35rem' }}
                >
                  <span>قراءة التقرير بالكامل</span>
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Article Full View Modal */}
        {selectedArticle && (
          <div
            onClick={() => setSelectedArticle(null)}
            className="modal-overlay-responsive"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 5, 8, 0.92)',
              backdropFilter: 'blur(16px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel gold-border-glow modal-dialog-responsive"
              style={{
                maxWidth: '780px',
                width: '100%',
                maxHeight: '88vh',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#0d0e14',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255, 184, 0, 0.2)' }}>
                <span className="badge-gold">{selectedArticle.category}</span>
                <button
                  onClick={() => setSelectedArticle(null)}
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body-responsive" style={{ padding: '2rem', overflowY: 'auto' }}>
                <div style={{ height: 'clamp(180px, 35vh, 300px)', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                  <img src={selectedArticle.image} alt={selectedArticle.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ffd54f', marginBottom: '0.5rem' }}>{selectedArticle.date}</div>
                <h2 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 900, color: '#fff', marginBottom: '1.25rem' }}>{selectedArticle.title}</h2>
                <p style={{ color: '#d5d5e5', fontSize: '1rem', lineHeight: 1.8 }}>{selectedArticle.content}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
