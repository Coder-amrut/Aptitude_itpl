import React, { useState, useEffect } from 'react';
import {
  HelpCircle, Plus, Code, Trash2, CheckCircle2,
  FileCode, Layers, Info, Check, Eye
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { CodeBlock } from '../../components/CodeBlock';

export const QuestionBank = () => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    questionText: '',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'c',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    marks: 2,
    explanation: ''
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    const testList = await dbService.getTests();
    setTests(testList);
    if (testList.length > 0) {
      setSelectedTestId(testList[0].id);
      loadQuestions(testList[0].id);
    } else {
      setLoading(false);
    }
  };

  const loadQuestions = async (testId) => {
    setLoading(true);
    const qList = await dbService.getQuestions(testId);
    setQuestions(qList);
    setLoading(false);
  };

  const handleTestChange = (e) => {
    const id = e.target.value;
    setSelectedTestId(id);
    loadQuestions(id);
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!formData.questionText || !formData.optionA || !formData.optionB) {
      alert('Please fill in the question text and at least options A and B.');
      return;
    }

    const payload = {
      ...formData,
      testId: selectedTestId
    };

    await dbService.addQuestion(payload);
    setShowAddModal(false);
    setFormData({
      questionText: '',
      hasCode: false,
      codeContent: '',
      codeLanguage: 'c',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      marks: 2,
      explanation: ''
    });
    loadQuestions(selectedTestId);
  };

  const handleDelete = async (qId) => {
    if (window.confirm('Delete this question from the test?')) {
      await dbService.deleteQuestion(qId);
      loadQuestions(selectedTestId);
    }
  };

  const activeTest = tests.find((t) => t.id === selectedTestId);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>MCQ & Code Question Bank</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Manage assessment questions, add technical code snippets (C, Python, Java, SQL, JS), and configure MCQ choices.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-sm"
          disabled={!selectedTestId}
        >
          <Plus size={16} /> Add New MCQ Question
        </button>
      </div>

      {/* Test Selector Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={18} color="#1e3a8a" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Assessment:</span>
          </div>

          <select
            className="form-control"
            style={{ maxWidth: '420px', fontWeight: 600 }}
            value={selectedTestId}
            onChange={handleTestChange}
          >
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.durationMinutes} mins • {t.totalMarks} marks)
              </option>
            ))}
          </select>

          {activeTest && (
            <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
              <span className="badge badge-primary">Duration: {activeTest.durationMinutes} mins</span>
              <span className="badge badge-neutral">Total Questions: {questions.length}</span>
              <span className="badge badge-warning">Passing: {activeTest.passPercentage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading questions...
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <HelpCircle size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>No questions added for this test yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Click the button below to add your first MCQ or Code-based aptitude question.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus size={15} /> Add First Question
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="card" style={{ padding: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem'
                  }}>
                    {idx + 1}
                  </span>
                  <span className="badge badge-neutral">Marks: +{q.marks}</span>
                  {q.hasCode && (
                    <span className="badge badge-primary">
                      <Code size={12} /> {q.codeLanguage.toUpperCase()} Code
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(q.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  title="Delete question"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Question Text */}
              <div style={{ fontSize: '0.975rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                {q.questionText}
              </div>

              {/* Rendered Code Block if Question Has Code */}
              {q.hasCode && q.codeContent && (
                <div style={{ margin: '0.75rem 0' }}>
                  <CodeBlock code={q.codeContent} language={q.codeLanguage} allowCopy={true} />
                </div>
              )}

              {/* MCQ Options Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem',
                margin: '1rem 0'
              }}>
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const optText = q[`option${opt}`];
                  const isCorrect = q.correctOption === opt;
                  if (!optText) return null;

                  return (
                    <div
                      key={opt}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: isCorrect ? '2px solid #10b981' : '1px solid #e2e8f0',
                        background: isCorrect ? '#ecfdf5' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isCorrect ? '#10b981' : '#f1f5f9',
                        color: isCorrect ? '#ffffff' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {opt}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: isCorrect ? '#065f46' : '#1e293b', fontWeight: isCorrect ? 600 : 400 }}>
                        {optText}
                      </span>
                      {isCorrect && <CheckCircle2 size={16} color="#10b981" style={{ marginLeft: 'auto' }} />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation note if available */}
              {q.explanation && (
                <div style={{
                  background: '#f8fafc',
                  borderLeft: '3px solid #3b82f6',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  color: '#475569',
                  borderRadius: '0 6px 6px 0'
                }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={20} color="#1e3a8a" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Add Assessment MCQ Question</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Question Statement / Problem Description *</label>
                  <textarea
                    required
                    className="form-control"
                    placeholder="Enter the question text or problem statement..."
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  />
                </div>

                {/* Has Code Toggle */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem 1.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Code size={18} color="#2563eb" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Does this question contain Code / Program Snippet?
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Enables dedicated formatted programming space with syntax styling
                        </div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      id="codeToggle"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={formData.hasCode}
                      onChange={(e) => setFormData({ ...formData, hasCode: e.target.checked })}
                    />
                  </div>

                  {/* Code Editor Space */}
                  {formData.hasCode && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <label className="form-label" style={{ margin: 0 }}>Language:</label>
                        <select
                          className="form-control"
                          style={{ width: '160px', padding: '0.35rem 0.6rem' }}
                          value={formData.codeLanguage}
                          onChange={(e) => setFormData({ ...formData, codeLanguage: e.target.value })}
                        >
                          <option value="c">C</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="sql">SQL</option>
                          <option value="go">Go</option>
                          <option value="text">Pseudo-code</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label">Code Snippet (Generous Editing Space):</label>
                        <textarea
                          className="form-control"
                          style={{
                            minHeight: '160px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                            background: '#0d1117',
                            color: '#58a6ff',
                            lineHeight: 1.5
                          }}
                          placeholder={`# Type your ${formData.codeLanguage} code here...`}
                          value={formData.codeContent}
                          onChange={(e) => setFormData({ ...formData, codeContent: e.target.value })}
                        />
                      </div>

                      {/* Live Code Preview */}
                      {formData.codeContent && (
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Candidate View Preview:</span>
                          <CodeBlock code={formData.codeContent} language={formData.codeLanguage} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* MCQ Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Option A *</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice A"
                      className="form-control"
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option B *</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice B"
                      className="form-control"
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option C</label>
                    <input
                      type="text"
                      placeholder="Choice C"
                      className="form-control"
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option D</label>
                    <input
                      type="text"
                      placeholder="Choice D"
                      className="form-control"
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    />
                  </div>
                </div>

                {/* Correct Option and Marks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Correct Option *</label>
                    <select
                      className="form-control"
                      value={formData.correctOption}
                      onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marks / Points</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-control"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Detailed Solution / Answer Explanation</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '65px' }}
                    placeholder="Explain why this option is correct (visible on scorecard review)..."
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Question to Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
