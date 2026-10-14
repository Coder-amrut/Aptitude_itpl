import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, ShieldAlert, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, Bookmark, Send, Maximize, Video, Lock,
  ShieldCheck, Play
} from 'lucide-react';
import { CodeBlock } from '../../components/CodeBlock';
import { SecurityWarningModal } from '../../components/SecurityWarningModal';
import { dbService } from '../../services/dbService';

export const SecureTestRoom = ({ test = {}, student = {}, onTestCompleted }) => {
  const safeTest = test || {};
  const safeStudent = student || {};

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [loading, setLoading] = useState(true);

  // 1-MINUTE PRE-EXAM BRIEFING COUNTDOWN SCREEN (AUTO-STARTS AFTER 60 SECONDS)
  const [isBriefing, setIsBriefing] = useState(true);
  const [briefingTime, setBriefingTime] = useState(60);

  // Timer State (configured by Admin)
  const initialTime = Math.max(60, (Number(safeTest.durationMinutes) || 30) * 60);
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const startTimeRef = useRef(new Date().toISOString());

  // Strict Security State
  const [backWarningCount, setBackWarningCount] = useState(0);
  const [windowSwitchCount, setWindowSwitchCount] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [violationsLog, setViolationsLog] = useState([]);
  const [activeModalWarning, setActiveModalWarning] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const isSubmittingRef = useRef(false);
  const windowSwitchCountRef = useRef(0);
  const lastWindowSwitchTimeRef = useRef(0);
  const savedAttemptRef = useRef(null);

  // Request Fullscreen and immediately activate fullscreen state
  const enterFullscreen = useCallback(() => {
    lastWindowSwitchTimeRef.current = Date.now();
    setIsFullscreen(true);
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => setIsFullscreen(true));
      } else if (el.webkitRequestFullscreen && !document.webkitFullscreenElement) {
        el.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } catch (e) {
      setIsFullscreen(true);
    }
  }, []);

  // Start Exam (Manual trigger or Auto-start on 1-min countdown completion)
  const handleStartExam = useCallback(() => {
    setIsBriefing(false);
    startTimeRef.current = new Date().toISOString();
    lastWindowSwitchTimeRef.current = Date.now();
    enterFullscreen();
  }, [enterFullscreen]);

  // 1-Minute Countdown Timer Effect (Starts only AFTER candidate enters fullscreen)
  useEffect(() => {
    if (!isBriefing || loading || !isFullscreen) return;

    const bTimer = setInterval(() => {
      setBriefingTime((prev) => {
        if (prev <= 1) {
          clearInterval(bTimer);
          handleStartExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(bTimer);
  }, [isBriefing, loading, isFullscreen, handleStartExam]);

  // Instant Fast Loading: Pre-load questions and sync with Supabase in background
  useEffect(() => {
    let isMounted = true;
    async function loadTestQuestions() {
      // 1. FAST ZERO-DELAY READ: Check if questions are already available locally
      const localQ = dbService.getLocalQuestions ? dbService.getLocalQuestions() : [];
      const cached = localQ.filter((q) => String(q.testId || '').trim() === String(safeTest?.id || '').trim());

      if (cached.length > 0 && isMounted) {
        setQuestions(cached);
        setLoading(false); // Immediate 0-wait display!
      } else {
        setLoading(true);
      }

      try {
        if (safeStudent?.id && safeTest?.id) {
          dbService.startTestSession(safeStudent, safeTest).catch(() => {});
        }
        if (safeTest?.id) {
          const qList = await dbService.getQuestions(safeTest.id);
          if (isMounted && Array.isArray(qList) && qList.length > 0) {
            setQuestions(qList);
          }
        }
      } catch (err) {
        console.warn('Backend question sync completed with cached data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTestQuestions();

    return () => {
      isMounted = false;
      if (safeStudent?.id && safeTest?.id) {
        dbService.endTestSession(safeStudent.id, safeTest.id);
      }
    };
  }, [safeStudent, safeTest]);

  // Master Submission Function (NO NEGATIVE MARKING FOR ALL TESTS)
  const finalizeSubmission = useCallback(
    async (reason = null, autoSubmitted = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      const endTime = new Date().toISOString();
      const timeSpent = Math.max(1, initialTime - timeRemaining);

      // Score Calculation (NO NEGATIVE MARKING)
      let totalScore = 0;
      let maxScore = 0;
      questions.forEach((q) => {
        const qMarks = q.marks || 2;
        maxScore += qMarks;
        const studentChoice = answers[q.id];
        if (studentChoice && studentChoice === q.correctOption) {
          totalScore += qMarks;
        }
        // STRICT REQUIREMENT: NO NEGATIVE MARKING FOR ALL TESTS
      });

      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      const attemptPayload = {
        testId: safeTest.id || 'unknown',
        studentId: safeStudent.id || 'unknown',
        studentName: safeStudent.fullName || 'Candidate',
        studentRollNo: safeStudent.rollNo || 'PRN',
        startTime: startTimeRef.current,
        endTime,
        timeSpentSeconds: timeSpent,
        status: autoSubmitted ? 'terminated' : 'submitted',
        totalScore,
        maxScore,
        percentage,
        answers,
        violationsCount: totalViolations + (autoSubmitted ? 1 : 0),
        violationsLog,
        autoSubmittedReason: reason
      };

      let savedAttempt = null;
      try {
        savedAttempt = await dbService.submitTestAttempt(attemptPayload);
      } catch (err) {
        console.error('Submission save error:', err);
        savedAttempt = { ...attemptPayload, id: 'temp-' + Date.now() };
      }
      savedAttemptRef.current = savedAttempt;

      // Exit fullscreen if possible
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}

      if (autoSubmitted) {
        // Allow brief visual feedback of termination warning modal before navigation
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (onTestCompleted) {
        onTestCompleted(savedAttempt, safeTest);
      }
    },
    [answers, initialTime, onTestCompleted, questions, safeStudent, safeTest, timeRemaining, totalViolations, violationsLog]
  );

  // Examination Timer Tick (Only runs AFTER briefing is completed)
  useEffect(() => {
    if (loading || isBriefing || isTerminated) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeSubmission('Time limit expired (00:00 reached)', true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isBriefing, isTerminated, finalizeSubmission]);

  // ----------------------------------------------------
  // LOGGING SECURITY VIOLATIONS
  // ----------------------------------------------------
  const recordViolation = useCallback(
    async (type, details) => {
      const logEntry = {
        type,
        message: details,
        timestamp: new Date().toISOString()
      };

      setViolationsLog((prev) => [...prev, logEntry]);
      setTotalViolations((prev) => prev + 1);

      try {
        if (safeTest?.id && safeStudent?.id) {
          await dbService.logProctorViolation({
            testId: safeTest.id,
            studentId: safeStudent.id,
            studentRollNo: safeStudent.rollNo,
            studentName: safeStudent.fullName,
            eventType: type,
            details
          });
        }
      } catch (err) {
        console.warn('Failed to record violation:', err);
      }
    },
    [safeStudent, safeTest]
  );

  // ----------------------------------------------------
  // REQUIREMENT: BROWSER BACK BUTTON LOCKDOWN & 2-WARNING TRAP
  // "do not allowed back with completing or end of test"
  // "back button if they press give 2 time warnign if user goes back auto submit the test"
  // ----------------------------------------------------
  useEffect(() => {
    // Push dummy states so user cannot immediately leave
    for (let i = 0; i < 5; i++) {
      window.history.pushState({ proctored: true, step: i }, '', window.location.href);
    }

    const handlePopState = (e) => {
      e.preventDefault();
      // Re-push states so URL never navigates away
      for (let i = 0; i < 3; i++) {
        window.history.pushState({ proctored: true, step: i }, '', window.location.href);
      }

      setBackWarningCount((prevCount) => {
        const newCount = prevCount + 1;
        recordViolation('back_button_pressed', `Browser back navigation attempted (Warning strike ${newCount})`);

        if (newCount === 1) {
          setActiveModalWarning({
            strike: 1,
            max: 2,
            reason: 'Browser Back Navigation Blocked! You cannot leave or go back without completing and submitting the assessment.',
            terminated: false
          });
        } else if (newCount === 2) {
          setActiveModalWarning({
            strike: 2,
            max: 2,
            reason: 'FINAL WARNING! Back button pressed a second time. Any further back navigation will permanently lock and auto-submit your exam!',
            terminated: false
          });
        } else {
          // Exceeded 2 warnings -> Auto Submit!
          setIsTerminated(true);
          setTerminationReason('Terminated due to exceeding maximum browser back navigation warnings (3 attempts)');
          setActiveModalWarning({
            strike: 3,
            max: 2,
            reason: 'Exceeded maximum permitted browser back navigation limit! Your test has been terminated and submitted.',
            terminated: true
          });
          finalizeSubmission('Terminated: Repeated back navigation attempts without completion', true);
        }

        return newCount;
      });
    };

    window.addEventListener('popstate', handlePopState);

    const handleBeforeUnload = (e) => {
      if (!isSubmittingRef.current) {
        recordViolation('beforeunload', 'User attempted to close tab or reload browser window');
        e.preventDefault();
        e.returnValue = 'Warning: You cannot leave without completing or submitting the test!';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [finalizeSubmission, recordViolation]);

  // ----------------------------------------------------
  // REQUIREMENT: NO COPY & PASTE (CTRL+C & CTRL+V BLOCKED) + KEYBOARD NAVIGATION BLOCKED
  // ----------------------------------------------------
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      recordViolation('copy_paste_attempt', 'Clipboard COPY action blocked (Ctrl+C disabled)');
      setActiveModalWarning({
        strike: 1,
        max: 2,
        reason: 'Copying assessment text is strictly prohibited! Clipboard event blocked.',
        terminated: false
      });
    };

    const handlePaste = (e) => {
      e.preventDefault();
      recordViolation('copy_paste_attempt', 'Clipboard PASTE action blocked (Ctrl+V disabled)');
      setActiveModalWarning({
        strike: 1,
        max: 2,
        reason: 'Pasting external content is strictly prohibited! Clipboard event blocked.',
        terminated: false
      });
    };

    const handleCut = (e) => {
      e.preventDefault();
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // 1. Block Backspace when not actively typing in an input
      if (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 2. Block Alt+Left / BrowserBack navigation
      if ((e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left')) || e.key === 'BrowserBack') {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('back_button_pressed', 'Keyboard Back navigation shortcut attempted (Alt+Left)');
        setActiveModalWarning({
          strike: 1,
          max: 2,
          reason: 'Back navigation is disabled! You cannot leave without completing and submitting the assessment.',
          terminated: false
        });
        return;
      }

      // 3. Block Reload & Tab Close shortcuts
      if (
        e.key === 'F5' ||
        (isCtrlOrMeta && (e.key === 'r' || e.key === 'R')) ||
        (isCtrlOrMeta && (e.key === 'w' || e.key === 'W'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        setActiveModalWarning({
          strike: 1,
          max: 2,
          reason: 'Page reloading and closing are disabled during active examination!',
          terminated: false
        });
        return;
      }

      // 4. Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+U, F12, Ctrl+Shift+I
      if (
        (isCtrlOrMeta && (e.key === 'c' || e.key === 'C')) ||
        (isCtrlOrMeta && (e.key === 'v' || e.key === 'V')) ||
        (isCtrlOrMeta && (e.key === 'x' || e.key === 'X')) ||
        (isCtrlOrMeta && (e.key === 'u' || e.key === 'U')) ||
        (isCtrlOrMeta && (e.key === 'a' || e.key === 'A')) ||
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && (e.key === 'I' || e.key === 'i'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('shortcut_blocked', `Forbidden keyboard shortcut attempted: ${e.key}`);
        setActiveModalWarning({
          strike: 1,
          max: 2,
          reason: `Keyboard shortcut [${isCtrlOrMeta ? 'Ctrl+' : ''}${e.key}] is disabled for exam integrity!`,
          terminated: false
        });
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [recordViolation]);

  // ----------------------------------------------------
  // TAB & WINDOW SWITCH MONITORING (2 STRIKES = AUTO SUBMIT)
  // "When user switch the window 2 time then auto submit the test"
  // ----------------------------------------------------
  const handleWindowSwitchDetected = useCallback(
    (triggerSource) => {
      // Ignore during briefing, if already submitting, or already terminated
      if (isBriefing || isSubmittingRef.current || isTerminated) return;

      const now = Date.now();
      // Debounce consecutive blur/visibilitychange events within 1.5 seconds
      if (now - lastWindowSwitchTimeRef.current < 1500) {
        return;
      }
      lastWindowSwitchTimeRef.current = now;

      windowSwitchCountRef.current += 1;
      const currentStrike = windowSwitchCountRef.current;
      setWindowSwitchCount(currentStrike);

      if (currentStrike === 1) {
        recordViolation('window_switch', `Candidate switched window/tab (Strike 1 of 2: Warning issued via ${triggerSource})`);
        setActiveModalWarning({
          strike: 1,
          max: 2,
          reason: 'WINDOW SWITCH DETECTED (Strike 1 of 2): You switched away from the exam. If you switch the window or tab one more time, your test will be permanently locked and AUTO-SUBMITTED immediately!',
          terminated: false
        });
      } else if (currentStrike >= 2) {
        recordViolation('window_switch', `Candidate switched window/tab for the 2nd time (Strike 2 of 2: AUTO SUBMIT TRIGGERED via ${triggerSource})`);
        setIsTerminated(true);
        setTerminationReason('Terminated and auto-submitted: Candidate switched window 2 times.');
        setActiveModalWarning({
          strike: 2,
          max: 2,
          reason: 'WINDOW SWITCH LIMIT EXCEEDED (Strike 2 of 2): You switched the window 2 times. As per strict proctor regulations, your exam has been terminated and auto-submitted.',
          terminated: true
        });
        finalizeSubmission('Auto-submitted: Candidate switched window 2 times', true);
      }
    },
    [isBriefing, isTerminated, recordViolation, finalizeSubmission]
  );

  // Dedicated Fullscreen Change Listener (Always Active, During Briefing & Exam)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFull);
      if (!inFull && !isBriefing && !isSubmittingRef.current) {
        recordViolation('fullscreen_exit', 'Candidate exited mandatory Fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isBriefing, recordViolation]);

  // Tab & Window Switch Listeners (Only active during actual exam, not during briefing)
  useEffect(() => {
    if (isBriefing) return;

    const handleVisibility = () => {
      if (document.hidden) {
        handleWindowSwitchDetected('Tab switch or minimized window');
      }
    };

    const handleWindowBlur = () => {
      handleWindowSwitchDetected('Window focus lost / application switch');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isBriefing, handleWindowSwitchDetected]);

  // Format Time Remaining
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx] || null;

  const handleSelectOption = (opt) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: opt
    }));
  };

  const handleClearAnswer = () => {
    if (!currentQ) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleToggleReview = () => {
    if (!currentQ) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id]
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', padding: '2rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite', marginBottom: '1.25rem' }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
          Preparing Secure Examination Room
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Loading question bank and connecting to assessment server...
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 1: MANDATORY FULL-SCREEN ACTIVATION SCREEN
  // Candidate must activate Fullscreen to begin countdown & assessment
  // ----------------------------------------------------
  if (!isFullscreen) {
    return (
      <div
        className="fade-in"
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 2vw, 1.5rem)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <img
            src="/logo.png"
            alt="Infoyashonand Technology Logo"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              objectFit: 'contain',
              marginBottom: '1rem',
              boxShadow: '0 3px 12px rgba(0,0,0,0.08)',
              border: '1.5px solid #e2e8f0'
            }}
          />

          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Maximize size={28} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
            Full-Screen Mode Required
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            To ensure proctoring security and exam integrity, <strong>{safeTest.title || 'the assessment'}</strong> must be taken in full-screen mode.
          </p>

          <div
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: '#475569',
              textAlign: 'left'
            }}
          >
            <div style={{ marginBottom: '0.35rem' }}>
              Candidate: <strong style={{ color: '#0f172a' }}>{safeStudent.fullName || 'Candidate'}</strong>
            </div>
            <div style={{ marginBottom: '0.35rem' }}>
              PRN Number: <strong style={{ color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>{safeStudent.rollNo || 'N/A'}</strong>
            </div>
            <div>
              Assessment: <strong style={{ color: '#0f172a' }}>{safeTest.title || 'Institutional Assessment'}</strong>
            </div>
          </div>

          <button
            onClick={enterFullscreen}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              fontWeight: 800,
              fontSize: '1rem',
              padding: '0.85rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              cursor: 'pointer'
            }}
          >
            <Maximize size={18} /> Enable Full-Screen & Start Countdown
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 2: 1-MINUTE PRE-EXAMINATION RULES & COUNTDOWN SCREEN
  // Auto-starts after 1 minute (60s) countdown completes
  // Pure white background & high contrast rules layout
  // ----------------------------------------------------
  if (isBriefing) {
    return (
      <div
        className="fade-in"
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 2.5vw, 1.5rem)',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <img
              src="/logo.png"
              alt="Infoyashonand Technology Logo"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'contain',
                margin: '0 auto 0.75rem',
                display: 'block',
                background: '#ffffff',
                boxShadow: '0 3px 12px rgba(0,0,0,0.08)',
                border: '1.5px solid #e2e8f0'
              }}
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '0.35rem 1rem',
              borderRadius: '999px',
              color: '#1e40af',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.6rem'
            }}>
              <ShieldCheck size={16} color="#2563eb" /> Candidate Assessment Desk • Rules & Instructions
            </div>

            <h1 style={{
              fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '0.35rem',
              lineHeight: 1.3
            }}>
              {safeTest.title || 'Institutional Assessment'}
            </h1>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              padding: '0.4rem 1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              color: '#475569',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span>Candidate: <strong style={{ color: '#0f172a' }}>{safeStudent.fullName || 'Candidate'}</strong></span>
              <span>•</span>
              <span>PRN: <strong style={{ color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>{safeStudent.rollNo || 'N/A'}</strong></span>
            </div>
          </div>

          {/* 1-Minute Live Countdown Box on Crisp White Card */}
          <div style={{
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#1e3a8a',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem'
            }}>
              Assessment Will Automatically Start In
            </div>

            <div style={{
              fontSize: 'clamp(2.5rem, 7vw, 3.5rem)',
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              color: briefingTime <= 10 ? '#dc2626' : '#1e3a8a',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              marginBottom: '0.4rem'
            }}>
              00:{String(briefingTime).padStart(2, '0')}
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>
              Please review all examination guidelines below. When the 1-minute countdown reaches 00:00, your test will start automatically.
            </p>
          </div>

          {/* 4 Crucial Examination Rules Grid on White / Light-Tint Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {/* Rule 1: NO NEGATIVE MARKING */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#065f46' }}>
                  1. NO NEGATIVE MARKING (0.00)
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.5 }}>
                There is <strong>no negative marking</strong> for this examination. 0 marks deducted for wrong answers. Attempt every question without penalty!
              </div>
            </div>

            {/* Rule 2: NO COPY & PASTE */}
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <ShieldAlert size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#991b1b' }}>
                  2. NO COPY & PASTE (Anti-Cheat Active)
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.5 }}>
                Text selection, right-click context menu, clipboard shortcuts (Ctrl+C / Ctrl+V), and inspect developer tools are strictly disabled.
              </div>
            </div>

            {/* Rule 3: WINDOW SWITCH & TAB RESTRICTION */}
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400e' }}>
                  3. WINDOW SWITCH (2 Strikes = Auto-Submit)
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                Switching browser tabs or minimizing the window more than once triggers an instant <strong>AUTO-SUBMIT</strong>. 1st switch gives a warning, 2nd switch terminates & auto-submits!
              </div>
            </div>

            {/* Rule 4: MANDATORY FULLSCREEN & TIMER */}
            <div style={{
              background: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Clock size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e40af' }}>
                  4. FULLSCREEN & TIMER ({safeTest.durationMinutes || 30} Mins)
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5 }}>
                Mandatory fullscreen mode is enforced during the test. When the duration timer reaches 00:00, all answered questions are automatically saved and submitted.
              </div>
            </div>
          </div>

          {/* Test Metadata Strip on White Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '0.75rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>DURATION</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{safeTest.durationMinutes || 30} Minutes</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>TOTAL QUESTIONS</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{questions.length || '—'} MCQs</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>MAX MARKS</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{safeTest.totalMarks || (questions.length * 2)} Points</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>NEGATIVE MARKING</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>None (0.00)</div>
            </div>
          </div>

          {/* Direct Start Action Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleStartExam}
              className="btn btn-success btn-lg"
              style={{
                fontWeight: 800,
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                padding: '0.9rem clamp(1.5rem, 4vw, 2.75rem)',
                width: '100%',
                maxWidth: '440px',
                background: '#16a34a',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                cursor: 'pointer'
              }}
            >
              <Play size={18} fill="#ffffff" /> I Have Read the Rules — Start Exam Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="unselectable"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* MANDATORY FULLSCREEN LOCKDOWN OVERLAY DURING EXAM */}
      {!isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.97)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              width: '100%',
              background: '#1e293b',
              border: '2px solid #3b82f6',
              borderRadius: '24px',
              padding: '2.5rem 2rem',
              boxShadow: '0 0 60px rgba(59, 130, 246, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <Maximize size={34} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.6rem' }}>
              Full-Screen Mode Required
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              This proctored assessment requires uninterrupted full-screen mode. Back navigation and window minimization are strictly prohibited. You cannot continue the test until full screen is restored.
            </p>

            <button
              onClick={() => {
                enterFullscreen();
                setIsFullscreen(true);
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.9rem 2.25rem',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.5)'
              }}
            >
              <Maximize size={20} /> Click to Enter Full-Screen Mode
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Security Anti-Screenshot Watermark */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 999,
          opacity: 0.035,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          alignItems: 'center',
          justifyItems: 'center',
          transform: 'rotate(-25deg)',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#000000',
          userSelect: 'none'
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            {safeStudent.rollNo || 'PRN'} • {safeStudent.fullName || 'Candidate'} • PROCTOR SECURED
          </div>
        ))}
      </div>

      {/* Top Test Header Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1.5px solid #e2e8f0',
          padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 2.5vw, 1.5rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: '1 1 240px' }}>
          <img
            src="/logo.png"
            alt="Infoyashonand Logo"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              flexShrink: 0
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 'clamp(0.825rem, 2vw, 1rem)', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {safeTest.title || 'Institutional Assessment'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                Candidate: <strong>{safeStudent.fullName || 'Candidate'}</strong> ({safeStudent.rollNo || 'PRN'})
              </span>
              <span style={{ color: '#2563eb', fontWeight: 600 }}>Infoyashonand</span>
            </div>
          </div>
        </div>

        {/* Center: Live Countdown Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: timeRemaining < 300 ? '#fef2f2' : '#eff6ff',
            border: timeRemaining < 300 ? '1.5px solid #ef4444' : '1.5px solid #3b82f6',
            color: timeRemaining < 300 ? '#dc2626' : '#1e3a8a',
            padding: '0.35rem 0.95rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: 800,
            fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <Clock size={18} className={timeRemaining < 300 ? 'blink' : ''} />
          <span>{formatTimer(timeRemaining)}</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b' }}>
            Left
          </span>
        </div>

        {/* Right Action: Fullscreen Toggle & Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isFullscreen && (
            <button onClick={enterFullscreen} className="btn btn-warning btn-sm" style={{ fontSize: '0.75rem' }}>
              <Maximize size={14} /> Fullscreen
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className="proctor-active-badge">
              <span className="proctor-dot" /> PROCTOR ON
            </span>
            {windowSwitchCount > 0 && (
              <span className="badge badge-danger" style={{ background: '#ef4444', color: '#ffffff', fontWeight: 700 }} title="Switching window 2 times auto-submits your test">
                Switches: {windowSwitchCount}/2
              </span>
            )}
            {totalViolations > 0 && (
              <span className="badge badge-danger">
                Strikes: {totalViolations}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="btn btn-success btn-sm"
            style={{ fontWeight: 700 }}
          >
            <Send size={14} /> Submit
          </button>
        </div>
      </header>

      {/* Main Examination Layout: Split Question Area + Sidebar */}
      <div style={{ display: 'flex', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: 'clamp(0.6rem, 2vw, 1.25rem)', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left / Center: Question Card */}
        <div style={{ flex: '1 1 500px', minWidth: 'min(100%, 300px)', display: 'flex', flexDirection: 'column' }}>
          {currentQ ? (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'clamp(1rem, 2.5vw, 1.75rem)', position: 'relative' }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    {currentIdx + 1}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="badge badge-neutral">+{currentQ.marks || 2} Marks</span>
                </div>

                <button
                  onClick={handleToggleReview}
                  className={`btn btn-sm ${markedForReview[currentQ.id] ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.78rem' }}
                >
                  <Bookmark size={13} />
                  {markedForReview[currentQ.id] ? 'Marked' : 'Mark for Review'}
                </button>
              </div>

              {/* Question Text */}
              <div style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)', fontWeight: 600, color: '#0f172a', lineHeight: 1.6, marginBottom: '1rem', wordBreak: 'break-word' }}>
                {currentQ.questionText}
              </div>

              {/* REQUIREMENT: Dedicated space for code if question has code */}
              {currentQ.hasCode && currentQ.codeContent && (
                <div style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
                  <CodeBlock
                    code={currentQ.codeContent}
                    language={currentQ.codeLanguage}
                    allowCopy={false} // Copy disabled for security
                  />
                </div>
              )}

              {/* MCQ Options Choices */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem', marginBottom: '1.75rem' }}>
                {['A', 'B', 'C', 'D'].map((opt) => {
                  const optText = currentQ[`option${opt}`];
                  if (!optText) return null;
                  const isSelected = answers[currentQ.id] === opt;

                  return (
                    <label
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.85rem, 2.5vw, 1.25rem)',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 1px #2563eb' : 'none',
                        minHeight: '46px',
                        wordBreak: 'break-word'
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectOption(opt)}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isSelected ? '#2563eb' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}>
                        {opt}
                      </span>
                      <span style={{ fontSize: '0.925rem', color: isSelected ? '#1e3a8a' : '#1e293b', fontWeight: isSelected ? 600 : 400 }}>
                        {optText}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Bottom Control Bar */}
              <div style={{
                marginTop: 'auto',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <button
                  onClick={handleClearAnswer}
                  className="btn btn-secondary btn-sm"
                  disabled={!answers[currentQ.id]}
                  style={{ color: '#64748b' }}
                >
                  Clear Response
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                    disabled={currentIdx === 0}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIdx(currentIdx + 1)}
                      className="btn btn-primary btn-sm"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConfirmSubmit(true)}
                      className="btn btn-success btn-sm"
                    >
                      Review & Submit <Send size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              No questions found for this assessment.
            </div>
          )}
        </div>

        {/* Right Sidebar: Session Status + Question Navigation Palette */}
        <aside style={{ width: '100%', maxWidth: '320px', flex: '1 1 270px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Assessment Session Status Card (No Camera Recording) */}
          <div className="card" style={{ padding: '0.85rem 1rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>Assessment Session</div>
                <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Environment Active
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div>Candidate: <strong>{safeStudent.fullName || 'Candidate'}</strong></div>
              <div style={{ fontFamily: 'var(--font-mono)', marginTop: '2px' }}>PRN: <strong>{safeStudent.rollNo || 'N/A'}</strong></div>
            </div>
          </div>

          {/* Question Palette Grid */}
          <div className="card" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.65rem' }}>
              Question Palette
            </div>

            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                Answered ({Object.keys(answers).length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                Review ({Object.values(markedForReview).filter(Boolean).length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                Unanswered ({questions.length - Object.keys(answers).length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
                Active
              </div>
            </div>

            {/* Bubble Numbers (Responsive auto-fill grid) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                gap: '0.45rem',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '2px'
              }}
            >
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isReview = Boolean(markedForReview[q.id]);
                const isCurrent = currentIdx === idx;

                let bg = '#ffffff';
                let color = '#475569';
                let border = '1px solid #cbd5e1';

                if (isAnswered) {
                  bg = '#10b981';
                  color = '#ffffff';
                  border = '1px solid #059669';
                } else if (isReview) {
                  bg = '#8b5cf6';
                  color = '#ffffff';
                  border = '1px solid #7c3aed';
                }

                if (isCurrent) {
                  border = '2px solid #1e3a8a';
                  if (!isAnswered && !isReview) {
                    bg = '#eff6ff';
                    color = '#1e3a8a';
                  }
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border,
                      background: bg,
                      color,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '0.85rem' }}>
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.825rem' }}
              >
                Submit Exam
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* CONFIRMATION SUBMISSION MODAL */}
      {showConfirmSubmit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Confirm Test Submission</h3>
              <button onClick={() => setShowConfirmSubmit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem' }}>
                Are you sure you want to finish and submit your test? Once submitted, you cannot modify your answers.
              </p>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ANSWERED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    {Object.keys(answers).length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UNANSWERED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
                    {questions.length - Object.keys(answers).length}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowConfirmSubmit(false)} className="btn btn-secondary btn-sm">
                Return to Test
              </button>
              <button onClick={() => finalizeSubmission('Candidate submitted voluntarily', false)} className="btn btn-success btn-sm">
                Yes, Submit Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCTOR SECURITY WARNING MODAL (Window switch 2 strikes + Back navigation Auto-submit) */}
      <SecurityWarningModal
        isOpen={Boolean(activeModalWarning)}
        warningCount={activeModalWarning?.strike || 1}
        maxWarnings={2}
        violationReason={activeModalWarning?.reason}
        isTerminated={activeModalWarning?.terminated}
        onAcknowledge={() => {
          if (activeModalWarning?.terminated) {
            if (savedAttemptRef.current && onTestCompleted) {
              onTestCompleted(savedAttemptRef.current, safeTest);
            } else {
              finalizeSubmission(terminationReason || 'Terminated due to multiple proctor violations', true);
            }
          } else {
            setActiveModalWarning(null);
            lastWindowSwitchTimeRef.current = Date.now();
            enterFullscreen();
          }
        }}
      />
    </div>
  );
};
