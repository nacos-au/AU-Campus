// Placeholder — run `npm run db:types` after linking Supabase to regenerate
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          username: string | null;
          email: string | null;
          full_name: string | null;
          role: string;
          is_super_admin: boolean;
          verification_level: "soft" | "verified";
          created_at: string;
          updated_at: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          display_name?: string;
          username?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          is_super_admin?: boolean;
          verification_level?: "soft" | "verified";
        };
        Update: {
          display_name?: string;
          username?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          is_super_admin?: boolean;
          verification_level?: "soft" | "verified";
          avatar_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      app_roles: {
        Row: {
          user_id: string;
          app: "campus" | "digest" | "score";
          role: string;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          app: "campus" | "digest" | "score";
          role: string;
          granted_by?: string | null;
        };
        Update: {
          role?: string;
          granted_by?: string | null;
        };
        Relationships: [];
      };
      score_user_roles: {
        Row: {
          user_id: string;
          role: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          assigned_by?: string | null;
        };
        Update: {
          role?: string;
          assigned_by?: string | null;
        };
        Relationships: [];
      };
      score_admins: {
        Row: {
          user_id: string;
          all_sports: boolean;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          all_sports?: boolean;
          assigned_by?: string | null;
        };
        Update: {
          all_sports?: boolean;
          assigned_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
