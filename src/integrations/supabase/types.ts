export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_advice: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      advice_tips: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          expiry_date: string | null
          id: string
          is_public: boolean
          priority: number | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_public?: boolean
          priority?: number | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_public?: boolean
          priority?: number | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_learning_conversations: {
        Row: {
          answer_text: string
          chapter: string | null
          created_at: string
          exam_id: string | null
          id: string
          mistake_id: string | null
          mode: string
          question_ref: string | null
          question_text: string
          subject: string | null
          user_id: string
        }
        Insert: {
          answer_text: string
          chapter?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          mistake_id?: string | null
          mode?: string
          question_ref?: string | null
          question_text: string
          subject?: string | null
          user_id: string
        }
        Update: {
          answer_text?: string
          chapter?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          mistake_id?: string | null
          mode?: string
          question_ref?: string | null
          question_text?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_learning_conversations_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_conversations_mistake_id_fkey"
            columns: ["mistake_id"]
            isOneToOne: false
            referencedRelation: "mistakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_learning_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          answered_at: string | null
          assigned_date: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          quiz_attempt_id: string | null
          quiz_id: string
          reason: string
          student_answer: string | null
          student_id: string
        }
        Insert: {
          answered_at?: string | null
          assigned_date: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          quiz_attempt_id?: string | null
          quiz_id: string
          reason: string
          student_answer?: string | null
          student_id: string
        }
        Update: {
          answered_at?: string | null
          assigned_date?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          quiz_attempt_id?: string | null
          quiz_id?: string
          reason?: string
          student_answer?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_questions_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_activity_logs: {
        Row: {
          action: string
          created_at: string
          exam_id: string
          exam_title: string
          id: string
          stream: string
          student_id: string
          subject: string
          year: number
        }
        Insert: {
          action: string
          created_at?: string
          exam_id: string
          exam_title: string
          id?: string
          stream: string
          student_id: string
          subject: string
          year: number
        }
        Update: {
          action?: string
          created_at?: string
          exam_id?: string
          exam_title?: string
          id?: string
          stream?: string
          student_id?: string
          subject?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_activity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_ai_solutions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          model: string | null
          prompt_version: number
          solution: Json
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          model?: string | null
          prompt_version?: number
          solution: Json
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          model?: string | null
          prompt_version?: number
          solution?: Json
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_ai_solutions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_progress: {
        Row: {
          exam_id: string
          id: string
          solved_with_ai: boolean | null
          student_id: string
          viewed_exam: boolean | null
          viewed_solution: boolean | null
        }
        Insert: {
          exam_id: string
          id?: string
          solved_with_ai?: boolean | null
          student_id: string
          viewed_exam?: boolean | null
          viewed_solution?: boolean | null
        }
        Update: {
          exam_id?: string
          id?: string
          solved_with_ai?: boolean | null
          student_id?: string
          viewed_exam?: boolean | null
          viewed_solution?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_progress_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_simulation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          expires_at: string
          id: string
          quiz_attempt_id: string
          quiz_id: string
          started_at: string
          status: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes: number
          expires_at: string
          id?: string
          quiz_attempt_id: string
          quiz_id: string
          started_at?: string
          status?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          id?: string
          quiz_attempt_id?: string
          quiz_id?: string
          started_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_simulation_sessions_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_simulation_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_simulation_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_simulation_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          difficulty: string | null
          downloads: number | null
          exam_url: string | null
          id: string
          questions: number | null
          solution_url: string | null
          stream: string
          subject: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          downloads?: number | null
          exam_url?: string | null
          id?: string
          questions?: number | null
          solution_url?: string | null
          stream: string
          subject: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          downloads?: number | null
          exam_url?: string | null
          id?: string
          questions?: number | null
          solution_url?: string | null
          stream?: string
          subject?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          chapter: string
          concept: string | null
          created_at: string
          front: string
          id: string
          owner_id: string
          source: string
          subject: string
          updated_at: string
        }
        Insert: {
          back: string
          chapter: string
          concept?: string | null
          created_at?: string
          front: string
          id?: string
          owner_id: string
          source?: string
          subject: string
          updated_at?: string
        }
        Update: {
          back?: string
          chapter?: string
          concept?: string | null
          created_at?: string
          front?: string
          id?: string
          owner_id?: string
          source?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mistakes: {
        Row: {
          correct_answer: string
          created_at: string
          first_mistaken_at: string
          id: string
          last_mistaken_at: string
          last_reviewed_at: string | null
          mistake_count: number
          options: Json | null
          question_id: string
          question_text: string
          quiz_chapter: string | null
          quiz_id: string
          quiz_subject: string | null
          quiz_type: string | null
          resolved_at: string | null
          review_due_at: string | null
          status: string
          student_answer: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          first_mistaken_at?: string
          id?: string
          last_mistaken_at?: string
          last_reviewed_at?: string | null
          mistake_count?: number
          options?: Json | null
          question_id: string
          question_text: string
          quiz_chapter?: string | null
          quiz_id: string
          quiz_subject?: string | null
          quiz_type?: string | null
          resolved_at?: string | null
          review_due_at?: string | null
          status?: string
          student_answer?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          first_mistaken_at?: string
          id?: string
          last_mistaken_at?: string
          last_reviewed_at?: string | null
          mistake_count?: number
          options?: Json | null
          question_id?: string
          question_text?: string
          quiz_chapter?: string | null
          quiz_id?: string
          quiz_subject?: string | null
          quiz_type?: string | null
          resolved_at?: string | null
          review_due_at?: string | null
          status?: string
          student_answer?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          chapter: string | null
          created_at: string
          id: string
          points: number
          question_id: string | null
          quiz_type: string | null
          source_description: string | null
          source_id: string | null
          source_type: string
          student_id: string
          subject: string | null
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          id?: string
          points: number
          question_id?: string | null
          quiz_type?: string | null
          source_description?: string | null
          source_id?: string | null
          source_type: string
          student_id: string
          subject?: string | null
        }
        Update: {
          chapter?: string | null
          created_at?: string
          id?: string
          points?: number
          question_id?: string | null
          quiz_type?: string | null
          source_description?: string | null
          source_id?: string | null
          source_type?: string
          student_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          stream: string | null
          subscription_status: string | null
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          stream?: string | null
          subscription_status?: string | null
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          stream?: string | null
          subscription_status?: string | null
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completed_at: string | null
          id: string
          quiz_id: string
          score: number
          source: string
          student_id: string
          submitted: boolean
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          completed_at?: string | null
          id?: string
          quiz_id: string
          score?: number
          source?: string
          student_id: string
          submitted?: boolean
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completed_at?: string | null
          id?: string
          quiz_id?: string
          score?: number
          source?: string
          student_id?: string
          submitted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quiz_question_results: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          question_number: number | null
          question_text: string
          quiz_attempt_id: string
          quiz_chapter: string | null
          quiz_id: string | null
          quiz_subject: string | null
          quiz_type: string | null
          selected_choice_index: number | null
          student_answer: string | null
          student_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          question_number?: number | null
          question_text: string
          quiz_attempt_id: string
          quiz_chapter?: string | null
          quiz_id?: string | null
          quiz_subject?: string | null
          quiz_type?: string | null
          selected_choice_index?: number | null
          student_answer?: string | null
          student_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          question_number?: number | null
          question_text?: string
          quiz_attempt_id?: string
          quiz_chapter?: string | null
          quiz_id?: string | null
          quiz_subject?: string | null
          quiz_type?: string | null
          selected_choice_index?: number | null
          student_answer?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_results_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter: string | null
          created_at: string
          date: string
          id: string
          max_score: number
          questions: Json
          subject: string
          type: Database["public"]["Enums"]["quiz_type"]
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          date: string
          id?: string
          max_score?: number
          questions?: Json
          subject: string
          type: Database["public"]["Enums"]["quiz_type"]
        }
        Update: {
          chapter?: string | null
          created_at?: string
          date?: string
          id?: string
          max_score?: number
          questions?: Json
          subject?: string
          type?: Database["public"]["Enums"]["quiz_type"]
        }
        Relationships: []
      }
      review_log: {
        Row: {
          id: number
          item_id: string
          kind: string
          reviewed_at: string
          student_id: string
        }
        Insert: {
          id?: never
          item_id: string
          kind: string
          reviewed_at?: string
          student_id: string
        }
        Update: {
          id?: never
          item_id?: string
          kind?: string
          reviewed_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      school_students: {
        Row: {
          id: string
          joined_at: string
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string
          contract_date: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          city: string
          contract_date: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          city?: string
          contract_date?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_flashcard_progress: {
        Row: {
          created_at: string
          flashcard_id: string
          id: string
          last_reviewed_at: string
          next_review_at: string
          recall_rating: string
          review_count: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flashcard_id: string
          id?: string
          last_reviewed_at?: string
          next_review_at: string
          recall_rating: string
          review_count?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flashcard_id?: string
          id?: string
          last_reviewed_at?: string
          next_review_at?: string
          recall_rating?: string
          review_count?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_flashcard_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          requester_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          requester_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          requester_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_activity_logs: {
        Row: {
          action: string
          chapter: string | null
          created_at: string
          id: string
          student_id: string
          subject: string
          video_id: string
          video_title: string
        }
        Insert: {
          action: string
          chapter?: string | null
          created_at?: string
          id?: string
          student_id: string
          subject: string
          video_id: string
          video_title: string
        }
        Update: {
          action?: string
          chapter?: string | null
          created_at?: string
          id?: string
          student_id?: string
          subject?: string
          video_id?: string
          video_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_activity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed_at: string | null
          id: string
          student_id: string
          video_id: string
          watched: boolean | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          student_id: string
          video_id: string
          watched?: boolean | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          student_id?: string
          video_id?: string
          watched?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel: string | null
          chapter: string | null
          created_at: string
          description: string | null
          duration: number | null
          exam_id: string | null
          file_path: string | null
          id: string
          kind: string
          subject: string
          title: string
          type: Database["public"]["Enums"]["video_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          channel?: string | null
          chapter?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          exam_id?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          subject: string
          title: string
          type: Database["public"]["Enums"]["video_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          channel?: string | null
          chapter?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          exam_id?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          subject?: string
          title?: string
          type?: Database["public"]["Enums"]["video_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string | null
          name: string | null
          total_score: number | null
        }
        Relationships: []
      }
      quizzes_public: {
        Row: {
          chapter: string | null
          created_at: string | null
          date: string | null
          id: string | null
          max_score: number | null
          questions: Json | null
          subject: string | null
          type: Database["public"]["Enums"]["quiz_type"] | null
        }
        Insert: {
          chapter?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          max_score?: number | null
          questions?: never
          subject?: string | null
          type?: Database["public"]["Enums"]["quiz_type"] | null
        }
        Update: {
          chapter?: string | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          max_score?: number | null
          questions?: never
          subject?: string | null
          type?: Database["public"]["Enums"]["quiz_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_chapter_mastery: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_mistakes: number
          attempted: number
          correct: number
          mastery_pct: number
          quiz_chapter: string
          quiz_subject: string
        }[]
      }
      get_city_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          total_score: number
        }[]
      }
      get_or_create_daily_question: {
        Args: Record<PropertyKey, never>
        Returns: {
          answered_at: string
          correct_answer: string
          id: string
          is_correct: boolean
          options: Json
          question_id: string
          question_text: string
          quiz_chapter: string
          quiz_id: string
          quiz_subject: string
          reason: string
          student_answer: string
        }[]
      }
      get_school_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          total_score: number
        }[]
      }
      get_study_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_streak: number
          days_this_month: number
          longest_streak: number
          tasks_completed_today: number
        }[]
      }
      get_weekly_report: {
        Args: { p_weeks_ago?: number }
        Returns: {
          flashcards_reviewed: number
          lessons_completed: number
          mistakes_made: number
          mistakes_reviewed: number
          prev_lessons_completed: number
          prev_questions_answered: number
          prev_questions_correct: number
          prev_simulations_completed: number
          prev_study_days: number
          prev_week_end: string
          prev_week_start: string
          questions_answered: number
          questions_correct: number
          simulations_completed: number
          study_days: number
          week_end: string
          week_start: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_mistake_reviewed: {
        Args: { p_mistake_id: string }
        Returns: undefined
      }
      record_flashcard_review: {
        Args: { p_flashcard_id: string; p_recall_rating: string }
        Returns: {
          created_at: string
          flashcard_id: string
          id: string
          last_reviewed_at: string
          next_review_at: string
          recall_rating: string
          review_count: number
          student_id: string
          updated_at: string
        }
      }
      record_points_transaction: {
        Args: {
          p_chapter?: string
          p_points: number
          p_question_id?: string
          p_quiz_type?: string
          p_source_description?: string
          p_source_id?: string
          p_source_type: string
          p_student_id: string
          p_subject?: string
        }
        Returns: string
      }
      start_exam_simulation: {
        Args: { p_quiz_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          expires_at: string
          id: string
          quiz_attempt_id: string
          quiz_id: string
          started_at: string
          status: string
          student_id: string
        }
      }
      submit_daily_question: {
        Args: { p_answer: string }
        Returns: {
          correct_answer: string
          is_correct: boolean
        }[]
      }
      submit_exam_simulation: {
        Args: { p_answers: Json; p_session_id: string }
        Returns: {
          correct_count: number
          max_score: number
          score: number
          total_questions: number
          was_late: boolean
        }[]
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_attempt_id: string }
        Returns: {
          correct_count: number
          max_score: number
          score: number
          total_questions: number
        }[]
      }
    }
    Enums: {
      quiz_type: "daily" | "normal" | "practice"
      user_role: "student" | "premium" | "admin"
      video_type: "youtube" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      quiz_type: ["daily", "normal", "practice"],
      user_role: ["student", "premium", "admin"],
      video_type: ["youtube", "premium"],
    },
  },
} as const

