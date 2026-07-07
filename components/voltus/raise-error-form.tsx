'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Hash, FileText,
  FlaskConical, Search, Building2, AlertTriangle, Zap, ArrowLeft,
} from 'lucide-react'
import { ErrorClassPill, SeverityPill, LifecyclePill } from './status-pill'
import {
  registry,
  tenants,
  type ErrorEnvelope,
  type ErrorClass,
  type Severity,
  type SeamName,
} from '@/mock'
import { cn } from '@/lib/utils'

export type RaiseSourceMode = 'registry' | 'manual' | 'test'
type Step = 'source' | 'details' | 'review' | 'success'

export interface RaiseErrorFormProps {
  layout?: 'page' | 'modal'
  initialMode?: RaiseSourceMode
  nextSno: number
  cancelHref?: string
  onCancel?: () => void
  onRaised: (envelope: ErrorEnvelope) => void
  onViewDetail?: (envelope: ErrorEnvelope) => void
}

interface FormState {
  errorCode: string
  errorClass: ErrorClass
  domain: string
  severity: Severity
  seam: SeamName
  service: string
  operation: string
  tenantId: string
  correlationId: string
  message: string
  causeChain: string
}

const CLASS_PREFIX: Record<ErrorClass, string> = {
  Technical: 'TEC',
  Functional: 'FNC',
  Business: 'BUS',
}

const SEVERITIES: Severity[] = ['INFO', 'WARN', 'ERROR', 'FATAL']
const CLASSES: ErrorClass[] = ['Technical', 'Functional', 'Business']
const SEAMS: SeamName[] = [
  'API Gateway',
  'Service Boundary',
  'Repository',
  'External Adapter',
  'AI Skill',
]

const DOMAINS = [
  'CARRIER', 'RATE', 'CUSTOMS', 'DOC', 'PAYMENT', 'SLA', 'AUTH', 'VESSEL',
  'COMPLIANCE', 'MLOPS', 'DB', 'GRD', 'FLW', 'FIN', 'NOTIFY', 'EDI',
] as const

const STEPS: { id: Step; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
]

const TEST_DEFAULTS: FormState = {
  errorCode: 'VLT-TEC-DB-0003',
  errorClass: 'Technical',
  domain: 'DB',
  severity: 'ERROR',
  seam: 'Repository',
  service: 'ShipmentOrchestrator',
  operation: 'persistBooking',
  tenantId: 'tnt-001',
  correlationId: '',
  message: 'PostgreSQL connection pool exhausted — all 20 connections in use; query timed out after 5 000 ms',
  causeChain: 'pool.active = 20/20\nquery.wait_timeout exceeded',
}

function suggestManualCode(errorClass: ErrorClass, domain: string) {
  const n = String(Math.floor(1000 + Math.random() * 8999))
  return `VLT-${CLASS_PREFIX[errorClass]}-${domain}-${n}`
}

function emptyForm(): FormState {
  return {
    errorCode: suggestManualCode('Technical', 'CARRIER'),
    errorClass: 'Technical',
    domain: 'CARRIER',
    severity: 'ERROR',
    seam: 'Service Boundary',
    service: '',
    operation: '',
    tenantId: tenants[0]?.tenantId ?? '',
    correlationId: '',
    message: '',
    causeChain: '',
  }
}

function genCorrelationId() {
  return `cid-freight-${Math.random().toString(36).slice(2, 8)}`
}

function registryToForm(entry: (typeof registry)[number]): FormState {
  return {
    errorCode: entry.errorCode,
    errorClass: entry.errorClass,
    domain: entry.domain,
    severity: entry.errorClass === 'Technical' ? 'ERROR' : entry.errorClass === 'Business' ? 'WARN' : 'ERROR',
    seam: entry.errorClass === 'Technical' ? 'External Adapter' : 'Service Boundary',
    service: '',
    operation: '',
    tenantId: tenants[0]?.tenantId ?? '',
    correlationId: '',
    message: entry.description,
    causeChain: '',
  }
}

