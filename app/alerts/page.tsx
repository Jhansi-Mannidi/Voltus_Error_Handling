'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { SeverityPill } from '@/components/voltus/status-pill'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import {
  BellRing, Plus, Edit2, Trash2, Play, Pause, VolumeX,
  MessageSquare, Mail, Phone, CheckCircle2, AlertCircle,
  Building2, Search, ShieldCheck, Clock, Zap, AlertTriangle,
} from 'lucide-react'
import { alertRules as libAlertRules } from '@/lib/data'

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  PagerDuty: BellRing,
  Slack:     MessageSquare,
  Email:     Mail,
  SMS:       Phone,
}

const CHANNEL_COLORS: Record<string, string> = {
  PagerDuty: '#DC2626',
  Slack:     '#4A154B',
  Email:     '#2F6BFF',
  SMS:       '#059669',
}

const tenantConfig = [
  { id: 'tnt-001', name: 'Gulf Cargo LLC',      region: 'Ras Al Khaimah, UAE', plan: 'Enterprise', errorQuota: 500, usedQuota: 342, active: true,  contact: 'ops@gulfcargo.ae',         escalation: 'P1 → P2 → Exec', redactionEnabled: true  },
  { id: 'tnt-002', name: 'Horizon Shipping',    region: 'Dubai, UAE',          plan: 'Business',   errorQuota: 300, usedQuota: 178, active: true,  contact: 'it@horizonshipping.com',   escalation: 'P2 → P3',        redactionEnabled: true  },
  { id: 'tnt-003', name: 'Al Futtaim Logistics',region: 'Abu Dhabi, UAE',      plan: 'Enterprise', errorQuota: 500, usedQuota: 97,  active: true,  contact: 'tech@alfuttaim.ae',        escalation: 'P1 → P2',        redactionEnabled: false },
  { id: 'tnt-004', name: 'Triton Freight',      region: 'Sharjah, UAE',        plan: 'Starter',    errorQuota: 100, usedQuota: 89,  active: false, contact: 'admin@tritonfreight.com',  escalation: 'P3 only',        redactionEnabled: false },
]

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'tenants' | 'playbook'>('rules')
  const [search, setSearch]       = useState('')
  const [rules, setRules]         = useState(libAlertRules)

  const filteredRules = useMemo(() => rules.filter(r =>
    !search || `${r.name} ${r.condition} ${r.channel} ${r.owner}`.toLowerCase().includes(search.toLowerCase())
  ), [rules, search])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filteredRules, {
    pageSize: 10,
    resetDeps: [search, activeTab],
  })

  const activeCount = rules.filter(r => r.status === 'active').length
  const pausedCount = rules.filter(r => r.status === 'paused').length
  const mutedCount  = rules.filter(r => r.status === 'muted').length
  const totalFired  = rules.reduce((acc, r) => acc + r.triggeredCount, 0)

  function toggleStatus(id: string) {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r
      const next = r.status === 'active' ? 'paused' : 'active'
      return { ...r, status: next }
    }))
  }

  return (
    <AppShell>
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active Rules', value: activeCount, color: '#16A34A', bg: '#F0FDF4',  icon: CheckCircle2 },
          { label: 'Paused',       value: pausedCount, color: '#D97706', bg: '#FFFBEB',  icon: Pause        },
          { label: 'Muted',        value: mutedCount,  color: '#64748B', bg: '#F1F5F9',  icon: VolumeX      },
          { label: 'Total Fired',  value: totalFired,  color: '#DC2626', bg: '#FEF2F2',  icon: Zap          },
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-2 rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: k.color }} />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{k.label}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: k.bg }}>
                <k.icon className="h-4 w-4" style={{ color: k.color }} />
              </span>
            </div>
            <span className="text-[28px] font-bold text-[#1E293B] dark:text-white leading-none">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Live firing banner */}
      {rules.some(r => r.triggeredCount > 0 && r.status === 'active') && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-400">
            {rules.filter(r => r.triggeredCount > 0 && r.status === 'active').length} alert{rules.filter(r => r.triggeredCount > 0 && r.status === 'active').length !== 1 ? 's' : ''} actively firing
          </p>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {rules.filter(r => r.triggeredCount > 0 && r.status === 'active').map(r => (
              <span key={r.id} className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-[11px] font-semibold">
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Panel */}
      <div className="rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex gap-1">
            {(['rules', 'tenants', 'playbook'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  activeTab === t
                    ? 'bg-[#2F6BFF]/10 text-[#2F6BFF] dark:text-[#93C5FD]'
                    : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
                }`}
              >
                {t === 'rules' ? `Rules (${rules.length})` : t === 'tenants' ? `Tenants (${tenantConfig.length})` : 'Playbooks'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#334155] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="bg-transparent text-[13px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none w-32" />
            </div>
            {activeTab === 'rules' && (
              <button className="flex items-center gap-1.5 rounded-lg bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-3 py-1.5 text-[13px] font-semibold transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Rule</span>
              </button>
            )}
          </div>
        </div>

        {/* Alert Rules table */}
        {activeTab === 'rules' && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                  {['RULE', 'CONDITION', 'SEV', 'CHANNEL', 'STATUS', 'FIRED', 'LAST FIRED', 'OWNER', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.05em] whitespace-nowrap border-b border-[#E9EDF3] dark:border-[#334155]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MotionList motionKey={page} className="contents">
                {paged.map(rule => {
                  const Ic  = CHANNEL_ICONS[rule.channel] ?? BellRing
                  const cc  = CHANNEL_COLORS[rule.channel] ?? '#64748B'
                  const firing = rule.triggeredCount > 0 && rule.status === 'active'
                  return (
                    <MotionItem key={rule.id} className="contents">
                    <tr className={`border-b border-[#E9EDF3] dark:border-[#334155] last:border-0 transition-colors ${
                      firing ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30' : 'hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744]'
                    }`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {firing && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                          <span className="font-semibold text-[#1E293B] dark:text-white">{rule.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <code className="text-[11px] bg-[#F1F5F9] dark:bg-[#334155] text-[#334155] dark:text-slate-300 rounded px-2 py-0.5 block truncate">{rule.condition}</code>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SeverityPill value={rule.severity} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: cc }}>
                          <Ic className="h-3 w-3" />
                          {rule.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          rule.status === 'active' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                          rule.status === 'paused' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                          'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400'
                        }`}>
                          {rule.status === 'active' ? <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> :
                           rule.status === 'paused' ? <Pause className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[13px] font-bold ${rule.triggeredCount > 0 ? 'text-[#DC2626]' : 'text-[#94A3B8]'}`}>{rule.triggeredCount}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[#94A3B8] font-mono">
                        {rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' GST' : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2F6BFF] text-white text-[9px] font-bold">{rule.ownerInitials}</span>
                          <span className="text-[12px] text-[#64748B] dark:text-slate-400 hidden sm:inline">{rule.owner.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EAF1FE] dark:hover:bg-[#1E3A5F] hover:text-[#2F6BFF] transition-colors" title="Edit">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleStatus(rule.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors"
                            title={rule.status === 'active' ? 'Pause' : 'Resume'}>
                            {rule.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                          <button className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-[#DC2626] transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    </MotionItem>
                  )
                })}
                </MotionList>
              </tbody>
            </table>
            {filteredRules.length > 0 && (
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
            )}
          </div>
        )}

        {/* Tenant Config tab */}
        {activeTab === 'tenants' && (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tenantConfig
                .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
                .map(t => {
                  const pct   = (t.usedQuota / t.errorQuota) * 100
                  const color = pct > 85 ? '#DC2626' : pct > 60 ? '#D97706' : '#16A34A'
                  return (
                    <div key={t.id} className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] p-4 bg-white dark:bg-[#1E293B]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]">
                            <Building2 className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="font-semibold text-[14px] text-[#1E293B] dark:text-white">{t.name}</div>
                            <div className="text-[11px] text-[#94A3B8]">{t.region}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.plan === 'Enterprise' ? 'bg-[#F3EEFF] text-[#7C3AED]' :
                            t.plan === 'Business'   ? 'bg-[#EAF1FE] text-[#2F6BFF]' :
                            'bg-[#F1F5F9] text-[#64748B]'
                          }`}>{t.plan}</span>
                          {t.active
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <AlertCircle  className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-[#64748B] dark:text-slate-400">Error Quota</span>
                          <span className="font-semibold" style={{ color }}>{t.usedQuota} / {t.errorQuota}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
                        <div><div className="text-[#94A3B8] text-[10px]">Contact</div><div className="text-[#334155] dark:text-slate-300 truncate text-[11px]">{t.contact}</div></div>
                        <div><div className="text-[#94A3B8] text-[10px]">Escalation</div><div className="text-[#334155] dark:text-slate-300 text-[11px]">{t.escalation}</div></div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <ShieldCheck className={`h-3.5 w-3.5 ${t.redactionEnabled ? 'text-green-600' : 'text-[#94A3B8]'}`} />
                        <span className={`text-[11px] font-medium ${t.redactionEnabled ? 'text-green-600 dark:text-green-400' : 'text-[#94A3B8]'}`}>
                          PII redaction {t.redactionEnabled ? 'enabled' : 'disabled'}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-[#E9EDF3] dark:border-[#334155]">
                        <button className="flex-1 rounded-lg border border-[#E9EDF3] dark:border-[#334155] py-1.5 text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">Configure</button>
                        <button className="flex-1 rounded-lg bg-[#EAF1FE] dark:bg-[#1E3A5F] py-1.5 text-[12px] font-semibold text-[#2F6BFF] hover:bg-[#2F6BFF] hover:text-white transition-colors">View Errors</button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Playbooks tab */}
        {activeTab === 'playbook' && (
          <div className="p-6 space-y-4">
            {[
              { title: 'FATAL Error Response', trigger: 'severity = FATAL', steps: ['Acknowledge in PagerDuty within 5 min', 'Check DLQ depth — if > 0, trigger manual redrive', 'Notify tenants affected within 15 min', 'Open incident INC-XXXX in JIRA'], sev: 'FATAL', },
              { title: 'DLQ Overflow', trigger: 'dlq_count > 10', steps: ['Identify poison pills (≥2 subscribers)', 'Assess retryable vs non-retryable items', 'Bulk redrive retryable items', 'Discard non-retryable with audit reason', 'Monitor for re-entry over 30 min'], sev: 'ERROR', },
              { title: 'Circuit Breaker Open', trigger: 'cb_state = open AND duration > 600s', steps: ['Check upstream dependency health', 'Review failure rate metrics', 'If dependency recovered: force half-open probe', 'If dependency down: notify carrier/vendor SLA'], sev: 'ERROR', },
              { title: 'AI Healing Budget Exhausted', trigger: 'ai_budget_pct > 100', steps: ['Review healing log for pattern', 'Escalate to AI Platform team', 'Check guardrail policies', 'Manual resolution required'], sev: 'WARN', },
            ].map(pb => (
              <div key={pb.title} className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
                  <span className="font-semibold text-[#1E293B] dark:text-white">{pb.title}</span>
                  <SeverityPill value={pb.sev as 'WARN' | 'ERROR' | 'FATAL' | 'INFO'} />
                  <code className="ml-auto text-[11px] bg-[#F1F5F9] dark:bg-[#334155] text-[#64748B] dark:text-slate-400 rounded px-2 py-0.5">{pb.trigger}</code>
                </div>
                <ol className="space-y-1.5">
                  {pb.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12px] text-[#64748B] dark:text-slate-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF] text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
