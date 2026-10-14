import React from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const CodeBlock = ({ code, language = 'c', allowCopy = false }) => {
  const [copied, setCopied] = React.useState(false);

  if (!code || !code.trim()) return null;

  const handleCopy = () => {
    if (!allowCopy) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="code-box-container">
      <div className="code-box-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={14} color="#58a6ff" />
          <span className="lang-tag">{language}</span>
          <span style={{ color: '#484f58', fontSize: '0.75rem' }}>• {lines.length} lines</span>
        </div>
        {allowCopy && (
          <button
            onClick={handleCopy}
            className="btn btn-sm"
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.7rem',
              background: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d'
            }}
          >
            {copied ? <Check size={12} color="#2ea043" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', background: '#0d1117' }}>
        {/* Line numbers column */}
        <div
          style={{
            userSelect: 'none',
            padding: '1rem 0.75rem 1rem 1rem',
            textAlign: 'right',
            color: '#484f58',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: '1.6',
            borderRight: '1px solid #21262d'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code Content */}
        <pre
          className="code-box-content"
          style={{
            margin: 0,
            padding: '1rem 1.25rem',
            flex: 1,
            outline: 'none'
          }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
