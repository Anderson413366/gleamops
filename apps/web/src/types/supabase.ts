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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          body: string | null
          created_at: string
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          severity: string
          target_user_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          alert_type: string
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          severity?: string
          target_user_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          alert_type?: string
          body?: string | null
          created_at?: string
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          severity?: string
          target_user_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      area_fixtures: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          fixture_type: string
          id: string
          notes: string | null
          quantity: number
          site_area_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          fixture_type: string
          id?: string
          notes?: string | null
          quantity?: number
          site_area_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          fixture_type?: string
          id?: string
          notes?: string | null
          quantity?: number
          site_area_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_fixtures_site_area_id_fkey"
            columns: ["site_area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_fixtures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cost: number | null
          created_at: string
          date: string | null
          description: string | null
          details: string | null
          equipment_id: string
          id: string
          maintenance_type: string
          next_due_date: string | null
          performed_by: string | null
          performed_by_staff_id: string | null
          performed_on: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost?: number | null
          created_at?: string
          date?: string | null
          description?: string | null
          details?: string | null
          equipment_id: string
          id?: string
          maintenance_type: string
          next_due_date?: string | null
          performed_by?: string | null
          performed_by_staff_id?: string | null
          performed_on: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost?: number | null
          created_at?: string
          date?: string | null
          description?: string | null
          details?: string | null
          equipment_id?: string
          id?: string
          maintenance_type?: string
          next_due_date?: string | null
          performed_by?: string | null
          performed_by_staff_id?: string | null
          performed_on?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_performed_by_staff_id_fkey"
            columns: ["performed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          equipment_id: string
          from_inventory_location_id: string | null
          from_site_id: string | null
          id: string
          notes: string | null
          performed_by_user_id: string | null
          tenant_id: string
          to_inventory_location_id: string | null
          to_site_id: string | null
          transferred_at: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          equipment_id: string
          from_inventory_location_id?: string | null
          from_site_id?: string | null
          id?: string
          notes?: string | null
          performed_by_user_id?: string | null
          tenant_id: string
          to_inventory_location_id?: string | null
          to_site_id?: string | null
          transferred_at?: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          equipment_id?: string
          from_inventory_location_id?: string | null
          from_site_id?: string | null
          id?: string
          notes?: string | null
          performed_by_user_id?: string | null
          tenant_id?: string
          to_inventory_location_id?: string | null
          to_site_id?: string | null
          transferred_at?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_inventory_location_id_fkey"
            columns: ["from_inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_site_id_fkey"
            columns: ["from_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_inventory_location_id_fkey"
            columns: ["to_inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_site_id_fkey"
            columns: ["to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_policies: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          auto_enforce: boolean
          coverage_response_minutes: number
          created_at: string
          escalation_minutes: number
          first_callout_action: string
          id: string
          is_active: boolean
          no_show_action: string
          no_show_cutoff_minutes: number
          on_call_standby_fee: number
          policy_name: string
          rolling_window_days: number
          second_callout_action: string
          tenant_id: string
          third_callout_action: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_enforce?: boolean
          coverage_response_minutes?: number
          created_at?: string
          escalation_minutes?: number
          first_callout_action?: string
          id?: string
          is_active?: boolean
          no_show_action?: string
          no_show_cutoff_minutes?: number
          on_call_standby_fee?: number
          policy_name: string
          rolling_window_days?: number
          second_callout_action?: string
          tenant_id: string
          third_callout_action?: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_enforce?: boolean
          coverage_response_minutes?: number
          created_at?: string
          escalation_minutes?: number
          first_callout_action?: string
          id?: string
          is_active?: boolean
          no_show_action?: string
          no_show_cutoff_minutes?: number
          on_call_standby_fee?: number
          policy_name?: string
          rolling_window_days?: number
          second_callout_action?: string
          tenant_id?: string
          third_callout_action?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string
          after: Json | null
          before: Json | null
          created_at: string
          device_id: string | null
          entity_code: string | null
          entity_id: string | null
          entity_type: string
          geo_lat: number | null
          geo_long: number | null
          id: string
          ip_address: string | null
          reason: string | null
          request_path: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          device_id?: string | null
          entity_code?: string | null
          entity_id?: string | null
          entity_type: string
          geo_lat?: number | null
          geo_long?: number | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          request_path?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          device_id?: string | null
          entity_code?: string | null
          entity_id?: string | null
          entity_type?: string
          geo_lat?: number | null
          geo_long?: number | null
          id?: string
          ip_address?: string | null
          reason?: string | null
          request_path?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      callout_events: {
        Row: {
          affected_staff_id: string
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          covered_at: string | null
          covered_by_staff_id: string | null
          created_at: string
          escalated_at: string | null
          escalation_level: number
          id: string
          metadata: Json | null
          reason: string
          reported_at: string
          reported_by_staff_id: string | null
          resolution_note: string | null
          resolved_by_user_id: string | null
          route_id: string | null
          route_stop_id: string | null
          site_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
          work_ticket_id: string | null
        }
        Insert: {
          affected_staff_id: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          covered_at?: string | null
          covered_by_staff_id?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          metadata?: Json | null
          reason: string
          reported_at?: string
          reported_by_staff_id?: string | null
          resolution_note?: string | null
          resolved_by_user_id?: string | null
          route_id?: string | null
          route_stop_id?: string | null
          site_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          work_ticket_id?: string | null
        }
        Update: {
          affected_staff_id?: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          covered_at?: string | null
          covered_by_staff_id?: string | null
          created_at?: string
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          metadata?: Json | null
          reason?: string
          reported_at?: string
          reported_by_staff_id?: string | null
          resolution_note?: string | null
          resolved_by_user_id?: string | null
          route_id?: string | null
          route_stop_id?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          work_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "callout_events_affected_staff_id_fkey"
            columns: ["affected_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_covered_by_staff_id_fkey"
            columns: ["covered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_reported_by_staff_id_fkey"
            columns: ["reported_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "callout_events_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "callout_events_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callout_events_work_ticket_id_fkey"
            columns: ["work_ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          applies_to_area_type: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_required: boolean
          label: string
          prompt: string | null
          requires_photo: boolean
          response_type: string | null
          section: string | null
          sort_order: number
          template_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
          weight: number | null
        }
        Insert: {
          applies_to_area_type?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          label: string
          prompt?: string | null
          requires_photo?: boolean
          response_type?: string | null
          section?: string | null
          sort_order?: number
          template_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          weight?: number | null
        }
        Update: {
          applies_to_area_type?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          label?: string
          prompt?: string | null
          requires_photo?: boolean
          response_type?: string | null
          section?: string | null
          sort_order?: number
          template_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_sections: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checklist_template_id: string
          created_at: string
          id: string
          is_active: boolean
          section_title: string
          sort_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checklist_template_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          section_title: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checklist_template_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          section_title?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_sections_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          service_id: string | null
          template_code: string
          template_name: string | null
          template_type: string | null
          tenant_id: string
          updated_at: string
          version: number | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          service_id?: string | null
          template_code: string
          template_name?: string | null
          template_type?: string | null
          tenant_id: string
          updated_at?: string
          version?: number | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          service_id?: string | null
          template_code?: string
          template_name?: string | null
          template_type?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          auto_renewal: boolean
          bill_to_name: string | null
          billing_address: Json | null
          billing_contact_id: string | null
          client_code: string
          client_since: string | null
          client_type: string | null
          contact_persons: Json | null
          contract_end_date: string | null
          contract_end_deprecated: string | null
          contract_start_date: string | null
          contract_start_deprecated: string | null
          contract_terms: string | null
          created_at: string
          credit_limit: number | null
          id: string
          industry: string | null
          insurance_cert_url: string | null
          insurance_expiry: string | null
          insurance_required: boolean
          invoice_frequency: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          po_required: boolean
          preferred_invoice_method: string | null
          primary_contact_id: string | null
          status: string
          status_changed_date: string | null
          tax_id: string | null
          tenant_id: string
          terms_deprecated: string | null
          type_deprecated: string | null
          updated_at: string
          version_etag: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_renewal?: boolean
          bill_to_name?: string | null
          billing_address?: Json | null
          billing_contact_id?: string | null
          client_code: string
          client_since?: string | null
          client_type?: string | null
          contact_persons?: Json | null
          contract_end_date?: string | null
          contract_end_deprecated?: string | null
          contract_start_date?: string | null
          contract_start_deprecated?: string | null
          contract_terms?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          industry?: string | null
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_required?: boolean
          invoice_frequency?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          po_required?: boolean
          preferred_invoice_method?: string | null
          primary_contact_id?: string | null
          status?: string
          status_changed_date?: string | null
          tax_id?: string | null
          tenant_id: string
          terms_deprecated?: string | null
          type_deprecated?: string | null
          updated_at?: string
          version_etag?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_renewal?: boolean
          bill_to_name?: string | null
          billing_address?: Json | null
          billing_contact_id?: string | null
          client_code?: string
          client_since?: string | null
          client_type?: string | null
          contact_persons?: Json | null
          contract_end_date?: string | null
          contract_end_deprecated?: string | null
          contract_start_date?: string | null
          contract_start_deprecated?: string | null
          contract_terms?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          industry?: string | null
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_required?: boolean
          invoice_frequency?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          po_required?: boolean
          preferred_invoice_method?: string | null
          primary_contact_id?: string | null
          status?: string
          status_changed_date?: string | null
          tax_id?: string | null
          tenant_id?: string
          terms_deprecated?: string | null
          type_deprecated?: string | null
          updated_at?: string
          version_etag?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_billing_contact_id_fkey"
            columns: ["billing_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_records: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to_staff_id: string | null
          category: string
          client_id: string | null
          complaint_code: string
          created_at: string
          customer_original_message: string | null
          id: string
          linked_route_task_id: string | null
          photos_after: Json | null
          photos_before: Json | null
          priority: string
          reported_by_name: string | null
          reported_by_staff_id: string | null
          reported_by_type: string
          resolution_description: string | null
          resolution_email_sent: boolean
          resolution_email_sent_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          site_id: string
          source: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to_staff_id?: string | null
          category: string
          client_id?: string | null
          complaint_code: string
          created_at?: string
          customer_original_message?: string | null
          id?: string
          linked_route_task_id?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          priority?: string
          reported_by_name?: string | null
          reported_by_staff_id?: string | null
          reported_by_type: string
          resolution_description?: string | null
          resolution_email_sent?: boolean
          resolution_email_sent_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id: string
          source: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to_staff_id?: string | null
          category?: string
          client_id?: string | null
          complaint_code?: string
          created_at?: string
          customer_original_message?: string | null
          id?: string
          linked_route_task_id?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          priority?: string
          reported_by_name?: string | null
          reported_by_staff_id?: string | null
          reported_by_type?: string
          resolution_description?: string | null
          resolution_email_sent?: boolean
          resolution_email_sent_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_records_assigned_to_staff_id_fkey"
            columns: ["assigned_to_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "complaint_records_linked_route_task_id_fkey"
            columns: ["linked_route_task_id"]
            isOneToOne: false
            referencedRelation: "route_stop_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_reported_by_staff_id_fkey"
            columns: ["reported_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          client_id: string | null
          company_name: string | null
          contact_code: string
          contact_type: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean
          last_name: string | null
          mobile_phone: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          preferred_contact_method: string | null
          preferred_language: string | null
          role: string | null
          role_title: string | null
          site_id: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string
          version_etag: string
          work_phone: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_code: string
          contact_type?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          mobile_phone?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          role?: string | null
          role_title?: string | null
          site_id?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          version_etag?: string
          work_phone?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_code?: string
          contact_type?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          mobile_phone?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_contact_method?: string | null
          preferred_language?: string | null
          role?: string | null
          role_title?: string | null
          site_id?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          version_etag?: string
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_locations: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contract_id: string
          created_at: string
          id: string
          is_primary: boolean
          notes: string | null
          site_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          site_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          site_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_locations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_service_lines: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contract_id: string
          created_at: string
          estimated_labor_hours_per_period: number | null
          frequency: string
          id: string
          included_in_base: boolean
          service_id: string
          sort_order: number
          tenant_id: string
          unit_price: number | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id: string
          created_at?: string
          estimated_labor_hours_per_period?: number | null
          frequency: string
          id?: string
          included_in_base?: boolean
          service_id: string
          sort_order?: number
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id?: string
          created_at?: string
          estimated_labor_hours_per_period?: number | null
          frequency?: string
          id?: string
          included_in_base?: boolean
          service_id?: string
          sort_order?: number
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_service_lines_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_service_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_service_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_slas: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contract_id: string
          created_at: string
          id: string
          notes: string | null
          severity: string
          sla_type: string
          target_minutes: number | null
          target_score: number | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          notes?: string | null
          severity: string
          sla_type: string
          target_minutes?: number | null
          target_score?: number | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          severity?: string
          sla_type?: string
          target_minutes?: number | null
          target_score?: number | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_slas_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_slas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          auto_renew: boolean
          billing_cycle: string
          client_id: string
          client_signed_at: string | null
          company_signed_at: string | null
          contract_name: string
          contract_number: string
          contract_value_arr: number | null
          contract_value_mrr: number | null
          created_at: string
          end_date: string | null
          exclusions: string | null
          id: string
          notes: string | null
          price_type: string
          renewal_term: string | null
          renewal_term_months: number | null
          scope_of_work: string | null
          services: Json | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_renew?: boolean
          billing_cycle: string
          client_id: string
          client_signed_at?: string | null
          company_signed_at?: string | null
          contract_name: string
          contract_number: string
          contract_value_arr?: number | null
          contract_value_mrr?: number | null
          created_at?: string
          end_date?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          price_type: string
          renewal_term?: string | null
          renewal_term_months?: number | null
          scope_of_work?: string | null
          services?: Json | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          client_id?: string
          client_signed_at?: string | null
          company_signed_at?: string | null
          contract_name?: string
          contract_number?: string
          contract_value_arr?: number | null
          contract_value_mrr?: number | null
          created_at?: string
          end_date?: string | null
          exclusions?: string | null
          id?: string
          notes?: string | null
          price_type?: string
          renewal_term?: string | null
          renewal_term_months?: number | null
          scope_of_work?: string | null
          services?: Json | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          conversation_id: string
          created_at: string
          id: string
          is_muted: boolean
          joined_at: string
          participant_role: string
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          participant_role: string
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          participant_role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          conversation_type: string
          created_at: string
          id: string
          issue_id: string | null
          site_id: string | null
          site_job_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_type: string
          created_at?: string
          id?: string
          issue_id?: string | null
          site_id?: string | null
          site_job_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conversation_type?: string
          created_at?: string
          id?: string
          issue_id?: string | null
          site_id?: string | null
          site_job_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_offers: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assignment_applied_at: string | null
          callout_event_id: string
          candidate_staff_id: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          offered_at: string
          offered_by_user_id: string | null
          responded_at: string | null
          response_note: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignment_applied_at?: string | null
          callout_event_id: string
          candidate_staff_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          offered_at?: string
          offered_by_user_id?: string | null
          responded_at?: string | null
          response_note?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignment_applied_at?: string | null
          callout_event_id?: string
          candidate_staff_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          offered_at?: string
          offered_by_user_id?: string | null
          responded_at?: string | null
          response_note?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_offers_callout_event_id_fkey"
            columns: ["callout_event_id"]
            isOneToOne: false
            referencedRelation: "callout_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_offers_candidate_staff_id_fkey"
            columns: ["candidate_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_options: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          custom_field_id: string
          id: string
          option_label: string
          option_value: string
          sort_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          custom_field_id: string
          id?: string
          option_label: string
          option_value: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          custom_field_id?: string
          id?: string
          option_label?: string
          option_value?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_options_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          custom_field_id: string
          entity_id: string
          id: string
          tenant_id: string
          updated_at: string
          value_bool: boolean | null
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          custom_field_id: string
          entity_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          custom_field_id?: string
          entity_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          entity_type: string
          field_key: string
          field_label: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_type: string
          field_key: string
          field_label: string
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_type?: string
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_feedback: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category: string | null
          client_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          feedback_code: string
          feedback_type: string
          id: string
          linked_complaint_id: string | null
          message: string
          photos: Json | null
          site_id: string | null
          status: string
          submitted_via: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          client_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          feedback_code: string
          feedback_type: string
          id?: string
          linked_complaint_id?: string | null
          message: string
          photos?: Json | null
          site_id?: string | null
          status?: string
          submitted_via?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          client_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          feedback_code?: string
          feedback_type?: string
          id?: string
          linked_complaint_id?: string | null
          message?: string
          photos?: Json | null
          site_id?: string | null
          status?: string
          submitted_via?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "customer_feedback_linked_complaint_id_fkey"
            columns: ["linked_complaint_id"]
            isOneToOne: false
            referencedRelation: "complaint_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_sessions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          client_id: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          session_code: string
          tenant_id: string
          token_hash: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          session_code: string
          tenant_id: string
          token_hash: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          session_code?: string
          tenant_id?: string
          token_hash?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "customer_portal_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_codes: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          type: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          type: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_site_id: string | null
          assigned_to: string | null
          assigned_user_id: string | null
          brand: string | null
          condition: string | null
          created_at: string
          equipment_category: string | null
          equipment_code: string
          equipment_type: string | null
          id: string
          last_maintenance_date: string | null
          maintenance_interval_days: number | null
          maintenance_schedule: string | null
          maintenance_specs: string | null
          manufacturer: string | null
          model: string | null
          model_number: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          paired_with: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          site_id: string | null
          status: string | null
          tenant_id: string
          type: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_site_id?: string | null
          assigned_to?: string | null
          assigned_user_id?: string | null
          brand?: string | null
          condition?: string | null
          created_at?: string
          equipment_category?: string | null
          equipment_code: string
          equipment_type?: string | null
          id?: string
          last_maintenance_date?: string | null
          maintenance_interval_days?: number | null
          maintenance_schedule?: string | null
          maintenance_specs?: string | null
          manufacturer?: string | null
          model?: string | null
          model_number?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          paired_with?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_site_id?: string | null
          assigned_to?: string | null
          assigned_user_id?: string | null
          brand?: string | null
          condition?: string | null
          created_at?: string
          equipment_category?: string | null
          equipment_code?: string
          equipment_type?: string | null
          id?: string
          last_maintenance_date?: string | null
          maintenance_interval_days?: number | null
          maintenance_schedule?: string | null
          maintenance_specs?: string | null
          manufacturer?: string | null
          model?: string | null
          model_number?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          paired_with?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_site_id_fkey"
            columns: ["assigned_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_paired_with_fkey"
            columns: ["paired_with"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_date: string
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          returned_date: string | null
          site_id: string | null
          staff_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_date?: string
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          returned_date?: string | null
          site_id?: string | null
          staff_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_date?: string
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          returned_date?: string | null
          site_id?: string | null
          staff_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_id_map: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          entity_type: string
          external_entity_id: string
          id: string
          integration_connection_id: string
          internal_entity_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_type: string
          external_entity_id: string
          id?: string
          integration_connection_id: string
          internal_entity_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_type?: string
          external_entity_id?: string
          id?: string
          integration_connection_id?: string
          internal_entity_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_id_map_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_id_map_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string
          id: string
          photos: Json | null
          priority: string
          report_code: string
          report_type: string
          reported_by: string
          requested_date: string | null
          requested_items: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          site_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description: string
          id?: string
          photos?: Json | null
          priority?: string
          report_code: string
          report_type: string
          reported_by: string
          requested_date?: string | null
          requested_items?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string
          id?: string
          photos?: Json | null
          priority?: string
          report_code?: string
          report_type?: string
          reported_by?: string
          requested_date?: string | null
          requested_items?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      file_links: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          file_id: string
          id: string
          label: string | null
          linked_at: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          file_id: string
          id?: string
          label?: string | null
          linked_at?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_id?: string
          id?: string
          label?: string | null
          linked_at?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bucket: string
          byte_size: number | null
          content_type: string | null
          created_at: string
          entity_id: string
          entity_type: string
          file_code: string
          file_name: string | null
          id: string
          is_private: boolean | null
          mime_type: string
          original_filename: string
          size_bytes: number
          storage_key: string | null
          storage_path: string
          storage_provider: string | null
          tenant_id: string
          updated_at: string
          uploaded_at: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bucket: string
          byte_size?: number | null
          content_type?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          file_code: string
          file_name?: string | null
          id?: string
          is_private?: boolean | null
          mime_type?: string
          original_filename: string
          size_bytes?: number
          storage_key?: string | null
          storage_path: string
          storage_provider?: string | null
          tenant_id: string
          updated_at?: string
          uploaded_at?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bucket?: string
          byte_size?: number | null
          content_type?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_code?: string
          file_name?: string | null
          id?: string
          is_private?: boolean | null
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          storage_key?: string | null
          storage_path?: string
          storage_provider?: string | null
          tenant_id?: string
          updated_at?: string
          uploaded_at?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          center_lat: number
          center_lng: number
          center_long: number | null
          created_at: string
          id: string
          is_active: boolean
          radius_meters: number
          site_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          center_lat: number
          center_lng: number
          center_long?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          radius_meters?: number
          site_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          center_lat?: number
          center_lng?: number
          center_long?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          radius_meters?: number
          site_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_calendar: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          holiday_date: string
          holiday_name: string
          holiday_scope: string
          id: string
          is_active: boolean
          notes: string | null
          observed_date: string | null
          pay_multiplier: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          holiday_date: string
          holiday_name: string
          holiday_scope?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          observed_date?: string | null
          pay_multiplier?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          holiday_date?: string
          holiday_name?: string
          holiday_scope?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          observed_date?: string | null
          pay_multiplier?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_calendar_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_badges: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          badge_code: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          badge_code?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          badge_code?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_goals: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          notes: string | null
          progress_pct: number
          staff_id: string
          status: string
          target_date: string | null
          tenant_id: string
          title: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number
          staff_id: string
          status?: string
          target_date?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          progress_pct?: number
          staff_id?: string
          status?: string
          target_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_reviews: {
        Row: {
          acknowledged_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          development_areas: string | null
          id: string
          notes: string | null
          overall_score: number | null
          review_period_end: string | null
          review_period_start: string | null
          reviewed_at: string | null
          reviewer_staff_id: string | null
          staff_id: string
          status: string
          strengths: string | null
          summary: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          acknowledged_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          development_areas?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewed_at?: string | null
          reviewer_staff_id?: string | null
          staff_id: string
          status?: string
          strengths?: string | null
          summary?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          acknowledged_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          development_areas?: string | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          review_period_end?: string | null
          review_period_start?: string | null
          reviewed_at?: string | null
          reviewer_staff_id?: string | null
          staff_id?: string
          status?: string
          strengths?: string | null
          summary?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_reviews_reviewer_staff_id_fkey"
            columns: ["reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_pto_requests: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          end_date: string
          hours_requested: number
          id: string
          notes: string | null
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          end_date: string
          hours_requested?: number
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          end_date?: string
          hours_requested?: number
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_pto_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_pto_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_staff_badges: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          awarded_at: string
          awarded_by_user_id: string | null
          badge_id: string
          created_at: string
          id: string
          notes: string | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          awarded_at?: string
          awarded_by_user_id?: string | null
          badge_id: string
          created_at?: string
          id?: string
          notes?: string | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          awarded_at?: string
          awarded_by_user_id?: string | null
          badge_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_staff_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "hr_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_staff_badges_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_staff_badges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_staff_documents: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          document_type: string
          expires_on: string | null
          file_id: string
          id: string
          notes: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          document_type: string
          expires_on?: string | null
          file_id: string
          id?: string
          notes?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          document_type?: string
          expires_on?: string | null
          file_id?: string
          id?: string
          notes?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_staff_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_staff_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_staff_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_issues: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string
          followup_ticket_id: string | null
          id: string
          inspection_id: string
          inspection_item_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description: string
          followup_ticket_id?: string | null
          id?: string
          inspection_id: string
          inspection_item_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string
          followup_ticket_id?: string | null
          id?: string
          inspection_id?: string
          inspection_item_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_issues_followup_ticket_id_fkey"
            columns: ["followup_ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_issues_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_issues_inspection_item_id_fkey"
            columns: ["inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          inspection_id: string
          label: string
          notes: string | null
          photo_taken: boolean
          photos: Json | null
          requires_photo: boolean
          result: string | null
          score: number | null
          score_value: number | null
          section: string | null
          site_area_id: string | null
          sort_order: number
          template_item_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inspection_id: string
          label: string
          notes?: string | null
          photo_taken?: boolean
          photos?: Json | null
          requires_photo?: boolean
          result?: string | null
          score?: number | null
          score_value?: number | null
          section?: string | null
          site_area_id?: string | null
          sort_order?: number
          template_item_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inspection_id?: string
          label?: string
          notes?: string | null
          photo_taken?: boolean
          photos?: Json | null
          requires_photo?: boolean
          result?: string | null
          score?: number | null
          score_value?: number | null
          section?: string | null
          site_area_id?: string | null
          sort_order?: number
          template_item_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_site_area_id_fkey"
            columns: ["site_area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          area_type: string | null
          created_at: string
          id: string
          is_required: boolean | null
          item_description: string | null
          item_name: string | null
          label: string
          requires_photo: boolean
          section: string | null
          sort_order: number
          template_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
          weight: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          item_description?: string | null
          item_name?: string | null
          label: string
          requires_photo?: boolean
          section?: string | null
          sort_order?: number
          template_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          weight?: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type?: string | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          item_description?: string | null
          item_name?: string | null
          label?: string
          requires_photo?: boolean
          section?: string | null
          sort_order?: number
          template_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          pass_threshold: number
          requires_photos: boolean | null
          requires_signature: boolean | null
          scoring_model: string | null
          scoring_scale: number
          service_id: string | null
          template_code: string
          template_name: string | null
          tenant_id: string
          updated_at: string
          version: number | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          pass_threshold?: number
          requires_photos?: boolean | null
          requires_signature?: boolean | null
          scoring_model?: string | null
          scoring_scale?: number
          service_id?: string | null
          template_code: string
          template_name?: string | null
          tenant_id: string
          updated_at?: string
          version?: number | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pass_threshold?: number
          requires_photos?: boolean | null
          requires_signature?: boolean | null
          scoring_model?: string | null
          scoring_scale?: number
          service_id?: string | null
          template_code?: string
          template_name?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          area_scores: Json | null
          client_version: number
          closed_at: string | null
          comments: string | null
          completed_at: string | null
          created_at: string
          date: string | null
          follow_up_tasks: string[] | null
          id: string
          inspection_code: string
          inspection_date: string | null
          inspector_id: string | null
          max_score: number | null
          notes: string | null
          passed: boolean | null
          photos: Json | null
          rating: string | null
          result: string | null
          score: number | null
          score_pct: number | null
          signature_url: string | null
          site_id: string | null
          started_at: string | null
          status: string
          submitted_at: string | null
          summary_notes: string | null
          template_id: string | null
          tenant_id: string
          ticket_id: string | null
          total_score: number | null
          type: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_scores?: Json | null
          client_version?: number
          closed_at?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          date?: string | null
          follow_up_tasks?: string[] | null
          id?: string
          inspection_code: string
          inspection_date?: string | null
          inspector_id?: string | null
          max_score?: number | null
          notes?: string | null
          passed?: boolean | null
          photos?: Json | null
          rating?: string | null
          result?: string | null
          score?: number | null
          score_pct?: number | null
          signature_url?: string | null
          site_id?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          summary_notes?: string | null
          template_id?: string | null
          tenant_id: string
          ticket_id?: string | null
          total_score?: number | null
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_scores?: Json | null
          client_version?: number
          closed_at?: string | null
          comments?: string | null
          completed_at?: string | null
          created_at?: string
          date?: string | null
          follow_up_tasks?: string[] | null
          id?: string
          inspection_code?: string
          inspection_date?: string | null
          inspector_id?: string | null
          max_score?: number | null
          notes?: string | null
          passed?: boolean | null
          photos?: Json | null
          rating?: string | null
          result?: string | null
          score?: number | null
          score_pct?: number | null
          signature_url?: string | null
          site_id?: string | null
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          summary_notes?: string | null
          template_id?: string | null
          tenant_id?: string
          ticket_id?: string | null
          total_score?: number | null
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          api_key_encrypted: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          integration_type: string
          last_sync_at: string | null
          oauth_json: Json | null
          provider_name: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          api_key_encrypted?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          integration_type: string
          last_sync_at?: string | null
          oauth_json?: Json | null
          provider_name: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          api_key_encrypted?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          integration_type?: string
          last_sync_at?: string | null
          oauth_json?: Json | null
          provider_name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          details_json: Json | null
          id: string
          integration_connection_id: string
          started_at: string
          status: string
          summary: string | null
          sync_direction: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          details_json?: Json | null
          id?: string
          integration_connection_id: string
          started_at?: string
          status: string
          summary?: string | null
          sync_direction: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          details_json?: Json | null
          id?: string
          integration_connection_id?: string
          started_at?: string
          status?: string
          summary?: string | null
          sync_direction?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_details: {
        Row: {
          actual_qty: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          count_id: string
          created_at: string
          expected_qty: number | null
          id: string
          notes: string | null
          photo_urls: string[]
          supply_id: string
          tenant_id: string
          updated_at: string
          variance: number | null
          version_etag: string
        }
        Insert: {
          actual_qty?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          count_id: string
          created_at?: string
          expected_qty?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[]
          supply_id: string
          tenant_id: string
          updated_at?: string
          variance?: number | null
          version_etag?: string
        }
        Update: {
          actual_qty?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          count_id?: string
          created_at?: string
          expected_qty?: number | null
          id?: string
          notes?: string | null
          photo_urls?: string[]
          supply_id?: string
          tenant_id?: string
          updated_at?: string
          variance?: number | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_details_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_details_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          count_code: string
          count_date: string
          counted_by: string | null
          counted_by_name: string | null
          created_at: string
          id: string
          notes: string | null
          public_token: string | null
          site_id: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          count_code: string
          count_date?: string
          counted_by?: string | null
          counted_by_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          public_token?: string | null
          site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          count_code?: string
          count_date?: string
          counted_by?: string | null
          counted_by_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          public_token?: string | null
          site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_forms: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          form_code: string
          form_type: string
          id: string
          is_active: boolean
          name: string
          schema_data: Json
          tenant_id: string
          updated_at: string
          version: number
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_code: string
          form_type?: string
          id?: string
          is_active?: boolean
          name: string
          schema_data?: Json
          tenant_id: string
          updated_at?: string
          version?: number
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          form_code?: string
          form_type?: string
          id?: string
          is_active?: boolean
          name?: string
          schema_data?: Json
          tenant_id?: string
          updated_at?: string
          version?: number
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          address_note: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          site_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          address_note?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type: string
          name: string
          site_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          address_note?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          site_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_jobs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          invoice_id: string
          is_consolidated: boolean
          site_job_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          is_consolidated?: boolean
          site_job_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          is_consolidated?: boolean
          site_job_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_jobs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_jobs_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          line_type: string
          quantity: number
          sort_order: number
          tenant_id: string
          unit_price: number
          uom: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          line_type: string
          quantity?: number
          sort_order?: number
          tenant_id: string
          unit_price?: number
          uom: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          line_type?: string
          quantity?: number
          sort_order?: number
          tenant_id?: string
          unit_price?: number
          uom?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          balance_due: number
          client_id: string
          contract_id: string | null
          created_at: string
          discount_amount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          terms: string
          total: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          balance_due?: number
          client_id: string
          contract_id?: string | null
          created_at?: string
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date: string
          notes?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id: string
          terms: string
          total?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          balance_due?: number
          client_id?: string
          contract_id?: string | null
          created_at?: string
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          terms?: string
          total?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_comments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          author_user_id: string | null
          client_visible: boolean
          comment_body: string
          created_at: string
          id: string
          issue_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          author_user_id?: string | null
          client_visible?: boolean
          comment_body: string
          created_at?: string
          id?: string
          issue_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          author_user_id?: string | null
          client_visible?: boolean
          comment_body?: string
          created_at?: string
          id?: string
          issue_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_work_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          issue_id: string
          logged_at: string
          minutes_spent: number
          notes: string | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          issue_id: string
          logged_at?: string
          minutes_spent: number
          notes?: string | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          issue_id?: string
          logged_at?: string
          minutes_spent?: number
          notes?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_work_logs_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_work_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_work_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to_staff_id: string | null
          attachments: Json | null
          client_id: string | null
          client_visible: boolean
          created_at: string
          description: string
          due_at: string | null
          id: string
          inspection_id: string | null
          issue_type: string
          priority: string
          reported_at: string
          reported_by_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          site_id: string
          site_job_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to_staff_id?: string | null
          attachments?: Json | null
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          description: string
          due_at?: string | null
          id?: string
          inspection_id?: string | null
          issue_type: string
          priority?: string
          reported_at?: string
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          site_id: string
          site_job_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to_staff_id?: string | null
          attachments?: Json | null
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          inspection_id?: string | null
          issue_type?: string
          priority?: string
          reported_at?: string
          reported_by_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          site_id?: string
          site_job_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assigned_to_staff_id_fkey"
            columns: ["assigned_to_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "issues_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          billable_price: number | null
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          is_hazardous: boolean
          item_category: string
          item_name: string
          name: string | null
          notes: string | null
          reorder_point: number | null
          reorder_qty: number | null
          reorder_quantity: number | null
          sds_url: string | null
          sku: string | null
          supply_catalog_id: string | null
          tenant_id: string
          unit: string | null
          unit_cost: number | null
          unit_price: number | null
          uom: string
          updated_at: string
          vendor_id: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billable_price?: number | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_hazardous?: boolean
          item_category: string
          item_name: string
          name?: string | null
          notes?: string | null
          reorder_point?: number | null
          reorder_qty?: number | null
          reorder_quantity?: number | null
          sds_url?: string | null
          sku?: string | null
          supply_catalog_id?: string | null
          tenant_id: string
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          uom: string
          updated_at?: string
          vendor_id?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billable_price?: number | null
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_hazardous?: boolean
          item_category?: string
          item_name?: string
          name?: string | null
          notes?: string | null
          reorder_point?: number | null
          reorder_qty?: number | null
          reorder_quantity?: number | null
          sds_url?: string | null
          sku?: string | null
          supply_catalog_id?: string | null
          tenant_id?: string
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          uom?: string
          updated_at?: string
          vendor_id?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_supply_catalog_id_fkey"
            columns: ["supply_catalog_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          closed_at: string | null
          corrective_action: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          job_id: string | null
          log_date: string
          message: string | null
          notes: string | null
          photos_link: string | null
          severity: string
          site_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          job_id?: string | null
          log_date?: string
          message?: string | null
          notes?: string | null
          photos_link?: string | null
          severity?: string
          site_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          corrective_action?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          job_id?: string | null
          log_date?: string
          message?: string | null
          notes?: string | null
          photos_link?: string | null
          severity?: string
          site_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_schedule_rules: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          days_of_week: number[]
          effective_from: string
          effective_until: string | null
          end_time: string | null
          id: string
          is_active: boolean
          month_day: number | null
          notes: string | null
          recurrence_rule_id: string | null
          rule_type: string
          site_job_id: string
          start_time: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
          week_interval: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          days_of_week?: number[]
          effective_from: string
          effective_until?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          month_day?: number | null
          notes?: string | null
          recurrence_rule_id?: string | null
          rule_type?: string
          site_job_id: string
          start_time?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
          week_interval?: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          days_of_week?: number[]
          effective_from?: string
          effective_until?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          month_day?: number | null
          notes?: string | null
          recurrence_rule_id?: string | null
          rule_type?: string
          site_job_id?: string
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          week_interval?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_schedule_rules_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_schedule_rules_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_schedule_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_staff_assignments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_at: string | null
          assignment_status: string | null
          created_at: string
          end_date: string | null
          id: string
          job_id: string
          notes: string | null
          role: string | null
          sort_order: number | null
          staff_id: string
          start_date: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          assignment_status?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          role?: string | null
          sort_order?: number | null
          staff_id: string
          start_date?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          assignment_status?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          role?: string | null
          sort_order?: number | null
          staff_id?: string
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_staff_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_staff_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_events: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          changed_at: string
          changed_by_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          site_job_id: string
          tenant_id: string
          to_status: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          changed_at?: string
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          site_job_id: string
          tenant_id: string
          to_status: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          changed_at?: string
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          site_job_id?: string
          tenant_id?: string
          to_status?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_events_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          completed_by_staff_id: string | null
          completion_notes: string | null
          completion_photos: Json | null
          completion_status: string | null
          created_at: string
          custom_minutes: number | null
          estimated_minutes: number | null
          frequency_instance: string | null
          id: string
          is_required: boolean
          job_id: string
          notes: string | null
          planned_minutes: number | null
          planned_units: number | null
          qc_weight: number | null
          sequence_order: number
          site_area_id: string | null
          status: string | null
          task_code: string | null
          task_id: string | null
          task_name: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
          wait_after: boolean
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by_staff_id?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          completion_status?: string | null
          created_at?: string
          custom_minutes?: number | null
          estimated_minutes?: number | null
          frequency_instance?: string | null
          id?: string
          is_required?: boolean
          job_id: string
          notes?: string | null
          planned_minutes?: number | null
          planned_units?: number | null
          qc_weight?: number | null
          sequence_order?: number
          site_area_id?: string | null
          status?: string | null
          task_code?: string | null
          task_id?: string | null
          task_name?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
          wait_after?: boolean
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by_staff_id?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          completion_status?: string | null
          created_at?: string
          custom_minutes?: number | null
          estimated_minutes?: number | null
          frequency_instance?: string | null
          id?: string
          is_required?: boolean
          job_id?: string
          notes?: string | null
          planned_minutes?: number | null
          planned_units?: number | null
          qc_weight?: number | null
          sequence_order?: number
          site_area_id?: string | null
          status?: string | null
          task_code?: string | null
          task_id?: string | null
          task_name?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          wait_after?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_tasks_completed_by_staff_id_fkey"
            columns: ["completed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_site_area_id_fkey"
            columns: ["site_area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_visits: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          site_job_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
          visit_type: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          site_job_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          visit_type: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          site_job_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_visits_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      key_event_log: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          event_date: string
          event_type: string
          id: string
          key_id: string
          notes: string | null
          quantity: number
          staff_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_date?: string
          event_type: string
          id?: string
          key_id: string
          notes?: string | null
          quantity?: number
          staff_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          key_id?: string
          notes?: string | null
          quantity?: number
          staff_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_event_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "key_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_event_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_event_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      key_inventory: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          copy_number: number | null
          created_at: string
          id: string
          is_original: boolean | null
          key_code: string
          key_type: string
          label: string
          notes: string | null
          photo_thumbnail_url: string | null
          photo_url: string | null
          site_id: string | null
          status: string
          tenant_id: string
          total_count: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          copy_number?: number | null
          created_at?: string
          id?: string
          is_original?: boolean | null
          key_code: string
          key_type?: string
          label: string
          notes?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          site_id?: string | null
          status?: string
          tenant_id: string
          total_count?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          copy_number?: number | null
          created_at?: string
          id?: string
          is_original?: boolean | null
          key_code?: string
          key_type?: string
          label?: string
          notes?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          total_count?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_inventory_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_inventory_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_access: {
        Row: {
          access_type: string
          access_value: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          instructions: string | null
          is_sensitive: boolean
          site_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          access_type: string
          access_value?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          instructions?: string | null
          is_sensitive?: boolean
          site_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          access_type?: string
          access_value?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          instructions?: string | null
          is_sensitive?: boolean
          site_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_contacts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          location_role: string
          site_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          location_role: string
          site_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          location_role?: string
          site_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lookups: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lookups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_thread_members: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          tenant_id: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          tenant_id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          id: string
          subject: string
          tenant_id: string
          thread_type: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          subject: string
          tenant_id: string
          thread_type?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          subject?: string
          tenant_id?: string
          thread_type?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          archived_at: string | null
          attachments_json: Json | null
          body: string
          channel: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_system_message: boolean | null
          sender_id: string
          sent_at: string | null
          tenant_id: string
          thread_id: string
        }
        Insert: {
          archived_at?: string | null
          attachments_json?: Json | null
          body: string
          channel?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_system_message?: boolean | null
          sender_id: string
          sent_at?: string | null
          tenant_id: string
          thread_id: string
        }
        Update: {
          archived_at?: string | null
          attachments_json?: Json | null
          body?: string
          channel?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_system_message?: boolean | null
          sender_id?: string
          sent_at?: string | null
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      microfiber_wash_log: {
        Row: {
          amount_due: number
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          exported: boolean
          id: string
          payroll_period_end: string | null
          payroll_period_start: string | null
          sets_washed: number
          site_id: string
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
          wash_code: string
          wash_date: string
        }
        Insert: {
          amount_due: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          exported?: boolean
          id?: string
          payroll_period_end?: string | null
          payroll_period_start?: string | null
          sets_washed?: number
          site_id: string
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          wash_code: string
          wash_date: string
        }
        Update: {
          amount_due?: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          exported?: boolean
          id?: string
          payroll_period_end?: string | null
          payroll_period_start?: string | null
          sets_washed?: number
          site_id?: string
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          wash_code?: string
          wash_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "microfiber_wash_log_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microfiber_wash_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microfiber_wash_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_tags: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          installed_location_note: string | null
          is_active: boolean
          site_area_id: string | null
          site_id: string
          tag_code: string
          tag_purpose: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          installed_location_note?: string | null
          is_active?: boolean
          site_area_id?: string | null
          site_id: string
          tag_code: string
          tag_purpose: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          installed_location_note?: string | null
          is_active?: boolean
          site_area_id?: string | null
          site_id?: string
          tag_code?: string
          tag_purpose?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_tags_site_area_id_fkey"
            columns: ["site_area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_tags_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          default_channel: string
          id: string
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_channel?: string
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_channel?: string
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          notification_type: string | null
          payload_json: Json | null
          read_at: string | null
          role_filter: string | null
          send_at: string | null
          sent: boolean | null
          tenant_id: string
          title: string
          trigger_data: Json | null
          trigger_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          notification_type?: string | null
          payload_json?: Json | null
          read_at?: string | null
          role_filter?: string | null
          send_at?: string | null
          sent?: boolean | null
          tenant_id: string
          title: string
          trigger_data?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          notification_type?: string | null
          payload_json?: Json | null
          read_at?: string | null
          role_filter?: string | null
          send_at?: string | null
          sent?: boolean | null
          tenant_id?: string
          title?: string
          trigger_data?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_pool: {
        Row: {
          acknowledged_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_at: string | null
          assigned_callout_event_id: string | null
          created_at: string
          declined_at: string | null
          effective_date: string
          eligibility_note: string | null
          end_time: string
          id: string
          notes: string | null
          staff_id: string
          standby_fee: number
          start_time: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          acknowledged_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          assigned_callout_event_id?: string | null
          created_at?: string
          declined_at?: string | null
          effective_date: string
          eligibility_note?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          staff_id: string
          standby_fee?: number
          start_time?: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          acknowledged_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string | null
          assigned_callout_event_id?: string | null
          created_at?: string
          declined_at?: string | null
          effective_date?: string
          eligibility_note?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          staff_id?: string
          standby_fee?: number
          start_time?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_call_pool_assigned_callout_event_id_fkey"
            columns: ["assigned_callout_event_id"]
            isOneToOne: false
            referencedRelation: "callout_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_pool_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_pool_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          default_invoice_delivery: string
          default_invoice_terms: string
          default_language: string
          default_pay_period: string
          default_quote_valid_days: number
          default_tax_rate: number | null
          enable_staging_mode: boolean
          id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_invoice_delivery?: string
          default_invoice_terms?: string
          default_language?: string
          default_pay_period?: string
          default_quote_valid_days?: number
          default_tax_rate?: number | null
          enable_staging_mode?: boolean
          id?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_invoice_delivery?: string
          default_invoice_terms?: string
          default_language?: string
          default_pay_period?: string
          default_quote_valid_days?: number
          default_tax_rate?: number | null
          enable_staging_mode?: boolean
          id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_periods: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          pay_date: string
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          pay_date: string
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          pay_date?: string
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_rate_history: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          change_reason: string | null
          changed_by: string | null
          created_at: string
          effective_date: string
          id: string
          new_pay_type: string | null
          new_rate: number
          previous_pay_type: string | null
          previous_rate: number | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_date: string
          id?: string
          new_pay_type?: string | null
          new_rate: number
          previous_pay_type?: string | null
          previous_rate?: number | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          new_pay_type?: string | null
          new_rate?: number
          previous_pay_type?: string | null
          previous_rate?: number | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_rate_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_rate_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          processed_by_user_id: string | null
          status: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          amount: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date: string
          payment_method: string
          processed_by_user_id?: string | null
          status?: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          amount?: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          processed_by_user_id?: string | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_export_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_valid: boolean
          line_number: number
          payload: Json
          run_id: string
          staff_id: string | null
          tenant_id: string
          updated_at: string
          validation_errors: Json | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_valid?: boolean
          line_number: number
          payload: Json
          run_id: string
          staff_id?: string | null
          tenant_id: string
          updated_at?: string
          validation_errors?: Json | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_valid?: boolean
          line_number?: number
          payload?: Json
          run_id?: string
          staff_id?: string | null
          tenant_id?: string
          updated_at?: string
          validation_errors?: Json | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_export_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_export_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_export_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_export_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_export_mapping_fields: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_enabled: boolean
          is_required: boolean
          mapping_id: string
          output_column_name: string
          sort_order: number
          source_field: string | null
          static_value: string | null
          tenant_id: string
          transform_config: Json | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          mapping_id: string
          output_column_name: string
          sort_order: number
          source_field?: string | null
          static_value?: string | null
          tenant_id: string
          transform_config?: Json | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          mapping_id?: string
          output_column_name?: string
          sort_order?: number
          source_field?: string | null
          static_value?: string | null
          tenant_id?: string
          transform_config?: Json | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_export_mapping_fields_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "payroll_export_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_export_mapping_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_export_mappings: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date_format: string
          decimal_separator: string
          delimiter: string
          id: string
          include_header: boolean
          is_active: boolean
          is_default: boolean
          notes: string | null
          provider_code: string | null
          quote_all: boolean
          template_name: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_format?: string
          decimal_separator?: string
          delimiter?: string
          id?: string
          include_header?: boolean
          is_active?: boolean
          is_default?: boolean
          notes?: string | null
          provider_code?: string | null
          quote_all?: boolean
          template_name: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_format?: string
          decimal_separator?: string
          delimiter?: string
          id?: string
          include_header?: boolean
          is_active?: boolean
          is_default?: boolean
          notes?: string | null
          provider_code?: string | null
          quote_all?: boolean
          template_name?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_export_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_export_runs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          exported_at: string | null
          exported_by_user_id: string | null
          exported_file_checksum: string | null
          exported_file_path: string | null
          id: string
          invalid_rows: number
          mapping_id: string
          metadata: Json | null
          period_end: string
          period_start: string
          status: string
          tenant_id: string
          total_rows: number
          updated_at: string
          valid_rows: number
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          exported_at?: string | null
          exported_by_user_id?: string | null
          exported_file_checksum?: string | null
          exported_file_path?: string | null
          id?: string
          invalid_rows?: number
          mapping_id: string
          metadata?: Json | null
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
          total_rows?: number
          updated_at?: string
          valid_rows?: number
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          exported_at?: string | null
          exported_by_user_id?: string | null
          exported_file_checksum?: string | null
          exported_file_path?: string | null
          id?: string
          invalid_rows?: number
          mapping_id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
          total_rows?: number
          updated_at?: string
          valid_rows?: number
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_export_runs_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "payroll_export_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_export_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_line_items: {
        Row: {
          amount: number
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          earning_code_id: string
          hours: number | null
          id: string
          notes: string | null
          payroll_run_id: string
          rate: number | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          amount: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          earning_code_id: string
          hours?: number | null
          id?: string
          notes?: string | null
          payroll_run_id: string
          rate?: number | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          amount?: number
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          earning_code_id?: string
          hours?: number | null
          id?: string
          notes?: string | null
          payroll_run_id?: string
          rate?: number | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_earning_code_id_fkey"
            columns: ["earning_code_id"]
            isOneToOne: false
            referencedRelation: "earning_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          pay_period_id: string
          run_type: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          pay_period_id: string
          run_type: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          pay_period_id?: string
          run_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          auto_add_to_route: boolean
          created_at: string
          custom_interval_days: number | null
          description_key: string | null
          description_override: string | null
          evidence_required: boolean
          frequency: string
          id: string
          last_completed_at: string | null
          last_completed_route_id: string | null
          next_due_date: string
          notes: string | null
          periodic_code: string
          preferred_staff_id: string | null
          site_job_id: string
          status: string
          task_type: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_add_to_route?: boolean
          created_at?: string
          custom_interval_days?: number | null
          description_key?: string | null
          description_override?: string | null
          evidence_required?: boolean
          frequency: string
          id?: string
          last_completed_at?: string | null
          last_completed_route_id?: string | null
          next_due_date: string
          notes?: string | null
          periodic_code: string
          preferred_staff_id?: string | null
          site_job_id: string
          status?: string
          task_type: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          auto_add_to_route?: boolean
          created_at?: string
          custom_interval_days?: number | null
          description_key?: string | null
          description_override?: string | null
          evidence_required?: boolean
          frequency?: string
          id?: string
          last_completed_at?: string | null
          last_completed_route_id?: string | null
          next_due_date?: string
          notes?: string | null
          periodic_code?: string
          preferred_staff_id?: string | null
          site_job_id?: string
          status?: string
          task_type?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodic_tasks_last_completed_route_id_fkey"
            columns: ["last_completed_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_tasks_last_completed_route_id_fkey"
            columns: ["last_completed_route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "periodic_tasks_last_completed_route_id_fkey"
            columns: ["last_completed_route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "periodic_tasks_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_tasks_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          id: string
          module: string
          permission_code: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module: string
          permission_code: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          permission_code?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: []
      }
      processed_form_responses: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          form_id: string
          id: string
          processed_at: string | null
          processed_by: string | null
          processing_notes: string | null
          response_code: string
          response_data: Json
          site_id: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          form_id: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          response_code: string
          response_data?: Json
          site_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          form_id?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          response_code?: string
          response_data?: Json
          site_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "inventory_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_form_responses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_form_responses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_form_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_approval_actions: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          notes: string | null
          step_id: string | null
          tenant_id: string
          workflow_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_id?: string | null
          tenant_id: string
          workflow_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          step_id?: string | null
          tenant_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_approval_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "procurement_approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approval_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approval_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "procurement_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_approval_steps: {
        Row: {
          acted_at: string | null
          acted_by_user_id: string | null
          approver_role: string
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          step_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
          workflow_id: string
        }
        Insert: {
          acted_at?: string | null
          acted_by_user_id?: string | null
          approver_role: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          step_order: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
          workflow_id: string
        }
        Update: {
          acted_at?: string | null
          acted_by_user_id?: string | null
          approver_role?: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          step_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_approval_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "procurement_approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_approval_workflows: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by_user_id: string | null
          current_step: number
          decided_at: string | null
          decision_notes: string | null
          entity_id: string
          entity_type: string
          id: string
          status: string
          submitted_at: string
          tenant_id: string
          total_steps: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          current_step?: number
          decided_at?: string | null
          decision_notes?: string | null
          entity_id: string
          entity_type: string
          id?: string
          status?: string
          submitted_at?: string
          tenant_id: string
          total_steps?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          current_step?: number
          decided_at?: string | null
          decision_notes?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          status?: string
          submitted_at?: string
          tenant_id?: string
          total_steps?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_approval_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          item_id: string
          line_total: number
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          tenant_id: string
          unit_cost: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          line_total: number
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          tenant_id: string
          unit_cost: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          line_total?: number
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          tenant_id?: string
          unit_cost?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          notes: string | null
          po_date: string
          po_number: string
          ship_to_inventory_location_id: string
          status: string
          submitted_for_approval_at: string | null
          subtotal: number
          tax: number | null
          tenant_id: string
          total: number
          updated_at: string
          vendor_id: string
          version_etag: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          po_date: string
          po_number: string
          ship_to_inventory_location_id: string
          status?: string
          submitted_for_approval_at?: string | null
          subtotal?: number
          tax?: number | null
          tenant_id: string
          total?: number
          updated_at?: string
          vendor_id: string
          version_etag?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          po_date?: string
          po_number?: string
          ship_to_inventory_location_id?: string
          status?: string
          submitted_for_approval_at?: string | null
          subtotal?: number
          tax?: number | null
          tenant_id?: string
          total?: number
          updated_at?: string
          vendor_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_ship_to_inventory_location_id_fkey"
            columns: ["ship_to_inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_line_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string
          id: string
          is_optional_addon: boolean
          line_total: number
          line_type: string
          proposal_id: string
          quantity: number
          sort_order: number
          tenant_id: string
          unit_price: number
          uom: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description: string
          id?: string
          is_optional_addon?: boolean
          line_total?: number
          line_type: string
          proposal_id: string
          quantity?: number
          sort_order?: number
          tenant_id: string
          unit_price?: number
          uom: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string
          id?: string
          is_optional_addon?: boolean
          line_total?: number
          line_type?: string
          proposal_id?: string
          quantity?: number
          sort_order?: number
          tenant_id?: string
          unit_price?: number
          uom?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_workload_inputs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          estimated_minutes_total: number | null
          id: string
          minutes_per_unit: number | null
          notes: string | null
          proposal_id: string
          site_area_id: string | null
          site_id: string
          task_id: string
          tenant_id: string
          unit_type: string
          units: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          estimated_minutes_total?: number | null
          id?: string
          minutes_per_unit?: number | null
          notes?: string | null
          proposal_id: string
          site_area_id?: string | null
          site_id: string
          task_id: string
          tenant_id: string
          unit_type: string
          units?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          estimated_minutes_total?: number | null
          id?: string
          minutes_per_unit?: number | null
          notes?: string | null
          proposal_id?: string
          site_area_id?: string | null
          site_id?: string
          task_id?: string
          tenant_id?: string
          unit_type?: string
          units?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_workload_inputs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_workload_inputs_site_area_id_fkey"
            columns: ["site_area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_workload_inputs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_workload_inputs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_workload_inputs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_properties: {
        Row: {
          address: Json | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          current_value: number | null
          id: string
          notes: string | null
          property_type: string
          purchase_date: string | null
          purchase_price: number | null
          rental_units: Json | null
          tenant_id: string
          type: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          notes?: string | null
          property_type: string
          purchase_date?: string | null
          purchase_price?: number | null
          rental_units?: Json | null
          tenant_id: string
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          notes?: string | null
          property_type?: string
          purchase_date?: string | null
          purchase_price?: number | null
          rental_units?: Json | null
          tenant_id?: string
          type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          days_of_week: number[]
          default_duration_minutes: number | null
          default_start_time: string | null
          effective_from: string | null
          effective_to: string | null
          end_date: string | null
          end_time: string | null
          exceptions: string[]
          id: string
          is_active: boolean | null
          recurrence_type: string | null
          rrule_text: string | null
          site_job_id: string
          start_date: string
          start_time: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          days_of_week?: number[]
          default_duration_minutes?: number | null
          default_start_time?: string | null
          effective_from?: string | null
          effective_to?: string | null
          end_date?: string | null
          end_time?: string | null
          exceptions?: string[]
          id?: string
          is_active?: boolean | null
          recurrence_type?: string | null
          rrule_text?: string | null
          site_job_id: string
          start_date: string
          start_time?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          days_of_week?: number[]
          default_duration_minutes?: number | null
          default_start_time?: string | null
          effective_from?: string | null
          effective_to?: string | null
          end_date?: string | null
          end_time?: string | null
          exceptions?: string[]
          id?: string
          is_active?: boolean | null
          recurrence_type?: string | null
          rrule_text?: string | null
          site_job_id?: string
          start_date?: string
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          access_level: string
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_enabled: boolean
          permission_id: string
          role_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          access_level?: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_id: string
          role_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          access_level?: string
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_id?: string
          role_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          role_kind: string
          role_name: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          role_kind?: string
          role_name: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          role_kind?: string
          role_name?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stop_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          delivery_items: Json | null
          description: string
          evidence_photos: Json | null
          evidence_required: boolean
          id: string
          is_completed: boolean
          is_from_template: boolean
          notes: string | null
          route_stop_id: string
          source_complaint_id: string | null
          task_order: number
          task_type: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          delivery_items?: Json | null
          description: string
          evidence_photos?: Json | null
          evidence_required?: boolean
          id?: string
          is_completed?: boolean
          is_from_template?: boolean
          notes?: string | null
          route_stop_id: string
          source_complaint_id?: string | null
          task_order?: number
          task_type: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          delivery_items?: Json | null
          description?: string
          evidence_photos?: Json | null
          evidence_required?: boolean
          id?: string
          is_completed?: boolean
          is_from_template?: boolean
          notes?: string | null
          route_stop_id?: string
          source_complaint_id?: string | null
          task_order?: number
          task_type?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_route_stop_tasks_source_complaint"
            columns: ["source_complaint_id"]
            isOneToOne: false
            referencedRelation: "complaint_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_tasks_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stop_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          access_window_end: string | null
          access_window_start: string | null
          actual_end_at: string | null
          actual_start_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          created_at: string
          departed_at: string | null
          estimated_travel_minutes: number | null
          id: string
          is_locked: boolean
          planned_end_at: string | null
          planned_start_at: string | null
          route_id: string
          site_id: string | null
          site_job_id: string
          skip_notes: string | null
          skip_reason: string | null
          status: string
          stop_order: number
          stop_status: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
          work_ticket_id: string | null
        }
        Insert: {
          access_window_end?: string | null
          access_window_start?: string | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          arrived_at?: string | null
          created_at?: string
          departed_at?: string | null
          estimated_travel_minutes?: number | null
          id?: string
          is_locked?: boolean
          planned_end_at?: string | null
          planned_start_at?: string | null
          route_id: string
          site_id?: string | null
          site_job_id: string
          skip_notes?: string | null
          skip_reason?: string | null
          status?: string
          stop_order: number
          stop_status?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
          work_ticket_id?: string | null
        }
        Update: {
          access_window_end?: string | null
          access_window_start?: string | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          arrived_at?: string | null
          created_at?: string
          departed_at?: string | null
          estimated_travel_minutes?: number | null
          id?: string
          is_locked?: boolean
          planned_end_at?: string | null
          planned_start_at?: string | null
          route_id?: string
          site_id?: string | null
          site_job_id?: string
          skip_notes?: string | null
          skip_reason?: string | null
          status?: string
          stop_order?: number
          stop_status?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          work_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "route_stops_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_work_ticket_id_fkey"
            columns: ["work_ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      route_template_stops: {
        Row: {
          access_window_end: string | null
          access_window_start: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          notes: string | null
          site_job_id: string
          stop_order: number
          template_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          access_window_end?: string | null
          access_window_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          site_job_id: string
          stop_order: number
          template_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          access_window_end?: string | null
          access_window_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          site_job_id?: string
          stop_order?: number
          template_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_template_stops_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_template_stops_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_template_stops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      route_template_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          delivery_items: Json | null
          description_key: string | null
          description_override: string | null
          evidence_required: boolean
          id: string
          task_order: number
          task_type: string
          template_stop_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          delivery_items?: Json | null
          description_key?: string | null
          description_override?: string | null
          evidence_required?: boolean
          id?: string
          task_order?: number
          task_type: string
          template_stop_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          delivery_items?: Json | null
          description_key?: string | null
          description_override?: string | null
          evidence_required?: boolean
          id?: string
          task_order?: number
          task_type?: string
          template_stop_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_template_tasks_template_stop_id_fkey"
            columns: ["template_stop_id"]
            isOneToOne: false
            referencedRelation: "route_template_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_template_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      route_templates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_staff_id: string | null
          created_at: string
          default_key_box: string | null
          default_vehicle_id: string | null
          id: string
          is_active: boolean
          label: string
          notes: string | null
          template_code: string
          tenant_id: string
          updated_at: string
          version_etag: string
          weekday: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          default_key_box?: string | null
          default_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          notes?: string | null
          template_code: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          weekday: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          default_key_box?: string | null
          default_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          notes?: string | null
          template_code?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          weekday?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_templates_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_templates_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date: string | null
          id: string
          key_box_number: string | null
          locked_at: string | null
          locked_by: string | null
          mileage_end: number | null
          mileage_start: number | null
          notes: string | null
          personal_items_removed: boolean | null
          planned_end: string | null
          planned_start: string | null
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          route_date: string
          route_order: number | null
          route_owner_staff_id: string | null
          route_type: string
          schedule_period_id: string | null
          shift_ended_at: string | null
          shift_review_status: string | null
          shift_started_at: string | null
          shift_summary: Json | null
          site_id: string | null
          status: string
          tasks: string[] | null
          template_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          vehicle_cleaned: boolean | null
          version_etag: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date?: string | null
          id?: string
          key_box_number?: string | null
          locked_at?: string | null
          locked_by?: string | null
          mileage_end?: number | null
          mileage_start?: number | null
          notes?: string | null
          personal_items_removed?: boolean | null
          planned_end?: string | null
          planned_start?: string | null
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          route_date: string
          route_order?: number | null
          route_owner_staff_id?: string | null
          route_type: string
          schedule_period_id?: string | null
          shift_ended_at?: string | null
          shift_review_status?: string | null
          shift_started_at?: string | null
          shift_summary?: Json | null
          site_id?: string | null
          status?: string
          tasks?: string[] | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          vehicle_cleaned?: boolean | null
          version_etag?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date?: string | null
          id?: string
          key_box_number?: string | null
          locked_at?: string | null
          locked_by?: string | null
          mileage_end?: number | null
          mileage_start?: number | null
          notes?: string | null
          personal_items_removed?: boolean | null
          planned_end?: string | null
          planned_start?: string | null
          published_at?: string | null
          published_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          route_date?: string
          route_order?: number | null
          route_owner_staff_id?: string | null
          route_type?: string
          schedule_period_id?: string | null
          shift_ended_at?: string | null
          shift_review_status?: string | null
          shift_started_at?: string | null
          shift_summary?: Json | null
          site_id?: string | null
          status?: string
          tasks?: string[] | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_cleaned?: boolean | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_route_owner_staff_id_fkey"
            columns: ["route_owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_schedule_period_id_fkey"
            columns: ["schedule_period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "route_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_documents: {
        Row: {
          applies_to_sites: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category: string | null
          created_at: string
          document_code: string
          document_type: string
          effective_date: string | null
          expiry_date: string | null
          file_id: string | null
          id: string
          notes: string | null
          review_date: string | null
          site_ids: string[] | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          applies_to_sites?: boolean
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          created_at?: string
          document_code: string
          document_type: string
          effective_date?: string | null
          expiry_date?: string | null
          file_id?: string | null
          id?: string
          notes?: string | null
          review_date?: string | null
          site_ids?: string[] | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          applies_to_sites?: boolean
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          created_at?: string
          document_code?: string
          document_type?: string
          effective_date?: string | null
          expiry_date?: string | null
          file_id?: string | null
          id?: string
          notes?: string | null
          review_date?: string | null
          site_ids?: string[] | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_area_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_area_id: string
          created_at: string
          custom_minutes: number | null
          frequency_code: string
          id: string
          task_code: string
          task_id: string
          tenant_id: string
          updated_at: string
          use_ai: boolean
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_area_id: string
          created_at?: string
          custom_minutes?: number | null
          frequency_code?: string
          id?: string
          task_code: string
          task_id: string
          tenant_id: string
          updated_at?: string
          use_ai?: boolean
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_area_id?: string
          created_at?: string
          custom_minutes?: number | null
          frequency_code?: string
          id?: string
          task_code?: string
          task_id?: string
          tenant_id?: string
          updated_at?: string
          use_ai?: boolean
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_area_tasks_bid_area_id_fkey"
            columns: ["bid_area_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_area_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_area_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_areas: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          area_type_code: string | null
          bid_version_id: string
          building_type_code: string | null
          created_at: string
          difficulty_code: string
          fixtures: Json | null
          floor_type_code: string | null
          id: string
          name: string
          quantity: number
          square_footage: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type_code?: string | null
          bid_version_id: string
          building_type_code?: string | null
          created_at?: string
          difficulty_code?: string
          fixtures?: Json | null
          floor_type_code?: string | null
          id?: string
          name: string
          quantity?: number
          square_footage: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type_code?: string | null
          bid_version_id?: string
          building_type_code?: string | null
          created_at?: string
          difficulty_code?: string
          fixtures?: Json | null
          floor_type_code?: string | null
          id?: string
          name?: string
          quantity?: number
          square_footage?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_areas_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_burden: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string
          employer_tax_pct: number
          id: string
          insurance_pct: number
          other_pct: number
          tenant_id: string
          updated_at: string
          version_etag: string
          workers_comp_pct: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string
          employer_tax_pct?: number
          id?: string
          insurance_pct?: number
          other_pct?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
          workers_comp_pct?: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string
          employer_tax_pct?: number
          id?: string
          insurance_pct?: number
          other_pct?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          workers_comp_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_burden_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_burden_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_consumables: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string | null
          id: string
          include_consumables: boolean | null
          liner_case_cost: number | null
          liner_usage_per_person_month: number | null
          markup_pct: number | null
          monthly_consumables_cost: number | null
          paper_towel_case_cost: number | null
          paper_towel_usage_per_person_month: number | null
          seat_cover_case_cost: number | null
          seat_cover_usage_per_person_month: number | null
          soap_case_cost: number | null
          soap_usage_per_person_month: number | null
          tenant_id: string
          toilet_paper_case_cost: number | null
          toilet_paper_usage_per_person_month: number | null
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string | null
          id?: string
          include_consumables?: boolean | null
          liner_case_cost?: number | null
          liner_usage_per_person_month?: number | null
          markup_pct?: number | null
          monthly_consumables_cost?: number | null
          paper_towel_case_cost?: number | null
          paper_towel_usage_per_person_month?: number | null
          seat_cover_case_cost?: number | null
          seat_cover_usage_per_person_month?: number | null
          soap_case_cost?: number | null
          soap_usage_per_person_month?: number | null
          tenant_id: string
          toilet_paper_case_cost?: number | null
          toilet_paper_usage_per_person_month?: number | null
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string | null
          id?: string
          include_consumables?: boolean | null
          liner_case_cost?: number | null
          liner_usage_per_person_month?: number | null
          markup_pct?: number | null
          monthly_consumables_cost?: number | null
          paper_towel_case_cost?: number | null
          paper_towel_usage_per_person_month?: number | null
          seat_cover_case_cost?: number | null
          seat_cover_usage_per_person_month?: number | null
          soap_case_cost?: number | null
          soap_usage_per_person_month?: number | null
          tenant_id?: string
          toilet_paper_case_cost?: number | null
          toilet_paper_usage_per_person_month?: number | null
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_consumables_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_consumables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_conversions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          conversion_mode: string
          converted_at: string
          converted_by: string
          created_at: string
          id: string
          is_dry_run: boolean
          site_job_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          conversion_mode?: string
          converted_at?: string
          converted_by: string
          created_at?: string
          id?: string
          is_dry_run?: boolean
          site_job_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          conversion_mode?: string
          converted_at?: string
          converted_by?: string
          created_at?: string
          id?: string
          is_dry_run?: boolean
          site_job_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conv_site_job"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_conversions_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_conversions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_equipment_plan_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          condition_code: string | null
          cost: number | null
          created_at: string | null
          equipment_type_code: string | null
          id: string
          life_years: number | null
          monthly_depreciation: number | null
          quantity_needed: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          condition_code?: string | null
          cost?: number | null
          created_at?: string | null
          equipment_type_code?: string | null
          id?: string
          life_years?: number | null
          monthly_depreciation?: number | null
          quantity_needed?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          condition_code?: string | null
          cost?: number | null
          created_at?: string | null
          equipment_type_code?: string | null
          id?: string
          life_years?: number | null
          monthly_depreciation?: number | null
          quantity_needed?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_equipment_plan_items_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_equipment_plan_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_general_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          category_code: string
          created_at: string | null
          enabled: boolean | null
          id: string
          task_name: string
          tenant_id: string
          time_minutes: number
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          category_code: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          task_name: string
          tenant_id: string
          time_minutes?: number
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          category_code?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          task_name?: string
          tenant_id?: string
          time_minutes?: number
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_general_tasks_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_general_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_labor_rates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          cleaner_rate: number
          created_at: string
          id: string
          lead_rate: number
          supervisor_rate: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          cleaner_rate?: number
          created_at?: string
          id?: string
          lead_rate?: number
          supervisor_rate?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          cleaner_rate?: number
          created_at?: string
          id?: string
          lead_rate?: number
          supervisor_rate?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_labor_rates_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_labor_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_overhead: {
        Row: {
          allocation_percentage: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string | null
          id: string
          industry_benchmark_percentage: number | null
          insurance: number | null
          marketing: number | null
          misc: number | null
          office_rent: number | null
          overhead_allocated: number | null
          overhead_total: number | null
          phones_internet: number | null
          tenant_id: string
          updated_at: string | null
          utilities: number | null
          vehicle: number | null
          version_etag: string | null
        }
        Insert: {
          allocation_percentage?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string | null
          id?: string
          industry_benchmark_percentage?: number | null
          insurance?: number | null
          marketing?: number | null
          misc?: number | null
          office_rent?: number | null
          overhead_allocated?: number | null
          overhead_total?: number | null
          phones_internet?: number | null
          tenant_id: string
          updated_at?: string | null
          utilities?: number | null
          vehicle?: number | null
          version_etag?: string | null
        }
        Update: {
          allocation_percentage?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string | null
          id?: string
          industry_benchmark_percentage?: number | null
          insurance?: number | null
          marketing?: number | null
          misc?: number | null
          office_rent?: number | null
          overhead_allocated?: number | null
          overhead_total?: number | null
          phones_internet?: number | null
          tenant_id?: string
          updated_at?: string | null
          utilities?: number | null
          vehicle?: number | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_overhead_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_overhead_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_pricing_results: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          burdened_labor_cost: number
          created_at: string
          effective_margin_pct: number
          equipment_cost: number
          explanation: Json | null
          id: string
          overhead_cost: number
          pricing_method: string
          recommended_price: number
          supplies_cost: number
          tenant_id: string
          total_monthly_cost: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          burdened_labor_cost: number
          created_at?: string
          effective_margin_pct: number
          equipment_cost?: number
          explanation?: Json | null
          id?: string
          overhead_cost?: number
          pricing_method: string
          recommended_price: number
          supplies_cost?: number
          tenant_id: string
          total_monthly_cost: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          burdened_labor_cost?: number
          created_at?: string
          effective_margin_pct?: number
          equipment_cost?: number
          explanation?: Json | null
          id?: string
          overhead_cost?: number
          pricing_method?: string
          recommended_price?: number
          supplies_cost?: number
          tenant_id?: string
          total_monthly_cost?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_pricing_results_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_pricing_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_pricing_strategy: {
        Row: {
          annual_increase_pct: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          cost_plus_markup_pct: number | null
          created_at: string | null
          final_price_override: number | null
          id: string
          include_initial_clean: boolean | null
          initial_clean_multiplier: number | null
          market_rate_high: number | null
          market_rate_low: number | null
          method_code: string | null
          minimum_monthly: number | null
          price_elasticity_code: string | null
          target_margin_pct: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          annual_increase_pct?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          cost_plus_markup_pct?: number | null
          created_at?: string | null
          final_price_override?: number | null
          id?: string
          include_initial_clean?: boolean | null
          initial_clean_multiplier?: number | null
          market_rate_high?: number | null
          market_rate_low?: number | null
          method_code?: string | null
          minimum_monthly?: number | null
          price_elasticity_code?: string | null
          target_margin_pct?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          annual_increase_pct?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          cost_plus_markup_pct?: number | null
          created_at?: string | null
          final_price_override?: number | null
          id?: string
          include_initial_clean?: boolean | null
          initial_clean_multiplier?: number | null
          market_rate_high?: number | null
          market_rate_low?: number | null
          method_code?: string | null
          minimum_monthly?: number | null
          price_elasticity_code?: string | null
          target_margin_pct?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_pricing_strategy_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_pricing_strategy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_schedule: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string
          days_per_week: number
          hours_per_shift: number
          id: string
          lead_required: boolean
          supervisor_hours_week: number
          tenant_id: string
          updated_at: string
          version_etag: string
          visits_per_day: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string
          days_per_week?: number
          hours_per_shift?: number
          id?: string
          lead_required?: boolean
          supervisor_hours_week?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
          visits_per_day?: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string
          days_per_week?: number
          hours_per_shift?: number
          id?: string
          lead_required?: boolean
          supervisor_hours_week?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          visits_per_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_schedule_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_schedule_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_sites: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          building_occupancy: number | null
          building_type_code: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          notes: string | null
          public_traffic_code: string | null
          security_clearance_required: boolean | null
          site_name: string
          state: string | null
          street_address: string | null
          sustainability_required: boolean | null
          tenant_id: string
          total_square_footage: number | null
          union_required: boolean | null
          updated_at: string | null
          version_etag: string | null
          walkthrough_date: string | null
          zip: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          building_occupancy?: number | null
          building_type_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          public_traffic_code?: string | null
          security_clearance_required?: boolean | null
          site_name: string
          state?: string | null
          street_address?: string | null
          sustainability_required?: boolean | null
          tenant_id: string
          total_square_footage?: number | null
          union_required?: boolean | null
          updated_at?: string | null
          version_etag?: string | null
          walkthrough_date?: string | null
          zip?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          building_occupancy?: number | null
          building_type_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          public_traffic_code?: string | null
          security_clearance_required?: boolean | null
          site_name?: string
          state?: string | null
          street_address?: string | null
          sustainability_required?: boolean | null
          tenant_id?: string
          total_square_footage?: number | null
          union_required?: boolean | null
          updated_at?: string | null
          version_etag?: string | null
          walkthrough_date?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_sites_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_supply_allowances: {
        Row: {
          allowance_per_sqft: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string | null
          id: string
          monthly_supply_allowance: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          allowance_per_sqft?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string | null
          id?: string
          monthly_supply_allowance?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          allowance_per_sqft?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string | null
          id?: string
          monthly_supply_allowance?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_supply_allowances_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_supply_allowances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_supply_kits: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string | null
          id: string
          include_in_conversion: boolean | null
          kit_id: string
          quantity_multiplier: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string | null
          id?: string
          include_in_conversion?: boolean | null
          kit_id: string
          quantity_multiplier?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string | null
          id?: string
          include_in_conversion?: boolean | null
          kit_id?: string
          quantity_multiplier?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_supply_kits_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_supply_kits_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "supply_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_supply_kits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_versions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_id: string
          created_at: string
          id: string
          is_sent_snapshot: boolean
          snapshot_data: Json | null
          tenant_id: string
          updated_at: string
          version_etag: string
          version_number: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_id: string
          created_at?: string
          id?: string
          is_sent_snapshot?: boolean
          snapshot_data?: Json | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
          version_number?: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_id?: string
          created_at?: string
          id?: string
          is_sent_snapshot?: boolean
          snapshot_data?: Json | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_versions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "sales_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bid_workload_results: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          cleaners_needed: number
          created_at: string
          hours_per_visit: number
          id: string
          lead_needed: boolean
          monthly_hours: number
          monthly_minutes: number
          tenant_id: string
          total_minutes_per_visit: number
          updated_at: string
          version_etag: string
          weekly_minutes: number
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          cleaners_needed: number
          created_at?: string
          hours_per_visit: number
          id?: string
          lead_needed: boolean
          monthly_hours: number
          monthly_minutes: number
          tenant_id: string
          total_minutes_per_visit: number
          updated_at?: string
          version_etag?: string
          weekly_minutes: number
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          cleaners_needed?: number
          created_at?: string
          hours_per_visit?: number
          id?: string
          lead_needed?: boolean
          monthly_hours?: number
          monthly_minutes?: number
          tenant_id?: string
          total_minutes_per_visit?: number
          updated_at?: string
          version_etag?: string
          weekly_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_bid_workload_results_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bid_workload_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_bids: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_code: string
          bid_monthly_price: number | null
          client_id: string
          created_at: string
          id: string
          opportunity_id: string | null
          service_id: string | null
          status: string
          target_margin_percent: number | null
          tenant_id: string
          total_sqft: number | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_code: string
          bid_monthly_price?: number | null
          client_id: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          service_id?: string | null
          status?: string
          target_margin_percent?: number | null
          tenant_id: string
          total_sqft?: number | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_code?: string
          bid_monthly_price?: number | null
          client_id?: string
          created_at?: string
          id?: string
          opportunity_id?: string | null
          service_id?: string | null
          status?: string
          target_margin_percent?: number | null
          tenant_id?: string
          total_sqft?: number | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bids_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bids_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sales_bids_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bids_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_bids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_conversion_events: {
        Row: {
          conversion_id: string
          created_at: string
          detail: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          status: string
          step: string
          tenant_id: string
        }
        Insert: {
          conversion_id: string
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          status?: string
          step: string
          tenant_id: string
        }
        Update: {
          conversion_id?: string
          created_at?: string
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          status?: string
          step?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_conversion_events_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_conversion_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_email_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          proposal_send_id: string
          provider_event_id: string
          raw_payload: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          proposal_send_id: string
          provider_event_id: string
          raw_payload?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          proposal_send_id?: string
          provider_event_id?: string
          raw_payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_email_events_proposal_send_id_fkey"
            columns: ["proposal_send_id"]
            isOneToOne: false
            referencedRelation: "sales_proposal_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_email_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_followup_sends: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          scheduled_at: string
          sent_at: string | null
          sequence_id: string
          status: string
          step_number: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          scheduled_at: string
          sent_at?: string | null
          sequence_id: string
          status?: string
          step_number: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          sequence_id?: string
          status?: string
          step_number?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_followup_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sales_followup_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_followup_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_followup_sequences: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          proposal_id: string
          status: string
          stop_reason: string | null
          tenant_id: string
          total_steps: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          proposal_id: string
          status?: string
          stop_reason?: string | null
          tenant_id: string
          total_steps?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          proposal_id?: string
          status?: string
          stop_reason?: string | null
          tenant_id?: string
          total_steps?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_followup_sequences_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_followup_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_followup_templates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          body_template_markdown: string
          created_at: string | null
          delay_days: number
          id: string
          is_active: boolean | null
          name: string
          step_number: number
          subject_template: string
          template_code: string
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          body_template_markdown: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          step_number: number
          subject_template: string
          template_code: string
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          body_template_markdown?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          step_number?: number
          subject_template?: string
          template_code?: string
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_followup_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_marketing_inserts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          file_id: string
          id: string
          insert_code: string
          is_active: boolean | null
          tenant_id: string
          title: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          file_id: string
          id?: string
          insert_code: string
          is_active?: boolean | null
          tenant_id: string
          title: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          file_id?: string
          id?: string
          insert_code?: string
          is_active?: boolean | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_marketing_inserts_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_marketing_inserts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          client_id: string | null
          created_at: string
          estimated_monthly_value: number | null
          expected_close_date: string | null
          id: string
          name: string
          opportunity_code: string
          owner_user_id: string | null
          prospect_id: string | null
          stage_code: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          created_at?: string
          estimated_monthly_value?: number | null
          expected_close_date?: string | null
          id?: string
          name: string
          opportunity_code: string
          owner_user_id?: string | null
          prospect_id?: string | null
          stage_code?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string | null
          created_at?: string
          estimated_monthly_value?: number | null
          expected_close_date?: string | null
          id?: string
          name?: string
          opportunity_code?: string
          owner_user_id?: string | null
          prospect_id?: string | null
          stage_code?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sales_opportunities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sales_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_production_rates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          base_minutes: number
          building_type_code: string | null
          created_at: string | null
          default_ml_adjustment: number | null
          floor_type_code: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          rate_code: string
          task_name: string
          tenant_id: string
          unit_code: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          base_minutes?: number
          building_type_code?: string | null
          created_at?: string | null
          default_ml_adjustment?: number | null
          floor_type_code?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate_code: string
          task_name: string
          tenant_id: string
          unit_code?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          base_minutes?: number
          building_type_code?: string | null
          created_at?: string | null
          default_ml_adjustment?: number | null
          floor_type_code?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate_code?: string
          task_name?: string
          tenant_id?: string
          unit_code?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_production_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposal_attachments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          file_id: string
          id: string
          one_page_confirmed: boolean | null
          proposal_id: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          file_id: string
          id?: string
          one_page_confirmed?: boolean | null
          proposal_id: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          file_id?: string
          id?: string
          one_page_confirmed?: boolean | null
          proposal_id?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposal_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposal_marketing_inserts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          id: string
          insert_code: string
          proposal_id: string
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          insert_code: string
          proposal_id: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          insert_code?: string
          proposal_id?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposal_marketing_inserts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_marketing_inserts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposal_pricing_options: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          id: string
          is_recommended: boolean
          label: string
          monthly_price: number
          proposal_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recommended?: boolean
          label: string
          monthly_price: number
          proposal_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recommended?: boolean
          label?: string
          monthly_price?: number
          proposal_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposal_pricing_options_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_pricing_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposal_sends: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          idempotency_key: string
          proposal_id: string
          provider_message_id: string | null
          public_token: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          proposal_id: string
          provider_message_id?: string | null
          public_token?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          proposal_id?: string
          provider_message_id?: string | null
          public_token?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposal_sends_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposal_signatures: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          proposal_id: string
          signature_file_id: string | null
          signature_font_name: string | null
          signature_type_code: string | null
          signed_at: string | null
          signer_email: string
          signer_name: string
          tenant_id: string
          updated_at: string | null
          user_agent: string | null
          version_etag: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          proposal_id: string
          signature_file_id?: string | null
          signature_font_name?: string | null
          signature_type_code?: string | null
          signed_at?: string | null
          signer_email: string
          signer_name: string
          tenant_id: string
          updated_at?: string | null
          user_agent?: string | null
          version_etag?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          proposal_id?: string
          signature_file_id?: string | null
          signature_font_name?: string | null
          signature_type_code?: string | null
          signed_at?: string | null
          signer_email?: string
          signer_name?: string
          tenant_id?: string
          updated_at?: string | null
          user_agent?: string | null
          version_etag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposal_signatures_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "sales_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_signatures_signature_file_id_fkey"
            columns: ["signature_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_proposals: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bid_version_id: string
          created_at: string
          id: string
          layout_config: Json | null
          notes: string | null
          page_count: number | null
          pdf_file_id: string | null
          pdf_generated_at: string | null
          proposal_code: string
          status: string
          tenant_id: string
          updated_at: string
          valid_until: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id: string
          created_at?: string
          id?: string
          layout_config?: Json | null
          notes?: string | null
          page_count?: number | null
          pdf_file_id?: string | null
          pdf_generated_at?: string | null
          proposal_code: string
          status?: string
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bid_version_id?: string
          created_at?: string
          id?: string
          layout_config?: Json | null
          notes?: string | null
          page_count?: number | null
          pdf_file_id?: string | null
          pdf_generated_at?: string | null
          proposal_code?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_proposals_bid_version_id_fkey"
            columns: ["bid_version_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_prospect_contacts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          contact_name: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          phone: string | null
          prospect_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_name: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone?: string | null
          prospect_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          contact_name?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          phone?: string | null
          prospect_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "sales_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_prospect_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_prospects: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          company_name: string
          created_at: string
          id: string
          notes: string | null
          owner_user_id: string | null
          prospect_code: string
          prospect_status_code: string
          source: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          company_name: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          prospect_code: string
          prospect_status_code?: string
          source?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          company_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          prospect_code?: string
          prospect_status_code?: string
          source?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_prospects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_conflicts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          conflict_type: string
          created_at: string
          id: string
          is_blocking: boolean
          message: string
          payload: Json
          period_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          staff_id: string | null
          tenant_id: string
          ticket_id: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conflict_type: string
          created_at?: string
          id?: string
          is_blocking?: boolean
          message: string
          payload?: Json
          period_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          staff_id?: string | null
          tenant_id: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          conflict_type?: string
          created_at?: string
          id?: string
          is_blocking?: boolean
          message?: string
          payload?: Json
          period_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          staff_id?: string | null
          tenant_id?: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_conflicts_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_periods: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          period_end: string
          period_name: string | null
          period_start: string
          published_at: string | null
          published_by: string | null
          site_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          period_end: string
          period_name?: string | null
          period_start: string
          published_at?: string | null
          published_by?: string | null
          site_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          period_end?: string
          period_name?: string | null
          period_start?: string
          published_at?: string | null
          published_by?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_periods_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category_name: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          default_area_type_filter: string | null
          default_frequency: string | null
          default_units: number | null
          estimated_minutes: number | null
          frequency_default: string
          id: string
          is_required: boolean
          notes: string | null
          priority_level: string | null
          qc_weight_override: number | null
          quality_weight: number
          sequence_order: number
          service_id: string
          sort_order: number | null
          task_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_area_type_filter?: string | null
          default_frequency?: string | null
          default_units?: number | null
          estimated_minutes?: number | null
          frequency_default?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          priority_level?: string | null
          qc_weight_override?: number | null
          quality_weight?: number
          sequence_order?: number
          service_id: string
          sort_order?: number | null
          task_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          default_area_type_filter?: string | null
          default_frequency?: string | null
          default_units?: number | null
          estimated_minutes?: number | null
          frequency_default?: string
          id?: string
          is_required?: boolean
          notes?: string | null
          priority_level?: string | null
          qc_weight_override?: number | null
          quality_weight?: number
          sequence_order?: number
          service_id?: string
          sort_order?: number | null
          task_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tasks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          billing_model: string | null
          created_at: string
          default_rate: number | null
          description: string | null
          equipment_required: string[] | null
          id: string
          is_active: boolean | null
          minimum_charge: number | null
          name: string
          price_per_unit: number | null
          requires_certification: boolean | null
          service_category_id: string | null
          service_code: string
          service_name_deprecated: string | null
          service_type: string | null
          supplies_required: string[] | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_model?: string | null
          created_at?: string
          default_rate?: number | null
          description?: string | null
          equipment_required?: string[] | null
          id?: string
          is_active?: boolean | null
          minimum_charge?: number | null
          name: string
          price_per_unit?: number | null
          requires_certification?: boolean | null
          service_category_id?: string | null
          service_code: string
          service_name_deprecated?: string | null
          service_type?: string | null
          supplies_required?: string[] | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_model?: string | null
          created_at?: string
          default_rate?: number | null
          description?: string | null
          equipment_required?: string[] | null
          id?: string
          is_active?: boolean | null
          minimum_charge?: number | null
          name?: string
          price_per_unit?: number | null
          requires_certification?: boolean | null
          service_category_id?: string | null
          service_code?: string
          service_name_deprecated?: string | null
          service_type?: string | null
          supplies_required?: string[] | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_trade_requests: {
        Row: {
          accepted_at: string | null
          applied_at: string | null
          approved_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          initiator_note: string | null
          initiator_staff_id: string
          manager_note: string | null
          manager_user_id: string | null
          period_id: string | null
          request_type: string
          requested_at: string
          status: string
          target_staff_id: string | null
          tenant_id: string
          ticket_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          accepted_at?: string | null
          applied_at?: string | null
          approved_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          initiator_note?: string | null
          initiator_staff_id: string
          manager_note?: string | null
          manager_user_id?: string | null
          period_id?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          target_staff_id?: string | null
          tenant_id: string
          ticket_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          accepted_at?: string | null
          applied_at?: string | null
          approved_at?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          initiator_note?: string | null
          initiator_staff_id?: string
          manager_note?: string | null
          manager_user_id?: string | null
          period_id?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          target_staff_id?: string | null
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_trade_requests_initiator_staff_id_fkey"
            columns: ["initiator_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_staff_id_fkey"
            columns: ["target_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_areas: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          area_code: string | null
          area_name: string | null
          area_sqft: number | null
          area_type: string | null
          created_at: string
          floor_number: number | null
          id: string
          is_serviceable: boolean | null
          map_ref: string | null
          name: string
          notes: string | null
          site_id: string
          sort_order: number
          square_footage: number | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_code?: string | null
          area_name?: string | null
          area_sqft?: number | null
          area_type?: string | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_serviceable?: boolean | null
          map_ref?: string | null
          name: string
          notes?: string | null
          site_id: string
          sort_order?: number
          square_footage?: number | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_code?: string | null
          area_name?: string | null
          area_sqft?: number | null
          area_type?: string | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_serviceable?: boolean | null
          map_ref?: string | null
          name?: string
          notes?: string | null
          site_id?: string
          sort_order?: number
          square_footage?: number | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_areas_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_asset_requirements: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          asset_type: string
          created_at: string
          description: string
          id: string
          is_required: boolean
          site_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asset_type: string
          created_at?: string
          description: string
          id?: string
          is_required?: boolean
          site_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asset_type?: string
          created_at?: string
          description?: string
          id?: string
          is_required?: boolean
          site_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_asset_requirements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_asset_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_book_checklist_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          item_key: string
          label_en: string
          label_es: string | null
          label_pt_br: string | null
          requires_photo: boolean
          site_book_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_key: string
          label_en: string
          label_es?: string | null
          label_pt_br?: string | null
          requires_photo?: boolean
          site_book_id: string
          sort_order: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          item_key?: string
          label_en?: string
          label_es?: string | null
          label_pt_br?: string | null
          requires_photo?: boolean
          site_book_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_book_checklist_items_site_book_id_fkey"
            columns: ["site_book_id"]
            isOneToOne: false
            referencedRelation: "site_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_book_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_books: {
        Row: {
          access_notes_en: string | null
          access_notes_es: string | null
          access_notes_pt_br: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          created_at: string
          hipaa_acknowledgment_required: boolean
          hipaa_awareness_required: boolean
          id: string
          instructions_en: string | null
          instructions_es: string | null
          instructions_pt_br: string | null
          is_active: boolean
          sensitive_site: boolean
          sensitive_site_type: string | null
          site_id: string
          tenant_id: string
          updated_at: string
          vault_ref: string | null
          version_etag: string
        }
        Insert: {
          access_notes_en?: string | null
          access_notes_es?: string | null
          access_notes_pt_br?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          hipaa_acknowledgment_required?: boolean
          hipaa_awareness_required?: boolean
          id?: string
          instructions_en?: string | null
          instructions_es?: string | null
          instructions_pt_br?: string | null
          is_active?: boolean
          sensitive_site?: boolean
          sensitive_site_type?: string | null
          site_id: string
          tenant_id: string
          updated_at?: string
          vault_ref?: string | null
          version_etag?: string
        }
        Update: {
          access_notes_en?: string | null
          access_notes_es?: string | null
          access_notes_pt_br?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          created_at?: string
          hipaa_acknowledgment_required?: boolean
          hipaa_awareness_required?: boolean
          id?: string
          instructions_en?: string | null
          instructions_es?: string | null
          instructions_pt_br?: string | null
          is_active?: boolean
          sensitive_site?: boolean
          sensitive_site_type?: string | null
          site_id?: string
          tenant_id?: string
          updated_at?: string
          vault_ref?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_books_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_jobs: {
        Row: {
          annual_hours_estimate: number | null
          annual_revenue: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          billing_amount: number | null
          billing_uom: string | null
          created_at: string
          current_sub_mo: number | null
          current_sub_pct: number | null
          end_date: string | null
          end_time: string | null
          estimated_hours_per_month: number | null
          estimated_hours_per_service: number | null
          frequency: string
          id: string
          invoice_description: string | null
          issa_category: string | null
          issa_service_code: string | null
          issa_service_name: string | null
          issa_task_range: string | null
          job_assigned_to: string | null
          job_code: string
          job_name: string | null
          job_type_deprecated: string | null
          last_service_date: string | null
          margin_tier: string | null
          next_service_date: string | null
          notes: string | null
          priority_level: string | null
          profit_amount: number | null
          profit_pct: number | null
          quality_score: number | null
          schedule_days: string | null
          service_id: string | null
          site_id: string
          source_bid_id: string | null
          source_conversion_id: string | null
          special_requirements: string | null
          specifications: string | null
          staff_needed: number | null
          start_date: string | null
          start_time: string | null
          status: string
          subcontractor_id: string | null
          suggested_sub_mo: number | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          annual_hours_estimate?: number | null
          annual_revenue?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_amount?: number | null
          billing_uom?: string | null
          created_at?: string
          current_sub_mo?: number | null
          current_sub_pct?: number | null
          end_date?: string | null
          end_time?: string | null
          estimated_hours_per_month?: number | null
          estimated_hours_per_service?: number | null
          frequency?: string
          id?: string
          invoice_description?: string | null
          issa_category?: string | null
          issa_service_code?: string | null
          issa_service_name?: string | null
          issa_task_range?: string | null
          job_assigned_to?: string | null
          job_code: string
          job_name?: string | null
          job_type_deprecated?: string | null
          last_service_date?: string | null
          margin_tier?: string | null
          next_service_date?: string | null
          notes?: string | null
          priority_level?: string | null
          profit_amount?: number | null
          profit_pct?: number | null
          quality_score?: number | null
          schedule_days?: string | null
          service_id?: string | null
          site_id: string
          source_bid_id?: string | null
          source_conversion_id?: string | null
          special_requirements?: string | null
          specifications?: string | null
          staff_needed?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          subcontractor_id?: string | null
          suggested_sub_mo?: number | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          annual_hours_estimate?: number | null
          annual_revenue?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_amount?: number | null
          billing_uom?: string | null
          created_at?: string
          current_sub_mo?: number | null
          current_sub_pct?: number | null
          end_date?: string | null
          end_time?: string | null
          estimated_hours_per_month?: number | null
          estimated_hours_per_service?: number | null
          frequency?: string
          id?: string
          invoice_description?: string | null
          issa_category?: string | null
          issa_service_code?: string | null
          issa_service_name?: string | null
          issa_task_range?: string | null
          job_assigned_to?: string | null
          job_code?: string
          job_name?: string | null
          job_type_deprecated?: string | null
          last_service_date?: string | null
          margin_tier?: string | null
          next_service_date?: string | null
          notes?: string | null
          priority_level?: string | null
          profit_amount?: number | null
          profit_pct?: number | null
          quality_score?: number | null
          schedule_days?: string | null
          service_id?: string | null
          site_id?: string
          source_bid_id?: string | null
          source_conversion_id?: string | null
          special_requirements?: string | null
          specifications?: string | null
          staff_needed?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          subcontractor_id?: string | null
          suggested_sub_mo?: number | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sj_conversion"
            columns: ["source_conversion_id"]
            isOneToOne: false
            referencedRelation: "sales_bid_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_jobs_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: false
            referencedRelation: "sales_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_jobs_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pin_codes: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          pin_hash: string
          site_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          pin_hash: string
          site_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          pin_hash?: string
          site_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pin_codes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_pin_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_supplies: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          par_level: number | null
          sds_url: string | null
          site_id: string
          supply_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          par_level?: number | null
          sds_url?: string | null
          site_id: string
          supply_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          par_level?: number | null
          sds_url?: string | null
          site_id?: string
          supply_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_supplies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supplies_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supplies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_supply_costs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cost_code: string
          created_at: string
          delivery_date: string
          id: string
          quantity: number
          route_id: string | null
          site_id: string
          source: string
          supply_id: string
          tenant_id: string
          total_cost: number
          unit_cost: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost_code: string
          created_at?: string
          delivery_date: string
          id?: string
          quantity: number
          route_id?: string | null
          site_id: string
          source: string
          supply_id: string
          tenant_id: string
          total_cost: number
          unit_cost: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost_code?: string
          created_at?: string
          delivery_date?: string
          id?: string
          quantity?: number
          route_id?: string | null
          site_id?: string
          source?: string
          supply_id?: string
          tenant_id?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_supply_costs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supply_costs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "site_supply_costs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "site_supply_costs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supply_costs_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_supply_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_type_tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          frequency: string
          id: string
          is_required: boolean
          site_type_id: string
          sort_order: number
          task_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_required?: boolean
          site_type_id: string
          sort_order?: number
          task_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_required?: boolean
          site_type_id?: string
          sort_order?: number
          task_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_type_tasks_site_type_id_fkey"
            columns: ["site_type_id"]
            isOneToOne: false
            referencedRelation: "site_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_type_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_type_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_types: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          access_notes: string | null
          access_window_end_deprecated: string | null
          access_window_start_deprecated: string | null
          address: Json
          address_text: string | null
          alarm_code: string | null
          alarm_company: string | null
          alarm_system: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          background_check_required: boolean
          business_hours_end: string | null
          business_hours_start: string | null
          cleaning_procedures: string | null
          cleaning_procedures_photos: Json | null
          client_id: string
          count_status_alert: string | null
          created_at: string
          default_service_frequency: string | null
          difficulty: string | null
          dumpster_location: string | null
          earliest_start_time: string | null
          emergency_contact_id: string | null
          employees_on_site: number | null
          entry_instructions: string | null
          geo_lat_deprecated: number | null
          geo_long_deprecated: number | null
          geofence_center_lat: number | null
          geofence_center_lng: number | null
          geofence_radius_meters: number | null
          id: string
          inventory_frequency: string | null
          janitorial_closet_location: string | null
          key_code: string | null
          last_count_date: string | null
          last_inspection_date: string | null
          latest_start_time: string | null
          name: string
          next_count_due: string | null
          next_inspection_date: string | null
          notes: string | null
          number_of_floors: number | null
          occupancy_level: string | null
          osha_compliance_required: boolean
          parking_instructions: string | null
          photo_exterior_thumbnail_url_deprecated: string | null
          photo_interior_thumbnail_url_deprecated: string | null
          photo_interior_url_deprecated: string | null
          photo_url: string | null
          primary_contact_id: string | null
          priority_level: string | null
          qr_closet_id: string | null
          risk_level: string | null
          security_level: string | null
          security_protocol: string | null
          service_schedule: Json | null
          service_start_date: string | null
          site_code: string
          site_type_id: string | null
          special_instructions: string | null
          square_footage: number | null
          status: string | null
          status_date: string | null
          status_reason: string | null
          supervisor_id: string | null
          supply_closet_items: Json | null
          supply_storage_location: string | null
          tenant_id: string
          traffic_level: string | null
          updated_at: string
          version_etag: string
          water_source_location: string | null
          weekend_access: boolean
        }
        Insert: {
          access_notes?: string | null
          access_window_end_deprecated?: string | null
          access_window_start_deprecated?: string | null
          address?: Json
          address_text?: string | null
          alarm_code?: string | null
          alarm_company?: string | null
          alarm_system?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          background_check_required?: boolean
          business_hours_end?: string | null
          business_hours_start?: string | null
          cleaning_procedures?: string | null
          cleaning_procedures_photos?: Json | null
          client_id: string
          count_status_alert?: string | null
          created_at?: string
          default_service_frequency?: string | null
          difficulty?: string | null
          dumpster_location?: string | null
          earliest_start_time?: string | null
          emergency_contact_id?: string | null
          employees_on_site?: number | null
          entry_instructions?: string | null
          geo_lat_deprecated?: number | null
          geo_long_deprecated?: number | null
          geofence_center_lat?: number | null
          geofence_center_lng?: number | null
          geofence_radius_meters?: number | null
          id?: string
          inventory_frequency?: string | null
          janitorial_closet_location?: string | null
          key_code?: string | null
          last_count_date?: string | null
          last_inspection_date?: string | null
          latest_start_time?: string | null
          name: string
          next_count_due?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          number_of_floors?: number | null
          occupancy_level?: string | null
          osha_compliance_required?: boolean
          parking_instructions?: string | null
          photo_exterior_thumbnail_url_deprecated?: string | null
          photo_interior_thumbnail_url_deprecated?: string | null
          photo_interior_url_deprecated?: string | null
          photo_url?: string | null
          primary_contact_id?: string | null
          priority_level?: string | null
          qr_closet_id?: string | null
          risk_level?: string | null
          security_level?: string | null
          security_protocol?: string | null
          service_schedule?: Json | null
          service_start_date?: string | null
          site_code: string
          site_type_id?: string | null
          special_instructions?: string | null
          square_footage?: number | null
          status?: string | null
          status_date?: string | null
          status_reason?: string | null
          supervisor_id?: string | null
          supply_closet_items?: Json | null
          supply_storage_location?: string | null
          tenant_id: string
          traffic_level?: string | null
          updated_at?: string
          version_etag?: string
          water_source_location?: string | null
          weekend_access?: boolean
        }
        Update: {
          access_notes?: string | null
          access_window_end_deprecated?: string | null
          access_window_start_deprecated?: string | null
          address?: Json
          address_text?: string | null
          alarm_code?: string | null
          alarm_company?: string | null
          alarm_system?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          background_check_required?: boolean
          business_hours_end?: string | null
          business_hours_start?: string | null
          cleaning_procedures?: string | null
          cleaning_procedures_photos?: Json | null
          client_id?: string
          count_status_alert?: string | null
          created_at?: string
          default_service_frequency?: string | null
          difficulty?: string | null
          dumpster_location?: string | null
          earliest_start_time?: string | null
          emergency_contact_id?: string | null
          employees_on_site?: number | null
          entry_instructions?: string | null
          geo_lat_deprecated?: number | null
          geo_long_deprecated?: number | null
          geofence_center_lat?: number | null
          geofence_center_lng?: number | null
          geofence_radius_meters?: number | null
          id?: string
          inventory_frequency?: string | null
          janitorial_closet_location?: string | null
          key_code?: string | null
          last_count_date?: string | null
          last_inspection_date?: string | null
          latest_start_time?: string | null
          name?: string
          next_count_due?: string | null
          next_inspection_date?: string | null
          notes?: string | null
          number_of_floors?: number | null
          occupancy_level?: string | null
          osha_compliance_required?: boolean
          parking_instructions?: string | null
          photo_exterior_thumbnail_url_deprecated?: string | null
          photo_interior_thumbnail_url_deprecated?: string | null
          photo_interior_url_deprecated?: string | null
          photo_url?: string | null
          primary_contact_id?: string | null
          priority_level?: string | null
          qr_closet_id?: string | null
          risk_level?: string | null
          security_level?: string | null
          security_protocol?: string | null
          service_schedule?: Json | null
          service_start_date?: string | null
          site_code?: string
          site_type_id?: string | null
          special_instructions?: string | null
          square_footage?: number | null
          status?: string | null
          status_date?: string | null
          status_reason?: string | null
          supervisor_id?: string | null
          supply_closet_items?: Json | null
          supply_storage_location?: string | null
          tenant_id?: string
          traffic_level?: string | null
          updated_at?: string
          version_etag?: string
          water_source_location?: string | null
          weekend_access?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sites_emergency_contact_id_fkey"
            columns: ["emergency_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_site_type_id_fkey"
            columns: ["site_type_id"]
            isOneToOne: false
            referencedRelation: "site_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: Json | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_site_ids: string[] | null
          background_check_date: string | null
          certifications: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employment_type: string | null
          first_name: string | null
          full_name: string
          hire_date: string | null
          id: string
          integration_ids: Json | null
          is_subcontractor: boolean
          languages: string[] | null
          last_name: string | null
          microfiber_enrolled: boolean
          microfiber_enrolled_at: string | null
          microfiber_exited_at: string | null
          microfiber_rate_per_set: number
          mobile_phone: string | null
          notes: string | null
          pay_rate: number | null
          pay_type: string | null
          performance_rating: number | null
          phone: string | null
          photo_thumbnail_url: string | null
          photo_url: string | null
          preferences: Json | null
          preferred_name: string | null
          role: string
          schedule_type: string | null
          staff_code: string
          staff_status: string | null
          staff_type: string | null
          supervisor_id: string | null
          tenant_id: string
          termination_date: string | null
          updated_at: string
          user_id: string | null
          version_etag: string
        }
        Insert: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_site_ids?: string[] | null
          background_check_date?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          integration_ids?: Json | null
          is_subcontractor?: boolean
          languages?: string[] | null
          last_name?: string | null
          microfiber_enrolled?: boolean
          microfiber_enrolled_at?: string | null
          microfiber_exited_at?: string | null
          microfiber_rate_per_set?: number
          mobile_phone?: string | null
          notes?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          performance_rating?: number | null
          phone?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          preferences?: Json | null
          preferred_name?: string | null
          role?: string
          schedule_type?: string | null
          staff_code: string
          staff_status?: string | null
          staff_type?: string | null
          supervisor_id?: string | null
          tenant_id: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          version_etag?: string
        }
        Update: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_site_ids?: string[] | null
          background_check_date?: string | null
          certifications?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          integration_ids?: Json | null
          is_subcontractor?: boolean
          languages?: string[] | null
          last_name?: string | null
          microfiber_enrolled?: boolean
          microfiber_enrolled_at?: string | null
          microfiber_exited_at?: string | null
          microfiber_rate_per_set?: number
          mobile_phone?: string | null
          notes?: string | null
          pay_rate?: number | null
          pay_type?: string | null
          performance_rating?: number | null
          phone?: string | null
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          preferences?: Json | null
          preferred_name?: string | null
          role?: string
          schedule_type?: string | null
          staff_code?: string
          staff_status?: string | null
          staff_type?: string | null
          supervisor_id?: string | null
          tenant_id?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          attendance_date: string
          clock_in: string | null
          clock_out: string | null
          created_at: string
          hours_worked: number | null
          id: string
          job_id: string | null
          notes: string | null
          overtime_hours: number | null
          site_id: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          attendance_date: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          site_id?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          attendance_date?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          hours_worked?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          site_id?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability_rules: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          availability_type: string
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          one_off_end: string | null
          one_off_start: string | null
          rule_type: string
          staff_id: string
          start_time: string | null
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          version_etag: string
          weekday: number | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          availability_type: string
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          one_off_end?: string | null
          one_off_start?: string | null
          rule_type: string
          staff_id: string
          start_time?: string | null
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          version_etag?: string
          weekday?: number | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          availability_type?: string
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          one_off_end?: string | null
          one_off_start?: string | null
          rule_type?: string
          staff_id?: string
          start_time?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          version_etag?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_rules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_certifications: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          certification_name: string
          certification_number: string | null
          created_at: string
          document_file_id: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuing_authority: string | null
          notes: string | null
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certification_name: string
          certification_number?: string | null
          created_at?: string
          document_file_id?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certification_name?: string
          certification_number?: string | null
          created_at?: string
          document_file_id?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_certifications_document_file_id_fkey"
            columns: ["document_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_certifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payroll: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          bank_account: string | null
          bank_routing: string | null
          base_rate: number
          created_at: string
          currency: string
          direct_deposit: boolean
          effective_date: string
          end_date: string | null
          exemptions: number | null
          holiday_rate: number | null
          id: string
          notes: string | null
          overtime_rate: number | null
          pay_type: string
          ssn_encrypted: string | null
          staff_id: string
          tax_filing_status: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bank_account?: string | null
          bank_routing?: string | null
          base_rate?: number
          created_at?: string
          currency?: string
          direct_deposit?: boolean
          effective_date?: string
          end_date?: string | null
          exemptions?: number | null
          holiday_rate?: number | null
          id?: string
          notes?: string | null
          overtime_rate?: number | null
          pay_type?: string
          ssn_encrypted?: string | null
          staff_id: string
          tax_filing_status?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          bank_account?: string | null
          bank_routing?: string | null
          base_rate?: number
          created_at?: string
          currency?: string
          direct_deposit?: boolean
          effective_date?: string
          end_date?: string | null
          exemptions?: number | null
          holiday_rate?: number | null
          id?: string
          notes?: string | null
          overtime_rate?: number | null
          pay_type?: string
          ssn_encrypted?: string | null
          staff_id?: string
          tax_filing_status?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payroll_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payroll_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_positions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          color_hex: string | null
          created_at: string
          department: string | null
          display_order: number
          id: string
          is_active: boolean | null
          notes: string | null
          pay_grade: string | null
          position_code: string
          position_group: string | null
          tenant_id: string
          title: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          color_hex?: string | null
          created_at?: string
          department?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pay_grade?: string | null
          position_code: string
          position_group?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          color_hex?: string | null
          created_at?: string
          department?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pay_grade?: string | null
          position_code?: string
          position_group?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      status_transitions: {
        Row: {
          allowed_roles: string[]
          entity_type: string
          from_status: string
          id: string
          tenant_id: string | null
          to_status: string
        }
        Insert: {
          allowed_roles?: string[]
          entity_type: string
          from_status: string
          id?: string
          tenant_id?: string | null
          to_status: string
        }
        Update: {
          allowed_roles?: string[]
          entity_type?: string
          from_status?: string
          id?: string
          tenant_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_transitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          inventory_location_id: string
          item_id: string
          quantity_on_hand: number
          quantity_reserved: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inventory_location_id: string
          item_id: string
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inventory_location_id?: string
          item_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date: string | null
          from_inventory_location_id: string | null
          id: string
          item_id: string
          moved_at: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          performed_by_user_id: string | null
          quantity: number
          site_job_id: string | null
          tenant_id: string
          to_inventory_location_id: string | null
          type: string | null
          unit_cost: number | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date?: string | null
          from_inventory_location_id?: string | null
          id?: string
          item_id: string
          moved_at?: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          quantity: number
          site_job_id?: string | null
          tenant_id: string
          to_inventory_location_id?: string | null
          type?: string | null
          unit_cost?: number | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date?: string | null
          from_inventory_location_id?: string | null
          id?: string
          item_id?: string
          moved_at?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          quantity?: number
          site_job_id?: string | null
          tenant_id?: string
          to_inventory_location_id?: string | null
          type?: string | null
          unit_cost?: number | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_from_inventory_location_id_fkey"
            columns: ["from_inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_inventory_location_id_fkey"
            columns: ["to_inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_jobs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          billing_rate: number | null
          billing_type: string | null
          contract_ref: string | null
          created_at: string
          end_date: string | null
          id: string
          last_service_date: string | null
          notes: string | null
          performance_score: number | null
          scope_description: string | null
          site_id: string
          site_job_id: string
          start_date: string | null
          status: string
          subcontractor_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          contract_ref?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_service_date?: string | null
          notes?: string | null
          performance_score?: number | null
          scope_description?: string | null
          site_id: string
          site_job_id: string
          start_date?: string | null
          status?: string
          subcontractor_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          contract_ref?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_service_date?: string | null
          notes?: string | null
          performance_score?: number | null
          scope_description?: string | null
          site_id?: string
          site_job_id?: string
          start_date?: string | null
          status?: string
          subcontractor_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          address: Json | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_sites: string[] | null
          availability: Json | null
          business_phone: string | null
          company_name: string
          contact_info: Json | null
          contact_name: string | null
          contact_title: string | null
          created_at: string
          email: string | null
          hourly_rate: number | null
          id: string
          insurance_company: string | null
          insurance_expiration: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          license_expiry: string | null
          license_number: string | null
          mobile_phone: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rate: number | null
          services_provided: string | null
          status: string | null
          subcontractor_code: string
          tax_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
          w9_on_file: boolean
          website: string | null
        }
        Insert: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_sites?: string[] | null
          availability?: Json | null
          business_phone?: string | null
          company_name: string
          contact_info?: Json | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_company?: string | null
          insurance_expiration?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          mobile_phone?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rate?: number | null
          services_provided?: string | null
          status?: string | null
          subcontractor_code: string
          tax_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
          w9_on_file?: boolean
          website?: string | null
        }
        Update: {
          address?: Json | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_sites?: string[] | null
          availability?: Json | null
          business_phone?: string | null
          company_name?: string
          contact_info?: Json | null
          contact_name?: string | null
          contact_title?: string | null
          created_at?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_company?: string | null
          insurance_expiration?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          mobile_phone?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rate?: number | null
          services_provided?: string | null
          status?: string | null
          subcontractor_code?: string
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          w9_on_file?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_catalog: {
        Row: {
          alternative_items: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          barcode: string | null
          billing_rate: number | null
          brand: string | null
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          manufacturer: string | null
          markup_percentage: number | null
          min_stock_level: number | null
          model_number: string | null
          name: string
          notes: string | null
          pack_size: string | null
          ppe_required: boolean
          preferred_vendor: string | null
          product_attributes: string | null
          sds_url: string | null
          supply_status: string | null
          tenant_id: string
          unit: string
          unit_cost: number | null
          updated_at: string
          vendor_sku: string | null
          version_etag: string
        }
        Insert: {
          alternative_items?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          barcode?: string | null
          billing_rate?: number | null
          brand?: string | null
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          markup_percentage?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name: string
          notes?: string | null
          pack_size?: string | null
          ppe_required?: boolean
          preferred_vendor?: string | null
          product_attributes?: string | null
          sds_url?: string | null
          supply_status?: string | null
          tenant_id: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          vendor_sku?: string | null
          version_etag?: string
        }
        Update: {
          alternative_items?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          barcode?: string | null
          billing_rate?: number | null
          brand?: string | null
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          markup_percentage?: number | null
          min_stock_level?: number | null
          model_number?: string | null
          name?: string
          notes?: string | null
          pack_size?: string | null
          ppe_required?: boolean
          preferred_vendor?: string | null
          product_attributes?: string | null
          sds_url?: string | null
          supply_status?: string | null
          tenant_id?: string
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          vendor_sku?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_kit_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          kit_id: string
          quantity: number
          supply_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          kit_id: string
          quantity?: number
          supply_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          kit_id?: string
          quantity?: number
          supply_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "supply_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_kit_items_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_kit_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_kits: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_kits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_deliveries: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          captured_by_user_id: string | null
          created_at: string
          delivered_at: string
          device_info: Json | null
          gps_accuracy_meters: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          ip_address: string | null
          notes: string | null
          order_id: string
          photo_file_id: string | null
          recipient_name: string
          recipient_title: string | null
          signature_file_id: string | null
          tenant_id: string
          updated_at: string
          user_agent: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          captured_by_user_id?: string | null
          created_at?: string
          delivered_at?: string
          device_info?: Json | null
          gps_accuracy_meters?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_id: string
          photo_file_id?: string | null
          recipient_name: string
          recipient_title?: string | null
          signature_file_id?: string | null
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          captured_by_user_id?: string | null
          created_at?: string
          delivered_at?: string
          device_info?: Json | null
          gps_accuracy_meters?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          order_id?: string
          photo_file_id?: string | null
          recipient_name?: string
          recipient_title?: string | null
          signature_file_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supply_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_deliveries_photo_file_id_fkey"
            columns: ["photo_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_deliveries_signature_file_id_fkey"
            columns: ["signature_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_order_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          line_total: number
          notes: string | null
          order_id: string
          quantity_ordered: number
          supply_id: string
          tenant_id: string
          unit_price: number
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          line_total?: number
          notes?: string | null
          order_id: string
          quantity_ordered?: number
          supply_id: string
          tenant_id: string
          unit_price?: number
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          line_total?: number
          notes?: string | null
          order_id?: string
          quantity_ordered?: number
          supply_id?: string
          tenant_id?: string
          unit_price?: number
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "supply_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_items_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_orders: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          delivered_at: string | null
          delivery_date_est: string | null
          delivery_instructions: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_code: string
          order_date: string
          site_id: string | null
          status: string | null
          submitted_at: string | null
          supplier: string | null
          tenant_id: string
          total_amount: number | null
          updated_at: string
          vendor_id: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_date_est?: string | null
          delivery_instructions?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_code: string
          order_date?: string
          site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier?: string | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_date_est?: string | null
          delivery_instructions?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_code?: string
          order_date?: string
          site_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier?: string | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_request_lines: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          item_id: string
          line_notes: string | null
          quantity_fulfilled: number | null
          quantity_requested: number
          supply_request_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          line_notes?: string | null
          quantity_fulfilled?: number | null
          quantity_requested: number
          supply_request_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          line_notes?: string | null
          quantity_fulfilled?: number | null
          quantity_requested?: number
          supply_request_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_request_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_request_lines_supply_request_id_fkey"
            columns: ["supply_request_id"]
            isOneToOne: false
            referencedRelation: "supply_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_request_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          inventory_location_id: string | null
          notes: string | null
          requested_at: string
          requested_by_staff_id: string
          site_id: string | null
          status: string
          submitted_for_approval_at: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inventory_location_id?: string | null
          notes?: string | null
          requested_at?: string
          requested_by_staff_id: string
          site_id?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          inventory_location_id?: string | null
          notes?: string | null
          requested_at?: string
          requested_by_staff_id?: string
          site_id?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_requests_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_requested_by_staff_id_fkey"
            columns: ["requested_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_sequences: {
        Row: {
          current_value: number
          id: string
          prefix: string
          tenant_id: string
        }
        Insert: {
          current_value?: number
          id?: string
          prefix: string
          tenant_id: string
        }
        Update: {
          current_value?: number
          id?: string
          prefix?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_assignments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_at: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          color_hex: string | null
          created_at: string
          id: string
          tag_name: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          tag_name: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          color_hex?: string | null
          created_at?: string
          id?: string
          tag_name?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category_name: string
          created_at: string
          default_area_type: string | null
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category_name: string
          created_at?: string
          default_area_type?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category_name?: string
          created_at?: string
          default_area_type?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_production_rates: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          base_minutes: number
          building_type_code: string | null
          created_at: string
          default_ml_adjustment: number
          effective_date: string | null
          facility_type: string | null
          floor_type_code: string | null
          id: string
          is_active: boolean
          minutes_per_unit: number | null
          notes: string | null
          source: string | null
          task_id: string
          tenant_id: string
          unit_code: string
          unit_type: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          base_minutes: number
          building_type_code?: string | null
          created_at?: string
          default_ml_adjustment?: number
          effective_date?: string | null
          facility_type?: string | null
          floor_type_code?: string | null
          id?: string
          is_active?: boolean
          minutes_per_unit?: number | null
          notes?: string | null
          source?: string | null
          task_id: string
          tenant_id: string
          unit_code?: string
          unit_type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          base_minutes?: number
          building_type_code?: string | null
          created_at?: string
          default_ml_adjustment?: number
          effective_date?: string | null
          facility_type?: string | null
          floor_type_code?: string | null
          id?: string
          is_active?: boolean
          minutes_per_unit?: number | null
          notes?: string | null
          source?: string | null
          task_id?: string
          tenant_id?: string
          unit_code?: string
          unit_type?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_production_rates_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_production_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          area_type_deprecated: string | null
          category: string | null
          code: string
          compliance_standard_deprecated: string | null
          created_at: string
          default_minutes: number | null
          default_minutes_per_unit_deprecated: number | null
          default_units_per_hour_deprecated: number | null
          description: string | null
          floor_type_deprecated: string | null
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          notes: string | null
          position_deprecated: string | null
          priority: string | null
          priority_level: string | null
          production_rate: string | null
          production_rate_sqft_per_hour: number | null
          qc_weight: number | null
          requires_chemical: boolean | null
          requires_ppe: boolean | null
          spec_description: string | null
          status: string | null
          subcategory: string | null
          task_category_id: string | null
          task_code_deprecated: string
          task_description_deprecated: string | null
          task_name_deprecated: string | null
          task_type_deprecated: string | null
          tenant_id: string
          tools_materials: string | null
          unit_code: string
          unit_type_deprecated: string | null
          updated_at: string
          version_etag: string
          work_description: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type_deprecated?: string | null
          category?: string | null
          code: string
          compliance_standard_deprecated?: string | null
          created_at?: string
          default_minutes?: number | null
          default_minutes_per_unit_deprecated?: number | null
          default_units_per_hour_deprecated?: number | null
          description?: string | null
          floor_type_deprecated?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          position_deprecated?: string | null
          priority?: string | null
          priority_level?: string | null
          production_rate?: string | null
          production_rate_sqft_per_hour?: number | null
          qc_weight?: number | null
          requires_chemical?: boolean | null
          requires_ppe?: boolean | null
          spec_description?: string | null
          status?: string | null
          subcategory?: string | null
          task_category_id?: string | null
          task_code_deprecated: string
          task_description_deprecated?: string | null
          task_name_deprecated?: string | null
          task_type_deprecated?: string | null
          tenant_id: string
          tools_materials?: string | null
          unit_code?: string
          unit_type_deprecated?: string | null
          updated_at?: string
          version_etag?: string
          work_description?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          area_type_deprecated?: string | null
          category?: string | null
          code?: string
          compliance_standard_deprecated?: string | null
          created_at?: string
          default_minutes?: number | null
          default_minutes_per_unit_deprecated?: number | null
          default_units_per_hour_deprecated?: number | null
          description?: string | null
          floor_type_deprecated?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          position_deprecated?: string | null
          priority?: string | null
          priority_level?: string | null
          production_rate?: string | null
          production_rate_sqft_per_hour?: number | null
          qc_weight?: number | null
          requires_chemical?: boolean | null
          requires_ppe?: boolean | null
          spec_description?: string | null
          status?: string | null
          subcategory?: string | null
          task_category_id?: string | null
          task_code_deprecated?: string
          task_description_deprecated?: string | null
          task_name_deprecated?: string | null
          task_type_deprecated?: string | null
          tenant_id?: string
          tools_materials?: string | null
          unit_code?: string
          unit_type_deprecated?: string | null
          updated_at?: string
          version_etag?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_task_category_id_fkey"
            columns: ["task_category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          role_code: string
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          role_code: string
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          role_code?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_org_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          city: string | null
          country: string | null
          created_at: string
          currency_code: string | null
          data_retention_days: number | null
          duns_number: string | null
          id: string
          legal_name: string | null
          main_phone: string | null
          postal_code: string | null
          state: string | null
          status: string
          tenant_id: string
          timezone: string | null
          updated_at: string
          version_etag: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string | null
          data_retention_days?: number | null
          duns_number?: string | null
          id?: string
          legal_name?: string | null
          main_phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tenant_id: string
          timezone?: string | null
          updated_at?: string
          version_etag?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency_code?: string | null
          data_retention_days?: number | null
          duns_number?: string | null
          id?: string
          legal_name?: string | null
          main_phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
          version_etag?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_org_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          default_timezone: string
          id: string
          name: string
          tenant_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_timezone?: string
          id?: string
          name: string
          tenant_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_timezone?: string
          id?: string
          name?: string
          tenant_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_asset_checkouts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checked_out_at: string
          created_at: string
          id: string
          requirement_id: string
          returned_at: string | null
          staff_id: string
          tenant_id: string
          ticket_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_out_at?: string
          created_at?: string
          id?: string
          requirement_id: string
          returned_at?: string | null
          staff_id: string
          tenant_id: string
          ticket_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_out_at?: string
          created_at?: string
          id?: string
          requirement_id?: string
          returned_at?: string | null
          staff_id?: string
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_asset_checkouts_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "site_asset_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_asset_checkouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_asset_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_asset_checkouts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assignment_status: string
          assignment_type: string
          created_at: string
          id: string
          overtime_flag: boolean
          released_at: string | null
          released_by: string | null
          role: string | null
          staff_id: string
          tenant_id: string
          ticket_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignment_status?: string
          assignment_type?: string
          created_at?: string
          id?: string
          overtime_flag?: boolean
          released_at?: string | null
          released_by?: string | null
          role?: string | null
          staff_id: string
          tenant_id: string
          ticket_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignment_status?: string
          assignment_type?: string
          created_at?: string
          id?: string
          overtime_flag?: boolean
          released_at?: string | null
          released_by?: string | null
          role?: string | null
          staff_id?: string
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_checklist_items: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checked_at: string | null
          checked_by: string | null
          checklist_id: string
          created_at: string
          id: string
          is_checked: boolean
          is_required: boolean
          label: string
          notes: string | null
          requires_photo: boolean
          section: string | null
          sort_order: number
          template_item_id: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          checklist_id: string
          created_at?: string
          id?: string
          is_checked?: boolean
          is_required?: boolean
          label: string
          notes?: string | null
          requires_photo?: boolean
          section?: string | null
          sort_order?: number
          template_item_id?: string | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          checklist_id?: string
          created_at?: string
          id?: string
          is_checked?: boolean
          is_required?: boolean
          label?: string
          notes?: string | null
          requires_photo?: boolean
          section?: string | null
          sort_order?: number
          template_item_id?: string | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "ticket_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklist_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_checklists: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          status: string
          template_id: string | null
          tenant_id: string
          ticket_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          status?: string
          template_id?: string | null
          tenant_id: string
          ticket_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          status?: string
          template_id?: string | null
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_checklists_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_photos: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          caption: string | null
          checklist_item_id: string | null
          created_at: string
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number | null
          storage_path: string
          tenant_id: string
          ticket_id: string
          updated_at: string
          uploaded_by: string | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          caption?: string | null
          checklist_item_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string
          original_filename: string
          size_bytes?: number | null
          storage_path: string
          tenant_id: string
          ticket_id: string
          updated_at?: string
          uploaded_by?: string | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          caption?: string | null
          checklist_item_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number | null
          storage_path?: string
          tenant_id?: string
          ticket_id?: string
          updated_at?: string
          uploaded_by?: string | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_photos_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "ticket_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_photos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_supply_usage: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          logged_at: string
          logged_by: string | null
          notes: string | null
          quantity_used: number
          supply_id: string
          tenant_id: string
          ticket_id: string
          unit: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          notes?: string | null
          quantity_used?: number
          supply_id: string
          tenant_id: string
          ticket_id: string
          unit?: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          notes?: string | null
          quantity_used?: number
          supply_id?: string
          tenant_id?: string
          ticket_id?: string
          unit?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_supply_usage_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supply_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_supply_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_supply_usage_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approval_notes: string | null
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          break_minutes: number
          check_in_event_id: string | null
          check_out_event_id: string | null
          clock_in: string | null
          clock_in_at: string | null
          clock_in_location: Json | null
          clock_out: string | null
          clock_out_at: string | null
          clock_out_location: Json | null
          created_at: string
          duration_minutes: number | null
          end_at: string | null
          flags: string[] | null
          id: string
          is_approved: boolean | null
          pay_code: string | null
          site_id: string | null
          staff_id: string
          start_at: string
          status: string
          tenant_id: string
          ticket_id: string | null
          updated_at: string
          version_etag: string
          work_minutes: number | null
        }
        Insert: {
          approval_notes?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          break_minutes?: number
          check_in_event_id?: string | null
          check_out_event_id?: string | null
          clock_in?: string | null
          clock_in_at?: string | null
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_at?: string | null
          clock_out_location?: Json | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          flags?: string[] | null
          id?: string
          is_approved?: boolean | null
          pay_code?: string | null
          site_id?: string | null
          staff_id: string
          start_at: string
          status?: string
          tenant_id: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
          work_minutes?: number | null
        }
        Update: {
          approval_notes?: string | null
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          break_minutes?: number
          check_in_event_id?: string | null
          check_out_event_id?: string | null
          clock_in?: string | null
          clock_in_at?: string | null
          clock_in_location?: Json | null
          clock_out?: string | null
          clock_out_at?: string | null
          clock_out_location?: Json | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          flags?: string[] | null
          id?: string
          is_approved?: boolean | null
          pay_code?: string | null
          site_id?: string | null
          staff_id?: string
          start_at?: string
          status?: string
          tenant_id?: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
          work_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_check_in_event_id_fkey"
            columns: ["check_in_event_id"]
            isOneToOne: false
            referencedRelation: "time_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_check_out_event_id_fkey"
            columns: ["check_out_event_id"]
            isOneToOne: false
            referencedRelation: "time_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_events: {
        Row: {
          accuracy_meters: number | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          event_type: string
          id: string
          is_within_geofence: boolean | null
          lat: number | null
          lng: number | null
          notes: string | null
          pin_used: boolean
          recorded_at: string
          site_id: string | null
          staff_id: string
          tenant_id: string
          ticket_id: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          accuracy_meters?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_within_geofence?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pin_used?: boolean
          recorded_at?: string
          site_id?: string | null
          staff_id: string
          tenant_id: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          accuracy_meters?: number | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_within_geofence?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          pin_used?: boolean
          recorded_at?: string
          site_id?: string | null
          staff_id?: string
          tenant_id?: string
          ticket_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_exceptions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          exception_type: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          staff_id: string
          tenant_id: string
          time_entry_id: string | null
          time_event_id: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          exception_type: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          staff_id: string
          tenant_id: string
          time_entry_id?: string | null
          time_event_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          exception_type?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          staff_id?: string
          tenant_id?: string
          time_entry_id?: string | null
          time_event_id?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_exceptions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_exceptions_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_exceptions_time_event_id_fkey"
            columns: ["time_event_id"]
            isOneToOne: false
            referencedRelation: "time_events"
            referencedColumns: ["id"]
          },
        ]
      }
      time_policies: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          clock_in_restriction: string
          created_at: string
          early_clock_in_minutes: number | null
          id: string
          is_active: boolean
          late_clock_out_minutes: number | null
          policy_name: string
          requires_photo_on_manual_edit: boolean
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          clock_in_restriction: string
          created_at?: string
          early_clock_in_minutes?: number | null
          id?: string
          is_active?: boolean
          late_clock_out_minutes?: number | null
          policy_name: string
          requires_photo_on_manual_edit?: boolean
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          clock_in_restriction?: string
          created_at?: string
          early_clock_in_minutes?: number | null
          id?: string
          is_active?: boolean
          late_clock_out_minutes?: number | null
          policy_name?: string
          requires_photo_on_manual_edit?: boolean
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_punches: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          geofence_id: string | null
          id: string
          job_visit_id: string | null
          lat: number | null
          lng: number | null
          method: string
          nfc_tag_id: string | null
          note: string | null
          punch_type: string
          punched_at: string
          site_job_id: string | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
          within_geofence: boolean | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          job_visit_id?: string | null
          lat?: number | null
          lng?: number | null
          method: string
          nfc_tag_id?: string | null
          note?: string | null
          punch_type: string
          punched_at?: string
          site_job_id?: string | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
          within_geofence?: boolean | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          job_visit_id?: string | null
          lat?: number | null
          lng?: number | null
          method?: string
          nfc_tag_id?: string | null
          note?: string | null
          punch_type?: string
          punched_at?: string
          site_job_id?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
          within_geofence?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "time_punches_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_job_visit_id_fkey"
            columns: ["job_visit_id"]
            isOneToOne: false
            referencedRelation: "job_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_nfc_tag_id_fkey"
            columns: ["nfc_tag_id"]
            isOneToOne: false
            referencedRelation: "nfc_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_approvals: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          notes: string | null
          tenant_id: string
          timesheet_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          notes?: string | null
          tenant_id: string
          timesheet_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_approvals_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          break_hours: number
          created_at: string
          exception_count: number
          id: string
          notes: string | null
          overtime_hours: number
          qbo_sync_attempts: number
          qbo_sync_error: string | null
          qbo_sync_id: string | null
          qbo_sync_status: string | null
          qbo_synced_at: string | null
          regular_hours: number
          staff_id: string
          status: string
          tenant_id: string
          total_hours: number
          updated_at: string
          version_etag: string
          week_end: string
          week_start: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          break_hours?: number
          created_at?: string
          exception_count?: number
          id?: string
          notes?: string | null
          overtime_hours?: number
          qbo_sync_attempts?: number
          qbo_sync_error?: string | null
          qbo_sync_id?: string | null
          qbo_sync_status?: string | null
          qbo_synced_at?: string | null
          regular_hours?: number
          staff_id: string
          status?: string
          tenant_id: string
          total_hours?: number
          updated_at?: string
          version_etag?: string
          week_end: string
          week_start: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          break_hours?: number
          created_at?: string
          exception_count?: number
          id?: string
          notes?: string | null
          overtime_hours?: number
          qbo_sync_attempts?: number
          qbo_sync_error?: string | null
          qbo_sync_id?: string | null
          qbo_sync_status?: string | null
          qbo_synced_at?: string | null
          regular_hours?: number
          staff_id?: string
          status?: string
          tenant_id?: string
          total_hours?: number
          updated_at?: string
          version_etag?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          certificate_file_id: string | null
          completed_date: string
          course_id: string
          created_at: string
          expiry_date: string | null
          id: string
          instructor: string | null
          notes: string | null
          passed: boolean | null
          score: number | null
          staff_id: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_file_id?: string | null
          completed_date: string
          course_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          instructor?: string | null
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          certificate_file_id?: string | null
          completed_date?: string
          course_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          instructor?: string | null
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_certificate_file_id_fkey"
            columns: ["certificate_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          category: string | null
          course_code: string
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          notes: string | null
          provider: string | null
          recurrence_months: number | null
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          course_code: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          notes?: string | null
          provider?: string | null
          recurrence_months?: number | null
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          category?: string | null
          course_code?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          notes?: string | null
          provider?: string | null
          recurrence_months?: number | null
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_segments: {
        Row: {
          actual_minutes: number | null
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          estimated_minutes: number | null
          from_stop_id: string
          id: string
          note: string | null
          payable_minutes: number
          route_id: string
          source: string
          status: string
          tenant_id: string
          to_stop_id: string
          travel_end_at: string | null
          travel_start_at: string | null
          updated_at: string
          version_etag: string
        }
        Insert: {
          actual_minutes?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          estimated_minutes?: number | null
          from_stop_id: string
          id?: string
          note?: string | null
          payable_minutes?: number
          route_id: string
          source?: string
          status?: string
          tenant_id: string
          to_stop_id: string
          travel_end_at?: string | null
          travel_start_at?: string | null
          updated_at?: string
          version_etag?: string
        }
        Update: {
          actual_minutes?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          estimated_minutes?: number | null
          from_stop_id?: string
          id?: string
          note?: string | null
          payable_minutes?: number
          route_id?: string
          source?: string
          status?: string
          tenant_id?: string
          to_stop_id?: string
          travel_end_at?: string | null
          travel_start_at?: string | null
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_segments_from_stop_id_fkey"
            columns: ["from_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_segments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_segments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "travel_segments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "travel_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_segments_to_stop_id_fkey"
            columns: ["to_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_grants: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          permission: string
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_client_access: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_subcontractor_job_assignments"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "user_client_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          preferences: Json
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_at: string
          assigned_by_user_id: string | null
          id: string
          role_id: string
          tenant_id: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string
          assigned_by_user_id?: string | null
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_at?: string
          assigned_by_user_id?: string | null
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_security_profiles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          email_verified: boolean
          id: string
          last_login_at: string | null
          mfa_enabled: boolean
          notification_channels: string[] | null
          password_hash: string | null
          preferred_language: string | null
          reset_token: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          user_status: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email_verified?: boolean
          id?: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          notification_channels?: string[] | null
          password_hash?: string | null
          preferred_language?: string | null
          reset_token?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          user_status?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email_verified?: boolean
          id?: string
          last_login_at?: string | null
          mfa_enabled?: boolean
          notification_channels?: string[] | null
          password_hash?: string | null
          preferred_language?: string | null
          reset_token?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          user_status?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_security_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          revoked_at: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_site_assignments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          role_at_site: string | null
          site_id: string
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          role_at_site?: string | null
          site_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          role_at_site?: string | null
          site_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_site_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_team_memberships: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          role_in_team: string
          team_name: string
          tenant_id: string
          updated_at: string
          user_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role_in_team?: string
          team_name: string
          tenant_id: string
          updated_at?: string
          user_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role_in_team?: string
          team_name?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_team_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_checkouts: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checked_out_at: string
          checkout_odometer: number | null
          condition_notes: string | null
          created_at: string
          dvir_in_status: string
          dvir_out_status: string
          fuel_level_in: string | null
          fuel_level_out: string | null
          id: string
          return_notes: string | null
          return_odometer: number | null
          returned_at: string | null
          route_id: string | null
          staff_id: string | null
          status: string
          tenant_id: string
          ticket_id: string | null
          updated_at: string
          vehicle_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_out_at?: string
          checkout_odometer?: number | null
          condition_notes?: string | null
          created_at?: string
          dvir_in_status?: string
          dvir_out_status?: string
          fuel_level_in?: string | null
          fuel_level_out?: string | null
          id?: string
          return_notes?: string | null
          return_odometer?: number | null
          returned_at?: string | null
          route_id?: string | null
          staff_id?: string | null
          status?: string
          tenant_id: string
          ticket_id?: string | null
          updated_at?: string
          vehicle_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checked_out_at?: string
          checkout_odometer?: number | null
          condition_notes?: string | null
          created_at?: string
          dvir_in_status?: string
          dvir_out_status?: string
          fuel_level_in?: string | null
          fuel_level_out?: string | null
          id?: string
          return_notes?: string | null
          return_odometer?: number | null
          returned_at?: string | null
          route_id?: string | null
          staff_id?: string | null
          status?: string
          tenant_id?: string
          ticket_id?: string | null
          updated_at?: string
          vehicle_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checkouts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "work_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checkouts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_dvir_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checklist_json: Json
          checkout_id: string
          created_at: string
          fuel_level: string | null
          id: string
          issues_found: boolean
          notes: string | null
          odometer: number | null
          report_type: string
          reported_at: string
          route_id: string | null
          staff_id: string | null
          tenant_id: string
          updated_at: string
          vehicle_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checklist_json?: Json
          checkout_id: string
          created_at?: string
          fuel_level?: string | null
          id?: string
          issues_found?: boolean
          notes?: string | null
          odometer?: number | null
          report_type: string
          reported_at?: string
          route_id?: string | null
          staff_id?: string | null
          tenant_id: string
          updated_at?: string
          vehicle_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checklist_json?: Json
          checkout_id?: string
          created_at?: string
          fuel_level?: string | null
          id?: string
          issues_found?: boolean
          notes?: string | null
          odometer?: number | null
          report_type?: string
          reported_at?: string
          route_id?: string | null
          staff_id?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_dvir_logs_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "vehicle_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dvir_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_logs: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          checkout_id: string | null
          created_at: string
          fueled_at: string
          gallons: number
          id: string
          notes: string | null
          odometer: number | null
          route_id: string | null
          staff_id: string | null
          station_name: string | null
          tenant_id: string
          total_cost: number | null
          updated_at: string
          vehicle_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checkout_id?: string | null
          created_at?: string
          fueled_at?: string
          gallons: number
          id?: string
          notes?: string | null
          odometer?: number | null
          route_id?: string | null
          staff_id?: string | null
          station_name?: string | null
          tenant_id: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          checkout_id?: string | null
          created_at?: string
          fueled_at?: string
          gallons?: number
          id?: string
          notes?: string | null
          odometer?: number | null
          route_id?: string | null
          staff_id?: string | null
          station_name?: string | null
          tenant_id?: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_logs_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "vehicle_checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_load_sheet"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "v_night_bridge"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          next_service_date: string | null
          next_service_odometer: number | null
          notes: string | null
          odometer: number | null
          performed_by: string | null
          service_date: string
          service_type: string
          tenant_id: string
          updated_at: string
          vehicle_id: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          next_service_date?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          performed_by?: string | null
          service_date: string
          service_type: string
          tenant_id: string
          updated_at?: string
          vehicle_id: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          next_service_date?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          performed_by?: string | null
          service_date?: string
          service_type?: string
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          color: string | null
          created_at: string
          current_value: number | null
          id: string
          last_maintenance_date: string | null
          license_plate: string | null
          maintenance_interval_days: number | null
          make: string | null
          mileage: number | null
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          plate_number: string | null
          registration_expiry: string | null
          status: string
          tenant_id: string
          updated_at: string
          vehicle_code: string
          version_etag: string
          vin: string | null
          year: number | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          last_maintenance_date?: string | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          plate_number?: string | null
          registration_expiry?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_code: string
          version_etag?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          last_maintenance_date?: string | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          plate_number?: string | null
          registration_expiry?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_code?: string
          version_etag?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor_name: string
          version_etag: string
          website_url: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor_name: string
          version_etag?: string
          website_url?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor_name?: string
          version_etag?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          secret_token: string | null
          target_url: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          secret_token?: string | null
          target_url: string
          tenant_id: string
          updated_at?: string
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          secret_token?: string | null
          target_url?: string
          tenant_id?: string
          updated_at?: string
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tickets: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string[] | null
          audit_trail: Json | null
          checklist: Json | null
          completed_at: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          end_time: string | null
          id: string
          job_id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          planning_status: string
          position_code: string | null
          priority: string | null
          progress: number | null
          published_at: string | null
          published_by: string | null
          required_staff_count: number
          schedule_period_id: string | null
          scheduled_at: string | null
          scheduled_date: string
          service_id: string | null
          site_id: string
          start_time: string | null
          status: string
          tenant_id: string
          ticket_code: string
          title: string | null
          type: string | null
          updated_at: string
          verification_photos: Json | null
          version_etag: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string[] | null
          audit_trail?: Json | null
          checklist?: Json | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          end_time?: string | null
          id?: string
          job_id: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          planning_status?: string
          position_code?: string | null
          priority?: string | null
          progress?: number | null
          published_at?: string | null
          published_by?: string | null
          required_staff_count?: number
          schedule_period_id?: string | null
          scheduled_at?: string | null
          scheduled_date: string
          service_id?: string | null
          site_id: string
          start_time?: string | null
          status?: string
          tenant_id: string
          ticket_code: string
          title?: string | null
          type?: string | null
          updated_at?: string
          verification_photos?: Json | null
          version_etag?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string[] | null
          audit_trail?: Json | null
          checklist?: Json | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          end_time?: string | null
          id?: string
          job_id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          planning_status?: string
          position_code?: string | null
          priority?: string | null
          progress?: number | null
          published_at?: string | null
          published_by?: string | null
          required_staff_count?: number
          schedule_period_id?: string | null
          scheduled_at?: string | null
          scheduled_date?: string
          service_id?: string | null
          site_id?: string
          start_time?: string | null
          status?: string
          tenant_id?: string
          ticket_code?: string
          title?: string | null
          type?: string | null
          updated_at?: string
          verification_photos?: Json | null
          version_etag?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_tickets_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tickets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tickets_schedule_period_id_fkey"
            columns: ["schedule_period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tickets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_load_sheet: {
        Row: {
          direction: string | null
          route_date: string | null
          route_id: string | null
          route_owner_staff_id: string | null
          site_breakdown: Json | null
          supply_id: string | null
          supply_name: string | null
          tenant_id: string | null
          total_quantity: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_stop_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_route_owner_staff_id_fkey"
            columns: ["route_owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      v_night_bridge: {
        Row: {
          floater_code: string | null
          floater_name: string | null
          mileage_end: number | null
          mileage_start: number | null
          photos_uploaded: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          route_date: string | null
          route_id: string | null
          route_status: string | null
          shift_ended_at: string | null
          shift_review_status: string | null
          shift_started_at: string | null
          shift_summary: Json | null
          stops_completed: number | null
          stops_skipped: number | null
          stops_total: number | null
          tenant_id: string | null
          vehicle_code: string | null
          vehicle_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_subcontractor_job_assignments: {
        Row: {
          billing_rate: number | null
          billing_type: string | null
          client_code: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          job_code: string | null
          job_name: string | null
          last_service_date: string | null
          performance_score: number | null
          scope_description: string | null
          site_code: string | null
          site_id: string | null
          site_job_id: string | null
          site_name: string | null
          start_date: string | null
          status: string | null
          subcontractor_code: string | null
          subcontractor_id: string | null
          subcontractor_name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_site_job_id_fkey"
            columns: ["site_job_id"]
            isOneToOne: false
            referencedRelation: "site_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      complete_periodic_task: {
        Args: {
          p_completed_at?: string
          p_periodic_id: string
          p_route_id?: string
        }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          auto_add_to_route: boolean
          created_at: string
          custom_interval_days: number | null
          description_key: string | null
          description_override: string | null
          evidence_required: boolean
          frequency: string
          id: string
          last_completed_at: string | null
          last_completed_route_id: string | null
          next_due_date: string
          notes: string | null
          periodic_code: string
          preferred_staff_id: string | null
          site_job_id: string
          status: string
          task_type: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }
        SetofOptions: {
          from: "*"
          to: "periodic_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_bid_to_job: {
        Args: {
          p_conversion_mode?: string
          p_pricing_option_id?: string
          p_proposal_id: string
          p_site_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      create_inspection_followup_ticket: {
        Args: { p_issue_id: string }
        Returns: string
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      fn_accept_coverage: {
        Args: { p_offer_id: string; p_response_note?: string }
        Returns: Json
      }
      fn_accept_shift_trade: {
        Args: { p_trade_id: string }
        Returns: undefined
      }
      fn_apply_shift_trade: { Args: { p_trade_id: string }; Returns: undefined }
      fn_approve_shift_trade: {
        Args: { p_trade_id: string }
        Returns: undefined
      }
      fn_auto_capture_travel_segment: {
        Args: {
          p_from_stop_id: string
          p_route_id: string
          p_to_stop_id: string
          p_travel_end_at?: string
        }
        Returns: string
      }
      fn_cancel_shift_trade: {
        Args: { p_trade_id: string }
        Returns: undefined
      }
      fn_current_staff_id: { Args: never; Returns: string }
      fn_deny_shift_trade: {
        Args: { p_manager_note?: string; p_trade_id: string }
        Returns: undefined
      }
      fn_finalize_payroll_export: {
        Args: {
          p_exported_file_checksum?: string
          p_exported_file_path?: string
          p_run_id: string
        }
        Returns: Json
      }
      fn_generate_payroll_export_preview: {
        Args: {
          p_mapping_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: string
      }
      fn_is_ticket_locked: { Args: { p_ticket_id: string }; Returns: boolean }
      fn_lock_schedule_period: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      fn_offer_coverage: {
        Args: {
          p_callout_event_id: string
          p_candidate_staff_id: string
          p_expires_in_minutes?: number
        }
        Returns: string
      }
      fn_publish_schedule_period: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      fn_report_callout: {
        Args: {
          p_affected_staff_id: string
          p_reason: string
          p_resolution_note?: string
          p_route_id?: string
          p_route_stop_id?: string
          p_site_id?: string
          p_work_ticket_id?: string
        }
        Returns: string
      }
      fn_request_shift_trade: {
        Args: {
          p_initiator_note?: string
          p_request_type?: string
          p_target_staff_id?: string
          p_ticket_id: string
        }
        Returns: string
      }
      fn_route_complete_stop: {
        Args: { p_note?: string; p_route_stop_id: string }
        Returns: Json
      }
      fn_route_start_stop: {
        Args: { p_note?: string; p_route_stop_id: string }
        Returns: {
          access_window_end: string | null
          access_window_start: string | null
          actual_end_at: string | null
          actual_start_at: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          arrived_at: string | null
          created_at: string
          departed_at: string | null
          estimated_travel_minutes: number | null
          id: string
          is_locked: boolean
          planned_end_at: string | null
          planned_start_at: string | null
          route_id: string
          site_id: string | null
          site_job_id: string
          skip_notes: string | null
          skip_reason: string | null
          status: string
          stop_order: number
          stop_status: string | null
          tenant_id: string
          updated_at: string
          version_etag: string
          work_ticket_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "route_stops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_validate_schedule_period: {
        Args: { p_period_id: string }
        Returns: {
          conflict_count: number
          conflict_type: string
        }[]
      }
      fn_verify_site_pin: {
        Args: { p_pin: string; p_site_id: string }
        Returns: boolean
      }
      generate_daily_routes: {
        Args: { p_target_date: string; p_tenant_id: string }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date: string | null
          id: string
          key_box_number: string | null
          locked_at: string | null
          locked_by: string | null
          mileage_end: number | null
          mileage_start: number | null
          notes: string | null
          personal_items_removed: boolean | null
          planned_end: string | null
          planned_start: string | null
          published_at: string | null
          published_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          route_date: string
          route_order: number | null
          route_owner_staff_id: string | null
          route_type: string
          schedule_period_id: string | null
          shift_ended_at: string | null
          shift_review_status: string | null
          shift_started_at: string | null
          shift_summary: Json | null
          site_id: string | null
          status: string
          tasks: string[] | null
          template_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          vehicle_cleaned: boolean | null
          version_etag: string
        }[]
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_job_code: {
        Args: {
          p_service_code: string
          p_site_code: string
          p_tenant_id: string
        }
        Returns: string
      }
      has_any_role: {
        Args: { check_roles: string[]; check_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { check_role: string; check_user_id: string }
        Returns: boolean
      }
      next_code: {
        Args: { p_padding?: number; p_prefix: string; p_tenant_id: string }
        Returns: string
      }
      poll_qbo_pending_timesheets: {
        Args: { p_batch_size?: number }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          break_hours: number
          created_at: string
          exception_count: number
          id: string
          notes: string | null
          overtime_hours: number
          qbo_sync_attempts: number
          qbo_sync_error: string | null
          qbo_sync_id: string | null
          qbo_sync_status: string | null
          qbo_synced_at: string | null
          regular_hours: number
          staff_id: string
          status: string
          tenant_id: string
          total_hours: number
          updated_at: string
          version_etag: string
          week_end: string
          week_start: string
        }[]
        SetofOptions: {
          from: "*"
          to: "timesheets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      poll_queued_sends: {
        Args: { p_batch_size?: number }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          idempotency_key: string
          proposal_id: string
          provider_message_id: string | null
          public_token: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          version_etag: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sales_proposal_sends"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      poll_scheduled_followups: {
        Args: { p_batch_size?: number }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          id: string
          scheduled_at: string
          sent_at: string | null
          sequence_id: string
          status: string
          step_number: number
          tenant_id: string
          updated_at: string
          version_etag: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sales_followup_sends"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      set_ticket_status: {
        Args: { p_status: string; p_ticket_id: string }
        Returns: undefined
      }
      user_can_access_client: {
        Args: { p_client_id: string; p_user_id: string }
        Returns: boolean
      }
      user_can_access_site: {
        Args: { check_site_id: string; check_user_id: string }
        Returns: boolean
      }
      validate_status_transition: {
        Args: {
          p_entity_type: string
          p_from_status: string
          p_tenant_id: string
          p_to_status: string
        }
        Returns: boolean
      }
      write_audit_event:
        | {
            Args: {
              p_action: string
              p_actor_user_id?: string
              p_after?: Json
              p_before?: Json
              p_entity_code: string
              p_entity_id: string
              p_entity_type: string
              p_tenant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_actor_user_id?: string
              p_after?: Json
              p_before?: Json
              p_device_id?: string
              p_entity_code: string
              p_entity_id: string
              p_entity_type: string
              p_geo_lat?: number
              p_geo_long?: number
              p_ip_address?: string
              p_reason?: string
              p_request_path?: string
              p_tenant_id: string
              p_user_agent?: string
            }
            Returns: string
          }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
