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
  'owner' | 'admin' | 'project_manager' | 'member' | 'sales' | 'finance' | 'hr' | 'client' | 'guest'

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
export type DocumentFileVersionCauseDb = 'upload' | 'replace' | 'restore'
export type FileAvStatusDb = 'pending' | 'clean' | 'infected' | 'quarantined'
export type AiMessageRoleDb = 'user' | 'assistant' | 'tool' | 'system'
export type AiRunTriggerDb = 'chat' | 'proactive' | 'automation'
export type AiRunStatusDb = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type AiRiskClassDb = 'low' | 'medium' | 'high'
export type AiApprovalDecisionDb = 'approved' | 'rejected'
export type MemoryScopeDb = 'user' | 'workspace'
export type MemoryKindDb = 'preference' | 'fact' | 'instruction'
export type EmbeddingSourceTypeDb =
  'document' | 'kb_page' | 'meeting' | 'email' | 'file' | 'task' | 'project' | 'client'
export type InvoiceStatusDb = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void'
export type InvoiceScheduleSourceDb = 'contract' | 'retainer' | 'milestones'
export type InvoiceScheduleCadenceDb = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'milestone'
export type ExpenseApprovalStatusDb = 'pending' | 'approved' | 'rejected'
export type PaymentMethodDb = 'stripe' | 'bank' | 'manual'
export type ProposalStatusDb =
  'draft' | 'internal_review' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
export type ProposalAcceptMethodDb = 'esign' | 'checkbox'
export type ContractTypeDb = 'msa' | 'sow' | 'nda' | 'retainer' | 'employment' | 'custom'
export type ContractStatusDb =
  'draft' | 'review' | 'sent' | 'signed' | 'active' | 'expiring' | 'expired' | 'terminated'
export type MeetingTypeDb = 'internal' | 'client' | 'sales' | 'standup'
export type MeetingStatusDb = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type MeetingActionItemStatusDb = 'proposed' | 'accepted' | 'converted' | 'dismissed'
export type CalendarEventSourceDb = 'native' | 'synced' | 'system'
export type OrgPlanDb = 'free' | 'pro' | 'business' | 'enterprise'
export type OrgStatusDb = 'active' | 'suspended' | 'cancelled'
export type OrgRoleDb = 'owner' | 'admin' | 'member'
export type OrgMemberStatusDb = 'invited' | 'active' | 'suspended'
export type RoleScopeDb = 'platform' | 'organization' | 'workspace' | 'portal'
export type PermissionEffectDb = 'allow' | 'deny'
export type OverrideScopeDb = 'organization' | 'workspace' | 'department' | 'team' | 'resource'
export type AuthEventTypeDb =
  | 'login'
  | 'logout'
  | 'mfa_challenge'
  | 'mfa_enrolled'
  | 'failure'
  | 'password_reset'
  | 'token_refresh'
