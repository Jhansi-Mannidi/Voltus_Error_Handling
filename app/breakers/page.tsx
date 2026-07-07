'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import {
  Zap, ZapOff, AlertTriangle, CheckCircle2, Clock, Activity,
  Search, BellRing, ChevronRight, RefreshCw, Shield, X,
  OctagonAlert, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import { circuitBreakersExtended, type CircuitBreaker, type BreakerState } from '@/mock'

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterState = 'all' | BreakerState
type FilterType  = 'all' | 'connector' | 'llm' | 'external'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function depType(dep: string): FilterType {
  if (dep.includes('openai') || dep.includes('llm') || dep.includes('anthropic')) return 'llm'
  if (dep.includes('postgresql') || dep.includes('mongodb') || dep.includes('redis')) return 'connector'
  return 'external'
}

function stateConfig(state: BreakerState) {
  return {
    open: {
      label: 'Open',
      color: '#DC2626',
      pill: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
      dot: 'bg-red-500',
    },
    'half-open': {
      label: 'Half-Open',
      color: '#D97706',
      pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    closed: {
      label: 'Closed',
      color: '#64748B',
      pill: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      dot: 'bg-emerald-500',
    },
  }[state]
}

function ageMin(iso?: string) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function stateIcon(state: BreakerState) {
  return { open: ZapOff, 'half-open': AlertTriangle, closed: CheckCircle2 }[state]
}

// ─── Breaker card ─────────────────────────────────────────────────────────────
function BreakerCard({ b, onClick, selected }: { b: CircuitBreaker; onClick: () => void; selected: boolean }) {
  const cfg      = stateConfig(b.state)
  const Icon     = stateIcon(b.state)
  const isOpen   = b.state === 'open'
  const isHalf   = b.state === 'half-open'
  const openMins = ageMin(b.lastTrippedAt)
  const paging   = isOpen && openMins > 10
  const globalScope = b.tenantId === 'tnt-global'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md',
        selected
          ? 'border-[#2F6BFF]/40 ring-1 ring-[#2F6BFF]/20 shadow-sm'
          : 'border-border hover:border-[#CBD5E1] dark:hover:border-[#475569]',
      )}
    >
      {/* subtle status accent */}
      <div className={cn('absolute left-4 top-0 h-[3px] w-8 rounded-b-full', cfg.dot)} />

      {paging && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 px-2 py-0.5">
          <BellRing className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
          <span className="text-[9px] font-semibold text-red-700 dark:text-red-400">Paging owner</span>
        </div>
      )}

      <div className="p-4 pt-5">
        <div className="flex items-start gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground">{b.name}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold', cfg.pill)}>
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
                {cfg.label}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono truncate block mt-0.5">{b.dependency}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-md',
            globalScope ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'
          )}>
            {globalScope ? 'Global' : b.tenant}
          </span>
          <span className="text-[10px] text-muted-foreground">{b.service}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Success', val: b.successCount },
            { label: 'Failed',  val: b.failureCount },
            { label: 'Total',   val: b.totalRequests },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-muted/40 p-2 text-center">
              <div className="text-[15px] font-semibold text-foreground tabular-nums">{s.val}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mb-2">
          Opens at ≥{b.failureThreshold}% over {b.windowSec}s window (min 10 req)
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {b.lastTrippedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {isOpen ? `Open ${openMins}m` : `Last tripped ${openMins}m ago`}
            </span>
          )}
          {isHalf && b.nextHalfOpenAt && (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '3s' }} />
              Probe countdown
            </span>
          )}
          {!b.lastTrippedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Never tripped
            </span>
          )}
        </div>

        {b.errorCodes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {b.errorCodes.map(ec => (
              <span key={ec} className="font-mono text-[9px] bg-muted text-muted-foreground rounded-md px-2 py-0.5">{ec}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function BreakerDrawer({ b, onClose }: { b: CircuitBreaker; onClose: () => void }) {
  const [forceAction, setForceAction] = useState<'half-open' | 'open' | null>(null)
  const [reason, setReason] = useState('')
  const cfg = stateConfig(b.state)
  const openMins = ageMin(b.lastTrippedAt)
  const paging = b.state === 'open' && openMins > 10

  const stateHistory = [
    { state: 'closed',    at: '2025-07-06T01:00:00Z', note: 'Service started — 0 failures'     },
    ...(b.lastTrippedAt ? [
      { state: 'open',    at: b.lastTrippedAt,        note: `Failure rate hit ${b.failureRate}% — tripped OPEN` },
    ] : []),
    ...(b.nextHalfOpenAt ? [
      { state: 'half-open', at: b.nextHalfOpenAt,     note: `Cooldown elapsed — probe request sent` },
    ] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto relative z-10 flex flex-col w-full max-w-xl h-full bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
              {(() => { const Icon = stateIcon(b.state); return <Icon className="h-4 w-4 text-muted-foreground" /> })()}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-foreground">{b.name}</h2>
              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold mt-0.5', cfg.pill)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                {cfg.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {paging && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 px-3 py-2">
              <BellRing className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-[12px] font-medium text-red-700 dark:text-red-400">Paging dependency owner — circuit open for {openMins}m</p>
            </div>
          )}

          {/* Key */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Breaker Key</p>
            <div className="rounded-xl bg-muted/50 p-3 font-mono text-[12px] text-foreground">
              (dependency_id: {b.id}, account_id: {b.tenantId === 'tnt-global' ? 'GLOBAL' : b.tenantId})
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sliding Window Stats</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Success', val: b.successCount },
                { label: 'Failed',  val: b.failureCount },
                { label: 'Total',   val: b.totalRequests },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-3 text-center">
                  <div className="text-2xl font-semibold text-foreground tabular-nums">{s.val}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* State history */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">State Transition History</p>
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              {stateHistory.map((h, i) => {
                const c = stateConfig(h.state as BreakerState)
                return (
                  <div key={i} className="relative">
                    <div className="absolute -left-3.5 top-0.5 h-3 w-3 rounded-full border-2 border-card" style={{ backgroundColor: c.color }} />
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold', c.pill)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
                          {c.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{h.note}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent failing requests */}
          {b.correlationIds.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent Failing Requests</p>
              <div className="space-y-1.5">
                {b.correlationIds.map(cid => (
                  <a key={cid} href={`/errors?correlation=${cid}`}
                    className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 hover:bg-accent transition-colors">
                    <span className="font-mono text-[11px] text-foreground">{cid}</span>
                    <span className="text-[11px] text-[#2F6BFF] flex items-center gap-1">View <ChevronRight className="h-3 w-3" /></span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Manual controls */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-[13px] font-bold text-foreground">Manual Controls (Ops-Only, Audited)</p>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForceAction('half-open')}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-[12px] font-semibold text-foreground hover:bg-muted transition-colors">
                Force Half-Open Probe
              </button>
              <button onClick={() => setForceAction('open')}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-[12px] font-semibold text-foreground hover:bg-muted transition-colors">
                Force Open
              </button>
            </div>
            {forceAction && (
              <div className="space-y-2">
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  placeholder="Reason for manual override (required)…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setForceAction(null)} className="flex-1 py-1.5 rounded-xl border border-border text-[12px] text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                  <button disabled={!reason.trim()} onClick={() => { alert(`Force ${forceAction} logged`); setForceAction(null); setReason('') }}
                    className={cn('flex-1 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all', forceAction === 'open' ? 'bg-[#DC2626]' : 'bg-[#D97706]', !reason.trim() && 'opacity-40 cursor-not-allowed')}>
                    Confirm force {forceAction}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
      {[
        { state: 'closed'    as BreakerState, desc: 'Healthy, passing traffic' },
        { state: 'half-open' as BreakerState, desc: 'Probing — single test req' },
        { state: 'open'      as BreakerState, desc: 'Tripped, all req rejected' },
      ].map(l => {
        const c = stateConfig(l.state)
        return (
          <div key={l.state} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full shrink-0', c.dot)} />
            <span className="font-medium text-foreground">{c.label}</span>
            <span>— {l.desc}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function BreakersPageContent() {
  const urlParams = useSearchParams()
  const [filterState, setFilterState] = useState<FilterState>('all')
  const [filterType,  setFilterType]  = useState<FilterType>('all')
  const [search,      setSearch]      = useState('')
  const [filterTenant, setFilterTenant] = useState('all')
  const [selected,    setSelected]    = useState<CircuitBreaker | null>(null)

  const tenants = useMemo(() => [...new Set(circuitBreakersExtended.map(b => b.tenant))], [])

  const filtered = useMemo(() => circuitBreakersExtended.filter(b => {
    if (filterState !== 'all' && b.state !== filterState) return false
    if (filterType !== 'all' && depType(b.dependency) !== filterType) return false
    if (filterTenant !== 'all' && b.tenantId !== filterTenant) return false
    if (search && !`${b.name} ${b.dependency} ${b.service} ${b.tenant}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [filterState, filterType, filterTenant, search])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [filterState, filterType, filterTenant, search],
  })

  useEffect(() => {
    const state = urlParams.get('state')
    if (state === 'open' || state === 'half-open' || state === 'closed') {
      setFilterState(state)
    } else {
      setFilterState('all')
    }
    setPage(1)
  }, [urlParams, setPage])

  const counts = useMemo(() => ({
    all:         circuitBreakersExtended.length,
    open:        circuitBreakersExtended.filter(b => b.state === 'open').length,
    'half-open': circuitBreakersExtended.filter(b => b.state === 'half-open').length,
    closed:      circuitBreakersExtended.filter(b => b.state === 'closed').length,
  }), [])

  return (
    <AppShell>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',     value: counts.all,          icon: Activity,      state: 'all'       as FilterState },
          { label: 'Open',      value: counts.open,         icon: ZapOff,        state: 'open'      as FilterState },
          { label: 'Half-Open', value: counts['half-open'], icon: AlertTriangle, state: 'half-open' as FilterState },
          { label: 'Closed',    value: counts.closed,       icon: CheckCircle2,  state: 'closed'    as FilterState },
        ].map(k => (
          <button key={k.label} onClick={() => setFilterState(k.state)}
            className={cn(
              'relative flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm',
              filterState === k.state
                ? 'border-[#2F6BFF]/35 bg-[#F9FBFF] dark:bg-[#1a2744]/40 shadow-sm'
                : 'border-border hover:border-[#CBD5E1] dark:hover:border-[#475569]',
            )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60">
                <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </div>
            <span className="text-3xl font-bold text-foreground leading-none mt-0.5 tabular-nums">{k.value}</span>
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search breaker, service…"
            className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] w-full transition-colors" />
        </div>
        {(['all', 'open', 'half-open', 'closed'] as FilterState[]).map(f => (
          <button key={f} onClick={() => setFilterState(f)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[12px] font-semibold capitalize transition-all border',
              filterState === f
                ? 'bg-[#2F6BFF] text-white border-[#2F6BFF]'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}>
            {f} {counts[f] !== undefined ? `(${counts[f as keyof typeof counts]})` : ''}
          </button>
        ))}
        {(['all', 'connector', 'llm', 'external'] as FilterType[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[12px] font-semibold capitalize transition-all border',
              filterType === t ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}>
            {t}
          </button>
        ))}
        <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-border bg-card text-[12px] text-foreground outline-none focus:border-[#2F6BFF]">
          <option value="all">All tenants</option>
          {tenants.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div className="mb-4">
        <Legend />
      </div>

      {/* Tenant isolation note */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 mb-4">
        <OctagonAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Breakers are keyed by (dependency, account_id) — a noisy tenant tripping their breaker does not affect other tenants on the same dependency.
          Global breakers affect all tenants (e.g. LLM provider overload).
        </p>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Activity className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No breakers match these filters</p>
        </div>
      ) : (
        <>
        <MotionList motionKey={page} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map(b => (
            <MotionItem key={b.id}>
              <BreakerCard b={b}
                onClick={() => setSelected(selected?.id === b.id ? null : b)}
                selected={selected?.id === b.id} />
            </MotionItem>
          ))}
        </MotionList>
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
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
        </>
      )}

      {/* Detail drawer */}
      {selected && <BreakerDrawer b={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  )
}

export default function BreakersPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <BreakersPageContent />
    </Suspense>
  )
}
