'use client'

import { cn } from '@/lib/utils'
import type { ErrorClass, Severity, LifecycleStatus } from '@/lib/data'

/* ─── Error Class Pill ─────────────────────────────────────── */
export function ErrorClassPill({ value }: { value: ErrorClass }) {
  const map: Record<ErrorClass, string> = {
    Technical:  'bg-[#F3EEFF] text-[#7C3AED]',
    Functional: 'bg-[#E8F0FE] text-[#2563EB]',
    Business:   'bg-[#E7F6F0] text-[#059669]',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[value])}>
      {value}
    </span>
  )
}

/* ─── Severity Pill ────────────────────────────────────────── */
export function SeverityPill({ value }: { value: Severity }) {
  const map: Record<Severity, string> = {
    INFO:  'bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-slate-300',
    WARN:  'bg-amber-50  text-[#D97706] dark:bg-amber-900/30 dark:text-amber-400',
    ERROR: 'bg-red-50    text-[#DC2626] dark:bg-red-900/30 dark:text-red-400',
    FATAL: 'bg-[#7F1D1D] text-white',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[value])}>
      {value}
    </span>
  )
}

/* ─── Lifecycle Status Pill ────────────────────────────────── */
export function LifecyclePill({ value }: { value: LifecycleStatus }) {
  const map: Record<LifecycleStatus, string> = {
    open:      'bg-blue-50 text-[#2563EB]    dark:bg-blue-900/30 dark:text-blue-400',
    retrying:  'bg-amber-50 text-[#D97706]   dark:bg-amber-900/30 dark:text-amber-400',
    dlq:       'bg-red-50 text-[#DC2626]     dark:bg-red-900/30 dark:text-red-400',
    resolved:  'bg-green-50 text-[#16A34A]   dark:bg-green-900/30 dark:text-green-400',
    discarded: 'bg-slate-100 text-[#64748B]  dark:bg-slate-800 dark:text-slate-400',
  }
  const labels: Record<LifecycleStatus, string> = {
    open: 'Open', retrying: 'Retrying', dlq: 'DLQ', resolved: 'Resolved', discarded: 'Discarded',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[value])}>
      {labels[value]}
    </span>
  )
}

/* ─── ClassPill alias (backward compat) ─────────────────────── */
export { ErrorClassPill as ClassPill }

/* ─── Breaker State Pill ─────────────────────────────────────── */
export function BreakerStatePill({ value }: { value: 'closed' | 'open' | 'half-open' }) {
  const map = {
    closed:    'bg-green-50 text-[#16A34A] dark:bg-green-900/30 dark:text-green-400',
    open:      'bg-red-50 text-[#DC2626] dark:bg-red-900/30 dark:text-red-400',
    'half-open': 'bg-amber-50 text-[#D97706] dark:bg-amber-900/30 dark:text-amber-400',
  }
  const labels = { closed: 'Closed', open: 'Open', 'half-open': 'Half-Open' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', map[value])}>
      {labels[value]}
    </span>
  )
}

/* ─── Module Status Pill ─────────────────────────────────────── */
export function ModuleStatusPill({ value }: { value: 'not-started' | 'in-progress' | 'migrated' | 'blocked' }) {
  const map = {
    'not-started': 'bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-slate-400',
    'in-progress': 'bg-blue-50 text-[#2563EB] dark:bg-blue-900/30 dark:text-blue-400',
    migrated:      'bg-green-50 text-[#16A34A] dark:bg-green-900/30 dark:text-green-400',
    blocked:       'bg-red-50 text-[#DC2626] dark:bg-red-900/30 dark:text-red-400',
  }
  const labels = { 'not-started': 'Not Started', 'in-progress': 'In Progress', migrated: 'Migrated', blocked: 'Blocked' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', map[value])}>
      {labels[value]}
    </span>
  )
}

/* ─── Log Level Pill ───────────────────────────────────────── */
export function LogLevelPill({ value }: { value: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' }) {
  const map: Record<string, string> = {
    DEBUG: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    INFO:  'bg-blue-50 text-[#2563EB] dark:bg-blue-900/30 dark:text-blue-400',
    WARN:  'bg-amber-50 text-[#D97706] dark:bg-amber-900/30 dark:text-amber-400',
    ERROR: 'bg-red-50 text-[#DC2626] dark:bg-red-900/30 dark:text-red-400',
    FATAL: 'bg-[#7F1D1D] text-white',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-mono', map[value])}>
      {value}
    </span>
  )
}
