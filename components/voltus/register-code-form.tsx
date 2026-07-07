'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Tag, Lock, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CLASS_POLICY, type RegistryEntryFull, type ErrorClass, type Severity } from '@/mock'

export interface RegisterFormData {
  errorClass: ErrorClass
  domain: string
  defaultSeverity: Severity
  isRetriable: boolean
  userMessageKey: string
  description: string
  ownerTeam: string
  introducedIn: string
  deprecatedIn?: string
}

interface RegisterCodeFormProps {
  entry?: RegistryEntryFull
  allEntries: RegistryEntryFull[]
  onSave: (data: RegisterFormData) => void
  onCancel?: () => void
  cancelHref?: string
  layout?: 'page' | 'compact'
}

export function RegisterCodeForm({
  entry,
  allEntries,
  onSave,
  onCancel,
  cancelHref = '/registry',
  layout = 'page',
}: RegisterCodeFormProps) {
  const isEdit = !!entry
  const [form, setForm] = useState<RegisterFormData>({
    errorClass: entry?.errorClass ?? 'Technical',
    domain: entry?.domain ?? '',
    defaultSeverity: entry?.defaultSeverity ?? 'ERROR',
    isRetriable: entry?.isRetriable ?? false,
    userMessageKey: entry?.userMessageKey ?? '',
    description: entry?.description ?? '',
    ownerTeam: entry?.ownerTeam ?? '',
    introducedIn: entry?.introducedIn ?? 'v2025-Q3',
    deprecatedIn: entry?.deprecatedIn ?? '',
  })

  const nextNNNN = useMemo(() => {
    if (!form.domain) return '0000'
    const existing = allEntries
      .filter(r => r.domain === form.domain && r.errorClass === form.errorClass)
      .map(r => parseInt(r.errorCode.split('-').pop() ?? '0', 10))
    const max = existing.length > 0 ? Math.max(...existing) : 0
    return String(max + 1).padStart(4, '0')
  }, [form.domain, form.errorClass, allEntries])

  const classPrefix = form.errorClass === 'Technical' ? 'TEC' : form.errorClass === 'Functional' ? 'FUN' : 'BUS'
  const preview = form.domain ? `VLT-${classPrefix}-${form.domain}-${nextNNNN}` : 'VLT-???-???-0000'

  function up<K extends keyof RegisterFormData>(k: K, v: RegisterFormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const canSubmit = !!form.domain.trim() && form.description.trim().length > 0

  const formBody = (
    <div className={cn('space-y-4', layout === 'page' ? 'p-6' : 'p-5 flex-1')}>
      {!isEdit && (
        <div className="rounded-xl bg-[#EAF1FE] dark:bg-[#1a2744] p-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[#2F6BFF] shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#2F6BFF] uppercase tracking-widest">Auto-assigned code</p>
            <p className="font-mono text-[14px] font-bold text-[#2F6BFF]">{preview}</p>
            <p className="text-[10px] text-[#2563EB]">NNNN is never reused; registry refuses unregistered codes in non-dev environments.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Class</label>
          <select value={form.errorClass} onChange={e => up('errorClass', e.target.value as ErrorClass)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[#2F6BFF]">
            {(['Technical', 'Functional', 'Business'] as ErrorClass[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Domain</label>
          <input value={form.domain} onChange={e => up('domain', e.target.value.toUpperCase())}
            placeholder="e.g. CARRIER, DB, FIN"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] uppercase" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Default Severity</label>
          <select value={form.defaultSeverity} onChange={e => up('defaultSeverity', e.target.value as Severity)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-[#2F6BFF]">
            {(['INFO', 'WARN', 'ERROR', 'FATAL'] as Severity[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Retryable</label>
          <div className="flex gap-2 mt-1">
            {[true, false].map(v => (
              <button key={String(v)} type="button" onClick={() => up('isRetriable', v)}
                className={cn('flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all',
                  form.isRetriable === v ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF]' : 'border-border text-muted-foreground hover:bg-muted')}>
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(() => {
        const base = CLASS_POLICY[form.errorClass]
        const overridden = form.isRetriable !== base.retryable
        return (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              {form.errorClass} class-default policy
            </p>
            <p className="text-[11px] text-foreground leading-relaxed">
              {base.retryable
                ? <>Retries <span className="font-semibold">{base.maxRetries}×</span> with <span className="font-semibold">{base.backoffStrategy}</span> backoff · circuit breaker <span className="font-semibold">{base.circuitBreaker ? 'on' : 'off'}</span></>
                : <>No retry · straight to DLQ / caller · no circuit breaker</>}
            </p>
            <p className="text-[10px] mt-1 text-muted-foreground">
              {overridden
                ? 'Your Retryable choice overrides the class default — overrides are flagged in the registry.'
                : 'Retry policy is derived from the class; leave as-is to inherit the default.'}
            </p>
          </div>
        )
      })()}

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">i18n user_message_key</label>
        <input value={form.userMessageKey} onChange={e => up('userMessageKey', e.target.value)}
          placeholder="err.domain.short_key"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF]" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Description</label>
        <textarea value={form.description} onChange={e => up('description', e.target.value)} rows={3}
          placeholder="What this error means and when it fires…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] resize-none" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Owner Team</label>
          <input value={form.ownerTeam} onChange={e => up('ownerTeam', e.target.value)}
            placeholder="e.g. platform, payments"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF]" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Introduced In</label>
          <input value={form.introducedIn} onChange={e => up('introducedIn', e.target.value)}
            placeholder="v1.0.0 or v2025-Q3"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF]" />
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Deprecated In <span className="text-[#DC2626]">(leave blank if active)</span>
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3 py-2 mb-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">Codes can be deprecated but never deleted. Deprecated codes still resolve in error history.</p>
          </div>
          <input value={form.deprecatedIn ?? ''} onChange={e => up('deprecatedIn', e.target.value)}
            placeholder="v2025-Q4 — leave blank if active"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF]" />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
        ) : (
          <Link href={cancelHref}
            className="flex-1 py-2 rounded-xl border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors text-center">
            Cancel
          </Link>
        )}
        <button type="button" onClick={() => onSave(form)} disabled={!canSubmit}
          className={cn('flex-1 py-2 rounded-xl bg-[#2F6BFF] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity', !canSubmit && 'opacity-40 cursor-not-allowed')}>
          {isEdit ? 'Save changes' : 'Register code'}
        </button>
      </div>
    </div>
  )

  if (layout === 'compact') {
    return formBody
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden max-w-2xl">
      <div className="px-6 py-4 border-b border-border">
        <Link href="/registry"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-[#2F6BFF] transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to registry
        </Link>
        <h1 className="text-[18px] font-bold text-foreground">{isEdit ? 'Edit Error Code' : 'Register New Code'}</h1>
        {!isEdit && (
          <p className="text-[12px] text-muted-foreground mt-1">
            New codes ship via a reviewed migration — an <code className="bg-muted px-1 rounded text-[11px]">introduced_in</code> field is required.
          </p>
        )}
      </div>
      {formBody}
    </div>
  )
}
