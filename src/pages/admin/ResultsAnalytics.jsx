import React, { useState, useEffect } from 'react';
import { Award, Download, Search, CheckCircle2, XCircle, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';

export const ResultsAnalytics = () => {
  const [attempts, setAttempts] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [attList, testList] = await Promise.all([
      dbService.getAttempts(),
      dbService.getTests()
    ]);
    setAttempts(attList);
    setTests(testList);
    setLoading(false);
  };

  const handleExportResults = () => {
    const exportData = attempts.map((a) => {
      const test = tests.find((t) => t.id === a.testId);
      const isPass = a.percentage >= (test?.passPercentage || 50);

      return {
        'Student Roll No': a.studentRollNo,
        'Student Name': a.studentName,
        'Assessment Title': test?.title || 'Aptitude Test',
        'Score Obtained': a.totalScore,
        'Maximum Score': a.maxScore,
        'Percentage (%)': a.percentage.toFixed(1),
        'Result Status': isPass ? 'PASSED' : 'FAILED',
        'Time Spent (mins)': (a.timeSpentSeconds / 60).toFixed(1),
        'Proctor Strikes': a.violationsCount || 0,
        'Submission Mode': a.autoSubmittedReason ? `Auto-submitted: ${a.autoSubmittedReason}` : 'Normal Submission',
        'Submission Timestamp': new Date(a.createdAt).toLocaleString()
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results_Master');
    XLSX.writeFile(wb, `Infoyashonand_Results_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filtered = attempts.filter((a) => {
    return (
      a.studentRollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Assessment Results & Performance</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Comprehensive evaluation scores, violation auditing, pass/fail status, and Excel export reports.
          </p>
        </div>

        <button onClick={handleExportResults} className="btn btn-secondary btn-sm">
          <Download size={15} /> Export Results to Excel
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Student Roll No or Candidate Name..."
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
            Total Submissions: {filtered.length}
          </div>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Roll No / ID</th>
              <th>Student Name</th>
              <th>Score / Max</th>
              <th>Percentage</th>
              <th>Status</th>
              <th>Time Spent</th>
              <th>Proctor Strikes</th>
              <th style={{ textAlign: 'right' }}>Scorecard</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>Loading results...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No test submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((att) => {
                const test = tests.find((t) => t.id === att.testId);
                const isPass = att.percentage >= (test?.passPercentage || 50);

                return (
                  <tr key={att.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e3a8a' }}>
                        {att.studentRollNo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{att.studentName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(att.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {att.totalScore}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}> / {att.maxScore}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: isPass ? '#059669' : '#dc2626' }}>
                        {att.percentage.toFixed(1)}%
                      </div>
                    </td>
                    <td>
                      {att.autoSubmittedReason ? (
                        <span className="badge badge-danger" title={att.autoSubmittedReason}>
                          Terminated
                        </span>
                      ) : isPass ? (
                        <span className="badge badge-success">Passed</span>
                      ) : (
                        <span className="badge badge-warning">Failed</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                      </span>
                    </td>
                    <td>
                      {att.violationsCount > 0 ? (
                        <span className="badge badge-danger">
                          <ShieldAlert size={12} /> {att.violationsCount} Strikes
                        </span>
                      ) : (
                        <span className="badge badge-success">0 Clean</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedAttempt(att)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        <Eye size={13} /> View Audit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selectedAttempt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Assessment Audit Card: {selectedAttempt.studentName}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  Roll ID: {selectedAttempt.studentRollNo}
                </span>
              </div>
              <button onClick={() => setSelectedAttempt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SCORE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>
                    {selectedAttempt.totalScore} / {selectedAttempt.maxScore}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>PERCENTAGE</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedAttempt.percentage >= 50 ? '#059669' : '#dc2626' }}>
                    {selectedAttempt.percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>PROCTOR VIOLATIONS</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedAttempt.violationsCount > 0 ? '#dc2626' : '#059669' }}>
                    {selectedAttempt.violationsCount}
                  </div>
                </div>
              </div>

              {selectedAttempt.autoSubmittedReason && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  marginBottom: '1.25rem'
                }}>
                  <strong>Security Enforcement Action:</strong> {selectedAttempt.autoSubmittedReason}
                </div>
              )}

              {/* Violations breakdown */}
              {selectedAttempt.violationsLog && selectedAttempt.violationsLog.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem', color: '#0f172a' }}>
                    Incident Log during Exam:
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    {selectedAttempt.violationsLog.map((v, i) => (
                      <div key={i} style={{ padding: '4px 0', borderBottom: i < selectedAttempt.violationsLog.length - 1 ? '1px solid #e2e8f0' : 'none', color: '#b91c1c' }}>
                        • {v.message || v.type} ({v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : 'Recorded'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedAttempt(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
