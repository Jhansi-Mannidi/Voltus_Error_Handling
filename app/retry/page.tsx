'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { KPICard } from '@/components/voltus/kpi-card'
import { SeverityPill, ErrorClassPill, LifecyclePill } from '@/components/voltus/status-pill'
import { AvatarChip } from '@/components/voltus/avatar-chip'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import {
  RefreshCw, Inbox, Zap, ZapOff, CheckCircle2, Trash2,
  RotateCcw, Clock, AlertTriangle, Play, Pause, History, Search
} from 'lucide-react'
import { errors as errorEvents } from '@/mock'

const dlqEvents = errorEvents.filter(e => e.status === 'dlq')
const retryingEvents = errorEvents.filter(e => e.status === 'retrying')

const circuitBreakers = [
  { id: 'cb-001', service: 'CarrierGateway',    state: 'open',     trips: 3, lastTrip: '03:14:22Z', halfOpenAt: '03:44:22Z', failureRate: '100%', volume: 5 },
  { id: 'cb-002', service: 'PaymentGateway',     state: 'open',     trips: 1, lastTrip: '07:45:30Z', halfOpenAt: '08:15:30Z', failureRate: '100%', volume: 1 },
  { id: 'cb-003', service: 'RateEngine',          state: 'half-open',trips: 2, lastTrip: '04:02:11Z', halfOpenAt: '04:32:11Z', failureRate: '40%',  volume: 5 },
  { id: 'cb-004', service: 'TrackingGateway',     state: 'closed',   trips: 0, lastTrip: '—',         halfOpenAt: '—',         failureRate: '2%',   volume: 240 },
  { id: 'cb-005', service: 'NotificationHub',     state: 'closed',   trips: 0, lastTrip: '—',         halfOpenAt: '—',         failureRate: '8%',   volume: 1240 },
  { id: 'cb-006', service: 'VesselScheduler',     state: 'half-open',trips: 1, lastTrip: '09:05:19Z', halfOpenAt: '09:35:19Z', failureRate: '50%',  volume: 4 },
]

