'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { SeverityPill } from '@/components/voltus/status-pill'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import {
  Bot, Brain, CheckCircle2, Activity, RotateCcw, ChevronDown,
  ChevronRight, Zap, ShieldOff, Cpu, AlertTriangle, Clock,
} from 'lucide-react'
import { agentRuns, type AgentRun, type AgentStatus } from '@/mock'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  healing:          { label: 'Healing',          color: '#D97706', bg: '#FFFBEB' },
  budget_exhausted: { label: 'Budget Exhausted', color: '#DC2626', bg: '#FEF2F2' },
  recovered:        { label: 'Recovered',        color: '#16A34A', bg: '#F0FDF4' },
  escalated:        { label: 'Escalated',        color: '#7F1D1D', bg: '#FEF2F2' },
}

const AGENT_COLORS: Record<string, string> = {
  'AIRatePredictor':      '#2563EB',
  'AIDocClassifier':      '#7C3AED',
  'AIComplianceAdvisor':  '#DC2626',
  'AIFreightAdvisor':     '#059669',
  'AIVesselScheduler':    '#D97706',
}

function agentColor(name: string) { return AGENT_COLORS[name] ?? '#2F6BFF' }

// ─── Component ───────────────────────────────────────────────────────────────

export default function AgentsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <AgentsPageContent />
    </Suspense>
  )
}

