# ProvaScan Site Usability Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved ProvaScan usability improvements as functional, tested slices without changing the separate per-student QR work.

**Architecture:** Keep UI orchestration in focused React components and extract deterministic workflow rules into framework-free TypeScript modules. Persist resumable state in versioned browser storage, persist durable template/report metadata through owner-scoped APIs, and use an allowlisted service worker that never caches private API payloads or uploaded images.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres, browser File/Image APIs, service worker/PWA manifest, existing `tsx` verification scripts.

**Spec:** `docs/superpowers/specs/2026-09-14-provascan-site-usability-suite.md`

## Global Constraints

- Preserve the existing OCR answer-review and student-identity confirmation safeguards.
- Do not implement or interfere with per-student QR/ID work.
- Keep advanced features collapsed and the default path understandable without training.
- Add a failing behavior test before each production behavior.
- Use additive migrations only and keep every query owner-scoped.
- Do not cache authenticated API responses, uploaded images, or correction results in the service worker.
- Commit coherent slices; run the full validation matrix before publication.

---

## Task 1: Navigation language and resumable drafts

**Files:** `lib/external-correction-draft.ts`, `scripts/verify-external-correction-draft.ts`, `components/external-correction-workspace.tsx`, `components/dashboard-workspace.tsx`, `components/dashboard-sidebar.tsx`, `components/dashboard-shell.tsx`, `package.json`

- [x] Add a failing draft-contract test covering versioning, expiration, sanitization, and resume labels.
- [x] Implement the draft codec and browser persistence adapter.
- [x] Wire autosave/recovery into the external correction stages without storing file blobs or preview URLs.
- [x] Add **Continuar última correção** and rename the feature to **Corrigir provas**.
- [x] Run the focused test, typecheck, and lint; commit the slice.

## Task 2: Pilot reading, capture quality, and batch reliability

**Files:** `services/capture-quality.ts`, `lib/correction-batch.ts`, `scripts/verify-capture-quality.ts`, `scripts/verify-correction-batch.ts`, `components/external-correction-workspace.tsx`, `package.json`

- [x] Add failing tests for blur/exposure/crop advice and batch state transitions.
- [x] Implement deterministic quality classification and queue transitions.
- [x] Add a first-file pilot step before full-batch processing.
- [x] Show per-file states, failure reasons, and **Tentar falhas novamente**.
- [x] Run focused tests and commit the slice.

## Task 3: Flexible grading and safer identity review

**Files:** `types/universal-exams.ts`, `services/universal-grading-rules.ts`, `lib/student-matching.ts`, `lib/correction-review.ts`, `scripts/verify-universal-grading-rules.ts`, `scripts/verify-student-matching.ts`, `scripts/verify-correction-review.ts`, `components/external-correction-workspace.tsx`, API routes, migration, `package.json`

- [ ] Add failing tests for weights, annulments, multiple-mark policy, subject totals, candidate ranking, duplicate detection, review queue, undo, and audit entries.
- [ ] Implement grading, matching, review, and audit domain modules.
- [ ] Add simple grading-rule controls and subject results.
- [ ] Require confirmation for uncertain identity candidates and surface duplicates in roster order.
- [ ] Persist grading snapshots and review audit data through owner-scoped APIs.
- [ ] Run focused and regression tests; commit the slice.

## Task 4: Template library management

**Files:** `lib/external-template-actions.ts`, `scripts/verify-external-template-actions.ts`, `services/external-exam-service.ts`, `app/api/external-exams/*`, `components/external-correction-workspace.tsx`, migration, `package.json`

- [ ] Add failing tests for rename, favorite, duplicate, archive, and sort-by-last-use semantics.
- [ ] Implement validation and owner-scoped API/service actions.
- [ ] Add a compact template library with archived templates hidden by default.
- [ ] Record last use when a correction starts.
- [ ] Run focused and authorization regressions; commit the slice.

## Task 5: Student CSV import

**Files:** `lib/student-import.ts`, `scripts/verify-student-import.ts`, `contexts/app-data-context.tsx`, `components/management-workspace.tsx`, `package.json`

- [ ] Add a failing test for BOM, delimiter detection, header aliases, row validation, and duplicate handling.
- [ ] Implement the parser and one-shot batch persistence method.
- [ ] Add upload, preview, validation summary, and import confirmation to student management.
- [ ] Run focused tests and commit the slice.

## Task 6: History, export, and reports

**Files:** `lib/external-reporting.ts`, `scripts/verify-external-reporting.ts`, `components/management-workspace.tsx`, `components/external-correction-workspace.tsx`, `package.json`

- [ ] Add failing tests for filters, CSV escaping, question statistics, subject summaries, and comparisons.
- [ ] Implement pure report transforms and safe CSV generation.
- [ ] Add history filters/export and report summaries with honest empty states.
- [ ] Run focused tests and commit the slice.

## Task 7: Print preflight and calibration

**Files:** `lib/print-preflight.ts`, `scripts/verify-print-preflight.ts`, print-related components, `app/globals.css`, `package.json`

- [ ] Add a failing test for paper size, scale warnings, calibration marks, and instruction content.
- [ ] Implement reusable preflight/calibration document builders.
- [ ] Gate print actions behind a clear A4/100% scale check and offer a calibration sheet.
- [ ] Run focused and collaborative-printing regressions; commit the slice.

## Task 8: Easy mode, tutorial, and PWA/offline safety

**Files:** `lib/usability-preferences.ts`, `lib/offline-sync-queue.ts`, focused tests, `components/providers.tsx`, new preference/tutorial components, `app/layout.tsx`, `app/manifest.ts`, `public/sw.js`, `app/globals.css`, `package.json`

- [ ] Read the Next.js metadata/manifest guide before editing framework files.
- [ ] Add failing tests for preference parsing and offline queue retry semantics.
- [ ] Add persistent easy mode, larger targets, sequential tutorial, and collapsed advanced controls.
- [ ] Add an installable manifest and an allowlisted static-shell service worker.
- [ ] Queue safe retryable writes and reconcile them when connectivity returns.
- [ ] Run focused tests, accessibility-oriented browser checks, and commit the slice.

## Task 9: Full verification and publication

- [ ] Run every new focused test and all existing universal/OCR/auth/print regression tests.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Inspect desktop and mobile changed flows; capture evidence and record any manual-verification boundary.
- [ ] Review the complete diff for secrets, generated files, unrelated work, and migration safety.
- [ ] Push the feature branch, open a PR, wait for CI/CodeQL/Vercel, merge, and synchronize local `main`.