function buildEnvelope(form: FormState, nextSno: number, source: string): ErrorEnvelope {
  const tenant = tenants.find(t => t.tenantId === form.tenantId) ?? tenants[0]
  const correlationId = form.correlationId.trim() || genCorrelationId()
  const id = `evt-${Date.now().toString(36)}`
  const entry = registry.find(r => r.errorCode === form.errorCode)

  return {
    id,
    sno: nextSno,
    errorCode: form.errorCode,
    correlationId,
    traceId: `trc-${Math.random().toString(36).slice(2, 8)}`,
    spanId: `spn-${Math.random().toString(36).slice(2, 4)}`,
    tenantId: tenant.tenantId,
    tenant: tenant.tenant,
    accountId: tenant.accountId,
    workspaceId: tenant.workspaceId,
    region: tenant.region,
    errorClass: form.errorClass,
    severity: form.severity,
    status: 'open',
    seam: form.seam,
    service: form.service.trim() || 'ManualRaise',
    operation: form.operation.trim() || 'raiseEnvelope',
    domain: form.domain,
    message: form.message.trim(),
    causeChain: form.causeChain.split('\n').map(s => s.trim()).filter(Boolean),
    retryCount: 0,
    maxRetries: entry?.maxRetries ?? (form.errorClass === 'Technical' ? 5 : 0),
    occurredAt: new Date().toISOString(),
    ttl: 72,
    retryable: entry?.isRetriable ?? form.errorClass === 'Technical',
    context: { raisedBy: 'manual', source },
  }
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
      {children}
      {required && <span className="text-[#DC2626] ml-0.5">*</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 h-9 text-[12px] text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/40'

const selectCls = inputCls

const textareaCls =
  'w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-2 text-[12px] text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/40'

export function RaiseErrorForm({
  layout = 'page',
  initialMode = 'manual',
  nextSno,
  cancelHref = '/errors',
  onCancel,
  onRaised,
  onViewDetail,
}: RaiseErrorFormProps) {
  const [step, setStep] = useState<Step>(initialMode === 'test' ? 'details' : 'source')
  const [mode, setMode] = useState<RaiseSourceMode>(initialMode)
  const [form, setForm] = useState<FormState>(
    initialMode === 'test' ? { ...TEST_DEFAULTS, correlationId: genCorrelationId() } : emptyForm(),
  )
  const [registrySearch, setRegistrySearch] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [raisedEnvelope, setRaisedEnvelope] = useState<ErrorEnvelope | null>(null)

  const filteredRegistry = useMemo(() => {
    const q = registrySearch.toLowerCase()
    if (!q) return registry.slice(0, 8)
    return registry
      .filter(r => `${r.errorCode} ${r.description} ${r.domain}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [registrySearch])

  function patch(p: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...p }))
  }

  function selectMode(m: RaiseSourceMode) {
    setMode(m)
    if (m === 'test') {
      setForm({ ...TEST_DEFAULTS, correlationId: genCorrelationId() })
      setStep('details')
    } else if (m === 'manual') {
      setForm(emptyForm())
      setStep('details')
    }
  }

  function selectRegistryCode(code: string) {
    const entry = registry.find(r => r.errorCode === code)
    if (!entry) return
    setSelectedCode(code)
    setForm(registryToForm(entry))
    setStep('details')
  }

  function canProceedFromDetails() {
    return !!(form.errorCode.trim() && form.message.trim().length >= 10 && form.service.trim() && form.operation.trim())
  }

  function handleRaise() {
    const envelope = buildEnvelope(form, nextSno, layout === 'page' ? 'raise-page' : 'raise-modal')
    setRaisedEnvelope(envelope)
    setStep('success')
    onRaised(envelope)
  }

  const stepIndex = step === 'success' ? 3 : STEPS.findIndex(s => s.id === step)

  const stepIndicator = step !== 'success' && (
    <div className={cn(
      'flex items-center gap-2 border-b border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]/60',
      layout === 'page' ? 'px-6 py-4' : 'px-5 py-3',
    )}>
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="h-3 w-3 text-[#CBD5E1]" />}
          <div className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
            stepIndex === i
              ? 'bg-[#2F6BFF] text-white'
              : stepIndex > i
                ? 'bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]'
                : 'bg-[#F1F5F9] dark:bg-[#334155] text-[#94A3B8]',
          )}>
            {stepIndex > i ? <CheckCircle2 className="h-3 w-3" /> : <span className="w-4 text-center">{i + 1}</span>}
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )

  const body = (
    <div className={cn('flex-1 overflow-y-auto min-h-0', layout === 'page' ? 'px-6 py-5' : 'px-5 py-4')}>
      {step === 'source' && (
        <div className="space-y-4">
          <p className="text-[12px] text-[#64748B] dark:text-slate-400">Choose how you want to raise the error envelope.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {([
              { m: 'registry' as const, icon: Hash, title: 'From Registry', desc: 'Pick a registered VLT error code with pre-defined classification', color: 'text-[#2F6BFF]', bg: 'bg-[#EAF1FE] dark:bg-[#1E3A5F]' },
              { m: 'manual' as const, icon: FileText, title: 'Manual Entry', desc: 'Define a custom envelope with full control over all fields', color: 'text-[#7C3AED]', bg: 'bg-[#F3EEFF]' },
              { m: 'test' as const, icon: FlaskConical, title: 'Quick Test Injection', desc: 'Dev tool — pre-fills VLT-TEC-DB-0003 for pipeline testing', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', wide: true },
            ]).map(({ m, icon: Icon, title, desc, color, bg, wide }) => (
              <button
                key={m}
                onClick={() => selectMode(m)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:border-[#2F6BFF]/50 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744]',
                  wide && 'sm:col-span-2 lg:col-span-1',
                  mode === m
                    ? m === 'test' ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-900/20' : 'border-[#2F6BFF] bg-[#EAF1FE]/50 dark:bg-[#1E3A5F]/30'
                    : 'border-[#E9EDF3] dark:border-[#334155]',
                )}
              >
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', bg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1E293B] dark:text-white">{title}</p>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {mode === 'registry' && (
            <div className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] p-4 space-y-3">
              <FieldLabel>Search registry</FieldLabel>
              <div className="flex items-center gap-2 rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3 h-9">
                <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                <input
                  value={registrySearch}
                  onChange={e => setRegistrySearch(e.target.value)}
                  placeholder="Search by code, domain, description…"
                  className="flex-1 bg-transparent text-[12px] text-[#1E293B] dark:text-white outline-none placeholder:text-[#94A3B8]"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredRegistry.map(entry => (
                  <button
                    key={entry.errorCode}
                    onClick={() => selectRegistryCode(entry.errorCode)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[#334155]',
                      selectedCode === entry.errorCode && 'bg-[#EAF1FE] dark:bg-[#1E3A5F]/40',
                    )}
                  >
                    <span className="font-mono text-[11px] font-semibold text-[#2F6BFF] shrink-0">{entry.errorCode}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#334155] dark:text-slate-300 truncate">{entry.description}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{entry.domain} · {entry.errorClass}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4 max-w-4xl">
          {mode === 'test' && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300">Test injection mode — edit fields or proceed to review</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel required>Error Code</FieldLabel>
              <input className={cn(inputCls, 'font-mono')} value={form.errorCode} onChange={e => patch({ errorCode: e.target.value })} placeholder="VLT-TEC-CARRIER-0001" readOnly={mode === 'registry'} />
            </div>
            <div>
              <FieldLabel required>Class</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {CLASSES.map(c => (
                  <button key={c} type="button" onClick={() => patch({ errorClass: c, errorCode: mode === 'manual' ? suggestManualCode(c, form.domain) : form.errorCode })}
                    className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors', form.errorClass === c ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]' : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B]')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>Severity</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {SEVERITIES.map(s => (
                  <button key={s} type="button" onClick={() => patch({ severity: s })}
                    className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors', form.severity === s ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]' : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B]')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel required>Domain</FieldLabel>
              <select className={selectCls} value={form.domain} onChange={e => { const domain = e.target.value; patch({ domain, errorCode: mode === 'manual' ? suggestManualCode(form.errorClass, domain) : form.errorCode }) }}>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel required>Seam</FieldLabel>
              <select className={selectCls} value={form.seam} onChange={e => patch({ seam: e.target.value as SeamName })}>
                {SEAMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel required>Service</FieldLabel>
              <input className={inputCls} value={form.service} onChange={e => patch({ service: e.target.value })} placeholder="ShipmentOrchestrator" />
            </div>
            <div>
              <FieldLabel required>Operation</FieldLabel>
              <input className={inputCls} value={form.operation} onChange={e => patch({ operation: e.target.value })} placeholder="allocateCarrier" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Tenant</FieldLabel>
              <select className={selectCls} value={form.tenantId} onChange={e => patch({ tenantId: e.target.value })}>
                {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.tenant} — {t.region}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel>Correlation ID</FieldLabel>
              <input className={cn(inputCls, 'font-mono')} value={form.correlationId} onChange={e => patch({ correlationId: e.target.value })} placeholder="Auto-generated if left blank" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel required>Message</FieldLabel>
              <textarea className={textareaCls} rows={3} value={form.message} onChange={e => patch({ message: e.target.value })} placeholder="Describe what went wrong…" />
              <p className={cn('text-[10px] mt-1', form.message.length < 10 ? 'text-[#DC2626]' : 'text-[#94A3B8]')}>{form.message.length} chars (min 10)</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <FieldLabel>Cause Chain</FieldLabel>
              <textarea className={textareaCls} rows={2} value={form.causeChain} onChange={e => patch({ causeChain: e.target.value })} placeholder="One cause per line (optional)" />
            </div>
          </div>
          <div className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">Preview</p>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-[12px] font-semibold text-[#2F6BFF]">{form.errorCode || 'VLT-???'}</span>
              {form.errorClass && <ErrorClassPill value={form.errorClass} />}
              {form.severity && <SeverityPill value={form.severity} />}
              <LifecyclePill value="open" />
            </div>
            <p className="text-[12px] font-medium text-[#1E293B] dark:text-white">{form.service || 'Service'} · {form.operation || 'operation'}</p>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 line-clamp-2">{form.message || 'Error message will appear here…'}</p>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-start gap-3 rounded-xl border border-[#E9EDF3] dark:border-[#334155] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FE] dark:bg-[#1E3A5F]">
              <AlertTriangle className="h-5 w-5 text-[#2F6BFF]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[13px] font-bold text-[#2F6BFF]">{form.errorCode}</span>
                <ErrorClassPill value={form.errorClass} />
                <SeverityPill value={form.severity} />
                <LifecyclePill value="open" />
              </div>
              <p className="text-[13px] font-semibold text-[#1E293B] dark:text-white">{form.service} · {form.operation}</p>
              <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-1">{form.message}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[12px]">
            {[
              ['Domain', form.domain],
              ['Seam', form.seam],
              ['Tenant', tenants.find(t => t.tenantId === form.tenantId)?.tenant ?? '—'],
              ['Region', tenants.find(t => t.tenantId === form.tenantId)?.region ?? '—'],
              ['Correlation', form.correlationId || '(auto-generated)'],
              ['Prefix', `VLT-${CLASS_PREFIX[form.errorClass]}-${form.domain}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A]/60 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</p>
                <p className="text-[#1E293B] dark:text-white font-medium mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            The envelope will be injected with status <strong className="text-[#2563EB]">open</strong> and appear at the top of the event log.
          </p>
        </div>
      )}

      {step === 'success' && raisedEnvelope && (
        <div className="flex flex-col items-center text-center py-8 space-y-4 max-w-lg mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0FDF4] dark:bg-green-900/30">
            <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#1E293B] dark:text-white">Error Raised</h3>
            <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-1">Envelope injected into the event stream</p>
          </div>
          <div className="w-full rounded-xl border border-[#E9EDF3] dark:border-[#334155] p-4 text-left">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-[13px] font-bold text-[#2F6BFF]">{raisedEnvelope.errorCode}</span>
              <ErrorClassPill value={raisedEnvelope.errorClass} />
              <SeverityPill value={raisedEnvelope.severity} />
            </div>
            <div className="grid gap-2 text-[11px]">
              <div className="flex justify-between gap-2"><span className="text-[#94A3B8]">Envelope ID</span><span className="font-mono text-[#1E293B] dark:text-white">{raisedEnvelope.id}</span></div>
              <div className="flex justify-between gap-2"><span className="text-[#94A3B8]">Correlation</span><span className="font-mono text-[#1E293B] dark:text-white truncate">{raisedEnvelope.correlationId}</span></div>
              <div className="flex justify-between gap-2"><span className="text-[#94A3B8]">Tenant</span><span className="text-[#1E293B] dark:text-white flex items-center gap-1"><Building2 className="h-3 w-3 text-[#94A3B8]" />{raisedEnvelope.tenant}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className={cn(
      'shrink-0 flex items-center justify-between gap-2 border-t border-[#E9EDF3] dark:border-[#334155] bg-[#FAFBFF] dark:bg-[#0F172A]/40',
      layout === 'page' ? 'px-6 py-4' : 'px-5 py-3',
    )}>
      {step === 'success' ? (
        <>
          <button onClick={() => { setStep('source'); setForm(emptyForm()); setRaisedEnvelope(null) }}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
            Raise Another
          </button>
          {onViewDetail ? (
            <button onClick={() => raisedEnvelope && onViewDetail(raisedEnvelope)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white transition-colors">
              View Details
            </button>
          ) : (
            <Link href={cancelHref}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white transition-colors">
              Back to Event Log
            </Link>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => {
              if (step === 'details' && mode !== 'test') setStep('source')
              else if (step === 'review') setStep('details')
              else if (onCancel) onCancel()
              else window.location.href = cancelHref
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {step === 'source' ? 'Cancel' : 'Back'}
          </button>
          {step === 'source' && mode !== 'registry' && (
            <button disabled={mode !== 'manual' && mode !== 'test'} onClick={() => mode === 'manual' && setStep('details')}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white transition-colors disabled:opacity-40">
              Continue <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {step === 'details' && (
            <button disabled={!canProceedFromDetails()} onClick={() => setStep('review')}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Review <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {step === 'review' && (
            <button onClick={handleRaise}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white transition-colors">
              <Zap className="h-3.5 w-3.5" />
              Raise Envelope
            </button>
          )}
        </>
      )}
    </div>
  )

  const inner = (
    <>
      {stepIndicator}
      {body}
      {footer}
    </>
  )

  if (layout === 'page') {
    return (
      <div className="w-full min-w-0 max-w-full rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden flex flex-col min-h-[calc(100dvh-12rem)]">
        <div className="shrink-0 px-6 py-5 border-b border-[#E9EDF3] dark:border-[#334155]">
          <Link href={cancelHref}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#2F6BFF] transition-colors mb-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to event log
          </Link>
          <h1 className="text-[20px] font-bold text-[#1E293B] dark:text-white">Raise Error</h1>
          <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-1">
            Create a canonical error envelope and inject it into the event stream
          </p>
        </div>
        <div className="flex flex-col flex-1 min-h-0">{inner}</div>
      </div>
    )
  }

  return (
    <div className="relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl">
      <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E9EDF3] dark:border-[#334155]">
        <div>
          <h2 className="text-[16px] font-bold text-[#1E293B] dark:text-white">Raise Error</h2>
          <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">Create a canonical error envelope and inject it into the event stream</p>
        </div>
      </div>
      {inner}
    </div>
  )
}
