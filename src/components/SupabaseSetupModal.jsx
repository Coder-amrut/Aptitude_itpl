import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, Copy, Check, ExternalLink, X, RefreshCw } from 'lucide-react';
import { getSupabaseConfigStatus, setCustomSupabaseCredentials, getSupabaseClient } from '../services/supabase';

export const SupabaseSetupModal = ({ isOpen, onClose, onConfigured }) => {
  const current = getSupabaseConfigStatus();
  const [url, setUrl] = useState(current.supabaseUrl || '');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    try {
      const client = setCustomSupabaseCredentials(url, key);
      if (!client) {
        setTestResult({
          success: false,
          message: 'Please enter a valid Supabase Project URL (https://...) and Anon Public Key.'
        });
        setTesting(false);
        return;
      }

      // Test query
      const { data, error } = await client.from('admins').select('count').limit(1);
      if (error && error.code !== 'PGRST116') {
        setTestResult({
          success: false,
          message: `Connected to Supabase, but schema tables might not exist yet: ${error.message}. Please run the SQL script below in your Supabase SQL Editor.`
        });
      } else {
        setTestResult({
          success: true,
          message: 'Successfully connected to Supabase Database!'
        });
        if (onConfigured) onConfigured();
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopySqlInstructions = () => {
    const sqlNotice = `Run the provided 'supabase_schema.sql' located in your project root in your Supabase SQL Editor.`;
    navigator.clipboard.writeText(sqlNotice);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleResetToOffline = () => {
    setCustomSupabaseCredentials('', '');
    setUrl('');
    setKey('');
    setTestResult({ success: true, message: 'Switched to High-Fidelity LocalStorage Database mode.' });
    if (onConfigured) onConfigured();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={20} color="#1e3a8a" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Supabase Backend Configuration</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleTestAndSave}>
          <div className="modal-body">
            <div style={{
              background: current.isConfigured ? '#ecfdf5' : '#eff6ff',
              border: `1px solid ${current.isConfigured ? '#a7f3d0' : '#bfdbfe'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              {current.isConfigured ? (
                <CheckCircle size={22} color="#059669" />
              ) : (
                <Database size={22} color="#2563eb" />
              )}
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: current.isConfigured ? '#065f46' : '#1e3a8a' }}>
                  {current.isConfigured ? 'Supabase Backend Connected' : 'Running in Offline / Hybrid Safe Mode'}
                </div>
                <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                  {current.isConfigured
                    ? `Live PostgreSQL syncing active: ${current.supabaseUrl}`
                    : 'All tests, student uploads, and security events are fully operational and saved locally.'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Supabase Project URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://your-project-ref.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Found in Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Supabase Anon Public API Key</label>
              <input
                type="password"
                className="form-control"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Found in Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API Keys &gt; anon public
              </span>
            </div>

            {testResult && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                background: testResult.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                color: testResult.success ? '#065f46' : '#991b1b'
              }}>
                {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <div>{testResult.message}</div>
              </div>
            )}

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontSize: '0.8rem',
              color: '#334155'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0f172a' }}>
                Database Schema Ready:
              </div>
              <div>
                File <code>supabase_schema.sql</code> is already generated in your project root with tables for Admins, Students, Tests, Questions, and Proctor Logs.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetToOffline}
            >
              Reset to Local Safe Mode
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={testing}
            >
              {testing ? <RefreshCw size={14} className="spin" /> : <Database size={14} />}
              {testing ? 'Testing...' : 'Save & Connect Supabase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
