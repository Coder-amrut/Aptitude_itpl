import React, { useState, useEffect } from 'react';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { SecureTestRoom } from './pages/student/SecureTestRoom';
import { TestResultView } from './pages/student/TestResultView';

// Error Boundary Component to prevent white screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Test Room ErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#ffffff', padding: '2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '520px', background: '#1e293b', padding: '2.5rem 2rem', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ef4444' }}>Session Display Restored</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your examination progress is securely saved. Please click below to re-enter your active test session.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '0.8rem 1.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Resume Assessment
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Navigation View State: 'login' | 'admin-dashboard' | 'student-dashboard' | 'test-room' | 'test-result'
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('infoyashonand_current_view');
    if (saved === 'admin-dashboard' || saved === 'student-dashboard' || saved === 'test-room' || saved === 'test-result') {
      return saved;
    }
    return 'login';
  });

  const [currentAdmin, setCurrentAdmin] = useState(() => {
    const saved = localStorage.getItem('infoyashonand_active_admin');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentStudent, setCurrentStudent] = useState(() => {
    try {
      const saved = localStorage.getItem('infoyashonand_active_student');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTest, setActiveTest] = useState(() => {
    try {
      const saved = localStorage.getItem('infoyashonand_active_test');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [lastAttempt, setLastAttempt] = useState(() => {
    try {
      const saved = localStorage.getItem('infoyashonand_last_attempt');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('infoyashonand_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem('infoyashonand_active_admin', JSON.stringify(currentAdmin));
    } else {
      localStorage.removeItem('infoyashonand_active_admin');
    }
  }, [currentAdmin]);

  useEffect(() => {
    if (currentStudent) {
      localStorage.setItem('infoyashonand_active_student', JSON.stringify(currentStudent));
    } else {
      localStorage.removeItem('infoyashonand_active_student');
    }
  }, [currentStudent]);

  useEffect(() => {
    if (activeTest) {
      localStorage.setItem('infoyashonand_active_test', JSON.stringify(activeTest));
    } else {
      localStorage.removeItem('infoyashonand_active_test');
    }
  }, [activeTest]);

  useEffect(() => {
    if (lastAttempt) {
      localStorage.setItem('infoyashonand_last_attempt', JSON.stringify(lastAttempt));
    } else {
      localStorage.removeItem('infoyashonand_last_attempt');
    }
  }, [lastAttempt]);

  // Safety fallback: prevent blank white screen if state is missing
  useEffect(() => {
    if (currentView === 'test-room' && (!activeTest || !currentStudent)) {
      setCurrentView(currentStudent ? 'student-dashboard' : 'login');
    }
    if (currentView === 'test-result' && !lastAttempt) {
      setCurrentView('login');
    }
    if (currentView === 'admin-dashboard' && !currentAdmin) {
      setCurrentView('login');
    }
    if (currentView === 'student-dashboard' && !currentStudent) {
      setCurrentView('login');
    }
  }, [currentView, activeTest, currentStudent, currentAdmin, lastAttempt]);

  // Auth Handlers
  const handleAdminLoginSuccess = (adminData) => {
    setCurrentAdmin(adminData);
    setCurrentStudent(null);
    setCurrentView('admin-dashboard');
  };

  const handleAdminLogout = () => {
    setCurrentAdmin(null);
    setCurrentView('login');
  };

  const handleStudentLoginSuccess = (studentData, testObj = null) => {
    setCurrentStudent(studentData);
    setCurrentAdmin(null);
    if (testObj) {
      setActiveTest(testObj);
      setCurrentView('test-room');
    } else {
      setCurrentView('student-dashboard');
    }
  };

  const handleStudentLogout = () => {
    setCurrentStudent(null);
    setActiveTest(null);
    setCurrentView('login');
  };

  const handleStartTest = (testObj) => {
    setActiveTest(testObj);
    setCurrentView('test-room');
  };

  const handleTestCompleted = (attemptObj, testObj) => {
    setLastAttempt(attemptObj);
    setActiveTest(testObj);
    setCurrentStudent(null);
    localStorage.removeItem('infoyashonand_active_student');
    setCurrentView('test-result');
  };

  const handleReturnToLogin = () => {
    setActiveTest(null);
    setCurrentStudent(null);
    setLastAttempt(null);
    localStorage.removeItem('infoyashonand_active_test');
    localStorage.removeItem('infoyashonand_active_student');
    localStorage.removeItem('infoyashonand_last_attempt');
    setCurrentView('login');
  };

  const handleViewResult = (attemptObj, testObj) => {
    setLastAttempt(attemptObj);
    setActiveTest(testObj);
    setCurrentView('test-result');
  };

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* 1. Unified Institutional Login View (Admin ID or Student ID created by Admin) */}
        {currentView === 'login' && (
          <AdminLogin
            onAdminLoginSuccess={handleAdminLoginSuccess}
            onStudentLoginSuccess={handleStudentLoginSuccess}
          />
        )}

        {/* 2. Admin Dashboard Console */}
        {currentView === 'admin-dashboard' && currentAdmin && (
          <AdminDashboard
            admin={currentAdmin}
            onLogout={handleAdminLogout}
          />
        )}

        {/* 3. Candidate / Student Dashboard */}
        {currentView === 'student-dashboard' && currentStudent && (
          <StudentDashboard
            student={currentStudent}
            onStartTest={handleStartTest}
            onViewResult={handleViewResult}
            onLogout={handleStudentLogout}
          />
        )}

        {/* 4. High-Security Proctored Test Room */}
        {currentView === 'test-room' && (
          activeTest && currentStudent ? (
            <SecureTestRoom
              test={activeTest}
              student={currentStudent}
              onTestCompleted={handleTestCompleted}
            />
          ) : (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#ffffff' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Loading Assessment Environment...</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Verifying student session credentials...</div>
              </div>
            </div>
          )
        )}

        {/* 5. Scorecard & Proctor Audit View (Test Submitted Successfully -> Go to Login Dashboard) */}
        {currentView === 'test-result' && lastAttempt && (
          <TestResultView
            attempt={lastAttempt}
            test={activeTest || { title: 'Assessment' }}
            onBackToDashboard={handleReturnToLogin}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
