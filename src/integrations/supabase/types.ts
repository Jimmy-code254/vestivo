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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chama_contributions: {
        Row: {
          amount: number
          chama_id: string
          created_at: string
          id: string
          paid_at: string | null
          round_number: number
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          chama_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          round_number: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          chama_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          round_number?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chama_contributions_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      chama_members: {
        Row: {
          chama_id: string
          id: string
          joined_at: string
          payout_position: number | null
          role: string
          status: string
          total_contributed: number
          user_id: string
        }
        Insert: {
          chama_id: string
          id?: string
          joined_at?: string
          payout_position?: number | null
          role?: string
          status?: string
          total_contributed?: number
          user_id: string
        }
        Update: {
          chama_id?: string
          id?: string
          joined_at?: string
          payout_position?: number | null
          role?: string
          status?: string
          total_contributed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chama_members_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      chama_messages: {
        Row: {
          chama_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          chama_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          chama_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chama_messages_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      chamas: {
        Row: {
          contribution_amount: number
          created_at: string
          creator_id: string
          current_round: number
          description: string | null
          frequency: string
          id: string
          invite_code: string
          max_members: number
          name: string
          status: string
          total_rounds: number
          updated_at: string
        }
        Insert: {
          contribution_amount: number
          created_at?: string
          creator_id: string
          current_round?: number
          description?: string | null
          frequency?: string
          id?: string
          invite_code?: string
          max_members?: number
          name: string
          status?: string
          total_rounds?: number
          updated_at?: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          creator_id?: string
          current_round?: number
          description?: string | null
          frequency?: string
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          status?: string
          total_rounds?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_members: {
        Row: {
          amount_contributed: number
          event_id: string
          has_received_payout: boolean
          id: string
          joined_at: string
          payout_position: number | null
          user_id: string
        }
        Insert: {
          amount_contributed?: number
          event_id: string
          has_received_payout?: boolean
          id?: string
          joined_at?: string
          payout_position?: number | null
          user_id: string
        }
        Update: {
          amount_contributed?: number
          event_id?: string
          has_received_payout?: boolean
          id?: string
          joined_at?: string
          payout_position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          contribution_amount: number | null
          created_at: string
          creator_id: string
          current_amount: number
          description: string | null
          end_date: string | null
          event_type: string
          frequency: string | null
          id: string
          invite_code: string
          max_members: number | null
          start_date: string | null
          status: string
          target_amount: number | null
          title: string
          updated_at: string
        }
        Insert: {
          contribution_amount?: number | null
          created_at?: string
          creator_id: string
          current_amount?: number
          description?: string | null
          end_date?: string | null
          event_type?: string
          frequency?: string | null
          id?: string
          invite_code?: string
          max_members?: number | null
          start_date?: string | null
          status?: string
          target_amount?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          contribution_amount?: number | null
          created_at?: string
          creator_id?: string
          current_amount?: number
          description?: string | null
          end_date?: string | null
          event_type?: string
          frequency?: string | null
          id?: string
          invite_code?: string
          max_members?: number | null
          start_date?: string | null
          status?: string
          target_amount?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      penalties: {
        Row: {
          amount: number
          chama_id: string
          created_at: string
          due_date: string | null
          id: string
          issued_by: string
          notes: string | null
          paid_at: string | null
          penalty_type: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          chama_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          issued_by: string
          notes?: string | null
          paid_at?: string | null
          penalty_type?: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          chama_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issued_by?: string
          notes?: string | null
          paid_at?: string | null
          penalty_type?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_guarantors: {
        Row: {
          amount: number
          created_at: string
          guarantor_id: string
          id: string
          loan_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          guarantor_id: string
          id?: string
          loan_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          guarantor_id?: string
          id?: string
          loan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_guarantors_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          amount_paid: number
          borrower_id: string
          chama_id: string | null
          created_at: string
          duration_months: number
          id: string
          interest_rate: number
          purpose: string | null
          status: string
          total_repayment: number
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          borrower_id: string
          chama_id?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          interest_rate?: number
          purpose?: string | null
          status?: string
          total_repayment?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          borrower_id?: string
          chama_id?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          interest_rate?: number
          purpose?: string | null
          status?: string
          total_repayment?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_chama_id_fkey"
            columns: ["chama_id"]
            isOneToOne: false
            referencedRelation: "chamas"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          id: string
          joined_at: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          ai_notes: string | null
          ai_summary: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          meeting_link: string | null
          organizer_id: string
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_notes?: string | null
          ai_summary?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          organizer_id: string
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_notes?: string | null
          ai_summary?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          organizer_id?: string
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          is_read: boolean
          message: string | null
          reminder_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          is_read?: boolean
          message?: string | null
          reminder_type?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reminder_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_status: "pending" | "completed" | "failed"
          provider_checkout_id: string | null
          reference: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_status?: "pending" | "completed" | "failed"
          provider_checkout_id?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_status?: "pending" | "completed" | "failed"
          provider_checkout_id?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_for_chama_loan: {
        Args: {
          p_amount: number
          p_chama_id: string
          p_duration_months: number
          p_guarantee_amount: number
          p_guarantor_id: string
          p_interest_rate: number
          p_purpose: string
        }
        Returns: string
      }
      complete_mpesa_deposit: {
        Args: {
          p_checkout_request_id: string
        }
        Returns: string
      }
      fail_mpesa_deposit: {
        Args: {
          p_checkout_request_id: string
          p_failure_description: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      pay_chama_contribution: {
        Args: {
          p_chama_id: string
          p_round_number: number
        }
        Returns: number
      }
      pay_penalty_from_wallet: {
        Args: {
          p_penalty_id: string
        }
        Returns: number
      }
      randomize_chama_payout_order: {
        Args: {
          p_chama_id: string
        }
        Returns: number
      }
      process_chama_payout: {
        Args: {
          p_chama_id: string
          p_round_number: number
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "contribution"
        | "payout"
        | "penalty"
        | "loan_disbursement"
        | "loan_repayment"
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
      app_role: ["admin", "moderator", "user"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "contribution",
        "payout",
        "penalty",
        "loan_disbursement",
        "loan_repayment",
      ],
    },
  },
} as const
