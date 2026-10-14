import React, { useState } from 'react';
import {
  PlusCircle, Award, History, LogOut, ChevronRight
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import { CreateTest } from './CreateTest';
import { SeeResult } from './SeeResult';
import { PreviousTest } from './PreviousTest';

export const AdminDashboard = ({ admin, onLogout }) => {
  const [activeTab, setActiveTab] = useState('create_test');

  const navItems = [
    { id: 'create_test', label: '1. Create Test', icon: PlusCircle, desc: 'Upload PDF/PPT questions & organize options' },
    { id: 'see_result', label: '2. See Result', icon: Award, desc: 'Live takers, results & score cutoff' },
    { id: 'previous_test', label: '3. Previous Test', icon: History, desc: 'Historical tests and past assessments' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      {/* Top Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '0.75rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="admin-header-inner">
          <BrandLogo size="small" subtitle={true} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.fullName || 'Placement Admin'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {admin?.email || 'adminitpl#01'}
              </div>
            </div>
            <button onClick={onLogout} className="btn btn-secondary btn-sm" title="Log out">
              <LogOut size={14} /> Exit Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="admin-layout">
        {/* Sidebar Nav */}
        <nav className="admin-sidebar">
          <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'sticky', top: '72px' }}>
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Admin Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? '#1e3a8a' : 'transparent',
                    color: isActive ? '#ffffff' : '#475569',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={14} color="#93c5fd" style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Pane */}
        <main className="admin-content">
          {activeTab === 'create_test' && <CreateTest onTestCreated={() => setActiveTab('previous_test')} />}
          {activeTab === 'see_result' && <SeeResult />}
          {activeTab === 'previous_test' && <PreviousTest onSelectTestResults={() => setActiveTab('see_result')} />}
        </main>
      </div>
    </div>
  );
};
