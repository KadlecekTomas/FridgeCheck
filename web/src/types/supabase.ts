export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      foods: {
        Row: {
          added_at: string | null
          added_by_user: string | null
          brand: string | null
          category: string | null
          ean_code: string | null
          expiration_date: string
          external_name: string | null
          household_id: string | null
          id: string
          image_url: string | null
          name: string
          quantity: string | null
          status: string | null
          storage_unit_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by_user?: string | null
          brand?: string | null
          category?: string | null
          ean_code?: string | null
          expiration_date: string
          external_name?: string | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          quantity?: string | null
          status?: string | null
          storage_unit_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by_user?: string | null
          brand?: string | null
          category?: string | null
          ean_code?: string | null
          expiration_date?: string
          external_name?: string | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          quantity?: string | null
          status?: string | null
          storage_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_with_member_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_storage_unit_id_fkey"
            columns: ["storage_unit_id"]
            isOneToOne: false
            referencedRelation: "storage_units"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_with_member_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_premium: boolean | null
          role: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_premium?: boolean | null
          role?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          role?: string
        }
        Relationships: []
      }
      storage_unit_members: {
        Row: {
          joined_at: string | null
          role: string | null
          storage_unit_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string | null
          storage_unit_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string | null
          storage_unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_unit_members_storage_unit_id_fkey"
            columns: ["storage_unit_id"]
            isOneToOne: false
            referencedRelation: "storage_units"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_units: {
        Row: {
          created_at: string | null
          household_id: string | null
          id: string
          name: string
          owner_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          name: string
          owner_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_units_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_with_member_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_units_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      foods_for_user: {
        Row: {
          added_at: string | null
          added_by_user: string | null
          brand: string | null
          category: string | null
          ean_code: string | null
          expiration_date: string | null
          external_name: string | null
          household_id: string | null
          household_name: string | null
          id: string | null
          image_url: string | null
          name: string | null
          quantity: string | null
          status: string | null
          storage_name: string | null
          storage_type: string | null
          storage_unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_with_member_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foods_storage_unit_id_fkey"
            columns: ["storage_unit_id"]
            isOneToOne: false
            referencedRelation: "storage_units"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members_with_email: {
        Row: {
          email: string | null
          household_id: string | null
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_id_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_with_member_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_with_member_count: {
        Row: {
          id: string | null
          invite_code: string | null
          member_count: number | null
          name: string | null
          owner_id: string | null
        }
        Relationships: []
      }
      user_households_view: {
        Row: {
          created_at: string | null
          id: string | null
          invite_code: string | null
          name: string | null
          owner_id: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_foods: {
        Args: { fridge: string; user_id: string }
        Returns: {
          id: string
          name: string
          expiration_date: string
          category: string
          household_id: string
          storage_unit_id: string
          added_by_user: string
          image_url: string
          quantity: string
          brand: string
          status: string
          added_at: string
        }[]
      }
      join_household: {
        Args: { household: string }
        Returns: undefined
      }
      regenerate_invite_code: {
        Args: { household_uuid: string }
        Returns: undefined
      }
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

