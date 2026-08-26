# Security Policy

## Supported version

Security fixes are applied to the current `main` branch. Older commits, local forks and unofficial deployments are not maintained as supported versions.

## Reporting a vulnerability

Please do **not** publish credentials, personal data, exploit details or a working proof of concept in a public issue.

Preferred reporting flow:

1. Open the repository **Security** tab and use **Report a vulnerability** if private vulnerability reporting is available.
2. Include the affected route, component or file, reproduction conditions, expected impact and any relevant logs with secrets and personal data removed.
3. If private reporting is unavailable, open a minimal public issue asking for a private security contact. Do not include exploit details in that issue.

## What to include

A useful report contains:

- a concise description of the issue;
- affected feature, route or API;
- reproduction steps;
- security impact;
- whether authentication or a specific role is required;
- browser/device details when relevant;
- sanitized evidence such as screenshots or logs.

## Scope

Reports are especially useful for issues involving authentication, authorization, IDOR/BOLA, MFA, session handling, rate limiting, Supabase access, file/image processing, XSS, CSRF, SSRF, sensitive-data exposure and leaked credentials.

## Sensitive data

Never attach real student data, production credentials, service-role keys, authentication secrets, MFA secrets, private keys or `.env` files to an issue or pull request.

Additional implementation notes are available in `SECURITY_AUDIT.md`, `OCR_SECURITY.md`, `SUPABASE_SECURITY.md`, `RLS_POLICIES.md` and `VERCEL_SECURITY.md`.
