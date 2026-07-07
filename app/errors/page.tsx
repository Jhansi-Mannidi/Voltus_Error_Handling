'use client'

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/shell/app-shell'
import { ErrorClassPill, SeverityPill, LifecyclePill } from '@/components/voltus/status-pill'
import { AvatarChip } from '@/components/voltus/avatar-chip'
import { ErrorDetailDrawer } from '@/components/voltus/error-detail-drawer'
import {
  AlertTriangle, ServerCrash, ShieldAlert, Briefcase, Inbox, CheckCircle2,
  Filter, Search, Download, Copy, Eye, LayoutList, Grid3x3,
  RotateCcw, Sparkles, Plus, X, Check, Columns3, ChevronDown,
  Fingerprint, Building2, ArrowUpDown, ArrowUp, ArrowDown,
  Zap, EllipsisVertical
} from 'lucide-react'
import {
  errors as ALL_ERRORS,
  type ErrorEnvelope,
  type ErrorClass,
  type Severity,
  type LifecycleStatus,
} from '@/mock'
import { cn } from '@/lib/utils'
import { getRaisedErrors } from '@/lib/error-store'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'

// ─── constants ──────────────────────────────────────────────────────────────

const SEVERITIES: Severity[]        = ['FATAL', 'ERROR', 'WARN', 'INFO']
const CLASSES: ErrorClass[]         = ['Technical', 'Functional', 'Business']
const STATUSES: LifecycleStatus[]   = ['open', 'retrying', 'dlq', 'resolved', 'discarded']
const DOMAINS = ['DB','BUS','CB','INT','LLM','VAL','AUT','STA','GRD','FLW','FIN','FRT','UNK',
                  'CARRIER','RATE','CUSTOMS','DOC','PAYMENT','SLA','AUTH','VESSEL','COMPLIANCE',
                  'MLOPS'] as const

const PAGE_SIZES = [10, 20, 50] as const

interface ColDef {
  id:    string
  label: string
  defaultVisible: boolean
}
const COL_DEFS: ColDef[] = [
  { id: 'sno',         label: 'S.NO.',      defaultVisible: true  },
  { id: 'errorCode',   label: 'Error Code', defaultVisible: true  },
  { id: 'errorClass',  label: 'Class',      defaultVisible: true  },
  { id: 'severity',    label: 'Severity',   defaultVisible: true  },
  { id: 'message',     label: 'Message',    defaultVisible: true  },
  { id: 'source',      label: 'Source',     defaultVisible: true  },
  { id: 'tenant',      label: 'Tenant',     defaultVisible: true  },
  { id: 'correlation', label: 'Correlation',defaultVisible: true  },
  { id: 'retryable',   label: 'Retryable',  defaultVisible: true  },
  { id: 'status',      label: 'Status',     defaultVisible: true  },
  { id: 'occurred',    label: 'Occurred',   defaultVisible: false },
  { id: 'actions',     label: 'Actions',    defaultVisible: true  },
]

type SortKey = 'sno' | 'errorCode' | 'severity' | 'status' | 'occurred'
type SortDir = 'asc' | 'desc'

const SEV_ORDER: Record<Severity, number> = { FATAL: 0, ERROR: 1, WARN: 2, INFO: 3 }

// ─── helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function shortHash(s: string): string { return s.slice(-8) }

// ─── sub-components ───────────────────────────────────────────────────────────

