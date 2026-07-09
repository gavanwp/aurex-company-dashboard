// Mirror of supabase/migrations — keep in lockstep. Once a Supabase stack is
// connected, regenerate with:
//   supabase gen types typescript --local > packages/db/src/database.types.ts
//
// NOTE: the table blocks for migrations 0006–0011 (documents/KB, AI foundation,
// finance, proposals/contracts, meetings/calendar, automations/jobs) are
// HAND-MAINTAINED pending `supabase gen types` regeneration against a running
// stack. Their status-ish columns are text + CHECK in Postgres (not native
// enums), so the *Db unions below for them will not appear under Enums when
// regenerated.

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

// text + CHECK unions (0006–0011) — hand-maintained, see header note.
export type KbSpaceAclKindDb = 'workspace' | 'role' | 'members' | 'client_facing'
export type KbVerificationStateDb = 'verified' | 'needs_review' | 'stale'
export type DocumentVersionCauseDb = 'manual' | 'major_edit' | 'publish' | 'restore'
export type FileAvStatusDb = 'pending' | 'clean' | 'infected' | 'quarantined'
export type AiMessageRoleDb = 'user' | 'assistant' | 'tool' | 'system'
export type AiRunTriggerDb = 'chat' | 'proactive' | 'automation'
export type AiRunStatusDb = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type AiRiskClassDb = 'low' | 'medium' | 'high'
export type AiApprovalDecisionDb = 'approved' | 'rejected'
export type MemoryScopeDb = 'user' | 'workspace'
export type MemoryKindDb = 'preference' | 'fact' | 'instruction'
export type EmbeddingSourceTypeDb =
  | 'document'
  | 'kb_page'
  | 'meeting'
  | 'email'
  | 'file'
  | 'task'
  | 'project'
  | 'client'
export type InvoiceStatusDb = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void'
export type InvoiceScheduleSourceDb = 'contract' | 'retainer' | 'milestones'
export type InvoiceScheduleCadenceDb = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'milestone'
export type ExpenseApprovalStatusDb = 'pending' | 'approved' | 'rejected'
export type PaymentMethodDb = 'stripe' | 'bank' | 'manual'
export type ProposalStatusDb =
  | 'draft'
  | 'internal_review'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
export type ProposalAcceptMethodDb = 'esign' | 'checkbox'
export type ContractTypeDb = 'msa' | 'sow' | 'nda' | 'retainer' | 'employment' | 'custom'
export type ContractStatusDb =
  | 'draft'
  | 'review'
  | 'sent'
  | 'signed'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'terminated'
