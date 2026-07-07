'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import {
  Gauge, Plus, X, RotateCcw, Clock, ShieldCheck, Search,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { elevations, type ElevationRecord, type ElevationScope } from '@/mock'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'

type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
type ElevationStatus = 'active' | 'expired' | 'reverted'

const LEVELS: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

const levelColor: Record<LogLevel, string> = {
  TRACE: '#7C3AED',
  DEBUG: '#94A3B8',
  INFO:  '#3B82F6',
  WARN:  '#F59E0B',
  ERROR: '#EF4444',
  FATAL: '#B91C1C',
}

function LevelBadge({ value }: { value: LogLevel }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold font-mono"
      style={{ backgroundColor: `${levelColor[value]}18`, color: levelColor[value] }}>
      {value}
    </span>
  )
}

function ScopeTags({ scope }: { scope: ElevationScope }) {
  const parts = [
    scope.env && { k: 'env',      v: scope.env },
    scope.cluster  && { k: 'cluster',  v: scope.cluster },
    scope.service  && { k: 'service',  v: scope.service },
    scope.instance && { k: 'instance', v: scope.instance },
    scope.category && { k: 'category', v: scope.category },
    scope.tenantId && { k: 'tenant',   v: scope.tenantId },
  ].filter(Boolean) as { k: string; v: string }[]

  return (
    <div className="flex flex-wrap gap-1">
      {parts.map(({ k, v }) => (
        <span key={k} className="inline-flex items-center gap-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#334155] px-1.5 py-0.5 text-[10px] font-mono">
          <span className="text-[#94A3B8]">{k}=</span>
          <span className="text-[#334155] dark:text-slate-300 font-semibold">{v}</span>
        </span>
      ))}
    </div>
  )
}