function AgentsPageContent() {
  const urlParams = useSearchParams()
  const [expanded, setExpanded]   = useState<string | null>(agentRuns[0]?.id ?? null)
  const [filterStatus, setFilter] = useState<AgentStatus | 'all'>('all')

  const agents = [...new Set(agentRuns.map(r => r.agent))]

  const filtered = useMemo(() => filterStatus === 'all'
    ? agentRuns
    : agentRuns.filter(r => r.status === filterStatus),
  [filterStatus])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [filterStatus],
  })

  useEffect(() => {
    const status = urlParams.get('status')
    if (status && (['healing', 'budget_exhausted', 'recovered', 'escalated'] as const).includes(status as AgentStatus)) {
      setFilter(status as AgentStatus)
    } else {
      setFilter('all')
    }
    setPage(1)
  }, [urlParams, setPage])

  const totals = {
    total:     agentRuns.length,
    recovered: agentRuns.filter(r => r.status === 'recovered').length,
    exhausted: agentRuns.filter(r => r.status === 'budget_exhausted').length,
    healing:   agentRuns.filter(r => r.status === 'healing').length,
    escalated: agentRuns.filter(r => r.status === 'escalated').length,
  }

  return (
    <AppShell>
      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Runs',        value: totals.total,     accent: '#2F6BFF', bg: '#EAF1FE', icon: Bot         },
          { label: 'Recovered',         value: totals.recovered, accent: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
          { label: 'Actively Healing',  value: totals.healing,   accent: '#D97706', bg: '#FFFBEB', icon: RotateCcw   },
          { label: 'Budget Exhausted',  value: totals.exhausted, accent: '#DC2626', bg: '#FEF2F2', icon: Activity    },
          { label: 'Escalated',         value: totals.escalated, accent: '#7F1D1D', bg: '#FEF2F2', icon: AlertTriangle},
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-1.5 rounded-[14px] border border-[var(--color-line)] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-hidden">
            <span className="absolute top-0 left-3 right-3 h-[3px] rounded-b-full" style={{ backgroundColor: k.accent }} />
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] font-semibold text-[var(--color-ink-500)] uppercase tracking-wide">{k.label}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: k.bg }}>
                <k.icon className="h-3.5 w-3.5" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-[28px] font-bold leading-none text-[var(--color-ink-900)] dark:text-white">{k.value}</span>
          </div>
        ))}
      </div>

      {/* ── Agent health grid ─────────────────────────────────────────────── */}
      <h3 className="text-[13px] font-semibold text-[var(--color-ink-900)] dark:text-white mb-3">Agent Health Overview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {agents.map(agent => {
          const runs       = agentRuns.filter(r => r.agent === agent)
          const maxPct     = Math.max(...runs.map(r => (r.healingLog.length / r.maxHealingBudget) * 100))
          const hasExhaust = runs.some(r => r.status === 'budget_exhausted' || r.status === 'escalated')
          const col        = agentColor(agent)
          const budgetCol  = hasExhaust ? '#DC2626' : maxPct >= 66 ? '#D97706' : '#16A34A'
          return (
            <button
              key={agent}
              onClick={() => setFilter('all')}
              className="text-left rounded-[12px] border border-[var(--color-line)] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-[#2F6BFF]/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${col}18` }}>
                  <Bot className="h-3.5 w-3.5" style={{ color: col }} />
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-ink-900)] dark:text-white truncate leading-tight">{agent}</span>
              </div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[var(--color-ink-500)]">{runs.length} run{runs.length !== 1 ? 's' : ''}</span>
                <span className="font-semibold" style={{ color: budgetCol }}>{Math.round(maxPct)}% budget</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-surface-fill)] dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, maxPct)}%`, backgroundColor: budgetCol }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(['all', 'healing', 'budget_exhausted', 'recovered', 'escalated'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              filterStatus === s
                ? 'bg-[#2F6BFF] text-white'
                : 'bg-[var(--color-surface-fill)] dark:bg-slate-700 text-[var(--color-ink-500)] dark:text-slate-400 hover:bg-[var(--color-line)]'
            }`}
          >
            {s === 'all' ? `All (${agentRuns.length})` : `${STATUS_META[s].label} (${agentRuns.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* ── Run accordion ─────────────────────────────────────────────────── */}
      <MotionList motionKey={page} className="space-y-3">
        {paged.map(run => {
          const isOpen  = expanded === run.id
          const sm      = STATUS_META[run.status]
          const col     = agentColor(run.agent)
          const budgetPct = (run.healingLog.length / run.maxHealingBudget) * 100
          const budgetCol = budgetPct >= 100 ? '#DC2626' : budgetPct >= 66 ? '#D97706' : '#16A34A'

          return (
            <MotionItem key={run.id}>
            <div className="rounded-[14px] border border-[var(--color-line)] dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => setExpanded(isOpen ? null : run.id)}
                className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[var(--color-surface-alt)] dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* Agent avatar */}
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] shrink-0 mt-0.5" style={{ backgroundColor: `${col}18` }}>
                  <Bot className="h-4 w-4" style={{ color: col }} />
                </span>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[13px] font-semibold text-[var(--color-ink-900)] dark:text-white">{run.agent}</span>
                    <span className="text-[11px] font-mono text-[var(--color-ink-400)]">→ {run.skill}</span>
                    <span className="font-mono text-[10px] text-[#2F6BFF]">{run.errorCode}</span>
                  </div>
                  <p className="text-[12px] text-[var(--color-ink-500)] dark:text-slate-400 line-clamp-1 mb-1.5">{run.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityPill value={run.severity} />
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: sm.bg, color: sm.color }}>
                      {sm.label}
                    </span>
                    <span className="text-[10px] text-[var(--color-ink-400)]">{run.tenant}</span>
                  </div>
                </div>

                {/* Budget meter */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-semibold" style={{ color: budgetCol }}>
                    {run.healingLog.length}/{run.maxHealingBudget} budget
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-[var(--color-surface-fill)] dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, budgetPct)}%`, backgroundColor: budgetCol }} />
                  </div>
                  <span className="text-[10px] text-[var(--color-ink-400)]">
                    {new Date(run.occurredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isOpen ? <ChevronDown className="h-4 w-4 text-[var(--color-ink-400)] shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 text-[var(--color-ink-400)] shrink-0 mt-1" />}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-[var(--color-line)] dark:border-slate-700 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Identifiers */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-ink-400)] uppercase tracking-wider mb-2">Identifiers</p>
                    <div className="space-y-1.5 text-[12px]">
                      {[
                        { k: 'Correlation ID', v: run.correlationId },
                        { k: 'Tenant',         v: run.tenant        },
                        { k: 'Error Code',     v: run.errorCode     },
                        { k: 'Tenant ID',      v: run.tenantId      },
                      ].map(({ k, v }) => (
                        <div key={k} className="flex justify-between gap-4">
                          <span className="text-[var(--color-ink-500)]">{k}</span>
                          <span className="font-mono text-[var(--color-ink-900)] dark:text-white text-right truncate max-w-[160px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Healing strategy */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-ink-400)] uppercase tracking-wider mb-2">Healing Strategy</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[#EAF1FE] text-[#2563EB]">
                          <RotateCcw className="h-2.5 w-2.5" />
                          {run.healingStrategy}
                        </span>
                        {run.status === 'recovered'
                          ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]"><CheckCircle2 className="h-3 w-3" /> Recovered</span>
                          : run.status === 'budget_exhausted'
                          ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626]"><Activity className="h-3 w-3" /> Exhausted</span>
                          : <span className="flex items-center gap-1 text-[11px] font-semibold text-[#D97706]"><Clock className="h-3 w-3" /> In Progress</span>
                        }
                      </div>
                      <p className="text-[11px] text-[var(--color-ink-500)]">
                        Budget: <strong style={{ color: budgetCol }}>{run.healingLog.length} of {run.maxHealingBudget}</strong> attempts used
                      </p>
                      <div className="h-2 rounded-full bg-[var(--color-surface-fill)] dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, budgetPct)}%`, backgroundColor: budgetCol }} />
                      </div>
                    </div>
                  </div>

                  {/* Healing steps */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-semibold text-[var(--color-ink-400)] uppercase tracking-wider mb-2">
                      Healing Steps ({run.healingLog.length})
                    </p>
                    <div className="space-y-2">
                      {run.healingLog.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shrink-0 mt-0.5"
                            style={{
                              backgroundColor: step.outcome === 'success' ? '#F0FDF4' : step.outcome === 'failure' ? '#FEF2F2' : '#FFFBEB',
                              color:           step.outcome === 'success' ? '#16A34A' : step.outcome === 'failure' ? '#DC2626' : '#D97706',
                            }}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-[var(--color-ink-900)] dark:text-white">{step.action}</span>
                            <span className="ml-2 text-[10px]" style={{
                              color: step.outcome === 'success' ? '#16A34A' : step.outcome === 'failure' ? '#DC2626' : '#D97706',
                            }}>
                              {step.outcome}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full message */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-[10px] font-semibold text-[var(--color-ink-400)] uppercase tracking-wider mb-2">Error Message</p>
                    <div className="rounded-[8px] bg-[var(--color-surface-alt)] dark:bg-slate-900 border border-[var(--color-line)] dark:border-slate-700 px-4 py-3">
                      <p className="text-[12px] font-mono text-[var(--color-ink-700)] dark:text-slate-300 leading-relaxed">{run.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </MotionItem>
          )
        })}
      </MotionList>

      {filtered.length > 0 && (
        <div className="mt-4 rounded-[14px] border border-[var(--color-line)] dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
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
