export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          admin_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: number;
          reason: string | null;
          target_id: string;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          admin_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          reason?: string | null;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          reason?: string | null;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admins: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          description: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          available_from: string | null;
          contacted_at: string | null;
          credited_back_at: string | null;
          decided_at: string | null;
          id: string;
          job_id: string;
          pitch: string;
          proposed_price: number | null;
          provider_id: string;
          sent_at: string;
          service_card_id: string | null;
          status: Database["public"]["Enums"]["application_status"];
          viewed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          available_from?: string | null;
          contacted_at?: string | null;
          credited_back_at?: string | null;
          decided_at?: string | null;
          id?: string;
          job_id: string;
          pitch: string;
          proposed_price?: number | null;
          provider_id: string;
          sent_at?: string;
          service_card_id?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          viewed_at?: string | null;
        };
        Update: {
          available_from?: string | null;
          contacted_at?: string | null;
          credited_back_at?: string | null;
          decided_at?: string | null;
          id?: string;
          job_id?: string;
          pitch?: string;
          proposed_price?: number | null;
          provider_id?: string;
          sent_at?: string;
          service_card_id?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "applications_service_card_id_fkey";
            columns: ["service_card_id"];
            isOneToOne: false;
            referencedRelation: "service_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          active: boolean;
          budget_mandatory: boolean;
          id: number;
          name_en: string;
          name_he: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          budget_mandatory?: boolean;
          id?: never;
          name_en: string;
          name_he: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          budget_mandatory?: boolean;
          id?: never;
          name_en?: string;
          name_he?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      category_suggestions: {
        Row: {
          context: string;
          created_at: string;
          handled_by: string | null;
          id: string;
          status: Database["public"]["Enums"]["review_state"];
          text: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          context: string;
          created_at?: string;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["review_state"];
          text: string;
          user_id?: string | null;
        };
        Update: {
          context?: string;
          created_at?: string;
          handled_by?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["review_state"];
          text?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "category_suggestions_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_transactions: {
        Row: {
          admin_id: string | null;
          amount: number;
          balance_after: number;
          created_at: string;
          id: number;
          provider_id: string;
          reason: string | null;
          reference_id: string | null;
          reference_type: string | null;
          tx_type: Database["public"]["Enums"]["credit_tx_type"];
        };
        ComputedFields: never;
        Insert: {
          admin_id?: string | null;
          amount: number;
          balance_after: number;
          created_at?: string;
          id?: never;
          provider_id: string;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          tx_type: Database["public"]["Enums"]["credit_tx_type"];
        };
        Update: {
          admin_id?: string | null;
          amount?: number;
          balance_after?: number;
          created_at?: string;
          id?: never;
          provider_id?: string;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          tx_type?: Database["public"]["Enums"]["credit_tx_type"];
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_transactions_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      direct_requests: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          budget_type: Database["public"]["Enums"]["budget_type"];
          city: string | null;
          decline_reason: string | null;
          description: string;
          expires_at: string;
          id: string;
          job_id: string | null;
          mode: Database["public"]["Enums"]["work_mode"];
          poster_id: string;
          provider_id: string;
          responded_at: string | null;
          sent_at: string;
          status: Database["public"]["Enums"]["request_status"];
          subcategory_id: number;
          timeline: Database["public"]["Enums"]["job_timeline"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          budget_type: Database["public"]["Enums"]["budget_type"];
          city?: string | null;
          decline_reason?: string | null;
          description: string;
          expires_at: string;
          id?: string;
          job_id?: string | null;
          mode: Database["public"]["Enums"]["work_mode"];
          poster_id: string;
          provider_id: string;
          responded_at?: string | null;
          sent_at?: string;
          status?: Database["public"]["Enums"]["request_status"];
          subcategory_id: number;
          timeline: Database["public"]["Enums"]["job_timeline"];
          title: string;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          budget_type?: Database["public"]["Enums"]["budget_type"];
          city?: string | null;
          decline_reason?: string | null;
          description?: string;
          expires_at?: string;
          id?: string;
          job_id?: string | null;
          mode?: Database["public"]["Enums"]["work_mode"];
          poster_id?: string;
          provider_id?: string;
          responded_at?: string | null;
          sent_at?: string;
          status?: Database["public"]["Enums"]["request_status"];
          subcategory_id?: number;
          timeline?: Database["public"]["Enums"]["job_timeline"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "direct_requests_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_requests_poster_id_fkey";
            columns: ["poster_id"];
            isOneToOne: false;
            referencedRelation: "poster_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "direct_requests_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "direct_requests_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      engagements: {
        Row: {
          application_id: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          extra_hire: boolean;
          id: string;
          job_id: string | null;
          poster_id: string;
          provider_id: string;
          request_id: string | null;
          source: Database["public"]["Enums"]["engagement_source"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          application_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          extra_hire?: boolean;
          id?: string;
          job_id?: string | null;
          poster_id: string;
          provider_id: string;
          request_id?: string | null;
          source: Database["public"]["Enums"]["engagement_source"];
          title: string;
        };
        Update: {
          application_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          extra_hire?: boolean;
          id?: string;
          job_id?: string | null;
          poster_id?: string;
          provider_id?: string;
          request_id?: string | null;
          source?: Database["public"]["Enums"]["engagement_source"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "engagements_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: true;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_poster_id_fkey";
            columns: ["poster_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "engagements_request_fk";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "direct_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      extra_hire_requests: {
        Row: {
          application_id: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          job_id: string;
          poster_id: string;
          reason: string | null;
          status: Database["public"]["Enums"]["review_state"];
        };
        ComputedFields: never;
        Insert: {
          application_id: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          job_id: string;
          poster_id: string;
          reason?: string | null;
          status?: Database["public"]["Enums"]["review_state"];
        };
        Update: {
          application_id?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          job_id?: string;
          poster_id?: string;
          reason?: string | null;
          status?: Database["public"]["Enums"]["review_state"];
        };
        Relationships: [
          {
            foreignKeyName: "extra_hire_requests_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_hire_requests_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_hire_requests_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_hire_requests_poster_id_fkey";
            columns: ["poster_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          author_id: string;
          brief_clarity: number | null;
          comment: string | null;
          comment_hidden: boolean;
          communication: number | null;
          direction: Database["public"]["Enums"]["feedback_direction"];
          engagement_id: string;
          fair_payment: number | null;
          id: string;
          no_reason: string | null;
          overall: number | null;
          quality: number | null;
          reliability: number | null;
          revealed_at: string | null;
          subject_id: string;
          submitted_at: string;
          value_for_money: number | null;
          worked_together: Database["public"]["Enums"]["worked_together"];
          would_again: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          brief_clarity?: number | null;
          comment?: string | null;
          comment_hidden?: boolean;
          communication?: number | null;
          direction: Database["public"]["Enums"]["feedback_direction"];
          engagement_id: string;
          fair_payment?: number | null;
          id?: string;
          no_reason?: string | null;
          overall?: number | null;
          quality?: number | null;
          reliability?: number | null;
          revealed_at?: string | null;
          subject_id: string;
          submitted_at?: string;
          value_for_money?: number | null;
          worked_together: Database["public"]["Enums"]["worked_together"];
          would_again?: boolean | null;
        };
        Update: {
          author_id?: string;
          brief_clarity?: number | null;
          comment?: string | null;
          comment_hidden?: boolean;
          communication?: number | null;
          direction?: Database["public"]["Enums"]["feedback_direction"];
          engagement_id?: string;
          fair_payment?: number | null;
          id?: string;
          no_reason?: string | null;
          overall?: number | null;
          quality?: number | null;
          reliability?: number | null;
          revealed_at?: string | null;
          subject_id?: string;
          submitted_at?: string;
          value_for_money?: number | null;
          worked_together?: Database["public"]["Enums"]["worked_together"];
          would_again?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_engagement_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_private_notes: {
        Row: {
          feedback_id: string;
          note: string;
        };
        ComputedFields: never;
        Insert: {
          feedback_id: string;
          note: string;
        };
        Update: {
          feedback_id?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_private_notes_feedback_id_fkey";
            columns: ["feedback_id"];
            isOneToOne: true;
            referencedRelation: "feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_private_notes_feedback_id_fkey";
            columns: ["feedback_id"];
            isOneToOne: true;
            referencedRelation: "public_reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_requests: {
        Row: {
          blocked_at: string | null;
          completed_at: string | null;
          direction: Database["public"]["Enums"]["feedback_direction"];
          engagement_id: string;
          id: string;
          last_answer: Database["public"]["Enums"]["worked_together"] | null;
          last_reminder_at: string | null;
          reminders_sent: number;
          requested_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_at?: string | null;
          completed_at?: string | null;
          direction: Database["public"]["Enums"]["feedback_direction"];
          engagement_id: string;
          id?: string;
          last_answer?: Database["public"]["Enums"]["worked_together"] | null;
          last_reminder_at?: string | null;
          reminders_sent?: number;
          requested_at?: string;
          user_id: string;
        };
        Update: {
          blocked_at?: string | null;
          completed_at?: string | null;
          direction?: Database["public"]["Enums"]["feedback_direction"];
          engagement_id?: string;
          id?: string;
          last_answer?: Database["public"]["Enums"]["worked_together"] | null;
          last_reminder_at?: string | null;
          reminders_sent?: number;
          requested_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_requests_engagement_id_fkey";
            columns: ["engagement_id"];
            isOneToOne: false;
            referencedRelation: "engagements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_claims: {
        Row: {
          claimed_at: string | null;
          job_id: string;
          phone: string;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          claimed_at?: string | null;
          job_id: string;
          phone: string;
          token?: string;
        };
        Update: {
          claimed_at?: string | null;
          job_id?: string;
          phone?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_claims_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_saves: {
        Row: {
          created_at: string;
          job_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          job_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          job_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_saves_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_saves_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          application_count: number;
          attachment_paths: string[];
          budget_max: number | null;
          budget_min: number | null;
          budget_type: Database["public"]["Enums"]["budget_type"];
          city: string | null;
          closed_at: string | null;
          created_at: string;
          created_by_admin: string | null;
          description: string;
          expires_at: string;
          expiry_notified_at: string | null;
          extended: boolean;
          hold_reason: string | null;
          id: string;
          mode: Database["public"]["Enums"]["work_mode"];
          on_behalf_name: string | null;
          poster_id: string | null;
          published_at: string;
          skills: string[];
          start_date: string | null;
          status: Database["public"]["Enums"]["job_status"];
          subcategory_id: number;
          timeline: Database["public"]["Enums"]["job_timeline"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          application_count?: number;
          attachment_paths?: string[];
          budget_max?: number | null;
          budget_min?: number | null;
          budget_type: Database["public"]["Enums"]["budget_type"];
          city?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by_admin?: string | null;
          description: string;
          expires_at: string;
          expiry_notified_at?: string | null;
          extended?: boolean;
          hold_reason?: string | null;
          id?: string;
          mode: Database["public"]["Enums"]["work_mode"];
          on_behalf_name?: string | null;
          poster_id?: string | null;
          published_at?: string;
          skills?: string[];
          start_date?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          subcategory_id: number;
          timeline: Database["public"]["Enums"]["job_timeline"];
          title: string;
          updated_at?: string;
        };
        Update: {
          application_count?: number;
          attachment_paths?: string[];
          budget_max?: number | null;
          budget_min?: number | null;
          budget_type?: Database["public"]["Enums"]["budget_type"];
          city?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by_admin?: string | null;
          description?: string;
          expires_at?: string;
          expiry_notified_at?: string | null;
          extended?: boolean;
          hold_reason?: string | null;
          id?: string;
          mode?: Database["public"]["Enums"]["work_mode"];
          on_behalf_name?: string | null;
          poster_id?: string | null;
          published_at?: string;
          skills?: string[];
          start_date?: string | null;
          status?: Database["public"]["Enums"]["job_status"];
          subcategory_id?: number;
          timeline?: Database["public"]["Enums"]["job_timeline"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_admin_fkey";
            columns: ["created_by_admin"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_poster_id_fkey";
            columns: ["poster_id"];
            isOneToOne: false;
            referencedRelation: "poster_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "jobs_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          error: string | null;
          event: string;
          id: number;
          in_app: boolean;
          payload: NonNullable<Json>;
          read_at: string | null;
          send_after: string;
          sent_at: string | null;
          status: string;
          to_phone: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          error?: string | null;
          event: string;
          id?: never;
          in_app?: boolean;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          to_phone?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          event?: string;
          id?: never;
          in_app?: boolean;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          to_phone?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poster_profiles: {
        Row: {
          city: string;
          company_name: string | null;
          created_at: string;
          display_name: string;
          hires: number;
          jobs_closed: number;
          jobs_posted: number;
          logo_path: string | null;
          poster_type: Database["public"]["Enums"]["poster_type"];
          rating_avg: number | null;
          rating_count: number;
          updated_at: string;
          user_id: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          city: string;
          company_name?: string | null;
          created_at?: string;
          display_name: string;
          hires?: number;
          jobs_closed?: number;
          jobs_posted?: number;
          logo_path?: string | null;
          poster_type: Database["public"]["Enums"]["poster_type"];
          rating_avg?: number | null;
          rating_count?: number;
          updated_at?: string;
          user_id: string;
          website?: string | null;
        };
        Update: {
          city?: string;
          company_name?: string | null;
          created_at?: string;
          display_name?: string;
          hires?: number;
          jobs_closed?: number;
          jobs_posted?: number;
          logo_path?: string | null;
          poster_type?: Database["public"]["Enums"]["poster_type"];
          rating_avg?: number | null;
          rating_count?: number;
          updated_at?: string;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "poster_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_poster: boolean;
          is_provider: boolean;
          marketing_opt_in: boolean;
          notification_prefs: NonNullable<Json>;
          phone: string | null;
          phone_verified: boolean;
          status: Database["public"]["Enums"]["account_status"];
          terms_accepted_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_poster?: boolean;
          is_provider?: boolean;
          marketing_opt_in?: boolean;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          phone_verified?: boolean;
          status?: Database["public"]["Enums"]["account_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_poster?: boolean;
          is_provider?: boolean;
          marketing_opt_in?: boolean;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          phone_verified?: boolean;
          status?: Database["public"]["Enums"]["account_status"];
          terms_accepted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_education: {
        Row: {
          degree: string;
          end_date: string | null;
          id: string;
          institution: string | null;
          provider_id: string;
          sort_order: number;
          start_date: string | null;
        };
        ComputedFields: never;
        Insert: {
          degree: string;
          end_date?: string | null;
          id?: string;
          institution?: string | null;
          provider_id: string;
          sort_order?: number;
          start_date?: string | null;
        };
        Update: {
          degree?: string;
          end_date?: string | null;
          id?: string;
          institution?: string | null;
          provider_id?: string;
          sort_order?: number;
          start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "provider_education_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      provider_experience: {
        Row: {
          end_date: string | null;
          id: string;
          organization: string | null;
          provider_id: string;
          sort_order: number;
          start_date: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          end_date?: string | null;
          id?: string;
          organization?: string | null;
          provider_id: string;
          sort_order?: number;
          start_date?: string | null;
          title: string;
        };
        Update: {
          end_date?: string | null;
          id?: string;
          organization?: string | null;
          provider_id?: string;
          sort_order?: number;
          start_date?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_experience_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      provider_profiles: {
        Row: {
          avg_response_hours: number | null;
          bio: string | null;
          city: string | null;
          created_at: string;
          cv_path: string | null;
          cv_visible: boolean;
          days_band: Database["public"]["Enums"]["days_band"] | null;
          display_name: string | null;
          headline: string | null;
          jobs_done: number;
          languages: string[];
          license_number: string | null;
          onboarding_step: number;
          other_title: string | null;
          photo_path: string | null;
          portfolio_links: string[];
          provider_type: Database["public"]["Enums"]["provider_type"];
          radius_km: number | null;
          rating_avg: number | null;
          rating_count: number;
          show_days_band: boolean;
          updated_at: string;
          user_id: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          works_onsite: boolean;
          works_remote: boolean;
          years_experience: number | null;
        };
        ComputedFields: never;
        Insert: {
          avg_response_hours?: number | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          cv_path?: string | null;
          cv_visible?: boolean;
          days_band?: Database["public"]["Enums"]["days_band"] | null;
          display_name?: string | null;
          headline?: string | null;
          jobs_done?: number;
          languages?: string[];
          license_number?: string | null;
          onboarding_step?: number;
          other_title?: string | null;
          photo_path?: string | null;
          portfolio_links?: string[];
          provider_type: Database["public"]["Enums"]["provider_type"];
          radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number;
          show_days_band?: boolean;
          updated_at?: string;
          user_id: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          works_onsite?: boolean;
          works_remote?: boolean;
          years_experience?: number | null;
        };
        Update: {
          avg_response_hours?: number | null;
          bio?: string | null;
          city?: string | null;
          created_at?: string;
          cv_path?: string | null;
          cv_visible?: boolean;
          days_band?: Database["public"]["Enums"]["days_band"] | null;
          display_name?: string | null;
          headline?: string | null;
          jobs_done?: number;
          languages?: string[];
          license_number?: string | null;
          onboarding_step?: number;
          other_title?: string | null;
          photo_path?: string | null;
          portfolio_links?: string[];
          provider_type?: Database["public"]["Enums"]["provider_type"];
          radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number;
          show_days_band?: boolean;
          updated_at?: string;
          user_id?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          works_onsite?: boolean;
          works_remote?: boolean;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "provider_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_skills: {
        Row: {
          provider_id: string;
          skill: string;
        };
        ComputedFields: never;
        Insert: {
          provider_id: string;
          skill: string;
        };
        Update: {
          provider_id?: string;
          skill?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_skills_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      provider_subcategories: {
        Row: {
          provider_id: string;
          subcategory_id: number;
        };
        ComputedFields: never;
        Insert: {
          provider_id: string;
          subcategory_id: number;
        };
        Update: {
          provider_id?: string;
          subcategory_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "provider_subcategories_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "provider_subcategories_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_wallets: {
        Row: {
          balance: number;
          provider_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          balance?: number;
          provider_id: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          provider_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_wallets_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: true;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          status: Database["public"]["Enums"]["review_state"];
          target_id: string;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: Database["public"]["Enums"]["review_state"];
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: Database["public"]["Enums"]["review_state"];
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_cards: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          mode: Database["public"]["Enums"]["work_mode"];
          price_from: number | null;
          provider_id: string;
          subcategory_id: number;
          title: string;
          unit: Database["public"]["Enums"]["service_unit"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mode?: Database["public"]["Enums"]["work_mode"];
          price_from?: number | null;
          provider_id: string;
          subcategory_id: number;
          title: string;
          unit?: Database["public"]["Enums"]["service_unit"];
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mode?: Database["public"]["Enums"]["work_mode"];
          price_from?: number | null;
          provider_id?: string;
          subcategory_id?: number;
          title?: string;
          unit?: Database["public"]["Enums"]["service_unit"];
        };
        Relationships: [
          {
            foreignKeyName: "service_cards_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "service_cards_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
        ];
      };
      spouse_links: {
        Row: {
          created_at: string;
          decided_at: string | null;
          expires_at: string;
          id: string;
          invite_name: string;
          invite_phone: string;
          invite_token: string;
          reservist_id: string;
          spouse_user_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          expires_at: string;
          id?: string;
          invite_name: string;
          invite_phone: string;
          invite_token?: string;
          reservist_id: string;
          spouse_user_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          expires_at?: string;
          id?: string;
          invite_name?: string;
          invite_phone?: string;
          invite_token?: string;
          reservist_id?: string;
          spouse_user_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spouse_links_reservist_id_fkey";
            columns: ["reservist_id"];
            isOneToOne: false;
            referencedRelation: "provider_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "spouse_links_spouse_user_id_fkey";
            columns: ["spouse_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subcategories: {
        Row: {
          active: boolean;
          category_id: number;
          id: number;
          is_other: boolean;
          licensed: boolean;
          name_en: string;
          name_he: string;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          category_id: number;
          id?: never;
          is_other?: boolean;
          licensed?: boolean;
          name_en: string;
          name_he: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          category_id?: number;
          id?: never;
          is_other?: boolean;
          licensed?: boolean;
          name_en?: string;
          name_he?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          days_band: Database["public"]["Enums"]["days_band"] | null;
          days_total: number | null;
          decided_at: string | null;
          decision_reason: string | null;
          documents_deleted_at: string | null;
          duplicate_suspected: boolean;
          extracted: Json | null;
          file_paths: string[];
          id: string;
          id_hash: string | null;
          kind: Database["public"]["Enums"]["verification_kind"];
          provider_note: string | null;
          reviewer_id: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          submitted_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          days_band?: Database["public"]["Enums"]["days_band"] | null;
          days_total?: number | null;
          decided_at?: string | null;
          decision_reason?: string | null;
          documents_deleted_at?: string | null;
          duplicate_suspected?: boolean;
          extracted?: Json | null;
          file_paths?: string[];
          id?: string;
          id_hash?: string | null;
          kind: Database["public"]["Enums"]["verification_kind"];
          provider_note?: string | null;
          reviewer_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          submitted_at?: string;
          user_id: string;
        };
        Update: {
          days_band?: Database["public"]["Enums"]["days_band"] | null;
          days_total?: number | null;
          decided_at?: string | null;
          decision_reason?: string | null;
          documents_deleted_at?: string | null;
          duplicate_suspected?: boolean;
          extracted?: Json | null;
          file_paths?: string[];
          id?: string;
          id_hash?: string | null;
          kind?: Database["public"]["Enums"]["verification_kind"];
          provider_note?: string | null;
          reviewer_id?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          submitted_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_reviews: {
        Row: {
          author_name: string | null;
          brief_clarity: number | null;
          comment: string | null;
          communication: number | null;
          direction: Database["public"]["Enums"]["feedback_direction"];
          fair_payment: number | null;
          id: string;
          overall: number | null;
          quality: number | null;
          reliability: number | null;
          subject_id: string;
          submitted_at: string;
          value_for_money: number | null;
          would_again: boolean | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "feedback_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_spouse_invite: { Args: { p_token: string }; Returns: undefined };
      admin_adjust_credits: {
        Args: { p_amount: number; p_provider: string; p_reason: string };
        Returns: number;
      };
      admin_cancel_engagement: {
        Args: { p_engagement: string; p_reason: string };
        Returns: undefined;
      };
      admin_hide_review_comment: {
        Args: { p_feedback: string; p_reason: string };
        Returns: undefined;
      };
      admin_post_job: {
        Args: {
          p_budget_max: number;
          p_budget_min: number;
          p_budget_type: Database["public"]["Enums"]["budget_type"];
          p_city: string;
          p_claim_phone: string;
          p_description: string;
          p_mode: Database["public"]["Enums"]["work_mode"];
          p_on_behalf_name: string;
          p_subcategory: number;
          p_timeline: Database["public"]["Enums"]["job_timeline"];
          p_title: string;
        };
        Returns: string;
      };
      admin_release_job: { Args: { p_job: string }; Returns: undefined };
      admin_remove_job: {
        Args: { p_job: string; p_reason: string };
        Returns: undefined;
      };
      admin_set_account_status: {
        Args: {
          p_reason: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_user: string;
        };
        Returns: undefined;
      };
      admin_set_spouse_eligibility: {
        Args: { p_keep: boolean; p_reason: string; p_spouse: string };
        Returns: undefined;
      };
      admin_update_setting: {
        Args: { p_key: string; p_value: Json };
        Returns: undefined;
      };
      apply_to_job: {
        Args: {
          p_available_from?: string;
          p_job: string;
          p_pitch: string;
          p_proposed_price?: number;
          p_service_card?: string;
        };
        Returns: string;
      };
      block_user: { Args: { p_other: string }; Returns: undefined };
      budget_required: {
        Args: {
          p_mode: Database["public"]["Enums"]["work_mode"];
          p_sub: number;
        };
        Returns: boolean;
      };
      cancel_spouse_invite: { Args: { p_link: string }; Returns: undefined };
      claim_job: { Args: { p_token: string }; Returns: string };
      close_job: { Args: { p_job: string }; Returns: undefined };
      complete_signup: {
        Args: {
          p_as_poster: boolean;
          p_as_provider: boolean;
          p_full_name: string;
          p_marketing_opt_in?: boolean;
        };
        Returns: undefined;
      };
      contact_applicant: { Args: { p_app: string }; Returns: undefined };
      create_job: {
        Args: {
          p_attachment_paths?: string[];
          p_budget_max: number;
          p_budget_min: number;
          p_budget_type: Database["public"]["Enums"]["budget_type"];
          p_city: string;
          p_description: string;
          p_mode: Database["public"]["Enums"]["work_mode"];
          p_skills?: string[];
          p_start_date?: string;
          p_subcategory: number;
          p_timeline: Database["public"]["Enums"]["job_timeline"];
          p_title: string;
        };
        Returns: string;
      };
      days_to_band: {
        Args: { p_days: number };
        Returns: Database["public"]["Enums"]["days_band"];
      };
      decide_extra_hire: {
        Args: { p_approve: boolean; p_reason?: string; p_request: string };
        Returns: string;
      };
      decide_verification: {
        Args: {
          p_days_total?: number;
          p_decision: Database["public"]["Enums"]["verification_status"];
          p_reason?: string;
          p_request: string;
        };
        Returns: string[];
      };
      decline_application: { Args: { p_app: string }; Returns: undefined };
      extend_job: { Args: { p_job: string }; Returns: string };
      get_contact: {
        Args: { p_other: string };
        Returns: {
          email: string;
          full_name: string;
          phone: string;
        }[];
      };
      get_spouse_invite: {
        Args: { p_token: string };
        Returns: {
          expires_at: string;
          invite_name: string;
          reservist_name: string;
          status: string;
        }[];
      };
      hire_application: { Args: { p_app: string }; Returns: string };
      invite_spouse: {
        Args: { p_name: string; p_phone: string };
        Returns: string;
      };
      is_admin: {
        Args: { p_role?: Database["public"]["Enums"]["admin_role"] };
        Returns: boolean;
      };
      is_blocked_between: {
        Args: { p_a: string; p_b: string };
        Returns: boolean;
      };
      is_feedback_blocked: { Args: { p_user: string }; Returns: boolean };
      is_verified_provider: { Args: { p_user: string }; Returns: boolean };
      mark_application_viewed: { Args: { p_app: string }; Returns: undefined };
      mark_documents_deleted: {
        Args: { p_request: string };
        Returns: undefined;
      };
      mark_notifications_read: {
        Args: { p_ids?: number[] };
        Returns: undefined;
      };
      normalize_il_phone: { Args: { p_raw: string }; Returns: string };
      raise_app_error: {
        Args: { p_code: string; p_detail?: string };
        Returns: undefined;
      };
      report_content: {
        Args: {
          p_details?: string;
          p_reason: string;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
      request_extra_hire: { Args: { p_app: string }; Returns: string };
      require_active_user: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      require_admin: {
        Args: { p_role?: Database["public"]["Enums"]["admin_role"] };
        Returns: string;
      };
      resolve_report: {
        Args: { p_action_taken: boolean; p_report: string };
        Returns: undefined;
      };
      respond_direct_request: {
        Args: { p_approve: boolean; p_reason?: string; p_request: string };
        Returns: string;
      };
      send_direct_request: {
        Args: {
          p_budget_max: number;
          p_budget_min: number;
          p_budget_type: Database["public"]["Enums"]["budget_type"];
          p_city: string;
          p_description: string;
          p_job?: string;
          p_mode: Database["public"]["Enums"]["work_mode"];
          p_provider: string;
          p_subcategory: number;
          p_timeline: Database["public"]["Enums"]["job_timeline"];
          p_title: string;
        };
        Returns: string;
      };
      setting_int: { Args: { p_key: string }; Returns: number };
      setting_json: { Args: { p_key: string }; Returns: Json };
      short_name: { Args: { p_full: string }; Returns: string };
      shortlist_application: {
        Args: { p_app: string; p_on?: boolean };
        Returns: undefined;
      };
      start_provider_onboarding: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      submit_feedback: {
        Args: {
          p_comment?: string;
          p_engagement: string;
          p_no_reason?: string;
          p_overall?: number;
          p_private_note?: string;
          p_scores?: Json;
          p_worked_together: Database["public"]["Enums"]["worked_together"];
          p_would_again?: boolean;
        };
        Returns: string;
      };
      submit_verification: {
        Args: {
          p_days_total: number;
          p_extracted: Json;
          p_file_paths: string[];
          p_id_hash: string;
          p_kind: Database["public"]["Enums"]["verification_kind"];
          p_note?: string;
          p_user: string;
        };
        Returns: string;
      };
      suggest_category: {
        Args: { p_context: string; p_text: string };
        Returns: undefined;
      };
      unblock_user: { Args: { p_other: string }; Returns: undefined };
      upsert_poster_profile: {
        Args: {
          p_city: string;
          p_company_name?: string;
          p_display_name: string;
          p_logo_path?: string;
          p_poster_type: Database["public"]["Enums"]["poster_type"];
          p_website?: string;
        };
        Returns: undefined;
      };
      withdraw_application: { Args: { p_app: string }; Returns: undefined };
    };
    Enums: {
      account_status: "active" | "suspended";
      admin_role: "admin" | "reviewer";
      application_status:
        | "sent"
        | "viewed"
        | "shortlisted"
        | "contacted"
        | "hired"
        | "not_selected"
        | "credited_back"
        | "withdrawn";
      budget_type: "fixed" | "hourly" | "open_to_quotes";
      credit_tx_type:
        | "welcome"
        | "apply"
        | "request_approve"
        | "credit_back"
        | "admin_adjust"
        | "purchase";
      days_band: "30-59" | "60-119" | "120+";
      engagement_source: "application" | "request";
      feedback_direction: "poster_to_provider" | "provider_to_poster";
      job_status:
        | "held"
        | "open"
        | "hired"
        | "closed_no_hire"
        | "expired"
        | "removed";
      job_timeline: "asap" | "week" | "month" | "flexible";
      poster_type: "private" | "business" | "hr" | "public_body";
      provider_type: "reservist" | "spouse";
      request_status: "pending" | "approved" | "declined" | "expired";
      review_state: "open" | "approved" | "declined";
      service_unit: "job" | "hour" | "day" | "project";
      verification_kind: "form_3010" | "spouse";
      verification_status:
        | "draft"
        | "pending"
        | "more_info"
        | "approved"
        | "rejected";
      work_mode: "onsite" | "remote" | "both";
      worked_together: "yes" | "not_yet" | "no";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended"],
      admin_role: ["admin", "reviewer"],
      application_status: [
        "sent",
        "viewed",
        "shortlisted",
        "contacted",
        "hired",
        "not_selected",
        "credited_back",
        "withdrawn",
      ],
      budget_type: ["fixed", "hourly", "open_to_quotes"],
      credit_tx_type: [
        "welcome",
        "apply",
        "request_approve",
        "credit_back",
        "admin_adjust",
        "purchase",
      ],
      days_band: ["30-59", "60-119", "120+"],
      engagement_source: ["application", "request"],
      feedback_direction: ["poster_to_provider", "provider_to_poster"],
      job_status: [
        "held",
        "open",
        "hired",
        "closed_no_hire",
        "expired",
        "removed",
      ],
      job_timeline: ["asap", "week", "month", "flexible"],
      poster_type: ["private", "business", "hr", "public_body"],
      provider_type: ["reservist", "spouse"],
      request_status: ["pending", "approved", "declined", "expired"],
      review_state: ["open", "approved", "declined"],
      service_unit: ["job", "hour", "day", "project"],
      verification_kind: ["form_3010", "spouse"],
      verification_status: [
        "draft",
        "pending",
        "more_info",
        "approved",
        "rejected",
      ],
      work_mode: ["onsite", "remote", "both"],
      worked_together: ["yes", "not_yet", "no"],
    },
  },
} as const;