export type MfaTypeDb = 'totp' | 'webauthn' | 'sms'
export type InvitationStatusDb = 'pending' | 'accepted' | 'revoked' | 'expired'
export type EmploymentTypeDb = 'full_time' | 'part_time' | 'contractor' | 'intern'
export type CompPeriodDb = 'hourly' | 'monthly' | 'annual'
export type LeaveTypeDb = 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other'
export type LeaveStatusDb = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type AutomationStatusDb = 'draft' | 'active' | 'paused'
export type AutomationScopeDb = 'workspace' | 'project' | 'module'
export type AutomationRunStatusDb = 'running' | 'succeeded' | 'failed' | 'cancelled'
export type JobStatusDb = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead'
export type MailboxProviderDb = 'gmail' | 'microsoft' | 'manual'
export type MailboxStatusDb = 'connected' | 'error' | 'disconnected'
export type MailboxSharingPolicyDb = 'private' | 'shared'
export type EmailThreadStatusDb = 'open' | 'waiting' | 'closed'
export type EmailThreadVisibilityDb = 'private' | 'workspace'
export type EmailDirectionDb = 'inbound' | 'outbound'

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
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: OrgPlanDb
          status: OrgStatusDb
          billing_customer_ref: string | null
          branding: Json
          sso_config: Json
          data_region: string | null
          cell_id: string | null
          parent_org_id: string | null
          owner_principal_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: OrgPlanDb
          status?: OrgStatusDb
          billing_customer_ref?: string | null
          branding?: Json
          sso_config?: Json
          data_region?: string | null
          cell_id?: string | null
          parent_org_id?: string | null
          owner_principal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: OrgPlanDb
          status?: OrgStatusDb
          billing_customer_ref?: string | null
          branding?: Json
          sso_config?: Json
          data_region?: string | null
          cell_id?: string | null
          parent_org_id?: string | null
          owner_principal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          organization_id: string
          principal_id: string
          org_role: OrgRoleDb
          status: OrgMemberStatusDb
          created_at: string
        }
        Insert: {
          organization_id: string
          principal_id: string
          org_role?: OrgRoleDb
          status?: OrgMemberStatusDb
          created_at?: string
        }
        Update: {
          organization_id?: string
          principal_id?: string
          org_role?: OrgRoleDb
          status?: OrgMemberStatusDb
          created_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          role_id: string | null
          specialization: MemberSpecializationDb | null
          created_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: WorkspaceRoleDb
          role_id?: string | null
          specialization?: MemberSpecializationDb | null
          created_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRoleDb
          role_id?: string | null
          specialization?: MemberSpecializationDb | null
          created_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          key: string
          module: string
          resource: string
          action: string
          label: string
          description: string | null
          is_field_level: boolean
          is_dangerous: boolean
          created_at: string
        }
        Insert: {
          key: string
          module: string
          resource: string
          action: string
          label: string
          description?: string | null
          is_field_level?: boolean
          is_dangerous?: boolean
          created_at?: string
        }
        Update: {
          key?: string
          module?: string
          resource?: string
          action?: string
          label?: string
          description?: string | null
          is_field_level?: boolean
          is_dangerous?: boolean
          created_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          organization_id: string | null
          key: string
          name: string
          description: string | null
          scope: RoleScopeDb
          is_system: boolean
          parent_role_id: string | null
          assignable_ceiling: string | null
          is_administrative: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          key: string
          name: string
          description?: string | null
          scope: RoleScopeDb
          is_system?: boolean
          parent_role_id?: string | null
          assignable_ceiling?: string | null
          is_administrative?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          key?: string
          name?: string
          description?: string | null
          scope?: RoleScopeDb
          is_system?: boolean
          parent_role_id?: string | null
          assignable_ceiling?: string | null
          is_administrative?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_key: string
        }
        Insert: {
          role_id: string
          permission_key: string
        }
        Update: {
          role_id?: string
          permission_key?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          id: string
          organization_id: string
          workspace_id: string | null
          principal_id: string
          permission_key: string
          effect: PermissionEffectDb
          scope_type: OverrideScopeDb
          scope_id: string | null
          reason: string
          granted_by: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          workspace_id?: string | null
          principal_id: string
          permission_key: string
          effect: PermissionEffectDb
          scope_type?: OverrideScopeDb
          scope_id?: string | null
          reason: string
          granted_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          workspace_id?: string | null
          principal_id?: string
          permission_key?: string
          effect?: PermissionEffectDb
          scope_type?: OverrideScopeDb
          scope_id?: string | null
          reason?: string
          granted_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      resource_grants: {
        Row: {
          id: string
          workspace_id: string
          resource_type: string
          resource_id: string
          principal_id: string | null
          role_id: string | null
          client_account_id: string | null
          effect: PermissionEffectDb
          capability: string
          reason: string | null
          granted_by: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          resource_type: string
          resource_id: string
          principal_id?: string | null
          role_id?: string | null
          client_account_id?: string | null
          effect?: PermissionEffectDb
          capability?: string
          reason?: string | null
          granted_by?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          resource_type?: string
          resource_id?: string
          principal_id?: string | null
          role_id?: string | null
          client_account_id?: string | null
          effect?: PermissionEffectDb
          capability?: string
          reason?: string | null
          granted_by?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      organization_policies: {
        Row: {
          organization_id: string
          policy_key: string
          value: Json
          updated_at: string
        }
        Insert: {
          organization_id: string
          policy_key: string
          value?: Json
          updated_at?: string
        }
        Update: {
          organization_id?: string
          policy_key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          principal_id: string
          organization_id: string | null
          active_workspace_id: string | null
          device_id: string | null
          ip: string | null
          user_agent: string | null
          perm_epoch: number
          impersonation: Json | null
          created_at: string
          last_active_at: string
          expires_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          principal_id: string
          organization_id?: string | null
          active_workspace_id?: string | null
          device_id?: string | null
          ip?: string | null
          user_agent?: string | null
          perm_epoch?: number
          impersonation?: Json | null
          created_at?: string
          last_active_at?: string
          expires_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          principal_id?: string
          organization_id?: string | null
          active_workspace_id?: string | null
          device_id?: string | null
          ip?: string | null
          user_agent?: string | null
          perm_epoch?: number
          impersonation?: Json | null
          last_active_at?: string
          expires_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          principal_id: string
          fingerprint_hash: string
          name: string | null
          os: string | null
          last_ip: string | null
          trusted: boolean
          first_seen_at: string
          last_seen_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          principal_id: string
          fingerprint_hash: string
          name?: string | null
          os?: string | null
          last_ip?: string | null
          trusted?: boolean
          first_seen_at?: string
          last_seen_at?: string
          revoked_at?: string | null
        }
        Update: {
          name?: string | null
          os?: string | null
          last_ip?: string | null
          trusted?: boolean
          last_seen_at?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          id: string
          principal_id: string | null
          organization_id: string | null
          type: AuthEventTypeDb
          method: string | null
          ip: string | null
          geo: string | null
          device_id: string | null
          success: boolean
          risk_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          principal_id?: string | null
          organization_id?: string | null
          type: AuthEventTypeDb
          method?: string | null
          ip?: string | null
          geo?: string | null
          device_id?: string | null
          success?: boolean
          risk_score?: number | null
          created_at?: string
        }
        Update: {
          success?: boolean
          risk_score?: number | null
        }
        Relationships: []
      }
      mfa_factors: {
        Row: {
          id: string
          principal_id: string
          type: MfaTypeDb
          label: string | null
          secret_ref: string | null
          verified_at: string | null
          last_used_at: string | null
          created_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          principal_id: string
          type: MfaTypeDb
          label?: string | null
          secret_ref?: string | null
          verified_at?: string | null
          last_used_at?: string | null
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          label?: string | null
          verified_at?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          organization_id: string
          workspace_id: string | null
          name: string
          prefix: string
          hash: string
          scopes: string[]
          created_by: string | null
          last_used_at: string | null
          expires_at: string | null
          created_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          workspace_id?: string | null
          name: string
          prefix: string
          hash: string
          scopes?: string[]
          created_by?: string | null
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          name?: string
          scopes?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          workspace_id: string | null
          email: string
          role_id: string | null
          overrides: Json
          token_hash: string
          status: InvitationStatusDb
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          workspace_id?: string | null
          email: string
          role_id?: string | null
          overrides?: Json
          token_hash: string
          status?: InvitationStatusDb
          invited_by?: string | null
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          role_id?: string | null
          overrides?: Json
          status?: InvitationStatusDb
          accepted_at?: string | null
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          id: string
          organization_id: string | null
          workspace_id: string | null
          impersonator_id: string
          target_principal_id: string
          read_only: boolean
          pages: Json
          started_at: string
          ends_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          workspace_id?: string | null
          impersonator_id: string
          target_principal_id: string
          read_only?: boolean
          pages?: Json
          started_at?: string
          ends_at: string
          revoked_at?: string | null
        }
        Update: {
          read_only?: boolean
          pages?: Json
          revoked_at?: string | null
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
      document_folders: {
        Row: {
          id: string
          workspace_id: string
          parent_id: string | null
          name: string
          description: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          parent_id?: string | null
          name: string
          description?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          parent_id?: string | null
          name?: string
          description?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_files: {
        Row: {
          id: string
          workspace_id: string
          folder_id: string | null
          name: string
          description: string | null
          current_version_id: string | null
          current_version: number
          mime: string | null
          size_bytes: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          folder_id?: string | null
          name: string
          description?: string | null
          current_version_id?: string | null
          current_version?: number
          mime?: string | null
          size_bytes?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          folder_id?: string | null
          name?: string
          description?: string | null
          current_version_id?: string | null
          current_version?: number
          mime?: string | null
          size_bytes?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_file_versions: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          version: number
          file_id: string | null
          filename: string
          mime: string | null
          size_bytes: number
          checksum: string | null
          cause: DocumentFileVersionCauseDb
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          version: number
          file_id?: string | null
          filename: string
          mime?: string | null
          size_bytes?: number
          checksum?: string | null
          cause?: DocumentFileVersionCauseDb
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          version?: number
          file_id?: string | null
          filename?: string
          mime?: string | null
          size_bytes?: number
          checksum?: string | null
          cause?: DocumentFileVersionCauseDb
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_tags: {
        Row: {
          id: string
          workspace_id: string
          name: string
          color: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          color?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          color?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      document_tag_assignments: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          tag_id: string
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          tag_id: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          tag_id?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
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
          project_id: string | null
          proposal_id: string | null
          title: string
          status: ContractStatusDb
          effective_date: string | null
          end_date: string | null
          auto_renew: boolean
          value_minor: number | null
          currency: string
          body: Json
          version: number
          sent_at: string | null
          signed_at: string | null
          public_token: string | null
          signer: Json | null
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
          project_id?: string | null
          proposal_id?: string | null
          title: string
          status?: ContractStatusDb
          effective_date?: string | null
          end_date?: string | null
          auto_renew?: boolean
          value_minor?: number | null
          currency?: string
          body?: Json
          version?: number
          sent_at?: string | null
          signed_at?: string | null
          public_token?: string | null
          signer?: Json | null
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
          project_id?: string | null
          proposal_id?: string | null
          title?: string
          status?: ContractStatusDb
          effective_date?: string | null
          end_date?: string | null
          auto_renew?: boolean
          value_minor?: number | null
          currency?: string
          body?: Json
          version?: number
          sent_at?: string | null
          signed_at?: string | null
          public_token?: string | null
          signer?: Json | null
          signed_file_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      hr_profiles: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          title: string | null
          employment_type: EmploymentTypeDb | null
          manager_id: string | null
          start_date: string | null
          location: string | null
          timezone: string | null
          phone: string | null
          bio: string | null
          skills: Json
          weekly_capacity_hours: number | null
          comp_amount_minor: number | null
          comp_currency: string
          comp_period: CompPeriodDb | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          title?: string | null
          employment_type?: EmploymentTypeDb | null
          manager_id?: string | null
          start_date?: string | null
          location?: string | null
          timezone?: string | null
          phone?: string | null
          bio?: string | null
          skills?: Json
          weekly_capacity_hours?: number | null
          comp_amount_minor?: number | null
          comp_currency?: string
          comp_period?: CompPeriodDb | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          title?: string | null
          employment_type?: EmploymentTypeDb | null
          manager_id?: string | null
          start_date?: string | null
          location?: string | null
          timezone?: string | null
          phone?: string | null
          bio?: string | null
          skills?: Json
          weekly_capacity_hours?: number | null
          comp_amount_minor?: number | null
          comp_currency?: string
          comp_period?: CompPeriodDb | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      hr_leave_requests: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          type: LeaveTypeDb
          start_date: string
          end_date: string
          status: LeaveStatusDb
          reason: string | null
          decided_by: string | null
          decided_at: string | null
          decision_note: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          type: LeaveTypeDb
          start_date: string
          end_date: string
          status?: LeaveStatusDb
          reason?: string | null
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          type?: LeaveTypeDb
          start_date?: string
          end_date?: string
          status?: LeaveStatusDb
          reason?: string | null
          decided_by?: string | null
          decided_at?: string | null
          decision_note?: string | null
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
          client_id: string | null
          calendar_event_id: string | null
          attendees: Json
          agenda: Json
          status: MeetingStatusDb
          recording_file_id: string | null
          transcript_file_id: string | null
          notes: string | null
          location: string | null
          starts_at: string | null
          ends_at: string | null
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
          client_id?: string | null
          calendar_event_id?: string | null
          attendees?: Json
          agenda?: Json
          status?: MeetingStatusDb
          recording_file_id?: string | null
          transcript_file_id?: string | null
          notes?: string | null
          location?: string | null
          starts_at?: string | null
          ends_at?: string | null
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
          client_id?: string | null
          calendar_event_id?: string | null
          attendees?: Json
          agenda?: Json
          status?: MeetingStatusDb
          recording_file_id?: string | null
          transcript_file_id?: string | null
          notes?: string | null
          location?: string | null
          starts_at?: string | null
          ends_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      meeting_decisions: {
        Row: {
          id: string
          workspace_id: string
          meeting_id: string
          statement: string
          decided_by: string | null
          context: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          meeting_id: string
          statement: string
          decided_by?: string | null
          context?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          meeting_id?: string
          statement?: string
          decided_by?: string | null
          context?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      meeting_action_items: {
        Row: {
          id: string
          workspace_id: string
          meeting_id: string
          description: string
          assignee_user_id: string | null
          due_date: string | null
          status: MeetingActionItemStatusDb
          task_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          meeting_id: string
          description: string
          assignee_user_id?: string | null
          due_date?: string | null
          status?: MeetingActionItemStatusDb
          task_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          meeting_id?: string
          description?: string
          assignee_user_id?: string | null
          due_date?: string | null
          status?: MeetingActionItemStatusDb
          task_id?: string | null
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
      mailbox_connections: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          provider: MailboxProviderDb
          address: string
          display_name: string | null
          status: MailboxStatusDb
          sync_cursor: string | null
          sharing_policy: MailboxSharingPolicyDb
          oauth_token_ciphertext: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          provider?: MailboxProviderDb
          address: string
          display_name?: string | null
          status?: MailboxStatusDb
          sync_cursor?: string | null
          sharing_policy?: MailboxSharingPolicyDb
          oauth_token_ciphertext?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          provider?: MailboxProviderDb
          address?: string
          display_name?: string | null
          status?: MailboxStatusDb
          sync_cursor?: string | null
          sharing_policy?: MailboxSharingPolicyDb
          oauth_token_ciphertext?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          id: string
          workspace_id: string
          subject: string
          snippet: string | null
          participants: Json
          last_message_at: string | null
          message_count: number
          status: EmailThreadStatusDb
          visibility: EmailThreadVisibilityDb
          mailbox_connection_id: string | null
          client_id: string | null
          contact_id: string | null
          project_id: string | null
          deal_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          subject: string
          snippet?: string | null
          participants?: Json
          last_message_at?: string | null
          message_count?: number
          status?: EmailThreadStatusDb
          visibility?: EmailThreadVisibilityDb
          mailbox_connection_id?: string | null
          client_id?: string | null
          contact_id?: string | null
          project_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          subject?: string
          snippet?: string | null
          participants?: Json
          last_message_at?: string | null
          message_count?: number
          status?: EmailThreadStatusDb
          visibility?: EmailThreadVisibilityDb
          mailbox_connection_id?: string | null
          client_id?: string | null
          contact_id?: string | null
          project_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          id: string
          workspace_id: string
          thread_id: string
          direction: EmailDirectionDb
          from_address: string
          to_addresses: Json
          cc_addresses: Json
          subject: string | null
          body_text: string | null
          body_html_sanitized: string | null
          provider_message_id: string | null
          sent_at: string | null
          is_draft: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          thread_id: string
          direction: EmailDirectionDb
          from_address: string
          to_addresses?: Json
          cc_addresses?: Json
          subject?: string | null
          body_text?: string | null
          body_html_sanitized?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          is_draft?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          thread_id?: string
          direction?: EmailDirectionDb
          from_address?: string
          to_addresses?: Json
          cc_addresses?: Json
          subject?: string | null
          body_text?: string | null
          body_html_sanitized?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          is_draft?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
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
      has_permission: {
        Args: { ws_id: string; perm: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string }
        Returns: boolean
      }
      org_role_of: {
        Args: { org_id: string }
        Returns: OrgRoleDb | null
      }
      invitation_preview: {
        Args: { raw_token: string }
        Returns: {
          email: string
          org_name: string | null
          workspace_name: string | null
          role_name: string | null
          valid: boolean
          expires_at: string
        }[]
      }
      accept_invitation: {
        Args: { raw_token: string }
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
