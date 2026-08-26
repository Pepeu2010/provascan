# Contributing to ProvaScan

Thanks for helping improve ProvaScan. Keep changes focused, reviewable and safe for an education workflow that handles operational data.

## Before you start

For behavioral changes, security-sensitive work or database changes, open an issue first so the scope can be discussed.

## Local setup

```bash
git clone https://github.com/Pepeu2010/provascan.git
cd provascan
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local`.

Never commit `.env.local`, service-role keys, authentication secrets, MFA secrets or real student data.

## Development guidelines

- Keep authorization checks server-side for protected operations.
- Validate untrusted input and avoid trusting client-provided roles or ownership data.
- Keep OCR/OMR uncertainty visible to the user instead of silently accepting ambiguous results.
- Preserve accessibility, responsive behavior and keyboard navigation when changing UI.
- Add or update tests when changing authentication, authorization, OCR, collaborative exams or database behavior.
- Keep database migrations versioned in `supabase/migrations/`.

## Validation

Run the checks relevant to your change. At minimum:

```bash
npm run lint
npx tsc --noEmit
npm run test:security-hardening
npm run build
```

Additional project-specific scripts are documented in the README and `package.json`.

## Pull requests

A good pull request should:

- explain the problem and the chosen solution;
- stay focused on one logical change;
- mention changes to permissions, data access or migrations;
- include screenshots for visible UI changes;
- describe the validation performed;
- avoid unrelated formatting or refactors.

## Security issues

Do not disclose vulnerabilities, credentials or personal data in public issues. Follow `SECURITY.md` for responsible reporting.