function ttlRemaining(expiresAt: string): string {
  const ms  = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function ttlPct(createdAt: string, expiresAt: string): number {
  const total   = new Date(expiresAt).getTime() - new Date(createdAt).getTime()
  const elapsed = Date.now() - new Date(createdAt).getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// ─── Create Elevation Modal ───────────────────────────────────────────────────

function CreateElevationModal({ onClose }: { onClose: () => void }) {
  const [env, setEnv]           = useState('prod')
  const [service, setService]   = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel]       = useState<LogLevel>('DEBUG')
  const [sample, setSample]     = useState(100)
  const [ttl, setTtl]           = useState(60)
  const [reason, setReason]     = useState('')

  const services = ['ShipmentOrchestrator', 'RateEngine', 'DocumentService', 'TrackingGateway', 'PaymentGateway', 'NotificationHub', 'FreightLedger', 'AIRatePredictor', 'WorkflowEngine', 'AuthService']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div>
            <h2 className="text-[15px] font-bold text-[#1E293B] dark:text-white">New Log Level Elevation</h2>
            <p className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">Temporarily raise verbosity for a targeted scope</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Scope */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Scope</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#64748B] mb-1 block">Environment</label>
                <select value={env} onChange={e => setEnv(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-2 text-[13px] text-[#334155] dark:text-slate-300 outline-none focus:border-[#2F6BFF]">
                  {['prod', 'staging', 'qa', 'dev'].map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] mb-1 block">Service (optional)</label>
                <select value={service} onChange={e => setService(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-2 text-[13px] text-[#334155] dark:text-slate-300 outline-none focus:border-[#2F6BFF]">
                  <option value="">All services</option>
                  {services.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-[#64748B] mb-1 block">Logger Category (optional)</label>
                <input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. voltus.action.carrier"
                  className="w-full rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-2 text-[13px] text-[#334155] dark:text-slate-300 outline-none focus:border-[#2F6BFF] font-mono placeholder:font-sans placeholder:text-[#94A3B8]"
                />
              </div>
            </div>
          </div>

          {/* Level */}
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide mb-2">Target Level</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(lv => (
                <button key={lv} onClick={() => setLevel(lv)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-bold border transition-all"
                  style={level === lv
                    ? { backgroundColor: levelColor[lv], color: '#fff', borderColor: levelColor[lv] }
                    : { borderColor: '#E2E8F0', color: '#94A3B8' }
                  }>
                  {lv}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1.5 flex items-start gap-1">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              Scope will capture {level} and above. Choosing DEBUG/TRACE may increase log volume significantly.
            </p>
          </div>

          {/* Sample + TTL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">Sample Rate: <strong>{sample}%</strong></label>
              <input type="range" min="1" max="100" value={sample} onChange={e => setSample(+e.target.value)}
                className="w-full accent-[#2F6BFF]" />
            </div>
            <div>
              <label className="text-[11px] text-[#64748B] mb-1 block">TTL: <strong>{ttl} min</strong></label>
              <input type="range" min="5" max="480" step="5" value={ttl} onChange={e => setTtl(+e.target.value)}
                className="w-full accent-[#2F6BFF]" />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] text-[#64748B] mb-1 block">Reason / Incident Ref</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. INC-2214: carrier connector timeouts…"
              rows={2}
              className="w-full rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-2 text-[13px] text-[#334155] dark:text-slate-300 outline-none focus:border-[#2F6BFF] placeholder:text-[#94A3B8] resize-none"
            />
          </div>

          {/* Precedence preview */}
          <div className="rounded-xl border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] p-3">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">Scope Preview</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
              <span className="bg-[#EAF1FE] text-[#2F6BFF] rounded px-1.5 py-0.5">env={env}</span>
              {service  && <span className="bg-[#F3EEFF] text-[#7C3AED] rounded px-1.5 py-0.5">service={service}</span>}
              {category && <span className="bg-[#E7F6F0] text-[#059669] rounded px-1.5 py-0.5">category={category}</span>}
              <span className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: `${levelColor[level]}18`, color: levelColor[level] }}>level={level}</span>
              <span className="bg-[#F1F5F9] dark:bg-[#334155] text-[#64748B] rounded px-1.5 py-0.5">sample={sample}%</span>
              <span className="bg-[#F1F5F9] dark:bg-[#334155] text-[#64748B] rounded px-1.5 py-0.5">ttl={ttl}m</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E9EDF3] dark:border-[#334155]">
          <button onClick={onClose} className="rounded-lg border border-[#E9EDF3] dark:border-[#334155] px-4 py-2 text-[13px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors">
            Cancel
          </button>
          <button onClick={onClose}
            className="rounded-lg bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-4 py-2 text-[13px] font-semibold transition-colors flex items-center gap-1.5"
            disabled={!reason.trim()}>
            <Gauge className="h-3.5 w-3.5" />
            Elevate Now
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ElevationsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <ElevationsPageContent />
    </Suspense>
  )
}

function ElevationsPageContent() {
  const urlParams = useSearchParams()
  const [showCreate, setShowCreate]   = useState(false)
  const [filterStatus, setFilterStatus] = useState<ElevationStatus | 'all'>('all')
  const [historyView, setHistoryView] = useState(false)
  const [search, setSearch]           = useState('')
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => {
    const tab = urlParams.get('tab')
    if (urlParams.get('new') === '1') {
      setShowCreate(true)
    } else {
      setShowCreate(false)
    }
    const isHistory = tab === 'history'
    setHistoryView(isHistory)
    if (isHistory) {
      setFilterStatus('all')
    } else if (!tab && !urlParams.get('new')) {
      setFilterStatus('active')
    }
  }, [urlParams])

  const filtered = useMemo(() => elevations.filter(e => {
    if (historyView) {
      if (e.status === 'active') return false
    } else if (filterStatus !== 'all' && e.status !== filterStatus) {
      return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!`${e.scope.service ?? ''} ${e.scope.category ?? ''} ${e.reason} ${e.createdBy} ${e.scope.env}`.toLowerCase().includes(q)) return false
    }
    return true
  }), [filterStatus, search, historyView])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [filterStatus, search],
  })

  const active  = elevations.filter(e => e.status === 'active').length
  const expired = elevations.filter(e => e.status === 'expired').length
  const reverted = elevations.filter(e => e.status === 'reverted').length

  return (
    <AppShell>
      {showCreate && <CreateElevationModal onClose={() => setShowCreate(false)} />}

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Active Elevations',   value: active,   color: '#F59E0B', bg: '#FFFBEB',  icon: Gauge },
          { label: 'Expired',             value: expired,  color: '#94A3B8', bg: '#F1F5F9',  icon: Clock },
          { label: 'Manually Reverted',   value: reverted, color: '#16A34A', bg: '#F0FDF4',  icon: RotateCcw },
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-1.5 rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 overflow-hidden">
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

      {/* Active elevations warning */}
      {active > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[13px] text-amber-700 dark:text-amber-400">
            <strong>{active} active elevation{active !== 1 ? 's' : ''}</strong> in effect. Elevated verbosity may increase storage costs and stream latency.
          </p>
        </div>
      )}

      {/* Panel */}
      <div className="rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex gap-1">
            {(['all', 'active', 'expired', 'reverted'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors capitalize ${
                  filterStatus === s
                    ? 'bg-[#2F6BFF]/10 text-[#2F6BFF] dark:text-[#93C5FD]'
                    : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
                }`}
              >
                {s === 'all' ? `All (${elevations.length})` : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#334155] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="bg-transparent text-[13px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none w-32" />
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-3 py-1.5 text-[13px] font-semibold transition-colors">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Elevate</span>
            </button>
          </div>
        </div>

        {/* Elevations list */}
        <div className="divide-y divide-[#E9EDF3] dark:divide-[#334155]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
              <ShieldCheck className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-[14px]">No elevations match the current filter</p>
            </div>
          ) : (
          <MotionList motionKey={page}>
          {paged.map(el => {
            const isExp = expanded === el.id
            const pct   = ttlPct(el.createdAt, el.expiresAt)
            const remaining = ttlRemaining(el.expiresAt)
            const statusColors = {
              active:   { border: 'border-l-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
              expired:  { border: 'border-l-slate-300 dark:border-l-slate-600', badge: 'bg-slate-100 dark:bg-slate-800 text-[#64748B]' },
              reverted: { border: 'border-l-green-400', badge: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
            }[el.status]

            return (
              <MotionItem key={el.id}>
              <div className={`border-l-4 ${statusColors.border}`}>
                <div className="flex items-start gap-4 px-4 py-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <LevelBadge value={el.targetLevel as LogLevel} />
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColors.badge}`}>{el.status}</span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">{el.id}</span>
                    </div>
                    <ScopeTags scope={el.scope} />
                    <p className="text-[12px] text-[#64748B] dark:text-slate-400 line-clamp-1">{el.reason}</p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 min-w-[120px]">
                    {el.status === 'active' && (
                      <>
                        <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />{remaining} left
                        </span>
                        <div className="w-28 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">{el.sampleRate}% sampled</span>
                      </>
                    )}
                    {el.status !== 'active' && (
                      <span className="text-[11px] text-[#94A3B8] font-mono">
                        {el.revertType === 'auto' ? 'auto-expired' : el.revertedBy ? `by ${el.revertedBy}` : ''}
                      </span>
                    )}
                    <span className="text-[10px] text-[#94A3B8]">by {el.createdBy}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {el.status === 'active' && (
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 transition-colors" title="Revert early">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setExpanded(isExp ? null : el.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
                      {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded row */}
                {isExp && (
                  <div className="border-t border-[#E9EDF3] dark:border-[#334155] px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">Identifiers</p>
                      <div className="space-y-1 text-[12px]">
                        {[
                          { k: 'ID',         v: el.id },
                          { k: 'Created by', v: el.createdBy },
                          { k: 'Created at', v: el.createdAt.replace('T', ' ').slice(0, 16) + ' UTC' },
                          { k: 'Expires at', v: el.expiresAt.replace('T', ' ').slice(0, 16) + ' UTC' },
                          { k: 'TTL',        v: `${el.ttlMinutes} min` },
                          { k: 'Sample',     v: `${el.sampleRate}%` },
                        ].map(r => (
                          <div key={r.k} className="flex justify-between gap-2">
                            <span className="text-[#94A3B8]">{r.k}</span>
                            <span className="font-mono text-[#334155] dark:text-slate-300 text-right">{r.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">Full Scope</p>
                      <div className="space-y-1 text-[12px]">
                        {Object.entries(el.scope).map(([k, v]) => v && (
                          <div key={k} className="flex items-center gap-2">
                            <span className="text-[#94A3B8] w-20 shrink-0">{k}</span>
                            <code className="text-[11px] bg-[#F1F5F9] dark:bg-[#334155] rounded px-1.5 py-0.5 text-[#334155] dark:text-slate-300">{v}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">Reason</p>
                      <div className="rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E9EDF3] dark:border-[#334155] px-3 py-2.5">
                        <p className="text-[12px] text-[#334155] dark:text-slate-300 leading-relaxed">{el.reason}</p>
                      </div>
                      {el.status === 'expired' && el.revertType === 'auto' && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          Auto-reverted at TTL expiry
                        </p>
                      )}
                      {el.status === 'reverted' && el.revertedBy && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                          <RotateCcw className="h-3.5 w-3.5 text-green-500" />
                          Manually reverted by {el.revertedBy}
                        </p>
                      )}
                    </div>
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
      </div>
    </AppShell>
  )
}
