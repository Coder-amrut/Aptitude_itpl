import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, FileSpreadsheet, FileText, Search, Download,
  Trash2, Edit3, Key, Eye, EyeOff, Check, Copy, RefreshCw, Upload, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    rollNo: '',
    fullName: '',
    email: '',
    password: '',
    branch: 'Computer Science & Engineering',
    batch: 'Batch 2026',
    phone: ''
  });

  // Excel Upload State
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');

  // PDF / Text Parser State
  const [pdfRawText, setPdfRawText] = useState('');
  const [parsedPdfCandidates, setParsedPdfCandidates] = useState([]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const data = await dbService.getStudents();
    setStudents(data);
    setLoading(false);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualForm((prev) => ({ ...prev, password: pass }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.rollNo || !manualForm.fullName || !manualForm.email) {
      alert('Please fill in Roll No, Name, and Email.');
      return;
    }

    const payload = {
      ...manualForm,
      password: manualForm.password || `${manualForm.rollNo}@2026`
    };

    await dbService.addStudent(payload);
    setShowManualModal(false);
    setManualForm({
      rollNo: '',
      fullName: '',
      email: '',
      password: '',
      branch: 'Computer Science & Engineering',
      batch: 'Batch 2026',
      phone: ''
    });
    loadStudents();
  };

  // Excel parser
  const handleExcelFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          alert('Excel sheet seems empty or lacks a header row.');
          return;
        }

        // Header mapping
        const headers = json[0].map((h) => String(h).trim().toLowerCase());
        const rollIdx = headers.findIndex((h) => h.includes('roll') || h.includes('id'));
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
        const passIdx = headers.findIndex((h) => h.includes('pass'));
        const branchIdx = headers.findIndex((h) => h.includes('branch') || h.includes('dept'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));

        const parsedRows = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0 || !row[0]) continue;

          const rollNo = (rollIdx !== -1 && row[rollIdx]) ? String(row[rollIdx]).trim() : `IY-2026-${String(students.length + i).padStart(3, '0')}`;
          const fullName = (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]).trim() : `Candidate ${i}`;
          const email = (emailIdx !== -1 && row[emailIdx]) ? String(row[emailIdx]).trim() : `${rollNo.toLowerCase()}@infoyashonand.edu`;
          const password = (passIdx !== -1 && row[passIdx]) ? String(row[passIdx]).trim() : `${rollNo}@2026`;
          const branch = (branchIdx !== -1 && row[branchIdx]) ? String(row[branchIdx]).trim() : 'Computer Science';
          const phone = (phoneIdx !== -1 && row[phoneIdx]) ? String(row[phoneIdx]).trim() : '';

          parsedRows.push({ rollNo, fullName, email, password, branch, batch: 'Batch 2026', phone });
        }

        setExcelPreview(parsedRows);
      } catch (err) {
        alert('Failed to read Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelImport = async () => {
    if (excelPreview.length === 0) return;
    await dbService.bulkAddStudents(excelPreview);
    setShowExcelModal(false);
    setExcelPreview([]);
    setExcelFileName('');
    loadStudents();
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        Roll_Number: 'IY-2026-101',
        Full_Name: 'Rahul Verma',
        Official_Email: 'rahul.v@infoyashonand.edu',
        Password: 'Rahul@Password26',
        Department_Branch: 'Computer Science',
        Batch: 'Batch 2026',
        Contact_Number: '9822012345'
      },
      {
        Roll_Number: 'IY-2026-102',
        Full_Name: 'Ananya Sharma',
        Official_Email: 'ananya.s@infoyashonand.edu',
        Password: 'Ananya@Pass26',
        Department_Branch: 'Information Technology',
        Batch: 'Batch 2026',
        Contact_Number: '9822012346'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    XLSX.writeFile(wb, 'Infoyashonand_Student_Import_Template.xlsx');
  };

  // Smart PDF / Text Extractor
  const handleParsePdfText = () => {
    if (!pdfRawText.trim()) return;

    const lines = pdfRawText.split('\n');
    const detected = [];

    // Regex patterns for Roll numbers, emails, names
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const rollRegex = /(IY-[\w-]+|\b[0-9]{2}[A-Z]{2,4}[0-9]{3,4}\b|\b[A-Z0-9]{6,12}\b)/i;
    const phoneRegex = /(\+?91[\s-]?)?[6789]\d{9}/;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return;

      const emails = trimmed.match(emailRegex);
      const email = emails ? emails[0] : null;

      const rolls = trimmed.match(rollRegex);
      const rollNo = rolls ? rolls[0] : `IY-PDF-${String(index + 1).padStart(3, '0')}`;

      const phones = trimmed.match(phoneRegex);
      const phone = phones ? phones[0] : '';

      // Clean name from remaining text
      let cleanName = trimmed
        .replace(emailRegex, '')
        .replace(rollRegex, '')
        .replace(phoneRegex, '')
        .replace(/[,|\t;]/g, ' ')
        .trim();

      if (!cleanName || cleanName.length < 2) {
        cleanName = `Candidate ${index + 1}`;
      }

      if (email || rolls) {
        detected.push({
          rollNo: rollNo.toUpperCase(),
          fullName: cleanName,
          email: email || `${rollNo.toLowerCase()}@infoyashonand.edu`,
          password: `${rollNo.toUpperCase()}@2026`,
          branch: 'Engineering / General',
          batch: 'Batch 2026',
          phone: phone
        });
      }
    });

    setParsedPdfCandidates(detected);
  };

  const handleConfirmPdfImport = async () => {
    if (parsedPdfCandidates.length === 0) return;
    await dbService.bulkAddStudents(parsedPdfCandidates);
    setShowPdfModal(false);
    setPdfRawText('');
    setParsedPdfCandidates([]);
    loadStudents();
  };

  // Export Master Students Sheet
  const handleExportStudents = () => {
    const exportData = students.map((s) => ({
      'Roll Number': s.rollNo,
      'Full Name': s.fullName,
      'Email Address': s.email,
      'Assigned Password': s.password,
      'Branch': s.branch,
      'Batch': s.batch,
      'Phone': s.phone,
      'Status': s.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registered_Students');
    XLSX.writeFile(wb, `Infoyashonand_Students_Credentials_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student account?')) {
      await dbService.deleteStudent(id);
      loadStudents();
    }
  };

  const copyCredentials = (student) => {
    const credText = `Infoyashonand Assessment Login Credentials:\nRoll ID: ${student.rollNo}\nEmail: ${student.email}\nPassword: ${student.password}\nPortal: Assessment Placement Desk`;
    navigator.clipboard.writeText(credText);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Students
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = selectedBranch === 'ALL' || s.branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const branches = ['ALL', ...new Set(students.map((s) => s.branch).filter(Boolean))];

  return (
    <div className="fade-in">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Candidate & Student Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Manage student registrations, create login IDs & passwords, and import candidates via Excel or PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowManualModal(true)} className="btn btn-primary btn-sm">
            <UserPlus size={15} /> Add Single Student
          </button>
          <button onClick={() => setShowExcelModal(true)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="#16a34a" /> Import via Excel
          </button>
          <button onClick={() => setShowPdfModal(true)} className="btn btn-secondary btn-sm">
            <FileText size={15} color="#dc2626" /> Import via PDF / Text
          </button>
          <button onClick={handleExportStudents} className="btn btn-secondary btn-sm">
            <Download size={15} /> Export Credentials
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Roll No, Candidate Name, or Email..."
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Department:</span>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginLeft: 'auto' }}>
            Total Candidates: {filtered.length}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Roll No / ID</th>
              <th>Student Name</th>
              <th>Email</th>
              <th>Login Password</th>
              <th>Branch / Department</th>
              <th>Batch</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading student roster...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No student records found matching the search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e3a8a' }}>
                      {s.rollNo}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.fullName}</div>
                    {s.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ph: {s.phone}</div>}
                  </td>
                  <td>
                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>{s.email}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        background: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#0f172a'
                      }}>
                        {revealedPasswords[s.id] ? s.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        title={revealedPasswords[s.id] ? 'Hide' : 'Show'}
                      >
                        {revealedPasswords[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{s.branch}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>{s.batch}</span>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => copyCredentials(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                        title="Copy student credentials"
                      >
                        {copiedId === s.id ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        {copiedId === s.id ? 'Copied' : 'Credentials'}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="btn btn-sm"
                        style={{ padding: '0.3rem 0.5rem', background: '#fee2e2', color: '#b91c1c', border: 'none' }}
                        title="Delete student"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: ADD SINGLE STUDENT */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Register New Student Candidate</h3>
              <button onClick={() => setShowManualModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Student ID / Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IY-2026-005"
                    className="form-control"
                    value={manualForm.rollNo}
                    onChange={(e) => setManualForm({ ...manualForm, rollNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Full Candidate Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Jadhav"
                    className="form-control"
                    value={manualForm.fullName}
                    onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="candidate@infoyashonand.edu"
                    className="form-control"
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Login Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RefreshCw size={12} /> Auto-Generate Strong Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Create student password"
                    className="form-control"
                    value={manualForm.password}
                    onChange={(e) => setManualForm({ ...manualForm, password: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Student will log in with this ID & Password.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Department / Branch</label>
                    <input
                      type="text"
                      placeholder="Computer Science"
                      className="form-control"
                      value={manualForm.branch}
                      onChange={(e) => setManualForm({ ...manualForm, branch: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch</label>
                    <input
                      type="text"
                      placeholder="Batch 2026"
                      className="form-control"
                      value={manualForm.batch}
                      onChange={(e) => setManualForm({ ...manualForm, batch: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone / WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    className="form-control"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowManualModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Candidate & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK EXCEL IMPORT */}
      {showExcelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} color="#16a34a" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Bulk Student Import via Excel / CSV</h3>
              </div>
              <button onClick={() => setShowExcelModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Upload `.xlsx` or `.csv` spreadsheet containing candidate details.
                </p>
                <button onClick={downloadSampleExcel} className="btn btn-secondary btn-sm">
                  <Download size={13} /> Download Excel Template
                </button>
              </div>

              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer'
              }}>
                <Upload size={36} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Choose Excel (.xlsx, .xls) or CSV file
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                  Auto-detects Roll No, Full Name, Email, Password, Branch, Batch
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  style={{ display: 'inline-block', fontSize: '0.85rem' }}
                />
              </div>

              {excelPreview.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e3a8a' }}>
                      Ready to Import: {excelPreview.length} Candidates Detected
                    </span>
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                    <table className="custom-table" style={{ fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Password</th>
                          <th>Branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelPreview.slice(0, 15).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.rollNo}</td>
                            <td>{row.fullName}</td>
                            <td>{row.email}</td>
                            <td><code>{row.password}</code></td>
                            <td>{row.branch}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {excelPreview.length > 15 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
                      + {excelPreview.length - 15} more candidates...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowExcelModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleConfirmExcelImport}
                disabled={excelPreview.length === 0}
                className="btn btn-primary btn-sm"
              >
                Import {excelPreview.length} Candidates Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PDF / TEXT EXTRACTOR */}
      {showPdfModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#dc2626" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Extract Student Roster from PDF / Document Text</h3>
              </div>
              <button onClick={() => setShowPdfModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem' }}>
                Open your PDF file, select all candidate text (Ctrl+A / Ctrl+C), and paste it below. Our smart parsing engine will extract roll numbers, names, and emails automatically.
              </p>

              <div className="form-group">
                <textarea
                  className="form-control"
                  style={{ minHeight: '140px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  placeholder="Paste student list copied from PDF here...&#10;e.g.&#10;IY-2026-050, Aditya Patil, aditya@infoyashonand.edu, 9822123456&#10;IY-2026-051, Neha Sharma, neha@infoyashonand.edu, 9822123457"
                  value={pdfRawText}
                  onChange={(e) => setPdfRawText(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleParsePdfText}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                <Search size={14} /> Parse & Detect Candidate Records
              </button>

              {parsedPdfCandidates.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#059669', marginBottom: '0.5rem' }}>
                    ✓ Successfully Detected {parsedPdfCandidates.length} Candidates:
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                    <table className="custom-table" style={{ fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Generated Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPdfCandidates.map((c, idx) => (
                          <tr key={idx}>
                            <td><strong>{c.rollNo}</strong></td>
                            <td>{c.fullName}</td>
                            <td>{c.email}</td>
                            <td><code>{c.password}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowPdfModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleConfirmPdfImport}
                disabled={parsedPdfCandidates.length === 0}
                className="btn btn-primary btn-sm"
              >
                Add {parsedPdfCandidates.length} Detected Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
