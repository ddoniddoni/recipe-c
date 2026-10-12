// Hand-maintained P1/P2 contract, not introspected from a running database.
// `npm run db:types` replaces this file only after successful local generation.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
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
    Tables: {
      profiles: Table<Profile>; categories: Table<Category>;
      media_assets: Table<{
        id: string; owner_id: string; recipe_id: string; purpose: string; status: string;
        bucket: string; original_path: string; processed_path: string | null;
        width: number | null; height: number | null; original_removed_at: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_my_account: { Args: Record<string, never>; Returns: Account[] };
      update_profile: {
        Args: { p_handle: string; p_display_name: string; p_bio: string };
        Returns: Profile;
      };
      check_admin_access: { Args: Record<string, never>; Returns: boolean };
      create_recipe_draft: { Args: { p_body: Json; p_request_id: string }; Returns: string };
      save_recipe_draft: { Args: { p_recipe_id: string; p_expected_version: number; p_body: Json; p_request_id: string }; Returns: number };
      publish_recipe: { Args: { p_recipe_id: string; p_expected_version: number; p_request_id: string }; Returns: string };
      get_recipe_draft: { Args: { p_recipe_id: string }; Returns: Json };
      get_my_recipes: { Args: { p_page?: number }; Returns: Json };
      search_recipes: { Args: { p_query?: string; p_category?: string; p_max_minutes?: number; p_difficulty?: string; p_page?: number; p_author?: string }; Returns: Json };
      get_recipe_detail: { Args: { p_recipe_id: string; p_version_id?: string }; Returns: Json };
      reserve_recipe_upload: { Args: { p_recipe_id: string; p_request_id: string }; Returns: string };
      claim_recipe_upload: { Args: { p_asset_id: string }; Returns: Json };
      finish_recipe_upload: { Args: { p_asset_id: string; p_owner_id: string; p_token: string; p_result: Json }; Returns: boolean };
      authorize_media_access: { Args: { p_asset_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
