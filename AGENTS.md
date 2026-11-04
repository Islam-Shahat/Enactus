Create AGENTS.md at the repo root with the following project rules, then confirm you will follow them in every task.

PROJECT: Student-activity platform (Enactus Qena). One React + Vite SPA containing a public website (Arabic RTL default, English secondary) and an internal dashboard under /dashboard/*. Backend is Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Free-tier hosting (Vercel + Supabase). Single branch, single tenant, one developer.

SOURCE OF TRUTH: supabase/migrations/*.sql (schema + RLS), docs/SETUP.md (RBAC matrix, setup). Read them before touching anything.

RULES:

1. Never edit existing migration files. The 6 existing migrations are already applied to the dev project; any new migration must be a NEW timestamped migration file with a timestamp later than 20261031151827 and must never edit these six. Every new table: RLS enabled, explicit policies, explicit GRANTs, indexes on foreign keys. Never run `supabase db push`, `db reset`, or any command that changes the remote database unless I ask explicitly in that message.
2. Never put the service_role/secret key anywhere in frontend code or any VITE_ variable. It is only used inside Edge Functions via secrets.
3. Authorization is enforced by RLS, not by the UI. UI role checks (RoleGuard, hasRole) are convenience only.
4. Use the existing patterns: src/lib/supabase.js, src/context/AuthContext.jsx, src/services/*, src/hooks/* (React Query), withFallback() mock fallback for public pages.
5. Inspect the existing styling approach (Tailwind or plain CSS), ThemeContext, fonts (Cairo/Cinzel/Outfit) and the dark+gold design, and MATCH them. Do not add a new UI library unless I approve it.
6. Everything must work in RTL and LTR, dark and light themes, and mobile-first. Never hardcode text: use the i18n layer once it exists.
7. Dashboard routes are lazy-loaded (React.lazy) so public visitors do not download dashboard code.
8. Money uses numeric(12,2). Points are an append-only ledger (void, never delete).
9. Pin dependency versions, commit lockfiles, keep the code in plain JS/JSX (no TypeScript migration) unless I say otherwise.
10. Do not touch unrelated files. After each task: run `npm run build` and the linter, fix errors, and give a short summary of changed files and anything I must do manually.
11. If a requirement is ambiguous or a decision is mine (e.g., who confirms payments), STOP and ask instead of guessing.
12. DB BOUNDARY: never apply SQL to any remote database, never deploy Edge Functions, never set secrets, never run supabase db push/reset/link or functions deploy. You MAY write migration files (new timestamp later than the last existing one; never edit existing ones) and Edge Function source. Every phase ends with a HAND-OFF block listing: (a) new migration file names, (b) Edge Functions to deploy with their verify_jwt setting, (c) secret NAMES required (never values), (d) manual dashboard steps for me. After the HAND-OFF, stop; I will confirm when it is applied.
13. EDGE FUNCTIONS: Deno runtime in supabase/functions/<name>/index.ts, shared code in supabase/functions/_shared. Read the current Supabase docs before writing; do not guess APIs. Validate every input with zod; limit CORS to SITE_ORIGINS; never trust client-provided ids for season, status, role or user; use the service role only inside functions; return generic errors; never log secrets or personal data.
14. DASHBOARD UI: reuse the components in src/components/dashboard (DataTable, StatCard, ConfirmDialog, StatusBadge, Drawer, Skeleton, EmptyState). Every page has loading, empty, error and forbidden states. Server-side pagination with range() for lists that can grow. Mutations use React Query with cache invalidation. Role checks only through RoleGuard/hasRole. All user-facing text lives in src/lib/strings.js as ar/en.
15. TESTS: pure logic (validators, token/HMAC helpers, nav filters, adapters) gets vitest unit tests (add vitest once, exact-pinned, dev only).
16. REPORT FORMAT: every phase ends with FINAL REPORT (files added/changed, what could not be verified, bundle chunk table if the main chunk changed) and the HAND-OFF block.
