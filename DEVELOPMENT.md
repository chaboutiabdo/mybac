# Development

The app runs against a **local** Supabase stack. The original cloud project
(`mkzgenjziliwkcdbcecc`) no longer exists.

## Running it

```bash
npx supabase start     # needs Docker; applies all migrations and seeds users
npm run dev
```

`.env` is gitignored — copy `.env.example` and fill in the anon key that
`npx supabase status` prints.

### Test accounts

Seeded automatically by `supabase/seed.sql` on every `supabase db reset`.
Password for all three: `Test1234!`

| Role    | Email                |
| ------- | -------------------- |
| Student | `student@mybac.test` |
| Premium | `premium@mybac.test` |
| Admin   | `admin@mybac.test`   |

## Checks

```bash
npm run typecheck                       # tsc --noEmit, must stay at 0
npm run lint
npm run check                           # both of the above
npm run build                           # runs typecheck first, then vite build
node --test scripts/check-security.mjs  # RLS assertions, needs the stack up
npm run types:gen                       # regenerate src/integrations/supabase/types.ts
```

`src/integrations/supabase/types.ts` is **generated**. Never hand-edit it — run
`npm run types:gen` after any schema change, or the hand-written types drift out
of sync with the database (which is how ~40 of the original type errors arose).

TypeScript is in full `strict` mode. Keep it there.

## Known limitation: quiz scoring is client-trusted

Quiz `questions` jsonb still contains the `correct` index for each question, it
is sent to the browser, and `QuizTaking.tsx` computes the score locally and
writes it to `quiz_attempts`. A determined student can read the answer key or
post an arbitrary score for their own attempt.

This was left in place deliberately — the app is a demo/portfolio piece.
**Before any real-student launch**, close it with:

1. A `quizzes_public` view that strips `correct` from `questions`, with the
   `quizzes` table itself restricted to admins.
2. A `submit_quiz_attempt(attempt_id, answers)` SECURITY DEFINER RPC that scores
   server-side, and dropping the client's UPDATE policy on `quiz_attempts` so
   `score` is no longer writable from the browser.
3. Tightening the `quiz_attempts` INSERT policy to `score = 0 AND submitted = false`,
   otherwise the insert path replaces the update path.

Note `supabase/migrations/20251120115708_secure_quiz_scoring.sql` is an empty
file — the migration its name promises was never written. It has already been
applied, so add new migrations rather than editing it.

## Things deliberately not done

- **The 28 remaining eslint warnings.** All `react-hooks/exhaustive-deps`
  ("fetch on mount, `fetchX` not in deps") or `react-refresh/only-export-components`.
  The structural fix is react-query (already a dependency), but converting ~30
  components carries real regression risk and no user-visible benefit. Convert a
  component when you are already editing it.
- **No shared `<CrudTable>` abstraction** across the admin screens. They look
  80% alike and differ in exactly the 20% that matters.
- **`VideosManagement.tsx` (531 lines) and `SessionsManagement.tsx` (508)** were
  left whole. A long admin CRUD screen is not a bug, and there are no component
  tests to catch what a split would break.

## Security testing

```bash
npx supabase start
npm run seed:testusers   # 55 users: 40 student, 10 premium, 5 admin
npm run security         # 88 assertions; every test PASSES when an attack is blocked
```

`scripts/attack-suite.mjs` runs real attacks as real signed-in users: privilege
escalation, IDOR across the cohort, points and score forgery, an anonymous read
sweep over all 24 tables, premium bypass, storage, and the edge function.

**Reseed before every run.** A failing run can leave escalated roles behind — a
broken guard once left 7 admins where there should have been 5, and the stale
roles then made later tests pass for the wrong reason.

### Remaining known gap: quiz grading is client-side

A signed-in student can still:

- read `quizzes.questions`, which carries the `correct` index for each question
- `INSERT` into `quiz_question_results` with `is_correct: true`
- `PATCH quiz_attempts.score` directly

`20260917000000` closed the *unauthenticated* version of this (the answer key
was readable with only the publishable key), and `20260917000001` added
`UNIQUE (quiz_attempt_id, question_id)` so an answer cannot be banked twice.
Closing it fully needs:

1. a `quizzes_public` view that strips `correct`, with `quizzes` itself
   restricted to admins;
2. a `submit_quiz_attempt(attempt_id, answers)` SECURITY DEFINER RPC that grades
   server-side and is the only writer of `quiz_attempts.score` and
   `quiz_question_results`;
3. dropping the client UPDATE policy on `quiz_attempts` and the INSERT policy on
   `quiz_question_results`, then pointing `QuizTaking.tsx` at the RPC.

The two `known gap` lines the suite prints are this, recorded deliberately.
