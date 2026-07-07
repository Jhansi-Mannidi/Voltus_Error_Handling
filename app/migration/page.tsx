'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import {
  CheckCircle2, Circle, AlertTriangle, XCircle, Search, ChevronDown, ChevronUp,
  GitMerge, Activity, Clock, Users, BarChart3,
} from 'lucide-react'
import { migrationModules, type MigrationModule, type MigrationPhase, type ModuleStatus } from '@/mock'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'

const PHASE_LABELS: Record<MigrationPhase, string> = {
  E0: 'E0 — Enumeration',
  E1: 'E1 — Classification',
  E2: 'E2 — Migration',
  E3: 'E3 — Verified',
  E4: 'E4 — Retired Legacy',
}

const PHASE_COLORS: Record<MigrationPhase, { bg: string; text: string; bar: string }> = {
  E0: { bg: '#F1F5F9', text: '#64748B', bar: '#94A3B8' },
  E1: { bg: '#EAF1FE', text: '#2563EB', bar: '#3B82F6' },
  E2: { bg: '#FFFBEB', text: '#D97706', bar: '#F59E0B' },
  E3: { bg: '#F0FDF4', text: '#16A34A', bar: '#22C55E' },
  E4: { bg: '#F3EEFF', text: '#7C3AED', bar: '#8B5CF6' },
}

const STATUS_COLORS: Record<ModuleStatus, { bg: string; text: string; label: string }> = {
  'not-started': { bg: '#F1F5F9',  text: '#64748B', label: 'Not Started' },
  'in-progress': { bg: '#EAF1FE',  text: '#2563EB', label: 'In Progress' },
  'migrated':    { bg: '#F0FDF4',  text: '#16A34A', label: 'Migrated' },
  'blocked':     { bg: '#FEF2F2',  text: '#DC2626', label: 'Blocked' },
}

const DOD_LABELS: Record<keyof MigrationModule['dod'], string> = {
  allThrowsClassified: 'All throws classified',
  noEmptyCatch:        'No empty catch blocks',
  noConsoleErrors:     'No console.error calls',
  noAdhocRetry:        'No ad-hoc retry loops',
  businessAsOutcomes:  'Business errors as outcomes',
  i18nKeysExist:       'i18n keys registered',
  tenancyCausationOk:  'Tenancy & causation OK',
  legacyReadSwitched:  'Legacy read switch on',
  ownerSignedOff:      'Owner sign-off',
}

