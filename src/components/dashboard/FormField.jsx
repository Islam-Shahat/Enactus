import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function FormField({
  label,
  error = null,
  required = false,
  children,
  style = {},
  labelStyle = {},
}) {
  const { isDark } = useTheme();
  const defaultColor = isDark ? '#ffd54f' : '#854d0e';

  return (
    <div style={{ marginBottom: '1.25rem', ...style }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: defaultColor,
            marginBottom: '0.4rem',
            ...labelStyle,
          }}
        >
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <span
          style={{
            display: 'block',
            fontSize: '0.8rem',
            color: '#ef4444',
            marginTop: '0.35rem',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

