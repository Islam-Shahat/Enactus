Create AGENTS.md at the repo root with the following project rules, then confirm you will follow them in every task.

PROJECT: Student-activity platform (Enactus Qena). One React + Vite SPA containing a public website (Arabic RTL default, English secondary) and an internal dashboard under /dashboard/\*. Backend is Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Free-tier hosting (Vercel + Supabase). Single branch, single tenant, one developer.

SOURCE OF TRUTH: supabase/migrations/\*.sql (schema + RLS), docs/SETUP.md (RBAC matrix, setup). Read them before touching anything.

RULES:

1. Never edit existing migration files. Every schema change = a NEW timestamped migration (after 20261101000006). Every new table: RLS enabled, explicit policies, explicit GRANTs, indexes on foreign keys.
2. Never put the service*role/secret key anywhere in frontend code or any VITE* variable. It is only used inside Edge Functions via secrets.
3. Authorization is enforced by RLS, not by the UI. UI role checks (RoleGuard, hasRole) are convenience only.
4. Use the existing patterns: src/lib/supabase.js, src/context/AuthContext.jsx, src/services/_, src/hooks/_ (React Query), withFallback() mock fallback for public pages.
5. Inspect the existing styling approach (Tailwind or plain CSS), ThemeContext, fonts (Cairo/Cinzel/Outfit) and the dark+gold design, and MATCH them. Do not add a new UI library unless I approve it.
6. Everything must work in RTL and LTR, dark and light themes, and mobile-first. Never hardcode text: use the i18n layer once it exists.
7. Dashboard routes are lazy-loaded (React.lazy) so public visitors do not download dashboard code.
8. Money uses numeric(12,2). Points are an append-only ledger (void, never delete).
9. Pin dependency versions, commit lockfiles, keep the code in plain JS/JSX (no TypeScript migration) unless I say otherwise.
10. Do not touch unrelated files. After each task: run `npm run build` and the linter, fix errors, and give a short summary of changed files and anything I must do manually.
11. If a requirement is ambiguous or a decision is mine (e.g., who confirms payments), STOP and ask instead of guessing.