function KPIStat({
  label, value, icon: Icon, accent, bg, onClick, active,
}: {
  label: string; value: number; icon: React.ElementType
  accent: string; bg: string; onClick: () => void; active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-all',
        active
          ? 'border-[#2F6BFF] ring-2 ring-[#2F6BFF]/20 bg-[#EAF1FE] dark:bg-[#1E3A5F]'
          : 'border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-[#2F6BFF]/40'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[22px] font-bold leading-none text-[#1E293B] dark:text-white">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-[#64748B] dark:text-slate-400 whitespace-nowrap">{label}</p>
      </div>
    </button>
  )
}

function SortBtn({ col, sortKey, sortDir, onSort }: {
  col: SortKey; sortKey: SortKey; sortDir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <button
      onClick={() => onSort(col)}
      className="ml-1 inline-flex items-center text-[#94A3B8] hover:text-[#2F6BFF] transition-colors"
      aria-label={`Sort by ${col}`}
    >
      {active
        ? sortDir === 'asc'
          ? <ArrowUp className="h-3 w-3 text-[#2F6BFF]" />
          : <ArrowDown className="h-3 w-3 text-[#2F6BFF]" />
        : <ArrowUpDown className="h-3 w-3" />}
    </button>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

function ErrorsPageContent() {
  const urlParams = useSearchParams()

  // ── filter state ──
  const [search,        setSearch]        = useState('')
  const [filterClass,   setFilterClass]   = useState<ErrorClass | ''>('')
  const [filterSev,     setFilterSev]     = useState<Severity | ''>('')
  const [filterStatus,  setFilterStatus]  = useState<LifecycleStatus | ''>('')
  const [filterRetryable, setFilterRetryable] = useState<'yes' | 'no' | ''>('')
  const [filterDomain,  setFilterDomain]  = useState('')
  const [filterTenant,  setFilterTenant]  = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterCorr,    setFilterCorr]    = useState('')
  const [filterTimeWin, setFilterTimeWin] = useState<'1h' | '6h' | '24h' | '7d' | 'all'>('all')

  // ── ui state ──
  const [view,          setView]          = useState<'table' | 'grid'>('table')
  const [selectedEvt,   setSelectedEvt]   = useState<ErrorEnvelope | null>(null)
  const [bulkMode,      setBulkMode]      = useState(false)
  const [bulkSelected,  setBulkSelected]  = useState<Set<string>>(new Set())
  const [filterOpen,    setFilterOpen]    = useState(false)
  const [colsOpen,      setColsOpen]      = useState(false)
  const [exportOpen,    setExportOpen]    = useState(false)
  const [visibleCols,   setVisibleCols]   = useState<Set<string>>(
    new Set(COL_DEFS.filter(c => c.defaultVisible).map(c => c.id))
  )
  const [sortKey,       setSortKey]       = useState<SortKey>('occurred')
  const [sortDir,       setSortDir]       = useState<SortDir>('desc')
  const [copiedId,      setCopiedId]      = useState<string | null>(null)
  const [extraErrors,   setExtraErrors]   = useState<ErrorEnvelope[]>([])

  const allErrors = useMemo(() => [...extraErrors, ...ALL_ERRORS], [extraErrors])

  useEffect(() => {
    setExtraErrors(getRaisedErrors())
  }, [urlParams])

  const colsRef   = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── filtering ──
  const timeWindowMs: Record<typeof filterTimeWin, number> = {
    '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000, 'all': Infinity,
  }
  const cutoff = filterTimeWin === 'all' ? 0 : Date.now() - timeWindowMs[filterTimeWin]

  const filtered = allErrors.filter(e => {
    if (filterClass   && e.errorClass !== filterClass) return false
    if (filterSev     && e.severity   !== filterSev)   return false
    if (filterStatus  && e.status     !== filterStatus) return false
    if (filterDomain  && e.domain     !== filterDomain) return false
    if (filterTenant  && !e.tenant.toLowerCase().includes(filterTenant.toLowerCase())) return false
    if (filterService && !e.service.toLowerCase().includes(filterService.toLowerCase())) return false
    if (filterCorr    && !e.correlationId.includes(filterCorr)) return false
    if (filterRetryable === 'yes' && !e.retryable) return false
    if (filterRetryable === 'no'  &&  e.retryable) return false
    if (filterTimeWin !== 'all' && new Date(e.occurredAt).getTime() < cutoff) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${e.errorCode} ${e.correlationId} ${e.tenant} ${e.message} ${e.service}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── sorting ──
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortKey === 'sno')       cmp = a.sno - b.sno
    else if (sortKey === 'errorCode') cmp = a.errorCode.localeCompare(b.errorCode)
    else if (sortKey === 'severity')  cmp = SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
    else if (sortKey === 'status')    cmp = a.status.localeCompare(b.status)
    else if (sortKey === 'occurred')  cmp = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    return sortDir === 'asc' ? cmp : -cmp
  })

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(sorted, {
    pageSize: 20,
    pageSizes: PAGE_SIZES,
    resetDeps: [
      filterClass, filterSev, filterStatus, filterRetryable, filterDomain,
      filterTenant, filterService, filterCorr, filterTimeWin, search, sortKey, sortDir,
    ],
  })

  // Sync filters from URL when sidebar / deep links change
  useEffect(() => {
    const cls = urlParams.get('class')
    if (cls === 'Technical' || cls === 'Functional' || cls === 'Business') {
      setFilterClass(cls)
    } else {
      setFilterClass('')
    }

    const status = urlParams.get('status')
    if (status && (STATUSES as readonly string[]).includes(status)) {
      setFilterStatus(status as LifecycleStatus)
    } else {
      setFilterStatus('')
    }

    const code = urlParams.get('code')
    const correlation = urlParams.get('correlation')
    if (code) {
      setSearch(code)
      setFilterCorr('')
    } else if (correlation) {
      setFilterCorr(correlation)
      setSearch('')
    } else {
      setSearch('')
      setFilterCorr('')
    }

    setPage(1)
  }, [urlParams, setPage])

  // ── KPI counts ──
  const kpiData = [
    { label: 'Total',       value: allErrors.length,                                         icon: AlertTriangle, accent: '#2F6BFF', bg: '#EAF1FE', cls: '' as const        },
    { label: 'Technical',   value: allErrors.filter(e => e.errorClass === 'Technical').length, icon: ServerCrash,  accent: '#7C3AED', bg: '#F3EEFF', cls: 'Technical' as const },
    { label: 'Functional',  value: allErrors.filter(e => e.errorClass === 'Functional').length,icon: ShieldAlert,  accent: '#2563EB', bg: '#E8F0FE', cls: 'Functional' as const},
    { label: 'Business',    value: allErrors.filter(e => e.errorClass === 'Business').length,  icon: Briefcase,    accent: '#059669', bg: '#E7F6F0', cls: 'Business' as const  },
    { label: 'In DLQ',      value: allErrors.filter(e => e.status === 'dlq').length,           icon: Inbox,        accent: '#DC2626', bg: '#FEF2F2', cls: '' as const        },
    { label: 'Unclassified',value: allErrors.filter(e => e.domain === 'UNK').length, icon: CheckCircle2, accent: '#64748B', bg: '#F1F5F9', cls: '' as const     },
  ]

  // ── bulk helpers ──
  function toggleBulk(id: string) {
    setBulkSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAllPage() {
    const pageIds = paged.map(e => e.id)
    const allSelected = pageIds.every(id => bulkSelected.has(id))
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  // ── copy correlation id ──
  function copyCorrelation(e: React.MouseEvent, id: string, cid: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(cid).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // ── reset ──
  function resetFilters() {
    setFilterClass(''); setFilterSev(''); setFilterStatus('')
    setFilterRetryable(''); setFilterDomain(''); setFilterTenant('')
    setFilterService(''); setFilterCorr(''); setFilterTimeWin('all')
    setSearch(''); setPage(1)
  }

  const hasFilters = !!(filterClass || filterSev || filterStatus || filterRetryable ||
    filterDomain || filterTenant || filterService || filterCorr || filterTimeWin !== 'all' || search)

  // ── export ──
  function exportData(fmt: 'csv' | 'json') {
    const data = sorted
    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'voltus-errors.json'; a.click()
    } else {
      const headers = ['sno','errorCode','errorClass','severity','status','service','operation','tenant','correlationId','occurredAt','message']
      const rows = data.map(e => headers.map(h => JSON.stringify((e as any)[h] ?? '')).join(','))
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'voltus-errors.csv'; a.click()
    }
    setExportOpen(false)
  }

  // ── raise test error ──
  const col = (id: string) => visibleCols.has(id)

  return (
    <AppShell>
      <div className="min-w-0 max-w-full flex flex-col min-h-0">
      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 shrink-0">
        {kpiData.map(k => (
          <KPIStat
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            accent={k.accent}
            bg={k.bg}
            active={filterClass === k.cls && k.cls !== ''}
            onClick={() => {
              if (k.cls) {
                setFilterClass(prev => prev === k.cls ? '' : k.cls)
                setPage(1)
              }
            }}
          />
        ))}
      </div>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden min-w-0 max-w-full flex flex-col min-h-0 flex-1">

        {/* ── header bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex items-center gap-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-[#1E293B] dark:text-white mr-2 truncate">Errors</h1>
            {hasFilters && (
              <span className="flex items-center gap-1 rounded-full bg-[#EAF1FE] dark:bg-[#1E3A5F] px-2 py-0.5 text-[11px] font-semibold text-[#2F6BFF]">
                {total} result{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Columns dropdown */}
            <div className="relative" ref={colsRef}>
              <button
                onClick={() => setColsOpen(o => !o)}
                className="flex items-center gap-1.5 h-8 rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] px-2.5 text-[12px] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Columns</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {colsOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-lg py-1">
                  {COL_DEFS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setVisibleCols(prev => {
                        const next = new Set(prev)
                        next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                        return next
                      })}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#334155] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
                    >
                      <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                        visibleCols.has(c.id) ? 'bg-[#2F6BFF] border-[#2F6BFF]' : 'border-[#CBD5E1] dark:border-[#475569]'
                      )}>
                        {visibleCols.has(c.id) && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk select toggle */}
            <button
              onClick={() => { setBulkMode(m => !m); setBulkSelected(new Set()) }}
              className={cn(
                'flex items-center gap-1.5 h-8 rounded-[8px] border px-2.5 text-[12px] transition-colors',
                bulkMode
                  ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]'
                  : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {bulkMode && bulkSelected.size > 0 ? `${bulkSelected.size} selected` : 'Select'}
              </span>
            </button>
          </div>
        </div>

        {/* ── toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[#E9EDF3] dark:border-[#334155] bg-[#FAFBFF] dark:bg-[#0F172A]/40">
          {/* Left: search + filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 h-8">
              <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search code, tenant, message…"
                className="bg-transparent text-[12px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none w-32 sm:w-40"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#94A3B8] hover:text-[#64748B]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter funnel */}
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={cn(
                'flex items-center gap-1.5 h-8 rounded-[8px] border px-2.5 text-[12px] transition-colors',
                filterOpen || hasFilters
                  ? 'border-[#2F6BFF] bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]'
                  : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {hasFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2F6BFF] text-[9px] font-bold text-white">
                  {[filterClass,filterSev,filterStatus,filterRetryable,filterDomain,filterTenant,filterService,filterCorr,filterTimeWin!=='all'?'t':''].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-[#DC2626] transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Right: export, view, raise error, explain */}
          <div className="flex items-center gap-1.5">
            {/* Export split-button */}
            <div className="relative flex" ref={exportRef}>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center gap-1.5 h-8 rounded-l-[8px] border border-r-0 border-[#E9EDF3] dark:border-[#334155] px-2.5 text-[12px] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={() => setExportOpen(o => !o)}
                className="flex h-8 w-6 items-center justify-center rounded-r-[8px] border border-[#E9EDF3] dark:border-[#334155] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-lg py-1">
                  <button onClick={() => exportData('csv')} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#334155] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-[#334155]">
                    Export CSV
                  </button>
                  <button onClick={() => exportData('json')} className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#334155] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-[#334155]">
                    Export JSON
                  </button>
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] overflow-hidden">
              <button
                onClick={() => setView('table')}
                className={cn('flex h-8 w-8 items-center justify-center transition-colors',
                  view === 'table' ? 'bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]' : 'text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]')}
                aria-label="Table view"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('flex h-8 w-8 items-center justify-center transition-colors',
                  view === 'grid' ? 'bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF]' : 'text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#334155]')}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Raise test error (dev tool) */}
            <Link
              href="/errors/raise?mode=test"
              title="Raise test error (dev)"
              className="flex items-center gap-1.5 h-8 rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] px-2.5 text-[12px] text-[#64748B] hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Raise Error</span>
            </Link>

            {/* AI Explain */}
            <button
              title="AI Explain selected"
              className="flex items-center gap-1.5 h-8 rounded-[8px] bg-[#EAF1FE] dark:bg-[#1E3A5F] border border-[#2F6BFF]/30 px-2.5 text-[12px] font-medium text-[#2F6BFF] dark:text-[#93C5FD] hover:bg-[#2F6BFF] hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Explain</span>
            </button>

            {/* New error */}
            <Link
              href="/errors/raise"
              className="flex items-center gap-1 h-8 rounded-[8px] bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-3 text-[12px] font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Raise</span>
            </Link>
          </div>
        </div>

        {/* ── filter panel ────────────────────────────────────────────────── */}
        {filterOpen && (
          <div className="border-b border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]/60 px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Class */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Class</label>
                <div className="flex flex-wrap gap-1">
                  {CLASSES.map(c => (
                    <button
                      key={c}
                      onClick={() => { setFilterClass(prev => prev === c ? '' : c); setPage(1) }}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                        filterClass === c
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] dark:text-slate-400 hover:border-[#2F6BFF]/40'
                      )}
                    >{c}</button>
                  ))}
                </div>
              </div>
              {/* Severity */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Severity</label>
                <div className="flex flex-wrap gap-1">
                  {SEVERITIES.map(s => (
                    <button
                      key={s}
                      onClick={() => { setFilterSev(prev => prev === s ? '' : s); setPage(1) }}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                        filterSev === s
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] dark:text-slate-400 hover:border-[#2F6BFF]/40'
                      )}
                    >{s}</button>
                  ))}
                </div>
              </div>
              {/* Status */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Status</label>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(prev => prev === s ? '' : s); setPage(1) }}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border capitalize transition-colors',
                        filterStatus === s
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] dark:text-slate-400 hover:border-[#2F6BFF]/40'
                      )}
                    >{s}</button>
                  ))}
                </div>
              </div>
              {/* Retryable */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Retryable</label>
                <div className="flex flex-wrap gap-1">
                  {(['yes','no'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => { setFilterRetryable(prev => prev === r ? '' : r); setPage(1) }}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border capitalize transition-colors',
                        filterRetryable === r
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] dark:text-slate-400 hover:border-[#2F6BFF]/40'
                      )}
                    >{r}</button>
                  ))}
                </div>
              </div>
              {/* Time window */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Time Window</label>
                <div className="flex flex-wrap gap-1">
                  {(['1h','6h','24h','7d','all'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setFilterTimeWin(t); setPage(1) }}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                        filterTimeWin === t
                          ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white'
                          : 'border-[#E9EDF3] dark:border-[#334155] text-[#64748B] dark:text-slate-400 hover:border-[#2F6BFF]/40'
                      )}
                    >{t}</button>
                  ))}
                </div>
              </div>
              {/* Domain */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Domain</label>
                <select
                  value={filterDomain}
                  onChange={e => { setFilterDomain(e.target.value); setPage(1) }}
                  className="w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 h-8 text-[12px] text-[#334155] dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]"
                >
                  <option value="">All domains</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Tenant */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Tenant</label>
                <input
                  value={filterTenant}
                  onChange={e => { setFilterTenant(e.target.value); setPage(1) }}
                  placeholder="Tenant name…"
                  className="w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 h-8 text-[12px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]"
                />
              </div>
              {/* Service */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Service</label>
                <input
                  value={filterService}
                  onChange={e => { setFilterService(e.target.value); setPage(1) }}
                  placeholder="Service name…"
                  className="w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 h-8 text-[12px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]"
                />
              </div>
              {/* Correlation ID */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Correlation ID</label>
                <input
                  value={filterCorr}
                  onChange={e => { setFilterCorr(e.target.value); setPage(1) }}
                  placeholder="cid-freight-…"
                  className="w-full rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 h-8 text-[12px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] font-mono focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── bulk action bar ──────────────────────────────────────────────── */}
        {bulkMode && bulkSelected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#EAF1FE] dark:bg-[#1E3A5F] border-b border-[#2F6BFF]/20">
            <span className="text-[12px] font-semibold text-[#2F6BFF]">{bulkSelected.size} selected</span>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 rounded-[7px] bg-white dark:bg-[#1E293B] border border-[#E9EDF3] dark:border-[#334155] px-2.5 h-7 text-[12px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
                <RotateCcw className="h-3 w-3" /> Replay
              </button>
              <button className="flex items-center gap-1 rounded-[7px] bg-white dark:bg-[#1E293B] border border-[#E9EDF3] dark:border-[#334155] px-2.5 h-7 text-[12px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
                <Download className="h-3 w-3" /> Export
              </button>
              <button className="flex items-center gap-1 rounded-[7px] bg-red-50 border border-red-200 px-2.5 h-7 text-[12px] text-red-600 hover:bg-red-100 transition-colors">
                <X className="h-3 w-3" /> Discard
              </button>
            </div>
            <button onClick={() => { setBulkMode(false); setBulkSelected(new Set()) }} className="ml-auto text-[#94A3B8] hover:text-[#64748B]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── table ───────────────────────────────────────────────────────── */}
        {view === 'table' ? (
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100dvh-18rem)]">
            <table className="w-full table-fixed text-[12px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                  {/* bulk checkbox */}
                  {bulkMode && (
                    <th className="w-10 px-3 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
                      <input
                        type="checkbox"
                        checked={paged.length > 0 && paged.every(e => bulkSelected.has(e.id))}
                        onChange={toggleAllPage}
                        className="rounded border-[#CBD5E1] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                      />
                    </th>
                  )}
                  {col('sno') && <th className="w-[36px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-center">S.NO.<SortBtn col="sno" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></div>
                  </th>}
                  {col('errorCode') && <th className="w-[100px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-center truncate">Error Code<SortBtn col="errorCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></div>
                  </th>}
                  {col('errorClass') && <th className="w-[84px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Class</th>}
                  {col('severity') && <th className="w-[60px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-center">Severity<SortBtn col="severity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></div>
                  </th>}
                  {col('message') && <th className="min-w-0 px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Message</th>}
                  {col('source') && <th className="w-[84px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Source</th>}
                  {col('tenant') && <th className="w-[72px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Tenant</th>}
                  {col('correlation') && <th className="w-[60px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Correlation</th>}
                  {col('retryable') && <th className="w-[44px] px-2 py-2.5 text-center text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">Retry</th>}
                  {col('status') && <th className="w-[76px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-center">Status<SortBtn col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></div>
                  </th>}
                  {col('occurred') && <th className="w-[60px] px-2 py-2.5 text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-[#E9EDF3] dark:border-[#334155]">
                    <div className="flex items-center">Occurred<SortBtn col="occurred" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></div>
                  </th>}
                  {col('actions') && <th className="w-[36px] px-2 py-2.5 border-b border-[#E9EDF3] dark:border-[#334155]" />}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-[#94A3B8]" />
                        <p className="text-[14px] font-medium text-[#334155] dark:text-slate-400">No errors match these filters</p>
                        <button onClick={resetFilters} className="text-[12px] text-[#2F6BFF] underline">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <MotionList motionKey={page} className="contents">
                    {paged.map(evt => (
                      <MotionItem key={evt.id} className="contents">
                  <tr
                    onClick={() => setSelectedEvt(evt)}
                    className={cn(
                      'group border-b border-[#E9EDF3] dark:border-[#334155] cursor-pointer transition-colors',
                      bulkSelected.has(evt.id)
                        ? 'bg-[#EAF1FE]/60 dark:bg-[#1E3A5F]/40'
                        : 'hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744]'
                    )}
                  >
                    {/* bulk */}
                    {bulkMode && (
                      <td className="px-3 py-[13px]" onClick={e => { e.stopPropagation(); toggleBulk(evt.id) }}>
                        <input
                          type="checkbox"
                          checked={bulkSelected.has(evt.id)}
                          readOnly
                          className="rounded border-[#CBD5E1] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                        />
                      </td>
                    )}

                    {col('sno') && (
                      <td className="w-[36px] px-2 py-2 text-[#94A3B8] tabular-nums">{evt.sno}</td>
                    )}

                    {col('errorCode') && (
                      <td className="w-[100px] px-2 py-2 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate font-mono text-[11px] font-semibold text-[#2F6BFF]" title={evt.errorCode}>{evt.errorCode}</span>
                          <button
                            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(evt.errorCode).catch(()=>{}) }}
                            title="Copy error code"
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-[#CBD5E1] hover:text-[#64748B] transition-all"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}

                    {col('errorClass') && (
                      <td className="w-[84px] px-2 py-2 overflow-hidden">
                        <ErrorClassPill value={evt.errorClass} />
                      </td>
                    )}

                    {col('severity') && (
                      <td className="w-[60px] px-2 py-2 overflow-hidden">
                        <SeverityPill value={evt.severity} />
                      </td>
                    )}

                    {col('message') && (
                      <td className="min-w-0 px-2 py-2">
                        <p className="truncate text-[#334155] dark:text-slate-300 text-[12px]" title={evt.message}>
                          {evt.message}
                        </p>
                      </td>
                    )}

                    {col('source') && (
                      <td className="w-[84px] px-2 py-2 min-w-0 overflow-hidden">
                        <div className="truncate text-[#1E293B] dark:text-white font-medium text-[11px]" title={`${evt.service} · ${evt.operation}`}>
                          {evt.service}
                        </div>
                      </td>
                    )}

                    {col('tenant') && (
                      <td className="w-[72px] px-2 py-2 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 min-w-0">
                          <Building2 className="h-3 w-3 text-[#94A3B8] shrink-0" />
                          <span className="truncate text-[11px] text-[#64748B] dark:text-slate-400" title={evt.tenant}>{evt.tenant}</span>
                        </div>
                      </td>
                    )}

                    {col('correlation') && (
                      <td className="w-[60px] px-2 py-2 min-w-0 overflow-hidden">
                        <button
                          onClick={e => copyCorrelation(e, evt.id, evt.correlationId)}
                          title={evt.correlationId}
                          className="flex items-center gap-0.5 min-w-0 font-mono text-[10px] text-[#64748B] dark:text-slate-400 hover:text-[#2F6BFF] transition-colors group/corr"
                        >
                          <Fingerprint className="h-3 w-3 text-[#CBD5E1] group-hover/corr:text-[#2F6BFF] transition-colors shrink-0" />
                          {copiedId === evt.id ? (
                            <span className="text-[#16A34A] truncate">Copied!</span>
                          ) : (
                            <span className="truncate">{shortHash(evt.correlationId)}</span>
                          )}
                        </button>
                      </td>
                    )}

                    {col('retryable') && (
                      <td className="w-[44px] px-2 py-2 text-center">
                        {evt.retryable ? (
                          <Check className="h-3.5 w-3.5 text-[#16A34A] mx-auto" />
                        ) : (
                          <span className="text-[#CBD5E1] text-[13px]">—</span>
                        )}
                      </td>
                    )}

                    {col('status') && (
                      <td className="w-[76px] px-2 py-2 overflow-hidden">
                        <LifecyclePill value={evt.status} />
                      </td>
                    )}

                    {col('occurred') && (
                      <td className="w-[60px] px-2 py-2 min-w-0">
                        <div className="truncate text-[11px] text-[#334155] dark:text-slate-300" title={new Date(evt.occurredAt).toISOString()}>
                          {relativeTime(evt.occurredAt)}
                        </div>
                      </td>
                    )}

                    {col('actions') && (
                      <td className="w-[36px] px-2 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <span className="flex h-6 w-6 items-center justify-center text-[#94A3B8] group-hover:hidden">
                            <EllipsisVertical className="h-4 w-4" />
                          </span>
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            <button
                              onClick={() => setSelectedEvt(evt)}
                              title="View detail"
                              className="flex h-6 w-6 items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#2F6BFF] transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title={evt.retryable ? 'Replay' : 'Not retryable'}
                              disabled={!evt.retryable}
                              className="flex h-6 w-6 items-center justify-center rounded text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#2F6BFF] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                      </MotionItem>
                    ))}
                  </MotionList>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── grid view ──────────────────────────────────────────────────── */
          <MotionList
            motionKey={page}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 flex-1 overflow-y-auto min-h-0 max-h-[calc(100dvh-18rem)]"
          >
            {paged.length === 0 ? (
              <div className="col-span-3 py-12 text-center">
                <p className="text-[13px] text-[#94A3B8]">No results</p>
              </div>
            ) : paged.map(evt => (
              <MotionItem key={evt.id}>
              <button
                onClick={() => setSelectedEvt(evt)}
                className="w-full text-left rounded-[12px] border border-[#E9EDF3] dark:border-[#334155] p-4 hover:shadow-md hover:border-[#2F6BFF]/30 transition-all bg-white dark:bg-[#1E293B]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-[11.5px] font-semibold text-[#2F6BFF] truncate">{evt.errorCode}</span>
                  <SeverityPill value={evt.severity} />
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <ErrorClassPill value={evt.errorClass} />
                  <LifecyclePill value={evt.status} />
                </div>
                <p className="text-[12px] font-medium text-[#1E293B] dark:text-white mb-1 truncate">{evt.service} · {evt.operation}</p>
                <p className="text-[11.5px] text-[#64748B] dark:text-slate-400 line-clamp-2 mb-3">{evt.message}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10.5px] text-[#94A3B8]">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate max-w-[90px]">{evt.tenant}</span>
                  </div>
                  <span className="text-[10.5px] text-[#94A3B8]">{relativeTime(evt.occurredAt)}</span>
                </div>
              </button>
              </MotionItem>
            ))}
          </MotionList>
        )}

        {/* ── footer / pagination ──────────────────────────────────────────── */}
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          perPage={perPage}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          pageSizes={PAGE_SIZES}
        />
      </div>
      </div>

      {/* ── detail drawer ────────────────────────────────────────────────── */}
      {selectedEvt && (
        <ErrorDetailDrawer event={selectedEvt} onClose={() => setSelectedEvt(null)} />
      )}
    </AppShell>
  )
}

export default function ErrorsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-24 text-[#64748B] text-sm">Loading errors…</div>
      </AppShell>
    }>
      <ErrorsPageContent />
    </Suspense>
  )
}
