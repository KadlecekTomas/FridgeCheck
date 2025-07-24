import type { Database } from './supabase';

export type Household = Database["public"]["Tables"]["households"]["Row"];
export type StorageUnit = Database["public"]["Tables"]["storage_units"]["Row"]; 