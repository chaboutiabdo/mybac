# Quiz Submission Error Fix - Root Cause Analysis

## ❌ Problem
When submitting a quiz, user sees: "Failed to submit quiz" error

## 🎯 Root Cause Found
The `quiz_attempts` table is missing an **UPDATE policy** in Row Level Security (RLS).

Students have:
- ✅ SELECT policy (can view their attempts)
- ✅ INSERT policy (can create new attempts)  
- ❌ **MISSING UPDATE policy** (cannot submit/update attempts) ← THIS WAS THE PROBLEM

When the app tries to update the quiz_attempts record with answers and score, Supabase blocks it due to missing UPDATE permissions.

## 🔧 Solution Applied

### File: `supabase/migrations/20250927120001_add_quiz_update_policy.sql`

This migration adds:

1. **UPDATE policy for students:**
```sql
CREATE POLICY "Students can update their attempts" ON public.quiz_attempts 
  FOR UPDATE USING (student_id = auth.uid()) 
  WITH CHECK (student_id = auth.uid());
```

2. **UPDATE policy for admins:**
```sql
CREATE POLICY "Admins can update all attempts" ON public.quiz_attempts 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

3. **Fixed default value for answers column:**
   - Changed from `'[]'` (empty array) to `'{}'` (empty object)
   - Aligns with how frontend stores answers as an object/dictionary

## 📝 Also Improved: QuizTaking.tsx

Enhanced error handling to:
- Save quiz data FIRST before tracking
- Continue even if question tracking fails
- Provide better error messages
- Non-critical features don't block submission

## ✅ What This Fixes

After applying the migration:
1. Users CAN update their quiz attempts ✅
2. Answers get saved to database ✅
3. Score gets calculated and stored ✅
4. No more "Failed to submit quiz" error ✅

## 📦 How to Apply

These migrations will be applied automatically when you:
1. Run `supabase db push` (if using Supabase CLI)
2. Or they're automatically applied on next deployment

The files created:
- `supabase/migrations/20250927120001_add_quiz_update_policy.sql`

## 🧪 Testing After Fix

1. Start a new quiz
2. Answer some questions
3. Click "Submit Quiz"
4. Should see: "Quiz completed! Your score: X/100"
5. NOT see: "Failed to submit quiz"

---

**Status:** Root cause identified and fixed with proper RLS policies
