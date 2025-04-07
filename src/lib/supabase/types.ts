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
          instance_id: string | null
          email: string
          created_at: string
          last_login: string | null
        }
        Insert: {
          id: string
          instance_id?: string | null
          email: string
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          instance_id?: string | null
          email?: string
          created_at?: string
          last_login?: string | null
        }
      }
      search_requests: {
        Row: {
          query_id: string
          user_id: string
          query: string
          source: string
          filters: Json | null
          timestamp: string
          search_title: string | null
          is_saved: boolean
        }
        Insert: {
          query_id: string
          user_id: string
          query: string
          source: string
          filters?: Json | null
          timestamp?: string
          search_title?: string | null
          is_saved?: boolean
        }
        Update: {
          query_id?: string
          user_id?: string
          query?: string
          source?: string
          filters?: Json | null
          timestamp?: string
          search_title?: string | null
          is_saved?: boolean
        }
      }
      search_results: {
        Row: {
          id: string
          query_id: string
          title: string
          url: string
          snippet: string | null
          rank: number | null
          result_type: string | null
          search_engine: string | null
          device: string | null
          location: string | null
          language: string | null
          total_results: number | null
          credits_used: number | null
          search_id: string | null
          search_url: string | null
          related_searches: Json | null
          similar_questions: Json | null
          timestamp: string
          raw_response: Json | null
          deduped: boolean
        }
        Insert: {
          id: string
          query_id: string
          title: string
          url: string
          snippet?: string | null
          rank?: number | null
          result_type?: string | null
          search_engine?: string | null
          device?: string | null
          location?: string | null
          language?: string | null
          total_results?: number | null
          credits_used?: number | null
          search_id?: string | null
          search_url?: string | null
          related_searches?: Json | null
          similar_questions?: Json | null
          timestamp?: string
          raw_response?: Json | null
          deduped?: boolean
        }
        Update: {
          id?: string
          query_id?: string
          title?: string
          url?: string
          snippet?: string | null
          rank?: number | null
          result_type?: string | null
          search_engine?: string | null
          device?: string | null
          location?: string | null
          language?: string | null
          total_results?: number | null
          credits_used?: number | null
          search_id?: string | null
          search_url?: string | null
          related_searches?: Json | null
          similar_questions?: Json | null
          timestamp?: string
          raw_response?: Json | null
          deduped?: boolean
        }
      }
      review_tags: {
        Row: {
          id: string
          result_id: string
          tag: string
          exclusion_reason: string | null
          notes: string | null
          retrieved: boolean | null
          reviewer_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          result_id: string
          tag: string
          exclusion_reason?: string | null
          notes?: string | null
          retrieved?: boolean | null
          reviewer_id: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          result_id?: string
          tag?: string
          exclusion_reason?: string | null
          notes?: string | null
          retrieved?: boolean | null
          reviewer_id?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      duplicate_log: {
        Row: {
          duplicate_id: string
          original_result_id: string
          duplicate_url: string
          search_engine: string | null
          reason: string | null
          timestamp: string
        }
        Insert: {
          duplicate_id: string
          original_result_id: string
          duplicate_url: string
          search_engine?: string | null
          reason?: string | null
          timestamp?: string
        }
        Update: {
          duplicate_id?: string
          original_result_id?: string
          duplicate_url?: string
          search_engine?: string | null
          reason?: string | null
          timestamp?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 