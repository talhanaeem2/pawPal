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
      activity_logs: {
        Row: {
          activity_type: string | null
          created_at: string | null
          duration_min: number | null
          id: string
          notes: string | null
          occurred_at: string | null
          pet_id: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          duration_min?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          pet_id?: string | null
          user_id?: string
          weight?: number | null
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          duration_min?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string | null
          pet_id?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      dewormings: {
        Row: {
          administered_at: string
          administered_by: string | null
          created_at: string
          id: string
          next_due_at: string
          notes: string | null
          pet_id: string
          product_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          administered_at: string
          administered_by?: string | null
          created_at?: string
          id?: string
          next_due_at: string
          notes?: string | null
          pet_id: string
          product_name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          administered_at?: string
          administered_by?: string | null
          created_at?: string
          id?: string
          next_due_at?: string
          notes?: string | null
          pet_id?: string
          product_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dewormings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          fire_date: string
          id: string
          ref_id: string
          ref_type: string
          sent_at: string
        }
        Insert: {
          fire_date: string
          id?: string
          ref_id: string
          ref_type: string
          sent_at?: string
        }
        Update: {
          fire_date?: string
          id?: string
          ref_id?: string
          ref_type?: string
          sent_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          birthdate: string | null
          breed: string | null
          created_at: string | null
          gender: string | null
          id: string
          microchip: string | null
          name: string | null
          neutered: boolean
          notes: string | null
          photo_url: string | null
          species: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birthdate?: string | null
          breed?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          microchip?: string | null
          name?: string | null
          neutered?: boolean
          notes?: string | null
          photo_url?: string | null
          species?: string | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          birthdate?: string | null
          breed?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          microchip?: string | null
          name?: string | null
          neutered?: boolean
          notes?: string | null
          photo_url?: string | null
          species?: string | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          locale: string
          notifications_enabled: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          locale?: string
          notifications_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          notifications_enabled?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_completions: {
        Row: {
          completed_at: string
          completed_on: string
          created_at: string
          id: string
          schedule_item_pet_id: string
        }
        Insert: {
          completed_at?: string
          completed_on?: string
          created_at?: string
          id?: string
          schedule_item_pet_id: string
        }
        Update: {
          completed_at?: string
          completed_on?: string
          created_at?: string
          id?: string
          schedule_item_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_completions_schedule_item_pet_id_fkey"
            columns: ["schedule_item_pet_id"]
            isOneToOne: false
            referencedRelation: "schedule_item_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_item_pets: {
        Row: {
          created_at: string
          dosage: string | null
          id: string
          notes: string | null
          pet_id: string
          schedule_item_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          schedule_item_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          schedule_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_item_pets_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_item_pets_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          created_at: string | null
          id: string
          kind: string
          repeat_every: number
          repeat_unit: string
          start_date: string
          time_of_day: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind: string
          repeat_every?: number
          repeat_unit?: string
          start_date?: string
          time_of_day?: string | null
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string
          repeat_every?: number
          repeat_unit?: string
          start_date?: string
          time_of_day?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_at: string
          administered_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          next_due_at: string | null
          notes: string | null
          pet_id: string
          updated_at: string | null
          user_id: string
          vaccine_name: string
        }
        Insert: {
          administered_at: string
          administered_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          pet_id: string
          updated_at?: string | null
          user_id?: string
          vaccine_name: string
        }
        Update: {
          administered_at?: string
          administered_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          pet_id?: string
          updated_at?: string | null
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_appointments: {
        Row: {
          completed: boolean
          created_at: string | null
          date: string | null
          id: string
          notes: string | null
          pet_id: string | null
          reason: string | null
          updated_at: string | null
          user_id: string
          vet_name: string | null
        }
        Insert: {
          completed: boolean
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string
          vet_name?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
