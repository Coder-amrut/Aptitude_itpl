import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, User, Clock, RefreshCw, Eye, CheckCircle2, ShieldX, Copy } from 'lucide-react';
import { dbService } from '../../services/dbService';

export const ProctorMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [fetchedLogs, fetchedAttempts] = await Promise.all([
      dbService.getProctorLogs(),
      dbService.getAttempts()
    ]);
    setLogs(fetchedLogs);
    setAttempts(fetchedAttempts);
    setLoading(false);
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'back_button_pressed':
        return <span className="badge badge-danger">Back Button Navigation</span>;
      case 'tab_switch':
        return <span className="badge badge-warning">Tab Switch / Blur</span>;
      case 'copy_paste_attempt':
        return <span className="badge badge-danger">Copy/Paste Shortcut</span>;
      case 'fullscreen_exit':
        return <span className="badge badge-warning">Fullscreen Exit</span>;
      default:
        return <span className="badge badge-neutral">{type}</span>;
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Live Proctor & Security Desk</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Real-time audit log of student proctoring violations, browser back button navigation strikes, and attempt states.
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Stream
        </button>
      </div>

      {/* Security Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL ATTEMPTS</span>
            <User size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {attempts.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>SECURITY STRIKES</span>
            <ShieldAlert size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.5rem' }}>
            {logs.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TERMINATED ATTEMPTS</span>
            <ShieldX size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '0.5rem' }}>
            {attempts.filter((a) => a.autoSubmittedReason || a.status === 'terminated').length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Real-time Violation Stream */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="proctor-dot" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Live Security Incident Feed</h3>
            </div>
            <span className="badge badge-neutral">Auto-refresh every 5s</span>
          </div>

          <div className="card-body" style={{ padding: '0' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                <div>No proctor infractions recorded. Examination session is secure.</div>
              </div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Candidate Roll / ID</th>
                      <th>Violation Type</th>
                      <th>Details & Incident Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>
                            {log.studentRollNo || log.studentId || 'Anonymous Candidate'}
                          </div>
                          {log.studentName && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.studentName}</div>}
                        </td>
                        <td>
                          {getEventBadge(log.eventType)}
                        </td>
                        <td style={{ fontSize: '0.825rem', color: '#334155' }}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
