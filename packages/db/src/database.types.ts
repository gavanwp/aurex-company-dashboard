// Mirror of supabase/migrations — keep in lockstep. Once a Supabase stack is
// connected, regenerate with:
//   supabase gen types typescript --local > packages/db/src/database.types.ts

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WorkspaceRoleDb =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'member'
  | 'sales'
  | 'finance'
  | 'hr'
  | 'client'
  | 'guest'

export type MemberSpecializationDb = 'developer' | 'designer' | 'seo' | 'content' | 'marketing'
export type ClientStatusDb = 'prospect' | 'active' | 'paused' | 'churned'
export type DealStageDb = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type ProjectStatusDb = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
export type TaskStatusDb = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'
export type TaskPriorityDb = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: WorkspaceRoleDb
          specialization: MemberSpecializationDb | null
          created_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: WorkspaceRoleDb
          specialization?: MemberSpecializationDb | null
          created_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRoleDb
          specialization?: MemberSpecializationDb | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          workspace_id: string
          name: string
          website: string | null
          industry: string | null
          status: ClientStatusDb
          owner_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          website?: string | null
          industry?: string | null
          status?: ClientStatusDb
          owner_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          website?: string | null
          industry?: string | null
          status?: ClientStatusDb
          owner_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          id: string
          workspace_id: string
          client_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          title: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          client_id?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          client_id?: string | null
          full_name?: string
          email?: string | null
          phone?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      crm_deals: {
        Row: {
          id: string
          workspace_id: string
          client_id: string | null
          contact_id: string | null
          title: string
          stage: DealStageDb
          value_cents: number | null
          currency: string
          probability: number | null
          expected_close_date: string | null
          owner_id: string | null
          source: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          client_id?: string | null
          contact_id?: string | null
          title: string
          stage?: DealStageDb
          value_cents?: number | null
          currency?: string
          probability?: number | null
          expected_close_date?: string | null
          owner_id?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          client_id?: string | null
          contact_id?: string | null
          title?: string
          stage?: DealStageDb
          value_cents?: number | null
          currency?: string
          probability?: number | null
          expected_close_date?: string | null
          owner_id?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          client_id: string | null
          name: string
          code: string | null
          description: string | null
          status: ProjectStatusDb
          color: string | null
          start_date: string | null
          due_date: string | null
          budget_cents: number | null
          owner_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          client_id?: string | null
          name: string
          code?: string | null
          description?: string | null
          status?: ProjectStatusDb
          color?: string | null
          start_date?: string | null
          due_date?: string | null
          budget_cents?: number | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          client_id?: string | null
          name?: string
          code?: string | null
          description?: string | null
          status?: ProjectStatusDb
          color?: string | null
          start_date?: string | null
          due_date?: string | null
          budget_cents?: number | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          title: string
          description: string | null
          status: TaskStatusDb
          priority: TaskPriorityDb
          assignee_id: string | null
          reporter_id: string | null
          due_date: string | null
          estimate_hours: number | null
          position: number
          labels: string[]
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          title: string
          description?: string | null
          status?: TaskStatusDb
          priority?: TaskPriorityDb
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          position?: number
          labels?: string[]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          title?: string
          description?: string | null
          status?: TaskStatusDb
          priority?: TaskPriorityDb
          assignee_id?: string | null
          reporter_id?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          position?: number
          labels?: string[]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          id: string
          workspace_id: string
          task_id: string
          author_id: string | null
          body: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          task_id: string
          author_id?: string | null
          body: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          task_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          id: string
          workspace_id: string
          actor_id: string | null
          event_type: string
          entity_type: string
          entity_id: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          actor_id?: string | null
          event_type: string
          entity_type: string
          entity_id?: string | null
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          actor_id?: string | null
          event_type?: string
          entity_type?: string
          entity_id?: string | null
          payload?: Json
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          workspace_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          type: string
          title: string
          body: string | null
          entity_type: string | null
          entity_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          type: string
          title: string
          body?: string | null
          entity_type?: string | null
          entity_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          entity_type?: string | null
          entity_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_workspace: {
        Args: { workspace_name: string }
        Returns: Database['public']['Tables']['workspaces']['Row']
      }
      is_workspace_member: {
        Args: { ws_id: string }
        Returns: boolean
      }
      workspace_role_of: {
        Args: { ws_id: string }
        Returns: WorkspaceRoleDb
      }
      uuid_v7: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      workspace_role: WorkspaceRoleDb
      member_specialization: MemberSpecializationDb
      client_status: ClientStatusDb
      deal_stage: DealStageDb
      project_status: ProjectStatusDb
      task_status: TaskStatusDb
      task_priority: TaskPriorityDb
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
