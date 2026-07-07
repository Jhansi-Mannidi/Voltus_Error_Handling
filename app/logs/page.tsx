'use client'

import { useState, useMemo, useEffect, Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { LogLevelPill } from '@/components/voltus/status-pill'
import {
  Terminal, Search, Download, Filter, ChevronRight, ChevronDown,
  Copy, Play, Pause, RefreshCw, SlidersHorizontal, GitBranch,
  Layers, Radio, Check, Box, Server, UnfoldVertical, FoldVertical,
  ArrowUpRight, FileCode2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem, MotionSection } from '@/components/voltus/motion'
import { logsExtended, type LogEntry } from '@/mock'
import Link from 'next/link'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
type LogsTab = 'stream' | 'levels' | 'hierarchy' | 'search'

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

const levelDot: Record<LogLevel, string> = {
  DEBUG: 'bg-slate-400',
  INFO:  'bg-blue-500',
  WARN:  'bg-amber-500',
  ERROR: 'bg-red-500',
  FATAL: 'bg-red-900',
}

function ts(log: LogEntry): string {
  return (log.ts ?? log.timestamp ?? '').replace('T', ' ').slice(0, 23)
}

function tabFromParams(params: URLSearchParams): LogsTab {
  const t = params.get('tab')
  if (t === 'levels' || t === 'hierarchy' || t === 'search' || t === 'stream') return t
  return 'stream'
}

type HierarchyNode = {
  name: string
  level?: LogLevel
  children?: HierarchyNode[]
}

const HIERARCHY: HierarchyNode[] = [
  { name: 'com.voltusfreight', children: [
    { name: 'shipment', children: [
      { name: 'ShipmentOrchestrator', level: 'ERROR' },
      { name: 'CarrierAllocationAgent', level: 'WARN' },
      { name: 'DocumentService', level: 'WARN' },
    ]},
    { name: 'rate', children: [
      { name: 'RateEngine', level: 'WARN' },
      { name: 'AIRatePredictor', level: 'ERROR' },
    ]},
    { name: 'infra', children: [
      { name: 'AuthService', level: 'WARN' },
      { name: 'NotificationHub', level: 'WARN' },
      { name: 'FreightLedger', level: 'WARN' },
      { name: 'WorkflowEngine', level: 'INFO' },
    ]},
    { name: 'compliance', children: [
      { name: 'CustomsClearance', level: 'INFO' },
      { name: 'ComplianceChecker', level: 'WARN' },
    ]},
  ]},
]

function flattenLeaves(nodes: HierarchyNode[], prefix = ''): { path: string; name: string; level: LogLevel }[] {
  const out: { path: string; name: string; level: LogLevel }[] = []
  for (const n of nodes) {
    const path = prefix ? `${prefix}.${n.name}` : n.name
    if (n.level) out.push({ path, name: n.name, level: n.level })
    if (n.children) out.push(...flattenLeaves(n.children, path))
  }
  return out
}

function collectPaths(nodes: HierarchyNode[], prefix = ''): string[] {
  const paths: string[] = []
  for (const n of nodes) {
    const path = prefix ? `${prefix}.${n.name}` : n.name
    paths.push(path)
    if (n.children) paths.push(...collectPaths(n.children, path))
  }
  return paths
}

const HIERARCHY_LEAVES = flattenLeaves(HIERARCHY)
const ALL_HIERARCHY_PATHS = collectPaths(HIERARCHY)

function logCountForService(service: string) {
  return logsExtended.filter(l => l.service === service).length
}

function LogsPageContent() {
  const urlParams = useSearchParams()
  const activeTab = tabFromParams(urlParams)

  const [search, setSearch]           = useState('')
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL')
  const [filterSvc, setFilterSvc]     = useState('ALL')
  const [filterCat, setFilterCat]     = useState('ALL')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [live, setLive]               = useState(false)
  const [copied, setCopied]           = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [configSearch, setConfigSearch] = useState('')

  const services   = useMemo(() => ['ALL', ...Array.from(new Set(logsExtended.map(l => l.service))).sort()], [])
  const categories = useMemo(() => ['ALL', ...Array.from(new Set(logsExtended.map(l => l.category ?? '').filter(Boolean))).sort()], [])

  const counts = useMemo(() =>
    LEVELS.reduce((acc, lv) => ({ ...acc, [lv]: logsExtended.filter(l => l.level === lv).length }), {} as Record<LogLevel, number>)
  , [])

  const filtered = useMemo(() => logsExtended.filter(l => {
    if (filterLevel !== 'ALL' && l.level !== filterLevel) return false
    if (filterSvc  !== 'ALL' && l.service !== filterSvc)  return false
    if (filterCat  !== 'ALL' && l.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${l.message} ${l.service} ${l.correlationId} ${l.category ?? ''} ${l.tenant ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  }), [filterLevel, filterSvc, filterCat, search])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 15,
    resetDeps: [filterLevel, filterSvc, filterCat, search, activeTab],
  })

  useEffect(() => {
    if (activeTab === 'search') setShowFilters(true)
    const svc = urlParams.get('service')
    if (svc) setFilterSvc(svc)
  }, [activeTab, urlParams])

  function copyJson(log: LogEntry) {
    navigator.clipboard?.writeText(JSON.stringify(log, null, 2))
    setCopied(log.id)
    setTimeout(() => setCopied(null), 1500)
  }

  const hasFilters = filterLevel !== 'ALL' || filterSvc !== 'ALL' || filterCat !== 'ALL' || search.length > 0

  const tabMeta: Record<LogsTab, { title: string; desc: string }> = {
    stream:    { title: 'Log Stream',       desc: 'Real-time structured log viewer with correlation and trace context' },
    levels:    { title: 'Level Management', desc: 'Adjust per-service verbosity without redeployment' },
    hierarchy: { title: 'Logger Hierarchy', desc: 'Package tree and effective log levels across the platform' },
    search:    { title: 'Search Logs',      desc: 'Query across message, service, correlation ID, and tenant' },
  }

  const hierarchyStats = useMemo(() => ({
    packages: ALL_HIERARCHY_PATHS.length,
    services: HIERARCHY_LEAVES.length,
    elevated: HIERARCHY_LEAVES.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length,
    modules: HIERARCHY[0]?.children?.length ?? 0,
  }), [])

  const showStreamKpis = activeTab === 'stream' || activeTab === 'search'

  return (
    <AppShell>
      <MotionSection>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[18px] font-bold text-[#1E293B] dark:text-white leading-none">
              {tabMeta[activeTab].title}
            </h1>
            <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-1">
              {tabMeta[activeTab].desc}
            </p>
          </div>
          {activeTab === 'stream' && (
            <button
              onClick={() => setLive(v => !v)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                live
                  ? 'border-emerald-300/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-border bg-card text-muted-foreground hover:border-[#CBD5E1]',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
              {live ? 'Live tail' : 'Paused'}
              {live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          )}
        </div>
      </MotionSection>

      {/* KPI / stats strip — contextual per tab */}
      <MotionSection delay={0.04}>
        {showStreamKpis ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
            {LEVELS.map(lv => (
              <button
                key={lv}
                onClick={() => {
                  setFilterLevel(filterLevel === lv ? 'ALL' : lv)
                  setPage(1)
                }}
                className={cn(
                  'relative flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm',
                  filterLevel === lv
                    ? 'border-[#2F6BFF]/35 ring-1 ring-[#2F6BFF]/15 shadow-sm'
                    : 'border-border hover:border-[#CBD5E1] dark:hover:border-[#475569]',
                )}
              >
                <span className={cn('absolute left-4 top-0 h-[3px] w-7 rounded-b-full', levelDot[lv])} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">{lv}</span>
                <span className="text-2xl font-bold text-foreground leading-none tabular-nums">{counts[lv]}</span>
              </button>
            ))}
          </div>
        ) : activeTab === 'hierarchy' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Root Packages', value: 1, icon: Box },
              { label: 'Modules', value: hierarchyStats.modules, icon: Layers },
              { label: 'Service Loggers', value: hierarchyStats.services, icon: Server },
              { label: 'Elevated Levels', value: hierarchyStats.elevated, icon: GitBranch },
            ].map(k => (
              <div key={k.label} className="relative flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 shrink-0">
                  <k.icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums leading-none mt-0.5">{k.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Services', value: Object.keys(SERVICE_LEVELS).length },
              { label: 'At WARN+', value: Object.values(SERVICE_LEVELS).filter(l => l === 'WARN' || l === 'ERROR' || l === 'FATAL').length },
              { label: 'At ERROR+', value: Object.values(SERVICE_LEVELS).filter(l => l === 'ERROR' || l === 'FATAL').length },
              { label: 'Config Bus', value: '30s' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none mt-1">{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </MotionSection>

      {/* Main panel */}
      <MotionSection delay={0.08}>
        <div className="w-full min-w-0 rounded-[14px] border border-border bg-card overflow-hidden">

          {/* Toolbar — stream & search */}
          {(activeTab === 'stream' || activeTab === 'search') && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  {filtered.length} of {logsExtended.length} entries
                </span>
                {hasFilters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FE] dark:bg-[#1a2744] px-2 py-0.5 text-[10px] font-semibold text-[#2F6BFF]">
                    Filtered
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    showFilters
                      ? 'border-[#2F6BFF]/40 bg-[#EAF1FE]/60 dark:bg-[#1a2744] text-[#2F6BFF]'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-[#2F6BFF]" />}
                </button>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search message, service, correlation…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-muted/30 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF]/50 focus:ring-1 focus:ring-[#2F6BFF]/20"
                  />
                </div>
                <button
                  onClick={() => {
                    const ndjson = filtered.map(l => JSON.stringify(l)).join('\n')
                    const url = URL.createObjectURL(new Blob([ndjson], { type: 'application/x-ndjson' }))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'voltus-logs.ndjson'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          )}

          {/* Filter panel */}
          {showFilters && (activeTab === 'stream' || activeTab === 'search') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-3 border-b border-border bg-muted/20">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Level</label>
                <div className="flex flex-wrap gap-1">
                  {(['ALL', ...LEVELS] as const).map(lv => (
                    <button
                      key={lv}
                      onClick={() => setFilterLevel(lv as LogLevel | 'ALL')}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-semibold border transition-colors',
                        filterLevel === lv
                          ? 'border-[#2F6BFF] bg-[#2F6BFF] text-white'
                          : 'border-border text-muted-foreground hover:border-[#CBD5E1]',
                      )}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Service</label>
                <select
                  value={filterSvc}
                  onChange={e => setFilterSvc(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-[#2F6BFF]/50"
                >
                  {services.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Category</label>
                <select
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-[#2F6BFF]/50"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setFilterLevel('ALL'); setFilterSvc('ALL'); setFilterCat('ALL'); setSearch('') }}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Stream */}
          {(activeTab === 'stream' || activeTab === 'search') && (
            <>
              <div className="sticky top-0 z-10 hidden md:grid grid-cols-[16px_160px_72px_140px_160px_minmax(0,1fr)_100px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span />
                <span>Timestamp</span>
                <span>Level</span>
                <span>Category</span>
                <span>Service</span>
                <span>Message</span>
                <span className="text-right">Code</span>
              </div>
              <div className="font-mono text-[11.5px] overflow-x-auto max-h-[calc(100dvh-22rem)] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-8 w-8 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No log entries match</p>
                    <p className="text-xs mt-1">Try adjusting filters or search terms</p>
                  </div>
                ) : (
                  <MotionList motionKey={page}>
                    {paged.map(log => {
                      const isExpanded = expandedId === log.id
                      const lv = log.level as LogLevel
                      return (
                        <MotionItem key={log.id}>
                          <div className={cn(
                            'border-b border-border/60 transition-colors',
                            lv === 'ERROR' || lv === 'FATAL' ? 'bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-muted/30',
                          )}>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="grid w-full min-w-[880px] grid-cols-[16px_160px_72px_140px_160px_minmax(0,1fr)_100px] items-center gap-3 px-4 py-2.5 text-left group"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground" />
                              }
                              <span className="text-muted-foreground tabular-nums">{ts(log)}</span>
                              <LogLevelPill value={lv} />
                              <span className="text-muted-foreground truncate">{log.category ? `[${log.category}]` : '—'}</span>
                              <span className="text-[#2F6BFF] dark:text-[#60A5FA] truncate font-medium">{log.service}</span>
                              <span className="text-foreground/80 truncate">{log.message}</span>
                              <span className="text-muted-foreground text-right truncate font-sans text-[10px]">{log.errorCode ?? ''}</span>
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 pl-10">
                                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5 text-[11px] font-sans">
                                  {log.correlationId && <MetaRow k="correlation_id" v={log.correlationId} />}
                                  {log.traceId && <MetaRow k="trace_id" v={log.traceId} />}
                                  {log.spanId && <MetaRow k="span_id" v={log.spanId} />}
                                  {log.category && <MetaRow k="category" v={log.category} />}
                                  {log.errorCode && <MetaRow k="error_code" v={log.errorCode} />}
                                  <MetaRow k="service" v={log.service} />
                                  {(log.tenant ?? log.tenantId) && <MetaRow k="tenant" v={log.tenant ?? log.tenantId ?? ''} />}
                                  <MetaRow k="message" v={log.message} />
                                  {log.context && Object.entries(log.context).map(([k, v]) => (
                                    <MetaRow key={k} k={`ctx.${k}`} v={String(v)} />
                                  ))}
                                </div>
                                <button
                                  onClick={() => copyJson(log)}
                                  className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-[#2F6BFF] transition-colors font-sans"
                                >
                                  <Copy className="h-3 w-3" />
                                  {copied === log.id ? 'Copied!' : 'Copy JSON'}
                                </button>
                              </div>
                            )}
                          </div>
                        </MotionItem>
                      )
                    })}
                  </MotionList>
                )}
              </div>
              {filtered.length > 0 && (
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
            </>
          )}

          {activeTab === 'levels' && (
            <LevelConfigPanel search={configSearch} onSearchChange={setConfigSearch} />
          )}

          {activeTab === 'hierarchy' && (
            <HierarchyPanel />
          )}
        </div>
      </MotionSection>
    </AppShell>
  )
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground w-32 shrink-0 font-medium">{k}</span>
      <span className="text-foreground break-all">{v}</span>
    </div>
  )
}

const SERVICE_LEVELS: Record<string, LogLevel> = {
  ShipmentOrchestrator: 'ERROR',
  RateEngine: 'WARN',
  DocumentService: 'WARN',
  TrackingGateway: 'ERROR',
  PaymentGateway: 'FATAL',
  NotificationHub: 'WARN',
  CustomsClearance: 'INFO',
  ComplianceChecker: 'WARN',
  AIRatePredictor: 'ERROR',
  VesselScheduler: 'INFO',
  FreightLedger: 'WARN',
  AuthService: 'WARN',
  WorkflowEngine: 'INFO',
}

function LevelConfigPanel({ search, onSearchChange }: { search: string; onSearchChange: (v: string) => void }) {
  const [levels, setLevels] = useState(SERVICE_LEVELS)
  const [saved, setSaved] = useState(false)

  const filtered = Object.entries(levels).filter(([svc]) =>
    !search || svc.toLowerCase().includes(search.toLowerCase()),
  )

  function apply() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 flex-1">
          <Radio className="h-4 w-4 text-[#2F6BFF] shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Adjust per-service log verbosity without redeployment. Changes propagate via the config bus within 30 seconds.
          </p>
        </div>
        <div className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter services…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-[12px] outline-none focus:border-[#2F6BFF]/50"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_100px_minmax(0,2fr)] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Service</span>
          <span>Current</span>
          <span>Set level</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map(([svc, cur]) => (
            <div key={svc} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_100px_minmax(0,2fr)] gap-3 md:gap-4 px-5 py-4 hover:bg-muted/20 transition-colors items-center">
              <span className="text-[13px] font-semibold text-foreground">{svc}</span>
              <LogLevelPill value={cur} />
              <div className="flex flex-wrap gap-1">
                {LEVELS.map(lv => (
                  <button
                    key={lv}
                    onClick={() => setLevels(prev => ({ ...prev, [svc]: lv }))}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[10px] font-semibold border transition-all',
                      cur === lv
                        ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF] shadow-sm'
                        : 'border-border text-muted-foreground hover:border-[#CBD5E1] hover:text-foreground',
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} service{filtered.length !== 1 ? 's' : ''} · changes are audited
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLevels(SERVICE_LEVELS)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            onClick={apply}
            className="flex items-center gap-1.5 rounded-lg bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-4 py-2 text-[12px] font-semibold transition-colors"
          >
            {saved ? <Check className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            {saved ? 'Applied' : 'Apply changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HierarchyPanel() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['com.voltusfreight', 'com.voltusfreight.shipment', 'com.voltusfreight.rate', 'com.voltusfreight.infra']))
  const [selected, setSelected] = useState<string | null>('com.voltusfreight.shipment.ShipmentOrchestrator')
  const [treeSearch, setTreeSearch] = useState('')

  function toggle(path: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  function expandAll() {
    setExpanded(new Set(ALL_HIERARCHY_PATHS))
  }

  function collapseAll() {
    setExpanded(new Set(['com.voltusfreight']))
  }

  const selectedLeaf = HIERARCHY_LEAVES.find(l => l.path === selected)
  const selectedLogs = selectedLeaf ? logsExtended.filter(l => l.service === selectedLeaf.name).slice(0, 4) : []

  function matchesSearch(path: string, name: string) {
    if (!treeSearch) return true
    const q = treeSearch.toLowerCase()
    return path.toLowerCase().includes(q) || name.toLowerCase().includes(q)
  }

  function renderNode(node: HierarchyNode, depth = 0, path = ''): ReactNode {
    const fullPath = path ? `${path}.${node.name}` : node.name
    const hasChildren = !!node.children?.length
    const isOpen = expanded.has(fullPath)
    const isLeaf = !!node.level
    const isSelected = selected === fullPath
    const visible = matchesSearch(fullPath, node.name)
    const childVisible = hasChildren && node.children!.some(c => matchesSearch(`${fullPath}.${c.name}`, c.name))

    if (!visible && !childVisible) return null

    return (
      <div key={fullPath}>
        <button
          onClick={() => {
            if (hasChildren) toggle(fullPath)
            if (isLeaf) setSelected(fullPath)
          }}
          className={cn(
            'group relative flex w-full items-center gap-2 py-2.5 pr-4 text-left transition-colors',
            isSelected ? 'bg-[#EAF1FE]/70 dark:bg-[#1a2744]/50' : 'hover:bg-muted/40',
          )}
          style={{ paddingLeft: 16 + depth * 22 }}
        >
          {depth > 0 && (
            <span
              className="absolute top-0 bottom-0 w-px bg-border"
              style={{ left: 10 + depth * 22 }}
            />
          )}
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 group-hover:bg-muted">
            {hasChildren ? (
              isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Server className="h-3 w-3 text-[#2F6BFF]" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn(
              'text-[12px] truncate',
              isLeaf ? 'font-semibold text-foreground font-sans' : 'font-mono text-muted-foreground',
            )}>
              {node.name}
            </p>
            {isLeaf && (
              <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{fullPath}</p>
            )}
          </div>
          {node.level && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-[10px] text-muted-foreground tabular-nums">
                {logCountForService(node.name)} logs
              </span>
              <LogLevelPill value={node.level} />
            </div>
          )}
          {!isLeaf && hasChildren && (
            <span className="text-[10px] text-muted-foreground shrink-0">{node.children!.length} children</span>
          )}
        </button>
        {hasChildren && isOpen && node.children!.map(child => renderNode(child, depth + 1, fullPath))}
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 flex-1">
          <Layers className="h-4 w-4 text-[#2F6BFF] shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Effective log levels inherit down the package tree. Select a service logger to inspect volume and jump to the stream.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={expandAll} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <UnfoldVertical className="h-3.5 w-3.5" /> Expand
          </button>
          <button onClick={collapseAll} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <FoldVertical className="h-3.5 w-3.5" /> Collapse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-[420px]">
        {/* Tree */}
        <div className="xl:col-span-3 rounded-xl border border-border overflow-hidden flex flex-col bg-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <FileCode2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Package tree</span>
            <div className="relative ml-auto w-full max-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                value={treeSearch}
                onChange={e => setTreeSearch(e.target.value)}
                placeholder="Filter packages…"
                className="w-full pl-7 pr-2 py-1 rounded-md border border-border bg-background text-[11px] outline-none focus:border-[#2F6BFF]/50"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100dvh-24rem)] py-1">
            {HIERARCHY.map(root => renderNode(root))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {selectedLeaf ? (
            <>
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Selected logger</p>
                <h3 className="text-[15px] font-bold text-foreground">{selectedLeaf.name}</h3>
                <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">{selectedLeaf.path}</p>
              </div>
              <div className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Effective level</p>
                    <div className="mt-2"><LogLevelPill value={selectedLeaf.level} /></div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">24h volume</p>
                    <p className="text-xl font-bold text-foreground tabular-nums mt-1">{logCountForService(selectedLeaf.name)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Recent entries</p>
                  {selectedLogs.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No recent log lines for this service.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedLogs.map(log => (
                        <div key={log.id} className="rounded-lg border border-border/80 bg-muted/10 px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <LogLevelPill value={log.level as LogLevel} />
                            <span className="text-[10px] text-muted-foreground tabular-nums">{ts(log)}</span>
                          </div>
                          <p className="text-[11px] text-foreground/80 line-clamp-2">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border bg-muted/10">
                <Link
                  href={`/logs?tab=search&service=${encodeURIComponent(selectedLeaf.name)}`}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2F6BFF] hover:underline"
                >
                  View in log stream <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <GitBranch className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a service logger</p>
              <p className="text-xs mt-1 max-w-[220px]">Click a leaf node in the package tree to inspect its effective level and recent activity.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LogsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading logs…</div>
      </AppShell>
    }>
      <LogsPageContent />
    </Suspense>
  )
}
