import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', className = '', style = {} }) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 184, 0, 0.12) 50%, rgba(255, 255, 255, 0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.6s infinite linear',
        ...style,
      }}
    />
  );
}

