-- ==============================================================================
-- INFOYASHONAND TECHNOLOGY PVT. LTD. - APTITUDE & PROCTOR ASSESSMENT PLATFORM
-- Supabase PostgreSQL Database Schema
-- Run this script in your Supabase SQL Editor to initialize all tables & policies.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-initializing (safe order)
DROP TABLE IF EXISTS proctor_logs CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- 3. Admins Table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Admin (id: adminitpl#01 / pass: Amrut_01)
INSERT INTO admins (email, password, full_name, role) VALUES
('adminitpl#01', 'Amrut_01', 'System Administrator (ITPL)', 'super_admin');

-- 4. Students Table (No admin-set password, email, or status credentials needed)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_no VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    branch VARCHAR(100) DEFAULT 'Computer Science & Engineering',
    batch VARCHAR(100) DEFAULT 'Batch 2026',
    phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you have an existing Supabase table with older columns, run these queries in SQL Editor:
-- ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
-- ALTER TABLE students ALTER COLUMN password DROP NOT NULL;
-- ALTER TABLE students ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE students DROP COLUMN IF EXISTS password;
-- ALTER TABLE students DROP COLUMN IF EXISTS email;
-- ALTER TABLE students DROP COLUMN IF EXISTS status;

-- Seed Sample Students
INSERT INTO students (roll_no, full_name, branch, batch, phone) VALUES
('IY-2026-001', 'Aarav Patil', 'Computer Science', 'Batch 2026', '9876543210'),
('IY-2026-002', 'Pooja Kulkarni', 'Information Tech', 'Batch 2026', '9876543211'),
('IY-2026-003', 'Rohan Shinde', 'Electronics', 'Batch 2026', '9876543212'),
('IY-2026-004', 'Snehal Deshmukh', 'Computer Science', 'Batch 2026', '9876543213');

-- ==============================================================================
-- MIGRATION: If you already have an existing 'tests' table with the old schema,
-- run ONLY these ALTER TABLE commands in your Supabase SQL Editor (skip the
-- CREATE TABLE tests block above):
-- ==============================================================================
-- ALTER TABLE tests DROP COLUMN IF EXISTS description;
-- ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_id VARCHAR(100) UNIQUE NOT NULL DEFAULT 'TEST-LEGACY-01';
-- ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_password VARCHAR(255) NOT NULL DEFAULT 'Exam@Pass2026';
-- ==============================================================================

-- 5. Tests Table
-- NOTE: 'description' column has been removed from this table.
-- The test_id and test_password columns are required for student authentication.
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Aptitude',
    test_id VARCHAR(100) UNIQUE NOT NULL,
    test_password VARCHAR(255) NOT NULL DEFAULT 'Exam@Pass2026',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    total_marks INTEGER NOT NULL DEFAULT 30,
    pass_percentage INTEGER NOT NULL DEFAULT 50,
    negative_marking NUMERIC(4,2) DEFAULT 0.00,
    max_violations INTEGER DEFAULT 3,
    shuffle_questions BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Sample Tests (no description column)
INSERT INTO tests (id, title, category, test_id, test_password, duration_minutes, total_marks, pass_percentage, negative_marking, max_violations, is_active) VALUES
('b9736c50-8b65-4f46-9db6-3286b245e121', 'Campus Placement Aptitude & Technical Assessment - Round 1', 'Campus Recruitment', 'TEST-ITPL-01', 'Exam@Pass2026', 30, 30, 60, 0.25, 3, true),
('a1234c50-8b65-4f46-9db6-3286b245e999', 'Data Structures & Algorithms Technical Screening', 'Technical & Coding', 'TEST-ITPL-02', 'Exam@Pass2026', 20, 20, 50, 0.00, 3, true);

-- 6. Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    has_code BOOLEAN DEFAULT false,
    code_content TEXT,
    code_language VARCHAR(50) DEFAULT 'c',
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(5) NOT NULL,
    marks INTEGER DEFAULT 2,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Sample Questions for Test 1
INSERT INTO questions (test_id, question_text, has_code, code_content, code_language, option_a, option_b, option_c, option_d, correct_option, marks, explanation) VALUES
('b9736c50-8b65-4f46-9db6-3286b245e121', 
'A train running at 54 km/hr crosses a pole in 20 seconds. What is the length of the train in meters?', 
false, NULL, NULL, 
'250 m', '300 m', '350 m', '400 m', 
'B', 2, 
'Speed = 54 * (5/18) = 15 m/s. Distance (Length) = Speed * Time = 15 * 20 = 300 meters.'),

('b9736c50-8b65-4f46-9db6-3286b245e121', 
'What will be the output of the following C code snippet?', 
true, 
'#include <stdio.h>
int main() {
    int x = 5;
    printf("%d %d %d", x++, ++x, x);
    return 0;
}', 
'c', 
'5 6 6', '6 7 7', 'Compiler dependent / Undefined Behavior', '5 7 7', 
'C', 2, 
'Modifying a variable multiple times without an intervening sequence point invokes undefined behavior in the C standard.'),

('b9736c50-8b65-4f46-9db6-3286b245e121', 
'Predict the output of the following Python program:', 
true, 
'data = [1, 2, 3, 4]
res = [x * 2 for x in data if x % 2 == 0]
print(sum(res))', 
'python', 
'8', '12', '16', '20', 
'B', 2, 
'Even numbers are 2 and 4. Doubled: 4 and 8. Sum is 4 + 8 = 12.'),

('b9736c50-8b65-4f46-9db6-3286b245e121', 
'If TAP is coded as SZO, then how will FRIEND be coded in the same pattern?', 
false, NULL, NULL, 
'EQHDMC', 'EQHENC', 'FQHDMC', 'ERHDMC', 
'A', 2, 
'Each letter is shifted backward by 1 position: F->E, R->Q, I->H, E->D, N->M, D->C.'),

('b9736c50-8b65-4f46-9db6-3286b245e121', 
'What is the time complexity of searching an element in a balanced Binary Search Tree (AVL tree) with n nodes?', 
false, NULL, NULL, 
'O(1)', 'O(n)', 'O(log n)', 'O(n log n)', 
'C', 2, 
'In a balanced BST, the maximum height is logarithmic O(log n), so search is O(log n).'),

('b9736c50-8b65-4f46-9db6-3286b245e121', 
'Examine the following Java snippet. What will be printed?', 
true, 
'public class Test {
    public static void main(String[] args) {
        String s1 = "Infoyashonand";
        String s2 = new String("Infoyashonand");
        System.out.println((s1 == s2) + " " + s1.equals(s2));
    }
}', 
'java', 
'true true', 'false true', 'true false', 'false false', 
'B', 2, 
'== compares reference memory addresses (one is pool, one is heap), while equals() compares content.');

