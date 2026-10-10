export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          accepted_by: string | null
          approved_by: string | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          status: string
          use_count: number
        }
        Insert: {
          accepted_by?: string | null
          approved_by?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          use_count?: number
        }
        Update: {
          accepted_by?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invites_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_media: {
        Row: {
          collection_id: string
          id: string
          media_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          id?: string
          media_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          id?: string
          media_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_media_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_key: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          published_at: string
          title: string
          visibility: string
        }
        Insert: {
          cover_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string
          title: string
          visibility?: string
        }
        Update: {
          cover_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          published_at?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_admins: {
        Row: {
          admin_id: string
          assigned_at: string
          assigned_by: string | null
          event_id: string
          id: string
          revoked_at: string | null
        }
        Insert: {
          admin_id: string
          assigned_at?: string
          assigned_by?: string | null
          event_id: string
          id?: string
          revoked_at?: string | null
        }
        Update: {
          admin_id?: string
          assigned_at?: string
          assigned_by?: string | null
          event_id?: string
          id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_admins_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_admins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string | null
          id: string
          max_uses: number
          status: string
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          status?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          event_id: string
          granted_at: string
          id: string
          source_code_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          granted_at?: string
          id?: string
          source_code_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          granted_at?: string
          id?: string
          source_code_id?: string | null
          status?: string
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
          {
            foreignKeyName: "event_members_source_code_id_fkey"
            columns: ["source_code_id"]
            isOneToOne: false
            referencedRelation: "event_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_key: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          location: string | null
          status: string
          title: string
          total_photos: number
          updated_at: string
        }
        Insert: {
          cover_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          status?: string
          title: string
          total_photos?: number
          updated_at?: string
        }
        Update: {
          cover_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          status?: string
          title?: string
          total_photos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          deleted_at: string | null
          event_id: string | null
          id: string
          media_type: string
          mime_type: string | null
          object_key: string
          size_bytes: number | null
          status: string
          thumbnail_key: string | null
          thumbnail_url: string | null
          title: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          media_type?: string
          mime_type?: string | null
          object_key: string
          size_bytes?: number | null
          status?: string
          thumbnail_key?: string | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          media_type?: string
          mime_type?: string | null
          object_key?: string
          size_bytes?: number | null
          status?: string
          thumbnail_key?: string | null
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_key: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          role: string
          selfie_key: string | null
          selfie_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_key?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          role?: string
          selfie_key?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_key?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          role?: string
          selfie_key?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_event_photos: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_event_admin: { Args: { p_event_id: string }; Returns: boolean }
      is_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      join_event_by_code: { Args: { p_code: string }; Returns: Json }
      use_admin_invite_code: { Args: { p_code: string }; Returns: Json }
      verify_and_use_admin_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventAdmin = Database['public']['Tables']['event_admins']['Row']
export type EventCode = Database['public']['Tables']['event_codes']['Row']
export type EventMember = Database['public']['Tables']['event_members']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type Media = Database['public']['Tables']['media']['Row']
export type CollectionMedia = Database['public']['Tables']['collection_media']['Row']
export type AdminInvite = Database['public']['Tables']['admin_invites']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
