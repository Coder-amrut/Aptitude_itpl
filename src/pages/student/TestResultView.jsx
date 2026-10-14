import React from 'react';
import { CheckCircle2, ShieldCheck, ShieldAlert, LogIn, Clock } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';

export const TestResultView = ({ attempt, test, onBackToDashboard }) => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: 'clamp(0.6rem, 2vw, 0.875rem) clamp(0.75rem, 3vw, 2rem)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <BrandLogo size="small" subtitle={false} />
          <button onClick={onBackToDashboard} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={14} /> Go to Login Dashboard
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: 'clamp(1.5rem, 4vw, 3rem) auto', padding: '0 clamp(0.75rem, 3vw, 1.5rem)', width: '100%' }}>
        <div className="card" style={{ padding: 'clamp(1.5rem, 4vw, 2.75rem) clamp(1rem, 3.5vw, 2.5rem)', textAlign: 'center', boxShadow: 'var(--shadow-xl)', borderRadius: '16px' }}>
          {/* Header Icon */}
          <div
            style={{
              width: 'clamp(64px, 12vw, 80px)',
              height: 'clamp(64px, 12vw, 80px)',
              borderRadius: '50%',
              background: attempt.autoSubmittedReason ? '#fee2e2' : '#ecfdf5',
              color: attempt.autoSubmittedReason ? '#dc2626' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: attempt.autoSubmittedReason ? '0 4px 14px rgba(220, 38, 38, 0.2)' : '0 4px 14px rgba(16, 185, 129, 0.2)'
            }}
          >
            {attempt.autoSubmittedReason ? (
              <ShieldAlert size={40} />
            ) : (
              <CheckCircle2 size={40} />
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', lineHeight: 1.3 }}>
            {attempt.autoSubmittedReason
              ? 'Test Auto-Submitted & Closed'
              : 'Test Submitted Successfully!'}
          </h1>

          <p style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {test?.title || 'Institutional Assessment'} • Candidate: <strong>{attempt.studentName}</strong> (PRN: <code>{attempt.studentRollNo}</code>)
          </p>

          {attempt.autoSubmittedReason && (
            <div
              style={{
                background: '#fef2e2',
                border: '1.5px solid #ef4444',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
                color: '#991b1b',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <ShieldAlert size={18} />
                SECURITY AUTO-SUBMISSION TRIGGERED
              </div>
              <div style={{ color: '#450a0a', fontWeight: 600 }}>
                {attempt.autoSubmittedReason}
              </div>
            </div>
          )}

          {/* Confidentiality Notice */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(1rem, 2.5vw, 1.5rem)',
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                Assessment Responses Securely Recorded in Database
              </div>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              Your examination responses and anti-cheat proctor logs have been verified and saved. The assessment session is now closed. Please click the button below to return to the <strong>Login Dashboard</strong>.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              marginBottom: '2rem',
              fontSize: '0.85rem',
              color: '#64748b',
              background: '#f1f5f9',
              padding: '0.75rem 1rem',
              borderRadius: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} color="#2563eb" />
              <span>Time Taken: <strong>{Math.floor((attempt.timeSpentSeconds || 0) / 60)}m {(attempt.timeSpentSeconds || 0) % 60}s</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>Database Status: <strong style={{ color: '#16a34a' }}>Saved & Submitted</strong></span>
            </div>
          </div>

          {/* Go to Login Dashboard Button */}
          <button
            onClick={onBackToDashboard}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0.9rem 1.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}
          >
            <LogIn size={20} /> Go to Login Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};
