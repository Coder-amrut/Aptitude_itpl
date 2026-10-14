import { getSupabaseClient } from './supabase';

// UUID Helper to guarantee PostgreSQL uuid compatibility
const isUUID = (str) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

const toUUID = (id) => {
  if (isUUID(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Fast timeout wrapper to prevent slow network/DNS from freezing frontend UI
const withTimeout = (promise, ms = 3200) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))
  ]);

export const dbService = {
  // ----------------------------------------------------
  // ADMIN AUTHENTICATION
  // ----------------------------------------------------
  async adminLogin(email, password) {
    const cleanId = (email || '').trim().toLowerCase();
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .ilike('email', cleanId)
          .eq('password', password)
          .single();

        if (!error && data) {
          return {
            success: true,
            admin: {
              id: data.id,
              email: data.email,
              fullName: data.full_name,
              role: data.role || 'Admin'
            }
          };
        }
      } catch (err) {
        console.warn('Supabase admin login error:', err);
      }
    }

    // Standard credential check
    if (cleanId === 'adminitpl#01' && password === 'Amrut_01') {
      return {
        success: true,
        admin: {
          id: 'dec6e13f-f932-4c71-bcbe-fcff18ad6f2e',
          email: 'adminitpl#01',
          fullName: 'System Administrator (ITPL)',
          role: 'Placement Admin'
        }
      };
    }

    return { success: false, message: 'Invalid Admin ID or Password.' };
  },

  // ----------------------------------------------------
  // ----------------------------------------------------
  // STUDENT AUTHENTICATION
  // ----------------------------------------------------
  // AUTHENTICATE CANDIDATE BY PRN NUMBER & NAME
  // & AUTOMATICALLY SAVE/UPDATE TO DB
  // ----------------------------------------------------
  async studentLogin(identifier, fullName = '') {
    const cleanId = (identifier || '').trim().toUpperCase();
    const cleanName = (fullName || '').trim();

    if (!cleanId) {
      return { success: false, message: 'PRN Number is required.' };
    }

    try {
      const student = await this.saveOrUpdateCandidate({
        rollNo: cleanId,
        fullName: cleanName || 'Candidate'
      });

      return {
        success: true,
        student
      };
    } catch (err) {
      console.warn('Student login error:', err);
      return {
        success: false,
        message: err.message || 'Login failed.'
      };
    }
  },

  // ----------------------------------------------------
  // SAVE OR UPDATE CANDIDATE IN DATABASE (SUPABASE + LOCAL)
  // ----------------------------------------------------
  async saveOrUpdateCandidate({ rollNo, fullName, branch = '', batch = '' }) {
    const cleanRoll = (rollNo || '').trim().toUpperCase();
    const cleanName = (fullName || '').trim() || 'Candidate';

    if (!cleanRoll) {
      throw new Error('PRN Number is required.');
    }

    const supabase = getSupabaseClient();
    let savedStudent = null;

    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('students')
          .select('*')
          .ilike('roll_no', cleanRoll)
          .maybeSingle();

        if (existing) {
          if (cleanName && cleanName !== 'Candidate' && existing.full_name !== cleanName) {
            await supabase
              .from('students')
              .update({ full_name: cleanName })
              .eq('id', existing.id);
            existing.full_name = cleanName;
          }
          savedStudent = {
            id: existing.id,
            rollNo: existing.roll_no,
            fullName: existing.full_name || cleanName,
            branch: existing.branch || branch || 'Engineering / General',
            batch: existing.batch || batch || 'Batch 2026',
            marks: existing.marks ?? null
          };
        } else {
          const newId = toUUID();
          // Send only valid columns that exist in the students table
          const insertPayload = {
            id: newId,
            roll_no: cleanRoll,
            full_name: cleanName,
            password: 'student@2026'
          };

          const { data: inserted, error: insertError } = await supabase
            .from('students')
            .insert(insertPayload)
            .select()
            .maybeSingle();

          if (insertError) {
            console.warn('Supabase candidate save warning:', insertError);
          }

          if (inserted) {
            savedStudent = {
              id: inserted.id,
              rollNo: inserted.roll_no,
              fullName: inserted.full_name,
              branch: branch || 'Engineering / General',
              batch: batch || 'Batch 2026',
              marks: inserted.marks ?? null
            };
          } else {
            savedStudent = {
              id: newId,
              rollNo: cleanRoll,
              fullName: cleanName,
              branch: branch || 'Engineering / General',
              batch: batch || 'Batch 2026',
              marks: null
            };
          }
        }
      } catch (err) {
        console.warn('Supabase candidate save error, continuing with local:', err);
      }
    }

    // Sync with local directory so candidate appears immediately across dashboard & admin
    const localStudents = this.getLocalStudents();
    const existingIdx = localStudents.findIndex(
      (s) => (s.rollNo || '').toUpperCase() === cleanRoll
    );

    if (existingIdx >= 0) {
      localStudents[existingIdx] = {
        ...localStudents[existingIdx],
        fullName: cleanName !== 'Candidate' ? cleanName : localStudents[existingIdx].fullName,
        id: savedStudent ? savedStudent.id : localStudents[existingIdx].id
      };
      if (!savedStudent) {
        savedStudent = localStudents[existingIdx];
      }
    } else {
      if (!savedStudent) {
        savedStudent = {
          id: toUUID(),
          rollNo: cleanRoll,
          fullName: cleanName,
          branch: branch || 'Engineering / General',
          batch: batch || 'Batch 2026',
          createdAt: new Date().toISOString()
        };
      }
      localStudents.unshift(savedStudent);
    }

    this.saveLocalStudents(localStudents);
    return savedStudent;
  },

  // ----------------------------------------------------
  // LIVE BACKEND PRN LOOKUP (AUTO-FETCH CANDIDATE NAME)
  // ----------------------------------------------------
  async getStudentByPrn(prn) {
    if (!prn) return null;
    const cleanPrn = prn.trim().toUpperCase();
    if (!cleanPrn) return null;
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .ilike('roll_no', cleanPrn)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            rollNo: data.roll_no,
            fullName: data.full_name,
            branch: data.branch || 'Engineering',
            batch: data.batch || 'Batch 2026'
          };
        }
      } catch (err) {
        console.warn('Backend student PRN lookup error:', err);
      }
    }

    // Local directory check
    const localList = await this.getStudents();
    const found = localList.find((s) => (s.rollNo || '').trim().toUpperCase() === cleanPrn);
    if (found) {
      return {
        id: found.id,
        rollNo: found.rollNo,
        fullName: found.fullName,
        branch: found.branch || 'Engineering',
        batch: found.batch || 'Batch 2026'
      };
    }

    return null;
  },

  // ----------------------------------------------------
  // VERIFY PRN NUMBER & TEST ID / PASSWORD WITH BACKEND
  // AND PERSIST CANDIDATE PRN & NAME TO DB
  // ----------------------------------------------------
  async verifyPrnAndTestAccess(prn, testIdCode, password, candidateName = '') {
    const cleanPrn = String(prn || '').trim().toUpperCase();
    const cleanCode = String(testIdCode || '').trim();
    const cleanPass = String(password || '').trim();
    const cleanName = String(candidateName || '').trim();
    const supabase = getSupabaseClient();

    try {
      if (!cleanPrn) {
        return {
          success: false,
          message: 'Student PRN Number is required.'
        };
      }

      // 1. Fetch active tests from database to match Test ID / Code
      let matchedTest = null;
      if (supabase) {
        try {
          let testQuery = supabase.from('tests').select('*, questions(count)');
          if (/^\d+$/.test(cleanCode)) {
            testQuery = testQuery.eq('test_id', parseInt(cleanCode, 10));
          } else if (isUUID(cleanCode)) {
            testQuery = testQuery.eq('id', cleanCode);
          } else {
            testQuery = testQuery.ilike('title', `%${cleanCode}%`);
          }

          const { data: dbMatches, error: matchErr } = await withTimeout(
            testQuery,
            2800
          );

          if (!matchErr && dbMatches && dbMatches.length > 0) {
            const t = dbMatches[0];
            matchedTest = {
              id: t.id,
              title: t.title,
              category: t.category,
              testIdCode: String(t.test_id || t.test_id_code || cleanCode).trim(),
              testPassword: String(t.test_password || 'Exam@Pass2026').trim(),
              durationMinutes: Number(t.duration_minutes) || 30,
              totalMarks: Number(t.total_marks) || 20,
              passPercentage: Number(t.pass_percentage) || 50,
              negativeMarking: Number(t.negative_marking || 0),
              maxViolations: Number(t.max_violations) || 3,
              isActive: t.is_active !== false,
              questionCount: Array.isArray(t.questions) && t.questions[0] ? t.questions[0].count : 0,
              createdAt: t.created_at
            };
          }
        } catch (e) {
          console.warn('Direct test_id query error:', e);
        }
      }

      if (!matchedTest) {
        const allTests = await this.getTests();

        matchedTest = allTests.find((t) => {
          const normalizedCode = String(
            t.testIdCode ?? t.test_id ?? ""
          ).trim().toLowerCase();

          const normalizedId = String(t.id ?? "")
            .trim()
            .toLowerCase();

          return (
            (normalizedCode !== "" && normalizedCode === cleanCode.toLowerCase()) ||
            (normalizedId !== "" && normalizedId === cleanCode.toLowerCase())
          );
        });
      }

      if (!matchedTest) {
        return {
          success: false,
          message: `Test ID "${cleanCode}" was not found in the database. Please verify the Test ID provided by the Administrator.`
        };
      }

      if (matchedTest.isActive === false) {
        return {
          success: false,
          message: `Assessment "${matchedTest.title}" has ended and is not currently active.`
        };
      }

      // 2. Verify Test Password authentication against test_password from database (safe string conversion)
      const expectedPass = String(matchedTest.testPassword ?? matchedTest.test_password ?? '').trim();
      if (expectedPass && expectedPass !== cleanPass && expectedPass.toLowerCase() !== cleanPass.toLowerCase()) {
        return {
          success: false,
          message: 'Incorrect Examination Password. Access Denied.'
        };
      }

      // 3. Save / Upsert Student PRN and Name to Database (Supabase + Local sync)
      const student = await this.saveOrUpdateCandidate({
        rollNo: cleanPrn,
        fullName: cleanName || 'Candidate'
      });

      // 4. Check if student has already submitted this test
      let hasCompleted = false;
      if (supabase && student.id) {
        try {
          const { data: existingAttempts } = await withTimeout(
            supabase
              .from('test_attempts')
              .select('id')
              .eq('test_id', matchedTest.id)
              .eq('student_id', student.id),
            2500
          );

          if (existingAttempts && existingAttempts.length > 0) {
            hasCompleted = true;
          }
        } catch (e) { }
      }

      const localAttempts = this.getLocalTestAttempts();
      const hasCompletedLocally = localAttempts.some(
        (a) =>
          a.testId === matchedTest.id &&
          (a.studentId === student.id || String(a.studentRollNo || '').trim().toUpperCase() === cleanPrn)
      );

      if (hasCompleted || hasCompletedLocally) {
        return {
          success: false,
          alreadySubmitted: true,
          student: {
            id: student.id,
            rollNo: student.rollNo,
            fullName: student.fullName
          },
          test: matchedTest,
          message: `Candidate ${student.fullName || cleanName} (${cleanPrn}) has already completed and submitted this assessment.`
        };
      }

      // All checks passed successfully!
      return {
        success: true,
        student: {
          id: student.id,
          rollNo: student.rollNo,
          fullName: student.fullName
        },
        test: matchedTest
      };
    } catch (err) {
      console.error('Backend PRN verification error:', err);
      return {
        success: false,
        message: 'Could not complete database verification: ' + (err.message || 'Unknown error')
      };
    }
  },

  // ----------------------------------------------------
  // STUDENT MANAGEMENT (LIVE SUPABASE BACKEND + LOCAL SYNC)
  // ----------------------------------------------------
  getLocalStudents() {
    try {
      const stored = localStorage.getItem('infoyashonand_students');
      if (stored) return JSON.parse(stored);
      return [];
    } catch (e) {
      return [];
    }
  },

  saveLocalStudents(list) {
    try {
      localStorage.setItem('infoyashonand_students', JSON.stringify(list));
    } catch (e) { }
  },

  async getStudents() {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getLocalStudents();

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*');

      if (error) {
        console.warn('Backend fetch students returned error, using local:', error);
        return this.getLocalStudents();
      }

      if (data && data.length > 0) {
        const mapped = data.map((d) => ({
          id: d.id,
          rollNo: d.roll_no,
          fullName: d.full_name,
          marks: d.marks !== undefined && d.marks !== null ? Number(d.marks) : null,
          createdAt: d.created_at || new Date().toISOString()
        }));
        this.saveLocalStudents(mapped);
        return mapped;
      }

      return this.getLocalStudents();
    } catch (err) {
      console.warn('Network error fetching students:', err);
      return this.getLocalStudents();
    }
  },

  async addStudent(student) {
    const rollNo = (student.rollNo || '').trim().toUpperCase();
    const fullName = (student.fullName || '').trim();

    if (!rollNo || !fullName) {
      throw new Error('Student Name and PRN Number are required.');
    }

    const supabase = getSupabaseClient();
    const currentStudents = await this.getStudents();

    if (currentStudents.some((s) => s.rollNo.toUpperCase() === rollNo)) {
      throw new Error(`Candidate with PRN "${rollNo}" is already registered.`);
    }

    let savedStudent = {
      id: toUUID(student.id),
      rollNo,
      fullName,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        let insertPayload = {
          roll_no: rollNo,
          full_name: fullName,
          password: 'student@2026'
        };

        let { data, error } = await supabase
          .from('students')
          .insert(insertPayload)
          .select()
          .single();

        // If 'password' column doesn't exist on schema, retry without it
        if (error && error.message && error.message.includes('password')) {
          delete insertPayload.password;
          const retry = await supabase.from('students').insert(insertPayload).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data) {
          savedStudent = {
            id: data.id,
            rollNo: data.roll_no,
            fullName: data.full_name,
            createdAt: new Date().toISOString()
          };
        } else if (error) {
          console.warn('Supabase insert warning, falling back to local save:', error);
        }
      } catch (err) {
        console.warn('Supabase add student error, keeping local fallback:', err);
      }
    }

    const updated = [savedStudent, ...currentStudents.filter((s) => s.id !== savedStudent.id && s.rollNo !== rollNo)];
    this.saveLocalStudents(updated);
    return savedStudent;
  },

  async bulkAddStudents(studentsList) {
    const supabase = getSupabaseClient();
    const currentStudents = await this.getStudents();
    const existingRolls = new Set(currentStudents.map((s) => s.rollNo.toUpperCase()));

    const newlyAdded = [];
    const supabasePayload = [];

    studentsList.forEach((s, idx) => {
      const rollNo = (s.rollNo || `IY-2026-${String(currentStudents.length + idx + 1).padStart(3, '0')}`).trim().toUpperCase();
      if (existingRolls.has(rollNo)) return;

      const item = {
        roll_no: rollNo,
        full_name: (s.fullName || s.name || 'Candidate').trim(),
        password: 'student@2026'
      };

      existingRolls.add(rollNo);
      newlyAdded.push({
        id: toUUID(s.id),
        rollNo: item.roll_no,
        fullName: item.full_name,
        createdAt: new Date().toISOString()
      });
      supabasePayload.push(item);
    });

    if (supabasePayload.length > 0 && supabase) {
      try {
        let { error } = await supabase.from('students').insert(supabasePayload);
        if (error && error.message && error.message.includes('password')) {
          const stripped = supabasePayload.map((p) => ({ roll_no: p.roll_no, full_name: p.full_name }));
          await supabase.from('students').insert(stripped);
        }
      } catch (err) {
        console.warn('Supabase bulk insert warning:', err);
      }
    }

    const merged = [...newlyAdded, ...currentStudents];
    this.saveLocalStudents(merged);
    return { addedCount: newlyAdded.length, students: merged };
  },

  async deleteStudent(studentId) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('students').delete().eq('id', studentId);
      } catch (e) { }
    }
    const currentStudents = await this.getStudents();
    const filtered = currentStudents.filter((s) => s.id !== studentId);
    this.saveLocalStudents(filtered);
    return filtered;
  },

  async updateStudent(studentId, updates) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const payload = {};
        if (updates.fullName) payload.full_name = updates.fullName;
        await supabase.from('students').update(payload).eq('id', studentId);
      } catch (e) { }
    }
    const currentStudents = await this.getStudents();
    const updated = currentStudents.map((s) => (s.id === studentId ? { ...s, ...updates } : s));
    this.saveLocalStudents(updated);
    return updated;
  },

  // ----------------------------------------------------
  // LOCAL TEST STORAGE HELPERS
  // ----------------------------------------------------
  getLocalTests() {
    try {
      const stored = localStorage.getItem('infoyashonand_tests');
      if (stored !== null) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          return list.map((t) => ({
            ...t,
            testIdCode: String(t.testIdCode || t.test_id || (t.id ? `TEST-${t.id.slice(0, 6).toUpperCase()}` : 'TEST-01')).trim(),
            testPassword: String(t.testPassword || t.test_password || 'Exam@Pass2026').trim(),
            isActive: t.isActive !== false
          }));
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  saveLocalTests(list) {
    try {
      localStorage.setItem('infoyashonand_tests', JSON.stringify(list || []));
    } catch (e) { }
  },

  getLocalQuestions() {
    try {
      const stored = localStorage.getItem('infoyashonand_questions');
      if (stored) return JSON.parse(stored);
      return [];
    } catch (e) {
      return [];
    }
  },

  saveLocalQuestions(list) {
    try {
      localStorage.setItem('infoyashonand_questions', JSON.stringify(list));
    } catch (e) { }
  },

  getLocalTestAttempts() {
    try {
      const stored = localStorage.getItem('infoyashonand_attempts');
      if (stored) return JSON.parse(stored);
      return [];
    } catch (e) {
      return [];
    }
  },

  saveLocalTestAttempts(list) {
    try {
      localStorage.setItem('infoyashonand_attempts', JSON.stringify(list));
    } catch (e) { }
  },

  // ----------------------------------------------------
  // TEST MANAGEMENT (STRICT DB-FIRST: SHOW ONLY AVAILABLE TESTS)
  // ----------------------------------------------------
  async getTests() {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getLocalTests();

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('tests')
          .select('*, questions(count)')
          .order('created_at', { ascending: false }),
        3200
      );

      // If backend responded without error, trust the database 100%
      // If DB has 0 tests, it means all tests were deleted — return empty array!
      if (!error && Array.isArray(data)) {
        const mapped = data.map((t) => {
          const testIdCode = String(t.test_id || t.test_id_code || (t.id ? `TEST-${t.id.slice(0, 6).toUpperCase()}` : 'TEST-01')).trim();
          const testPassword = String(t.test_password || 'Exam@Pass2026').trim();

          return {
            id: t.id,
            title: t.title,
            category: t.category,
            testIdCode,
            testPassword,
            test_id: testIdCode,
            test_password: testPassword,
            durationMinutes: Number(t.duration_minutes) || 30,
            totalMarks: Number(t.total_marks) || 20,
            passPercentage: Number(t.pass_percentage) || 50,
            negativeMarking: Number(t.negative_marking || 0),
            maxViolations: Number(t.max_violations) || 3,
            isActive: t.is_active !== false,
            questionCount: Array.isArray(t.questions) && t.questions[0] ? t.questions[0].count : 0,
            createdAt: t.created_at
          };
        });

        this.saveLocalTests(mapped);
        return mapped;
      } else if (error) {
        console.warn('Backend fetch tests warning, falling back to local tests:', error);
      }
    } catch (err) {
      console.warn('Network error fetching tests, using local fallback:', err);
    }

    return this.getLocalTests();
  },

  async getTestById(testId) {
    const tests = await this.getTests();
    return tests.find((t) => t.id === testId) || null;
  },

  async createTest(testData) {
    const supabase = getSupabaseClient();
    const testId = toUUID(testData.id);

    // Convert test_id and test_password to valid integers matching Supabase's int32 column definition
    const parseIntegerSafe = (val, fallback = 1001) => {
      if (typeof val === 'number' && !isNaN(val)) return Math.floor(val);
      const str = String(val || '').trim();
      if (/^\d+$/.test(str)) {
        const num = parseInt(str, 10);
        if (!isNaN(num) && num > 0 && num <= 2147483647) return num;
      }
      const digitsOnly = str.replace(/\D/g, '');
      if (digitsOnly.length > 0) {
        const num = parseInt(digitsOnly.slice(0, 9), 10);
        if (!isNaN(num) && num > 0 && num <= 2147483647) return num;
      }
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % 900000;
      }
      return 100000 + Math.abs(hash);
    };

    const rawTestIdCode = String(testData.testIdCode || testData.test_id || '').trim();
    const rawTestPassword = String(testData.testPassword || testData.test_password || '').trim();

    const intTestId = parseIntegerSafe(rawTestIdCode, Math.floor(1000 + Math.random() * 8999));
    const intTestPassword = parseIntegerSafe(rawTestPassword, 123);

    const newTestPayload = {
      id: testId,
      title: String(testData.title || 'Assessment').trim(),
      category: testData.category || 'General Aptitude',
      test_id: intTestId,
      test_password: intTestPassword,
      duration_minutes: Number(testData.durationMinutes) || 30,
      total_marks: Number(testData.totalMarks) || 20,
      pass_percentage: Number(testData.passPercentage) || 50,
      negative_marking: Number(testData.negativeMarking) || 0,
      max_violations: Number(testData.maxViolations) || 3,
      shuffle_questions: testData.shuffleQuestions !== false,
      is_active: testData.isActive !== false
    };

    let savedTest = {
      id: testId,
      title: newTestPayload.title,
      category: newTestPayload.category,
      testIdCode: String(intTestId),
      testPassword: String(intTestPassword),
      test_id: intTestId,
      test_password: intTestPassword,
      durationMinutes: newTestPayload.duration_minutes,
      totalMarks: newTestPayload.total_marks,
      passPercentage: newTestPayload.pass_percentage,
      negativeMarking: newTestPayload.negative_marking,
      maxViolations: newTestPayload.max_violations,
      shuffleQuestions: newTestPayload.shuffle_questions,
      isActive: newTestPayload.is_active,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        let { data, error } = await supabase.from('tests').insert(newTestPayload).select().maybeSingle();

        // If duplicate test_id error, retry with a unique number
        if (error && error.code === '23505') {
          newTestPayload.test_id = Math.floor(10000 + Math.random() * 89999);
          const retry = await supabase.from('tests').insert(newTestPayload).select().maybeSingle();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          console.error('Supabase test insert error:', error);
          throw new Error(error.message || 'Failed to save test in database.');
        }

        if (data) {
          savedTest = {
            ...savedTest,
            id: data.id,
            testIdCode: String(data.test_id),
            testPassword: String(data.test_password),
            test_id: data.test_id,
            test_password: data.test_password,
            createdAt: data.created_at || savedTest.createdAt
          };
        }
      } catch (err) {
        console.error('Supabase create test error:', err);
        throw err;
      }
    }

    const currentTests = this.getLocalTests();
    const updatedTests = [savedTest, ...currentTests.filter((t) => t.id !== savedTest.id)];
    this.saveLocalTests(updatedTests);

    return savedTest;
  },

  // High-Speed Bulk Questions Insertion with Progress Callback
  async bulkAddQuestions(testId, questionsList, onProgress = null) {
    if (!questionsList || questionsList.length === 0) return [];
    const supabase = getSupabaseClient();
    const cleanTestId = toUUID(testId);

    const formattedPayloads = questionsList.map((q) => {
      const qId = toUUID(q.id);
      return {
        id: qId,
        test_id: cleanTestId,
        question_text: String(q.questionText || q.question_text || 'Assessment Question').trim(),
        has_code: Boolean(q.hasCode || q.has_code),
        code_content: (q.hasCode || q.has_code) ? String(q.codeContent || q.code_content || '') : null,
        code_language: String(q.codeLanguage || q.code_language || 'c').trim(),
        option_a: String(q.optionA || q.option_a || 'Option A').trim(),
        option_b: String(q.optionB || q.option_b || 'Option B').trim(),
        option_c: String(q.optionC || q.option_c || 'Option C').trim(),
        option_d: String(q.optionD || q.option_d || 'Option D').trim(),
        correct_option: String(q.correctOption || q.correct_option || 'A').trim().toUpperCase().slice(0, 5),
        marks: Number(q.marks) || 2,
        explanation: String(q.explanation || '').trim()
      };
    });

    if (onProgress) onProgress(30);

    // Fast Batch Insert to Supabase (in chunks of 25 for maximum speed and reliability)
    if (supabase) {
      try {
        const chunkSize = 25;
        for (let i = 0; i < formattedPayloads.length; i += chunkSize) {
          const chunk = formattedPayloads.slice(i, i + chunkSize);
          const { error } = await supabase.from('questions').insert(chunk);
          if (error) {
            console.error('Supabase bulk question insert error:', error);
            throw new Error(`Failed to save questions to database: ${error.message}`);
          }
          if (onProgress) {
            const currentPct = 30 + Math.round(((i + chunk.length) / formattedPayloads.length) * 60);
            onProgress(Math.min(currentPct, 90));
          }
        }
      } catch (err) {
        console.error('Supabase bulk question insert error:', err);
        throw err;
      }
    }

    // Local Storage synchronization
    const localQ = this.getLocalQuestions();
    const updatedLocalQ = [
      ...formattedPayloads.map((p) => ({
        id: p.id,
        testId: p.test_id,
        questionText: p.question_text,
        hasCode: p.has_code,
        codeContent: p.code_content,
        codeLanguage: p.code_language,
        optionA: p.option_a,
        optionB: p.option_b,
        optionC: p.option_c,
        optionD: p.option_d,
        correctOption: p.correct_option,
        marks: p.marks,
        explanation: p.explanation
      })),
      ...localQ.filter((q) => q.testId !== cleanTestId)
    ];

    this.saveLocalQuestions(updatedLocalQ);
    if (onProgress) onProgress(100);

    return formattedPayloads;
  },

  async deleteTest(testId) {
    const supabase = getSupabaseClient();
    const cleanId = String(testId || '').trim();

    if (supabase && cleanId) {
      try {
        // Find the test to get both UUID id and test_id code
        let targetUuid = cleanId;
        let targetCode = cleanId;
        const { data: found } = await supabase
          .from('tests')
          .select('id, test_id')
          .or(`id.eq.${cleanId},test_id.eq.${cleanId}`);
        if (found && found.length > 0) {
          targetUuid = found[0].id;
          targetCode = String(found[0].test_id || cleanId);
        }

        // 1. Delete all associated test attempts
        await supabase.from('test_attempts').delete().eq('test_id', targetUuid);
        if (targetCode && targetCode !== targetUuid) {
          await supabase.from('test_attempts').delete().eq('test_id', targetCode);
        }

        // 2. Delete all associated questions
        await supabase.from('questions').delete().eq('test_id', targetUuid);
        if (targetCode && targetCode !== targetUuid) {
          await supabase.from('questions').delete().eq('test_id', targetCode);
        }

        // 3. Delete from tests table
        const { error } = await supabase.from('tests').delete().eq('id', targetUuid);
        if (error || targetCode) {
          await supabase.from('tests').delete().eq('test_id', targetCode);
        }
      } catch (e) {
        console.warn('Backend delete test warning:', e);
      }
    }

    // Immediately remove from localStorage so it never shows up again!
    const currentTests = this.getLocalTests();
    const updated = currentTests.filter((t) => {
      const matchId = String(t.id || '').trim().toLowerCase() === cleanId.toLowerCase();
      const matchCode = String(t.testIdCode || t.test_id || '').trim().toLowerCase() === cleanId.toLowerCase();
      return !matchId && !matchCode;
    });
    this.saveLocalTests(updated);

    // Also remove cached questions for this test
    const currentQ = this.getLocalQuestions();
    const updatedQ = currentQ.filter((q) => {
      const qTestId = String(q.testId || '').trim().toLowerCase();
      return qTestId !== cleanId.toLowerCase();
    });
    this.saveLocalQuestions(updatedQ);

    return updated;
  },

  async updateTestStatus(testId, isActive) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('tests')
        .update({ is_active: isActive })
        .eq('id', testId);

      if (error) throw new Error('Failed to update test status in backend: ' + error.message);
    }
  },

  // ----------------------------------------------------
  // QUESTION MANAGEMENT (ALL LIVE FROM SUPABASE BACKEND + LOCAL FALLBACK)
  // ----------------------------------------------------
  async getQuestions(testId) {
    const supabase = getSupabaseClient();
    const local = this.getLocalQuestions();
    const cleanTestId = testId ? String(testId).trim() : null;

    if (supabase) {
      try {
        let targetUuid = cleanTestId;
        if (cleanTestId && !isUUID(cleanTestId)) {
          let testLookup = supabase.from('tests').select('id');
          if (/^\d+$/.test(cleanTestId)) {
            testLookup = testLookup.eq('test_id', parseInt(cleanTestId, 10));
          } else {
            testLookup = testLookup.eq('test_id', cleanTestId);
          }
          const { data: testRow } = await testLookup.maybeSingle();
          if (testRow && testRow.id) {
            targetUuid = testRow.id;
          }
        }

        let query = supabase.from('questions').select('*');
        if (targetUuid && isUUID(targetUuid)) query = query.eq('test_id', targetUuid);

        const { data, error } = await withTimeout(query, 3500);
        if (!error && data && data.length > 0) {
          return data.map((q) => ({
            id: q.id,
            testId: q.test_id,
            questionText: q.question_text,
            hasCode: Boolean(q.has_code),
            codeContent: q.code_content || '',
            codeLanguage: q.code_language || 'c',
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c || '',
            optionD: q.option_d || '',
            correctOption: q.correct_option || 'A',
            marks: Number(q.marks) || 2,
            explanation: q.explanation || '',
            createdAt: q.created_at
          }));
        } else if (error) {
          console.warn('Backend fetch questions returned error, using local questions:', error);
        }
      } catch (err) {
        console.warn('Network error fetching questions, falling back to local:', err);
      }
    }

    // Local questions fallback
    if (cleanTestId) {
      const matched = local.filter((q) => String(q.testId).trim() === cleanTestId);
      if (matched.length > 0) return matched;
    }
    return local;
  },

  async addQuestion(qData) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database connection is not configured.');

    const qId = toUUID(qData.id);
    const testId = toUUID(qData.testId);

    const newQPayload = {
      id: qId,
      test_id: testId,
      question_text: qData.questionText,
      has_code: Boolean(qData.hasCode),
      code_content: qData.hasCode ? (qData.codeContent || '') : null,
      code_language: qData.codeLanguage || 'c',
      option_a: qData.optionA,
      option_b: qData.optionB,
      option_c: qData.optionC || '',
      option_d: qData.optionD || '',
      correct_option: qData.correctOption || 'A',
      marks: Number(qData.marks) || 2,
      explanation: qData.explanation || ''
    };

    const { data, error } = await supabase.from('questions').insert(newQPayload).select().single();
    if (error) {
      console.error('Failed to save question to backend:', error);
      throw new Error('Failed to save question to backend: ' + error.message);
    }

    return {
      id: data.id,
      testId: data.test_id,
      questionText: data.question_text,
      hasCode: data.has_code,
      codeContent: data.code_content || '',
      codeLanguage: data.code_language || 'c',
      optionA: data.option_a,
      optionB: data.option_b,
      optionC: data.option_c,
      optionD: data.option_d,
      correctOption: data.correct_option,
      marks: data.marks,
      explanation: data.explanation || '',
      createdAt: data.created_at
    };
  },

  async deleteQuestion(questionId) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw new Error(error.message);
    }
  },

  // ----------------------------------------------------
  // TEST SUBMISSIONS (LIVE FROM SUPABASE BACKEND + LOCAL RESILIENCY)
  // ----------------------------------------------------
  async submitTestAttempt(attemptData) {
    const supabase = getSupabaseClient();
    const attemptId = toUUID(attemptData.id);
    const testId = toUUID(attemptData.testId);
    const studentId = toUUID(attemptData.studentId);

    const newAttemptPayload = {
      id: attemptId,
      test_id: testId,
      student_id: studentId,
      student_name: String(attemptData.studentName || 'Candidate'),
      student_roll_no: String(attemptData.studentRollNo || 'PRN'),
      start_time: attemptData.startTime || new Date().toISOString(),
      end_time: new Date().toISOString(),
      time_spent_seconds: attemptData.timeSpentSeconds || 0,
      status: attemptData.status || 'submitted',
      total_score: Number(attemptData.totalScore || 0),
      max_score: Number(attemptData.maxScore || 0),
      percentage: Number(attemptData.percentage || 0),
      answers: attemptData.answers || {},
      violations_count: attemptData.violationsCount || 0,
      violations_log: attemptData.violationsLog || [],
      auto_submitted_reason: attemptData.autoSubmittedReason || null
    };

    let resultAttempt = {
      id: attemptId,
      testId: testId,
      studentId: studentId,
      studentName: newAttemptPayload.student_name,
      studentRollNo: newAttemptPayload.student_roll_no,
      startTime: newAttemptPayload.start_time,
      endTime: newAttemptPayload.end_time,
      timeSpentSeconds: newAttemptPayload.time_spent_seconds,
      status: newAttemptPayload.status,
      totalScore: newAttemptPayload.total_score,
      maxScore: newAttemptPayload.max_score,
      percentage: newAttemptPayload.percentage,
      answers: newAttemptPayload.answers,
      violationsCount: newAttemptPayload.violations_count,
      violationsLog: newAttemptPayload.violations_log,
      autoSubmittedReason: newAttemptPayload.auto_submitted_reason,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      // Resolve student_id to real database student ID by roll_no
      try {
        if (newAttemptPayload.student_roll_no) {
          const { data: matchedStudent } = await supabase
            .from('students')
            .select('id')
            .ilike('roll_no', String(newAttemptPayload.student_roll_no).trim())
            .maybeSingle();
          if (matchedStudent && matchedStudent.id) {
            newAttemptPayload.student_id = matchedStudent.id;
          }
        }
      } catch (e) { }

      // Resolve test_id to real database test ID
      try {
        if (testId) {
          const { data: matchedTest } = await supabase
            .from('tests')
            .select('id')
            .eq('id', testId)
            .maybeSingle();
          if (!matchedTest && attemptData.testId) {
            const { data: altTest } = await supabase
              .from('tests')
              .select('id')
              .eq('test_id', attemptData.testId)
              .maybeSingle();
            if (altTest && altTest.id) {
              newAttemptPayload.test_id = altTest.id;
            }
          }
        }
      } catch (e) { }

      try {
        const { data, error } = await supabase.from('test_attempts').insert(newAttemptPayload).select().maybeSingle();
        if (!error && data) {
          resultAttempt = {
            id: data.id,
            testId: data.test_id,
            studentId: data.student_id,
            studentName: data.student_name,
            studentRollNo: data.student_roll_no,
            startTime: data.start_time,
            endTime: data.end_time,
            timeSpentSeconds: data.time_spent_seconds,
            status: data.status,
            totalScore: Number(data.total_score),
            maxScore: Number(data.max_score),
            percentage: Number(data.percentage),
            answers: data.answers,
            violationsCount: data.violations_count,
            violationsLog: data.violations_log || [],
            autoSubmittedReason: data.auto_submitted_reason,
            createdAt: data.created_at
          };
        } else if (error) {
          console.warn('Supabase test attempt insert warning:', error);
        }
      } catch (err) {
        console.warn('Supabase submit attempt error, saving locally:', err);
      }

      // CRUCIAL REQUIREMENT: Save candidate score directly into students table 'marks' column
      try {
        const studentScore = Math.round(Number(newAttemptPayload.total_score || 0));
        if (newAttemptPayload.student_id) {
          await supabase
            .from('students')
            .update({ marks: studentScore })
            .eq('id', newAttemptPayload.student_id);
        }
        if (newAttemptPayload.student_roll_no) {
          await supabase
            .from('students')
            .update({ marks: studentScore })
            .ilike('roll_no', String(newAttemptPayload.student_roll_no).trim());
        }
      } catch (markErr) {
        console.warn('Failed to store marks in students table:', markErr);
      }
    }

    // Sync marks with local student records
    const localStudents = this.getLocalStudents();
    const studentIdx = localStudents.findIndex(
      (s) => s.id === studentId || String(s.rollNo || '').toUpperCase() === String(newAttemptPayload.student_roll_no).toUpperCase()
    );
    if (studentIdx >= 0) {
      localStudents[studentIdx] = {
        ...localStudents[studentIdx],
        marks: Number(newAttemptPayload.total_score || 0)
      };
      this.saveLocalStudents(localStudents);
    }

    const currentAttempts = this.getLocalTestAttempts();
    const updated = [resultAttempt, ...currentAttempts.filter((a) => a.id !== resultAttempt.id)];
    this.saveLocalTestAttempts(updated);

    return resultAttempt;
  },

  async getAttempts(testId = null) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const local = this.getLocalTestAttempts();
      return testId ? local.filter((a) => a.testId === testId) : local;
    }

    try {
      let query = supabase.from('test_attempts').select('*').order('created_at', { ascending: false });
      if (testId) query = query.eq('test_id', testId);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = data.map((d) => ({
          id: d.id,
          testId: d.test_id,
          studentId: d.student_id,
          studentName: d.student_name,
          studentRollNo: d.student_roll_no,
          startTime: d.start_time,
          endTime: d.end_time,
          timeSpentSeconds: d.time_spent_seconds,
          status: d.status,
          totalScore: Number(d.total_score),
          maxScore: Number(d.max_score),
          percentage: Number(d.percentage),
          answers: d.answers,
          violationsCount: d.violations_count,
          violationsLog: d.violations_log || [],
          autoSubmittedReason: d.auto_submitted_reason,
          createdAt: d.created_at
        }));
        this.saveLocalTestAttempts(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase getAttempts error, using local:', err);
    }

    const local = this.getLocalTestAttempts();
    return testId ? local.filter((a) => a.testId === testId) : local;
  },

  async getStudentAttempt(studentId, testId) {
    const attempts = await this.getAttempts();
    return attempts.find((a) => a.studentId === studentId && a.testId === testId) || null;
  },

  async logProctorViolation(event) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('proctor_logs').insert({
          id: toUUID(event.id),
          attempt_id: event.attemptId ? toUUID(event.attemptId) : null,
          student_id: event.studentId ? toUUID(event.studentId) : null,
          event_type: event.eventType,
          details: event.details,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Proctor log error:', err);
      }
    }
  },

  async getProctorLogs() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('proctor_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) return [];
    return (data || []).map((d) => ({
      id: d.id,
      attemptId: d.attempt_id,
      studentId: d.student_id,
      eventType: d.event_type,
      details: d.details,
      timestamp: d.timestamp
    }));
  },

  // ----------------------------------------------------
  // ACTIVE SESSIONS (HEARTBEAT IN SUPABASE / MEMORY)
  // ----------------------------------------------------
  async startTestSession(student, test) {
    // Save in session state
    return {
      studentId: student.id,
      studentName: student.fullName,
      studentRollNo: student.rollNo,
      testId: test.id,
      testTitle: test.title,
      startTime: new Date().toISOString(),
      status: 'in_progress'
    };
  },

  async endTestSession(studentId, testId) {
    // End session
  },

  async getActiveTestTakers() {
    return [];
  }
};