export type MeetingTypeDb = 'internal' | 'client' | 'sales' | 'standup'
export type MeetingStatusDb = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type CalendarEventSourceDb = 'native' | 'synced' | 'system'
export type AutomationStatusDb = 'draft' | 'active' | 'paused'
export type AutomationScopeDb = 'workspace' | 'project' | 'module'
export type AutomationRunStatusDb = 'running' | 'succeeded' | 'failed' | 'cancelled'
export type JobStatusDb = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead'

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
      kb_spaces: {
        Row: {
          id: string
          workspace_id: string
          name: string
          purpose: string | null
          icon: string | null
          acl_kind: KbSpaceAclKindDb
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          purpose?: string | null
          icon?: string | null
          acl_kind?: KbSpaceAclKindDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          purpose?: string | null
          icon?: string | null
          acl_kind?: KbSpaceAclKindDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          space_id: string | null
          title: string
          icon: string | null
          content: Json
          current_version: number
          is_template: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          space_id?: string | null
          title: string
          icon?: string | null
          content?: Json
          current_version?: number
          is_template?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          space_id?: string | null
          title?: string
          icon?: string | null
          content?: Json
          current_version?: number
          is_template?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          version: number
          snapshot: Json
          cause: DocumentVersionCauseDb
          author_id: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          version: number
          snapshot: Json
          cause?: DocumentVersionCauseDb
          author_id?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          version?: number
          snapshot?: Json
          cause?: DocumentVersionCauseDb
          author_id?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      kb_pages: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          space_id: string
          verification_state: KbVerificationStateDb
          verify_by: string | null
          owner_user_id: string | null
          tags: string[]
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          space_id: string
          verification_state?: KbVerificationStateDb
          verify_by?: string | null
          owner_user_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          space_id?: string
          verification_state?: KbVerificationStateDb
          verify_by?: string | null
          owner_user_id?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          workspace_id: string
          bucket: string
          object_key: string
          mime: string | null
          size_bytes: number
          module: string
          entity_type: string | null
          entity_id: string | null
          av_status: FileAvStatusDb
          uploaded_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          bucket: string
          object_key: string
          mime?: string | null
          size_bytes?: number
          module: string
          entity_type?: string | null
          entity_id?: string | null
          av_status?: FileAvStatusDb
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          bucket?: string
          object_key?: string
          mime?: string | null
          size_bytes?: number
          module?: string
          entity_type?: string | null
          entity_id?: string | null
          av_status?: FileAvStatusDb
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          title: string | null
          context_anchors: Json
          pinned: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          title?: string | null
          context_anchors?: Json
          pinned?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          title?: string | null
          context_anchors?: Json
          pinned?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          id: string
          workspace_id: string
          conversation_id: string
          role: AiMessageRoleDb
          content: Json
          model: string | null
          input_tokens: number | null
          output_tokens: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          conversation_id: string
          role: AiMessageRoleDb
          content?: Json
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          conversation_id?: string
          role?: AiMessageRoleDb
          content?: Json
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          trigger: AiRunTriggerDb
          surface: string | null
          status: AiRunStatusDb
          plan: Json
          input_tokens: number
          output_tokens: number
          cost_estimate_minor_units: number
          currency: string
          registry_version: string | null
          latency_ms: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          trigger: AiRunTriggerDb
          surface?: string | null
          status?: AiRunStatusDb
          plan?: Json
          input_tokens?: number
          output_tokens?: number
          cost_estimate_minor_units?: number
          currency?: string
          registry_version?: string | null
          latency_ms?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          trigger?: AiRunTriggerDb
          surface?: string | null
          status?: AiRunStatusDb
          plan?: Json
          input_tokens?: number
          output_tokens?: number
          cost_estimate_minor_units?: number
          currency?: string
          registry_version?: string | null
          latency_ms?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      ai_approvals: {
        Row: {
          id: string
          workspace_id: string
          run_id: string
          proposed_action: Json
          risk_class: AiRiskClassDb
          approver_user_id: string | null
          decision: AiApprovalDecisionDb | null
          decided_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          run_id: string
          proposed_action: Json
          risk_class?: AiRiskClassDb
          approver_user_id?: string | null
          decision?: AiApprovalDecisionDb | null
          decided_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          run_id?: string
          proposed_action?: Json
          risk_class?: AiRiskClassDb
          approver_user_id?: string | null
          decision?: AiApprovalDecisionDb | null
          decided_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      memory_items: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          scope: MemoryScopeDb
          kind: MemoryKindDb
          content: string
          source: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          scope: MemoryScopeDb
          kind: MemoryKindDb
          content: string
          source?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          scope?: MemoryScopeDb
          kind?: MemoryKindDb
          content?: string
          source?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          workspace_id: string
          user_id: string | null
          feature: string
          provider: string
          model: string
          tier: string | null
          input_tokens: number
          output_tokens: number
          cached_input_tokens: number
          cost_estimate_minor_units: number
          currency: string
          latency_ms: number | null
          outcome: string | null
          request_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string | null
          feature: string
          provider: string
          model: string
          tier?: string | null
          input_tokens?: number
          output_tokens?: number
          cached_input_tokens?: number
          cost_estimate_minor_units?: number
          currency?: string
          latency_ms?: number | null
          outcome?: string | null
          request_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string | null
          feature?: string
          provider?: string
          model?: string
          tier?: string | null
          input_tokens?: number
          output_tokens?: number
          cached_input_tokens?: number
          cost_estimate_minor_units?: number
          currency?: string
          latency_ms?: number | null
          outcome?: string | null
          request_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          id: string
          workspace_id: string
          source_type: EmbeddingSourceTypeDb
          entity_ref: string
          chunk_index: number
          content: string
          embedding: string
          acl_digest: string | null
          verification_state: string | null
          content_hash: string | null
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          source_type: EmbeddingSourceTypeDb
          entity_ref: string
          chunk_index?: number
          content: string
          embedding: string
          acl_digest?: string | null
          verification_state?: string | null
          content_hash?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          source_type?: EmbeddingSourceTypeDb
          entity_ref?: string
          chunk_index?: number
          content?: string
          embedding?: string
          acl_digest?: string | null
          verification_state?: string | null
          content_hash?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          workspace_id: string
          client_id: string
          project_id: string | null
          number: string
          status: InvoiceStatusDb
          currency: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          issue_date: string | null
          due_date: string | null
          line_items: Json
          payment_link_url: string | null
          pdf_file_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          client_id: string
          project_id?: string | null
          number: string
          status?: InvoiceStatusDb
          currency?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          issue_date?: string | null
          due_date?: string | null
          line_items?: Json
          payment_link_url?: string | null
          pdf_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          client_id?: string
          project_id?: string | null
          number?: string
          status?: InvoiceStatusDb
          currency?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          issue_date?: string | null
          due_date?: string | null
          line_items?: Json
          payment_link_url?: string | null
          pdf_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      invoice_schedules: {
        Row: {
          id: string
          workspace_id: string
          client_id: string | null
          source: InvoiceScheduleSourceDb
          cadence: InvoiceScheduleCadenceDb
          next_issue_date: string | null
          template: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          client_id?: string | null
          source: InvoiceScheduleSourceDb
          cadence: InvoiceScheduleCadenceDb
          next_issue_date?: string | null
          template?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          client_id?: string | null
          source?: InvoiceScheduleSourceDb
          cadence?: InvoiceScheduleCadenceDb
          next_issue_date?: string | null
          template?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          workspace_id: string
          vendor: string
          amount_minor: number
          currency: string
          category: string | null
          expense_date: string
          receipt_file_id: string | null
          submitted_by: string | null
          billable: boolean
          project_id: string | null
          approval_status: ExpenseApprovalStatusDb
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          vendor: string
          amount_minor: number
          currency?: string
          category?: string | null
          expense_date: string
          receipt_file_id?: string | null
          submitted_by?: string | null
          billable?: boolean
          project_id?: string | null
          approval_status?: ExpenseApprovalStatusDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          vendor?: string
          amount_minor?: number
          currency?: string
          category?: string | null
          expense_date?: string
          receipt_file_id?: string | null
          submitted_by?: string | null
          billable?: boolean
          project_id?: string | null
          approval_status?: ExpenseApprovalStatusDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          workspace_id: string
          invoice_id: string
          amount_minor: number
          currency: string
          method: PaymentMethodDb
          received_at: string
          fees_minor: number
          external_ref: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          invoice_id: string
          amount_minor: number
          currency?: string
          method: PaymentMethodDb
          received_at?: string
          fees_minor?: number
          external_ref?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          invoice_id?: string
          amount_minor?: number
          currency?: string
          method?: PaymentMethodDb
          received_at?: string
          fees_minor?: number
          external_ref?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          id: string
          workspace_id: string
          deal_id: string | null
          client_id: string
          title: string
          status: ProposalStatusDb
          valid_until: string | null
          accept_method: ProposalAcceptMethodDb
          public_token: string
          version: number
          sections: Json
          pricing: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          deal_id?: string | null
          client_id: string
          title: string
          status?: ProposalStatusDb
          valid_until?: string | null
          accept_method?: ProposalAcceptMethodDb
          public_token?: string
          version?: number
          sections?: Json
          pricing?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          deal_id?: string | null
          client_id?: string
          title?: string
          status?: ProposalStatusDb
          valid_until?: string | null
          accept_method?: ProposalAcceptMethodDb
          public_token?: string
          version?: number
          sections?: Json
          pricing?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      proposal_views: {
        Row: {
          id: string
          workspace_id: string
          proposal_id: string
          viewer_token: string
          viewed_at: string
          section_dwell: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          proposal_id: string
          viewer_token: string
          viewed_at?: string
          section_dwell?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          proposal_id?: string
          viewer_token?: string
          viewed_at?: string
          section_dwell?: Json
          created_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          id: string
          workspace_id: string
          type: ContractTypeDb
          client_id: string | null
          title: string
          status: ContractStatusDb
          effective_date: string | null
          end_date: string | null
          auto_renew: boolean
          value_minor: number | null
          currency: string
          signed_file_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          type: ContractTypeDb
          client_id?: string | null
          title: string
          status?: ContractStatusDb
          effective_date?: string | null
          end_date?: string | null
          auto_renew?: boolean
          value_minor?: number | null
          currency?: string
          signed_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          type?: ContractTypeDb
          client_id?: string | null
          title?: string
          status?: ContractStatusDb
          effective_date?: string | null
          end_date?: string | null
          auto_renew?: boolean
          value_minor?: number | null
          currency?: string
          signed_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      contract_obligations: {
        Row: {
          id: string
          workspace_id: string
          contract_id: string
          description: string
          due_rule: Json
          owner_user_id: string | null
          source_clause: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          contract_id: string
          description: string
          due_rule?: Json
          owner_user_id?: string | null
          source_clause?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          contract_id?: string
          description?: string
          due_rule?: Json
          owner_user_id?: string | null
          source_clause?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          title: string
          starts_at: string
          ends_at: string | null
          all_day: boolean
          location: string | null
          source: CalendarEventSourceDb
          provider_event_id: string | null
          related_refs: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          title: string
          starts_at: string
          ends_at?: string | null
          all_day?: boolean
          location?: string | null
          source?: CalendarEventSourceDb
          provider_event_id?: string | null
          related_refs?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          title?: string
          starts_at?: string
          ends_at?: string | null
          all_day?: boolean
          location?: string | null
          source?: CalendarEventSourceDb
          provider_event_id?: string | null
          related_refs?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          id: string
          workspace_id: string
          title: string
          type: MeetingTypeDb
          project_id: string | null
          deal_id: string | null
          calendar_event_id: string | null
          attendees: Json
          agenda: Json
          status: MeetingStatusDb
          recording_file_id: string | null
          transcript_file_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          type?: MeetingTypeDb
          project_id?: string | null
          deal_id?: string | null
          calendar_event_id?: string | null
          attendees?: Json
          agenda?: Json
          status?: MeetingStatusDb
          recording_file_id?: string | null
          transcript_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          type?: MeetingTypeDb
          project_id?: string | null
          deal_id?: string | null
          calendar_event_id?: string | null
          attendees?: Json
          agenda?: Json
          status?: MeetingStatusDb
          recording_file_id?: string | null
          transcript_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      meeting_summaries: {
        Row: {
          id: string
          workspace_id: string
          meeting_id: string
          tldr: string | null
          decisions: Json
          action_items: Json
          client_safe_variant: Json | null
          model: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          meeting_id: string
          tldr?: string | null
          decisions?: Json
          action_items?: Json
          client_safe_variant?: Json | null
          model?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          meeting_id?: string
          tldr?: string | null
          decisions?: Json
          action_items?: Json
          client_safe_variant?: Json | null
          model?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      availability: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          working_hours: Json
          timezone: string
          booking_rules: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          working_hours?: Json
          timezone?: string
          booking_rules?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          working_hours?: Json
          timezone?: string
          booking_rules?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          id: string
          workspace_id: string
          name: string
          status: AutomationStatusDb
          trigger_event_type: string
          trigger_filter: Json
          condition_graph: Json
          actions: Json
          error_policy: Json
          owner_user_id: string | null
          scope: AutomationScopeDb
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          status?: AutomationStatusDb
          trigger_event_type: string
          trigger_filter?: Json
          condition_graph?: Json
          actions?: Json
          error_policy?: Json
          owner_user_id?: string | null
          scope?: AutomationScopeDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          status?: AutomationStatusDb
          trigger_event_type?: string
          trigger_filter?: Json
          condition_graph?: Json
          actions?: Json
          error_policy?: Json
          owner_user_id?: string | null
          scope?: AutomationScopeDb
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          id: string
          workspace_id: string
          automation_id: string
          trigger_event_id: string | null
          status: AutomationRunStatusDb
          step_results: Json
          error: Json | null
          started_at: string
          finished_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          automation_id: string
          trigger_event_id?: string | null
          status?: AutomationRunStatusDb
          step_results?: Json
          error?: Json | null
          started_at?: string
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          automation_id?: string
          trigger_event_id?: string | null
          status?: AutomationRunStatusDb
          step_results?: Json
          error?: Json | null
          started_at?: string
          finished_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          workspace_id: string
          queue: string
          job_key: string
          payload: Json
          status: JobStatusDb
          attempts: number
          max_attempts: number
          run_at: string
          locked_at: string | null
          locked_by: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          queue: string
          job_key: string
          payload?: Json
          status?: JobStatusDb
          attempts?: number
          max_attempts?: number
          run_at?: string
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          queue?: string
          job_key?: string
          payload?: Json
          status?: JobStatusDb
          attempts?: number
          max_attempts?: number
          run_at?: string
          locked_at?: string | null
          locked_by?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
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
