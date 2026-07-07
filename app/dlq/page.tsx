'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { ClassPill, SeverityPill } from '@/components/voltus/status-pill'
import {
  Inbox, RotateCcw, Trash2, Eye, OctagonAlert, Clock,
  AlertTriangle, CheckCircle2, Search, ChevronRight,
  AlertCircle, SkipForward, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import { dlqItemsExtended, dlqQueues, type DlqItem, type DlqQueue } from '@/mock'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'Pending Triage' | 'Redrive History' | 'Discarded' | 'Audit Log'
type ActionType = 'redrive' | 'discard' | null

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ageLabel(iso: string) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function RetryBar({ used, max }: { used: number; max: number }) {
  const bars = Math.max(max, 1)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={cn(
          'h-2.5 w-1.5 rounded-[2px]',
          i < used
            ? (used >= max ? 'bg-[#DC2626]' : 'bg-[#D97706]')
            : 'bg-[#E9EDF3] dark:bg-[#334155]'
        )} />
      ))}
      <span className="ml-1 text-[10px] font-mono font-bold text-[#64748B] dark:text-slate-400">
        {used}/{max}
      </span>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, accent, sub }: { label: string; value: number | string; icon: React.ElementType; accent: string; sub?: string }) {
  return (
    <div className="relative flex flex-col gap-1 rounded-xl border border-border bg-card p-4 overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-0.5 rounded-full" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: accent + '18' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </span>
      </div>
      <span className="text-3xl font-bold text-foreground leading-none mt-0.5">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

// ─── Row expand ───────────────────────────────────────────────────────────────
function DlqRow({ item, selected, onToggle, onAction }: {
  item: DlqItem
  selected: boolean
  onToggle: () => void
  onAction: (t: ActionType) => void
}) {
  const [open, setOpen] = useState(false)
  const isPoison = item.id === 'dlq-005' || item.id === 'dlq-001'

  return (
    <>
      <tr
        className={cn(
          'border-b border-border last:border-0 transition-colors cursor-pointer',
          selected ? 'bg-accent/30' : 'hover:bg-muted/40'
        )}
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-3 py-3" onClick={e => { e.stopPropagation(); onToggle() }}>
          <input type="checkbox" checked={selected} onChange={onToggle}
            className="h-3.5 w-3.5 accent-[#2F6BFF] cursor-pointer" />
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            {isPoison && <OctagonAlert className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />}
            <span className="font-mono text-[10px] font-bold text-[#2F6BFF]">{item.errorCode}</span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">{item.correlationId}</span>
        </td>
        <td className="px-3 py-3"><SeverityPill value={item.severity} /></td>
        <td className="px-3 py-3 text-[12px] font-medium text-foreground whitespace-nowrap">{item.service}</td>
        <td className="px-3 py-3 max-w-[200px]">
          <p className="text-[12px] text-muted-foreground truncate">{item.reason}</p>
        </td>
        <td className="px-3 py-3 text-[12px] text-muted-foreground whitespace-nowrap truncate max-w-[110px]">{item.tenant}</td>
        <td className="px-3 py-3"><RetryBar used={item.retryCount} max={item.maxRetries} /></td>
        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{ageLabel(item.enqueuedAt)}</td>
        <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button onClick={() => setOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onAction('redrive')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2F6BFF] text-[11px] font-semibold hover:opacity-80 transition-opacity">
              <RotateCcw className="h-3 w-3" /> Redrive
            </button>
            <button onClick={() => onAction('discard')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#DC2626] text-[11px] font-semibold hover:opacity-80 border border-red-200 dark:border-red-900 transition-opacity">
              <Trash2 className="h-3 w-3" /> Discard
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Full Envelope Message</p>
                <p className="text-[12px] text-foreground font-medium">{item.message}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    ['Domain', item.domain],
                    ['Operation', item.operation],
                    ['Max Retries', item.maxRetries],
                    ['Retry Count', item.retryCount],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <span className="text-[10px] text-muted-foreground">{k}: </span>
                      <span className="text-[11px] font-mono font-semibold text-foreground">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Cross-links</p>
                <div className="flex flex-col gap-1.5">
                  <a href={`/errors?correlation=${item.correlationId}`} className="text-[12px] text-[#2F6BFF] hover:underline flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> View in Error Explorer
                  </a>
                  <a href={`/logs?correlation=${item.correlationId}`} className="text-[12px] text-[#2F6BFF] hover:underline flex items-center gap-1">
                    <Shield className="h-3 w-3" /> View related logs
                  </a>
                  <a href={`/registry?code=${item.errorCode}`} className="text-[12px] text-[#2F6BFF] hover:underline flex items-center gap-1">
                    <SkipForward className="h-3 w-3" /> Registry entry
                  </a>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ item, action, onConfirm, onClose }: {
  item: DlqItem; action: ActionType
  onConfirm: (note: string) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')
  const valid = note.trim().length >= 10
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          {action === 'redrive'
            ? <RotateCcw className="h-4 w-4 text-[#2F6BFF]" />
            : <Trash2 className="h-4 w-4 text-[#DC2626]" />}
          <h3 className="text-[15px] font-bold text-foreground capitalize">{action} DLQ Item</h3>
        </div>
        <p className="text-[12px] text-muted-foreground mb-1 font-mono">{item.errorCode}</p>
        <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
          <span className="bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Tenant: {item.tenant}</span>
          <span className="bg-muted px-2 py-0.5 rounded-full text-muted-foreground">1 item affected</span>
        </div>
        <div className="rounded-xl bg-muted/60 p-3 mb-4 text-[12px] text-foreground">{item.message}</div>
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          Audit reason <span className="text-[#DC2626]">*</span> (min 10 chars)
        </label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder={action === 'redrive' ? 'Root cause fixed, safe to re-process…' : 'Cannot be remediated because…'}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] resize-none transition-colors mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button disabled={!valid} onClick={() => valid && onConfirm(note)}
            className={cn(
              'px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all',
              action === 'redrive' ? 'bg-[#2F6BFF] hover:opacity-90' : 'bg-[#DC2626] hover:opacity-90',
              !valid && 'opacity-40 cursor-not-allowed'
            )}>
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk confirm ─────────────────────────────────────────────────────────────
function BulkConfirmModal({ count, action, items, onConfirm, onClose }: {
  count: number; action: ActionType; items: DlqItem[]
  onConfirm: (note: string) => void; onClose: () => void
}) {
  const [note, setNote] = useState('')
  const valid = note.trim().length >= 10
  const tenants = [...new Set(items.map(i => i.tenant))].join(', ')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          {action === 'redrive' ? <RotateCcw className="h-4 w-4 text-[#2F6BFF]" /> : <Trash2 className="h-4 w-4 text-[#DC2626]" />}
          <h3 className="text-[15px] font-bold text-foreground">Bulk {action} — {count} items</h3>
        </div>
        <div className="rounded-xl bg-muted/60 p-3 mb-4 text-[12px] text-foreground">
          <strong>Impact:</strong> {count} message{count > 1 ? 's' : ''} across tenants: {tenants}
        </div>
        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          Audit reason <span className="text-[#DC2626]">*</span>
        </label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder="Reason for bulk operation…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] resize-none mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-[13px] text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button disabled={!valid} onClick={() => valid && onConfirm(note)}
            className={cn(
              'px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all',
              action === 'redrive' ? 'bg-[#2F6BFF] hover:opacity-90' : 'bg-[#DC2626] hover:opacity-90',
              !valid && 'opacity-40 cursor-not-allowed'
            )}>
            Confirm bulk {action}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function DLQPageContent() {
  const urlParams = useSearchParams()
  const [tab, setTab]                   = useState<Tab>('Pending Triage')
  const [search, setSearch]             = useState('')
  const [selectedQueue, setSelectedQueue] = useState<DlqQueue>(dlqQueues[0])
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [items, setItems]               = useState<DlqItem[]>(dlqItemsExtended)
  const [actionItem, setActionItem]     = useState<DlqItem | null>(null)
  const [actionType, setActionType]     = useState<ActionType>(null)
  const [bulkAction, setBulkAction]     = useState<ActionType>(null)

  useEffect(() => {
    const tabParam = urlParams.get('tab')
    const status = urlParams.get('status')
    if (tabParam === 'audit') setTab('Audit Log')
    else if (status === 'discarded') setTab('Discarded')
    else setTab('Pending Triage')
  }, [urlParams])

  const pending   = useMemo(() => items.filter(d => d.resolution === 'pending'), [items])
  const redriven  = useMemo(() => items.filter(d => d.resolution === 'redrive'),  [items])
  const discarded = useMemo(() => items.filter(d => d.resolution === 'discard'),  [items])
  const poisonIds = useMemo(() => ['dlq-001', 'dlq-005'], [])

  // KPIs
  const totalDepth   = dlqQueues.reduce((s, q) => s + q.depth, 0)
  const oldestItem   = items.filter(d => d.resolution === 'pending').sort((a,b) => new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime())[0]
  const redrivable   = items.filter(d => d.resolution === 'pending' && d.retryCount > 0).length
  const poisonCount  = items.filter(d => d.resolution === 'pending' && poisonIds.includes(d.id)).length

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return pending.filter(d =>
      !q ||
      d.errorCode.toLowerCase().includes(q) ||
      d.correlationId.toLowerCase().includes(q) ||
      d.service.toLowerCase().includes(q) ||
      d.reason.toLowerCase().includes(q) ||
      d.message.toLowerCase().includes(q) ||
      d.tenant.toLowerCase().includes(q)
    )
  }, [pending, search])

  const pendingPagination = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [search, tab],
  })
  const redrivenPagination = usePagination(redriven, {
    pageSize: 10,
    resetDeps: [tab],
  })
  const discardedPagination = usePagination(discarded, {
    pageSize: 10,
    resetDeps: [tab],
  })

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function applyAction(id: string, resolution: 'redrive' | 'discard', note: string) {
    setItems(prev => prev.map(d => d.id !== id ? d : {
      ...d, resolution, resolvedBy: 'Jhansi M',
      resolvedAt: new Date().toISOString(), auditNote: note
    }))
    setActionItem(null); setActionType(null)
  }

  function applyBulkAction(resolution: 'redrive' | 'discard', note: string) {
    setItems(prev => prev.map(d => !selected.has(d.id) ? d : {
      ...d, resolution, resolvedBy: 'Jhansi M',
      resolvedAt: new Date().toISOString(), auditNote: note
    }))
    setSelected(new Set()); setBulkAction(null)
  }

  const selectedItems = items.filter(d => selected.has(d.id))

  const TABS: Tab[] = ['Pending Triage', 'Redrive History', 'Discarded', 'Audit Log']

  return (
    <AppShell>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="DLQ Depth (total)" value={totalDepth} icon={Inbox}        accent="#DC2626" sub={`${pending.length} pending triage`} />
        <KpiCard label="Oldest item age"   value={oldestItem ? ageLabel(oldestItem.enqueuedAt) : '—'} icon={Clock} accent="#D97706" sub={oldestItem?.errorCode ?? '—'} />
        <KpiCard label="Redrivable"        value={redrivable}  icon={RotateCcw}    accent="#2F6BFF" sub="with retry history" />
        <KpiCard label="Poison Pills"      value={poisonCount} icon={OctagonAlert} accent="#7C3AED" sub="≥2 subscriber failures" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Queue list sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[12px] font-bold text-foreground uppercase tracking-widest">DLQ Queues</h3>
            </div>
            <div className="divide-y divide-border">
              {dlqQueues.map(q => (
                <button key={q.id} onClick={() => setSelectedQueue(q)}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors',
                    selectedQueue.id === q.id ? 'bg-accent/40' : 'hover:bg-muted/40'
                  )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-foreground truncate">{q.name.split('.').slice(0, 2).join('.')}</span>
                      {q.depth > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center h-4.5 min-w-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[9px] font-bold">
                          {q.depth}
                        </span>
                      )}
                      {q.poisonPct > 0 && (
                        <OctagonAlert className="h-3 w-3 text-[#7C3AED] shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate block">{q.service}</span>
                  </div>
                  <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', selectedQueue.id === q.id && 'rotate-90')} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {/* Poison pill callout */}
          {poisonCount > 0 && tab === 'Pending Triage' && (
            <div className="mb-3 flex items-start gap-3 rounded-xl border border-[#7C3AED]/30 bg-[#F3EEFF] dark:bg-[#3b1d6b]/30 px-4 py-3">
              <OctagonAlert className="h-4 w-4 text-[#7C3AED] mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-[#7C3AED]">Poison Pill Alert — {poisonCount} correlated cross-subscriber failure{poisonCount > 1 ? 's' : ''}</p>
                <p className="text-[11px] text-[#7C3AED]/80 mt-0.5">
                  VLT-TEC-CARRIER-0001 (cid-freight-8a3f2e) has failed across ≥2 subscribers (ShipmentOrchestrator + CarrierAllocationAgent).
                  These items are marked with <OctagonAlert className="inline h-3 w-3" /> and should be reviewed together.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Tabs + toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-0 border-b border-border">
              <div className="flex gap-0.5">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={cn(
                      'px-3 py-2 text-[12px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap',
                      tab === t
                        ? 'border-[#2F6BFF] text-[#2F6BFF]'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}>
                    {t}
                    {t === 'Pending Triage' && pending.length > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white px-1">{pending.length}</span>
                    )}
                  </button>
                ))}
              </div>
              {tab === 'Pending Triage' && (
                <div className="flex items-center gap-2 pb-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search error code, service, tenant, or reason…"
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted/50 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] w-56 sm:w-72 transition-colors" />
                  </div>
                  {selected.size > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setBulkAction('redrive')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2F6BFF] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity">
                        <RotateCcw className="h-3 w-3" /> Redrive {selected.size}
                      </button>
                      <button onClick={() => setBulkAction('discard')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] text-[12px] font-semibold hover:opacity-80 border border-red-200 dark:border-red-900 transition-opacity">
                        <Trash2 className="h-3 w-3" /> Discard {selected.size}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pending table */}
            {tab === 'Pending Triage' && (
              <div className="overflow-x-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-semibold">All clear — no pending items</p>
                    <p className="text-xs mt-1">All DLQ messages have been triaged</p>
                  </div>
                ) : (
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-3 py-3 w-10">
                          <input type="checkbox"
                            checked={selected.size === filtered.length && filtered.length > 0}
                            onChange={e => setSelected(e.target.checked ? new Set(filtered.map(d => d.id)) : new Set())}
                            className="h-3.5 w-3.5 accent-[#2F6BFF] cursor-pointer" />
                        </th>
                        {['ERROR CODE', 'SEV', 'SERVICE', 'REASON', 'TENANT', 'RETRIES', 'AGE', 'ACTIONS'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <MotionList motionKey={pendingPagination.page} className="contents">
                      {pendingPagination.paged.map(d => (
                        <MotionItem key={d.id} className="contents">
                          <DlqRow item={d} selected={selected.has(d.id)}
                            onToggle={() => toggleSelect(d.id)}
                            onAction={(t) => { setActionItem(d); setActionType(t) }} />
                        </MotionItem>
                      ))}
                      </MotionList>
                    </tbody>
                  </table>
                )}
                {filtered.length > 0 && (
                  <Pagination
                    page={pendingPagination.page}
                    pageCount={pendingPagination.pageCount}
                    total={pendingPagination.total}
                    perPage={pendingPagination.perPage}
                    rangeStart={pendingPagination.rangeStart}
                    rangeEnd={pendingPagination.rangeEnd}
                    onPageChange={pendingPagination.setPage}
                    onPerPageChange={pendingPagination.setPerPage}
                  />
                )}
              </div>
            )}

            {/* Redrive history */}
            {tab === 'Redrive History' && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40">
                      {['ERROR CODE', 'SERVICE', 'TENANT', 'AUDIT NOTE', 'BY', 'RESOLVED AT'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {redriven.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No redriven items yet</td></tr>
                    )}
                    <MotionList motionKey={redrivenPagination.page} className="contents">
                    {redrivenPagination.paged.map(d => (
                      <MotionItem key={d.id} className="contents">
                      <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><span className="font-mono text-[10px] font-bold text-[#2F6BFF]">{d.errorCode}</span></td>
                        <td className="px-4 py-3 text-foreground font-medium">{d.service}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.tenant}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[250px] truncate">{d.auditNote ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.resolvedBy ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{d.resolvedAt ? new Date(d.resolvedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}</td>
                      </tr>
                      </MotionItem>
                    ))}
                    </MotionList>
                  </tbody>
                </table>
                {redriven.length > 0 && (
                  <Pagination
                    page={redrivenPagination.page}
                    pageCount={redrivenPagination.pageCount}
                    total={redrivenPagination.total}
                    perPage={redrivenPagination.perPage}
                    rangeStart={redrivenPagination.rangeStart}
                    rangeEnd={redrivenPagination.rangeEnd}
                    onPageChange={redrivenPagination.setPage}
                    onPerPageChange={redrivenPagination.setPerPage}
                  />
                )}
              </div>
            )}

            {/* Discarded */}
            {tab === 'Discarded' && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40">
                      {['ERROR CODE', 'SERVICE', 'REASON', 'DISCARDED BY', 'AUDIT NOTE', 'AT'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {discarded.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No discarded items</td></tr>
                    )}
                    <MotionList motionKey={discardedPagination.page} className="contents">
                    {discardedPagination.paged.map(d => (
                      <MotionItem key={d.id} className="contents">
                      <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><span className="font-mono text-[10px] font-bold text-muted-foreground line-through">{d.errorCode}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{d.service}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{d.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.resolvedBy ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{d.auditNote ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{d.resolvedAt ? new Date(d.resolvedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}</td>
                      </tr>
                      </MotionItem>
                    ))}
                    </MotionList>
                  </tbody>
                </table>
                {discarded.length > 0 && (
                  <Pagination
                    page={discardedPagination.page}
                    pageCount={discardedPagination.pageCount}
                    total={discardedPagination.total}
                    perPage={discardedPagination.perPage}
                    rangeStart={discardedPagination.rangeStart}
                    rangeEnd={discardedPagination.rangeEnd}
                    onPageChange={discardedPagination.setPage}
                    onPerPageChange={discardedPagination.setPerPage}
                  />
                )}
              </div>
            )}

            {/* Audit log */}
            {tab === 'Audit Log' && (
              <div className="divide-y divide-border">
                {items.filter(d => d.resolution !== 'pending').length === 0 && (
                  <div className="py-12 text-center text-muted-foreground text-sm">No audit entries yet</div>
                )}
                {items.filter(d => d.resolution !== 'pending').map(d => (
                  <div key={d.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full shrink-0 mt-0.5',
                      d.resolution === 'redrive' ? 'bg-blue-50 dark:bg-blue-950/50' : 'bg-red-50 dark:bg-red-950/50'
                    )}>
                      {d.resolution === 'redrive'
                        ? <RotateCcw className="h-3.5 w-3.5 text-[#2F6BFF]" />
                        : <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[#2F6BFF]">{d.errorCode}</span>
                        <span className={cn('text-[11px] font-semibold capitalize', d.resolution === 'redrive' ? 'text-[#2F6BFF]' : 'text-[#DC2626]')}>{d.resolution}</span>
                        <span className="text-[11px] text-muted-foreground">by {d.resolvedBy ?? 'System'}</span>
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{d.tenant}</span>
                      </div>
                      {d.auditNote && <p className="text-[12px] text-muted-foreground mt-0.5">{d.auditNote}</p>}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 whitespace-nowrap">
                      {d.resolvedAt ? new Date(d.resolvedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Single action modal */}
      {actionItem && actionType && (
        <ConfirmModal item={actionItem} action={actionType}
          onConfirm={note => applyAction(actionItem.id, actionType, note)}
          onClose={() => { setActionItem(null); setActionType(null) }} />
      )}

      {/* Bulk action modal */}
      {bulkAction && (
        <BulkConfirmModal count={selected.size} action={bulkAction} items={selectedItems}
          onConfirm={note => applyBulkAction(bulkAction, note)}
          onClose={() => setBulkAction(null)} />
      )}
    </AppShell>
  )
}

export default function DLQPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <DLQPageContent />
    </Suspense>
  )
}
