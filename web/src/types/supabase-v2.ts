export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          user_id?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          created_at: string
          created_by: string
          expiry_date: string | null
          expiry_type: Database["public"]["Enums"]["expiry_type"]
          household_id: string
          id: string
          opened_at: string | null
          product_id: string
          purchased_at: string | null
          quantity: number
          status: Database["public"]["Enums"]["batch_status"]
          storage_unit_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expiry_date?: string | null
          expiry_type?: Database["public"]["Enums"]["expiry_type"]
          household_id: string
          id?: string
          opened_at?: string | null
          product_id: string
          purchased_at?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["batch_status"]
          storage_unit_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          expiry_type?: Database["public"]["Enums"]["expiry_type"]
          household_id?: string
          id?: string
          opened_at?: string | null
          product_id?: string
          purchased_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["batch_status"]
          storage_unit_id?: string
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      inventory_events: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          inventory_batch_id: string | null
          product_id: string
          quantity_delta: number | null
          reason: string | null
          type: Database["public"]["Enums"]["inventory_event_type"]
          unit: Database["public"]["Enums"]["inventory_unit"] | null
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          inventory_batch_id?: string | null
          product_id: string
          quantity_delta?: number | null
          reason?: string | null
          type: Database["public"]["Enums"]["inventory_event_type"]
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          inventory_batch_id?: string | null
          product_id?: string
          quantity_delta?: number | null
          reason?: string | null
          type?: Database["public"]["Enums"]["inventory_event_type"]
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          default_unit: Database["public"]["Enums"]["inventory_unit"]
          ean_code: string | null
          household_id: string
          id: string
          image_url: string | null
          name: string
          package_quantity: number | null
          package_unit: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          default_unit: Database["public"]["Enums"]["inventory_unit"]
          ean_code?: string | null
          household_id: string
          id?: string
          image_url?: string | null
          name: string
          package_quantity?: number | null
          package_unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          default_unit?: Database["public"]["Enums"]["inventory_unit"]
          ean_code?: string | null
          household_id?: string
          id?: string
          image_url?: string | null
          name?: string
          package_quantity?: number | null
          package_unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          checked: boolean
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          product_id: string | null
          quantity: number | null
          source: Database["public"]["Enums"]["shopping_item_source"]
          unit: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          name: string
          product_id?: string | null
          quantity?: number | null
          source?: Database["public"]["Enums"]["shopping_item_source"]
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
          product_id?: string | null
          quantity?: number | null
          source?: Database["public"]["Enums"]["shopping_item_source"]
          unit?: Database["public"]["Enums"]["inventory_unit"] | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_targets: {
        Row: {
          created_at: string
          household_id: string
          id: string
          minimum_quantity: number
          product_id: string
          target_quantity: number
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          minimum_quantity: number
          product_id: string
          target_quantity: number
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          minimum_quantity?: number
          product_id?: string
          target_quantity?: number
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      storage_units: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          type: Database["public"]["Enums"]["storage_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["storage_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["storage_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_batch_to_product: {
        Args: {
          p_expiry_date?: string
          p_expiry_type?: Database["public"]["Enums"]["expiry_type"]
          p_product_id: string
          p_purchased_at?: string
          p_quantity: number
          p_storage_unit_id: string
          p_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Returns: string
      }
      consume_product_fefo: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
      correct_inventory_batch: {
        Args: { p_batch_id: string; p_new_quantity: number; p_reason?: string }
        Returns: number
      }
      create_household: {
        Args: { household_name: string }
        Returns: string
      }
      create_or_add_product_batch: {
        Args: {
          p_brand?: string
          p_category?: string
          p_ean_code?: string
          p_expiry_date?: string
          p_expiry_type?: Database["public"]["Enums"]["expiry_type"]
          p_household_id: string
          p_image_url?: string
          p_name: string
          p_package_quantity?: number
          p_package_unit?: Database["public"]["Enums"]["inventory_unit"]
          p_purchased_at?: string
          p_quantity: number
          p_storage_unit_id: string
          p_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Returns: string
      }
      create_product_with_batch: {
        Args: {
          p_brand?: string
          p_category?: string
          p_ean_code?: string
          p_expiry_date?: string
          p_expiry_type?: Database["public"]["Enums"]["expiry_type"]
          p_household_id: string
          p_image_url?: string
          p_name: string
          p_purchased_at?: string
          p_quantity: number
          p_storage_unit_id: string
          p_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Returns: string
      }
      discard_inventory_batch: {
        Args: { p_batch_id: string; p_quantity: number; p_reason?: string }
        Returns: number
      }
      save_product_expiry_batches: {
        Args: {
          p_batches: Json
          p_brand?: string
          p_category?: string
          p_ean_code?: string
          p_household_id: string
          p_image_url?: string
          p_name?: string
          p_package_quantity?: number
          p_package_unit?: Database["public"]["Enums"]["inventory_unit"]
          p_product_id?: string
          p_purchased_at?: string
          p_storage_unit_id: string
          p_unit: Database["public"]["Enums"]["inventory_unit"]
        }
        Returns: string
      }
    }
    Enums: {
      batch_status: "active" | "depleted" | "discarded"
      expiry_type: "use_by" | "best_before" | "unknown"
      household_role: "owner" | "member"
      inventory_event_type:
        | "purchase"
        | "consume"
        | "discard"
        | "correction"
        | "move"
        | "open"
      inventory_unit: "g" | "kg" | "ml" | "l" | "pcs"
      shopping_item_source: "derived" | "manual"
      storage_type: "fridge" | "freezer" | "pantry" | "cabinet" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
