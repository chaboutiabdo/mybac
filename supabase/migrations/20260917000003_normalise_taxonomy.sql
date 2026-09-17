-- Normalise subject and stream values to the single vocabulary in src/lib/bac.ts.
--
-- The admin upload forms and the student filters used different words for the
-- same thing, so content uploaded through the admin panel could not be found
-- by the filters meant to find it:
--
--   UploadExamDialog   wrote subject 'Mathematics', stream 'Sciences'/'Letters'
--   VideosManagement   wrote subject 'Mathématiques', chapter 'Chapitre 1'
--   Settings           wrote stream  'sciences'/'math'/'letters'/'economics'
--   student filters    matched       'Math', 'Sciences Expérimentales'
--
-- The forms now all read from bac.ts. This migration fixes the rows already in
-- the database. It is written to be safely re-runnable.

-- ---------------------------------------------------------------- subjects
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['exams', 'videos', 'quizzes'] LOOP
    EXECUTE format($f$
      UPDATE public.%I SET subject = CASE
        WHEN subject IN ('Mathematics','Mathématiques','Mathematiques','maths','math','MATH') THEN 'Math'
        WHEN subject IN ('Physique','physics','PHYSICS')                                      THEN 'Physics'
        WHEN subject IN ('SVT','Biology','Sciences Naturelles')                               THEN 'Science'
        WHEN subject IN ('Arabe','Arabic','Literature','Littérature','Litterature')          THEN 'Arabic'
        WHEN subject IN ('Français','Francais','French')                                      THEN 'French'
        WHEN subject IN ('Anglais','English')                                                 THEN 'English'
        WHEN subject IN ('Philosophie','Philosophy')                                          THEN 'Philosophy'
        WHEN subject IN ('Histoire','Géographie','Geographie','History','Geography')          THEN 'History'
        ELSE subject
      END
      WHERE subject IS NOT NULL
    $f$, tbl);
  END LOOP;
END $$;

-- Chemistry had no home in the student vocabulary; fold it into Physics,
-- which is where the Algerian programme teaches it.
UPDATE public.exams  SET subject = 'Physics' WHERE subject IN ('Chemistry', 'Chimie');
UPDATE public.videos SET subject = 'Physics' WHERE subject IN ('Chemistry', 'Chimie');
UPDATE public.quizzes SET subject = 'Physics' WHERE subject IN ('Chemistry', 'Chimie');

-- ----------------------------------------------------------------- streams
UPDATE public.exams SET stream = CASE
  WHEN stream IN ('Sciences', 'sciences', 'Sciences Experimentales', 'Sciences Exactes') THEN 'Sciences Expérimentales'
  WHEN stream IN ('Math', 'math', 'Maths', 'Mathematiques')          THEN 'Mathématiques'
  WHEN stream IN ('Technique', 'Technique Mathematiques')            THEN 'Technique Mathématiques'
  WHEN stream IN ('Letters', 'letters', 'Lettres', 'Lettres et Langues') THEN 'Lettres et Philosophie'
  WHEN stream IN ('economics', 'Economics', 'Gestion', 'Gestion Economie') THEN 'Gestion Économie'
  WHEN stream IN ('Langues', 'Languages', 'Langues Etrangeres')      THEN 'Langues Étrangères'
  ELSE stream
END
WHERE stream IS NOT NULL;

UPDATE public.profiles SET stream = CASE
  WHEN stream IN ('Sciences', 'sciences', 'Sciences Experimentales', 'Sciences Exactes') THEN 'Sciences Expérimentales'
  WHEN stream IN ('Math', 'math', 'Maths', 'Mathematiques')          THEN 'Mathématiques'
  WHEN stream IN ('Technique', 'Technique Mathematiques')            THEN 'Technique Mathématiques'
  WHEN stream IN ('Letters', 'letters', 'Lettres', 'Lettres et Langues') THEN 'Lettres et Philosophie'
  WHEN stream IN ('economics', 'Economics', 'Gestion', 'Gestion Economie') THEN 'Gestion Économie'
  WHEN stream IN ('Langues', 'Languages', 'Langues Etrangeres')      THEN 'Langues Étrangères'
  ELSE stream
END
WHERE stream IS NOT NULL;

-- ---------------------------------------------------------------- chapters
-- VideosManagement offered generic French chapter names that match nothing in
-- the curriculum lists. Null them rather than guess: the video still appears
-- under its subject, and "عام" is shown in place of a chapter.
UPDATE public.videos
   SET chapter = NULL
 WHERE chapter IN ('Introduction', 'Chapitre 1', 'Chapitre 2', 'Chapitre 3',
                   'Révisions', 'Revisions', 'Examens Blancs');
