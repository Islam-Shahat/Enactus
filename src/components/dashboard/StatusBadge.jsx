import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_MAP = {
  // Applications
  new: { ar: 'جديد', en: 'New', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
  screening: { ar: 'قيد الفرز', en: 'Screening', bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.35)' },
  interview: { ar: 'مقابلة شخصية', en: 'Interview', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' },
  accepted: { ar: 'مقبول', en: 'Accepted', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  rejected: { ar: 'مرفوض', en: 'Rejected', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
  withdrawn: { ar: 'منسحب', en: 'Withdrawn', bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.35)' },

  // Memberships & Profiles
  active: { ar: 'نشط', en: 'Active', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  suspended: { ar: 'معلق', en: 'Suspended', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
  alumni: { ar: 'خريج', en: 'Alumni', bg: 'rgba(255, 184, 0, 0.15)', text: '#ffd54f', border: 'rgba(255, 184, 0, 0.35)' },
  left: { ar: 'مغادر', en: 'Left', bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.35)' },

  // Positions
  head: { ar: 'رئيس لجنة', en: 'Head', bg: 'rgba(255, 184, 0, 0.2)', text: '#ffd54f', border: 'rgba(255, 184, 0, 0.5)' },
  vice: { ar: 'نائب رئيس', en: 'Vice Head', bg: 'rgba(168, 85, 247, 0.15)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.4)' },
  coordinator: { ar: 'منسق', en: 'Coordinator', bg: 'rgba(56, 189, 248, 0.15)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.4)' },
  member: { ar: 'عضو', en: 'Member', bg: 'rgba(255, 255, 255, 0.08)', text: '#e0e0ec', border: 'rgba(255, 255, 255, 0.2)' },

  // Task Statuses
  todo: { ar: 'قيد الانتظار', en: 'To Do', bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In Progress', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
  review: { ar: 'قيد المراجعة', en: 'In Review', bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.35)' },
  done: { ar: 'مكتملة', en: 'Done', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.35)' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },

  // Task Priorities
  low: { ar: 'منخفضة', en: 'Low', bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.35)' },
  normal: { ar: 'عادية', en: 'Normal', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' },
  high: { ar: 'مرتفعة', en: 'High', bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.35)' },
  urgent: { ar: 'عاجلة', en: 'Urgent', bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.5)' },
};

export default function StatusBadge({ status, color = null, customColor = null, label = null, className = '', style = {} }) {
  const { lang } = useLanguage();
  const activeColor = color || customColor;
  const config = STATUS_MAP[status] || {
    ar: status,
    en: status,
    bg: 'rgba(255, 255, 255, 0.08)',
    text: '#ffffff',
    border: 'rgba(255, 255, 255, 0.15)',
  };

  const displayText = label || (lang === 'ar' ? config.ar : config.en);

  const customStyle = activeColor
    ? {
        background: `${activeColor}22`,
        color: activeColor,
        borderColor: `${activeColor}66`,
      }
    : {
        background: config.bg,
        color: config.text,
        borderColor: config.border,
      };

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        border: '1px solid',
        whiteSpace: 'nowrap',
        ...customStyle,
        ...style,
      }}
    >
      {displayText}
    </span>
  );
}

