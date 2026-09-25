# THE SMART

Exam-prep platform for the Algerian **baccalauréat**. Arabic-first, right-to-left.

- Past BAC papers with their official solutions, filterable by stream, subject,
  year and session
- A daily quiz, graded server-side, worth 25 points a question
- Video lessons ordered by the real curriculum chapters
- An AI tutor that answers in Arabic with French units, the way an exam paper is
  written (premium), on Google Gemini's free tier
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

The AI tutor needs a Gemini key. Put it in `supabase/functions/.env` (gitignored)
and serve the function with it:

```bash
# supabase/functions/.env
GEMINI_API_KEY=...
ALLOWED_ORIGIN=http://localhost:8080

npx supabase functions serve gemini-chat --env-file supabase/functions/.env
```

### New migrations: `migration up`, never `db reset`

`supabase db reset` rebuilds the local database from scratch: every account
you signed up with and all of its points, streak and progress are gone. (That
happened on 22 Sep 2026.) Back up, then apply only what's new:

```bash
npx supabase db dump --local --data-only -f backup.sql   # keep it outside the repo
npx supabase migration up
npm run types:gen
```

### Test accounts

Seeded by `supabase/seed.sql` when the stack is first created. Password for all
three: `Test1234!`

| Role | Email |
| --- | --- |
| Student | `student@mybac.test` |
| Premium | `premium@mybac.test` |
| Admin | `admin@mybac.test` |

> `seed.sql` creates accounts with a known password. It runs against the
> **local** stack only — never point it at production.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typechecks, then builds (the typecheck is a gate, not optional) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit`. Must stay at 0 |
| `npm run lint` | ESLint. Must stay at 0 errors |
| `npm run check` | typecheck + lint + unit tests (`npm test`: LaTeX repair, model fallback, SSRF guard) |
| `npm run types:gen` | Regenerate `src/integrations/supabase/types.ts` |
| `npm run seed:testusers` | 55 users (40 student, 10 premium, 5 admin) for security testing |
| `npm run upload:bac` | Upload the BAC past-paper archive (`BAC_DIR`) to the local stack; `--dry-run`, `--verify`, `--undo` |
| `node --env-file=.env.prod-secrets scripts/copy-content-to-prod.mjs` | Copy the BAC papers, PDFs and cached AI solutions from the local stack to production (flashcards are private per student and never copied); dry run unless `--apply` |
| `npm run prewarm:solutions` | Solve every unsolved paper ahead of time as an admin, so students get cached AI solutions, then copy each solved question's wording from the paper for the solution page's question card; resumable, `--limit N`. Rerun after uploading papers |
| `npm run security` | 210 tests run as real signed-in users |

`src/integrations/supabase/types.ts` is **generated**. Never hand-edit it — run
`npm run types:gen` after any schema change, or the types drift from the
database and queries silently collapse to `never`.

---

## Security

`npm run security` runs two suites against the local stack:

- `scripts/check-security.mjs` — the five original RLS assertions
- `scripts/attack-suite.mjs` — 205 attacks executed as real signed-in users:
  privilege escalation, IDOR across a 55-user cohort, points and score forgery,
  an anonymous read sweep over every table, premium bypass, storage, the edge
  function (daily AI ceiling, oversized papers, SSRF), private flashcard decks
  and per-student AI caches, download-counter forgery, and forged or anonymous
  premium requests

Every test **passes when an attack is blocked**. Reseed before each run
(`npm run seed:testusers`) — a failing run can leave escalated roles behind, and
stale roles make later tests pass for the wrong reason.

Notable properties the suites enforce:

- Quiz grading happens in the database (`submit_quiz_attempt`). The answer key
  never reaches the browser — students read `quizzes_public`, which strips it
- `profiles.total_score` is the sum of `points_transactions`, and
  `update_student_total_score` is the **only** thing that writes it. Points are
  awarded only by `SECURITY DEFINER` code, once per
  (student, source_type, source_id, question_id) — the award RPC is not
  callable from a browser at all
- A student may open a quiz attempt but not score one: the insert policy pins
  `score = 0`, `completed_at IS NULL` and `submitted = false`
- `profiles.email` is account identity: a student cannot rewrite it, and a
  confirmed `auth.updateUser({ email })` is mirrored back by a trigger
- A student cannot change their own role, subscription status or score
- Every AI result a student gets is theirs alone: their flashcard deck, their
  tutor history and their saved exam-help answers. Only the step-by-step paper
  solutions are shared, and those only through `gemini-chat`
- Nothing is readable with only the publishable key
- Study days (streak, calendar, weekly report) come from `review_log`, which
  keeps every review. A student can read their own rows and write none

---

## Deploying

Production is **Cloudflare Pages** (connected to this GitHub repo, branch
`main`) in front of a **hosted Supabase** project. `public/_headers` carries
the security headers; Pages serves `index.html` for unknown paths on its own,
so deep links work without a redirect rule. Use `npx supabase@latest` for
every remote command.

1. **Create a Supabase project**, then `supabase login`, `supabase link
   --project-ref <ref>` and `supabase db push`. Never pass `--include-seed`,
   never `db reset --linked`, and never `supabase config push` — that would
   push the local auth settings (localhost URLs, 6-character passwords).
2. **Copy the content** (BAC papers, their PDFs, the cached AI solutions) from
   the local stack with
   `node --env-file=.env.prod-secrets scripts/copy-content-to-prod.mjs`
   (dry run; add `--apply` to write). `.env.prod-secrets` holds
   `PROD_SUPABASE_URL` and `PROD_SERVICE_ROLE_KEY` and is gitignored. Rerunning
   it is safe: it keeps the live download counters, skips PDFs already there,
   and carries new solutions and question texts across.
3. **Deploy the edge function** and set its secrets:
   ```bash
   supabase functions deploy gemini-chat --use-api
   supabase secrets set --env-file supabase/functions/.env   # GEMINI_API_KEY
   supabase secrets set ALLOWED_ORIGIN=https://your-site.pages.dev
   ```
   `ALLOWED_ORIGIN` is one exact origin (no trailing slash) and defaults to
   `http://localhost:8080`; leave it wrong and the AI tutor is blocked by CORS
   in production. (Locally the Kong gateway answers CORS with `*` itself, so a
   wrong value only shows up once deployed.) If the gateway ever rejects valid
   users with 401, set `verify_jwt = false` for the function in
   `supabase/config.toml` and redeploy — the function verifies the token itself.

   **Keep the Gemini key free.** Create it in Google AI Studio on a project with
   no billing account: then Google cannot charge anything, and when the daily
   free quota runs out the tutor answers "busy" instead. The quota is per
   project, shared by every student — see aistudio.google.com/rate-limit. On
   the free tier Google may use questions and answers to improve its products,
   and human reviewers may read them; the tutor page tells students not to
   type personal information.