function DodCheck({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
    : <XCircle     className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />
}

function DriftBadge({ value }: { value: 'clean' | 'drift' | 'pending' }) {
  const map = {
    clean:   'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    drift:   'bg-red-50 dark:bg-red-900/20 text-[#DC2626]',
    pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[value]}`}>{value}</span>
}

function SwitchBadge({ value }: { value: 'off' | 'shadow' | 'on' }) {
  const map = {
    off:    'bg-slate-100 dark:bg-slate-800 text-[#64748B]',
    shadow: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    on:     'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[value]}`}>{value}</span>
}

function dodScore(dod: MigrationModule['dod']): number {
  const vals = Object.values(dod)
  return Math.round((vals.filter(Boolean).length / vals.length) * 100)
}

// ─── Phase Summary Bar ─────────────────────────────────────────────────────────

function PhaseSummary() {
  const phases: MigrationPhase[] = ['E0', 'E1', 'E2', 'E3', 'E4']
  const total = migrationModules.length
  const counts = phases.reduce((acc, p) => ({
    ...acc,
    [p]: migrationModules.filter(m => m.phase === p).length,
  }), {} as Record<MigrationPhase, number>)

  return (
    <div className="rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white">Migration Progress — {total} modules</h3>
        <span className="text-[11px] font-semibold text-[#16A34A]">
          {migrationModules.filter(m => m.phase === 'E3' || m.phase === 'E4').length} verified
        </span>
      </div>
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
        {phases.map(p => {
          const pct = (counts[p] / total) * 100
          if (pct === 0) return null
          return (
            <div key={p} className="h-full first:rounded-l-full last:rounded-r-full" title={`${PHASE_LABELS[p]}: ${counts[p]}`}
              style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS[p].bar }} />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {phases.filter(p => counts[p] > 0).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PHASE_COLORS[p].bar }} />
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">{p} <strong className="text-[#1E293B] dark:text-white">{counts[p]}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function MigrationPageContent() {
  const urlParams = useSearchParams()
  const activeTab = urlParams.get('tab')
  const [filterPhase,  setFilterPhase]  = useState<MigrationPhase | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ModuleStatus | 'all'>('all')
  const [search, setSearch]             = useState('')
  const [expanded, setExpanded]         = useState<string | null>(null)

  useEffect(() => {
    const tab = urlParams.get('tab')
    if (tab === 'dod') {
      const firstIncomplete = migrationModules.find(m => dodScore(m.dod) < 100)
      if (firstIncomplete) setExpanded(firstIncomplete.id)
    }
  }, [urlParams])

  useEffect(() => {
    const tab = urlParams.get('tab')
    const targetId = tab === 'modules' ? 'modules' : tab === 'dod' ? 'dod' : 'burn-down'
    window.setTimeout(() => {
      const main = document.querySelector('main')
      const el = document.getElementById(targetId)
      if (!el) return
      if (!main) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      const mainRect = main.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      main.scrollTo({
        top: main.scrollTop + elRect.top - mainRect.top - 24,
        behavior: 'smooth',
      })
    }, tab === 'dod' ? 200 : 80)
  }, [urlParams, expanded])

  const filtered = useMemo(() => migrationModules.filter(m => {
    if (filterPhase  !== 'all' && m.phase  !== filterPhase)  return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${m.name} ${m.service} ${m.owner}`.toLowerCase().includes(q)) return false
    }
    return true
  }), [filterPhase, filterStatus, search])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [filterPhase, filterStatus, search],
  })

  const migrated   = migrationModules.filter(m => m.status === 'migrated').length
  const inProgress = migrationModules.filter(m => m.status === 'in-progress').length
  const blocked    = migrationModules.filter(m => m.status === 'blocked').length
  const overallPct = Math.round((migrated / migrationModules.length) * 100)

  return (
    <AppShell>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Overall Progress',  value: `${overallPct}%`,   color: '#16A34A', bg: '#F0FDF4',  icon: Activity    },
          { label: 'Migrated',          value: migrated,            color: '#16A34A', bg: '#F0FDF4',  icon: CheckCircle2},
          { label: 'In Progress',       value: inProgress,          color: '#2563EB', bg: '#EAF1FE',  icon: GitMerge    },
          { label: 'Blocked',           value: blocked,             color: '#DC2626', bg: '#FEF2F2',  icon: AlertTriangle},
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

      <div id="burn-down" className="scroll-mt-24">
      <PhaseSummary />
      </div>

      {/* Table */}
      <div id="modules" className="scroll-mt-24 rounded-2xl border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'E0', 'E1', 'E2', 'E3', 'E4'] as const).map(p => (
              <button key={p} onClick={() => setFilterPhase(p)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors"
                style={filterPhase === p
                  ? p === 'all' ? { backgroundColor: '#2F6BFF', color: '#fff', borderColor: '#2F6BFF' }
                    : { backgroundColor: PHASE_COLORS[p as MigrationPhase].bar, color: '#fff', borderColor: PHASE_COLORS[p as MigrationPhase].bar }
                  : { borderColor: '#E2E8F0', color: '#94A3B8' }
                }>
                {p === 'all' ? 'All phases' : p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ModuleStatus | 'all')}
              className="rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2.5 py-1.5 text-[12px] text-[#334155] dark:text-slate-300 outline-none">
              <option value="all">All statuses</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="migrated">Migrated</option>
              <option value="blocked">Blocked</option>
            </select>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#334155] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="bg-transparent text-[13px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none w-28" />
            </div>
          </div>
        </div>

        {/* Module rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                {['MODULE', 'SERVICE', 'PHASE', 'STATUS', 'DOD', 'UNK RATE', 'DRIFT', 'READ SWITCH', 'OWNER', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.05em] whitespace-nowrap border-b border-[#E9EDF3] dark:border-[#334155]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <MotionList motionKey={page} className="contents">
              {paged.map(mod => {
                const isExp  = expanded === mod.id
                const score  = dodScore(mod.dod)
                const sc     = STATUS_COLORS[mod.status]
                const pc     = PHASE_COLORS[mod.phase]
                const scoreColor = score === 100 ? '#16A34A' : score >= 66 ? '#D97706' : '#DC2626'
                return (
                  <MotionItem key={mod.id} className="contents">
                  <>
                    <tr className={`border-b border-[#E9EDF3] dark:border-[#334155] transition-colors cursor-pointer ${
                      isExp ? 'bg-[#F8FAFC] dark:bg-[#0F172A]' : 'hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744]'
                    }`} onClick={() => setExpanded(isExp ? null : mod.id)}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-[#1E293B] dark:text-white">{mod.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#64748B] dark:text-slate-400">{mod.service}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: pc.bg, color: pc.text }}>{mod.phase}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold" style={{ color: scoreColor }}>{score}%</span>
                          <div className="w-14 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[12px] font-semibold ${mod.unkRate > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                          {mod.unkRate > 0 ? `${mod.unkRate}%` : '0%'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <DriftBadge value={mod.dualWriteDrift} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SwitchBadge value={mod.readSwitch} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2F6BFF] text-white text-[9px] font-bold">{mod.ownerInitials}</span>
                          <span className="text-[#64748B] dark:text-slate-400 hidden sm:inline">{mod.owner.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isExp ? <ChevronUp className="h-4 w-4 text-[#94A3B8]" /> : <ChevronDown className="h-4 w-4 text-[#94A3B8]" />}
                      </td>
                    </tr>

                    {isExp && (
                      <tr key={`${mod.id}-detail`} className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E9EDF3] dark:border-[#334155]">
                        <td colSpan={10} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* DoD checklist */}
                            <div id={activeTab === 'dod' && isExp ? 'dod' : undefined} className="sm:col-span-2 lg:col-span-1 scroll-mt-24">
                              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                                Definition of Done — {score}% ({Object.values(mod.dod).filter(Boolean).length}/{Object.values(mod.dod).length} checks)
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {(Object.entries(DOD_LABELS) as [keyof MigrationModule['dod'], string][]).map(([k, label]) => (
                                  <div key={k} className="flex items-center gap-2">
                                    <DodCheck ok={mod.dod[k]} />
                                    <span className={`text-[11px] ${mod.dod[k] ? 'text-[#334155] dark:text-slate-300' : 'text-[#94A3B8] line-through'}`}>{label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Metrics */}
                            <div>
                              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-3">Noise Metrics</p>
                              <div className="space-y-2 text-[12px]">
                                {[
                                  { label: 'UNK Rate',        value: `${mod.unkRate}%`,       ok: mod.unkRate === 0 },
                                  { label: 'UNK-zero days',   value: `${mod.unkZeroDays} d`,  ok: mod.unkZeroDays >= 7 },
                                  { label: 'Empty catches',   value: `${mod.emptyCatches}`,   ok: mod.emptyCatches === 0 },
                                  { label: 'Console.error',  value: `${mod.consoleLogs}`,    ok: mod.consoleLogs === 0 },
                                  { label: 'Ad-hoc retries',  value: `${mod.adhocRetries}`,   ok: mod.adhocRetries === 0 },
                                  { label: 'Lint passing',    value: mod.lintPassing ? 'Yes' : 'No', ok: mod.lintPassing },
                                ].map(r => (
                                  <div key={r.label} className="flex justify-between items-center">
                                    <span className="text-[#94A3B8]">{r.label}</span>
                                    <span className={`font-semibold ${r.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{r.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Migration state */}
                            <div>
                              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-3">Migration State</p>
                              <div className="space-y-2 text-[12px]">
                                <div className="flex justify-between items-center">
                                  <span className="text-[#94A3B8]">Dual-write drift</span>
                                  <DriftBadge value={mod.dualWriteDrift} />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[#94A3B8]">Read switch</span>
                                  <SwitchBadge value={mod.readSwitch} />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[#94A3B8]">Owner sign-off</span>
                                  <span className={`font-semibold flex items-center gap-1 ${mod.ownerSignOff ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                    {mod.ownerSignOff ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                    {mod.ownerSignOff ? 'Signed off' : 'Pending'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[#94A3B8]">Phase</span>
                                  <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: PHASE_COLORS[mod.phase].bg, color: PHASE_COLORS[mod.phase].text }}>
                                    {mod.phase} — {PHASE_LABELS[mod.phase].split('—')[1].trim()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                  </MotionItem>
                )
              })}
              </MotionList>
            </tbody>
          </table>
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

export default function MigrationPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <MigrationPageContent />
    </Suspense>
  )
}
