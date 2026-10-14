import React, { useState, useEffect } from 'react';
import {
  Award, Activity, Filter, Download, Search, RefreshCw, CheckCircle2, XCircle, Clock, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';

export const SeeResult = () => {
  const [activeTakers, setActiveTakers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Score Cutoff Filter
  const [cutoffScore, setCutoffScore] = useState('');
  const [filterMode, setFilterMode] = useState('marks'); // 'marks' or 'percentage'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // Live poll
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

  // Filter Submissions based on Cutoff
  const filtered = attempts.filter((att) => {
    const matchesSearch =
      att.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.studentRollNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (cutoffScore !== '' && !isNaN(Number(cutoffScore))) {
      const limit = Number(cutoffScore);
      if (filterMode === 'marks') {
        return att.totalScore >= limit;
      } else {
        return att.percentage >= limit;
      }
    }
    return true;
  });

  const handleExportExcel = () => {
    const data = filtered.map((att) => {
      const test = tests.find((t) => t.id === att.testId);
      return {
        'Student Name': att.studentName,
        'PRN Number': att.studentRollNo,
        'Assessment': test?.title || 'Aptitude Test',
        'Score Obtained': att.totalScore,
        'Max Marks': att.maxScore,
        'Percentage (%)': att.percentage.toFixed(1) + '%',
        'Status': att.percentage >= (test?.passPercentage || 50) ? 'PASSED' : 'FAILED',
        'Time Spent (mins)': (att.timeSpentSeconds / 60).toFixed(1),
        'Submitted At': new Date(att.createdAt).toLocaleString()
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `ITPL_Results_Cutoff_${cutoffScore || 'All'}.xlsx`);
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Candidate Results & Score Cutoff Desk</h2>

        </div>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Live Data
        </button>
      </div>

      {/* LIVE USERS GIVING TEST COUNTER */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          border: '1.5px solid #3b82f6',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="proctor-dot" />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                Candidates Currently Giving The Test:
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Active live exam sessions in the proctored assessment room
            </div>
          </div>
        </div>

        <div style={{
          background: activeTakers.length > 0 ? '#ecfdf5' : '#f8fafc',
          border: activeTakers.length > 0 ? '1.5px solid #10b981' : '1px solid #e2e8f0',
          padding: '0.4rem 1.25rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: activeTakers.length > 0 ? '#059669' : '#0f172a',
          fontFamily: 'var(--font-mono)'
        }}>
          {activeTakers.length} Active Candidates
        </div>
      </div>

      {/* SCORE CUTOFF FILTER CARD */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Filter size={18} color="#1e3a8a" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Apply Score Cutoff Filter
          </h3>
        </div>


        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>Cutoff:</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="form-control"
              style={{ width: '110px', fontWeight: 800, fontSize: '1rem', color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}
              value={cutoffScore}
              onChange={(e) => setCutoffScore(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={() => setFilterMode('marks')}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'marks' ? '#1e3a8a' : '#f8fafc',
                color: filterMode === 'marks' ? '#ffffff' : '#475569'
              }}
            >
              Marks (≥ X)
            </button>
            <button
              onClick={() => setFilterMode('percentage')}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'percentage' ? '#1e3a8a' : '#f8fafc',
                color: filterMode === 'percentage' ? '#ffffff' : '#475569'
              }}
            >
              Percentage (≥ X%)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {[10, 15, 20, 50, 60, 75].map((preset) => (
              <button
                key={preset}
                onClick={() => setCutoffScore(String(preset))}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  background: cutoffScore === String(preset) ? '#1e3a8a' : undefined,
                  color: cutoffScore === String(preset) ? '#ffffff' : undefined
                }}
              >
                ≥ {preset}
              </button>
            ))}

            {cutoffScore && (
              <button
                onClick={() => setCutoffScore('')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#dc2626' }}
              >
                Clear Cutoff
              </button>
            )}
          </div>

          <div style={{ marginLeft: 'auto', minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search Student / PRN..."
              className="form-control"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {cutoffScore !== '' && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.85rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.8rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              🎯 Filter active: Showing students with score <strong>≥ {cutoffScore} {filterMode === 'marks' ? 'marks' : '%'}</strong> ({filtered.length} qualified).
            </span>
            <button onClick={handleExportExcel} className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
              <Download size={12} /> Export Qualified List ({filtered.length})
            </button>
          </div>
        )}
      </div>

      {/* RESULTS TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#16a34a" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Submitted Student Results ({filtered.length})
            </h3>
          </div>
          <button onClick={handleExportExcel} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
            <Download size={13} /> Export Results (Excel)
          </button>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>PRN Number</th>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading results...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    {cutoffScore ? (
                      <div>
                        No students scored above the cutoff of <strong>≥ {cutoffScore} {filterMode === 'marks' ? 'marks' : '%'}</strong>.
                        <div style={{ marginTop: '0.5rem' }}>
                          <button onClick={() => setCutoffScore('')} className="btn btn-secondary btn-sm">Clear Cutoff</button>
                        </div>
                      </div>
                    ) : (
                      'No students have submitted the test yet.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((att) => {
                  const test = tests.find((t) => t.id === att.testId);
                  const isPass = att.percentage >= (test?.passPercentage || 50);

                  return (
                    <tr key={att.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a' }}>
                          {att.studentName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {test?.title || 'Campus Placement Test'}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e3a8a' }}>
                          {att.studentRollNo}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>
                            {att.totalScore}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ {att.maxScore} marks</span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isPass ? '#059669' : '#dc2626' }}>
                          {att.percentage.toFixed(1)}%
                        </div>
                      </td>

                      <td>
                        {att.autoSubmittedReason ? (
                          <span className="badge badge-danger">Terminated</span>
                        ) : isPass ? (
                          <span className="badge badge-success">PASSED</span>
                        ) : (
                          <span className="badge badge-warning">FAILED</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                        </span>
                      </td>

                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
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
