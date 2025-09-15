export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      advice_tips: {
        Row: {
          active: boolean | null
          category: string | null
          content: string
          created_at: string
          id: string
          priority: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          priority?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          priority?: number | null
          title?: string
        }
        Relationships: []
      }
      ai_learning_conversations: {
        Row: {
          answer_text: string
          chapter: string | null
          created_at: string
          id: string
          question_text: string
          subject: string | null
          user_id: string
        }
        Insert: {
          answer_text: string
          chapter?: string | null
          created_at?: string
          id?: string
          question_text: string
          subject?: string | null
          user_id: string
        }
        Update: {
          answer_text?: string
          chapter?: string | null
          created_at?: string
          id?: string
          question_text?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alumni: {
        Row: {
          advice: string | null
          available_for_mentoring: boolean | null
          avatar_url: string | null
          bac_score: number | null
          created_at: string
          field_of_study: string | null
          id: string
          linkedin_url: string | null
          name: string
          university: string | null
          updated_at: string
        }
        Insert: {
          advice?: string | null
          available_for_mentoring?: boolean | null
          avatar_url?: string | null
          bac_score?: number | null
          created_at?: string
          field_of_study?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          advice?: string | null
          available_for_mentoring?: boolean | null
          avatar_url?: string | null
          bac_score?: number | null
          created_at?: string
          field_of_study?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          alumni_id: string
          created_at: string
          id: string
          notes: string | null
          phone: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          time_preference: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          alumni_id: string
          created_at?: string
          id?: string
          notes?: string | null
          phone: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: string
          time_preference?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          alumni_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: string
          time_preference?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
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
          difficulty: string | null
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
          difficulty?: string | null
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
          difficulty?: string | null
          exam_id?: string
          exam_title?: string
          id?: string
          stream?: string
          student_id?: string
          subject?: string
          year?: number
        }
        Relationships: []
      }
      exam_progress: {
        Row: {
          completed_at: string | null
          exam_id: string
          id: string
          solved_with_ai: boolean | null
          student_id: string
          viewed_exam: boolean | null
          viewed_solution: boolean | null
        }
        Insert: {
          completed_at?: string | null
          exam_id: string
          id?: string
          solved_with_ai?: boolean | null
          student_id: string
          viewed_exam?: boolean | null
          viewed_solution?: boolean | null
        }
        Update: {
          completed_at?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          stream: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          stream?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          stream?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions_import: {
        Row: {
          chapter: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id: string | null
          subject: string
        }
        Insert: {
          chapter?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id?: string | null
          subject: string
        }
        Update: {
          chapter?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          quiz_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_import_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completed_at: string
          id: string
          quiz_id: string
          score: number
          student_id: string
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          completed_at?: string
          id?: string
          quiz_id: string
          score?: number
          student_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number
          student_id?: string
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
          question_text: string
          quiz_attempt_id: string
          student_answer: string | null
          student_id: string
          time_spent: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          question_text: string
          quiz_attempt_id: string
          student_answer?: string | null
          student_id: string
          time_spent?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          question_text?: string
          quiz_attempt_id?: string
          student_answer?: string | null
          student_id?: string
          time_spent?: number | null
        }
        Relationships: []
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
      student_questions_log: {
        Row: {
          ai_response: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          question_text: string
          satisfaction_rating: number | null
          student_id: string
          subject: string | null
          topic: string | null
        }
        Insert: {
          ai_response?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          question_text: string
          satisfaction_rating?: number | null
          student_id: string
          subject?: string | null
          topic?: string | null
        }
        Update: {
          ai_response?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          question_text?: string
          satisfaction_rating?: number | null
          student_id?: string
          subject?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      video_activity_logs: {
        Row: {
          action: string
          chapter: string | null
          created_at: string
          id: string
          position: number | null
          session_id: string | null
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
          position?: number | null
          session_id?: string | null
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
          position?: number | null
          session_id?: string | null
          student_id?: string
          subject?: string
          video_id?: string
          video_title?: string
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed_at: string | null
          id: string
          student_id: string
          video_id: string
          watch_time: number | null
          watched: boolean | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          student_id: string
          video_id: string
          watch_time?: number | null
          watched?: boolean | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          student_id?: string
          video_id?: string
          watch_time?: number | null
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
          chapter: string | null
          created_at: string
          description: string | null
          duration: number | null
          file_path: string | null
          id: string
          subject: string
          title: string
          type: Database["public"]["Enums"]["video_type"]
          updated_at: string
          url: string | null
          views: number | null
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path?: string | null
          id?: string
          subject: string
          title: string
          type: Database["public"]["Enums"]["video_type"]
          updated_at?: string
          url?: string | null
          views?: number | null
        }
        Update: {
          chapter?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          file_path?: string | null
          id?: string
          subject?: string
          title?: string
          type?: Database["public"]["Enums"]["video_type"]
          updated_at?: string
          url?: string | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_score: {
        Args: { user_id_param: string }
        Returns: number
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      quiz_type: "daily" | "normal" | "practice"
      subscription_tier: "basic" | "offer1" | "offer2"
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
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      quiz_type: ["daily", "normal", "practice"],
      subscription_tier: ["basic", "offer1", "offer2"],
      user_role: ["student", "premium", "admin"],
      video_type: ["youtube", "premium"],
    },
  },
} as const
