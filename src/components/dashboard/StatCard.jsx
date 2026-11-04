import React from 'react';
import Skeleton from './Skeleton';

export default function StatCard({
  title,
  value,
  icon: Icon = null,
  subtitle = null,
  isLoading = false,
  onClick = null,
  style = {},
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`glass-panel stat-card ${isClickable ? 'clickable gold-glow-hover' : ''}`}
      style={{
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '0.82rem', color: '#a0a0b2', margin: 0, fontWeight: 600 }}>
          {title}
        </p>
        <div style={{ marginTop: '0.4rem', marginBottom: '0.2rem' }}>
          {isLoading ? (
            <Skeleton width="60px" height="28px" borderRadius="6px" />
          ) : (
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              {value}
            </h3>
          )}
        </div>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: '#ffd54f', display: 'block', marginTop: '0.25rem' }}>
            {subtitle}
          </span>
        )}
      </div>

      {Icon && (
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(255, 184, 0, 0.12)',
            border: '1px solid rgba(255, 184, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffb800',
            flexShrink: 0,
            marginInlineStart: '1rem',
          }}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}

