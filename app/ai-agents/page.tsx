'use client'

import { useState } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { SeverityPill, LifecyclePill } from '@/components/voltus/status-pill'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import {
  Bot, Brain, AlertTriangle, CheckCircle2, Inbox, Zap,
  RotateCcw, ArrowDownToLine, ShieldOff, ChevronDown, ChevronRight,
  Cpu, Activity, BarChart2, FlaskConical,
} from 'lucide-react'
import { aiAgentErrors, type AIAgentError, type HealingStrategy } from '@/lib/data'

const strategyMeta: Record<HealingStrategy, { label: string; color: string; bg: string }> = {
  retry:    { label: 'Retry',    color: '#2563EB', bg: '#E8F0FE' },
  rollback: { label: 'Rollback', color: '#7C3AED', bg: '#F3EEFF' },
  fallback: { label: 'Fallback', color: '#D97706', bg: '#FFFBEB' },
  escalate: { label: 'Escalate', color: '#DC2626', bg: '#FEF2F2' },
  degrade:  { label: 'Degrade',  color: '#64748B', bg: '#F1F5F9' },
}

const errorTypeMeta: Record<AIAgentError['errorType'], { label: string; color: string; icon: React.ElementType }> = {
  ModelFailure:      { label: 'Model Failure',       color: '#DC2626', icon: Brain       },
  HallucinationGuard:{ label: 'Hallucination Guard',  color: '#D97706', icon: ShieldOff   },
  BudgetExhausted:   { label: 'Budget Exhausted',     color: '#7F1D1D', icon: Activity    },
  ToolCallFailed:    { label: 'Tool Call Failed',      color: '#2563EB', icon: Zap         },
  PromptInjection:   { label: 'Prompt Injection',     color: '#7C3AED', icon: AlertTriangle},
  ContextOverflow:   { label: 'Context Overflow',     color: '#059669', icon: Cpu         },
}

const agentColor: Record<string, string> = {
  AIRatePredictor:    '#2563EB',
  AIDocClassifier:    '#7C3AED',
  AIComplianceAdvisor:'#DC2626',
  AIFreightAdvisor:   '#059669',
}

