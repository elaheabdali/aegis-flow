# AegisFlow — Real-Time Financial Fraud Detection & Risk Telemetry Workbench

**AegisFlow** is a production-grade, high-density FinTech telemetry and fraud investigation workbench built with **Next.js 16 (App Router)**, **Strict TypeScript**, **Dedicated Web Workers**, **Tailwind CSS v4**, and **Framer Motion**.

Designed for risk analysts and financial compliance teams, AegisFlow processes live transaction streams off the main thread at **60fps**, isolates sensitive Personally Identifiable Information (PII) behind an immutable audit trail, and executes multi-step Suspicious Activity Report (SAR) filings with optimistic state synchronization and deterministic error rollbacks.

---

## Key Engineering & Architectural Highlights

### 1. Off-Thread Telemetry & 60fps Virtualized Grid
- **Dedicated Web Worker (`risk-engine.worker.ts`):** All heuristic fraud scoring (impossible travel velocity, burst rate detection, high-risk MCC classification, amount spike anomalies) and live search filtering run inside a background Web Worker, keeping the browser's main UI thread unblocked.
- **Deterministic Stream Freeze & Queue Buffer:** Clicking any row or pressing `Space` freezes the live feed immediately so rows never shift underneath an analyst's cursor, while incoming events buffer cleanly into a `pendingQueue` badge until resumed.
- **ARIA Grid Virtualization (`@tanstack/react-virtual`):** Renders thousands of live rows in a ring buffer (`1,500` active + `500` queued) with full WAI-ARIA grid semantics and keyboard navigation (`↑` / `↓`, `Enter`, `Space`, `Esc`).

### 2. Enterprise Security & Compliance Controls
- **Audit-Logged PII Masking:** Primary Account Numbers (PAN) and full IP addresses are masked by default. Revealing sensitive fields requires an explicit user action that appends an immutable `PII_UNMASKED` entry to the session audit log.
- **Role-Based Access Control (RBAC):** Instant role switcher (`Senior Investigator` vs. `Junior Analyst`) demonstrating privilege enforcement on account-freezing actions.
- **Defense-in-Depth Headers & Sanitization:** Enforces `Content-Security-Policy (CSP)`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, custom CSRF headers (`x-aegis-csrf`) on BFF Route Handlers (`/api/sar`), and XSS narrative sanitization.

### 3. Multi-Step SAR Wizard with Optimistic UI & Fault Injection
- **4-Step Validated Workflow (`React Hook Form` + `Zod`):** Features conditional schema validation (`superRefine`) based on fraud typology (`Impossible Geo-Travel`, `Account Takeover`, etc.) and mandatory AML/KYC compliance attestations.
- **Optimistic UI + Deterministic Rollback (`TanStack Query`):** Immediately updates transaction status in the live grid upon submission, with a built-in **Resilience Fault Simulator** (`200 OK`, `500 Server Error`, `Gateway Timeout`) to verify automatic state rollback on failure.

### 4. Bilingual (`EN` / `FA`), Native `RTL` / `LTR` & Accessible Motion Design
- **CSS Logical Properties:** Built exclusively with logical spacing and positioning (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) for seamless mirroring between English (`LTR`) and Persian (`RTL`).
- **WCAG 2.1 AA Dark/Light Design Tokens:** High-contrast semantic CSS variables paired with GPU-composited Framer Motion springs wrapped in `<MotionConfig reducedMotion="user">`.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, SSR, Route Handlers, Proxy Middleware)
- **Language:** TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`, zero `any`)
- **Styling & Motion:** Tailwind CSS v4, Framer Motion, Lucide Icons, `next-themes`
- **State & Data:** Zustand (Ring Buffer & Audit Store), TanStack Query, TanStack Virtual
- **Validation:** React Hook Form + Zod
- **Testing & CI:** Vitest, React Testing Library, Playwright E2E, GitHub Actions

---

## Local Setup & Verification

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Run strict TypeScript type-checking
npm run typecheck

# 4. Run unit & integration tests (Vitest + RTL)
npm run test

# 5. Run end-to-end tests (Playwright)
npm run test:e2e