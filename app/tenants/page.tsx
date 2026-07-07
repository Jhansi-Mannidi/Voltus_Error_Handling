'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { SeverityPill, LifecyclePill, ErrorClassPill } from '@/components/voltus/status-pill'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import {
  Building2, AlertTriangle, CheckCircle2, Inbox, ShieldCheck,
  Lock, Unlock, MapPin, Mail, ArrowUpDown, Activity,
  ChevronDown, ChevronRight, Users,
} from 'lucide-react'
import { tenants, errorEvents, type TenantConfig } from '@/lib/data'

const planMeta: Record<TenantConfig['plan'], { color: string; bg: string }> = {
  Enterprise: { color: '#7C3AED', bg: '#F3EEFF' },
  Business:   { color: '#2563EB', bg: '#E8F0FE' },
  Starter:    { color: '#64748B', bg: '#F1F5F9' },
}

export default function TenantsPage() {
  const [expanded, setExpanded] = useState<string | null>('tnt-001')
  const [sortField, setSortField] = useState<'quota' | 'errors'>('errors')

  const eventsForTenant = (tenantId: string) =>
    errorEvents.filter(e => e.tenantId === tenantId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

  const totalErrors = errorEvents.length
  const activeTenants = tenants.filter(t => t.active).length
  const quotaCritical = tenants.filter(t => (t.usedQuota / t.errorQuota) >= 0.85).length

  const sorted = useMemo(() => [...tenants].sort((a, b) => {
    if (sortField === 'quota') return (b.usedQuota / b.errorQuota) - (a.usedQuota / a.errorQuota)
    return eventsForTenant(b.id).length - eventsForTenant(a.id).length
  }), [sortField])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(sorted, {
    pageSize: 10,
    resetDeps: [sortField],
  })

  return (
    <AppShell>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Tenants',   value: tenants.length, icon: Building2,    accent: '#2F6BFF', bg: '#EAF1FE' },
          { label: 'Active Tenants',  value: activeTenants,  icon: CheckCircle2, accent: '#16A34A', bg: '#F0FDF4' },
          { label: 'Total Errors',    value: totalErrors,    icon: AlertTriangle, accent: '#DC2626', bg: '#FEF2F2' },
          { label: 'Near Quota',      value: quotaCritical,  icon: Activity,     accent: '#D97706', bg: '#FFFBEB' },
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-1.5 rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4">
            <span className="absolute top-0 left-3 right-3 h-[3px] rounded-b-full" style={{ backgroundColor: k.accent }} />
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{k.label}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: k.bg }}>
                <k.icon className="h-3 w-3" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-[28px] font-bold leading-none text-[#1E293B] dark:text-white">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Quota overview */}
      <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white">Error Quota Overview</h3>
          <button
            onClick={() => setSortField(sortField === 'quota' ? 'errors' : 'quota')}
            className="flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#2F6BFF] transition-colors"
          >
            <ArrowUpDown className="h-3 w-3" />
            Sort by {sortField === 'quota' ? 'errors' : 'quota usage'}
          </button>
        </div>
        <div className="space-y-4">
          {sorted.map(t => {
            const pct = (t.usedQuota / t.errorQuota) * 100
            const barColor = pct >= 85 ? '#DC2626' : pct >= 60 ? '#D97706' : '#16A34A'
            const plan = planMeta[t.plan]
            const evts = eventsForTenant(t.id)

            return (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-[160px] shrink-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${t.active ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`} />
                  <span className="text-[12px] font-semibold text-[#1E293B] dark:text-white truncate">{t.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-[#64748B]">{t.usedQuota} / {t.errorQuota} errors used</span>
                    <span className="font-semibold" style={{ color: barColor }}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: plan.bg, color: plan.color }}>
                    {t.plan}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">{evts.length} evt</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tenant accordion */}
      <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white mb-3">Tenant Error Details</h3>
      <MotionList motionKey={page} className="space-y-3">
        {paged.map(t => {
          const isOpen = expanded === t.id
          const evts = eventsForTenant(t.id)
          const plan = planMeta[t.plan]
          const pct = (t.usedQuota / t.errorQuota) * 100
          const barColor = pct >= 85 ? '#DC2626' : pct >= 60 ? '#D97706' : '#16A34A'

          return (
            <MotionItem key={t.id}>
            <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors"
                onClick={() => setExpanded(isOpen ? null : t.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${t.active ? 'bg-[#E8F0FE]' : 'bg-[#FEF2F2]'}`}>
                    <Building2 className={`h-4 w-4 ${t.active ? 'text-[#2563EB]' : 'text-[#DC2626]'}`} />
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-[#1E293B] dark:text-white">{t.name}</span>
                      <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: plan.bg, color: plan.color }}>{t.plan}</span>
                      {!t.active && (
                        <span className="text-[10px] font-semibold text-[#DC2626] bg-[#FEF2F2] rounded-full px-2 py-0.5">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-[#94A3B8]" />
                      <span className="text-[11px] text-[#64748B]">{t.region}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold" style={{ color: barColor }}>{Math.round(pct)}% quota</span>
                    <div className="w-20 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{evts.length} errors</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-[#94A3B8]" /> : <ChevronRight className="h-4 w-4 text-[#94A3B8]" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#E9EDF3] dark:border-[#334155]">
                  {/* Config info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-4 border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div>
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1">Contact</span>
                      <div className="flex items-center gap-1 text-[12px] text-[#334155] dark:text-slate-300">
                        <Mail className="h-3 w-3 text-[#94A3B8]" />
                        <span className="truncate">{t.contact}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1">Escalation</span>
                      <span className="text-[12px] text-[#334155] dark:text-slate-300">{t.escalation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1">PII Redaction</span>
                      <div className="flex items-center gap-1 text-[12px]">
                        {t.redactionEnabled
                          ? <><Lock className="h-3 w-3 text-[#16A34A]" /><span className="text-[#16A34A] font-semibold">Enabled</span></>
                          : <><Unlock className="h-3 w-3 text-[#D97706]" /><span className="text-[#D97706] font-semibold">Disabled</span></>
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-1">Quota</span>
                      <span className="text-[12px] text-[#334155] dark:text-slate-300">{t.usedQuota} / {t.errorQuota}</span>
                    </div>
                  </div>

                  {/* Error table */}
                  {evts.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#94A3B8]">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      No errors for this tenant today
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                            {['CODE', 'SEV', 'STATUS', 'CLASS', 'SERVICE / DOMAIN', 'TIME'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.04em] border-b border-[#E9EDF3] dark:border-[#334155] whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {evts.map(evt => (
                            <tr key={evt.id} className="border-b border-[#E9EDF3] dark:border-[#334155] last:border-0 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="font-mono text-[10px] font-semibold text-[#2F6BFF]">{evt.errorCode}</span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><SeverityPill value={evt.severity} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><LifecyclePill value={evt.status} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><ErrorClassPill value={evt.errorClass} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="font-medium text-[#1E293B] dark:text-white">{evt.service}</div>
                                <div className="text-[9px] text-[#94A3B8] font-mono uppercase">{evt.domain}</div>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[#94A3B8]">
                                {new Date(evt.occurredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            </MotionItem>
          )
        })}
      </MotionList>

      {sorted.length > 0 && (
        <div className="mt-4 rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
          <Pagination
            page={page}
            pageCount={pageCount}
            total={total}
            perPage={perPage}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      )}
    </AppShell>
  )
}
