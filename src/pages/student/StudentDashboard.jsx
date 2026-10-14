import React, { useState, useEffect } from 'react';
import {
  Clock, ShieldAlert, Award, AlertTriangle, Play,
  CheckCircle2, LogOut, FileText, ChevronRight, User, ShieldCheck,
  Lock, Key, RefreshCw, Search, Calendar, ListChecks,
  HelpCircle, Info, ExternalLink, Sparkles, BookOpen
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { dbService } from '../../services/dbService';

export const StudentDashboard = ({ student, onStartTest, onViewResult, onLogout }) => {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'history'
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, [student]);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [allTests, allAttempts] = await Promise.all([
        dbService.getTests(),
        dbService.getAttempts()
      ]);

      // Filter attempts belonging to this student from Supabase DB
      const studentAttempts = (allAttempts || []).filter(
        (a) => a.studentId === student.id || a.studentRollNo?.toLowerCase() === student.rollNo?.toLowerCase()
      );

      // Active tests available in database
      const liveTests = (allTests || []).filter((t) => t.isActive !== false);

      setTests(liveTests);
      setAttempts(studentAttempts);
    } catch (err) {
      console.error('Failed to load student data from database:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  // Filtered Tests
  const filteredTests = tests.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(tests.map((t) => t.category).filter(Boolean)))];

  const completedTestIds = new Set(attempts.map((a) => a.testId));
  const pendingTestsCount = tests.filter((t) => !completedTestIds.has(t.id)).length;

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: 'clamp(0.6rem, 2vw, 0.85rem) clamp(0.75rem, 3vw, 2rem)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <BrandLogo size="small" subtitle={false} />

          {/* Database Live Sync Status & Candidate Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1.25rem)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                DB Live: <strong style={{ fontFamily: 'var(--font-mono)' }}>fxgyxt...</strong>
              </span>
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Sync and refresh latest tests from Database"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#2563eb' }}
              >
                <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              </button>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                flexShrink: 0
              }}>
                {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {student.fullName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  PRN: <strong>{student.rollNo}</strong>
                </div>
              </div>
            </div>

            <button onClick={onLogout} className="btn btn-secondary btn-sm" title="Log out">
              <LogOut size={14} /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main Student Portal Content */}
      <main style={{ maxWidth: '1280px', margin: '1.25rem auto', padding: '0 clamp(0.75rem, 2.5vw, 1.5rem)', flex: 1, width: '100%' }}>
        {/* Profile & Metric Highlights Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3.5vw, 2rem)',
            color: '#ffffff',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: '#2563eb', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700 }}>
                CANDIDATE PORTAL
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {student.batch || 'Batch 2026'} • {student.branch || 'Engineering'}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back, {student.fullName}
            </h1>
            <p style={{ fontSize: 'clamp(0.78rem, 2vw, 0.85rem)', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
              Institutional Proctored Assessment Desk • Secure Testing Room
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: 'auto' }}>
            <div
              onClick={() => setActiveTab('tests')}
              style={{ background: 'rgba(255,255,255,0.06)', padding: '0.65rem 1rem', borderRadius: '12px', border: activeTab === 'tests' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '85px', flex: '1 1 85px', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view Available Assessments"
            >
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Tests</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>{tests.length}</div>
            </div>

            <div
              onClick={() => setActiveTab('tests')}
              style={{ background: 'rgba(255,255,255,0.06)', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '85px', flex: '1 1 85px', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view Available Assessments"
            >
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Pending</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>{pendingTestsCount}</div>
            </div>

            <div
              onClick={() => setActiveTab('history')}
              style={{ background: 'rgba(255,255,255,0.06)', padding: '0.65rem 1rem', borderRadius: '12px', border: activeTab === 'history' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '85px', flex: '1 1 85px', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Click to view My Submissions"
            >
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Submitted</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{attempts.length}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Scrollable touch tab bar) */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', whiteSpace: 'nowrap' }}>
          <button
            onClick={() => setActiveTab('tests')}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'tests' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'tests' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={16} />
            Available Assessments ({tests.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'history' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} />
            My Submissions ({attempts.length})
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: AVAILABLE ASSESSMENTS (FROM DATABASE)         */}
        {/* ==================================================== */}
        {activeTab === 'tests' && (
          <div>
            {/* Search and Category Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search assessment by title or category..."
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', height: '40px', fontSize: '0.85rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {categories.length > 2 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assessment Cards Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#2563eb' }} />
                Fetching active tests from database...
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
                  <BookOpen size={28} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  No Active Assessments Found
                </h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                  There are currently no live assessments matching your query. All tests created by the Placement Cell will appear here automatically.
                </p>
                <button onClick={() => loadData(true)} className="btn btn-secondary btn-sm" style={{ margin: '0 auto' }}>
                  <RefreshCw size={14} /> Refresh From Database
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1.25rem' }}>
                {filteredTests.map((test) => {
                  const existingAttempt = attempts.find((a) => a.testId === test.id);
                  const isCompleted = Boolean(existingAttempt);

                  return (
                    <div
                      key={test.id}
                      className="card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '14px',
                        border: isCompleted ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        background: '#ffffff'
                      }}
                    >
                      <div className="card-header" style={{ padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          {test.category || 'General Aptitude'}
                        </span>

                        {isCompleted ? (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Submitted
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
                            Live Now
                          </span>
                        )}
                      </div>

                      <div className="card-body" style={{ flex: 1, padding: '1.15rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem', lineHeight: 1.4 }}>
                          {test.title}
                        </h3>

                        <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem', minHeight: '36px', lineHeight: 1.5 }}>
                          {test.description || 'Institutional placement assessment. Monitored by automated proctoring AI.'}
                        </p>

                        {/* Test Specifications Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(65px, 1fr))', gap: '0.4rem', background: '#f8fafc', padding: '0.65rem 0.5rem', borderRadius: '10px', textAlign: 'center', border: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>DURATION</div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a8a' }}>
                              {test.durationMinutes}m
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>QUESTIONS</div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a8a' }}>
                              {test.questionCount || '—'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>MARKS</div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a8a' }}>
                              {test.totalMarks}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>PASS %</div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e3a8a' }}>
                              {test.passPercentage}%
                            </div>
                          </div>
                        </div>

                        {/* Negative marking & security note */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldAlert size={12} color="#f59e0b" /> AI Monitored
                          </span>
                          <span>
                            Negative: <strong style={{ color: '#16a34a' }}>None (0.00)</strong>
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9', background: '#fafafa', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                        {isCompleted ? (
                          <button
                            onClick={() => onViewResult(existingAttempt, test)}
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                          >
                            <FileText size={15} /> View Submission Receipt
                          </button>
                        ) : (
                          <button
                            onClick={() => onStartTest(test)}
                            className="btn btn-primary"
                            style={{
                              width: '100%',
                              fontSize: '0.875rem',
                              fontWeight: 800,
                              background: '#1e3a8a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '0.65rem 1rem',
                              borderRadius: '8px'
                            }}
                          >
                            <Play size={15} fill="#ffffff" /> Start Assessment
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MY SUBMISSION RECORDS (FROM DATABASE)         */}
        {/* ==================================================== */}
        {activeTab === 'history' && (
          <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Assessment Submission History
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  All records are stored directly in Supabase PostgreSQL (`test_attempts` table)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveTab('tests')}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <BookOpen size={14} /> Go to Available Assessments
                </button>
                <button onClick={() => loadData(true)} className="btn btn-secondary btn-sm">
                  <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh History
                </button>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                  No Assessment Submissions Recorded
                </div>
                <p style={{ fontSize: '0.8rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                  You have not submitted any assessments yet. View your assessments in the Available Assessments tab.
                </p>
                <button
                  onClick={() => setActiveTab('tests')}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <BookOpen size={14} /> Redirect to Available Assessments
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Assessment Title</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Time Taken</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Proctor Audit</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Grading Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((att) => {
                      const matchedTest = tests.find((t) => t.id === att.testId);
                      const testTitle = matchedTest?.title || 'Placement Assessment';
                      const submitDate = att.endTime ? new Date(att.endTime).toLocaleString() : 'Recently';

                      const mins = Math.floor((att.timeSpentSeconds || 0) / 60);
                      const secs = (att.timeSpentSeconds || 0) % 60;

                      return (
                        <tr key={att.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            {testTitle}
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400, fontFamily: 'var(--font-mono)' }}>
                              Ref: {att.id.slice(0, 8)}...
                            </div>
                          </td>
                          <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem' }}>
                            {submitDate}
                          </td>
                          <td style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>
                            {mins}m {secs}s
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {att.violationsCount > 0 ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                {att.violationsCount} Flag(s) Logged
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                Clean Session
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                              Confidential Evaluation
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                              <button
                                onClick={() => setActiveTab('tests')}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Redirect to Available Assessments"
                              >
                                <BookOpen size={12} /> Available Tests
                              </button>
                              <button
                                onClick={() => onViewResult(att, matchedTest || { title: testTitle })}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.75rem' }}
                              >
                                View Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


      </main>


    </div>
  );
};
