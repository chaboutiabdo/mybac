# Development notes

Setup, scripts and deployment live in [README.md](README.md). This file records
decisions and the things deliberately left undone.

## Design system

The look comes from the owner's mockup (`THE SMART Dashboard.html`): a warm
canvas page, cream panels, white inner tiles, ink for text and the primary
pill, Readex Pro (Inter for numbers via `.tabular`), 26px cards with soft
shadows, and six pastel **tones** that colour-code streams and subjects.

- Tokens live in `src/index.css`; tones are `bg-tone-{pink,mint,lav,peach,sage,sky}`.
- A stream or subject gets its tone from `src/lib/bac.ts` (`streamTone`,
  `subjectTone`, `TONE_BG`) — never pick a colour per page.
- Signed-in student pages sit in `AppShell` (icon rail on desktop, bottom tab
  bar on phones) via a layout route in `App.tsx`; pages open with `PageHeader`.
- Filters are `FilterPills`. Grids close every row: an odd last card spans.
- Text is ink or muted, never pastel; digits are Latin (0–9).

## Invariants worth keeping

- **`npm run typecheck` stays at 0 and `npm run lint` stays at 0 errors.**
  `npm run build` runs the typecheck first, so a regression cannot ship.
- **TypeScript is in full `strict` mode.** Keep it there.
- **`src/integrations/supabase/types.ts` is generated.** Run `npm run types:gen`
  after any schema change. When it went stale, five tables and a column were
  missing from it and every query against them collapsed to the `never`
  overload — that was the root cause of ~40 type errors.
- **`src/lib/bac.ts` is the single source for streams, subjects, chapters,
  coefficients and the exam date.** Do not reintroduce a local list. The admin
  forms and the student filters once disagreed (`Mathematics` vs `Math`,
  `Sciences` vs `Sciences Expérimentales`), which made uploaded content
  invisible to the filters meant to find it.
- **Grading is server-side.** `submit_quiz_attempt` is the only thing that may
  write `quiz_attempts.score` or `quiz_question_results`. The client reads
  `quizzes_public`, which strips the answer key.
- **`profiles.total_score` has exactly one writer: `update_student_total_score`,
  summing `points_transactions`.** Do not add a second. Three formulas used to
  compete for this column and two of them read tables a student can write, so
  one `INSERT INTO quiz_attempts (score)` set the leaderboard to any number,
  and a perfect retake re-banked its score. Points enter only through
  `SECURITY DEFINER` code (`submit_quiz_attempt`, `handle_*_points`); the award
  RPC is revoked from `authenticated`, and a non-partial unique index on
  (student, source_type, source_id, `COALESCE(question_id,'')`) makes every
  award idempotent. That trigger is also an **AFTER INSERT OR DELETE** trigger:
  anything it reads must use `COALESCE(NEW.x, OLD.x)`, or the DELETE path
  raises, its own `EXCEPTION` block swallows it, and scores silently go stale.
- **RTL uses logical properties** (`ms-`/`me-`/`ps-`/`pe-`, `text-start`), not
  `ml-`/`mr-`. The one exception is the `left-1/2 + translate-x` centring idiom,
  which must stay physical or dialogs land off-centre.
- **One toast system: Sonner.** The shadcn toast was removed. Reintroducing it
  means mounting its `<Toaster />`, and forgetting that is exactly how ~97
  toast calls once rendered nothing at all.

## Coefficients need confirming

`COEFFICIENTS` in `src/lib/bac.ts` carries per-stream subject coefficients for
Sciences Expérimentales, Mathématiques and Technique Mathématiques. **Check them
against the current ONEC grid before relying on them.** A wrong معامل is
immediately obvious to a student and costs more credibility than the feature
buys.

`BAC_DATE` is set to the June 2027 session as an **estimate** (the first Sunday
of June). Replace it with ONEC's date when it is announced, and update it each
year after. `EXAM_YEARS` follows it, so the upload form and the filters pick up
each new session's papers.

## Deliberately not done

