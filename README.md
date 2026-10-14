<<<<<<< HEAD
# Aptitude_itpl
=======
# INFOYASHONAND TECHNOLOGY PVT. LTD.
## Placement Cell & Secure Proctor Assessment Portal

A proctored Aptitude & Technical Assessment Platform built with **React.js** and **Supabase** backend integration.

---

### 🌟 Key Features

#### 1. Placement Cell Admin Panel
- **Candidate / Student Management**:
  - Add candidates **Manually** (Roll No, Full Name, Email, Password, Branch, Batch, Phone).
  - Bulk import candidates via **Excel Sheet (`.xlsx`, `.csv`)** with pre-configured template download.
  - Smart Candidate Extractor from **PDF / Document Text** with regex parsing.
  - Admin creates & manages student **Login IDs & Passwords** with auto-generate strong passwords, credential copy cards, and Excel export.
- **Assessment & Timer Configuration**:
  - Set test duration in minutes (custom countdown timer).
  - Configure passing percentage, total marks, and negative marking.
  - Configure maximum proctor strikes before automatic lock.
- **Question Bank with Dedicated Code Space**:
  - Standard Aptitude MCQs (Quantitative, Logical Reasoning, Verbal).
  - **Programming & Technical Code Snippets**: dedicated code editor with language selector (C, C++, Java, Python, JavaScript, SQL) and syntax-highlighted display with line numbers.
- **Live Proctor & Security Desk**:
  - Real-time audit log of student security violations (browser back navigation, tab switches, copy/paste attempts).
- **Results & Performance Analytics**:
  - Scores, percentages, pass/fail status, violation counts, and 1-click **Excel Export**.

#### 2. Candidate / Student Portal (High Security)
- **Candidate Login**: Sign in using Roll ID or Email and password set by Admin.
- **Strict Anti-Cheating & Proctoring**:
  - 🚫 **Ctrl+C & Ctrl+V Blocked**: Clipboard copy, cut, paste, right-click context menu, and keyboard shortcuts (`Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+U`, `F12`) are blocked.
  - ⚠️ **Browser Back Button Trap (2 Warnings Rule)**:
    - Strike 1: Warning dialog appears.
    - Strike 2: Final Warning dialog appears.
    - Strike 3 (or continued back navigation): Test is **automatically terminated and submitted**.
  - ⏱️ **Admin-Configured Timer**: Live synchronized countdown; automatically auto-submits when time expires (`00:00`).
  - 📹 **Live Webcam Proctor**: Real-time corner camera preview with AI face centering indicator.
  - 🖥️ **Mandatory Fullscreen**: Exiting fullscreen logs an infraction.
  - 🛡️ **Anti-Screenshot Watermark**: Dynamically overlays candidate Roll No across the test interface.

---

### 🚀 Getting Started

#### 1. Install & Run Locally
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The portal runs on `http://127.0.0.1:5174/` (or `http://localhost:5173/`).

---

### 🗄️ Supabase Backend Setup

1. Create a project at [https://supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard.
3. Open the file `supabase_schema.sql` located in this project root and run it in the Supabase SQL Editor. It will create all tables:
   - `admins`
   - `students`
   - `tests`
   - `questions`
   - `test_attempts`
   - `proctor_logs`
4. Add your Supabase credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   *(Or click the "Supabase Settings" button directly inside the Admin portal to configure credentials dynamically without restarting).*

> **Note**: Even without Supabase connected, the application has a built-in Safe Offline Storage layer with seed data, ensuring zero downtime and complete functionality out of the box!

---

### 🔑 Default Credentials

- **Admin Account**:
  - Email: `shivmane@gmail.com` (or `admin@infoyashonand.com`)
  - Password: `admin123`
- **Candidate Account**:
  - Student ID: `IY-2026-001`
  - Password: `Aarav@2026`
>>>>>>> 658c80e (Complete Aptitude Assessment & Proctoring System with Supabase integration)
