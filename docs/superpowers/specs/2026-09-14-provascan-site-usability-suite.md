# ProvaScan Site Usability Suite Specification

## Outcome

Turn the current universal correction flow into a guided, recoverable workflow that a teacher can use without training, while preserving the existing OCR, identity-confirmation, authorization, and persistence contracts.

## Product principles

- Use plain Brazilian Portuguese and one dominant action per step.
- Keep advanced controls available, but collapsed by default.
- Never hide uncertain OCR: warn, show candidates, and require confirmation.
- Never lose work: drafts are versioned locally and sync is retried when connectivity returns.
- Let the teacher validate one page before spending time on an entire batch.
- Prefer resumable, reversible operations over destructive actions.

## Functional scope

1. Rename the primary feature to **Corrigir provas** in navigation, dashboard, and command search.
2. Add local autosave, draft recovery, and **Continuar última correção**.
3. Add a pilot read for the first file, including capture-quality warnings.
4. Add a batch queue with visible states and retry of failed items only.
5. Support weighted and annulled questions, multiple-mark policy, and subject summaries.
6. Add favorite, duplicate, rename, archive, and last-used metadata for templates.
7. Import students from CSV with preview, validation, and duplicate protection.
8. Match OCR names against the roster, surface candidates and duplicates, and preserve roster order.
9. Add a unified review queue, undo, and a manual-edit audit trail.
10. Add history filters, CSV export, subject/question summaries, and comparisons.
11. Add print preflight, a calibration page, scale warnings, and a short instruction sheet.
12. Add an easy-use preference, larger controls, a guided tutorial, and advanced sections collapsed by default.
13. Make the app installable and safely cache only its static shell; keep drafts and sync jobs locally.

## Out of scope

- Per-student QR or ID generation, because it is being implemented separately.
- Fabricating a student match when OCR confidence is insufficient.
- Remote Supabase migration execution without valid project credentials.
- Offline OCR libraries or remote API responses that have not already been cached.

## Acceptance criteria

- Each new domain behavior is covered by a focused executable test.
- Existing universal correction, OCR, authorization, and print tests remain green.
- TypeScript, ESLint, production build, and `git diff --check` pass.
- Mobile layouts avoid overlap and horizontal overflow in the changed screens.
- The service worker does not cache authenticated API responses or correction images.
