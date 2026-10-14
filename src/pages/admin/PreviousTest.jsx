import React, { useState, useEffect } from 'react';
import {
  Clock, Award, Users, BookOpen, Trash2, CheckCircle2, ChevronRight, Eye,
  Play, Square, Radio, AlertCircle, RefreshCw
} from 'lucide-react';
import { dbService } from '../../services/dbService';

export const PreviousTest = ({ onSelectTestResults }) => {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'live' | 'ended'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [testList, attemptList, qList, liveList] = await Promise.all([
      dbService.getTests(),
      dbService.getAttempts(),
      dbService.getQuestions(),
      dbService.getActiveTestTakers()
    ]);
    setTests(testList);
    setAttempts(attemptList);
    setQuestions(qList);
    setActiveSessions(liveList || []);
    setLoading(false);
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      await dbService.deleteTest(testId);
      loadData();
    }
  };

  const handleToggleStatus = async (testId, newStatus, title) => {
    const warning = newStatus
      ? `Start and make assessment "${title}" LIVE for students now?`
      : `Are you sure you want to END the assessment "${title}"? Active students will no longer be able to take or submit this test.`;

    if (window.confirm(warning)) {
      await dbService.updateTestStatus(testId, newStatus);
      await loadData();
    }
  };

  const liveCount = tests.filter((t) => t.isActive !== false).length;
  const endedCount = tests.filter((t) => t.isActive === false).length;

  const filteredTests = tests.filter((t) => {
    if (filterMode === 'live') return t.isActive !== false;
    if (filterMode === 'ended') return t.isActive === false;
    return true;
  });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Previous Assessment Archive</h2>

        {/* Filter Tabs for All, Live, Ended + DB Sync */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterMode('all')}
            className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            All Tests ({tests.length})
          </button>
          <button
            onClick={() => setFilterMode('live')}
            className={`btn btn-sm ${filterMode === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.3)' }} />
            Live Tests ({liveCount})
          </button>
          <button
            onClick={() => setFilterMode('ended')}
            className={`btn btn-sm ${filterMode === 'ended' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            Ended ({endedCount})
          </button>
          <button
            onClick={loadData}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Fetch latest test list from Supabase database"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Sync from DB
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading previous tests...</div>
      ) : filteredTests.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          {filterMode === 'live' ? 'No live assessments active right now.' : filterMode === 'ended' ? 'No ended assessments found.' : 'No assessments found.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredTests.map((test) => {
            const testAttempts = attempts.filter((a) => a.testId === test.id);
            const testQuestions = questions.filter((q) => q.testId === test.id);
            const passedCount = testAttempts.filter((a) => a.percentage >= (test.passPercentage || 50)).length;
            const liveTakers = activeSessions.filter((s) => s.testId === test.id);
            const isLive = test.isActive !== false;

            return (
              <div key={test.id} className="card" style={{ display: 'flex', flexDirection: 'column', border: isLive ? '1.5px solid #86efac' : '1px solid #e2e8f0' }}>
                <div className="card-header" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-primary">{test.category}</span>
                    {isLive ? (
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.3)' }} />
                        LIVE TEST
                      </span>
                    ) : (
                      <span style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        ENDED
                      </span>
                    )}
                  </div>

                  <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                    {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>

                <div className="card-body" style={{ flex: 1, padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                    {test.title}
                  </h3>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isLive ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                    gap: '0.4rem',
                    background: isLive ? '#f0fdf4' : '#f8fafc',
                    padding: '0.875rem',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    border: isLive ? '1px solid #bbf7d0' : '1px solid #f1f5f9'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>DURATION</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>
                        {test.durationMinutes} Mins
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>QUESTIONS</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>
                        {testQuestions.length} MCQs
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>SUBMITTED</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#059669' }}>
                        {testAttempts.length} Students
                      </div>
                    </div>
                    {isLive && (
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>LIVE NOW</div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>
                          {liveTakers.length} Taking
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TEST ACCESS CREDENTIALS (ID & PASSWORD FOR STUDENTS) */}
                  <div style={{
                    background: isLive ? '#f0fdf4' : '#f8fafc',
                    border: isLive ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                          TEST ID
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>
                          {test.testIdCode || `TEST-${test.id.slice(0, 6).toUpperCase()}`}
                        </div>
                      </div>

                      <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                          PASSWORD
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', fontSize: '0.85rem' }}>
                          {test.testPassword || 'Exam@Pass2026'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const info = `Assessment: ${test.title}\nTest ID: ${test.testIdCode || `TEST-${test.id.slice(0, 6).toUpperCase()}`}\nPassword: ${test.testPassword || 'Exam@Pass2026'}`;
                        navigator.clipboard.writeText(info);
                        alert(`Copied Credentials for "${test.title}":\nTest ID: ${test.testIdCode || `TEST-${test.id.slice(0, 6).toUpperCase()}`}\nPassword: ${test.testPassword || 'Exam@Pass2026'}`);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Copy Test ID & Password for candidates"
                    >
                      Copy
                    </button>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pass Rate: <strong>{testAttempts.length > 0 ? Math.round((passedCount / testAttempts.length) * 100) : 0}%</strong></span>
                    <span>Total Marks: <strong>{test.totalMarks}</strong></span>
                  </div>
                </div>

                <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => onSelectTestResults && onSelectTestResults(test.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Eye size={13} /> View Results
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* LIVE / END TEST BUTTON */}
                    {isLive ? (
                      <button
                        onClick={() => handleToggleStatus(test.id, false, test.title)}
                        className="btn btn-sm"
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '0.35rem 0.75rem'
                        }}
                        title="Click to end this live assessment"
                      >
                        <Square size={12} fill="#b91c1c" /> End Test
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(test.id, true, test.title)}
                        className="btn btn-sm"
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '0.35rem 0.75rem'
                        }}
                        title="Start and make this assessment live"
                      >
                        <Play size={12} fill="#15803d" /> Start Test
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Delete test"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
