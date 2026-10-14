import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus, FileSpreadsheet, FileText, Search, Download,
  Trash2, Check, Upload, FileUp, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../../services/dbService';
import { extractTextFromPdfFile, parseStudentsFromPdfText } from '../../services/pdfHelper';

export const AddUser = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Import Tab: 'manual' | 'excel' | 'pdf'
  const [activeImportMode, setActiveImportMode] = useState('manual');

  // Manual Form (PRN Number + Student Name only)
  const [manualForm, setManualForm] = useState({
    fullName: '',
    prnNumber: ''
  });

  // Excel Preview
  const [excelPreview, setExcelPreview] = useState([]);

  // PDF Import State
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [uploadedPdfFileName, setUploadedPdfFileName] = useState('');
  const pdfFileInputRef = useRef(null);

  // PDF / Text Parser
  const [docRawText, setDocRawText] = useState('');
  const [parsedDocCandidates, setParsedDocCandidates] = useState([]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const list = await dbService.getStudents();
    setStudents(list);
    setLoading(false);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.fullName.trim() || !manualForm.prnNumber.trim()) {
      alert('Student Name and PRN Number are required.');
      return;
    }

    const prn = manualForm.prnNumber.trim().toUpperCase();
    const payload = {
      fullName: manualForm.fullName.trim(),
      rollNo: prn
    };

    try {
      await dbService.addStudent(payload);
      setManualForm({
        fullName: '',
        prnNumber: ''
      });
      await loadStudents();
      alert(`Candidate ${payload.fullName} (${prn}) successfully registered!`);
    } catch (err) {
      alert('Failed to register student: ' + err.message);
    }
  };

  // Excel File Upload
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          alert('Excel sheet seems empty or lacks a header row.');
          return;
        }

        const headers = json[0].map((h) => String(h).trim().toLowerCase());
        const prnIdx = headers.findIndex((h) => h.includes('prn') || h.includes('roll') || h.includes('id'));
        const nameIdx = headers.findIndex((h) => h.includes('name'));

        const parsed = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || !row[0]) continue;

          const prnNumber = prnIdx !== -1 && row[prnIdx] ? String(row[prnIdx]).trim() : `PRN-${String(students.length + i).padStart(4, '0')}`;
          const fullName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : `Candidate ${i}`;

          parsed.push({
            rollNo: prnNumber.toUpperCase(),
            fullName
          });
        }

        setExcelPreview(parsed);
      } catch (err) {
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveExcelCandidates = async () => {
    if (excelPreview.length === 0) return;
    try {
      await dbService.bulkAddStudents(excelPreview);
      setExcelPreview([]);
      await loadStudents();
      alert('Excel candidates registered successfully!');
    } catch (err) {
      alert('Failed to save Excel candidates: ' + err.message);
    }
  };

  // PDF Direct File Upload & Parse
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedPdfFileName(file.name);
    setIsReadingPdf(true);

    try {
      const extractedText = await extractTextFromPdfFile(file);
      if (extractedText && extractedText.trim()) {
        const detected = parseStudentsFromPdfText(extractedText);
        if (detected.length > 0) {
          setParsedDocCandidates(detected);
          setDocRawText(extractedText);
          alert(`Success! Extracted ${detected.length} candidate(s) from "${file.name}". Please review and click "Register & Save All Users".`);
        } else {
          alert('Could not detect student PRN and Name rows automatically from this PDF. The extracted text has been placed below for manual review.');
          setDocRawText(extractedText);
        }
      } else {
        alert('Could not extract readable text from this PDF file. Please ensure it contains selectable text.');
      }
    } catch (err) {
      console.error('PDF extraction failed:', err);
      alert('Failed to read PDF file: ' + err.message);
    } finally {
      setIsReadingPdf(false);
    }
  };

  // Remove single candidate from preview
  const handleRemovePreviewCandidate = (idxToRemove) => {
    setParsedDocCandidates((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // PDF & Text Roster Parser
  const handleParseDocumentRoster = () => {
    if (!docRawText.trim()) {
      alert('Please enter or paste candidate roster text.');
      return;
    }

    const detected = parseStudentsFromPdfText(docRawText);
    if (detected.length > 0) {
      setParsedDocCandidates(detected);
      alert(`Detected ${detected.length} candidate(s) from roster text!`);
    } else {
      alert('No student records recognized from the provided text. Please ensure lines contain PRN and Name.');
    }
  };

  const handleSaveDocCandidates = async () => {
    if (parsedDocCandidates.length === 0) return;
    try {
      await dbService.bulkAddStudents(parsedDocCandidates);
      const count = parsedDocCandidates.length;
      setParsedDocCandidates([]);
      setDocRawText('');
      setUploadedPdfFileName('');
      await loadStudents();
      alert(`Success! Successfully registered ${count} candidate(s) into the database!`);
    } catch (err) {
      console.error('Save candidates error:', err);
      alert('Failed to save candidates: ' + err.message);
    }
  };

  const downloadExcelTemplate = () => {
    const sample = [
      {
        'PRN_Number': 'PRN-2026-101',
        'Student_Name': 'Aditya Verma'
      },
      {
        'PRN_Number': 'PRN-2026-102',
        'Student_Name': 'Ananya Joshi'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Template');
    XLSX.writeFile(wb, 'ITPL_Student_PRN_Import_Template.xlsx');
  };

  const handleExportAllUsers = () => {
    const data = students.map((s) => ({
      'PRN Number': s.rollNo,
      'Student Name': s.fullName,
      'Date Registered': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Directory');
    XLSX.writeFile(wb, `ITPL_Student_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Delete this student from database?')) {
      await dbService.deleteStudent(id);
      loadStudents();
    }
  };

  const filtered = students.filter((s) => {
    return (
      (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.rollNo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>2. Add Users & Student Directory</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Register students with Name & PRN Number. Candidates use their PRN Number to log in and take tests.
          </p>
        </div>

        <button onClick={handleExportAllUsers} className="btn btn-secondary btn-sm">
          <Download size={14} /> Export Student Directory (Excel)
        </button>
      </div>

      {/* IMPORT METHOD SELECTOR TABS */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setActiveImportMode('manual')}
            className={`btn btn-sm ${activeImportMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <UserPlus size={14} /> Add Manually
          </button>
          <button
            onClick={() => setActiveImportMode('excel')}
            className={`btn btn-sm ${activeImportMode === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileSpreadsheet size={14} color="#16a34a" /> Upload via Excel
          </button>
          <button
            onClick={() => setActiveImportMode('pdf')}
            className={`btn btn-sm ${activeImportMode === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText size={14} color="#dc2626" /> Upload via PDF
          </button>
        </div>

        {/* TAB 1: ADD MANUALLY */}
        {activeImportMode === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Student Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Jadhav"
                  className="form-control"
                  value={manualForm.fullName}
                  onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Student PRN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IY-2026-005"
                  className="form-control"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  value={manualForm.prnNumber}
                  onChange={(e) => setManualForm({ ...manualForm, prnNumber: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                <UserPlus size={14} /> Register Student
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: EXCEL UPLOAD */}
        {activeImportMode === 'excel' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                Upload <code>.xlsx</code> or <code>.csv</code> spreadsheet with Student Name and PRN Number.
              </span>
              <button onClick={downloadExcelTemplate} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                <Download size={13} /> Download Template
              </button>
            </div>

            <div style={{ border: '2px dashed #cbd5e1', padding: '1.5rem', textAlign: 'center', borderRadius: '10px', background: '#f8fafc', marginBottom: '1rem' }}>
              <Upload size={32} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
            </div>

            {excelPreview.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#16a34a' }}>
                    {excelPreview.length} Candidates Detected from Excel
                  </span>
                  <button onClick={handleSaveExcelCandidates} className="btn btn-success btn-sm">
                    <Check size={14} /> Confirm & Save All Candidates
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD VIA PDF */}
        {activeImportMode === 'pdf' && (
          <div>
            {/* Real File Input & Dropzone for PDF */}
            <div style={{
              background: '#ffffff',
              border: '2px dashed #ef4444',
              borderRadius: '12px',
              padding: '1.75rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="file"
                ref={pdfFileInputRef}
                accept=".pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
                id="pdfUserFileInput"
              />
              <label htmlFor="pdfUserFileInput" style={{ cursor: 'pointer', display: 'block' }}>
                <FileUp size={40} color="#dc2626" style={{ margin: '0 auto 0.6rem' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#991b1b', marginBottom: '4px' }}>
                  Click to Browse & Select Student Roster PDF (.pdf)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Supports PDF rosters containing Candidate Names and PRN / Roll Numbers
                </div>
              </label>

              {isReadingPdf && (
                <div style={{ marginTop: '0.85rem', color: '#dc2626', fontWeight: 700, fontSize: '0.875rem' }}>
                  ⏳ Reading & Extracting candidate roster from PDF... Please wait.
                </div>
              )}

              {uploadedPdfFileName && !isReadingPdf && (
                <div style={{ marginTop: '0.85rem', color: '#059669', fontWeight: 700, fontSize: '0.875rem' }}>
                  ✓ Selected PDF File: <strong>{uploadedPdfFileName}</strong>
                </div>
              )}
            </div>

            {/* PREVIEW OF CANDIDATES DETECTED FROM PDF */}
            {parsedDocCandidates.length > 0 && (
              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                      ✓ {parsedDocCandidates.length} Candidates Detected from PDF
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      (Verify candidates below before saving to database)
                    </span>
                  </div>

                  <button
                    onClick={handleSaveDocCandidates}
                    className="btn btn-success btn-sm"
                    style={{ fontWeight: 800 }}
                  >
                    <Check size={14} /> Register & Save All {parsedDocCandidates.length} Users
                  </button>
                </div>

                {/* Candidate Preview Table */}
                <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table className="custom-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>PRN Number</th>
                        <th>Candidate Full Name</th>
                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedDocCandidates.map((c, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong style={{ color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>{c.rollNo}</strong>
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.fullName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemovePreviewCandidate(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              title="Remove candidate"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Collapsible / Optional Text Paste Alternative */}
            <details style={{ marginTop: '0.5rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <summary style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                Or Paste / Edit PDF Roster Text Directly
              </summary>
              <div style={{ marginTop: '0.75rem' }}>
                <textarea
                  className="form-control"
                  style={{ minHeight: '110px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '0.75rem' }}
                  placeholder={`Paste text from PDF here... e.g.\n1. IY-2026-101 Aarav Patil\n2. IY-2026-102 Pooja Shinde`}
                  value={docRawText}
                  onChange={(e) => setDocRawText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleParseDocumentRoster}
                  className="btn btn-secondary btn-sm"
                >
                  <Search size={14} /> Extract Candidates from Text
                </button>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* SEARCH AND REGISTERED USERS TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Registered Users & PRN Directory ({filtered.length})</h3>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search Student Name / PRN..."
              className="form-control"
              style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.825rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>PRN Number</th>
                <th>Student Full Name</th>
                <th style={{ width: '160px' }}>Date Added</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading user directory...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No registered students found. Add students above using manual entry, Excel, or PDF.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e3a8a', fontSize: '0.9rem' }}>
                        {s.rollNo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.fullName}</div>
                    </td>
                    <td>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteStudent(s.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
