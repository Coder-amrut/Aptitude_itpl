import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, ArrowRight, Eye, EyeOff, User, Award, Shield,
  FileQuestion, Key, AlertCircle, Info, CheckCircle2, Hash
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { dbService } from '../../services/dbService';

export const AdminLogin = ({ onAdminLoginSuccess, onStudentLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'

  // Student Form State: 4 Options
  // 1. Student Name (Entered by Candidate)
  // 2. Student PRN Number (Entered by Candidate - saved to DB)
  // 3. Test ID (Entered by Candidate)
  // 4. Examination Password (Entered by Candidate)
  const [studentName, setStudentName] = useState('');
  const [studentPrn, setStudentPrn] = useState('');
  const [testIdCode, setTestIdCode] = useState('');
  const [examPassword, setExamPassword] = useState('');
  const [showExamPassword, setShowExamPassword] = useState(false);
  const [alreadySubmittedCandidate, setAlreadySubmittedCandidate] = useState(null);

  // Admin Form State
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formUnlocked, setFormUnlocked] = useState(false);

  // Strictly prevent browser credential managers (Chrome / Edge) from autofilling saved passwords on load
  useEffect(() => {
    setFormUnlocked(false);
    setStudentName('');
    setStudentPrn('');
    setTestIdCode('');
    setExamPassword('');
    setAdminId('');
    setAdminPassword('');
    setErrorMessage('');

    // Keep inputs readOnly for initial DOM evaluation to deter autofill heuristics
    const unlockTimer = setTimeout(() => {
      setFormUnlocked(true);
    }, 250);

    // Secondary cleanup in case the browser forcibly populated DOM values after mount
    const sanitizeTimer = setTimeout(() => {
      setTestIdCode('');
      setExamPassword('');
      setAdminId('');
      setAdminPassword('');
    }, 500);

    return () => {
      clearTimeout(unlockTimer);
      clearTimeout(sanitizeTimer);
    };
  }, [activeTab]);

  // Auto-save candidate name and PRN to database when entered
  const handleNameBlur = async () => {
    const cleanName = studentName.trim();
    const cleanPrn = studentPrn.trim().toUpperCase();
    if (cleanName && cleanPrn) {
      try {
        await dbService.saveOrUpdateCandidate({ rollNo: cleanPrn, fullName: cleanName });
      } catch (e) { }
    }
  };

  const handlePrnBlur = async () => {
    const cleanPrn = studentPrn.trim().toUpperCase();
    const cleanName = studentName.trim();
    if (cleanPrn && cleanName) {
      try {
        await dbService.saveOrUpdateCandidate({ rollNo: cleanPrn, fullName: cleanName });
      } catch (e) { }
    } else if (cleanPrn && !cleanName) {
      try {
        const found = await dbService.getStudentByPrn(cleanPrn);
        if (found && found.fullName) {
          setStudentName(found.fullName);
        }
      } catch (e) { }
    }
  };

  // Handle Candidate / Student Examination Submission
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setAlreadySubmittedCandidate(null);

    try {
      const cleanName = studentName.trim();
      const cleanPrn = studentPrn.trim().toUpperCase();
      const cleanTestId = testIdCode.trim();
      const cleanPass = examPassword.trim();

      if (!cleanName) {
        setErrorMessage('Please enter Student Full Name.');
        setLoading(false);
        return;
      }

      if (!cleanPrn) {
        setErrorMessage('Please enter Student PRN Number.');
        setLoading(false);
        return;
      }

      // Check if user accidentally typed admin credentials here
      if (cleanName.toLowerCase() === 'adminitpl#01' || cleanName.toLowerCase().includes('admin')) {
        setActiveTab('admin');
        setErrorMessage('Wrong ID or Password.');
        setLoading(false);
        return;
      }

      if (!cleanTestId) {
        setErrorMessage('Please enter Test ID created by Admin.');
        setLoading(false);
        return;
      }

      if (!cleanPass) {
        setErrorMessage('Please enter Test Password created by Admin.');
        setLoading(false);
        return;
      }

      // Verify Test ID and Password, and automatically Save / Update Candidate PRN & Name in DB
      const verificationRes = await dbService.verifyPrnAndTestAccess(cleanPrn, cleanTestId, cleanPass, cleanName);

      if (verificationRes.success) {
        // Authenticate candidate and directly launch into secure test room with 1-min countdown!
        onStudentLoginSuccess(verificationRes.student, verificationRes.test);
        setLoading(false);
        return;
      }

      if (verificationRes.alreadySubmitted) {
        setAlreadySubmittedCandidate(verificationRes.student);
      }

      setErrorMessage(verificationRes.message || 'Credentials verification failed. Access Denied.');
    } catch (err) {
      console.error('Candidate login verification error:', err);
      setErrorMessage('Could not complete database verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Placement Administrator Login
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanId = adminId.trim();
      const cleanPass = adminPassword.trim();

      const adminRes = await dbService.adminLogin(cleanId, cleanPass);
      if (adminRes.success) {
        onAdminLoginSuccess(adminRes.admin);
        setLoading(false);
        return;
      }

      setErrorMessage(adminRes.message || 'Invalid Admin ID or Password. Access Denied.');
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMessage('Authentication error. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%)',
        padding: 'clamp(0.75rem, 3vw, 1.5rem)'
      }}
    >
      {/* Top Header Logo */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '480px' }}>
        <BrandLogo size="medium" subtitle={true} />
      </div>

      {/* Main Login Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: 'clamp(1.25rem, 4vw, 2.25rem) clamp(1rem, 3.5vw, 2rem)',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
          border: '1px solid #e2e8f0',
          background: '#ffffff'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: 'clamp(1.15rem, 3.5vw, 1.35rem)', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>
            Placement Assessment Portal
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
            Institutional Proctored Assessment Desk
          </p>
        </div>

        {/* 2-Tab Switcher: Student Login vs Admin Login */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setErrorMessage('');
            }}
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.825rem',
              cursor: 'pointer',
              background: activeTab === 'student' ? '#1e3a8a' : 'transparent',
              color: activeTab === 'student' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <User size={15} /> Candidate Exam Desk
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMessage('');
            }}
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.825rem',
              cursor: 'pointer',
              background: activeTab === 'admin' ? '#1e3a8a' : 'transparent',
              color: activeTab === 'admin' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Shield size={15} /> Admin Console
          </button>
        </div>

        {/* ======================================================= */}
        {/* TAB 1: 4 OPTIONS CANDIDATE EXAMINATION LOGIN           */}
        {/* 1. Name                                                */}
        {/* 2. PRN (auto-populated when Name is typed/selected)    */}
        {/* 3. Test ID (created by admin while creating exam)      */}
        {/* 4. Password (created by admin while creating exam)     */}
        {/* ======================================================= */}
        {activeTab === 'student' && (
          <form onSubmit={handleStudentSubmit} autoComplete="off">
            {/* Decoy fields to trap aggressive browser credential managers */}
            <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }} aria-hidden="true">
              <input type="text" name="fake_cand_user_prevent" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_cand_pass_prevent" tabIndex={-1} autoComplete="new-password" />
            </div>

            {/* 1. OPTION 1: STUDENT NAME */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.03em' }}
              >
                1. STUDENT NAME *
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', height: '42px', fontSize: '0.875rem' }}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="Enter Student Name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  name="cand_full_name_field"
                />
              </div>
            </div>

            {/* 2. OPTION 2: STUDENT PRN NUMBER */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.03em' }}
              >
                2. STUDENT PRN NUMBER *
              </label>
              <div style={{ position: 'relative' }}>
                <Hash
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', height: '42px', fontSize: '0.875rem' }}
                  value={studentPrn}
                  onChange={(e) => setStudentPrn(e.target.value)}
                  onBlur={handlePrnBlur}
                  placeholder="Enter PRN Number (e.g. IY-2026-001)"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  name="cand_prn_num_field"
                />
              </div>
            </div>

            {/* 3. OPTION 3: EXAMINATION / TEST ID */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.03em' }}
              >
                3. TEST ID *
              </label>
              <div style={{ position: 'relative' }}>
                <Key
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', height: '42px', fontSize: '0.875rem' }}
                  value={testIdCode}
                  onChange={(e) => setTestIdCode(e.target.value)}
                  placeholder="Enter Test ID"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  data-lpignore="true"
                  name="assessment_tid_unq"
                  id="assessment_tid_unq"
                />
              </div>
            </div>

            {/* 4. OPTION 4: EXAMINATION PASSWORD */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.03em' }}
              >
                4. TEST PASSWORD *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type={showExamPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem', height: '42px', fontSize: '0.875rem' }}
                  value={examPassword}
                  onChange={(e) => setExamPassword(e.target.value)}
                  placeholder="Enter Test Password"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  name="assessment_tpass_unq"
                  id="assessment_tpass_unq"
                />
                <button
                  type="button"
                  onClick={() => setShowExamPassword(!showExamPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                  title={showExamPassword ? 'Hide password' : 'Show password'}
                >
                  {showExamPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
                {alreadySubmittedCandidate && (
                  <button
                    type="button"
                    onClick={() => onStudentLoginSuccess(alreadySubmittedCandidate, null)}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 800, alignSelf: 'flex-start' }}
                  >
                    Open Student Dashboard to View Results →
                  </button>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '0.95rem',
                fontWeight: 800,
                background: '#1e3a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Verifying Credentials...' : 'Verify Credentials & Start Test'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        )}

        {/* ======================================================= */}
        {/* TAB 2: PLACEMENT ADMIN LOGIN (ADMIN ID + PASSWORD)      */}
        {/* ======================================================= */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} autoComplete="off">
            {/* Decoy fields to trap aggressive browser credential managers */}
            <div style={{ position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden', zIndex: -1 }} aria-hidden="true">
              <input type="text" name="fake_admin_user_prevent" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_admin_pass_prevent" tabIndex={-1} autoComplete="new-password" />
            </div>

            {/* Admin ID input */}
            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}
              >
                OFFICIAL ADMIN ID *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', height: '44px', fontSize: '0.9rem' }}
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter Admin ID"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  data-lpignore="true"
                  name="admin_login_uid_field"
                  id="admin_login_uid_field"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="form-group" style={{ marginBottom: '1.35rem' }}>
              <label
                className="form-label"
                style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em' }}
              >
                ADMIN PASSWORD *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px', fontSize: '0.9rem' }}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter Admin Password"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  readOnly={!formUnlocked}
                  onFocus={(e) => { e.target.readOnly = false; }}
                  name="admin_login_pwd_field"
                  id="admin_login_pwd_field"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showAdminPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '0.95rem',
                fontWeight: 800,
                background: '#1e3a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Authenticating Admin...' : 'Sign In as Administrator'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        )}
      </div>

      {/* Footer Text */}
      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
        Infoyashonand Assessment Platform • Secure Proctored Environment
      </div>
    </div>
  );
};
