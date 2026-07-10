'use client'

import * as React from 'react'
import { History, Square, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Button } from '../button'
import { AurexMark } from './aurex-mark'

/**
 * AI Chat Window (conversation panel) shell — docs/design/Components.md
 * §6.1–6.2, docs/11_Design_Principles.md §9.
 *
 * The dockable conversation with Aurex: an OS surface in the shell's right
 * panel (360px, bg-raised per Elevation.md) — never a floating support
 * bubble. Anatomy: header (✦ Aurex + context chip slot + history + close)
 * → scrollable thread (user messages right-aligned neutral; Aurex messages
 * left with ✦) → composer pinned bottom (autogrow textarea, ↵ send /
 * ⇧↵ newline, Stop while streaming). Full-screen mode promotes to an
 * ~880px centered column — a layout change, not a different product.
 *
 * These are the design-system surfaces only; Phase 3 wires streaming,
 * history, and context anchoring. Data arrives via props/children —
 * packages/ui never fetches.
 */

/* -------------------------------------------------------------------------
 * ChatPanel — the panel surface
 * ---------------------------------------------------------------------- */

export interface ChatPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Full-screen mode: centered ~880px column instead of the 360px right
   * panel. Same thread, same anchors.
   */
  fullScreen?: boolean
}

/**
 * Panel container. Compose ChatPanelHeader, ChatThread, and ChatComposer
 * inside. Width 360px (size-panel token) in panel mode; the parent shell
 * owns docking and the z-panel layer.
 */
const ChatPanel = React.forwardRef<HTMLDivElement, ChatPanelProps>(
  ({ className, fullScreen = false, style, children, ...props }, ref) => (
    <div
      ref={ref}
      role="complementary"
      aria-label="Aurex conversation"
      className={cn(
        'flex h-full flex-col overflow-hidden bg-popover text-popover-foreground',
        fullScreen ? 'mx-auto w-full' : 'border-l',
        className,
      )}
      style={{
        // size-panel 360px / size-content-column 880px (DesignTokens.md §12);
        // no preset bridge exists for size tokens yet.
        ...(fullScreen ? { maxWidth: 880 } : { width: 360 }),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
)
ChatPanel.displayName = 'ChatPanel'

/* -------------------------------------------------------------------------
 * ChatPanelHeader — ✦ Aurex + context chip + history + close
 * ---------------------------------------------------------------------- */

export interface ChatPanelHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Context chip slot — what the conversation is anchored to (removable ×). */
  contextChip?: React.ReactNode
  /** Opens conversation history (Components.md §6.9). */
  onHistory?: () => void
  /** Closes the panel. Esc returns focus to the page; the panel persists. */
  onClose?: () => void
  /** Extra header actions (e.g. full-screen toggle, ··· menu). */
  actions?: React.ReactNode
}

const ChatPanelHeader = React.forwardRef<HTMLDivElement, ChatPanelHeaderProps>(
  ({ className, contextChip, onHistory, onClose, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex shrink-0 items-center gap-2 border-b px-4 py-3',
        className,
      )}
      {...props}
    >
      <AurexMark size={16} />
      <span className="text-sm font-semibold text-foreground">Aurex</span>
      {contextChip ? (
        <div className="min-w-0 flex-1 truncate">{contextChip}</div>
      ) : (
        <div className="flex-1" />
      )}
      {actions}
      {onHistory ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Conversation history"
          onClick={onHistory}
        >
          <History aria-hidden="true" />
        </Button>
      ) : null}
      {onClose ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Close panel"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  ),
)
ChatPanelHeader.displayName = 'ChatPanelHeader'

/* -------------------------------------------------------------------------
 * ChatThread + ChatMessage — the scrollable message log
 * ---------------------------------------------------------------------- */

export type ChatThreadProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Scrollable thread region. A log semantically; announcements are buffered
 * inside StreamingText, not per-token here.
 */
const ChatThread = React.forwardRef<HTMLDivElement, ChatThreadProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="log"
      aria-label="Conversation"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4',
        className,
      )}
      {...props}
    />
  ),
)
ChatThread.displayName = 'ChatThread'

export interface ChatMessageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** user: right-aligned neutral bubble. assistant: left with the ✦ mark. */
  author: 'user' | 'assistant'
}

/**
 * Role-based message row. Assistant messages carry the ✦ mark and flow as
 * prose (with citation chips, Tool cards, and Approval cards inline as
 * children); user messages sit right-aligned on a neutral surface.
 */
const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ className, author, children, ...props }, ref) => {
    if (author === 'user') {
      return (
        <div
          ref={ref}
          className={cn('flex justify-end', className)}
          {...props}
        >
          <div className="ml-8 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
            {children}
          </div>
        </div>
      )
    }
    return (
      <div
        ref={ref}
        className={cn('flex items-start gap-2', className)}
        {...props}
      >
        <AurexMark size={12} className="mt-1.5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
      </div>
    )
  },
)
ChatMessage.displayName = 'ChatMessage'

/* -------------------------------------------------------------------------
 * ChatComposer — autogrow textarea, ↵ send / ⇧↵ newline, Stop slot
 * ---------------------------------------------------------------------- */

export interface ChatComposerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit'> {
  value: string
  onValueChange: (value: string) => void
  /** Called on ↵ or the send button when the trimmed value is non-empty. */
  onSend: (value: string) => void
  /** Streaming state: the send button becomes Stop for the whole stream. */
  streaming?: boolean
  /** Stop the in-flight stream (partial output is kept, marked "Stopped"). */
  onStop?: () => void
  /**
   * Disable input entirely (e.g. over-budget — pair with a quiet tooltip
   * upstream: "Workspace AI budget reached — ask an admin").
   */
  disabled?: boolean
  /** @default 'Message Aurex' */
  placeholder?: string
  /** Context-anchor rail slot rendered above the input (entity chips). */
  anchors?: React.ReactNode
  /** Footer-left slot: attach button, slash-command trigger. */
  footerStart?: React.ReactNode
}

/**
 * The Aurex composer (Components.md §6.2): autogrowing textarea (1→6
 * lines), Enter sends / Shift+Enter newline / while streaming the primary
 * control is Stop. Never pre-fills marketing prompts.
 */
const ChatComposer = React.forwardRef<HTMLDivElement, ChatComposerProps>(
  (
    {
      className,
      value,
      onValueChange,
      onSend,
      streaming = false,
      onStop,
      disabled = false,
      placeholder = 'Message Aurex',
      anchors,
      footerStart,
      ...props
    },
    ref,
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Autogrow 1→6 lines: reset then grow to scrollHeight, capped.
    React.useLayoutEffect(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      const lineHeight = 20
      const maxHeight = lineHeight * 6 + 16
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    }, [value])

    const send = () => {
      const trimmed = value.trim()
      if (!trimmed || streaming || disabled) return
      onSend(trimmed)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        send()
      }
    }

    return (
      <div
        ref={ref}
        className={cn('shrink-0 border-t px-4 py-3', className)}
        {...props}
      >
        {anchors ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {anchors}
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message Aurex"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">{footerStart}</div>
          {streaming ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onStop}
              aria-label="Stop responding"
            >
              <Square aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={send}
              disabled={disabled || value.trim().length === 0}
            >
              Send
            </Button>
          )}
        </div>
      </div>
    )
  },
)
ChatComposer.displayName = 'ChatComposer'

export { ChatPanel, ChatPanelHeader, ChatThread, ChatMessage, ChatComposer }
