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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agenda_events: {
        Row: {
          created_at: string
          emoji: string | null
          event_date: string
          event_type: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          age_years: number | null
          birth_date: string | null
          created_at: string
          family_id: string
          gender: string | null
          id: string
          name: string
        }
        Insert: {
          age_years?: number | null
          birth_date?: string | null
          created_at?: string
          family_id: string
          gender?: string | null
          id?: string
          name?: string
        }
        Update: {
          age_years?: number | null
          birth_date?: string | null
          created_at?: string
          family_id?: string
          gender?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_profiles: {
        Row: {
          city: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          max_travel_minutes: number | null
          newsletter_generated_at: string | null
          parent_name: string
          postal_code: string | null
          preferences: string[] | null
          transport_modes: string[] | null
          updated_at: string
          user_id: string
          weekend_dislikes: string[] | null
          weekend_picks: string[] | null
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_travel_minutes?: number | null
          newsletter_generated_at?: string | null
          parent_name?: string
          postal_code?: string | null
          preferences?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id: string
          weekend_dislikes?: string[] | null
          weekend_picks?: string[] | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_travel_minutes?: number | null
          newsletter_generated_at?: string | null
          parent_name?: string
          postal_code?: string | null
          preferences?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id?: string
          weekend_dislikes?: string[] | null
          weekend_picks?: string[] | null
        }
        Relationships: []
      }
      newsletter_cache: {
        Row: {
          content: Json
          created_at: string
          id: string
          user_id: string
          week_key: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          user_id: string
          week_key: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          user_id?: string
          week_key?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_primary: boolean
          name: string | null
          opt_in: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          name?: string | null
          opt_in?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string | null
          opt_in?: boolean
          user_id?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          activities_found: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          sources_scraped: string[] | null
          started_at: string
          status: string
          week_key: string
        }
        Insert: {
          activities_found?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          sources_scraped?: string[] | null
          started_at?: string
          status?: string
          week_key: string
        }
        Update: {
          activities_found?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          sources_scraped?: string[] | null
          started_at?: string
          status?: string
          week_key?: string
        }
        Relationships: []
      }
      scraped_activities: {
        Row: {
          arrondissement: string | null
          badge: string | null
          booking_url: string | null
          category: string
          cinema_name: string | null
          cinema_url: string | null
          created_at: string
          date_end: string | null
          date_start: string | null
          description: string | null
          duration: string | null
          id: string
          is_exceptional: boolean | null
          location: string | null
          poster_url: string | null
          raw_data: Json | null
          scraped_at: string
          showtimes: string | null
          source_url: string | null
          title: string
          travel_bike: string | null
          travel_car: string | null
          travel_walk: string | null
          week_key: string
        }
        Insert: {
          arrondissement?: string | null
          badge?: string | null
          booking_url?: string | null
          category: string
          cinema_name?: string | null
          cinema_url?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_exceptional?: boolean | null
          location?: string | null
          poster_url?: string | null
          raw_data?: Json | null
          scraped_at?: string
          showtimes?: string | null
          source_url?: string | null
          title: string
          travel_bike?: string | null
          travel_car?: string | null
          travel_walk?: string | null
          week_key: string
        }
        Update: {
          arrondissement?: string | null
          badge?: string | null
          booking_url?: string | null
          category?: string
          cinema_name?: string | null
          cinema_url?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_exceptional?: boolean | null
          location?: string | null
          poster_url?: string | null
          raw_data?: Json | null
          scraped_at?: string
          showtimes?: string | null
          source_url?: string | null
          title?: string
          travel_bike?: string | null
          travel_car?: string | null
          travel_walk?: string | null
          week_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
