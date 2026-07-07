'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MotionOverlay, MotionTabPanel, EASE } from '@/components/voltus/motion'
import {
  X, Copy, CheckCircle2, Trash2, RotateCcw, GitBranch,
  Link2, Eye, EyeOff, RefreshCw, ChevronDown, ChevronRight,
  MoreVertical, ExternalLink, ShieldAlert, Clock, Building2,
  Fingerprint, AlertTriangle, CheckCircle, XCircle, Minus,
  ArrowRight, FileText, ScrollText, Hash, User, Zap, FlaskConical,
  Scale, UserCheck, Send, Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { ErrorClassPill, SeverityPill, LifecyclePill } from './status-pill'
import { AvatarChip } from './avatar-chip'
import { resolveBusinessDecision, type ErrorEnvelope, type Severity } from '@/mock'
import { logEntries } from '@/lib/data'

// ─── per-envelope derived data ────────────────────────────────────────────────

function buildCausationNodes(evt: ErrorEnvelope) {
  const t0 = new Date(evt.occurredAt).getTime()
  const preNodes = [
    {
      step: 1, type: 'user_action' as const,
      service: 'Client', operation: 'Inbound Request',
      status: 'pass' as const,
      message: `Inbound ${evt.seam} call initiated to ${evt.service}.${evt.operation}`,
      ts: new Date(t0 - 30_000).toISOString(),
      eventId: `evt-inbound-${evt.id.slice(-4)}` as string | null, errorId: null as string | null,
    },
    {
      step: 2, type: 'event' as const,
      service: evt.seam, operation: 'route',
      status: 'pass' as const,
      message: `Request accepted and routed to ${evt.service}`,
      ts: new Date(t0 - 28_000).toISOString(),
      eventId: `evt-route-${evt.id.slice(-4)}` as string | null, errorId: null as string | null,
    },
  ]
  const chainNodes = evt.causeChain.map((c, i) => ({
    step: i + 3, type: 'span' as const,
    service: evt.service, operation: evt.operation,
    status: (i < evt.causeChain.length - 1 ? 'warn' : 'error') as 'warn' | 'error',
    message: c,
    ts: new Date(t0 - (evt.causeChain.length - 1 - i) * 2_000).toISOString(),
    eventId: null as string | null, errorId: i === evt.causeChain.length - 1 ? evt.id : null as string | null,
  }))
  const finalNode = {
    step: evt.causeChain.length + 3, type: 'error' as const,
    service: 'ErrorHandler', operation: 'createEnvelope',
    status: (evt.status === 'resolved' ? 'pass' : 'error') as 'pass' | 'error',
    message: `Error envelope created — status: ${evt.status}${evt.status === 'dlq' ? ' → queued to DLQ' : evt.status === 'resolved' ? ' → resolved' : ''}`,
    ts: evt.occurredAt,
    eventId: null as string | null, errorId: evt.id,
  }
  return [...preNodes, ...chainNodes, finalNode]
}

function buildRetryHistory(evt: ErrorEnvelope) {
  if (evt.retryCount === 0) return []
  return Array.from({ length: evt.retryCount }, (_, i) => ({
    attempt: i + 1,
    ts: new Date(new Date(evt.occurredAt).getTime() + (i + 1) * 90_000).toISOString(),
    backoffSec: Math.round(Math.pow(2, i) * 15),
    outcome: (i < evt.retryCount - 1 ? 'failed' : evt.status === 'resolved' ? 'success' : 'failed') as 'failed' | 'success',
    detail: i < evt.retryCount - 1
      ? `Backoff ${Math.round(Math.pow(2, i) * 15)} s — upstream still unavailable`
      : evt.status === 'resolved'
        ? 'Request succeeded — envelope resolved'
        : `Max retries exhausted — routed to DLQ`,
  }))
}

function buildSagaSteps(evt: ErrorEnvelope) {
  const hasSaga = evt.errorCode.includes('FLW') || evt.errorCode.includes('FIN') || evt.errorCode.includes('PAYMENT')
  if (!hasSaga) return []
  const t0 = new Date(evt.occurredAt).getTime()
  return [
    { step: 1, name: 'Validate saga preconditions',  outcome: 'success' as const, envelopeId: null as string | null,   ts: new Date(t0 - 3_000).toISOString() },
    { step: 2, name: `Execute: ${evt.operation}`,     outcome: 'failed'  as const, envelopeId: evt.id,                  ts: evt.occurredAt },
    { step: 3, name: 'Compensate: undo side-effects', outcome: (evt.status === 'resolved' ? 'success' : 'running') as 'success' | 'running', envelopeId: null, ts: new Date(t0 + 5_000).toISOString() },
    { step: 4, name: 'Notify upstream of rollback',   outcome: (evt.status === 'resolved' ? 'success' : 'pending') as 'success' | 'pending', envelopeId: null, ts: new Date(t0 + 8_000).toISOString() },
  ].reverse()
}

function buildAuditTrail(evt: ErrorEnvelope) {
  const t0 = new Date(evt.occurredAt).getTime()
  const rows = [
    { actor: 'system',         action: 'envelope_created', ts: evt.occurredAt,                     impersonated: false, detail: 'Canonical error envelope generated and persisted' },
    { actor: 'system',         action: evt.status === 'dlq' ? 'routed_to_dlq' : 'status_updated',  ts: new Date(t0 + 1_500).toISOString(),   impersonated: false, detail: evt.status === 'dlq' ? `Max retries (${evt.maxRetries}) exhausted — moved to DLQ` : `Status set to ${evt.status}` },
    ...(evt.assignee ? [{ actor: evt.assignee,    action: 'assigned', ts: new Date(t0 + 120_000).toISOString(), impersonated: false, detail: `Assigned via triage queue` }] : []),
    { actor: 'Jhansi M (ops)', action: 'viewed',            ts: new Date(t0 + 300_000).toISOString(), impersonated: false, detail: 'Opened error detail from Error Event Log' },
  ]
  return rows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).replace(',', '')
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function nodeColors(status: string) {
  if (status === 'pass')  return { bg: '#F0FDF4', border: '#86EFAC', dot: '#16A34A', label: '#15803D' }
  if (status === 'warn')  return { bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706', label: '#B45309' }
  if (status === 'error') return { bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626', label: '#B91C1C' }
  return                         { bg: '#F8FAFC', border: '#E9EDF3', dot: '#94A3B8', label: '#64748B' }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KV({ label, value, mono = false, href }: { label: string; value: string; mono?: boolean; href?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</span>
      {href
        ? <Link href={href} className="text-[12px] font-medium text-[#2F6BFF] hover:underline truncate">{value}</Link>
        : <span className={`text-[12px] font-medium text-[#1E293B] dark:text-[#CBD5E1] truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
      }
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[#E9EDF3] dark:bg-[#334155]" />
}

function severityAccent(severity: Severity): string {
  if (severity === 'FATAL') return '#7F1D1D'
  if (severity === 'ERROR') return '#DC2626'
  if (severity === 'WARN')  return '#D97706'
  return '#2F6BFF'
}

function severityTint(severity: Severity): { bg: string; border: string; text: string } {
  if (severity === 'FATAL') return { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' }
  if (severity === 'ERROR') return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' }
  if (severity === 'WARN')  return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }
  return { bg: '#EAF1FE', border: '#BFDBFE', text: '#1D4ED8' }
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = '',
}: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden shadow-sm ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC]/80 dark:bg-[#0F172A]/50">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#2F6BFF] shrink-0" />}
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#64748B] dark:text-slate-400">{title}</p>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  )
}

function DrawerAction({
  label,
  icon: Icon,
  onClick,
  variant = 'neutral',
  disabled,
}: {
  label: string
  icon: React.ElementType
  onClick?: () => void
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo'
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-[#EAF1FE] text-[#2F6BFF] hover:bg-[#2F6BFF] hover:text-white border-transparent',
    success: 'bg-[#F0FDF4] text-[#16A34A] hover:bg-[#16A34A] hover:text-white border-transparent',
    warning: 'bg-[#FFFBEB] text-[#D97706] hover:bg-[#D97706] hover:text-white border-transparent',
    danger:  'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#DC2626] hover:text-white border-transparent',
    indigo:  'bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#4F46E5] hover:text-white border-transparent',
    neutral: 'bg-white dark:bg-[#1E293B] text-[#64748B] hover:text-[#2F6BFF] border-[#E9EDF3] dark:border-[#334155] hover:border-[#2F6BFF]/30',
  }[variant]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  )
}

function CopyableKV({
  label,
  value,
  mono,
  href,
  onCopy,
  copied,
  copyKey,
}: {
  label: string
  value: string
  mono?: boolean
  href?: string
  onCopy?: () => void
  copied?: string | null
  copyKey?: string
}) {
  return (
    <div className="flex items-end justify-between gap-2 min-w-0 group/kv">
      <KV label={label} value={value} mono={mono} href={href} />
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 mb-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[#94A3B8] opacity-0 group-hover/kv:opacity-100 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#2F6BFF] transition-all"
        >
          {copied === copyKey ? <CheckCircle className="h-3 w-3 text-[#16A34A]" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  )
}

// ─── confirm modal ────────────────────────────────────────────────────────────

interface ConfirmAction {
  type:  'resolve' | 'discard' | 'dlq' | 'redrive' | 'replay' | 'approve' | 'reject' | 'route'
  label: string
  description: string
  requiresReason?: boolean
  danger?: boolean
}

function ConfirmModal({ action, onConfirm, onCancel }: {
  action: ConfirmAction
  onConfirm: (reason?: string) => void
  onCancel:  () => void
}) {
  const [reason, setReason] = useState('')
  const canSubmit = !action.requiresReason || reason.trim().length >= 10

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E9EDF3] dark:border-[#334155] shadow-2xl">
        <div className="px-5 py-4 border-b border-[#E9EDF3] dark:border-[#334155]">
          <h3 className="text-[14px] font-semibold text-[#1E293B] dark:text-white">{action.label}</h3>
          <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5 leading-relaxed">{action.description}</p>
        </div>
        {action.requiresReason && (
          <div className="px-5 pt-4 pb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] block mb-1.5">
              Reason <span className="text-[#DC2626]">*</span>
              <span className="text-[#94A3B8] normal-case font-normal ml-1">(min 10 chars — recorded in audit trail)</span>
            </label>
            <textarea
              className="w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3 py-2 text-[12px] text-[#1E293B] dark:text-white placeholder-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/40"
              rows={3}
              placeholder="Describe why this action is being taken..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <p className={`text-[10px] mt-0.5 ${reason.trim().length < 10 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              {reason.trim().length} / 10 min
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E9EDF3] dark:border-[#334155]">
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onConfirm(reason || undefined)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              action.danger ? 'bg-[#DC2626] hover:bg-[#b91c1c] text-white' : 'bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white'
            }`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── tab definition ───────────────────────────────────────────────────────────

type TabId = 'envelope' | 'business' | 'chain' | 'retry' | 'saga' | 'logs' | 'audit'

const TABS: { id: TabId; label: string }[] = [
  { id: 'envelope', label: 'Envelope'          },
  { id: 'business', label: 'Business Decision'  },
  { id: 'chain',    label: 'Causation Chain'    },
  { id: 'retry',    label: 'Retry / DLQ'        },
  { id: 'saga',     label: 'Saga'               },
  { id: 'logs',     label: 'Related Logs'       },
  { id: 'audit',    label: 'Audit Trail'        },
]

// ─── main component ───────────────────────────────────────────────────────────

interface ErrorDetailDrawerProps {
  event:     ErrorEnvelope
  onClose:   () => void
  fullPage?: boolean
}

export function ErrorDetailDrawer({ event, onClose, fullPage = false }: ErrorDetailDrawerProps) {
  const [tab,             setTab]            = useState<TabId>('envelope')
  const [revealInternals, setRevealInternals] = useState(false)
  const [copied,          setCopied]          = useState<string | null>(null)
  const [confirmAction,   setConfirmAction]   = useState<ConfirmAction | null>(null)
  const [actionDone,      setActionDone]      = useState<string | null>(null)
  const [kebabOpen,       setKebabOpen]       = useState(false)

  // derived
  const causationNodes = buildCausationNodes(event)
  const retryHistory   = buildRetryHistory(event)
  const sagaSteps      = buildSagaSteps(event)
  const auditTrail     = buildAuditTrail(event)
  const relatedLogs    = logEntries.filter(l => l.correlationId === event.correlationId)
  const business       = resolveBusinessDecision(event)      // null unless Business class
  const visibleTabs    = business ? TABS : TABS.filter(t => t.id !== 'business')

  const copy = useCallback((val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const CONFIRM_TEMPLATES: Record<ConfirmAction['type'], ConfirmAction> = {
    replay:  { type: 'replay',  label: 'Replay from event log', description: `Re-execute ${event.errorCode} from the original event in the log. The event re-enters the pipeline at seam: ${event.seam}.` },
    resolve: { type: 'resolve', label: 'Resolve error',          description: `Mark ${event.errorCode} as resolved. Assignees will be notified and the envelope closed.` },
    discard: { type: 'discard', label: 'Discard error',          description: `Permanently discard ${event.errorCode}. This cannot be undone. A reason is mandatory for the audit log.`, requiresReason: true, danger: true },
    dlq:     { type: 'dlq',    label: 'Send to DLQ',            description: `Route ${event.errorCode} to the dead-letter queue for manual triage. Retries will stop.` },
    redrive: { type: 'redrive', label: 'Redrive from DLQ',       description: `Replay ${event.errorCode} from the DLQ. It re-enters the pipeline at seam: ${event.seam}.` },
    route:   { type: 'route',   label: 'Request approval',       description: `Route ${event.errorCode} to ${business?.serviceRole ?? 'the owning Service Role'} (${business?.approver ?? 'assignee'}) for a business decision. The instance pauses until they act.` },
    approve: { type: 'approve', label: 'Approve business exception', description: `Approve the domain outcome for ${event.errorCode}. The workflow resumes on the approved branch${business?.compensation ? '' : ' with no compensation required'}.` },
    reject:  { type: 'reject',  label: 'Reject business exception',  description: `Reject the domain outcome for ${event.errorCode}.${business?.compensation ? ` Compensating task will run: “${business.compensation}”.` : ''} A reason is mandatory for the audit log.`, requiresReason: true, danger: true },
  }

  function trigger(type: ConfirmAction['type']) {
    setConfirmAction(CONFIRM_TEMPLATES[type])
    setKebabOpen(false)
  }

  function onConfirmed(reason?: string) {
    const label = confirmAction!.label + (reason ? ` — "${reason.slice(0, 50)}"` : '')
    setActionDone(label)
    setConfirmAction(null)
  }

  const isDead    = event.status === 'dlq'
  const isClosed  = event.status === 'resolved' || event.status === 'discarded'

  const tabBadge = (id: TabId): number | null => {
    if (id === 'retry') return retryHistory.length || null
    if (id === 'saga')  return sagaSteps.length    || null
    if (id === 'logs')  return relatedLogs.length  || null
    if (id === 'audit') return auditTrail.length   || null
    return null
  }

  const wrapper = fullPage
    ? 'flex flex-col h-full'
    : 'fixed right-0 top-0 z-50 flex h-full w-full max-w-[680px] flex-col bg-white dark:bg-[#0F172A] shadow-[-8px_0_40px_rgba(15,23,42,0.12)] border-l border-[#E9EDF3] dark:border-[#334155]'

  const accent = severityAccent(event.severity)
  const tint   = severityTint(event.severity)

  return (
    <>
      {!fullPage && (
        <MotionOverlay className="z-40 bg-[#0F172A]/35 backdrop-blur-[3px]" onClick={onClose} />
      )}

      <motion.div
        className={wrapper}
        initial={fullPage ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: EASE }}
      >

        {/* ═══════════════════════════════════════════════════════ HEADER */}
        <div className="shrink-0 bg-white dark:bg-[#1E293B]">
          {/* severity accent */}
          <div className="h-1 w-full" style={{ backgroundColor: accent }} />

          {/* hero */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                style={{ backgroundColor: `${accent}12`, borderColor: `${accent}30` }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className="font-mono text-[13px] font-bold text-[#2F6BFF]">{event.errorCode}</span>
                  <button
                    onClick={() => copy(event.errorCode, 'code')}
                    title="Copy error code"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-[#94A3B8] hover:text-[#2F6BFF] hover:bg-[#EAF1FE] transition-colors"
                  >
                    {copied === 'code' ? <CheckCircle className="h-3 w-3 text-[#16A34A]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <h2 className="text-[15px] font-bold text-[#1E293B] dark:text-white leading-snug truncate">
                  {event.service}
                  <span className="text-[#94A3B8] font-normal mx-1.5">·</span>
                  <span className="font-semibold text-[#334155] dark:text-slate-300">{event.operation}</span>
                </h2>
                <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{event.message}</p>
              </div>
              {!fullPage && (
                <button onClick={onClose} aria-label="Close"
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] border border-[#E9EDF3] dark:border-[#334155] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* status pills row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <ErrorClassPill value={event.errorClass} />
              <SeverityPill value={event.severity} />
              <LifecyclePill value={event.status} />
              {event.retryable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] text-[#2563EB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  <RotateCcw className="h-2.5 w-2.5" /> Retryable
                </span>
              )}
              <span className="ml-auto text-[10px] font-mono text-[#94A3B8] hidden sm:inline">
                {fmtShort(event.occurredAt)} · {event.seam}
              </span>
            </div>
          </div>

          {/* action toolbar */}
          <div className="mx-5 mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]/60 p-1.5">
            {event.retryable && !isClosed && (
              <DrawerAction label="Replay" icon={RotateCcw} variant="primary" onClick={() => trigger('replay')} />
            )}
            {business && !isClosed && (
              <>
                <DrawerAction label="Request approval" icon={Send} variant="indigo" onClick={() => trigger('route')} />
                <DrawerAction label="Approve" icon={UserCheck} variant="success" onClick={() => trigger('approve')} />
                <DrawerAction label="Reject" icon={XCircle} variant="danger" onClick={() => trigger('reject')} />
              </>
            )}
            {!isClosed && (
              <DrawerAction label="Resolve" icon={CheckCircle2} variant="success" onClick={() => trigger('resolve')} />
            )}
            {isDead ? (
              <DrawerAction label="Redrive" icon={RefreshCw} variant="warning" onClick={() => trigger('redrive')} />
            ) : !isClosed && (
              <DrawerAction label="Send to DLQ" icon={AlertTriangle} variant="danger" onClick={() => trigger('dlq')} />
            )}
            {!isClosed && (
              <DrawerAction label="Discard" icon={Trash2} variant="neutral" onClick={() => trigger('discard')} />
            )}
            <DrawerAction
              label={copied === 'link' ? 'Copied!' : 'Copy link'}
              icon={copied === 'link' ? CheckCircle : Link2}
              variant="neutral"
              onClick={() => copy(`${typeof window !== 'undefined' ? window.location.origin : ''}/errors/${event.id}`, 'link')}
            />
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setKebabOpen(o => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-white dark:hover:bg-[#1E293B] border border-transparent hover:border-[#E9EDF3] dark:hover:border-[#334155] transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {kebabOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setKebabOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-9 z-[56] w-52 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E9EDF3] dark:border-[#334155] shadow-xl overflow-hidden"
                    >
                      {([
                        { label: 'Open full page',   icon: ExternalLink, href: `/errors/${event.id}` },
                        { label: 'View in Registry', icon: Hash,         href: `/registry` },
                        { label: 'View in Logs',     icon: ScrollText,   href: `/logs` },
                        { label: 'View DLQ',         icon: FlaskConical, href: `/dlq` },
                        { label: 'View Tenant',      icon: Building2,    href: `/tenant` },
                      ] as const).map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setKebabOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-[#334155] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
                          <item.icon className="h-3.5 w-3.5 text-[#94A3B8]" />
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {actionDone && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-5 mb-3 flex items-center gap-2 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] px-3.5 py-2.5 text-[11px] text-[#15803D] font-medium"
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              Recorded — {actionDone}
            </motion.div>
          )}

          {/* tabs */}
          <div className="px-5 pb-0">
            <div className="flex gap-0.5 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#0F172A] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {visibleTabs.map(t => {
                const badge = tabBadge(t.id)
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white dark:bg-[#1E293B] text-[#2F6BFF] shadow-sm'
                        : 'text-[#64748B] hover:text-[#334155] dark:hover:text-slate-300'
                    }`}
                  >
                    {t.label}
                    {badge !== null && (
                      <span className={`ml-1.5 rounded-full px-1.5 py-px text-[9px] font-bold ${
                        active ? 'bg-[#EAF1FE] text-[#2F6BFF]' : 'bg-[#E2E8F0] dark:bg-[#334155] text-[#94A3B8]'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="h-px bg-[#E9EDF3] dark:bg-[#334155] mt-3" />
        </div>
        {/* end header */}

        {/* ═══════════════════════════════════════════════════════ BODY */}
        <div className="flex-1 overflow-y-auto bg-[#F7F8FA] dark:bg-[#0F172A]">
          <MotionTabPanel activeKey={tab} className="min-h-full">

          {/* ── ENVELOPE ──────────────────────────────────────────────── */}
          {tab === 'envelope' && (
            <div className="px-5 py-4 space-y-4">
              {/* user message callout */}
              <div
                className="rounded-xl border px-4 py-3.5"
                style={{ backgroundColor: tint.bg, borderColor: tint.border }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="h-3.5 w-3.5" style={{ color: tint.text }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: tint.text }}>User Message</p>
                </div>
                <p className="text-[13px] text-[#1E293B] dark:text-[#CBD5E1] leading-relaxed">{event.message}</p>
              </div>

              <SectionCard title="Identifiers" icon={Fingerprint}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <KV label="Error ID" value={event.id} mono />
                  <KV label="Error Code" value={event.errorCode} mono href="/registry" />
                  <CopyableKV label="Correlation ID" value={event.correlationId} mono onCopy={() => copy(event.correlationId, 'corr')} copied={copied} copyKey="corr" />
                  <CopyableKV label="Trace ID" value={event.traceId} mono onCopy={() => copy(event.traceId, 'trace')} copied={copied} copyKey="trace" />
                  <KV label="Span ID" value={event.spanId} mono />
                  <KV label="Seam" value={event.seam} />
                </div>
              </SectionCard>

              <SectionCard title="Classification" icon={Hash}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Error Class</span>
                    <ErrorClassPill value={event.errorClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Severity</span>
                    <SeverityPill value={event.severity} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Status</span>
                    <LifecyclePill value={event.status} />
                  </div>
                  <KV label="Retryable" value={event.retryable ? 'Yes' : 'No'} />
                  <KV label="Domain" value={event.domain} />
                  <KV label="TTL" value={`${event.ttl} h`} />
                </div>
              </SectionCard>

              <SectionCard title="Tenancy" icon={Building2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <KV label="Tenant" value={event.tenant} href="/tenant" />
                  <KV label="Account ID" value={event.accountId} mono />
                  <KV label="Workspace ID" value={event.workspaceId} mono />
                  <KV label="Region" value={event.region} />
                </div>
              </SectionCard>

              <SectionCard title="Source & Timing" icon={Clock}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <KV label="Service" value={event.service} />
                  <KV label="Operation" value={event.operation} mono />
                  <KV label="Occurred At" value={fmt(event.occurredAt)} />
                  {event.resolvedAt && <KV label="Resolved At" value={fmt(event.resolvedAt)} />}
                  {event.assignee && (
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Assignee</span>
                      <AvatarChip initials={event.assigneeInitials!} name={event.assignee} size="md" />
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* retry state */}
              {event.retryCount > 0 && (
                <SectionCard title="Retry State" icon={RefreshCw}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-3">
                    <KV label="Attempts" value={`${event.retryCount} / ${event.maxRetries}`} />
                    {event.nextRetryAt && <KV label="Next Retry" value={fmt(event.nextRetryAt)} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(event.retryCount / Math.max(event.maxRetries, 1)) * 100}%`,
                          backgroundColor: event.retryCount >= event.maxRetries ? '#DC2626' : '#D97706',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {event.retryCount}/{event.maxRetries}
                    </span>
                  </div>
                </SectionCard>
              )}

              {/* ops-scoped internals */}
              <div className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden shadow-sm">
                <button onClick={() => setRevealInternals(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
                  <div className="flex items-center gap-2">
                    {revealInternals
                      ? <Eye className="h-3.5 w-3.5 text-[#2F6BFF]" />
                      : <EyeOff className="h-3.5 w-3.5 text-[#94A3B8]" />}
                    <span className="text-[12px] font-semibold text-[#334155] dark:text-slate-300">Reveal internals</span>
                    <span className="rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] px-1.5 py-px text-[9px] font-semibold uppercase">Ops scope</span>
                  </div>
                  {revealInternals
                    ? <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
                    : <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />}
                </button>
                {revealInternals && (
                  <div className="px-4 py-3.5 space-y-3.5 border-t border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-[#D97706] mt-0.5 shrink-0" />
                      <p className="text-[11px] text-[#92400E] leading-snug">
                        Platform-ops scope only. PII fields are redacted per tenant policy ({event.tenant}).
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">Developer Message</p>
                      <p className="text-[12px] font-mono bg-[#F8FAFC] dark:bg-[#0F172A] rounded-lg px-3 py-2 text-[#334155] dark:text-[#CBD5E1] leading-relaxed border border-[#E9EDF3] dark:border-[#334155]">
                        {event.message}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5">Context JSON</p>
                      <pre className="text-[11px] font-mono bg-[#0F172A] text-[#A5F3FC] rounded-xl px-3.5 py-3 overflow-x-auto leading-relaxed border border-[#1E3A5F]">
                        {JSON.stringify(event.context, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── BUSINESS DECISION ─────────────────────────────────────── */}
          {tab === 'business' && business && (
            <div className="px-5 py-4 space-y-4">
              {/* intent banner */}
              <div className="flex items-start gap-2.5 rounded-xl bg-[#EEF2FF] dark:bg-[#312E81]/30 border border-[#C7D2FE] dark:border-[#4F46E5]/40 px-4 py-3">
                <Scale className="h-4 w-4 text-[#4F46E5] dark:text-[#A5B4FC] mt-0.5 shrink-0" />
                <p className="text-[12px] text-[#3730A3] dark:text-[#C7D2FE] leading-relaxed">
                  This is a <strong>business exception</strong> — a domain decision, not a defect. The system and the
                  caller both behaved correctly; a domain rule blocked the outcome. It routes to the owning Service
                  Role for a human decision rather than being retried.
                </p>
              </div>

              {/* rule + decision state */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">Domain Rule</p>
                  <p className="text-[13px] text-[#1E293B] dark:text-[#CBD5E1] leading-relaxed">{business.rule}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Decision State</span>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={
                      business.decision === 'approved' ? { backgroundColor: '#F0FDF4', color: '#15803D' }
                      : business.decision === 'rejected' ? { backgroundColor: '#FEF2F2', color: '#B91C1C' }
                      : { backgroundColor: '#FFFBEB', color: '#B45309' }
                    }>
                    {business.decision === 'pending' ? 'Awaiting decision' : business.decision}
                  </span>
                </div>
                <KV label="Owning Service Role" value={business.serviceRole} />
              </div>

              <Divider />

              {/* assignment resolved via pairing rule */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2.5">
                  Assignment — resolved via Pairing Rule
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Primary Approver</span>
                    <AvatarChip initials={business.approverInitials} name={business.approver} size="md" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Backup</span>
                    <span className="text-[12px] font-medium text-[#1E293B] dark:text-[#CBD5E1]">{business.backup}</span>
                  </div>
                </div>
              </div>

              <Divider />

              {/* next-step actions — the affordance */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2.5">
                  Next Steps
                </p>
                {isClosed ? (
                  <p className="text-[12px] text-[#94A3B8]">This exception is closed — no further action available.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {business.actions.map(a => (
                      <button key={a.key}
                        onClick={() => trigger('route')}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#C7D2FE] dark:border-[#4F46E5]/40 bg-[#EEF2FF] dark:bg-[#312E81]/30 px-3.5 py-2.5 text-left hover:border-[#4F46E5] transition-colors group">
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-[#3730A3] dark:text-[#C7D2FE]">
                          <Send className="h-3.5 w-3.5" /> {a.label}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#818CF8] group-hover:text-[#4F46E5]" />
                      </button>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => trigger('approve')}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#16A34A] text-white text-[12px] font-semibold hover:bg-[#15803D] transition-colors">
                        <UserCheck className="h-3.5 w-3.5" /> Approve outcome
                      </button>
                      <button onClick={() => trigger('reject')}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#FEF2F2] dark:bg-[#DC2626]/15 text-[#DC2626] border border-[#FECACA] dark:border-[#DC2626]/40 text-[12px] font-semibold hover:bg-[#DC2626] hover:text-white transition-colors">
                        <XCircle className="h-3.5 w-3.5" /> Reject outcome
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* compensation (FR-E9) */}
              <Divider />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">
                  Compensation on rejection (saga)
                </p>
                {business.compensation ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#FDE68A] dark:border-[#B45309]/40 bg-[#FFFBEB] dark:bg-[#78350F]/20 px-3.5 py-2.5">
                    <Undo2 className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-semibold text-[#92400E] dark:text-[#FCD34D]">{business.compensation}</p>
                      <p className="text-[11px] text-[#B45309] dark:text-[#FBBF24] mt-0.5">
                        Runs automatically in reverse order if the outcome is rejected (PRD FR-E9).
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#94A3B8]">No compensating task declared — no upstream side-effect to unwind.</p>
                )}
              </div>
            </div>
          )}

          {/* ── CAUSATION CHAIN ───────────────────────────────────────── */}
          {tab === 'chain' && (
            <div className="px-5 py-4">
              <SectionCard title="Causation Chain" icon={GitBranch}>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-4">
                  Execution path — user action → event → error → envelope
                </p>
                <div className="relative pl-7">
                {/* vertical rail */}
                <div className="absolute left-[10px] top-2.5 bottom-2.5 w-px bg-[#E9EDF3] dark:bg-[#334155]" />

                {causationNodes.map((node, idx) => {
                  const c      = nodeColors(node.status)
                  const isLast = idx === causationNodes.length - 1
                  return (
                    <div key={node.step} className={isLast ? '' : 'mb-3'}>
                      {/* dot */}
                      <div className="absolute left-[3px] mt-[10px] flex h-[18px] w-[18px] items-center justify-center rounded-full border-2"
                        style={{ backgroundColor: c.bg, borderColor: c.border }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
                      </div>

                      {/* card */}
                      <div className="rounded-xl border transition-shadow hover:shadow-sm"
                        style={{ borderColor: c.border, backgroundColor: c.bg }}>
                        <div className="px-3.5 py-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
                              <span className="text-[9px] font-bold uppercase tracking-wide text-[#94A3B8]">Step {node.step}</span>
                              <span className="text-[#CBD5E1]">·</span>
                              <span className="font-semibold text-[#1E293B] truncate">{node.service}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-[#94A3B8] shrink-0" />
                              <span className="text-[#64748B] truncate">{node.operation}</span>
                            </div>
                            <span className="text-[9px] font-bold uppercase shrink-0" style={{ color: c.label }}>
                              {node.status}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-[#334155]">{node.message}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="font-mono text-[10px] text-[#94A3B8]">{fmtShort(node.ts)}</span>
                            {node.errorId && (
                              <Link href={`/errors/${node.errorId}`}
                                className="flex items-center gap-1 text-[10px] font-mono text-[#2F6BFF] hover:underline">
                                <Fingerprint className="h-3 w-3" /> {node.errorId}
                              </Link>
                            )}
                            {node.eventId && (
                              <span className="flex items-center gap-1 text-[10px] font-mono text-[#7C3AED]">
                                <Zap className="h-3 w-3" /> {node.eventId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isLast && <div className="h-3" />}
                    </div>
                  )
                })}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── RETRY / DLQ ───────────────────────────────────────────── */}
          {tab === 'retry' && (
            <div className="px-5 py-4 space-y-4">
              {isDead && (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#DC2626] shrink-0" />
                    <p className="text-[13px] font-semibold text-[#B91C1C]">In Dead-Letter Queue</p>
                  </div>
                  <p className="text-[12px] text-[#7F1D1D] leading-relaxed">
                    Max retries ({event.maxRetries}) exhausted. Redrive will re-enter the event at seam{' '}
                    <strong>{event.seam}</strong>. Discard requires an audited reason.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => trigger('redrive')}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-[#D97706] text-white hover:bg-[#B45309] transition-colors">
                      <RefreshCw className="h-3 w-3" /> Redrive
                    </button>
                    <button onClick={() => trigger('discard')}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors">
                      <Trash2 className="h-3 w-3" /> Discard
                    </button>
                  </div>
                </div>
              )}

              {retryHistory.length === 0 ? (
                <SectionCard title="Retry History" icon={RefreshCw}>
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <Minus className="h-8 w-8 text-[#E2E8F0]" />
                    <p className="text-[12px] text-[#94A3B8]">No retry attempts recorded.</p>
                  </div>
                </SectionCard>
              ) : (
                <SectionCard title={`Retry History (${retryHistory.length})`} icon={RefreshCw}>
                  <div className="space-y-2">
                  {retryHistory.map(r => (
                    <div key={r.attempt}
                      className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${
                        r.outcome === 'success' ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-[#FECACA] bg-[#FEF2F2]'
                      }`}>
                      <div className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-full mt-0.5 ${r.outcome === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}>
                        {r.outcome === 'success'
                          ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                          : <XCircle    className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[#1E293B]">Attempt {r.attempt}</span>
                          <span className="font-mono text-[10px] text-[#94A3B8]">{fmtShort(r.ts)}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{r.detail}</p>
                        <span className="text-[10px] text-[#94A3B8] mt-1 block">Backoff: {r.backoffSec}s</span>
                      </div>
                    </div>
                  ))}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── SAGA ──────────────────────────────────────────────────── */}
          {tab === 'saga' && (
            <div className="px-5 py-4">
              {sagaSteps.length === 0 ? (
                <SectionCard title="Saga Compensation" icon={Undo2}>
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <Minus className="h-8 w-8 text-[#E2E8F0]" />
                    <p className="text-[12px] text-[#94A3B8]">No saga / compensation data for this error class or domain.</p>
                  </div>
                </SectionCard>
              ) : (
                <SectionCard title="Compensating Steps" icon={Undo2}>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 mb-3">
                    Reverse execution order
                  </p>
                  <div className="space-y-2">
                  {sagaSteps.map((s) => {
                    const sc = s.outcome === 'success' ? { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', dot: '#16A34A' }
                      : s.outcome === 'failed'  ? { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#DC2626' }
                      : s.outcome === 'running' ? { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', dot: '#3B82F6' }
                      : { bg: '#F8FAFC', border: '#E9EDF3', text: '#64748B', dot: '#94A3B8' }
                    return (
                      <div key={s.step} className="flex items-start gap-3 rounded-xl border px-3.5 py-2.5"
                        style={{ borderColor: sc.border, backgroundColor: sc.bg }}>
                        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: sc.dot }}>{s.step}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-[#1E293B]">{s.name}</span>
                            <span className="text-[10px] font-bold uppercase" style={{ color: sc.text }}>{s.outcome}</span>
                          </div>
                          <span className="font-mono text-[10px] text-[#94A3B8]">{fmtShort(s.ts)}</span>
                          {s.envelopeId && (
                            <div className="mt-1">
                              <Link href={`/errors/${s.envelopeId}`}
                                className="flex items-center gap-1 text-[10px] font-mono text-[#2F6BFF] hover:underline">
                                <Fingerprint className="h-3 w-3" /> {s.envelopeId}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── RELATED LOGS ──────────────────────────────────────────── */}
          {tab === 'logs' && (
            <div className="px-5 py-4">
              <SectionCard
                title="Related Logs"
                icon={ScrollText}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 -mt-1">
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    Correlation <span className="font-mono text-[#2F6BFF]">{event.correlationId}</span>
                  </p>
                  <Link href="/logs"
                    className="flex items-center gap-1 text-[11px] font-medium text-[#2F6BFF] hover:underline">
                    Open in Log Viewer <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              {relatedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <ScrollText className="h-8 w-8 text-[#E2E8F0]" />
                  <p className="text-[12px] text-[#94A3B8]">No log lines found for this correlation ID in the current dataset.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-[#0F172A] overflow-hidden border border-[#1E3A5F] -mx-1">
                  {relatedLogs.map((log, i) => {
                    const lc = log.level === 'FATAL' ? '#F87171'
                      : log.level === 'ERROR' ? '#FCA5A5'
                      : log.level === 'WARN'  ? '#FCD34D'
                      : log.level === 'DEBUG' ? '#94A3B8'
                      : '#A5F3FC'
                    return (
                      <div key={log.id}
                        className={`grid grid-cols-[80px_52px_140px_1fr] gap-2 px-3 py-1.5 font-mono text-[10.5px] ${i % 2 === 0 ? '' : 'bg-[#1E293B]/40'}`}>
                        <span className="text-[#475569]">{fmtShort(log.timestamp)}</span>
                        <span className="font-bold text-right" style={{ color: lc }}>{log.level}</span>
                        <span className="text-[#7C3AED] truncate">[{log.service}]</span>
                        <span className="text-[#E2E8F0] break-words">{log.message}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              </SectionCard>
            </div>
          )}

          {/* ── AUDIT TRAIL ───────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div className="px-5 py-4">
              <SectionCard title={`Audit Trail (${auditTrail.length})`} icon={User}>
                <div className="space-y-2">
              {auditTrail.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-[#E9EDF3] dark:border-[#334155] px-3.5 py-2.5 bg-white dark:bg-[#1E293B]">
                  <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF1FE] dark:bg-[#1E3A5F]">
                    {entry.actor === 'system'
                      ? <Zap className="h-3.5 w-3.5 text-[#2F6BFF]" />
                      : <User className="h-3.5 w-3.5 text-[#2F6BFF]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-semibold text-[#1E293B] dark:text-white">{entry.actor}</span>
                        {entry.impersonated && (
                          <span className="rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] px-1.5 text-[9px] font-bold uppercase">
                            Impersonated
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[#94A3B8] shrink-0">{fmtShort(entry.ts)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="rounded bg-[#F1F5F9] dark:bg-[#334155] px-1.5 py-0.5 text-[10px] font-mono text-[#64748B]">
                        {entry.action}
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">{entry.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
                </div>
              </SectionCard>
            </div>
          )}

          </MotionTabPanel>
        </div>
        {/* end body */}

      </motion.div>
      {/* end wrapper */}

      {/* confirm modal */}
      {confirmAction && (
        <ConfirmModal action={confirmAction} onConfirm={onConfirmed} onCancel={() => setConfirmAction(null)} />
      )}
    </>
  )
}
