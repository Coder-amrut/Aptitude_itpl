import React, { useState, useEffect } from 'react';
import {
  Users, Activity, Award, Filter, Download, Search,
  RefreshCw, CheckCircle2, XCircle, Clock, ShieldAlert, ArrowUpRight, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';

export const AdminLiveResultsWorkbench = () => {
  const [activeTakers, setActiveTakers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Score Limit Filter (User requirement 3: "admin can able to apply the score limit after that only show this, suppose he applied 50mrk so show only this student who have more than 50 mrk")
  const [scoreLimit, setScoreLimit] = useState('');
  const [filterMode, setFilterMode] = useState('marks'); // 'marks' or 'percentage'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // Live poll every 4s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [takers, allAttempts, allTests] = await Promise.all([
      dbService.getActiveTestTakers(),
      dbService.getAttempts(),
      dbService.getTests()
    ]);
    setActiveTakers(takers || []);
    setAttempts(allAttempts || []);
    setTests(allTests || []);
    setLoading(false);
  };

  // Filter Submissions based on Score Limit
  const filteredSubmissions = attempts.filter((att) => {
    // 1. Text Search filter
    const matchesSearch =
      att.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.studentRollNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Score Limit filter
    if (scoreLimit !== '' && !isNaN(Number(scoreLimit))) {
      const limitVal = Number(scoreLimit);
      if (filterMode === 'marks') {
        return att.totalScore >= limitVal;
      } else {
        return att.percentage >= limitVal;
      }
    }

    return true;
  });

  // Export Filtered Table to Excel
  const handleExportFiltered = () => {
    const exportData = filteredSubmissions.map((att) => {
      const test = tests.find((t) => t.id === att.testId);
      return {
        'Student Name': att.studentName,
        'Roll Number': att.studentRollNo,
        'Test Title': test?.title || 'Aptitude Test',
        'Score Obtained': att.totalScore,
        'Max Marks': att.maxScore,
        'Percentage (%)': att.percentage.toFixed(1) + '%',
        'Status': att.percentage >= (test?.passPercentage || 50) ? 'PASSED' : 'FAILED',
        'Time Spent (mins)': (att.timeSpentSeconds / 60).toFixed(1),
        'Submitted At': new Date(att.createdAt).toLocaleString()
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered_Students');
    XLSX.writeFile(wb, `Infoyashonand_Qualified_Students_${scoreLimit ? 'Cutoff_' + scoreLimit : 'All'}.xlsx`);
  };

  return (
    <div className="fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
            Live Test Monitoring & Results Desk
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Track active test takers live, review submitted candidate results, and apply custom score cutoffs.
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Live Data
        </button>
      </div>

      {/* ============================================================== */}
      {/* REQUIREMENT 1: HOW MANY USERS GIVING THE TEST (LIVE TAKER FEED) */}
      {/* ============================================================== */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1.5px solid #3b82f6',
          borderRadius: '14px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 15px rgba(37, 99, 235, 0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={24} color="#2563eb" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="proctor-dot" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  1. Users Currently Giving The Test
                </h3>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Real-time synchronized candidate sessions in the secure assessment room
              </div>
            </div>
          </div>

          {/* Big Live Count Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: activeTakers.length > 0 ? '#ecfdf5' : '#f8fafc',
            border: activeTakers.length > 0 ? '1.5px solid #10b981' : '1px solid #e2e8f0',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--radius-full)'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeTakers.length > 0 ? '#065f46' : '#64748b' }}>
              CURRENTLY ACTIVE:
            </span>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: activeTakers.length > 0 ? '#059669' : '#0f172a',
              fontFamily: 'var(--font-mono)'
            }}>
              {activeTakers.length} Candidates
            </span>
          </div>
        </div>

        {/* Active Test Takers List */}
        {activeTakers.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No students are currently taking a test. New active exam sessions will automatically appear here live.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
            {activeTakers.map((taker) => (
              <div
                key={taker.sessionId || taker.studentId}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {taker.studentName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    Roll: <strong>{taker.studentRollNo}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e3a8a', marginTop: '2px' }}>
                    {taker.testTitle || 'Campus Aptitude Assessment'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ marginBottom: '4px' }}>
                    <span className="proctor-dot" /> Giving Test Now
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Started: {new Date(taker.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* REQUIREMENT 3: ADMIN CAN APPLY SCORE LIMIT (e.g. 50 MARKS)      */}
      {/* ============================================================== */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          background: '#ffffff',
          border: '1.5px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Filter size={20} color="#1e3a8a" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            3. Apply Score Limit / Cutoff Threshold
          </h3>
        </div>
        <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
          Enter a minimum score cutoff (e.g., <strong>50 marks</strong>). Only students who scored <strong>greater than or equal to</strong> this limit will be displayed in the results table below.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Score Limit Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
              Minimum Score Cutoff:
            </span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50"
              className="form-control"
              style={{
                width: '120px',
                fontWeight: 800,
                fontSize: '1.05rem',
                color: '#1e3a8a',
                fontFamily: 'var(--font-mono)',
                borderColor: scoreLimit ? '#2563eb' : undefined,
                background: scoreLimit ? '#eff6ff' : '#ffffff'
              }}
              value={scoreLimit}
              onChange={(e) => setScoreLimit(e.target.value)}
            />
          </div>

          {/* Toggle Unit: Marks vs Percentage */}
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setFilterMode('marks')}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'marks' ? '#1e3a8a' : '#f8fafc',
                color: filterMode === 'marks' ? '#ffffff' : '#475569'
              }}
            >
              Marks (e.g. ≥ 50 Marks)
            </button>
            <button
              onClick={() => setFilterMode('percentage')}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'percentage' ? '#1e3a8a' : '#f8fafc',
                color: filterMode === 'percentage' ? '#ffffff' : '#475569'
              }}
            >
              Percentage (e.g. ≥ 50%)
            </button>
          </div>

          {/* Quick Cutoff Preset Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Quick Cutoffs:</span>
            {[10, 15, 20, 50, 60, 75].map((val) => (
              <button
                key={val}
                onClick={() => setScoreLimit(String(val))}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.55rem',
                  background: scoreLimit === String(val) ? '#1e3a8a' : undefined,
                  color: scoreLimit === String(val) ? '#ffffff' : undefined
                }}
              >
                ≥ {val} {filterMode === 'marks' ? 'Pts' : '%'}
              </button>
            ))}

            {scoreLimit && (
              <button
                onClick={() => setScoreLimit('')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: '#dc2626' }}
              >
                Clear Limit (Show All)
              </button>
            )}
          </div>

          {/* Search box */}
          <div style={{ marginLeft: 'auto', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search student name / roll..."
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Active Cutoff Status Banner */}
        {scoreLimit !== '' && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              color: '#1e3a8a'
            }}
          >
            <div>
              🎯 <strong>Active Score Filter:</strong> Showing only candidates who scored{' '}
              <strong>≥ {scoreLimit} {filterMode === 'marks' ? 'marks' : '%'}</strong> ({filteredSubmissions.length} of {attempts.length} students qualified).
            </div>
            <button onClick={handleExportFiltered} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Download size={13} /> Export Qualified Candidates ({filteredSubmissions.length})
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* REQUIREMENT 2: AFTER SUBMIT SHOW STUDENT NAME & RESULT         */}
      {/* ============================================================== */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#16a34a" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              2. Submitted Student Results & Scorecards
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-neutral">
              Showing: {filteredSubmissions.length} Students
            </span>
            <button onClick={handleExportFiltered} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Download size={13} /> Export Excel
            </button>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Score Obtained</th>
                <th>Percentage</th>
                <th>Result Status</th>
                <th>Time Spent</th>
                <th>Submitted Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    Loading submitted results...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    {scoreLimit ? (
                      <div>
                        No students met the cutoff score of <strong>≥ {scoreLimit} {filterMode === 'marks' ? 'marks' : '%'}</strong>.
                        <div style={{ marginTop: '0.5rem' }}>
                          <button onClick={() => setScoreLimit('')} className="btn btn-secondary btn-sm">
                            Clear Score Limit
                          </button>
                        </div>
                      </div>
                    ) : (
                      'No students have submitted the test yet.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((att) => {
                  const test = tests.find((t) => t.id === att.testId);
                  const isPass = att.percentage >= (test?.passPercentage || 50);

                  return (
                    <tr key={att.id}>
                      {/* Student Name */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                          {att.studentName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {test?.title || 'Campus Placement Test'}
                        </div>
                      </td>

                      {/* Roll Number */}
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e3a8a' }}>
                          {att.studentRollNo}
                        </span>
                      </td>

                      {/* Score Obtained */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>
                            {att.totalScore}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            / {att.maxScore} marks
                          </span>
                        </div>
                      </td>

                      {/* Percentage */}
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: isPass ? '#059669' : '#dc2626' }}>
                          {att.percentage.toFixed(1)}%
                        </div>
                      </td>

                      {/* Result Status */}
                      <td>
                        {att.autoSubmittedReason ? (
                          <span className="badge badge-danger" title={att.autoSubmittedReason}>
                            Terminated
                          </span>
                        ) : isPass ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} /> PASSED
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <XCircle size={12} /> FAILED
                          </span>
                        )}
                      </td>

                      {/* Time Spent */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(att.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(att.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
