// Hand-maintained P1 contract, not introspected from a running database.
// `npm run db:types` replaces this file only after successful local generation.
export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_asset_id: string | null;
  visibility_status: string;
  created_at: string;
  updated_at: string;
};

export type Account = {
  profile_id: string;
  handle: string;
  display_name: string;
  bio: string;
  role: string;
  status: string;
  email_verified: boolean;
  profile_completed: boolean;
};

type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: { profiles: Table<Profile>; categories: Table<Category> };
    Views: Record<string, never>;
    Functions: {
      get_my_account: { Args: Record<string, never>; Returns: Account[] };
      update_profile: {
        Args: { p_handle: string; p_display_name: string; p_bio: string };
        Returns: Profile;
      };
      check_admin_access: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