4. **Cloudflare Pages**: Workers & Pages → Create → Pages → Connect to Git.
   Production branch `main`, build command `npm run build`, output `dist`
   (`.node-version` pins Node 22). Set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` as build variables **before** the first
   build — Vite bakes them in, and the app throws at startup if either is
   missing.
5. **Auth in the Supabase dashboard.** These are project settings, not
   migrations, so `db push` does not carry them:

   | Setting | Value | Why |
   | --- | --- | --- |
   | Confirm email | off | the free built-in mailer only reaches the owner's own team; turn it on once a real SMTP service (e.g. Brevo) is set up |
   | Minimum password length | 8 | matches `passwordProblem()` in `src/lib/utils.ts` |
   | Password requirements | letters + digits | same; change both together |
   | Secure password change | off | it emails a reauth code, which students can't receive without SMTP |
   | Bot protection (captcha) | **off** | the app sends no captcha token — turning it on breaks every sign-in |
   | Site URL / redirect URLs | `https://your-site.pages.dev` / `…/**` | |
   | Extension `pg_graphql` | off | the app doesn't use it; it would describe every table to anyone holding the public key |

   With no mailer, "forgot password" tells students to write to the contact
   address, and an admin resets the password by hand.
6. `public/_headers` sends a Content-Security-Policy that allows Google Fonts,
   YouTube thumbnails and the one production project
   (`fqhtptqeuatgacyfpzes.supabase.co`). **A new project, or a Supabase custom
   domain, must be put in `connect-src` and `media-src`** or every query is
   blocked in the browser.
7. Do **not** run `supabase/seed.sql` against production.
8. **Back up production yourself** — the free plan has no downloadable
   backups: `npx supabase@latest db dump --linked --data-only -f backup.sql`.

`console.*` is stripped from production builds by esbuild (`vite.config.ts`).

---

## Layout

```
src/
  components/
    admin/        admin panel screens and dialogs
    dashboard/    student dashboard widgets
    layout/       AppShell (navigation) and PageHeader
    ui/           shadcn primitives + shared Loading/Empty/Error states
  contexts/       AuthContext
  hooks/          data and activity hooks
  integrations/   generated Supabase client and types
  lib/bac.ts      THE domain vocabulary: streams, subjects, chapters,
                  coefficients, the exam date, the Algiers day (dzKey)
  pages/          routed pages
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
