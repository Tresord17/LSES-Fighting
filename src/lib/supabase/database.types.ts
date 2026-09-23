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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athlete_private: {
        Row: {
          athlete_id: string
          birth_date: string | null
          guardian_attested_at: string | null
          guardian_attested_by: string | null
          updated_at: string
        }
        Insert: {
          athlete_id: string
          birth_date?: string | null
          guardian_attested_at?: string | null
          guardian_attested_by?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          birth_date?: string | null
          guardian_attested_at?: string | null
          guardian_attested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_private_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_private_guardian_attested_by_fkey"
            columns: ["guardian_attested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          bio: string | null
          city: string | null
          coach_id: string | null
          created_at: string
          discipline: Database["public"]["Enums"]["discipline"] | null
          fights_count: number | null
          first_names: string | null
          id: string
          last_name: string | null
          modified_since_review: boolean
          photo_path: string | null
          practice_since: number | null
          publication_consent_at: string | null
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sex: Database["public"]["Enums"]["sex"] | null
          slug: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          weight_class: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          coach_id?: string | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"] | null
          fights_count?: number | null
          first_names?: string | null
          id: string
          last_name?: string | null
          modified_since_review?: boolean
          photo_path?: string | null
          practice_since?: number | null
          publication_consent_at?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sex?: Database["public"]["Enums"]["sex"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          weight_class?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          coach_id?: string | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"] | null
          fights_count?: number | null
          first_names?: string | null
          id?: string
          last_name?: string | null
          modified_since_review?: boolean
          photo_path?: string | null
          practice_since?: number | null
          publication_consent_at?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sex?: Database["public"]["Enums"]["sex"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          automatic: boolean
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          automatic?: boolean
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          automatic?: boolean
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      coaches: {
        Row: {
          approved_at: string | null
          bio: string | null
          city: string | null
          created_at: string
          disciplines: Database["public"]["Enums"]["discipline"][]
          dojo_name: string | null
          experience_years: number | null
          first_names: string | null
          id: string
          last_name: string | null
          photo_path: string | null
          publication_consent_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          disciplines?: Database["public"]["Enums"]["discipline"][]
          dojo_name?: string | null
          experience_years?: number | null
          first_names?: string | null
          id: string
          last_name?: string | null
          photo_path?: string | null
          publication_consent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          disciplines?: Database["public"]["Enums"]["discipline"][]
          dojo_name?: string | null
          experience_years?: number | null
          first_names?: string | null
          id?: string
          last_name?: string | null
          photo_path?: string | null
          publication_consent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          created_by: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          duration_seconds: number | null
          external_url: string | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          position: number
          size_bytes: number | null
          storage_path: string | null
          title_en: string | null
          title_fr: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discipline: Database["public"]["Enums"]["discipline"]
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          position?: number
          size_bytes?: number | null
          storage_path?: string | null
          title_en?: string | null
          title_fr: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discipline?: Database["public"]["Enums"]["discipline"]
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          position?: number
          size_bytes?: number | null
          storage_path?: string | null
          title_en?: string | null
          title_fr?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          body_en: string | null
          body_fr: string | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          excerpt_en: string | null
          excerpt_fr: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          title_en: string | null
          title_fr: string
          updated_at: string
        }
        Insert: {
          body_en?: string | null
          body_fr?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          title_en?: string | null
          title_fr: string
          updated_at?: string
        }
        Update: {
          body_en?: string | null
          body_fr?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title_en?: string | null
          title_fr?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      palmares_entries: {
        Row: {
          athlete_id: string
          competition: string
          created_at: string
          id: string
          location: string | null
          rejection_reason: string | null
          result: Database["public"]["Enums"]["competition_result"]
          review_request_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
          weight_class: string | null
          year: number
        }
        Insert: {
          athlete_id: string
          competition: string
          created_at?: string
          id?: string
          location?: string | null
          rejection_reason?: string | null
          result: Database["public"]["Enums"]["competition_result"]
          review_request_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          weight_class?: string | null
          year: number
        }
        Update: {
          athlete_id?: string
          competition?: string
          created_at?: string
          id?: string
          location?: string | null
          rejection_reason?: string | null
          result?: Database["public"]["Enums"]["competition_result"]
          review_request_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          weight_class?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "palmares_entries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palmares_entries_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palmares_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          athlete_id: string | null
          coach_id: string | null
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          due_at: string | null
          escalated_at: string | null
          id: string
          kind: Database["public"]["Enums"]["request_kind"]
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string
        }
        Insert: {
          athlete_id?: string | null
          coach_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          due_at?: string | null
          escalated_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["request_kind"]
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          due_at?: string | null
          escalated_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      choose_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      mark_athlete_reviewed: {
        Args: { p_athlete_id: string }
        Returns: undefined
      }
      pending_athlete_ages: {
        Args: never
        Returns: {
          age: number
          athlete_id: string
          is_minor: boolean
        }[]
      }
      review_athlete_profile: {
        Args: {
          p_approve: boolean
          p_guardian_attested?: boolean
          p_reason?: string
          p_rejected_entry_ids?: string[]
          p_request_id: string
        }
        Returns: undefined
      }
      review_coach_account: {
        Args: { p_approve: boolean; p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      review_palmares: {
        Args: {
          p_approve: boolean
          p_reason?: string
          p_rejected_entry_ids?: string[]
          p_request_id: string
        }
        Returns: undefined
      }
      submit_athlete_profile: { Args: never; Returns: string }
      submit_coach_profile: { Args: never; Returns: string }
      withdraw_profile: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "athlete" | "coach" | "superviseur"
      competition_result: "gold" | "silver" | "bronze" | "participation"
      discipline: "sambo" | "mma"
      entry_status: "pending" | "approved" | "rejected"
      media_kind: "image" | "video" | "video_link"
      publication_status: "draft" | "published"
      request_kind: "athlete_profile" | "palmares" | "coach_account"
      request_status: "open" | "approved" | "rejected" | "cancelled"
      review_status: "draft" | "pending" | "approved" | "rejected"
      sex: "female" | "male"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["athlete", "coach", "superviseur"],
      competition_result: ["gold", "silver", "bronze", "participation"],
      discipline: ["sambo", "mma"],
      entry_status: ["pending", "approved", "rejected"],
      media_kind: ["image", "video", "video_link"],
      publication_status: ["draft", "published"],
      request_kind: ["athlete_profile", "palmares", "coach_account"],
      request_status: ["open", "approved", "rejected", "cancelled"],
      review_status: ["draft", "pending", "approved", "rejected"],
      sex: ["female", "male"],
    },
  },
} as const
