export const INITIAL_ADMINS = [
  {
    id: 'adm-001',
    email: 'adminitpl#01',
    password: 'Amrut_01',
    fullName: 'System Administrator (ITPL)',
    role: 'Admin / Placement Officer',
    department: 'Placement Cell & Proctoring Desk'
  }
];

export const INITIAL_STUDENTS = [
  {
    id: 'stu-001',
    rollNo: 'IY-2026-001',
    fullName: 'Aarav Patil',
    phone: '9876543210',
    batch: 'Batch 2026',
    branch: 'Computer Science & Engineering',
    createdAt: '2026-10-10T10:00:00.000Z'
  },
  {
    id: 'stu-002',
    rollNo: 'IY-2026-002',
    fullName: 'Pooja Kulkarni',
    phone: '9876543211',
    batch: 'Batch 2026',
    branch: 'Information Technology',
    createdAt: '2026-10-10T10:05:00.000Z'
  },
  {
    id: 'stu-003',
    rollNo: 'IY-2026-003',
    fullName: 'Rohan Shinde',
    phone: '9876543212',
    batch: 'Batch 2026',
    branch: 'Electronics & Telecommunication',
    createdAt: '2026-10-10T10:10:00.000Z'
  },
  {
    id: 'stu-004',
    rollNo: 'IY-2026-004',
    fullName: 'Snehal Deshmukh',
    phone: '9876543213',
    batch: 'Batch 2026',
    branch: 'Artificial Intelligence & Data Science',
    createdAt: '2026-10-10T10:15:00.000Z'
  }
];

export const INITIAL_TESTS = [
  {
    id: 'test-recruitment-2026',
    title: 'Infoyashonand Campus Placement Assessment - Technical & Aptitude',
    category: 'Campus Recruitment',
    description: '',
    testIdCode: 'TEST-ITPL-01',
    testPassword: '',
    test_id: 'TEST-ITPL-01',
    test_password: '',
    durationMinutes: 30,
    totalMarks: 20,
    passPercentage: 60,
    negativeMarking: 0.00,
    maxViolations: 3,
    shuffleQuestions: true,
    isActive: true,
    createdAt: '2026-10-11T09:00:00.000Z'
  },
  {
    id: 'test-dsa-coding-2026',
    title: 'Data Structures, Algorithms & Code Output Round',
    category: 'Technical & Coding',
    description: 'Screening test focused on memory model, pointer operations, time complexities, and algorithmic output prediction.',
    testIdCode: 'TEST-DSA-02',
    testPassword: '',
    test_id: 'TEST-DSA-02',
    test_password: '',
    durationMinutes: 20,
    totalMarks: 16,
    passPercentage: 50,
    negativeMarking: 0.00,
    maxViolations: 3,
    isActive: true,
    createdAt: '2026-10-12T09:00:00.000Z'
  }
];

