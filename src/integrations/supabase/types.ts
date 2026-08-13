export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ingest_runs: {
        Row: {
          finished_at: string | null;
          id: string;
          keywords_processed: number;
          notes: string | null;
          started_at: string;
          status: string;
        };
        Insert: {
          finished_at?: string | null;
          id?: string;
          keywords_processed?: number;
          notes?: string | null;
          started_at?: string;
          status?: string;
        };
        Update: {
          finished_at?: string | null;
          id?: string;
          keywords_processed?: number;
          notes?: string | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      app_seeds: {
        Row: {
          buildability_score: number;
          commercial_score: number;
          concept: string;
          created_at: string;
          family: string;
          id: string;
          interesting_score: number;
          is_saved: boolean;
          model: string;
          model_version: string;
          observation_id: string;
          problem: string;
          provenance: string;
          signal_id: string | null;
          source_hash: string;
          title: string;
          user_type: string;
          validation_step: string;
          variations: Json;
          why_interesting: string;
        };
        Insert: {
          buildability_score?: number;
          commercial_score?: number;
          concept: string;
          created_at?: string;
          family: string;
          id?: string;
          interesting_score?: number;
          is_saved?: boolean;
          model: string;
          model_version: string;
          observation_id: string;
          problem: string;
          provenance?: string;
          signal_id?: string | null;
          source_hash: string;
          title: string;
          user_type: string;
          validation_step: string;
          variations?: Json;
          why_interesting: string;
        };
        Update: {
          buildability_score?: number;
          commercial_score?: number;
          concept?: string;
          created_at?: string;
          family?: string;
          id?: string;
          interesting_score?: number;
          is_saved?: boolean;
          model?: string;
          model_version?: string;
          observation_id?: string;
          problem?: string;
          provenance?: string;
          signal_id?: string | null;
          source_hash?: string;
          title?: string;
          user_type?: string;
          validation_step?: string;
          variations?: Json;
          why_interesting?: string;
        };
        Relationships: [
          {
            foreignKeyName: "app_seeds_observation_id_fkey";
            columns: ["observation_id"];
            isOneToOne: false;
            referencedRelation: "signal_observations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_seeds_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "signals";
            referencedColumns: ["id"];
          },
        ];
      };
      signal_market_snapshots: {
        Row: {
          city: string | null;
          country_code: string;
          demand_score: number;
          geo_key: string;
          id: string;
          ingest_run_id: string | null;
          language_code: string;
          lead_weeks: number;
          location_code: number | null;
          measurement_scope: string;
          momentum: number;
          observed_at: string;
          opportunity_score: number;
          series: Json;
          signal_id: string;
          source_scopes: Json;
          supply_score: number;
        };
        Insert: {
          city?: string | null;
          country_code: string;
          demand_score?: number;
          geo_key: string;
          id?: string;
          ingest_run_id?: string | null;
          language_code?: string;
          lead_weeks?: number;
          location_code?: number | null;
          measurement_scope: string;
          momentum?: number;
          observed_at?: string;
          opportunity_score?: number;
          series?: Json;
          signal_id: string;
          source_scopes?: Json;
          supply_score?: number;
        };
        Update: {
          city?: string | null;
          country_code?: string;
          demand_score?: number;
          geo_key?: string;
          id?: string;
          ingest_run_id?: string | null;
          language_code?: string;
          lead_weeks?: number;
          location_code?: number | null;
          measurement_scope?: string;
          momentum?: number;
          observed_at?: string;
          opportunity_score?: number;
          series?: Json;
          signal_id?: string;
          source_scopes?: Json;
          supply_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "signal_market_snapshots_ingest_run_id_fkey";
            columns: ["ingest_run_id"];
            isOneToOne: false;
            referencedRelation: "ingest_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signal_market_snapshots_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "signals";
            referencedColumns: ["id"];
          },
        ];
      };
      signal_observations: {
        Row: {
          canonical_query: string;
          created_at: string;
          evidence_hash: string;
          evidence_text: string;
          evidence_type: string;
          evidence_url: string | null;
          friction: string | null;
          geo_key: string;
          id: string;
          observed_at: string | null;
          observed_behavior: string;
          provenance: string;
          signal_id: string | null;
          source: string;
          source_type: string;
          workaround: string | null;
        };
        Insert: {
          canonical_query: string;
          created_at?: string;
          evidence_hash: string;
          evidence_text: string;
          evidence_type: string;
          evidence_url?: string | null;
          friction?: string | null;
          geo_key?: string;
          id?: string;
          observed_at?: string | null;
          observed_behavior: string;
          provenance: string;
          signal_id?: string | null;
          source: string;
          source_type: string;
          workaround?: string | null;
        };
        Update: {
          canonical_query?: string;
          created_at?: string;
          evidence_hash?: string;
          evidence_text?: string;
          evidence_type?: string;
          evidence_url?: string | null;
          friction?: string | null;
          geo_key?: string;
          id?: string;
          observed_at?: string | null;
          observed_behavior?: string;
          provenance?: string;
          signal_id?: string | null;
          source?: string;
          source_type?: string;
          workaround?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "signal_observations_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "signals";
            referencedColumns: ["id"];
          },
        ];
      };
      signal_briefs: {
        Row: {
          brief: Json;
          cache_key: string | null;
          created_at: string;
          direction_hash: string;
          geo_key: string;
          id: string;
          model: string;
          observation_set_hash: string;
          score_bucket: number;
          signal_id: string;
        };
        Insert: {
          brief: Json;
          cache_key?: string | null;
          created_at?: string;
          direction_hash?: string;
          geo_key?: string;
          id?: string;
          model: string;
          observation_set_hash?: string;
          score_bucket: number;
          signal_id: string;
        };
        Update: {
          brief?: Json;
          cache_key?: string | null;
          created_at?: string;
          direction_hash?: string;
          geo_key?: string;
          id?: string;
          model?: string;
          observation_set_hash?: string;
          score_bucket?: number;
          signal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signal_briefs_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "signals";
            referencedColumns: ["id"];
          },
        ];
      };
      signal_evidence: {
        Row: {
          detail: string | null;
          id: string;
          metric: string;
          observed_at: string;
          signal_id: string;
          source: string;
          url: string | null;
          value: number | null;
        };
        Insert: {
          detail?: string | null;
          id?: string;
          metric: string;
          observed_at?: string;
          signal_id: string;
          source: string;
          url?: string | null;
          value?: number | null;
        };
        Update: {
          detail?: string | null;
          id?: string;
          metric?: string;
          observed_at?: string;
          signal_id?: string;
          source?: string;
          url?: string | null;
          value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "signal_evidence_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "signals";
            referencedColumns: ["id"];
          },
        ];
      };
      signals: {
        Row: {
          category: string;
          created_at: string;
          demand_score: number;
          first_seen_at: string | null;
          id: string;
          keyword: string;
          lead_weeks: number;
          momentum: number;
          opportunity_score: number;
          series: Json;
          slug: string;
          supply_score: number;
          tags: string[];
          updated_at: string;
          why: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          demand_score?: number;
          first_seen_at?: string | null;
          id?: string;
          keyword: string;
          lead_weeks?: number;
          momentum?: number;
          opportunity_score?: number;
          series?: Json;
          slug: string;
          supply_score?: number;
          tags?: string[];
          updated_at?: string;
          why?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          demand_score?: number;
          first_seen_at?: string | null;
          id?: string;
          keyword?: string;
          lead_weeks?: number;
          momentum?: number;
          opportunity_score?: number;
          series?: Json;
          slug?: string;
          supply_score?: number;
          tags?: string[];
          updated_at?: string;
          why?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