export default function RetryPage() {
  const [activeTab, setActiveTab] = useState<'dlq' | 'retrying' | 'circuit'>('dlq')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function fireToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function selectAll(ids: string[]) {
    setSelectedIds(prev => prev.length === ids.length ? [] : ids)
  }

  const filteredDlq = useMemo(() => dlqEvents.filter(e =>
    !search || `${e.errorCode} ${e.service} ${e.message} ${e.tenant}`.toLowerCase().includes(search.toLowerCase())
  ), [search])
  const filteredRetrying = useMemo(() => retryingEvents.filter(e =>
    !search || `${e.errorCode} ${e.service} ${e.message} ${e.tenant}`.toLowerCase().includes(search.toLowerCase())
  ), [search])

  const dlqPagination = usePagination(filteredDlq, {
    pageSize: 10,
    resetDeps: [search, activeTab],
  })
  const retryingPagination = usePagination(filteredRetrying, {
    pageSize: 10,
    resetDeps: [search, activeTab],
  })

  return (
    <AppShell>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KPICard label="DLQ Depth" value={dlqEvents.length} icon={Inbox} accentColor="#DC2626" accentBg="#FEF2F2" subLabel="Needs manual action" />
        <KPICard label="Retrying" value={retryingEvents.length} icon={RefreshCw} accentColor="#D97706" accentBg="#FFFBEB" subLabel="Active back-off" />
        <KPICard label="Circuit Open" value={circuitBreakers.filter(c => c.state === 'open').length} icon={ZapOff} accentColor="#7C3AED" accentBg="#F3EEFF" subLabel="Services tripped" />
        <KPICard label="Avg Retries" value="2.8" icon={History} accentColor="#2F6BFF" accentBg="#EAF1FE" subLabel="Per failed event" />
      </div>

      {/* Tab nav + search toolbar */}
      <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex gap-1">
            {(['dlq', 'retrying', 'circuit'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF] dark:text-[#93C5FD]'
                    : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155]'
                }`}
              >
                {tab === 'dlq' ? `DLQ (${dlqEvents.length})` : tab === 'retrying' ? `Retrying (${retryingEvents.length})` : 'Circuit Breakers'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => { fireToast(`Replaying ${selectedIds.length} event(s) from the log…`); setSelectedIds([]) }}
                  className="flex items-center gap-1.5 rounded-[10px] bg-[#2F6BFF] text-white px-3 py-1.5 text-[13px] font-semibold hover:bg-[#1E4FD6] transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay {selectedIds.length}
                </button>
                <button
                  onClick={() => { fireToast(`Discarded ${selectedIds.length} event(s) with audit reason`); setSelectedIds([]) }}
                  className="flex items-center gap-1.5 rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#334155] px-3 py-1.5 text-[13px] font-medium text-[#DC2626] hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                  Discard
                </button>
              </>
            )}
            <div className="flex items-center gap-1.5 rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-[#F1F5F9] dark:bg-[#334155] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search queue…"
                className="bg-transparent text-[13px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none w-36"
              />
            </div>
          </div>
        </div>

        {/* DLQ Table */}
        {activeTab === 'dlq' && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                  <th className="px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredDlq.length && filteredDlq.length > 0}
                      onChange={() => selectAll(filteredDlq.map(e => e.id))}
                      className="rounded accent-[#2F6BFF]"
                    />
                  </th>
                  {['ERROR CODE', 'CLASS', 'SEV', 'SERVICE', 'MESSAGE', 'TENANT', 'RETRIES', 'ENTERED DLQ', 'ASSIGNEE', 'ACTIONS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] whitespace-nowrap border-b border-[#E9EDF3] dark:border-[#334155]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MotionList motionKey={dlqPagination.page} className="contents">
                {dlqPagination.paged.map(evt => (
                  <MotionItem key={evt.id} className="contents">
                  <tr className="border-b border-[#E9EDF3] dark:border-[#334155] hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                    <td className="px-4 py-[14px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(evt.id)}
                        onChange={() => toggleSelect(evt.id)}
                        className="rounded accent-[#2F6BFF]"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-[14px]"><span className="font-mono text-[12px] text-[#2F6BFF]">{evt.errorCode}</span></td>
                    <td className="px-4 py-[14px] whitespace-nowrap"><ErrorClassPill value={evt.errorClass} /></td>
                    <td className="px-4 py-[14px] whitespace-nowrap"><SeverityPill value={evt.severity} /></td>
                    <td className="px-4 py-[14px] whitespace-nowrap">
                      <div className="text-[#1E293B] dark:text-white font-medium">{evt.service}</div>
                      <div className="text-[11px] text-[#94A3B8] font-mono">{evt.operation}</div>
                    </td>
                    <td className="px-4 py-[14px] max-w-[220px]"><p className="truncate text-[#334155] dark:text-slate-300">{evt.message}</p></td>
                    <td className="px-4 py-[14px] whitespace-nowrap text-[#64748B]">{evt.tenant}</td>
                    <td className="px-4 py-[14px] text-center">
                      <span className="text-[12px] font-semibold text-[#DC2626]">{evt.retryCount}/{evt.maxRetries}</span>
                    </td>
                    <td className="px-4 py-[14px] whitespace-nowrap text-[12px] text-[#94A3B8]">
                      {new Date(evt.occurredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-[14px]">{evt.assigneeInitials && <AvatarChip initials={evt.assigneeInitials} name={evt.assignee?.split(' ')[0]} />}</td>
                    <td className="px-4 py-[14px]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => fireToast(`Replaying ${evt.errorCode} from seam: ${evt.seam}…`)}
                          className="flex items-center gap-1 rounded-md bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF] dark:text-[#93C5FD] px-2 py-1 text-[11px] font-semibold hover:bg-[#2F6BFF] hover:text-white transition-colors">
                          <RotateCcw className="h-3 w-3" /> Replay
                        </button>
                        <button
                          onClick={() => fireToast(`Discarded ${evt.errorCode}`)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-red-50 hover:text-[#DC2626] transition-colors" title="Discard">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  </MotionItem>
                ))}
                </MotionList>
                {filteredDlq.length === 0 && (
                  <tr><td colSpan={11} className="py-12 text-center text-[14px] text-[#94A3B8]">DLQ is empty — all events processed successfully.</td></tr>
                )}
              </tbody>
            </table>
            {filteredDlq.length > 0 && (
              <Pagination
                page={dlqPagination.page}
                pageCount={dlqPagination.pageCount}
                total={dlqPagination.total}
                perPage={dlqPagination.perPage}
                rangeStart={dlqPagination.rangeStart}
                rangeEnd={dlqPagination.rangeEnd}
                onPageChange={dlqPagination.setPage}
                onPerPageChange={dlqPagination.setPerPage}
              />
            )}
          </div>
        )}

        {/* Retrying Table */}
        {activeTab === 'retrying' && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                  {['ERROR CODE', 'CLASS', 'SEV', 'SERVICE', 'MESSAGE', 'TENANT', 'RETRY PROGRESS', 'NEXT RETRY IN', 'ASSIGNEE', 'ACTIONS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] whitespace-nowrap border-b border-[#E9EDF3] dark:border-[#334155]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MotionList motionKey={retryingPagination.page} className="contents">
                {retryingPagination.paged.map(evt => {
                  const pct = (evt.retryCount / evt.maxRetries) * 100
                  return (
                    <MotionItem key={evt.id} className="contents">
                    <tr className="border-b border-[#E9EDF3] dark:border-[#334155] hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                      <td className="px-4 py-[14px]"><span className="font-mono text-[12px] text-[#2F6BFF]">{evt.errorCode}</span></td>
                      <td className="px-4 py-[14px] whitespace-nowrap"><ErrorClassPill value={evt.errorClass} /></td>
                      <td className="px-4 py-[14px] whitespace-nowrap"><SeverityPill value={evt.severity} /></td>
                      <td className="px-4 py-[14px] whitespace-nowrap">
                        <div className="text-[#1E293B] dark:text-white font-medium">{evt.service}</div>
                        <div className="text-[11px] text-[#94A3B8] font-mono">{evt.operation}</div>
                      </td>
                      <td className="px-4 py-[14px] max-w-[200px]"><p className="truncate text-[#334155] dark:text-slate-300">{evt.message}</p></td>
                      <td className="px-4 py-[14px] whitespace-nowrap text-[#64748B]">{evt.tenant}</td>
                      <td className="px-4 py-[14px] min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155]">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[12px] font-medium text-[#D97706] whitespace-nowrap">{evt.retryCount}/{evt.maxRetries}</span>
                        </div>
                      </td>
                      <td className="px-4 py-[14px] whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[12px] text-[#64748B]">
                          <Clock className="h-3.5 w-3.5" />
                          <span>~30 s</span>
                        </div>
                      </td>
                      <td className="px-4 py-[14px]">{evt.assigneeInitials && <AvatarChip initials={evt.assigneeInitials} name={evt.assignee?.split(' ')[0]} />}</td>
                      <td className="px-4 py-[14px]">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => fireToast(`Paused retries for ${evt.errorCode}`)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-amber-600 transition-colors" title="Pause retries">
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => fireToast(`Forcing retry of ${evt.errorCode} now…`)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] hover:text-[#2F6BFF] transition-colors" title="Force retry now">
                            <Play className="h-3.5 w-3.5" />
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
            {filteredRetrying.length > 0 && (
              <Pagination
                page={retryingPagination.page}
                pageCount={retryingPagination.pageCount}
                total={retryingPagination.total}
                perPage={retryingPagination.perPage}
                rangeStart={retryingPagination.rangeStart}
                rangeEnd={retryingPagination.rangeEnd}
                onPageChange={retryingPagination.setPage}
                onPerPageChange={retryingPagination.setPerPage}
              />
            )}
          </div>
        )}

        {/* Circuit Breakers */}
        {activeTab === 'circuit' && (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {circuitBreakers.map(cb => {
                const stateColors: Record<string, { bg: string; text: string; bar: string }> = {
                  open:      { bg: '#FEF2F2', text: '#DC2626', bar: '#DC2626' },
                  'half-open': { bg: '#FFFBEB', text: '#D97706', bar: '#D97706' },
                  closed:    { bg: '#F0FDF4', text: '#16A34A', bar: '#16A34A' },
                }
                const c = stateColors[cb.state]
                return (
                  <div key={cb.id} className="rounded-[12px] border border-[#E9EDF3] dark:border-[#334155] p-4 bg-white dark:bg-[#1E293B]">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {cb.state === 'open' ? (
                            <ZapOff className="h-4 w-4 text-[#DC2626]" />
                          ) : cb.state === 'half-open' ? (
                            <Zap className="h-4 w-4 text-[#D97706]" />
                          ) : (
                            <Zap className="h-4 w-4 text-[#16A34A]" />
                          )}
                          <span className="text-[14px] font-semibold text-[#1E293B] dark:text-white">{cb.service}</span>
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                          style={{ backgroundColor: c.bg, color: c.text }}
                        >
                          {cb.state}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-[22px] font-bold text-[#1E293B] dark:text-white">{cb.failureRate}</div>
                        <div className="text-[11px] text-[#94A3B8]">failure rate</div>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] mb-3">
                      <div className="h-full rounded-full transition-all" style={{ width: cb.failureRate, backgroundColor: c.bar }} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <div className="text-[#94A3B8]">Trips</div>
                        <div className="font-semibold text-[#334155] dark:text-slate-300">{cb.trips}</div>
                      </div>
                      <div>
                        <div className="text-[#94A3B8]">Volume (1 h)</div>
                        <div className="font-semibold text-[#334155] dark:text-slate-300">{cb.volume} req</div>
                      </div>
                      <div>
                        <div className="text-[#94A3B8]">Last trip</div>
                        <div className="font-mono font-semibold text-[#334155] dark:text-slate-300">{cb.lastTrip}</div>
                      </div>
                      <div>
                        <div className="text-[#94A3B8]">Half-open at</div>
                        <div className="font-mono font-semibold text-[#334155] dark:text-slate-300">{cb.halfOpenAt}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    {cb.state !== 'closed' && (
                      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[#E9EDF3] dark:border-[#334155]">
                        <button
                          onClick={() => fireToast(`Circuit for ${cb.service} force-closed`)}
                          className="flex-1 rounded-[8px] bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF] dark:text-[#93C5FD] text-[12px] font-semibold py-1.5 hover:bg-[#2F6BFF] hover:text-white transition-colors">
                          Force Close
                        </button>
                        <button
                          onClick={() => fireToast(`Trip alert acknowledged for ${cb.service}`)}
                          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#E9EDF3] dark:border-[#334155] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors" title="Acknowledge trip alert">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[80] flex items-center gap-2.5 rounded-xl bg-[#1E293B] dark:bg-white px-4 py-3 shadow-2xl border border-[#334155] dark:border-[#E9EDF3] animate-in fade-in slide-in-from-bottom-2 safe-bottom">
          <CheckCircle2 className="h-4 w-4 text-[#4ADE80] dark:text-[#16A34A] shrink-0" />
          <span className="text-[13px] font-medium text-white dark:text-[#1E293B]">{toast}</span>
        </div>
      )}
    </AppShell>
  )
}