- **The 19 remaining eslint warnings.** All `react-hooks/exhaustive-deps`
  ("fetch on mount, `fetchX` not in deps") or `react-refresh/only-export-components`.
  The structural fix is React Query, which is already a dependency and already
  mounted; convert a component when you are next editing it.
- **React Query migration.** 24 files still hand-roll `loading` state and the
  same Supabase reads are duplicated across 3-8 files each (`profiles` in 8,
  the leaderboard view in 3). The shared read hooks are the place to start:
  `useDashboardStats`, `useQuizStats`, `useUserScore`, `useUserRank`. Two of
  those open a realtime channel with the same name on the same page.
- **Splitting the big admin screens.** `VideosManagement` (531) and
  `AdviceTipsManagement` (428) each hold a table, a form dialog and their own
  fetching. Not a bug; split when you next need to change one.
- **No shared `<CrudTable>`.** The admin screens look 80% alike and differ in
  exactly the 20% that matters.
- **Schools.** `SchoolsManagement` works, but `school_students` is never
  populated by the app, so the student count would be 0 for every school. Keep
  the screen only if the schools offer on `/pricing` is real.
- **`/pricing` still shows a placeholder bank account** (`XXXX-XXXX-XXXX`) and
  the landing footer has placeholder contact details, marked in amber.
- **The Schools card on `/pricing` links to `/contact`**, which is not a route,
  so it lands on the 404 page.

## The AI tutor runs on Gemini's free tier

- `MODELS` in `supabase/functions/gemini-chat/index.ts` is tried in order. A 429
  (free quota used up), a 503 (Google overloaded) or a 25 s timeout falls
  through to the next. Lite models go first: on the free tier the bigger Flash
  models were overloaded and hung for minutes before failing, while Lite
  answered in about 4 s. Without the timeout a single hung model froze the
  chat for over 3 minutes. Google retires models about once a year; when one
  starts answering 404, replace its id there.
- `maxOutputTokens` includes the model's thinking tokens. At 800,
  `gemini-2.5-flash` spent 765 of them thinking and students got a cut-off
  greeting.
- "Free" is a property of the key, not the code: create it on a Google project
  with no billing account. Then nothing can be charged, and past the daily quota
  the tutor answers "busy".
- **Open question for the owner:** Gemini's terms bar use in a service "likely
  to be accessed by individuals under the age of 18", free or paid. BAC
  students are often 17.

## Things that were fixed and are easy to break again

- `completed_at` must be set when a quiz is submitted. Five queries filter on
  it; when it was never written, every completed-quiz count and the day streak
  were permanently zero.
- `ProtectedRoute` must use `isPremium` (role **or** `subscription_status`), not
  `profile.role` alone, or paying users are locked out.
- Premium videos store their path in `file_path`, free ones in `url`.
- `video_progress` is only written on `completed`. Writing it on `started` too
  reset watched videos to unwatched.
- An RLS policy must never read `auth.users`. `authenticated` has no access to
  it, so the whole query errors for every caller, whatever the other policies
  say. One such policy on `support_requests` hid every payment receipt from
  admins. Use `auth.uid()` or `auth.jwt()`.
- A premium request is bound to `requester_id` (stamped by `DEFAULT auth.uid()`,
  enforced by the insert policy). Approving it upgrades that account, never the
  email typed into the form.
- Student code reads `quizzes_public`, never `quizzes`. Only admins may select
  from `quizzes` (it holds the answer key), and a query — or an inner join —
  against rows you cannot see returns nothing, silently. `useQuizStats` did
  exactly that and showed every student 0 for progress, average, points and
  streak. Result rows carry `quiz_type` / `quiz_subject`, so no join is needed.
- Admin upload forms read streams, subjects, chapters and years from
  `src/lib/bac.ts`. The exam form once listed STREAMS as subjects and saved
  streams as "Sciences" / "Math", so uploaded papers matched no student filter.
- The profile guard trigger keys on `auth.role()` and `pg_trigger_depth()`, not
  `current_user` — inside a `SECURITY DEFINER` trigger `current_user` is always
  `postgres`. Getting this wrong once disabled the guard entirely and let test
  students promote themselves to admin.
