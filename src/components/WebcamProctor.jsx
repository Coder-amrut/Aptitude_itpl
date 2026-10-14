import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const WebcamProctor = ({ isViolating = false, violationText = '' }) => {
  // Camera recording disabled per examination policy
  const streamActive = false;
  const permissionDenied = false;

  return (
    <div
      style={{
        position: 'relative',
        width: '180px',
        height: '135px',
        background: '#0f172a',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: isViolating ? '2px solid #ef4444' : '2px solid #3b82f6',
        boxShadow: isViolating ? '0 0 15px rgba(239, 68, 68, 0.5)' : 'var(--shadow-md)'
      }}
    >
      {streamActive && !permissionDenied ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            color: '#94a3b8',
            padding: '0.5rem',
            textAlign: 'center'
          }}
        >
          <Camera size={26} color="#60a5fa" style={{ marginBottom: '4px' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#e2e8f0' }}>AI Proctor Lens</span>
          <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Simulated Stream</span>
        </div>
      )}

      {/* Face guide reticle */}
      <div
        style={{
          position: 'absolute',
          inset: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.25)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      {/* Proctoring Status Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '6px',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '0.65rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div className="proctor-dot" />
          <span style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.04em' }}>LIVE PROCTOR</span>
        </div>
        {isViolating ? (
          <ShieldAlert size={12} color="#ef4444" />
        ) : (
          <CheckCircle2 size={12} color="#10b981" />
        )}
      </div>

      {isViolating && violationText && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(220, 38, 38, 0.9)',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: 700,
            textAlign: 'center',
            padding: '2px 4px'
          }}
        >
          {violationText}
        </div>
      )}
    </div>
  );
};
