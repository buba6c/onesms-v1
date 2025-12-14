export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone_number: string | null
          avatar_url: string | null
          role: 'user' | 'admin'
          credits: number
          is_active: boolean
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          credits?: number
          is_active?: boolean
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          credits?: number
          is_active?: boolean
          language?: string
          created_at?: string
          updated_at?: string
        }
      }
      credits_history: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'purchase' | 'usage' | 'refund' | 'bonus'
          transaction_id: string | null
          description: string | null
          balance_before: number
          balance_after: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'purchase' | 'usage' | 'refund' | 'bonus'
          transaction_id?: string | null
          description?: string | null
          balance_before: number
          balance_after: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'purchase' | 'usage' | 'refund' | 'bonus'
          transaction_id?: string | null
          description?: string | null
          balance_before?: number
          balance_after?: number
          created_at?: string
        }
      }
      virtual_numbers: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_id: string
          phone_number: string
          country_code: string
          country_name: string
          operator: string
          service: string
          type: 'activation' | 'short_rental' | 'long_rental'
          status: 'active' | 'waiting' | 'completed' | 'cancelled' | 'expired'
          price_paid: number
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          provider_id: string
          phone_number: string
          country_code: string
          country_name: string
          operator: string
          service: string
          type: 'activation' | 'short_rental' | 'long_rental'
          status?: 'active' | 'waiting' | 'completed' | 'cancelled' | 'expired'
          price_paid: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_id?: string
          phone_number?: string
          country_code?: string
          country_name?: string
          operator?: string
          service?: string
          type?: 'activation' | 'short_rental' | 'long_rental'
          status?: 'active' | 'waiting' | 'completed' | 'cancelled' | 'expired'
          price_paid?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sms_received: {
        Row: {
          id: string
          virtual_number_id: string
          user_id: string
          phone_number: string
          sender: string | null
          message: string
          code: string | null
          received_at: string
          created_at: string
        }
        Insert: {
          id?: string
          virtual_number_id: string
          user_id: string
          phone_number: string
          sender?: string | null
          message: string
          code?: string | null
          received_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          virtual_number_id?: string
          user_id?: string
          phone_number?: string
          sender?: string | null
          message?: string
          code?: string | null
          received_at?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'payment' | 'refund'
          payment_provider: string
          payment_method: string | null
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'cancelled'
          provider_transaction_id: string | null
          provider_token: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'payment' | 'refund'
          payment_provider: string
          payment_method?: string | null
          amount: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'cancelled'
          provider_transaction_id?: string | null
          provider_token?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'payment' | 'refund'
          payment_provider?: string
          payment_method?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed' | 'cancelled'
          provider_transaction_id?: string | null
          provider_token?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          display_name: string
          category: string
          icon_url: string | null
          is_active: boolean
          popularity_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          category?: string
          icon_url?: string | null
          is_active?: boolean
          popularity_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          category?: string
          icon_url?: string | null
          is_active?: boolean
          popularity_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      countries: {
        Row: {
          id: string
          code: string
          name: string
          flag_url: string | null
          is_active: boolean
          available_numbers: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          flag_url?: string | null
          is_active?: boolean
          available_numbers?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          flag_url?: string | null
          is_active?: boolean
          available_numbers?: number
          created_at?: string
          updated_at?: string
        }
      }
      pricing_rules: {
        Row: {
          id: string
          provider: string
          country_code: string
          service: string
          operator: string | null
          purchase_type: 'activation' | 'short_rental' | 'long_rental'
          provider_cost: number
          selling_price: number
          margin_percentage: number
          currency: string
          is_active: boolean
          last_updated_from_provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          country_code: string
          service: string
          operator?: string | null
          purchase_type: 'activation' | 'short_rental' | 'long_rental'
          provider_cost: number
          selling_price: number
          margin_percentage?: number
          currency?: string
          is_active?: boolean
          last_updated_from_provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          country_code?: string
          service?: string
          operator?: string | null
          purchase_type?: 'activation' | 'short_rental' | 'long_rental'
          provider_cost?: number
          selling_price?: number
          margin_percentage?: number
          currency?: string
          is_active?: boolean
          last_updated_from_provider?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      providers: {
        Row: {
          id: string
          name: string
          api_key: string
          api_secret: string | null
          base_url: string
          is_active: boolean
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          api_key: string
          api_secret?: string | null
          base_url: string
          is_active?: boolean
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          api_key?: string
          api_secret?: string | null
          base_url?: string
          is_active?: boolean
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      system_logs: {
        Row: {
          id: string
          level: 'info' | 'warning' | 'error'
          category: string
          message: string
          metadata: Json | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level: 'info' | 'warning' | 'error'
          category: string
          message: string
          metadata?: Json | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: 'info' | 'warning' | 'error'
          category?: string
          message?: string
          metadata?: Json | null
          user_id?: string | null
          created_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          subject: string
          message: string
          status: 'new' | 'read' | 'replied' | 'archived'
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
          replied_at: string | null
          replied_by: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          subject: string
          message: string
          status?: 'new' | 'read' | 'replied' | 'archived'
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
          replied_at?: string | null
          replied_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          subject?: string
          message?: string
          status?: 'new' | 'read' | 'replied' | 'archived'
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
          replied_at?: string | null
          replied_by?: string | null
        }
      }
      wave_payment_proofs: {
        Row: {
          id: string
          user_id: string
          amount: number
          activations: number
          proof_url: string
          status: 'pending' | 'approved' | 'rejected'
          metadata: Json | null
          admin_notes: string | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          activations: number
          proof_url: string
          status?: 'pending' | 'approved' | 'rejected'
          metadata?: Json | null
          admin_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          activations?: number
          proof_url?: string
          status?: 'pending' | 'approved' | 'rejected'
          metadata?: Json | null
          admin_notes?: string | null
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
