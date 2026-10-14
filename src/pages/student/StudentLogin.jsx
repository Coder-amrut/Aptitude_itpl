import React, { useState } from 'react';
import { UserCheck, Lock, ArrowRight, Eye, EyeOff, ShieldAlert, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { dbService } from '../../services/dbService';

export const StudentLogin = ({ onLoginSuccess, onSwitchToAdmin }) => {
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const res = await dbService.studentLogin(identifier, fullName);
    if (res.success) {
      onLoginSuccess(res.student);
    } else {
      setErrorMessage(res.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)',
        padding: '1.5rem'
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <BrandLogo size="medium" subtitle={true} />
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2.25rem',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl)',
          background: '#ffffff',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '8px', background: '#ecfdf5', borderRadius: '50%', marginBottom: '8px' }}>
            <UserCheck size={28} color="#059669" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
            Candidate Assessment Desk
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
            Enter your Student PRN Number and Name to access your assessment portal
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              STUDENT FULL NAME
            </label>
            <input
              type="text"
              className="form-control"
              style={{ height: '46px' }}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Patil"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              STUDENT PRN NUMBER / ROLL NO *
            </label>
            <input
              type="text"
              required
              className="form-control"
              style={{ height: '46px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. IY-2026-001"
            />
          </div>

          {errorMessage && (
            <div style={{ fontSize: '0.825rem', color: '#dc2626', fontWeight: 600, marginBottom: '1.25rem' }}>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', height: '46px', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {loading ? 'Authenticating Candidate...' : 'Enter Assessment Portal'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={onSwitchToAdmin}
          className="btn btn-secondary btn-sm"
          style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1' }}
        >
          <ArrowLeft size={14} /> Back to Placement Cell Admin Login
        </button>
      </div>

      <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
        Infoyashonand Assessment Platform • Secure Lab Environment
      </div>
    </div>
  );
};
