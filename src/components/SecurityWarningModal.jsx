import React from 'react';
import { AlertTriangle, ShieldX, ArrowRight, Lock } from 'lucide-react';

export const SecurityWarningModal = ({
  isOpen,
  warningCount,
  maxWarnings = 2,
  violationReason,
  onAcknowledge,
  isTerminated = false
}) => {
  if (!isOpen) return null;

  const isFinalStrike = warningCount >= maxWarnings && !isTerminated;

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          border: isTerminated || isFinalStrike ? '2px solid #ef4444' : '2px solid #f59e0b',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.4)'
        }}
      >
        <div style={{ padding: '2rem 1.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isTerminated ? '#fee2e2' : isFinalStrike ? '#fef2f2' : '#fef3c7',
              color: isTerminated || isFinalStrike ? '#dc2626' : '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            {isTerminated ? (
              <ShieldX size={36} />
            ) : (
              <AlertTriangle size={36} />
            )}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {isTerminated
              ? 'TEST TERMINATED & AUTO-SUBMITTED'
              : isFinalStrike
              ? `CRITICAL WARNING: STRIKE ${warningCount} OF ${maxWarnings}`
              : `PROCTOR SECURITY ALERT (${warningCount} OF ${maxWarnings})`}
          </h2>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              margin: '1rem 0',
              fontSize: '0.875rem',
              color: '#334155',
              lineHeight: 1.5
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              VIOLATION DETECTED:
            </div>
            <div style={{ color: '#dc2626', fontWeight: 600 }}>
              {violationReason || 'Proctored environment anomaly detected.'}
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {isTerminated ? (
              'You have reached the maximum proctor infractions limit (Window switched 2 times or back navigation attempted). Your test has been terminated and auto-submitted to the Placement Cell for review.'
            ) : isFinalStrike ? (
              <>
                <strong>ATTENTION:</strong> This is your <strong>FINAL WARNING (Strike 2 of 2)</strong>. If you switch windows or navigate away, your assessment will be <strong>IMMEDIATELY TERMINATED AND AUTO-SUBMITTED</strong>.
              </>
            ) : (
              'Switching windows or tabs, application switching, browser back navigation, exiting full-screen, and copying content are strictly prohibited. Switching windows 2 times will automatically submit your exam!'
            )}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {isTerminated ? (
              <button onClick={onAcknowledge} className="btn btn-danger btn-lg" style={{ width: '100%' }}>
                <Lock size={18} /> View Test Submission Summary
              </button>
            ) : (
              <button
                onClick={onAcknowledge}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  background: isFinalStrike ? '#dc2626' : undefined
                }}
              >
                I Understand & Re-enter Secure Test <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
