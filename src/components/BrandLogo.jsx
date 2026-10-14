import React from 'react';
import logoImg from '../assets/logo.png';

export const BrandLogo = ({ size = 'medium', subtitle = true }) => {
  const iconSizes = {
    small: { w: 42, h: 42, fontSize: '1rem' },
    medium: { w: 56, h: 56, fontSize: '1.25rem' },
    large: { w: 72, h: 72, fontSize: '1.5rem' }
  };

  const dim = iconSizes[size] || iconSizes.medium;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      {/* Official Infoyashonand Technology Circular Logo */}
      <img
        src={logoImg}
        alt="Infoyashonand Technology Logo"
        style={{
          width: `${dim.w}px`,
          height: `${dim.h}px`,
          objectFit: 'contain',
          borderRadius: '50%',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
          background: '#ffffff',
          flexShrink: 0,
          border: '1.5px solid rgba(226, 232, 240, 0.8)'
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 800,
          letterSpacing: '0.02em',
          color: '#0f172a',
          fontSize: dim.fontSize,
          lineHeight: 1.15
        }}>
          INFOYASHONAND
        </div>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#1e3a8a',
          letterSpacing: '0.06em',
          lineHeight: 1.2
        }}>
          TECHNOLOGY PVT. LTD.
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.7rem',
            color: '#64748b',
            fontWeight: 500,
            marginTop: '2px'
          }}>
            Placement Cell & Proctor Management Portal
          </div>
        )}
      </div>
    </div>
  );
};
