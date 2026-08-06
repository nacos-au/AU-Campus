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
        };
        Update: {
          display_name?: string;
          username?: string | null;
          email?: string | null;
          full_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
