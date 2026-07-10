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
    PostgrestVersion: "13.0.5"
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
      activation_packages: {
        Row: {
          activations: number
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          price_eur: number
          price_usd: number
          price_xof: number
          savings_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          activations: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          price_eur: number
          price_usd: number
          price_xof: number
          savings_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          activations?: number
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          price_eur?: number
          price_usd?: number
          price_xof?: number
          savings_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      activations: {
        Row: {
          cancelled_at: string | null
          charged: boolean | null
          country_code: string
          created_at: string | null
          expires_at: string
          external_id: string | null
          frozen_amount: number | null
          id: string
          operator: string
          order_id: string
          phone: string
          price: number | null
          provider: string | null
          service_code: string
          sms_code: string | null
          sms_received_at: string | null
          sms_text: string | null
          source: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          charged?: boolean | null
          country_code: string
          created_at?: string | null
          expires_at: string
          external_id?: string | null
          frozen_amount?: number | null
          id?: string
          operator: string
          order_id: string
          phone: string
          price?: number | null
          provider?: string | null
          service_code: string
          sms_code?: string | null
          sms_received_at?: string | null
          sms_text?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          charged?: boolean | null
          country_code?: string
          created_at?: string | null
          expires_at?: string
          external_id?: string | null
          frozen_amount?: number | null
          id?: string
          operator?: string
          order_id?: string
          phone?: string
          price?: number | null
          provider?: string | null
          service_code?: string
          sms_code?: string | null
          sms_received_at?: string | null
          sms_text?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string | null
          last_used_at: string | null
          request_count: number
          updated_at: string
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label?: string | null
          last_used_at?: string | null
          request_count?: number
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string | null
          last_used_at?: string | null
          request_count?: number
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      balance_operations: {
        Row: {
          activation_id: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          frozen_after: number
          frozen_before: number
          id: string
          metadata: Json | null
          operation_type: string
          reason: string | null
          related_transaction_id: string | null
          rental_id: string | null
          user_id: string
        }
        Insert: {
          activation_id?: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          frozen_after: number
          frozen_before: number
          id?: string
          metadata?: Json | null
          operation_type: string
          reason?: string | null
          related_transaction_id?: string | null
          rental_id?: string | null
          user_id: string
        }
        Update: {
          activation_id?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          frozen_after?: number
          frozen_before?: number
          id?: string
          metadata?: Json | null
          operation_type?: string
          reason?: string | null
          related_transaction_id?: string | null
          rental_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_operations_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_operations_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "balance_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          address: string | null
          address_detail: string | null
          created_at: string | null
          email: string
          email_response_time: string | null
          hours_saturday: string | null
          hours_sunday: string | null
          hours_weekday: string | null
          id: string
          instagram: string | null
          updated_at: string | null
          whatsapp: string | null
          whatsapp_hours: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          created_at?: string | null
          email?: string
          email_response_time?: string | null
          hours_saturday?: string | null
          hours_sunday?: string | null
          hours_weekday?: string | null
          id?: string
          instagram?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_hours?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          created_at?: string | null
          email?: string
          email_response_time?: string | null
          hours_saturday?: string | null
          hours_sunday?: string | null
          hours_weekday?: string | null
          id?: string
          instagram?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          whatsapp_hours?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          active: boolean | null
          available_numbers: number | null
          code: string
          created_at: string | null
          display_order: number | null
          flag_emoji: string | null
          flag_url: string | null
          id: string
          name: string
          popularity_score: number | null
          price_multiplier: number | null
          provider: string | null
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          available_numbers?: number | null
          code: string
          created_at?: string | null
          display_order?: number | null
          flag_emoji?: string | null
          flag_url?: string | null
          id?: string
          name: string
          popularity_score?: number | null
          price_multiplier?: number | null
          provider?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          available_numbers?: number | null
          code?: string
          created_at?: string | null
          display_order?: number | null
          flag_emoji?: string | null
          flag_url?: string | null
          id?: string
          name?: string
          popularity_score?: number | null
          price_multiplier?: number | null
          provider?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount: string | null
          failed_count: number | null
          id: string
          message: string
          name: string
          promo_code: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          subject: string
          title: string
          total_recipients: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount?: string | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          promo_code?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject: string
          title: string
          total_recipients?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          promo_code?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          subject?: string
          title?: string
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email: string
          id: string
          resend_id: string | null
          status: string | null
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          resend_id?: string | null
          status?: string | null
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          resend_id?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorite_services: {
        Row: {
          country: string
          created_at: string | null
          id: string
          service_code: string
          service_name: string
          user_id: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          id?: string
          service_code: string
          service_name: string
          user_id?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          id?: string
          service_code?: string
          service_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorite_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorite_services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logs_provider: {
        Row: {
          action: string
          activation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          provider: string
          rental_id: string | null
          request_params: Json | null
          request_url: string
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          activation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          rental_id?: string | null
          request_params?: Json | null
          request_url: string
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          activation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          rental_id?: string | null
          request_params?: Json | null
          request_url?: string
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_provider_activation_id_fkey"
            columns: ["activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_provider_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_provider_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_provider_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "logs_provider_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "logs_provider_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_provider_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          provider_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_provider_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_provider_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_provider_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_provider_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          fees_config: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          logo_url: string | null
          priority: number | null
          provider_code: string
          provider_name: string
          supported_methods: Json | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          fees_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          priority?: number | null
          provider_code: string
          provider_name: string
          supported_methods?: Json | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          fees_config?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          priority?: number | null
          provider_code?: string
          provider_name?: string
          supported_methods?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      popular_services: {
        Row: {
          country_code: string
          created_at: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_featured: boolean | null
          service_code: string
          type: string
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          service_code: string
          type: string
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          service_code?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_rules_archive: {
        Row: {
          activation_cost: number | null
          activation_price: number | null
          active: boolean | null
          archived_at: string | null
          country_code: string | null
          id: string | null
          rent_cost: number | null
          rent_price: number | null
          service_code: string | null
        }
        Insert: {
          activation_cost?: number | null
          activation_price?: number | null
          active?: boolean | null
          archived_at?: string | null
          country_code?: string | null
          id?: string | null
          rent_cost?: number | null
          rent_price?: number | null
          service_code?: string | null
        }
        Update: {
          activation_cost?: number | null
          activation_price?: number | null
          active?: boolean | null
          archived_at?: string | null
          country_code?: string | null
          id?: string | null
          rent_cost?: number | null
          rent_price?: number | null
          service_code?: string | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          created_at: string | null
          discount_applied: number
          final_amount: number
          id: string
          original_amount: number
          promo_code_id: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_applied: number
          final_amount: number
          id?: string
          original_amount: number
          promo_code_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_applied?: number
          final_amount?: number
          id?: string
          original_amount?: number
          promo_code_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase: number | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      provider_performance: {
        Row: {
          attempts: number | null
          country_code: string | null
          id: string
          provider: string
          score: number | null
          service_code: string
          successes: number | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          country_code?: string | null
          id?: string
          provider: string
          score?: number | null
          service_code: string
          successes?: number | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          country_code?: string | null
          id?: string
          provider?: string
          score?: number | null
          service_code?: string
          successes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          metadata: Json | null
          qualified_at: string | null
          reason: string | null
          referee_id: string | null
          referrer_id: string | null
          reward_txn_id: string | null
          rewarded_at: string | null
          status: string
          trigger_event: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          qualified_at?: string | null
          reason?: string | null
          referee_id?: string | null
          referrer_id?: string | null
          reward_txn_id?: string | null
          rewarded_at?: string | null
          status?: string
          trigger_event?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          metadata?: Json | null
          qualified_at?: string | null
          reason?: string | null
          referee_id?: string | null
          referrer_id?: string | null
          reward_txn_id?: string | null
          rewarded_at?: string | null
          status?: string
          trigger_event?: string | null
        }
        Relationships: []
      }
      rental_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          payload: Json | null
          rent_id: string | null
          rental_id: string | null
          response_text: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          rent_id?: string | null
          rental_id?: string | null
          response_text?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          rent_id?: string | null
          rental_id?: string | null
          response_text?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rental_messages: {
        Row: {
          created_at: string | null
          id: string
          phone_from: string | null
          received_at: string
          rent_id: string
          rental_id: string | null
          service: string | null
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_from?: string | null
          received_at: string
          rent_id: string
          rental_id?: string | null
          service?: string | null
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_from?: string | null
          received_at?: string
          rent_id?: string
          rental_id?: string | null
          service?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_messages_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          charged: boolean | null
          country: string | null
          country_code: string
          created_at: string | null
          duration_hours: number | null
          end_date: string
          expires_at: string | null
          frozen_amount: number | null
          hourly_rate: number | null
          id: string
          last_message_date: string | null
          message_count: number | null
          metadata: Json | null
          operator: string | null
          phone: string
          phone_number: string | null
          price: number | null
          provider: string | null
          refund_amount: number | null
          rent_hours: number
          rent_id: string
          rental_id: string | null
          service: string | null
          service_code: string
          service_name: string | null
          sms_messages: Json | null
          start_date: string
          status: string
          total_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charged?: boolean | null
          country?: string | null
          country_code: string
          created_at?: string | null
          duration_hours?: number | null
          end_date: string
          expires_at?: string | null
          frozen_amount?: number | null
          hourly_rate?: number | null
          id?: string
          last_message_date?: string | null
          message_count?: number | null
          metadata?: Json | null
          operator?: string | null
          phone: string
          phone_number?: string | null
          price?: number | null
          provider?: string | null
          refund_amount?: number | null
          rent_hours: number
          rent_id: string
          rental_id?: string | null
          service?: string | null
          service_code: string
          service_name?: string | null
          sms_messages?: Json | null
          start_date?: string
          status?: string
          total_cost?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charged?: boolean | null
          country?: string | null
          country_code?: string
          created_at?: string | null
          duration_hours?: number | null
          end_date?: string
          expires_at?: string | null
          frozen_amount?: number | null
          hourly_rate?: number | null
          id?: string
          last_message_date?: string | null
          message_count?: number | null
          metadata?: Json | null
          operator?: string | null
          phone?: string
          phone_number?: string | null
          price?: number | null
          provider?: string | null
          refund_amount?: number | null
          rent_hours?: number
          rent_id?: string
          rental_id?: string | null
          service?: string | null
          service_code?: string
          service_name?: string | null
          sms_messages?: Json | null
          start_date?: string
          status?: string
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_icons: {
        Row: {
          created_at: string | null
          icon_emoji: string | null
          icon_type: string | null
          icon_url: string | null
          id: string
          service_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon_emoji?: string | null
          icon_type?: string | null
          icon_url?: string | null
          id?: string
          service_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon_emoji?: string | null
          icon_type?: string | null
          icon_url?: string | null
          id?: string
          service_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_icons_service_code_fkey"
            columns: ["service_code"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["code"]
          },
        ]
      }
      service_monitoring_config: {
        Row: {
          admin_email: string | null
          check_interval_minutes: number | null
          created_at: string | null
          enabled: boolean | null
          id: string
          min_stuck_orders: number | null
          notify_admin: boolean | null
          stuck_duration_minutes: number | null
          suspension_hours: number | null
          updated_at: string | null
        }
        Insert: {
          admin_email?: string | null
          check_interval_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          min_stuck_orders?: number | null
          notify_admin?: boolean | null
          stuck_duration_minutes?: number | null
          suspension_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_email?: string | null
          check_interval_minutes?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          min_stuck_orders?: number | null
          notify_admin?: boolean | null
          stuck_duration_minutes?: number | null
          suspension_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_suspensions: {
        Row: {
          auto_suspended: boolean | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          id: string
          reactivate_at: string
          reactivated_at: string | null
          reason: string
          service_id: string | null
          status: string | null
          stuck_orders_count: number | null
          suspended_at: string | null
          updated_at: string | null
        }
        Insert: {
          auto_suspended?: boolean | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          id?: string
          reactivate_at: string
          reactivated_at?: string | null
          reason: string
          service_id?: string | null
          status?: string | null
          stuck_orders_count?: number | null
          suspended_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_suspended?: boolean | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          id?: string
          reactivate_at?: string
          reactivated_at?: string | null
          reason?: string
          service_id?: string | null
          status?: string | null
          stuck_orders_count?: number | null
          suspended_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_suspensions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          category: string | null
          code: string
          created_at: string | null
          display_name: string | null
          icon: string | null
          icon_url: string | null
          id: string
          name: string
          popularity_score: number | null
          provider: string | null
          total_available: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          code: string
          created_at?: string | null
          display_name?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name: string
          popularity_score?: number | null
          provider?: string | null
          total_available?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          code?: string
          created_at?: string | null
          display_name?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          popularity_score?: number | null
          provider?: string | null
          total_available?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          code: string | null
          content: string
          created_at: string | null
          id: string
          phone_number: string
          received_at: string | null
          sender: string | null
          user_id: string | null
          virtual_number_id: string | null
        }
        Insert: {
          code?: string | null
          content: string
          created_at?: string | null
          id?: string
          phone_number: string
          received_at?: string | null
          sender?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Update: {
          code?: string | null
          content?: string
          created_at?: string | null
          id?: string
          phone_number?: string
          received_at?: string | null
          sender?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sms_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sms_messages_virtual_number_id_fkey"
            columns: ["virtual_number_id"]
            isOneToOne: false
            referencedRelation: "virtual_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          unread_admin: number | null
          unread_user: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          unread_admin?: number | null
          unread_user?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          unread_admin?: number | null
          unread_user?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_settings: {
        Row: {
          id: string
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          category: string
          created_at: string | null
          id: string
          ip_address: string | null
          level: string
          message: string
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level: string
          message: string
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          type: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          type?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          type?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          payment_data: Json | null
          payment_method: string | null
          provider: string | null
          reference: string | null
          related_activation_id: string | null
          related_rental_id: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          virtual_number_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_data?: Json | null
          payment_method?: string | null
          provider?: string | null
          reference?: string | null
          related_activation_id?: string | null
          related_rental_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          payment_data?: Json | null
          payment_method?: string | null
          provider?: string | null
          reference?: string | null
          related_activation_id?: string | null
          related_rental_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          virtual_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_activation_id_fkey"
            columns: ["related_activation_id"]
            isOneToOne: false
            referencedRelation: "activations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_virtual_number_id_fkey"
            columns: ["virtual_number_id"]
            isOneToOne: false
            referencedRelation: "virtual_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          api_discount_rate: number
          avatar_url: string | null
          balance: number | null
          banned_reason: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          frozen_balance: number | null
          has_seen_tutorial: boolean | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string | null
          notifications_enabled: boolean | null
          phone: string | null
          referral_code: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          api_discount_rate?: number
          avatar_url?: string | null
          balance?: number | null
          banned_reason?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          frozen_balance?: number | null
          has_seen_tutorial?: boolean | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string | null
          notifications_enabled?: boolean | null
          phone?: string | null
          referral_code?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          api_discount_rate?: number
          avatar_url?: string | null
          balance?: number | null
          banned_reason?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          frozen_balance?: number | null
          has_seen_tutorial?: boolean | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string | null
          notifications_enabled?: boolean | null
          phone?: string | null
          referral_code?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      virtual_numbers: {
        Row: {
          activation_code: string | null
          country: string
          country_code: string
          created_at: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          operator: string | null
          phone_number: string
          price: number
          provider: string | null
          service: string
          service_name: string | null
          sms_received: string[] | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activation_code?: string | null
          country: string
          country_code: string
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          operator?: string | null
          phone_number: string
          price: number
          provider?: string | null
          service: string
          service_name?: string | null
          sms_received?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activation_code?: string | null
          country?: string
          country_code?: string
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          operator?: string | null
          phone_number?: string
          price?: number
          provider?: string | null
          service?: string
          service_name?: string | null
          sms_received?: string[] | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "virtual_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "virtual_numbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wave_payment_proofs: {
        Row: {
          activations: number
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          proof_url: string
          rejection_reason: string | null
          status: string
          updated_at: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          activations: number
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          proof_url: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          activations?: number
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          proof_url?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          activation_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          payload: Json
          processed: boolean | null
          received_at: string
        }
        Insert: {
          activation_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          payload: Json
          processed?: boolean | null
          received_at: string
        }
        Update: {
          activation_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          payload?: Json
          processed?: boolean | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      activation_stats: {
        Row: {
          cancelled_count: number | null
          last_activation_at: string | null
          successful_activations: number | null
          timeout_count: number | null
          total_activations: number | null
          total_spent: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_balance_health_reconciliation"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_frozen_discrepancies"
            referencedColumns: ["user_id"]
          },
        ]
      }
      available_services: {
        Row: {
          country_code: string | null
          last_used: string | null
          service_code: string | null
          type: string | null
          usage_count: number | null
        }
        Relationships: []
      }
      v_country_health: {
        Row: {
          country_code: string | null
          health_status: string | null
          success_rate_pct: number | null
          successful_activations: number | null
          total_activations_24h: number | null
        }
        Relationships: []
      }
      v_dashboard_stats: {
        Row: {
          cancelled_24h: number | null
          global_health_status: string | null
          global_success_rate_pct: number | null
          successful_24h: number | null
          timeout_24h: number | null
          total_activations_24h: number | null
        }
        Relationships: []
      }
      v_frozen_balance_health: {
        Row: {
          balance: number | null
          checked_at: string | null
          email: string | null
          expected_frozen: number | null
          frozen_balance: number | null
          frozen_diff: number | null
          health_status: string | null
          total_frozen_in_activations: number | null
          total_frozen_in_rentals: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_frozen_balance_health_reconciliation: {
        Row: {
          balance: number | null
          frozen_balance_user: number | null
          frozen_discrepancy: number | null
          health_status: string | null
          total_frozen_activations: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_frozen_discrepancies: {
        Row: {
          frozen_balance_user: number | null
          frozen_discrepancy: number | null
          total_frozen_activations: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_provider_stats_24h: {
        Row: {
          action: string | null
          avg_response_time_ms: number | null
          error_count: number | null
          first_call_at: string | null
          last_call_at: string | null
          max_response_time_ms: number | null
          provider: string | null
          success_count: number | null
          total_calls: number | null
        }
        Relationships: []
      }
      v_service_health: {
        Row: {
          cancelled_activations: number | null
          health_status: string | null
          last_activation_at: string | null
          minutes_since_last_use: number | null
          service_code: string | null
          success_rate_pct: number | null
          successful_activations: number | null
          timeout_activations: number | null
          total_activations_24h: number | null
        }
        Relationships: []
      }
      v_service_response_time: {
        Row: {
          avg_wait_minutes: number | null
          max_wait_minutes: number | null
          min_wait_minutes: number | null
          service_code: string | null
          successful_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_credit: {
        Args: { p_admin_note?: string; p_amount: number; p_user_id: string }
        Returns: Json
      }
      admin_referral_stats: {
        Args: never
        Returns: {
          bonus_amount: number
          bonus_count: number
          bonus_pending_amount: number
          bonus_pending_count: number
          expired: number
          pending: number
          qualified: number
          rejected: number
          rewarded: number
          total: number
        }[]
      }
      admin_referrals_list: {
        Args: never
        Returns: {
          created_at: string
          id: string
          qualified_at: string
          reason: string
          referee_email: string
          referee_id: string
          referrer_email: string
          referrer_id: string
          referrer_total_bonus: number
          rewarded_at: string
          status: string
        }[]
      }
      admin_set_credit_pin: {
        Args: { p_new_pin: string; p_old_pin: string }
        Returns: Json
      }
      admin_unfreeze_balance: {
        Args: { p_admin_note?: string; p_pin?: string; p_user_id: string }
        Returns: Json
      }
      admin_unfreeze_orphaned_balance: {
        Args: { p_user_email?: string }
        Returns: {
          new_balance: number
          status: string
          unfrozen_amount: number
          user_email: string
        }[]
      }
      atomic_commit: {
        Args: {
          p_activation_id?: string
          p_reason?: string
          p_rental_id?: string
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      atomic_complete_activation: {
        Args: {
          p_activation_id: string
          p_sms_code?: string
          p_sms_text?: string
        }
        Returns: Json
      }
      atomic_force_unfreeze: {
        Args: {
          p_amount_to_release: number
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      atomic_freeze: {
        Args: {
          p_activation_id?: string
          p_amount: number
          p_reason?: string
          p_rental_id?: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      atomic_refund: {
        Args: {
          p_activation_id?: string
          p_reason?: string
          p_rental_id?: string
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      atomic_refund_direct: {
        Args: {
          p_amount: number
          p_reason?: string
          p_transaction_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      auto_heal_frozen_balances: {
        Args: never
        Returns: {
          fixed_count: number
          total_amount: number
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      cancel_dripfeed_and_refund: {
        Args: { p_dripfeed_id: string }
        Returns: Json
      }
      check_frozen_discrepancies: {
        Args: never
        Returns: {
          frozen_balance_user: number
          frozen_discrepancy: number
          total_frozen_activations: number
          user_id: string
        }[]
      }
      cleanup_old_logs: { Args: never; Returns: undefined }
      cleanup_old_provider_logs:
        | { Args: never; Returns: undefined }
        | { Args: { retention_days?: number }; Returns: number }
      expire_rentals: { Args: never; Returns: number }
      fix_frozen_balance_discrepancy: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_admin_activation_stats: { Args: never; Returns: Json }
      get_contact_settings: {
        Args: never
        Returns: {
          address: string | null
          address_detail: string | null
          created_at: string | null
          email: string
          email_response_time: string | null
          hours_saturday: string | null
          hours_sunday: string | null
          hours_weekday: string | null
          id: string
          instagram: string | null
          updated_at: string | null
          whatsapp: string | null
          whatsapp_hours: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "contact_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          is_active: boolean
          job_id: number
          job_name: string
          schedule: string
        }[]
      }
      get_setting: { Args: { setting_key: string }; Returns: string }
      get_stuck_services: {
        Args: { min_count: number; threshold_minutes: number }
        Returns: {
          service_id: string
          stuck_count: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_promo_uses: { Args: { code_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      lock_user_wallet: {
        Args: { p_user_id: string }
        Returns: {
          available_balance: number
          balance: number
          frozen_balance: number
        }[]
      }
      log_event: {
        Args: {
          p_category: string
          p_level: string
          p_message: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: string
      }
      process_expired_activations: { Args: never; Returns: Json }
      process_sms_received: {
        Args: {
          p_code: string
          p_order_id: string
          p_source?: string
          p_text?: string
        }
        Returns: Json
      }
      reconcile_frozen_balance: {
        Args: { p_user_id: string }
        Returns: {
          actual_frozen: number
          calculated_frozen: number
          difference: number
          needs_correction: boolean
        }[]
      }
      reconcile_orphan_freezes: {
        Args: never
        Returns: {
          activation_id: string
          error: string
          frozen_amount: number
          refund_applied: boolean
          status: string
          user_id: string
        }[]
      }
      reconcile_rentals_orphan_freezes: {
        Args: never
        Returns: {
          error: string
          frozen_amount: number
          refund_applied: boolean
          rental_id: string
          status: string
          user_id: string
        }[]
      }
      secure_freeze_balance: {
        Args: {
          p_activation_id?: string
          p_amount: number
          p_reason?: string
          p_rental_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      secure_moneyfusion_credit: {
        Args: {
          p_reference?: string
          p_token?: string
          p_transaction_id: string
        }
        Returns: Json
      }
      secure_moneyfusion_credit_v2: {
        Args: { p_reference: string; p_token: string; p_transaction_id: string }
        Returns: Json
      }
      secure_referral_payout: {
        Args: {
          p_bonus_referee: number
          p_bonus_referrer: number
          p_reason?: string
          p_referral_id: string
        }
        Returns: Json
      }
      secure_unfreeze_balance: {
        Args: {
          p_activation_id?: string
          p_refund_reason?: string
          p_refund_to_balance?: boolean
          p_rental_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      transfer_service_stock: {
        Args: { source_code: string; target_code: string }
        Returns: undefined
      }
      update_provider_score_logic: {
        Args: { p_is_success: boolean; p_provider: string; p_service: string }
        Returns: undefined
      }
      update_setting: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_promo_code: {
        Args: { p_code: string; p_purchase_amount: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
