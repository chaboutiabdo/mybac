# THE SMART

Exam-prep platform for the Algerian **baccalauréat**. Arabic-first, right-to-left.

- Past BAC papers with their official solutions, filterable by stream, subject,
  year and session
- A daily quiz, graded server-side, worth 25 points a question
- Video lessons ordered by the real curriculum chapters
- An AI tutor that answers in Arabic with French units, the way an exam paper is
  written (premium)
- Points, a leaderboard, and a countdown to the exam

React + Vite + TypeScript, Tailwind and shadcn/ui, Supabase (Postgres, Auth,
Storage, Edge Functions).

---

## Running it locally

Needs Node 20+ and Docker (for the Supabase stack).

```bash
npm install
npx supabase start          # applies all migrations, prints your keys
cp .env.example .env        # fill in the anon key that `supabase status` shows
npm run dev                 # http://localhost:8080
```

### Test accounts

Seeded by `supabase/seed.sql` on every `supabase db reset`. Password for all
three: `Test1234!`

| Role | Email |
| --- | --- |
| Student | `student@mybac.test` |
| Premium | `premium@mybac.test` |
| Admin | `admin@mybac.test` |

> `seed.sql` creates accounts with a known password. It runs on `db reset`
> against the **local** stack only — never point it at production.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typechecks, then builds (the typecheck is a gate, not optional) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`. Must stay at 0 |
| `npm run lint` | ESLint. Must stay at 0 errors |
| `npm run check` | typecheck + lint |
| `npm run types:gen` | Regenerate `src/integrations/supabase/types.ts` |
| `npm run seed:testusers` | 55 users (40 student, 10 premium, 5 admin) for security testing |
| `npm run security` | 90 assertions run as real signed-in users |

`src/integrations/supabase/types.ts` is **generated**. Never hand-edit it — run
`npm run types:gen` after any schema change, or the types drift from the
database and queries silently collapse to `never`.

---

## Security

`npm run security` runs two suites against the local stack:

- `scripts/check-security.mjs` — the five original RLS assertions
- `scripts/attack-suite.mjs` — 85 attacks executed as real signed-in users:
  privilege escalation, IDOR across a 55-user cohort, points and score forgery,
  an anonymous read sweep over every table, premium bypass, storage, and the
  edge function

Every test **passes when an attack is blocked**. Reseed before each run
(`npm run seed:testusers`) — a failing run can leave escalated roles behind, and
stale roles make later tests pass for the wrong reason.

Notable properties the suites enforce:

- Quiz grading happens in the database (`submit_quiz_attempt`). The answer key
  never reaches the browser — students read `quizzes_public`, which strips it
- Points amounts are decided server-side; the client's requested amount is
  ignored
- A student cannot change their own role, subscription status or score
- Nothing is readable with only the publishable key

---

## Deploying

The repo ships `vercel.json` with an SPA rewrite, so deep links work on Vercel.
Any static host needs the same fallback-to-`index.html` rule.

1. **Create a Supabase project**, then `supabase link` and `supabase db push`.
2. **Set the site URL and redirect URLs** in Supabase Auth to your domain, or
   password reset and email confirmation will bounce to localhost.
3. **Deploy the edge function** and set its secrets:
   ```bash
   supabase functions deploy gemini-chat
   supabase secrets set GEMINI_API_KEY=...  ALLOWED_ORIGIN=https://your-domain
   ```
   `ALLOWED_ORIGIN` defaults to `http://localhost:8081`; leave it wrong and the
   AI tutor is blocked by CORS in production.
4. **Set the front-end env vars** on the host: `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. The app throws at startup if either is
   missing.
5. Do **not** run `supabase/seed.sql` against production.

`console.*` is stripped from production builds by esbuild (`vite.config.ts`).

---

## Layout

```
src/
  components/
    admin/        admin panel screens and dialogs
    dashboard/    student dashboard widgets
    layout/       Navigation
    ui/           shadcn primitives + shared Loading/Empty/Error states
  contexts/       AuthContext, LanguageContext (Arabic only)
  hooks/          data and activity hooks
  integrations/   generated Supabase client and types
  lib/bac.ts      THE domain vocabulary: streams, subjects, chapters,
                  coefficients, the exam date, /20 grading
  pages/          routed pages
  styles/         ornamental layer
supabase/
  migrations/     schema and RLS, applied in filename order
  functions/      gemini-chat edge function
scripts/          security suites and the test-user seeder
```

**`src/lib/bac.ts` is the single source for the domain vocabulary.** Every
upload form, filter and label reads from it. They used to disagree — the admin
forms wrote `Mathematics` and `Sciences` while the student filters matched
`Math` and `Sciences Expérimentales`, so uploaded content was invisible to the
filters meant to find it.

See [DEVELOPMENT.md](DEVELOPMENT.md) for what was deliberately left undone.
