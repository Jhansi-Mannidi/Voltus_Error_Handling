'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import {
  Building2, AlertTriangle, Inbox, CheckCircle2,
  ShieldCheck, ShieldOff, MapPin, Mail, Lock, Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { tenants, errors, type Tenant } from '@/mock'

function PlanBadge({ plan }: { plan: string }) {
  const cfg = {
    Enterprise: { bg: '#F3EEFF', color: '#7C3AED' },
    Pro:        { bg: '#EAF1FE', color: '#2F6BFF' },
    Starter:    { bg: '#F0FDF4', color: '#16A34A' },
  }[plan] ?? { bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>{plan}</span>
  )
}

function QuotaBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, (used / total) * 100)
  const color = pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#16A34A'
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
        <span>{used.toLocaleString()} used</span>
        <span>{total.toLocaleString()} quota</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function TenantPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <TenantPageContent />
    </Suspense>
  )
}

function TenantPageContent() {
  const urlParams = useSearchParams()
  const [selected, setSelected] = useState<Tenant | null>(tenants[0])

  useEffect(() => {
    const id = urlParams.get('id')
    if (!id) {
      setSelected(tenants[0])
      return
    }
    const match = tenants.find(t => t.tenantId === id)
    if (match) setSelected(match)
  }, [urlParams])

  const tenantErrors = selected
    ? errors.filter(e => e.tenantId === selected.tenantId)
    : []

  // PRD §17.3 — tenant admins see business & functional in full; technical is
  // summarized with internals withheld. Business exceptions need a decision.
  const openBusiness = tenantErrors.filter(
    e => e.errorClass === 'Business' && e.status !== 'resolved' && e.status !== 'discarded',
  )

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100vh-9rem)] min-h-0">

        {/* Tenant list */}
        <div className="w-72 shrink-0 flex flex-col gap-1.5 overflow-y-auto">
          {tenants.map(t => {
            const isActive = selected?.tenantId === t.tenantId
            const hasAlert = t.dlqErrors > 0 || t.slaBreachCount > 0
            return (
              <button key={t.tenantId} onClick={() => setSelected(t)}
                className={cn(
                  'flex flex-col gap-2 rounded-[12px] border p-3.5 text-left transition-all',
                  isActive
                    ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1a2744]'
                    : 'border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#2F6BFF]/40 hover:shadow-sm'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F8FA] dark:bg-[#0F172A] shrink-0">
                      <Building2 className="h-4 w-4 text-[#64748B] dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#1E293B] dark:text-white truncate">{t.tenant}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono truncate">{t.accountId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <PlanBadge plan={t.plan} />
                    {hasAlert && <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" />}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-[#94A3B8]">
                    <AlertTriangle className="h-2.5 w-2.5" />{t.openErrors} open
                  </span>
                  {t.dlqErrors > 0 && (
                    <span className="flex items-center gap-1 text-[#DC2626] font-semibold">
                      <Inbox className="h-2.5 w-2.5" />{t.dlqErrors} DLQ
                    </span>
                  )}
                  {t.slaBreachCount > 0 && (
                    <span className="flex items-center gap-1 text-[#D97706] font-semibold">
                      {t.slaBreachCount} SLA breach
                    </span>
                  )}
                </div>

                <QuotaBar used={t.usedQuota} total={t.monthlyQuota} />
              </button>
            )
          })}
        </div>

        {/* Tenant detail */}
        {selected && (
          <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto pb-4">

            {/* Header */}
            <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[18px] font-bold text-[#1E293B] dark:text-white">{selected.tenant}</h2>
                    <PlanBadge plan={selected.plan} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px] text-[#64748B] dark:text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.region}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selected.contactEmail}</span>
                    <span className="flex items-center gap-1 font-mono">{selected.accountId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selected.piiRedaction
                    ? <span className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-[#F0FDF4] text-[#16A34A] text-[11px] font-semibold"><ShieldCheck className="h-3 w-3" />PII Redaction ON</span>
                    : <span className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-[#FEF2F2] text-[#DC2626] text-[11px] font-semibold"><ShieldOff  className="h-3 w-3" />PII Redaction OFF</span>
                  }
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Open Errors',  value: selected.openErrors,     accent: '#DC2626', bg: '#FEF2F2' },
                  { label: 'DLQ Items',    value: selected.dlqErrors,      accent: '#D97706', bg: '#FFFBEB' },
                  { label: 'SLA Breaches', value: selected.slaBreachCount, accent: '#7C3AED', bg: '#F3EEFF' },
                  { label: 'Workspace',    value: selected.workspaceId,    accent: '#2F6BFF', bg: '#EAF1FE', str: true },
                ].map(k => (
                  <div key={k.label} className="relative rounded-[10px] p-3 border border-[#E9EDF3] dark:border-[#334155]"
                    style={{ backgroundColor: k.bg }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: k.accent }}>{k.label}</div>
                    {'str' in k
                      ? <div className="text-[11px] font-mono font-semibold" style={{ color: k.accent }}>{k.value}</div>
                      : <div className="text-[24px] font-bold leading-none" style={{ color: k.accent }}>{k.value}</div>
                    }
                  </div>
                ))}
              </div>

              {/* Quota */}
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide mb-2">Monthly Error Quota</div>
                <QuotaBar used={selected.usedQuota} total={selected.monthlyQuota} />
                <div className="text-[10px] text-[#94A3B8] mt-1">
                  {((selected.usedQuota / selected.monthlyQuota) * 100).toFixed(0)}% consumed ·
                  {(selected.monthlyQuota - selected.usedQuota).toLocaleString()} remaining
                </div>
              </div>
            </div>

            {/* Business exceptions needing a decision */}
            {openBusiness.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-[14px] border border-[#C7D2FE] dark:border-[#4F46E5]/40 bg-[#EEF2FF] dark:bg-[#312E81]/30 px-4 py-3">
                <Scale className="h-4 w-4 text-[#4F46E5] dark:text-[#A5B4FC] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-[#3730A3] dark:text-[#C7D2FE]">
                    {openBusiness.length} business exception{openBusiness.length !== 1 ? 's' : ''} awaiting a decision
                  </p>
                  <p className="text-[11px] text-[#4F46E5] dark:text-[#A5B4FC] mt-0.5">
                    Domain rules blocked these outcomes — each routes to its owning Service Role for approval, not a retry.
                  </p>
                </div>
              </div>
            )}

            {/* Tenant error events */}
            <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155] flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white">Error Events — {selected.tenant}</h3>
                <span className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                  <Lock className="h-3 w-3" /> Business &amp; functional in full · technical internals withheld
                </span>
              </div>
              {tenantErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#94A3B8]">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-[13px]">No error events for this tenant</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                        {['CODE', 'CLASS', 'SERVICE', 'STATUS', 'OCCURRED'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.04em] border-b border-[#E9EDF3] dark:border-[#334155] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tenantErrors.map(e => {
                        const redactTech = e.errorClass === 'Technical'
                        return (
                        <tr key={e.id} className="border-b border-[#E9EDF3] dark:border-[#334155] last:border-0 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[10px] font-semibold text-[#2F6BFF] whitespace-nowrap">{e.errorCode}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: e.errorClass === 'Technical' ? '#F3EEFF' : e.errorClass === 'Functional' ? '#E8F0FE' : '#E7F6F0',
                                color:           e.errorClass === 'Technical' ? '#7C3AED' : e.errorClass === 'Functional' ? '#2563EB'  : '#059669',
                              }}>
                              {e.errorClass}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {redactTech
                              ? <span className="flex items-center gap-1 text-[11px] text-[#94A3B8] italic"><Lock className="h-3 w-3" />internals withheld</span>
                              : <span className="text-[#1E293B] dark:text-white font-medium">{e.service}</span>}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="capitalize text-[11px] font-semibold" style={{
                              color: e.status === 'dlq' ? '#DC2626' : e.status === 'retrying' ? '#D97706' : e.status === 'resolved' ? '#16A34A' : '#64748B'
                            }}>{e.status}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[#94A3B8] text-[11px] whitespace-nowrap">
                            {new Date(e.occurredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
