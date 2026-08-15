# Design QA

- Source visual truth: `/home/pepeu/.codex/generated_images/01a005a9-faa3-7c70-b31f-3ea3b8f345f9/exec-68d2b453-f56d-49c1-afc9-9c94c68c3c23.png`
- Intended viewport: desktop, 1440 × 1024.
- Implementation screenshot: unavailable.
- State: released collaborative exam with answer-key preview and print operations.

## Findings

- [P0] Browser-rendered comparison is unavailable.
  - Evidence: `npm run build` cannot start because `next` is absent from `node_modules`; the test runner dependency `tsx` is also absent.
  - Impact: the implementation cannot be captured or compared against the selected reference at the required viewport.
  - Fix: restore/install the repository dependencies, run the application, then capture the Gabaritos route in its released-exam state and rerun design QA.

## Required fidelity surfaces

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: blocked pending rendered capture.
- Colors and visual tokens: implementation uses existing ProvaScan tokens; visual verification is blocked.
- Image quality and asset fidelity: the existing ProvaScan mark remains the brand asset; visual verification is blocked.
- Copy and content: Portuguese operational labels were implemented; rendered verification is blocked.

## Implementation checklist

1. Install dependencies and start the Next application.
2. Open a released collaborative exam at the target viewport.
3. Test gabarito and cartões print actions, selection controls and responsive layout.
4. Capture and compare against the selected reference.

final result: blocked