-- 7. Test Attempts Table
CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_roll_no VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'submitted', -- 'in_progress', 'submitted', 'terminated'
    total_score NUMERIC(6,2) DEFAULT 0,
    max_score NUMERIC(6,2) DEFAULT 0,
    percentage NUMERIC(5,2) DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    violations_count INTEGER DEFAULT 0,
    violations_log JSONB DEFAULT '[]'::jsonb,
    auto_submitted_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Proctor Logs Table
CREATE TABLE proctor_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'copy_paste_attempt', 'back_button_pressed', 'tab_switch', 'fullscreen_exit', 'devtools_opened'
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctor_logs ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read and write for standard portal operations (Assessment environment)
CREATE POLICY "Public Read Admins" ON admins FOR SELECT USING (true);
CREATE POLICY "Public Full Access Students" ON students FOR ALL USING (true);
CREATE POLICY "Public Read Tests" ON tests FOR ALL USING (true);
CREATE POLICY "Public Read Questions" ON questions FOR ALL USING (true);
CREATE POLICY "Public Full Access Test Attempts" ON test_attempts FOR ALL USING (true);
CREATE POLICY "Public Full Access Proctor Logs" ON proctor_logs FOR ALL USING (true);

-- Enable Realtime publication for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE test_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE proctor_logs;
