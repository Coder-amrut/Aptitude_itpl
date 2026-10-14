import React, { useState, useEffect } from 'react';
import { Plus, Clock, Award, ShieldAlert, BookOpen, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { dbService } from '../../services/dbService';

export const TestManagement = ({ onNavigateToQuestions }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'Campus Recruitment',
    description: '',
    durationMinutes: 30,
    totalMarks: 20,
    passPercentage: 50,
    negativeMarking: 0.25,
    maxViolations: 2
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    const data = await dbService.getTests();
    setTests(data);
    setLoading(false);
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter assessment title.');
      return;
    }

    await dbService.createTest(form);
    setShowModal(false);
    setForm({
      title: '',
      category: 'Campus Recruitment',
      description: '',
      durationMinutes: 30,
      totalMarks: 20,
      passPercentage: 50,
      negativeMarking: 0.25,
      maxViolations: 2
    });
    loadTests();
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Delete this test and all its questions?')) {
      await dbService.deleteTest(testId);
      loadTests();
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Assessment Tests & Time Config</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Configure test duration (minutes), passing thresholds, negative marking, and proctor strictness rules.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          <Plus size={16} /> Create New Assessment
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading tests...</div>
      ) : tests.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Clock size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Assessments Created Yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Set up an aptitude test with custom timing and passing marks.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Plus size={15} /> Create Test
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {tests.map((test) => (
            <div key={test.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
                <span className="badge badge-primary">{test.category}</span>
                <span className={`badge ${test.isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {test.isActive ? 'Active' : 'Archived'}
                </span>
              </div>

              <div className="card-body" style={{ flex: 1, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  {test.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem', minHeight: '38px' }}>
                  {test.description || 'Proctored institutional aptitude and skill evaluation.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                    <Clock size={15} color="#2563eb" />
                    <span><strong>{test.durationMinutes}</strong> Minutes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                    <Award size={15} color="#16a34a" />
                    <span><strong>{test.totalMarks}</strong> Marks</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                    <CheckCircle2 size={15} color="#f59e0b" />
                    <span>Pass: <strong>{test.passPercentage}%</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                    <ShieldAlert size={15} color="#dc2626" />
                    <span>Max Strikes: <strong>{test.maxViolations || 2}</strong></span>
                  </div>
                </div>

                {test.negativeMarking > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '1rem', fontWeight: 600 }}>
                    ⚠️ Negative Marking: -{test.negativeMarking} marks per wrong answer
                  </div>
                )}
              </div>

              <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd' }}>
                <button
                  onClick={() => onNavigateToQuestions && onNavigateToQuestions(test.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  <BookOpen size={14} /> Manage Questions
                </button>
                <button
                  onClick={() => handleDeleteTest(test.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  title="Delete assessment"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEST MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Create New Proctored Assessment</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateTest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Campus Placement Aptitude & Technical Screening"
                    className="form-control"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    placeholder="Campus Recruitment / Coding / Quantitative"
                    className="form-control"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Instructions for Students</label>
                  <textarea
                    className="form-control"
                    placeholder="Provide overview of the assessment syllabus and rules..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Duration (Minutes) *</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="300"
                      className="form-control"
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Timer set by admin</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Marks *</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="500"
                      className="form-control"
                      value={form.totalMarks}
                      onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Passing Percentage (%)</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      className="form-control"
                      value={form.passPercentage}
                      onChange={(e) => setForm({ ...form, passPercentage: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Negative Marking (Marks)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="2"
                      className="form-control"
                      value={form.negativeMarking}
                      onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Allowed Warnings Before Auto-Submit</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="form-control"
                    value={form.maxViolations}
                    onChange={(e) => setForm({ ...form, maxViolations: Number(e.target.value) })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Student will receive 2 warnings; on subsequent back button/tab-switch, test auto-submits.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save & Publish Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
