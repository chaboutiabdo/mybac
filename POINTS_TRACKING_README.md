# Points Tracking System

This document describes the points tracking system that records all points with their source information.

## Overview

The system now tracks:
1. **Points with source information** - Every point earned is recorded with details about where it came from
2. **Detailed quiz answers** - Each quiz question answer is saved with full metadata (quiz type, subject, chapter, question number, selected choice)

## Database Tables

### `points_transactions`
Tracks all points earned by students with source information:
- `student_id` - The student who earned the points
- `points` - Number of points earned
- `source_type` - Type of source: 'video', 'quiz', 'exam', 'booking'
- `source_id` - ID of the source (video_id, quiz_id, exam_id, booking_id)
- `source_description` - Human-readable description (e.g., "Video: Limits", "Quiz: Math Practice Q1")
- `subject` - Subject name (if applicable)
- `chapter` - Chapter name (if applicable)
- `quiz_type` - 'daily' or 'practice' (for quiz sources)
- `question_id` - Question ID (for quiz question sources)
- `created_at` - When the points were earned

### Enhanced `quiz_question_results`
Now includes additional metadata:
- `quiz_type` - 'daily' or 'practice'
- `quiz_subject` - Subject of the quiz
- `quiz_chapter` - Chapter of the quiz
- `quiz_id` - ID of the quiz
- `selected_choice_index` - Index of the selected choice (0, 1, 2, 3)
- `question_number` - Question number in the quiz (1-indexed)

## Points Awarded

- **Videos**: 5 points per video watched (recorded automatically via trigger)
- **Quizzes**: 
  - Daily quizzes: 25 points per correct answer
  - Practice quizzes: 8 points per correct answer
  - Points are only awarded on first attempt (retakes don't earn points)
- **Exams**: 10 points per exam interaction (viewing solution or solving with AI)
- **Bookings**: 70 points per alumni booking (recorded automatically via trigger)

## Automatic Tracking

The following actions automatically record points via database triggers:
1. **Video completion** - When a video is marked as watched for the first time
2. **Exam interaction** - When an exam solution is viewed or solved with AI for the first time
3. **Booking creation** - When a booking is created

## Manual Tracking

Quiz question answers and points are tracked manually in the application code:
- When a quiz is submitted, each question answer is recorded with full metadata
- Points are recorded only for correct answers on first attempts

## Usage Examples

### Viewing Points Transactions
```sql
-- Get all points for a student
SELECT * FROM points_transactions 
WHERE student_id = 'student-uuid' 
ORDER BY created_at DESC;

-- Get points by source type
SELECT source_type, SUM(points) as total_points
FROM points_transactions
WHERE student_id = 'student-uuid'
GROUP BY source_type;

-- Get points from videos
SELECT source_description, points, created_at
FROM points_transactions
WHERE student_id = 'student-uuid' AND source_type = 'video';
```

### Viewing Quiz Answers
```sql
-- Get all quiz answers for a student
SELECT * FROM quiz_question_results
WHERE student_id = 'student-uuid'
ORDER BY created_at DESC;

-- Get incorrect answers to identify weak areas
SELECT quiz_subject, quiz_chapter, question_text, student_answer, correct_answer
FROM quiz_question_results
WHERE student_id = 'student-uuid' AND is_correct = false;

-- Get answers by quiz type
SELECT quiz_type, COUNT(*) as total_questions, 
       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers
FROM quiz_question_results
WHERE student_id = 'student-uuid'
GROUP BY quiz_type;
```

## Migration

To apply these changes, run the migration file:
```
mybac/supabase/migrations/20250116000000_add_points_tracking.sql
```

This migration:
1. Creates the `points_transactions` table
2. Enhances the `quiz_question_results` table with new columns
3. Creates database triggers for automatic points tracking
4. Creates indexes for better performance
5. Sets up RLS policies for security

## Notes

- Points are only awarded once per activity (first video watch, first correct answer, etc.)
- Retakes of quizzes do not earn additional points
- All points transactions are timestamped for tracking over time
- Admins can view all points transactions for all students
- Students can only view their own points transactions

