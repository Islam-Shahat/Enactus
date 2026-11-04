import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على أي عناصر مطابقة في الوقت الحالي.',
  action = null,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed rgba(255, 184, 0, 0.2)',
        margin: '1rem 0',
        ...style,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 184, 0, 0.1)',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffb800',
          marginBottom: '1rem',
        }}
      >
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.9rem', color: '#a0a0b2', maxWidth: '380px', margin: 0, lineHeight: 1.6 }}>
        {description}
      </p>
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}

