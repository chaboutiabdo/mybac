# Development notes

Setup, scripts and deployment live in [README.md](README.md). This file records
decisions and the things deliberately left undone.

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

`BAC_DATE` is set to the June 2026 session and needs updating each year.

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
- **`support_requests` has no admin view.** `/pricing` writes payment receipts
  into it and nothing reads them back, so receipts are invisible to admins. It
  also accepts anonymous inserts by design (the public contact form), which
  means an attacker can file an upgrade request naming someone else's email —
  worth adding a `requester_id uuid DEFAULT auth.uid()` column and keying the
  admin action off that instead of the free-text email.
- **`/pricing` still shows a placeholder bank account** (`XXXX-XXXX-XXXX`) and
  the landing footer has placeholder contact details, marked in amber.

## Things that were fixed and are easy to break again

- `completed_at` must be set when a quiz is submitted. Five queries filter on
  it; when it was never written, every completed-quiz count and the day streak
  were permanently zero.
- `ProtectedRoute` must use `isPremium` (role **or** `subscription_status`), not
  `profile.role` alone, or paying users are locked out.
- Premium videos store their path in `file_path`, free ones in `url`.
- `video_progress` is only written on `completed`. Writing it on `started` too
  reset watched videos to unwatched.
- The profile guard trigger keys on `auth.role()` and `pg_trigger_depth()`, not
  `current_user` — inside a `SECURITY DEFINER` trigger `current_user` is always
  `postgres`. Getting this wrong once disabled the guard entirely and let test
  students promote themselves to admin.
