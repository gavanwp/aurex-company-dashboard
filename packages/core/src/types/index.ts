// Domain enums — mirrored 1:1 by the Postgres schema in supabase/migrations
// (native enum types for 0002–0004 era tables; text + CHECK constraints from
// 0006 onward per DatabaseArchitecture.md C11).
// Changing a value here requires a migration in the same PR (12_Project_Rules.md).

export const WORKSPACE_ROLES = [
  'owner',
  'admin',
  'project_manager',
  'member',
  'sales',
  'finance',
  'hr',
  'client',
  'guest',
] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const MEMBER_SPECIALIZATIONS = [
  'developer',
  'designer',
  'seo',
  'content',
  'marketing',
] as const
export type MemberSpecialization = (typeof MEMBER_SPECIALIZATIONS)[number]

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'canceled',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const CLIENT_STATUSES = ['prospect', 'active', 'paused', 'churned'] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
export type DealStage = (typeof DEAL_STAGES)[number]

// ── Documents & Knowledge Base (0006) ──────────────────────────────────────
export const KB_SPACE_ACL_KINDS = ['workspace', 'role', 'members', 'client_facing'] as const
export type KbSpaceAclKind = (typeof KB_SPACE_ACL_KINDS)[number]

export const KB_VERIFICATION_STATES = ['verified', 'needs_review', 'stale'] as const
export type KbVerificationState = (typeof KB_VERIFICATION_STATES)[number]

export const DOCUMENT_VERSION_CAUSES = ['manual', 'major_edit', 'publish', 'restore'] as const
export type DocumentVersionCause = (typeof DOCUMENT_VERSION_CAUSES)[number]

export const FILE_AV_STATUSES = ['pending', 'clean', 'infected', 'quarantined'] as const
export type FileAvStatus = (typeof FILE_AV_STATUSES)[number]

// ── AI foundation (0007) ────────────────────────────────────────────────────
export const AI_MESSAGE_ROLES = ['user', 'assistant', 'tool', 'system'] as const
export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number]

export const AI_RUN_TRIGGERS = ['chat', 'proactive', 'automation'] as const
export type AiRunTrigger = (typeof AI_RUN_TRIGGERS)[number]

export const AI_RUN_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'cancelled'] as const
export type AiRunStatus = (typeof AI_RUN_STATUSES)[number]

export const AI_RISK_CLASSES = ['low', 'medium', 'high'] as const
export type AiRiskClass = (typeof AI_RISK_CLASSES)[number]

export const AI_APPROVAL_DECISIONS = ['approved', 'rejected'] as const
export type AiApprovalDecision = (typeof AI_APPROVAL_DECISIONS)[number]

export const MEMORY_SCOPES = ['user', 'workspace'] as const
export type MemoryScope = (typeof MEMORY_SCOPES)[number]

export const MEMORY_KINDS = ['preference', 'fact', 'instruction'] as const
export type MemoryKind = (typeof MEMORY_KINDS)[number]

export const EMBEDDING_SOURCE_TYPES = [
  'document',
  'kb_page',
  'meeting',
  'email',
  'file',
  'task',
  'project',
  'client',
] as const
export type EmbeddingSourceType = (typeof EMBEDDING_SOURCE_TYPES)[number]

// ── Finance (0008) ──────────────────────────────────────────────────────────
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'partial',
  'paid',
  'overdue',
  'void',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_SCHEDULE_SOURCES = ['contract', 'retainer', 'milestones'] as const
export type InvoiceScheduleSource = (typeof INVOICE_SCHEDULE_SOURCES)[number]

export const INVOICE_SCHEDULE_CADENCES = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'milestone',
] as const
export type InvoiceScheduleCadence = (typeof INVOICE_SCHEDULE_CADENCES)[number]

export const EXPENSE_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ExpenseApprovalStatus = (typeof EXPENSE_APPROVAL_STATUSES)[number]

export const PAYMENT_METHODS = ['stripe', 'bank', 'manual'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// ── Proposals & Contracts (0009) ────────────────────────────────────────────
export const PROPOSAL_STATUSES = [
  'draft',
  'internal_review',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export const PROPOSAL_ACCEPT_METHODS = ['esign', 'checkbox'] as const
export type ProposalAcceptMethod = (typeof PROPOSAL_ACCEPT_METHODS)[number]

export const CONTRACT_TYPES = ['msa', 'sow', 'nda', 'retainer', 'employment', 'custom'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const CONTRACT_STATUSES = [
  'draft',
  'review',
  'sent',
  'signed',
  'active',
  'expiring',
  'expired',
  'terminated',
] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

// ── Meetings & Calendar (0010) ──────────────────────────────────────────────
export const MEETING_TYPES = ['internal', 'client', 'sales', 'standup'] as const
export type MeetingType = (typeof MEETING_TYPES)[number]

export const MEETING_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export const CALENDAR_EVENT_SOURCES = ['native', 'synced', 'system'] as const
export type CalendarEventSource = (typeof CALENDAR_EVENT_SOURCES)[number]

// ── Team & HR (0016) ─────────────────────────────────────────────────────────
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor', 'intern'] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

export const COMP_PERIODS = ['hourly', 'monthly', 'annual'] as const
export type CompPeriod = (typeof COMP_PERIODS)[number]

export const LEAVE_TYPES = ['vacation', 'sick', 'personal', 'unpaid', 'other'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

// ── Automations & Jobs (0011) ───────────────────────────────────────────────
export const AUTOMATION_STATUSES = ['draft', 'active', 'paused'] as const
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number]

export const AUTOMATION_SCOPES = ['workspace', 'project', 'module'] as const
export type AutomationScope = (typeof AUTOMATION_SCOPES)[number]

export const AUTOMATION_RUN_STATUSES = ['running', 'succeeded', 'failed', 'cancelled'] as const
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number]

export const JOB_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'dead'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** Capabilities checked by can() — one per guarded operation, module-prefixed. */
export type Capability =
  | 'workspace.manage'
  | 'workspace.members.manage'
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'crm.view'
  | 'crm.create'
  | 'crm.edit'
  | 'crm.delete'
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  | 'dashboard.view'
  | 'settings.view'
