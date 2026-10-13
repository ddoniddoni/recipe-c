// Hand-maintained P1/P2/P3/P4 contract, not introspected from a running database.
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
      re_profiles: Table<Profile>; re_categories: Table<Category>;
      re_media_assets: Table<{
        id: string; owner_id: string; recipe_id: string; recipe_version_id: string | null; purpose: string; status: string;
        bucket: string; original_path: string; processed_path: string | null;
        width: number | null; height: number | null; original_removed_at: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      re_award_command: { Args: { p_input: Json }; Returns: Json };
      re_get_awards: { Args: { p_slug?: string; p_page?: number; p_author?: string; p_recipe?: string; p_own_page?: number }; Returns: Json };
      re_get_review_award_context: { Args: { p_version: string }; Returns: Json };
      re_get_admin_awards: { Args: { p_period?: string; p_page?: number; p_run?: string }; Returns: Json };
      re_consume_signup_limit: { Args: { p_email_hash: string }; Returns: boolean };
      re_ensure_account: { Args: Record<string, never>; Returns: string };
      re_get_my_account: { Args: Record<string, never>; Returns: Account[] };
      re_update_profile: {
        Args: { p_handle: string; p_display_name: string; p_bio: string };
        Returns: Profile;
      };
      re_check_admin_access: { Args: Record<string, never>; Returns: boolean };
      re_create_recipe_draft: { Args: { p_body: Json; p_request_id: string }; Returns: string };
      re_save_recipe_draft: { Args: { p_recipe_id: string; p_expected_version: number; p_body: Json; p_request_id: string }; Returns: number };
      re_publish_recipe: { Args: { p_recipe_id: string; p_expected_version: number; p_request_id: string }; Returns: string };
      re_get_recipe_draft: { Args: { p_recipe_id: string }; Returns: Json };
      re_get_my_recipes: { Args: { p_page?: number }; Returns: Json };
      re_search_recipes: { Args: { p_query?: string; p_category?: string; p_max_minutes?: number; p_difficulty?: string; p_page?: number; p_author?: string; p_sort?: string }; Returns: Json };
      re_get_recipe_detail: { Args: { p_recipe_id: string; p_version_id?: string }; Returns: Json };
      re_reserve_recipe_upload: { Args: { p_recipe_id: string; p_request_id: string }; Returns: string };
      re_claim_recipe_upload: { Args: { p_asset_id: string }; Returns: Json };
      re_finish_recipe_upload: { Args: { p_asset_id: string; p_owner_id: string; p_token: string; p_result: Json }; Returns: boolean };
      re_reserve_review_upload: { Args: { p_version_id: string; p_request_id: string }; Returns: string };
      re_set_bookmark: { Args: { p_recipe_id: string; p_saved: boolean }; Returns: boolean };
      re_upsert_cook_review: { Args: { p_version_id: string; p_expected_revision: number; p_rating: number; p_body: string; p_asset_ids: string[]; p_request_id: string }; Returns: Json };
      re_delete_cook_review: { Args: { p_version_id: string; p_expected_revision: number; p_request_id: string }; Returns: Json };
      re_write_recipe_comment: { Args: { p_id: string; p_recipe_id: string; p_parent_id: string | null; p_kind: string; p_body: string; p_expected_revision: number; p_request_id: string; p_delete?: boolean }; Returns: Json };
      re_submit_report: { Args: { p_target_type: string; p_target_id: string; p_reason: string; p_detail: string }; Returns: string };
      re_mark_notifications_read: { Args: { p_ids: string[] }; Returns: number };
      re_get_recipe_community: { Args: { p_recipe_id: string; p_version_id: string; p_reviews_page?: number; p_comments_page?: number; p_thread_id?: string; p_replies_page?: number }; Returns: Json };
      re_get_profile_reviews: { Args: { p_author_id: string; p_page?: number }; Returns: Json };
      re_get_my_reviews: { Args: { p_page?: number }; Returns: Json };
      re_get_my_bookmarks: { Args: { p_page?: number }; Returns: Json };
      re_get_my_notifications: { Args: { p_page?: number }; Returns: Json };
      re_get_my_reports: { Args: { p_page?: number }; Returns: Json };
      re_get_recently_reviewed_recipes: { Args: Record<string, never>; Returns: Json };
      re_authorize_media_access: { Args: { p_asset_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