export default function AIAgentsPage() {
  const [expanded, setExpanded] = useState<string | null>('ai-001')

  const agents = [...new Set(aiAgentErrors.map(e => e.agent))]
  const totalErrors    = aiAgentErrors.length
  const healed         = aiAgentErrors.filter(e => e.healingSucceeded).length
  const exhausted      = aiAgentErrors.filter(e => e.healingAttempts >= e.maxHealingBudget && !e.healingSucceeded).length
  const activeHealing  = aiAgentErrors.filter(e => e.status === 'retrying').length

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(aiAgentErrors, { pageSize: 10 })

  return (
    <AppShell>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total AI Errors',   value: totalErrors,   icon: Brain,        accent: '#2F6BFF', bg: '#EAF1FE' },
          { label: 'Self-Healed',       value: healed,        icon: CheckCircle2, accent: '#16A34A', bg: '#F0FDF4' },
          { label: 'Budget Exhausted',  value: exhausted,     icon: Activity,     accent: '#DC2626', bg: '#FEF2F2' },
          { label: 'Actively Healing',  value: activeHealing, icon: RotateCcw,    accent: '#D97706', bg: '#FFFBEB' },
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

      {/* Agent health summary row */}
      <div className="mb-5">
        <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white mb-3">Agent Health Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {agents.map(agent => {
            const agentErrors = aiAgentErrors.filter(e => e.agent === agent)
            const maxBudgetPct = Math.max(...agentErrors.map(e => (e.healingAttempts / e.maxHealingBudget) * 100))
            const hasExhausted = agentErrors.some(e => e.healingAttempts >= e.maxHealingBudget && !e.healingSucceeded)
            const color = agentColor[agent] ?? '#2F6BFF'
            const budgetColor = hasExhausted ? '#DC2626' : maxBudgetPct >= 66 ? '#D97706' : '#16A34A'

            return (
              <div key={agent} className="rounded-[12px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${color}15` }}>
                    <Bot className="h-3.5 w-3.5" style={{ color }} />
                  </span>
                  <span className="text-[12px] font-semibold text-[#1E293B] dark:text-white truncate">{agent}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#64748B]">Errors</span>
                    <span className="font-semibold text-[#1E293B] dark:text-white">{agentErrors.length}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#64748B]">Max budget used</span>
                    <span className="font-semibold" style={{ color: budgetColor }}>{Math.round(maxBudgetPct)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, maxBudgetPct)}%`, backgroundColor: budgetColor }} />
                  </div>
                  {hasExhausted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#DC2626]">
                      <Activity className="h-2.5 w-2.5" /> Budget exhausted
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error detail accordion */}
      <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white mb-3">Skill-Level Error Details</h3>
      <MotionList motionKey={page} className="space-y-3">
        {paged.map(ae => {
          const isOpen = expanded === ae.id
          const strat = strategyMeta[ae.healingStrategy]
          const typeMeta = errorTypeMeta[ae.errorType]
          const ErrIcon = typeMeta.icon
          const pct = (ae.healingAttempts / ae.maxHealingBudget) * 100
          const budgetColor = pct >= 100 ? '#DC2626' : pct >= 66 ? '#D97706' : '#16A34A'
          const agColor = agentColor[ae.agent] ?? '#2F6BFF'

          return (
            <MotionItem key={ae.id}>
            <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
              <button
                className="w-full flex items-start justify-between px-5 py-4 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors text-left gap-3"
                onClick={() => setExpanded(isOpen ? null : ae.id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Agent avatar */}
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0 mt-0.5" style={{ backgroundColor: `${agColor}15` }}>
                    <Bot className="h-4 w-4" style={{ color: agColor }} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[13px] font-semibold text-[#1E293B] dark:text-white">{ae.agent}</span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">→ {ae.skill}</span>
                    </div>
                    <p className="text-[12px] text-[#64748B] dark:text-slate-400 line-clamp-1">{ae.message}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <SeverityPill value={ae.severity} />
                      <LifecyclePill value={ae.status} />
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: `${typeMeta.color}15`, color: typeMeta.color }}>
                        <ErrIcon className="h-2.5 w-2.5" />
                        {typeMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Budget bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold" style={{ color: budgetColor }}>
                      {ae.healingAttempts}/{ae.maxHealingBudget} budget
                    </span>
                    <div className="w-20 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: budgetColor }} />
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                    : <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                  }
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#E9EDF3] dark:border-[#334155] px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Error details */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-2">Error Details</span>
                    <div className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-[#64748B]">Error Code</span>
                        <span className="font-mono font-semibold text-[#2F6BFF]">{ae.errorCode}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#64748B]">Error Type</span>
                        <span className="font-medium text-[#1E293B] dark:text-white">{typeMeta.label}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#64748B]">Tenant</span>
                        <span className="font-medium text-[#1E293B] dark:text-white">{ae.tenant}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#64748B]">Occurred</span>
                        <span className="font-mono text-[#94A3B8]">{new Date(ae.occurredAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Healing strategy */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-2">Healing Strategy</span>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: strat.bg, color: strat.color }}>
                          {strat.label}
                        </span>
                        {ae.healingSucceeded
                          ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]"><CheckCircle2 className="h-3 w-3" /> Succeeded</span>
                          : <span className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]"><Activity className="h-3 w-3" /> Failed</span>
                        }
                      </div>
                      {ae.fallbackVersion && (
                        <div className="text-[11px] text-[#64748B]">
                          Fallback: <span className="font-mono font-semibold text-[#1E293B] dark:text-white">{ae.fallbackVersion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Healing budget */}
                  <div>
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-2">Healing Budget</span>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#64748B]">Attempts used</span>
                        <span className="font-bold" style={{ color: budgetColor }}>
                          {ae.healingAttempts} / {ae.maxHealingBudget}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: budgetColor }} />
                      </div>
                      <p className="text-[11px] text-[#94A3B8]">
                        {pct >= 100
                          ? 'Budget exhausted — escalated to operations team'
                          : pct >= 66
                          ? 'Budget critically low — monitoring closely'
                          : 'Budget healthy — recovery in progress'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Full message */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide block mb-2">Full Error Message</span>
                    <div className="rounded-[8px] bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E9EDF3] dark:border-[#334155] p-3">
                      <p className="text-[12px] font-mono text-[#334155] dark:text-slate-300 leading-relaxed">{ae.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </MotionItem>
          )
        })}
      </MotionList>

      {aiAgentErrors.length > 0 && (
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
