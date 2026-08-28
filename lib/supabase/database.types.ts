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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          school_id: string
          show_id: string | null
          status: Database["public"]["Enums"]["access_code_status"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          school_id: string
          show_id?: string | null
          status?: Database["public"]["Enums"]["access_code_status"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          school_id?: string
          show_id?: string | null
          status?: Database["public"]["Enums"]["access_code_status"]
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          show_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          show_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          show_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          created_at: string
          id: string
          show_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          id: string
          show_id: string
          source: Database["public"]["Enums"]["entitlement_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          show_id: string
          source?: Database["public"]["Enums"]["entitlement_source"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          show_id?: string
          source?: Database["public"]["Enums"]["entitlement_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invited_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          school_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invited_emails_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_pence: number
          created_at: string
          currency: string
          id: string
          show_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_pence: number
          created_at?: string
          currency?: string
          id?: string
          show_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_pence?: number
          created_at?: string
          currency?: string
          id?: string
          show_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_categories: {
        Row: {
          category_id: string
          performance_id: string
        }
        Insert: {
          category_id: string
          performance_id: string
        }
        Update: {
          category_id?: string
          performance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_categories_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          bunny_video_id: string
          clip_end_seconds: number | null
          clip_start_seconds: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          show_id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          video_source: Database["public"]["Enums"]["performance_video_source"]
        }
        Insert: {
          bunny_video_id: string
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          show_id: string
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          video_source?: Database["public"]["Enums"]["performance_video_source"]
        }
        Update: {
          bunny_video_id?: string
          clip_end_seconds?: number | null
          clip_start_seconds?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          show_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          video_source?: Database["public"]["Enums"]["performance_video_source"]
        }
        Relationships: [
          {
            foreignKeyName: "performances_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_admin?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          name?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          about_image_url: string | null
          about_text: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          logo_colour_url: string | null
          logo_white_url: string | null
          name: string
          platform_name: string | null
          slug: string
          status: Database["public"]["Enums"]["school_status"]
          team_bio: string | null
          team_image_url: string | null
          team_name: string | null
          team_role: string | null
          team_tagline: string | null
          theme: Json
        }
        Insert: {
          about_image_url?: string | null
          about_text?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          logo_colour_url?: string | null
          logo_white_url?: string | null
          name: string
          platform_name?: string | null
          slug: string
          status?: Database["public"]["Enums"]["school_status"]
          team_bio?: string | null
          team_image_url?: string | null
          team_name?: string | null
          team_role?: string | null
          team_tagline?: string | null
          theme?: Json
        }
        Update: {
          about_image_url?: string | null
          about_text?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          logo_colour_url?: string | null
          logo_white_url?: string | null
          name?: string
          platform_name?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["school_status"]
          team_bio?: string | null
          team_image_url?: string | null
          team_name?: string | null
          team_role?: string | null
          team_tagline?: string | null
          theme?: Json
        }
        Relationships: []
      }
      show_videos: {
        Row: {
          download_url: string | null
          duration_seconds: number | null
          full_show_bunny_video_id: string | null
          full_show_thumbnail_url: string | null
          show_id: string
        }
        Insert: {
          download_url?: string | null
          duration_seconds?: number | null
          full_show_bunny_video_id?: string | null
          full_show_thumbnail_url?: string | null
          show_id: string
        }
        Update: {
          download_url?: string | null
          duration_seconds?: number | null
          full_show_bunny_video_id?: string | null
          full_show_thumbnail_url?: string | null
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_videos_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artwork_url: string | null
          created_at: string
          id: string
          intro_text: string | null
          price_pence: number
          school_id: string
          season: string | null
          show_year: number | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["show_status"]
          stripe_price_id: string | null
          title: string
        }
        Insert: {
          artwork_url?: string | null
          created_at?: string
          id?: string
          intro_text?: string | null
          price_pence?: number
          school_id: string
          season?: string | null
          show_year?: number | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["show_status"]
          stripe_price_id?: string | null
          title: string
        }
        Update: {
          artwork_url?: string | null
          created_at?: string
          id?: string
          intro_text?: string | null
          price_pence?: number
          school_id?: string
          season?: string | null
          show_year?: number | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["show_status"]
          stripe_price_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_entitlement: { Args: { p_show: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_invited: { Args: { p_school: string }; Returns: boolean }
    }
    Enums: {
      access_code_status: "active" | "disabled"
      category_kind: "group" | "style"
      entitlement_source: "purchase" | "granted"
      invite_status: "invited" | "registered"
      order_status: "pending" | "paid" | "refunded"
      performance_video_source: "show" | "standalone"
      school_status: "active" | "disabled"
      show_status: "draft" | "published"
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
      access_code_status: ["active", "disabled"],
      category_kind: ["group", "style"],
      entitlement_source: ["purchase", "granted"],
      invite_status: ["invited", "registered"],
      order_status: ["pending", "paid", "refunded"],
      performance_video_source: ["show", "standalone"],
      school_status: ["active", "disabled"],
      show_status: ["draft", "published"],
    },
  },
} as const
