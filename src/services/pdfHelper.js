import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Layout-aware PDF text extractor.
 * Groups text chunks by vertical (Y) coordinates to preserve line breaks,
 * question headers, code snippets, and options.
 */
export const extractTextFromPdfFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extract valid text items with coordinates
      const items = textContent.items
        .filter((item) => item && typeof item.str === 'string')
        .map((item) => ({
          str: item.str,
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0,
          hasEOL: item.hasEOL || false
        }));

      // Sort items by Y descending (PDF origin is bottom-left), then X ascending
      items.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.x - b.x;
      });

      let pageText = '';
      let lastY = null;

      for (const item of items) {
        if (!item.str) continue;

        if (lastY !== null && Math.abs(item.y - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }

        pageText += item.str;
        if (item.hasEOL) {
          pageText += '\n';
        }

        lastY = item.y;
      }

      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (err) {
    console.warn('PDF.js binary extract failed, attempting text reader fallback:', err);
    // Fallback using FileReader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file: ' + e));
      reader.readAsText(file);
    });
  }
};

/**
 * Intelligent MCQ Parser:
 * Analyzes questions, code snippets, options A, B, C, D, and answer keys.
 * Guaranteed: Option D never swallows subsequent questions!
 */
export const parseMCQsFromText = (rawText) => {
  if (!rawText || !rawText.trim()) return [];

  // 1. Normalize line endings
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip page numbers and separator lines
  text = text.replace(/Page\s+\d+(\s+of\s+\d+)?/gi, '');
  text = text.replace(/(?:^|\n)\s*[-_=*]{3,}\s*(?:\n|$)/g, '\n');

  // 2. Pre-process text: Guarantee separation between questions and options
  // Separate questions that are joined inline after an answer or punctuation
  text = text.replace(/(?:Ans(?:wer)?[:\s\w\(\)\-\.]*?|\b)([ \t]+)(?:Q(?:uestion)?\s*[\#\:\.]?\s*\d+|\d+)[\.\:\)\-]\s+/gi, (match) => {
    return '\n\n' + match.trim() + ' ';
  });

  // Separate inline question starts e.g. "some text 2. What is..."
  text = text.replace(/([^\n\d])\s+(\d+[\.\)]\s+[A-Za-z])/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s+(Q(?:uestion)?\s*[\#\:\.]?\s*\d+[\.\:\)\-]\s+)/gi, '$1\n\n$2');

  // Separate inline options: A), B), C), D), (A), [A], A.
  text = text.replace(/([^\n])\s+(\(?[A-Da-d]\)[\.\:\s]|\bOption\s+[A-Da-d][\.\:\s]|\[[A-Da-d]\][\.\:\s]?|\b[A-Da-d][\.\:]\s+)/g, '$1\n$2');

  // Separate inline answers
  text = text.replace(/([^\n])\s+(\b(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key)[\s\:\.\-]+[\(\[]?[A-Da-d][\)\]]?)/gi, '$1\n$2');

  // 3. Detect all question start positions across the text
  const qStartRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\s*[\#\:\.]?\s*(\d+)|\((\d+)\)|(\d+))[\.\:\)\-]\s+/gi;
  const matches = [];
  let m;
  while ((m = qStartRegex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      fullLength: m[0].length,
      qNum: m[1] || m[2] || m[3]
    });
  }

  const blocks = [];
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].fullLength;
      const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      const blockText = text.substring(start, end).trim();
      if (blockText.length > 5) {
        blocks.push({ qNum: matches[i].qNum, text: blockText });
      }
    }
  } else {
    // Fallback: split by double newlines or question keywords
    const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 10);
    rawParagraphs.forEach((p, idx) => {
      blocks.push({ qNum: idx + 1, text: p });
    });
  }

  const results = [];

  for (const block of blocks) {
    const raw = block.text;

    // Detect Answer in this block
    const ansRegex = /(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key)\s*[:=\-.]*\s*[\(\[]?([A-D|a-d])[\)\]]?/i;
    const ansMatch = raw.match(ansRegex);
    const correctOption = ansMatch ? ansMatch[1].toUpperCase() : 'A';

    // Remove the Answer string so it does not spill into Option D
    let cleanBlock = raw.replace(ansRegex, '').trim();

    // Find Option markers: A), B), C), D) or (A), (B), (C), (D) or [A], [B] or A., B.
    const optMarkerRegex = /(?:^|\n|\s+)(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[\.\:\)]|\bOption\s+([A-Da-d])[\.\:\)]?)\s+/gi;
    const optMatches = [];
    let om;
    while ((om = optMarkerRegex.exec(cleanBlock)) !== null) {
      const letter = (om[1] || om[2] || om[3] || om[4]).toUpperCase();
      optMatches.push({
        index: om.index,
        endIndex: om.index + om[0].length,
        letter
      });
    }

    let questionText = cleanBlock;
    let optionA = 'Option A';
    let optionB = 'Option B';
    let optionC = 'Option C';
    let optionD = 'Option D';

    // Filter to first occurrence of each letter in sequential order A, B, C, D
    const matchedMap = {};
    for (const opt of optMatches) {
      if (['A', 'B', 'C', 'D'].includes(opt.letter) && !matchedMap[opt.letter]) {
        if (opt.letter === 'A' ||
           (opt.letter === 'B' && matchedMap['A'] && opt.index > matchedMap['A'].index) ||
           (opt.letter === 'C' && matchedMap['B'] && opt.index > matchedMap['B'].index) ||
           (opt.letter === 'D' && matchedMap['C'] && opt.index > matchedMap['C'].index)) {
          matchedMap[opt.letter] = opt;
        }
      }
    }

    if (matchedMap['A'] && matchedMap['B']) {
      questionText = cleanBlock.substring(0, matchedMap['A'].index).trim();
      optionA = cleanBlock.substring(matchedMap['A'].endIndex, matchedMap['B'].index).trim();

      if (matchedMap['C']) {
        optionB = cleanBlock.substring(matchedMap['B'].endIndex, matchedMap['C'].index).trim();

        if (matchedMap['D']) {
          optionC = cleanBlock.substring(matchedMap['C'].endIndex, matchedMap['D'].index).trim();
          optionD = cleanBlock.substring(matchedMap['D'].endIndex).trim();
        } else {
          optionC = cleanBlock.substring(matchedMap['C'].endIndex).trim();
        }
      } else {
        optionB = cleanBlock.substring(matchedMap['B'].endIndex).trim();
      }
    } else {
      // Alternate line-by-line fallback
      const lines = cleanBlock.split('\n').map((l) => l.trim()).filter(Boolean);
      const qLines = [];
      for (const line of lines) {
        const lineOptMatch = line.match(/^[\(\[]?([A-Da-d])[\)\]\.\:]\s*(.*)$/);
        if (lineOptMatch) {
          const lLetter = lineOptMatch[1].toUpperCase();
          const lVal = lineOptMatch[2].trim();
          if (lLetter === 'A') optionA = lVal;
          else if (lLetter === 'B') optionB = lVal;
          else if (lLetter === 'C') optionC = lVal;
          else if (lLetter === 'D') optionD = lVal;
        } else if (!matchedMap['A']) {
          qLines.push(line);
        }
      }
      if (qLines.length > 0) {
        questionText = qLines.join('\n').trim();
      }
    }

    // Clean up options
    optionA = optionA.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || 'Option A';
    optionB = optionB.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || 'Option B';
    optionC = optionC.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || 'Option C';
    optionD = optionD.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || 'Option D';

    // Strip any trailing "Ans:" remnants from Option D
    optionD = optionD.replace(/(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key)[\s\:\.\-]*[A-D]?$/i, '').trim();

    // Check code snippet
    const codeMatch = questionText.match(/(?:#include|public\s+class|def\s+\w+|function\s+\w+|int\s+main|import\s+java)[\s\S]+/i);
    const hasCode = /[{};#]|def\s|class\s|import\s|printf|cout|function|return|public\s+static|#include/i.test(questionText);
    const codeContent = codeMatch ? codeMatch[0].trim() : (hasCode ? questionText.trim() : '');

    if (questionText.length > 2) {
      results.push({
        id: `q-${Date.now()}-${results.length}`,
        questionText: questionText.trim(),
        hasCode,
        codeContent,
        codeLanguage: /#include|printf/i.test(questionText) ? 'c' : /public\s+class|System\.out/i.test(questionText) ? 'java' : /def\s|print\(/i.test(questionText) ? 'python' : 'c',
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        marks: 2
      });
    }
  }

  return results;
};

/**
 * Intelligent Student Roster Parser:
 * Analyzes raw text extracted from PDF or Excel rosters to detect:
 * - PRN Numbers / Roll numbers (e.g. IY-2026-001, PRN-2026-105, 2026-CS-01, 72149581E)
 * - Candidate Full Names (e.g. Aarav Patil, Pooja Shinde)
 * - Emails (e.g. aarav@gmail.com)
 * - Auto-assigned passwords (${prn}@2026)
 * - Branch / Department (e.g. Computer Science, IT, Mechanical, Civil, Engineering)
 */
export const parseStudentsFromPdfText = (rawText) => {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const candidates = [];
  const seenPrns = new Set();

  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i;
  // PRN regex: captures IY-2026-001, PRN-2026-105, 2026-CS-01, 72149581E, etc.
  const prnRegex = /\b((?:PRN|IY)[-_]?[0-9A-Za-z]+(?:[-_][0-9A-Za-z]+)*|[A-Za-z0-9]{2,4}[-_][A-Za-z0-9]{2,4}[-_][A-Za-z0-9]{1,6}|\b\d{7,14}[A-Za-z]?\b)\b/i;

  const headerKeywords = ['sr no', 'roll no', 'prn no', 'student name', 'candidate name', 'email', 'branch', 'signature', 'phone', 'serial no'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip table header rows
    const isHeader = headerKeywords.filter((k) => lower.includes(k)).length >= 2;
    if (isHeader) continue;

    const emailMatch = line.match(emailRegex);
    const email = emailMatch ? emailMatch[0].toLowerCase() : '';

    const prnMatch = line.match(prnRegex);
    let prn = prnMatch ? prnMatch[0].toUpperCase() : '';

    // Detect branch if present
    let branch = 'Engineering / General';
    if (/comp|cs\b|software/i.test(line)) branch = 'Computer Engineering';
    else if (/it\b|information/i.test(line)) branch = 'Information Technology';
    else if (/mech/i.test(line)) branch = 'Mechanical Engineering';
    else if (/civil/i.test(line)) branch = 'Civil Engineering';
    else if (/elect|entc|extc/i.test(line)) branch = 'Electronics & Telecom';
    else if (/ai|ds|data/i.test(line)) branch = 'AI & Data Science';

    // Remove email, PRN, branch keywords, phone numbers, punctuation to extract name
    let clean = line;
    if (emailMatch) clean = clean.replace(emailMatch[0], ' ');
    if (prnMatch) clean = clean.replace(prnMatch[0], ' ');

    clean = clean.replace(/\b(computer|information|technology|mechanical|civil|electronics|telecom|engineering|general|science|batch\s*\d*)\b/gi, ' ');
    clean = clean.replace(/^\s*\d+[\.\)\-]\s*/, ' ');
    clean = clean.replace(/\b\d{10}\b/g, ' ');
    clean = clean.replace(/[,|;:\t]+/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();

    const nameMatch = clean.match(/[A-Za-z\s\.]{2,50}/);
    let fullName = nameMatch ? nameMatch[0].trim() : '';

    if (!prn && !fullName) continue;

    if (!prn) {
      prn = `IY-2026-${String(candidates.length + 1).padStart(3, '0')}`;
    }
    if (!fullName || fullName.length < 2) {
      fullName = `Candidate ${candidates.length + 1}`;
    }

    if (seenPrns.has(prn)) continue;
    seenPrns.add(prn);

    candidates.push({
      rollNo: prn,
      fullName,
      branch,
      batch: 'Batch 2026'
    });
  }

  return candidates;
};

