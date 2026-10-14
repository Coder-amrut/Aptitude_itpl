import React, { useState, useRef } from 'react';
import {
  Plus, FileText, Presentation, Code, CheckCircle2,
  Clock, Award, Trash2, Edit3, Upload, Check, AlertCircle, Sparkles, BookOpen,
  Key, Play, Lock, RefreshCw, FileUp, X, ChevronRight
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { CodeBlock } from '../../components/CodeBlock';
import { extractTextFromPdfFile, parseMCQsFromText } from '../../services/pdfHelper';

export const CreateTest = ({ onTestCreated }) => {
  // Test Details Form with 3 options: ID, Password, and Start Test
  const [testDetails, setTestDetails] = useState({
    title: '',
    category: 'Aptitude Assessment',
    durationMinutes: 30,
    totalMarks: 30,
    passPercentage: 50,
    negativeMarking: 0,
    testIdCode: '',
    testPassword: '',
    startTestNow: true
  });

  // Current Questions List FOR THIS TEST ONLY
  const [testQuestions, setTestQuestions] = useState([]);

  // Editing Question State
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Active question addition mode: 'pdf' | 'manual'
  const [addMode, setAddMode] = useState('pdf');

  // PDF / PPT Import State
  const [rawText, setRawText] = useState('');
  const [docType, setDocType] = useState('pdf');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  // Manual Question Form
  const [manualQ, setManualQ] = useState({
    questionText: '',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'c',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    marks: 2
  });

  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [savingStatus, setSavingStatus] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdTestInfo, setCreatedTestInfo] = useState(null);

  // ==============================================================
  // HANDLE DIRECT PDF / PPT / TXT FILE PICKER
  // ==============================================================
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsReadingFile(true);

    try {
      let extracted = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        extracted = await extractTextFromPdfFile(file);
      } else {
        extracted = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }

      if (extracted && extracted.trim()) {
        setRawText(extracted);
        autoOrganizeText(extracted);
      } else {
        alert('Could not extract readable text from this file. Please paste the question text manually in the box below.');
      }
    } catch (err) {
      console.error('File read error:', err);
      alert('Error reading PDF file: ' + err.message + '. You can also copy & paste the questions directly into the box.');
    } finally {
      setIsReadingFile(false);
    }
  };

  // Pre-load Sample PDF Questions
  const handleLoadSamplePdfQuestions = () => {
    const sample = `1. A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?
A) 120 metres
B) 150 metres
C) 180 metres
D) 324 metres
Ans: B

2. Which of the following is not a primitive data type in Java?
A) int
B) float
C) String
D) boolean
Ans: C

3. In a certain code language, if COMPUTER is coded as RFUVQNPC, how will MEDICINE be coded?
A) EOJDEJFM
B) EOJDJEFM
C) MFEDJJOE
D) MFEJDJOE
Ans: A

4. Predict the output of the following C code snippet:
#include <stdio.h>
int main() {
    int a = 10, b = 20;
    printf("%d", a > b ? a : b);
    return 0;
}
A) 10
B) 20
C) Compiler Error
D) Garbage value
Ans: B`;

    setRawText(sample);
    autoOrganizeText(sample);
  };

  // ==============================================================
  // SMART QUESTION PARSER & ORGANIZER (POWERED BY PDF & TEXT ANALYZER)
  // ==============================================================
  const autoOrganizeText = (textToParse) => {
    const content = textToParse || rawText;
    if (!content.trim()) {
      alert('Please select a PDF file or enter questions in the box.');
      return;
    }

    const organized = parseMCQsFromText(content);

    if (!organized || organized.length === 0) {
      alert('Could not organize questions automatically. Please make sure questions have numbers and options (e.g. 1. Question... A) Option 1 B) Option 2 C) Option 3 D) Option 4... Ans: B).');
      return;
    }

    setTestQuestions((prev) => [...prev, ...organized]);
    setRawText('');
    alert(`Success! Successfully analyzed and organized ${organized.length} questions into distinct question text, options A, B, C, D, and answer keys!`);
  };

  // Add Manual Question
  const handleAddManualQuestion = (e) => {
    e.preventDefault();
    if (!manualQ.questionText.trim() || !manualQ.optionA.trim() || !manualQ.optionB.trim()) {
      alert('Please fill in the question text and at least options A and B.');
      return;
    }

    const newQ = {
      id: `manual-q-${Date.now()}`,
      ...manualQ
    };

    setTestQuestions((prev) => [...prev, newQ]);

    setManualQ({
      questionText: '',
      hasCode: false,
      codeContent: '',
      codeLanguage: 'c',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      marks: 2
    });
  };

  const handleRemoveQuestion = (id) => {
    setTestQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Save changes from Edit Modal
  const handleSaveEditedQuestion = (e) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setTestQuestions((prev) =>
      prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
    );
    setEditingQuestion(null);
  };

  // Save the Entire Test & Questions
  const handleSaveAndPublishTest = async () => {
    if (!testDetails.title.trim()) {
      alert('Please enter a Test Title.');
      return;
    }

    if (!testDetails.testIdCode.trim()) {
      alert('Please enter or create the Test ID.');
      return;
    }

    if (!testDetails.testPassword.trim()) {
      alert('Please enter or create the Test Password.');
      return;
    }

    if (testQuestions.length === 0) {
      alert('Please add at least one question before saving the test.');
      return;
    }

    setSaving(true);
    setSavingProgress(15);
    setSavingStatus('Initializing assessment configuration in database (15%)...');
    try {
      const createdTest = await dbService.createTest({
        title: testDetails.title.trim(),
        category: testDetails.category,
        durationMinutes: Number(testDetails.durationMinutes) || 30,
        totalMarks: Number(testDetails.totalMarks) || testQuestions.length * 2,
        passPercentage: Number(testDetails.passPercentage) || 50,
        negativeMarking: Number(testDetails.negativeMarking) || 0,
        maxViolations: 2,
        testIdCode: testDetails.testIdCode.trim(),
        testPassword: testDetails.testPassword.trim(),
        test_id: testDetails.testIdCode.trim(),
        test_password: testDetails.testPassword.trim(),
        isActive: testDetails.startTestNow
      });

      setSavingProgress(40);
      setSavingStatus(`Writing ${testQuestions.length} questions to database (40%)...`);

      // High-speed bulk questions save with live progress calculation
      await dbService.bulkAddQuestions(createdTest.id, testQuestions, (subPercent) => {
        const calculated = Math.round(40 + (subPercent * 0.55));
        setSavingProgress(Math.min(calculated, 95));
        setSavingStatus(`Writing assessment questions to database (${Math.min(calculated, 95)}%)...`);
      });

      // Synchronize latest database state so test is completely updated in DB before frontend display
      await dbService.getTests();

      setSavingProgress(100);
      setSavingStatus('Assessment created & updated in database successfully (100%)!');

      setCreatedTestInfo({
        title: createdTest.title,
        testIdCode: testDetails.testIdCode.trim(),
        testPassword: testDetails.testPassword.trim(),
        isLive: testDetails.startTestNow,
        qCount: testQuestions.length
      });

      setSuccessMsg(`Test "${createdTest.title}" saved successfully to database! Status: ${testDetails.startTestNow ? 'LIVE' : 'SAVED AS DRAFT'}`);

      // Reset form with clean empty inputs (No auto-generated values)
      setTestDetails({
        title: '',
        category: 'Aptitude Assessment',
        durationMinutes: 30,
        totalMarks: 30,
        passPercentage: 50,
        negativeMarking: 0,
        description: '',
        testIdCode: '',
        testPassword: '',
        startTestNow: true
      });
      setTestQuestions([]);
      setUploadedFileName('');
    } catch (err) {
      alert('Failed to save test to database: ' + err.message);
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSavingProgress(0);
        setSavingStatus('');
      }, 3000);
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
          Create New Assessment Test
        </h2>
      </div>

      {/* PROMINENT TEST LIVE CREDENTIALS BANNER FOR ADMIN */}
      {createdTestInfo && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle2 size={22} color="#16a34a" />
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Assessment Created & Published to Database!
              </span>
              {createdTestInfo.isLive ? (
                <span className="badge badge-success" style={{ fontWeight: 800 }}>
                  ● LIVE FOR STUDENTS
                </span>
              ) : (
                <span className="badge badge-warning">SAVED IN DRAFT</span>
              )}
            </div>

            {onTestCreated && (
              <button
                type="button"
                onClick={onTestCreated}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Go to Previous Tests <ChevronRight size={14} />
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>
            Students can now log in and take this test using these credentials:
          </p>

          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1.5px solid #bfdbfe',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  ASSESSMENT TITLE
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                  {createdTestInfo.title} ({createdTestInfo.qCount} Questions)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  TEST ID / CODE
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e3a8a', fontSize: '1.1rem' }}>
                  {createdTestInfo.testIdCode}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  TEST PASSWORD
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', fontSize: '1.1rem' }}>
                  {createdTestInfo.testPassword}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const info = `Assessment: ${createdTestInfo.title}\nTest ID: ${createdTestInfo.testIdCode}\nPassword: ${createdTestInfo.testPassword}`;
                navigator.clipboard.writeText(info);
                alert(`Copied Credentials to Clipboard:\nTest ID: ${createdTestInfo.testIdCode}\nPassword: ${createdTestInfo.testPassword}`);
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, padding: '0.45rem 1rem', background: '#f8fafc' }}
            >
              Copy ID & Password for Students
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: TEST CONFIGURATION & TIMING */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
            1
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Test Configuration & Timing
          </h3>
        </div>

        {/* Basic Title and Timing */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Test Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. ITPL Campus Recruitment Aptitude Assessment"
              className="form-control"
              value={testDetails.title}
              onChange={(e) => setTestDetails({ ...testDetails, title: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Category</label>
            <input
              type="text"
              placeholder="Aptitude / Technical"
              className="form-control"
              value={testDetails.category}
              onChange={(e) => setTestDetails({ ...testDetails, category: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Duration (Minutes) *</label>
            <div style={{ position: 'relative' }}>
              <Clock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="number"
                min="5"
                max="300"
                required
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
                value={testDetails.durationMinutes}
                onChange={(e) => setTestDetails({ ...testDetails, durationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Total Marks *</label>
            <div style={{ position: 'relative' }}>
              <Award size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
                className="form-control"
                style={{ paddingLeft: '2.4rem' }}
                value={testDetails.totalMarks}
                onChange={(e) => setTestDetails({ ...testDetails, totalMarks: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* 3 OPTIONS FOR ID, PASSWORD, START TEST */}
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #93c5fd',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)'
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.925rem', color: '#1e3a8a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} color="#2563eb" />
            <span>Test Access Credentials & Launch Controls</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* OPTION 1: CREATE THE ID (MANUAL ONLY) */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ color: '#0f172a', fontWeight: 800, marginBottom: '6px' }}>
                Create Test ID *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Test ID (e.g. ITPL-TEST-01)"
                className="form-control"
                style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                value={testDetails.testIdCode}
                onChange={(e) => setTestDetails({ ...testDetails, testIdCode: e.target.value })}
              />
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Admin creates unique Test ID for candidate login
              </div>
            </div>

            {/* OPTION 2: CREATE PASSWORD (MANUAL ONLY) */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ color: '#0f172a', fontWeight: 800, marginBottom: '6px' }}>
                Create Test Password *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Test Password (e.g. Exam@Pass2026)"
                className="form-control"
                style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                value={testDetails.testPassword}
                onChange={(e) => setTestDetails({ ...testDetails, testPassword: e.target.value })}
              />
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Admin creates Examination Password for candidate login
              </div>
            </div>

            {/* OPTION 3: START THE TEST */}
            <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ color: '#0f172a', fontWeight: 800, marginBottom: '6px' }}>
                Start the Test Status *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTestDetails({ ...testDetails, startTestNow: true })}
                  className={`btn btn-sm ${testDetails.startTestNow ? 'btn-success' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, padding: '0.45rem 0.5rem' }}
                >
                  <Play size={13} /> Start Test Now (Live)
                </button>
                <button
                  type="button"
                  onClick={() => setTestDetails({ ...testDetails, startTestNow: false })}
                  className={`btn btn-sm ${!testDetails.startTestNow ? 'btn-warning' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, padding: '0.45rem 0.5rem' }}
                >
                  <Lock size={13} /> Hold / Draft
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: testDetails.startTestNow ? '#059669' : '#d97706', fontWeight: 700, display: 'block' }}>
                {testDetails.startTestNow ? '🟢 Test starts immediately (Active for Students)' : '🟡 Test kept in draft (Admin starts later)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: ADD QUESTIONS TO THIS TEST */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
              2
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Add Questions to Test
            </h3>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setAddMode('pdf')}
              className={`btn btn-sm ${addMode === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <Upload size={14} /> Upload PDF / PPT / Paste
            </button>
            <button
              type="button"
              onClick={() => setAddMode('manual')}
              className={`btn btn-sm ${addMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <Plus size={14} /> Add Question Manually
            </button>
          </div>
        </div>

        {/* OPTION A: UPLOAD / PASTE FROM PDF OR PPT */}
        {addMode === 'pdf' && (
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
            {/* Real File Input for PDF */}
            <div style={{
              background: '#ffffff',
              border: '2px dashed #3b82f6',
              borderRadius: '10px',
              padding: '1.5rem',
              textAlign: 'center',
              marginBottom: '1rem',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf, .ppt, .pptx, .txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="pdfUploadInput"
              />
              <label htmlFor="pdfUploadInput" style={{ cursor: 'pointer', display: 'block' }}>
                <FileUp size={36} color="#2563eb" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a', marginBottom: '4px' }}>
                  Click to Browse & Select PDF File (.pdf)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Supports PDF document with multiple MCQ questions and answers
                </div>
              </label>

              {isReadingFile && (
                <div style={{ marginTop: '0.75rem', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem' }}>
                  ⏳ Extracting questions from PDF... Please wait.
                </div>
              )}

              {uploadedFileName && !isReadingFile && (
                <div style={{ marginTop: '0.75rem', color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
                  ✓ Selected File: {uploadedFileName}
                </div>
              )}
            </div>

            {/* Quick Helper / Paste Alternative */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Or Paste Question Text Directly:
              </span>
              <button
                type="button"
                onClick={handleLoadSamplePdfQuestions}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              >
                <Sparkles size={12} color="#2563eb" /> Load Sample PDF Questions (4 MCQs)
              </button>
            </div>

            <textarea
              className="form-control"
              style={{ minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '0.825rem', marginBottom: '0.75rem' }}
              placeholder={`Paste questions here...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />

            <button
              type="button"
              onClick={() => autoOrganizeText(rawText)}
              disabled={isReadingFile || !rawText.trim()}
              className="btn btn-primary btn-sm"
            >
              <Sparkles size={14} /> Organize & Add Questions to Test
            </button>
          </div>
        )}

        {/* OPTION B: ADD QUESTION MANUALLY */}
        {addMode === 'manual' && (
          <form onSubmit={handleAddManualQuestion} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div className="form-group">
              <label className="form-label">Question Text *</label>
              <textarea
                required
                className="form-control"
                placeholder="Enter question statement..."
                value={manualQ.questionText}
                onChange={(e) => setManualQ({ ...manualQ, questionText: e.target.value })}
              />
            </div>

            {/* Code Snippet Toggle */}
            <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code size={16} color="#2563eb" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Contains Code Snippet?
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={manualQ.hasCode}
                  onChange={(e) => setManualQ({ ...manualQ, hasCode: e.target.checked })}
                />
              </div>

              {manualQ.hasCode && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Language:</span>
                    <select
                      className="form-control"
                      style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      value={manualQ.codeLanguage}
                      onChange={(e) => setManualQ({ ...manualQ, codeLanguage: e.target.value })}
                    >
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: '#0d1117', color: '#58a6ff' }}
                    placeholder={`// Enter ${manualQ.codeLanguage} code here...`}
                    value={manualQ.codeContent}
                    onChange={(e) => setManualQ({ ...manualQ, codeContent: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                type="text"
                required
                placeholder="Option A *"
                className="form-control"
                value={manualQ.optionA}
                onChange={(e) => setManualQ({ ...manualQ, optionA: e.target.value })}
              />
              <input
                type="text"
                required
                placeholder="Option B *"
                className="form-control"
                value={manualQ.optionB}
                onChange={(e) => setManualQ({ ...manualQ, optionB: e.target.value })}
              />
              <input
                type="text"
                placeholder="Option C"
                className="form-control"
                value={manualQ.optionC}
                onChange={(e) => setManualQ({ ...manualQ, optionC: e.target.value })}
              />
              <input
                type="text"
                placeholder="Option D"
                className="form-control"
                value={manualQ.optionD}
                onChange={(e) => setManualQ({ ...manualQ, optionD: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Correct Answer:</span>
                <select
                  className="form-control"
                  style={{ width: '80px' }}
                  value={manualQ.correctOption}
                  onChange={(e) => setManualQ({ ...manualQ, correctOption: e.target.value })}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <button type="submit" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
                <Plus size={14} /> Add Question to List
              </button>
            </div>
          </form>
        )}
      </div>

      {/* STEP 3: QUESTIONS ADDED TO THIS NEW TEST ONLY */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e3a8a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
              3
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Questions for This Assessment ({testQuestions.length})
            </h3>
          </div>

          <span className="badge badge-primary">
            Total Marks: {testQuestions.reduce((acc, q) => acc + (parseInt(q.marks) || 2), 0)} Pts
          </span>
        </div>

        {testQuestions.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <BookOpen size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>No questions added to this test yet.</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              Click the file upload button above to pick a PDF or use the sample questions button.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {testQuestions.map((q, idx) => (
              <div key={q.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', flex: 1, paddingRight: '1rem' }}>
                    {idx + 1}. {q.questionText}
                  </div>

                  {/* EDIT AND DELETE BUTTONS */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                      {q.marks || 2} Marks
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...q })}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff' }}
                      title="Edit question text or choices"
                    >
                      <Edit3 size={13} color="#2563eb" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Remove question"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {q.hasCode && q.codeContent && (
                  <CodeBlock code={q.codeContent} language={q.codeLanguage} />
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', fontSize: '0.825rem', marginTop: '0.75rem' }}>
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: q.correctOption === 'A' ? '#ecfdf5' : '#ffffff', border: q.correctOption === 'A' ? '1.5px solid #10b981' : '1px solid #e2e8f0', color: q.correctOption === 'A' ? '#065f46' : '#334155', fontWeight: q.correctOption === 'A' ? 700 : 400, wordBreak: 'break-word' }}>
                    <strong style={{ color: q.correctOption === 'A' ? '#059669' : '#64748b' }}>A)</strong> {q.optionA} {q.correctOption === 'A' && '✓ (Correct)'}
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: q.correctOption === 'B' ? '#ecfdf5' : '#ffffff', border: q.correctOption === 'B' ? '1.5px solid #10b981' : '1px solid #e2e8f0', color: q.correctOption === 'B' ? '#065f46' : '#334155', fontWeight: q.correctOption === 'B' ? 700 : 400, wordBreak: 'break-word' }}>
                    <strong style={{ color: q.correctOption === 'B' ? '#059669' : '#64748b' }}>B)</strong> {q.optionB} {q.correctOption === 'B' && '✓ (Correct)'}
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: q.correctOption === 'C' ? '#ecfdf5' : '#ffffff', border: q.correctOption === 'C' ? '1.5px solid #10b981' : '1px solid #e2e8f0', color: q.correctOption === 'C' ? '#065f46' : '#334155', fontWeight: q.correctOption === 'C' ? 700 : 400, wordBreak: 'break-word' }}>
                    <strong style={{ color: q.correctOption === 'C' ? '#059669' : '#64748b' }}>C)</strong> {q.optionC} {q.correctOption === 'C' && '✓ (Correct)'}
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: q.correctOption === 'D' ? '#ecfdf5' : '#ffffff', border: q.correctOption === 'D' ? '1.5px solid #10b981' : '1px solid #e2e8f0', color: q.correctOption === 'D' ? '#065f46' : '#334155', fontWeight: q.correctOption === 'D' ? 700 : 400, wordBreak: 'break-word' }}>
                    <strong style={{ color: q.correctOption === 'D' ? '#059669' : '#64748b' }}>D)</strong> {q.optionD} {q.correctOption === 'D' && '✓ (Correct)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Big Action: Save & Launch Assessment with Progress Bar */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
          {saving && (
            <div
              style={{
                marginBottom: '1rem',
                background: '#f8fafc',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '1rem 1.25rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} className="spin" color="#2563eb" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                    {savingStatus || 'Processing Assessment...'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#2563eb',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {savingProgress}%
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${savingProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            {saving && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>
                Saving... {savingProgress}%
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAndPublishTest}
              disabled={saving || testQuestions.length === 0}
              className="btn btn-primary btn-lg"
              style={{ fontWeight: 800, padding: '0.85rem 2rem', minWidth: '240px' }}
            >
              {saving ? `Publishing... ${savingProgress}%` : `Save & Publish Assessment (${testQuestions.length} Questions)`}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* EDIT QUESTION MODAL                                            */}
      {/* ============================================================== */}
      {editingQuestion && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#1e3a8a" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Edit Question Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    required
                    className="form-control"
                    style={{ minHeight: '90px' }}
                    value={editingQuestion.questionText}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                  />
                </div>

                {/* Code Snippet Toggle in Edit */}
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Code size={16} color="#2563eb" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Contains Code Snippet?</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingQuestion.hasCode}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, hasCode: e.target.checked })}
                    />
                  </div>

                  {editingQuestion.hasCode && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Language:</span>
                        <select
                          className="form-control"
                          style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          value={editingQuestion.codeLanguage}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, codeLanguage: e.target.value })}
                        >
                          <option value="c">C</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="sql">SQL</option>
                        </select>
                      </div>
                      <textarea
                        className="form-control"
                        style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: '#0d1117', color: '#58a6ff' }}
                        value={editingQuestion.codeContent}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, codeContent: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* MCQ Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Option A *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editingQuestion.optionA}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionA: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Option B *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editingQuestion.optionB}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionB: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Option C</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingQuestion.optionC}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionC: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Option D</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingQuestion.optionD}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionD: e.target.value })}
                    />
                  </div>
                </div>

                {/* Correct Answer & Marks Selector */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Correct Answer:</span>
                    <select
                      className="form-control"
                      style={{ width: '105px' }}
                      value={editingQuestion.correctOption}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, correctOption: e.target.value })}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Marks:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="form-control"
                      style={{ width: '75px' }}
                      value={editingQuestion.marks || 2}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Check size={14} /> Save Question Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