export const INITIAL_QUESTIONS = [
  {
    id: 'q-001',
    testId: 'test-recruitment-2026',
    questionText: 'A train 300 meters long is traveling at a speed of 54 km/hr. How many seconds will it take to pass a stationary signal pole completely?',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'text',
    optionA: '15 seconds',
    optionB: '20 seconds',
    optionC: '25 seconds',
    optionD: '30 seconds',
    correctOption: 'B',
    marks: 2,
    explanation: 'Speed in m/s = 54 * (5/18) = 15 m/s. Time = Distance / Speed = 300 / 15 = 20 seconds.'
  },
  {
    id: 'q-002',
    testId: 'test-recruitment-2026',
    questionText: 'Analyze the following C code. What will be printed to stdout upon execution?',
    hasCode: true,
    codeLanguage: 'c',
    codeContent: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    
    printf("%d, ", *(ptr + 2));
    printf("%d", *ptr++);
    
    return 0;
}`,
    optionA: '30, 10',
    optionB: '20, 10',
    optionC: '30, 20',
    optionD: '10, 10',
    correctOption: 'A',
    marks: 2,
    explanation: '*(ptr + 2) accesses arr[2] which is 30. Then *ptr++ evaluates to *ptr (which is arr[0] = 10) before pointer increment.'
  },
  {
    id: 'q-003',
    testId: 'test-recruitment-2026',
    questionText: 'What is the output produced by the following Python script?',
    hasCode: true,
    codeLanguage: 'python',
    codeContent: `def compute_value(numbers):
    res = [x * 2 for x in numbers if x % 2 == 0]
    return sum(res)

values = [1, 2, 3, 4, 5, 6]
print("Result:", compute_value(values))`,
    optionA: 'Result: 20',
    optionB: 'Result: 24',
    optionC: 'Result: 18',
    optionD: 'Result: 12',
    correctOption: 'B',
    marks: 2,
    explanation: 'Even numbers in list: 2, 4, 6. Doubled: 4, 8, 12. Sum: 4 + 8 + 12 = 24.'
  },
  {
    id: 'q-004',
    testId: 'test-recruitment-2026',
    questionText: 'In a code language, if "COMPUTER" is coded as "RFUVQNPC", how will "SOFTWARE" be coded in that same pattern?',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'text',
    optionA: 'EXBSVOPG',
    optionB: 'EXBSUPOG',
    optionC: 'FXBTVOPH',
    optionD: 'EWASVNPG',
    correctOption: 'A',
    marks: 2,
    explanation: 'The word is reversed and shifted: first and last letters swapped or shifted backwards/forwards symmetrically.'
  },
  {
    id: 'q-005',
    testId: 'test-recruitment-2026',
    questionText: 'Examine the following Java code snippet regarding String Pool behavior:',
    hasCode: true,
    codeLanguage: 'java',
    codeContent: `public class TestString {
    public static void main(String[] args) {
        String str1 = "Infoyashonand";
        String str2 = new String("Infoyashonand");
        String str3 = str2.intern();
        
        System.out.println((str1 == str2) + " " + (str1 == str3));
    }
}`,
    optionA: 'true true',
    optionB: 'false true',
    optionC: 'true false',
    optionD: 'false false',
    correctOption: 'B',
    marks: 2,
    explanation: 'str1 is in string constant pool, str2 is a new heap object (str1 == str2 is false). str2.intern() returns reference from the pool (str1 == str3 is true).'
  },
  {
    id: 'q-006',
    testId: 'test-recruitment-2026',
    questionText: 'If 6 men and 8 boys can do a piece of work in 10 days, while 26 men and 48 boys can do the same in 2 days, the time taken by 15 men and 20 boys in doing the same work will be:',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'text',
    optionA: '4 days',
    optionB: '5 days',
    optionC: '6 days',
    optionD: '8 days',
    correctOption: 'A',
    marks: 2,
    explanation: '10*(6M + 8B) = 2*(26M + 48B) => 60M + 80B = 52M + 96B => 8M = 16B => 1 Man = 2 Boys. Total work = 200 Boy-days. 15M + 20B = 50 Boys. Days = 200 / 50 = 4 days.'
  },
  {
    id: 'q-007',
    testId: 'test-recruitment-2026',
    questionText: 'What is the output of the following JavaScript snippet involving closures and hoisting?',
    hasCode: true,
    codeLanguage: 'javascript',
    codeContent: `for (var i = 0; i < 3; i++) {
    setTimeout(function() {
        console.log(i);
    }, 100);
}`,
    optionA: '0 1 2',
    optionB: '3 3 3',
    optionC: 'undefined undefined undefined',
    optionD: '2 2 2',
    correctOption: 'B',
    marks: 2,
    explanation: '`var` is function-scoped. By the time setTimeout callbacks execute, loop has finished and `i` equals 3 for all 3 closures.'
  },
  {
    id: 'q-008',
    testId: 'test-recruitment-2026',
    questionText: 'What is the worst-case time complexity of QuickSort when the pivot chosen is always the maximum or minimum element?',
    hasCode: false,
    codeContent: '',
    codeLanguage: 'text',
    optionA: 'O(n log n)',
    optionB: 'O(n)',
    optionC: 'O(n^2)',
    optionD: 'O(log n)',
    correctOption: 'C',
    marks: 2,
    explanation: 'Unbalanced partitions (1 element and n-1 elements) lead to recurrence T(n) = T(n-1) + O(n), which resolves to O(n^2).'
  },
  {
    id: 'q-009',
    testId: 'test-recruitment-2026',
    questionText: 'Predict the output of the following C++ program with reference semantics:',
    hasCode: true,
    codeLanguage: 'cpp',
    codeContent: `#include <iostream>
using namespace std;

void update(int &a, int b = 5) {
    a += b;
    b *= 2;
}

int main() {
    int x = 10, y = 3;
    update(x, y);
    cout << x << " " << y << endl;
    return 0;
}`,
    optionA: '13 3',
    optionB: '13 6',
    optionC: '15 3',
    optionD: '10 6',
    correctOption: 'A',
    marks: 2,
    explanation: '`a` is passed by reference (x becomes 10 + 3 = 13), while `b` is passed by value (y remains 3 in main scope).'
  },
  {
    id: 'q-010',
    testId: 'test-recruitment-2026',
    questionText: 'Given the SQL query below, what does the HAVING clause do that WHERE cannot?',
    hasCode: true,
    codeLanguage: 'sql',
    codeContent: `SELECT department, AVG(salary) as avg_sal
FROM employees
GROUP BY department
HAVING AVG(salary) > 50000;`,
    optionA: 'It filters individual rows before aggregation occurs',
    optionB: 'It filters groups based on aggregate function results',
    optionC: 'It sorts the resulting records in descending order',
    optionD: 'It joins employee tables with department tables',
    correctOption: 'B',
    marks: 2,
    explanation: 'WHERE filters rows before grouping, whereas HAVING filters groups after aggregation functions (like AVG, SUM) have executed.'
  }
];

export const INITIAL_ATTEMPTS = [
  {
    id: 'att-001',
    testId: 'test-recruitment-2026',
    studentId: 'stu-001',
    studentName: 'Aarav Patil',
    studentRollNo: 'IY-2026-001',
    startTime: '2026-10-12T10:00:00.000Z',
    endTime: '2026-10-12T10:24:12.000Z',
    timeSpentSeconds: 1452,
    status: 'submitted',
    totalScore: 18,
    maxScore: 20,
    percentage: 90.0,
    answers: {
      'q-001': 'B',
      'q-002': 'A',
      'q-003': 'B',
      'q-004': 'A',
      'q-005': 'B',
      'q-006': 'A',
      'q-007': 'B',
      'q-008': 'C',
      'q-009': 'A',
      'q-010': 'C'
    },
    violationsCount: 0,
    violationsLog: [],
    autoSubmittedReason: null,
    createdAt: '2026-10-12T10:24:12.000Z'
  },
  {
    id: 'att-002',
    testId: 'test-recruitment-2026',
    studentId: 'stu-002',
    studentName: 'Pooja Kulkarni',
    studentRollNo: 'IY-2026-002',
    startTime: '2026-10-12T11:00:00.000Z',
    endTime: '2026-10-12T11:21:40.000Z',
    timeSpentSeconds: 1300,
    status: 'submitted',
    totalScore: 16,
    maxScore: 20,
    percentage: 80.0,
    answers: {
      'q-001': 'B',
      'q-002': 'A',
      'q-003': 'B',
      'q-004': 'B',
      'q-005': 'B',
      'q-006': 'A',
      'q-007': 'B',
      'q-008': 'C',
      'q-009': 'C',
      'q-010': 'B'
    },
    violationsCount: 1,
    violationsLog: [
      {
        type: 'tab_switch',
        message: 'Browser tab switched or minimized',
        timestamp: '2026-10-12T11:12:00.000Z'
      }
    ],
    autoSubmittedReason: null,
    createdAt: '2026-10-12T11:21:40.000Z'
  }
];
