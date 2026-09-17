  -- Create function to update student's total_score when points are recorded
  CREATE OR REPLACE FUNCTION public.update_student_total_score()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    -- Update the student's total_score by summing all their points_transactions
    UPDATE public.profiles
    SET total_score = COALESCE((
      SELECT SUM(points) 
      FROM public.points_transactions 
      WHERE student_id = NEW.student_id
    ), 0)
    WHERE user_id = NEW.student_id;
    
    RETURN NEW;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error updating student total score: %', SQLERRM;
      RETURN NEW;
  END;
  $$;

  -- Create trigger to automatically update total_score when points are added
  DROP TRIGGER IF EXISTS trigger_update_total_score_on_points_insert ON public.points_transactions;
CREATE TRIGGER trigger_update_total_score_on_points_insert
  AFTER INSERT ON public.points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_total_score();

  -- Create trigger to update total_score when points are deleted (in case of corrections)
  DROP TRIGGER IF EXISTS trigger_update_total_score_on_points_delete ON public.points_transactions;
CREATE TRIGGER trigger_update_total_score_on_points_delete
  AFTER DELETE ON public.points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_total_score();

  -- Initial update: Calculate total_score for all students based on their existing points
  UPDATE public.profiles
  SET total_score = COALESCE((
    SELECT SUM(pt.points)
    FROM public.points_transactions pt
    WHERE pt.student_id = profiles.user_id
  ), 0);
