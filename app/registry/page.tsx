'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { RegisterCodeForm } from '@/components/voltus/register-code-form'
import {
  Hash, Plus, Search, Download, RefreshCw, Zap, BookMarked,
  CheckCircle2, XCircle, X, Copy, ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePagination } from '@/lib/use-pagination'
import { Pagination } from '@/components/voltus/pagination'
import { MotionList, MotionItem } from '@/components/voltus/motion'
import { registryFull, CLASS_POLICY, effectivePolicy, type RegistryEntryFull, type ErrorClass, type Severity } from '@/mock'
import {
  getRegistryEntries,
  updateRegistryEntry,
  deprecateRegistryEntry,
} from '@/lib/registry-store'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CLASS_COLORS: Record<ErrorClass, { bg: string; text: string }> = {
  Technical:  { bg: '#F3EEFF', text: '#7C3AED' },
  Functional: { bg: '#E8F0FE', text: '#2563EB' },
  Business:   { bg: '#E7F6F0', text: '#059669' },
}
const SEV_COLORS: Record<Severity, { bg: string; text: string }> = {
  INFO:  { bg: '#F1F5F9', text: '#64748B' },
  WARN:  { bg: '#FFFBEB', text: '#D97706' },
  ERROR: { bg: '#FEF2F2', text: '#DC2626' },
  FATAL: { bg: '#FFF0F0', text: '#7F1D1D' },
}

function ClassBadge({ c }: { c: ErrorClass }) {
  const s = CLASS_COLORS[c]
  return <span className="inline-flex text-[10px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: s.bg, color: s.text }}>{c}</span>
}
function SevBadge({ s }: { s: Severity }) {
  const cfg = SEV_COLORS[s]
  return <span className="inline-flex text-[10px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: cfg.bg, color: cfg.text }}>{s}</span>
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

const DOMAINS = [...new Set(registryFull.map(r => r.domain))].sort()

// ─── Edit Drawer (register uses /registry/register page) ───────────────────
function EditDrawer({
  entry, onClose, onSave, allEntries,
}: {
  entry: RegistryEntryFull
  onClose: () => void
  onSave: (e: Partial<RegistryEntryFull>) => void
  allEntries: RegistryEntryFull[]
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto relative z-10 flex flex-col w-full max-w-lg h-full bg-card border-l border-border shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-[15px] font-bold text-foreground">Edit Error Code</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <RegisterCodeForm
          entry={entry}
          allEntries={allEntries}
          layout="compact"
          onCancel={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  )
}

// ─── Domain group row ─────────────────────────────────────────────────────────
function DomainGroup({ domain, entries, onEdit, onDeprecate }: {
  domain: string
  entries: RegistryEntryFull[]
  onEdit: (e: RegistryEntryFull) => void
  onDeprecate: (code: string) => void
}) {
  const [open, setOpen] = useState(domain === 'CARRIER' || domain === 'DB' || domain === 'FIN')
  const deprecated = entries.filter(e => e.deprecatedIn).length
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <span className="font-mono text-[12px] font-bold text-foreground">{domain}</span>
        <span className="text-[11px] text-muted-foreground">{entries.length} code{entries.length !== 1 ? 's' : ''}</span>
        {deprecated > 0 && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{deprecated} deprecated</span>}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <tbody>
              {entries.map(r => (
                <tr key={r.errorCode}
                  className={cn('border-t border-border/50 hover:bg-muted/30 transition-colors', r.deprecatedIn && 'opacity-50')}>
                  <td className="px-4 py-2.5 pl-10 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#2F6BFF]">{r.errorCode}</span>
                      <button onClick={() => copyToClipboard(r.errorCode)} className="p-0.5 rounded hover:bg-accent transition-colors">
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                      {r.deprecatedIn && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">deprecated {r.deprecatedIn}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><ClassBadge c={r.errorClass} /></td>
                  <td className="px-3 py-2.5"><SevBadge s={r.defaultSeverity} /></td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      const pol = effectivePolicy(r)
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: r.isRetriable ? '#16A34A' : '#94A3B8' }}>
                            {r.isRetriable ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {r.isRetriable ? `${r.maxRetries}× ${r.backoffStrategy}` : 'No retry'}
                          </span>
                          <span className="inline-flex w-fit items-center rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide"
                            style={pol.source === 'code-override'
                              ? { backgroundColor: '#FFF7ED', color: '#C2410C' }
                              : { backgroundColor: '#F1F5F9', color: '#64748B' }}
                            title={pol.source === 'code-override'
                              ? `Overrides ${r.errorClass} class default (${pol.overrides.join(', ')})`
                              : `Inherits ${r.errorClass} class default policy`}>
                            {pol.source === 'code-override' ? `override · ${pol.overrides.length}` : 'class default'}
                          </span>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground max-w-[180px] truncate">{r.userMessageKey}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[9px] font-bold text-foreground">{r.ownerInitials}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">{r.ownerTeam}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{r.introducedIn}</td>
                  <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                    {r.deprecatedIn ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <a href={`/errors?code=${r.errorCode}`} className="text-[10px] text-[#2F6BFF] hover:underline">{r.usage30d} ↗</a>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(r)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        Edit
                      </button>
                      {!r.deprecatedIn && (
                        <button onClick={() => onDeprecate(r.errorCode)}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#D97706] hover:bg-[#FFFBEB] transition-colors">
                          Deprecate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function RegistryPageContent() {
  const urlParams = useSearchParams()
  const [search,       setSearch]       = useState('')
  const [filterClass,  setFilterClass]  = useState<ErrorClass | 'All'>('All')
  const [filterDomain, setFilterDomain] = useState('All')
  const [editEntry,    setEditEntry]    = useState<RegistryEntryFull | undefined>(undefined)
  const [entries,      setEntries]      = useState<RegistryEntryFull[]>(registryFull)

  useEffect(() => {
    setEntries(getRegistryEntries())
  }, [])

  const filtered = useMemo(() => entries.filter(r => {
    if (filterClass !== 'All' && r.errorClass !== filterClass) return false
    if (filterDomain !== 'All' && r.domain !== filterDomain) return false
    if (search) {
      const q = search.toLowerCase()
      return r.errorCode.toLowerCase().includes(q) || r.userMessageKey.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    }
    return true
  }), [entries, filterClass, filterDomain, search])

  const {
    page, setPage, perPage, setPerPage, paged, total,
    pageCount, rangeStart, rangeEnd,
  } = usePagination(filtered, {
    pageSize: 10,
    resetDeps: [filterClass, filterDomain, search],
  })

  useEffect(() => {
    const cls = urlParams.get('class')
    if (cls === 'Technical' || cls === 'Functional' || cls === 'Business') {
      setFilterClass(cls)
    } else {
      setFilterClass('All')
    }
    setPage(1)
  }, [urlParams, setPage])

  const grouped = useMemo(() => {
    const map = new Map<string, RegistryEntryFull[]>()
    paged.forEach(r => {
      const g = map.get(r.domain) ?? []
      g.push(r)
      map.set(r.domain, g)
    })
    return map
  }, [paged])

  const deprecated = entries.filter(e => e.deprecatedIn).length
  const byClass = {
    Technical:  entries.filter(e => e.errorClass === 'Technical').length,
    Functional: entries.filter(e => e.errorClass === 'Functional').length,
    Business:   entries.filter(e => e.errorClass === 'Business').length,
  }

  function handleSave(data: Partial<RegistryEntryFull>) {
    if (!editEntry) return
    updateRegistryEntry(editEntry.errorCode, data)
    setEntries(getRegistryEntries())
    setEditEntry(undefined)
  }

  function handleDeprecate(code: string) {
    deprecateRegistryEntry(code)
    setEntries(getRegistryEntries())
  }

  return (
    <AppShell>
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Codes',    value: entries.length, icon: Hash,         accent: '#2F6BFF' },
          { label: 'Technical',      value: byClass.Technical,  icon: Zap,      accent: '#7C3AED' },
          { label: 'Functional',     value: byClass.Functional, icon: RefreshCw,accent: '#2563EB' },
          { label: 'Business',       value: byClass.Business,   icon: BookMarked,accent: '#059669' },
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl" style={{ backgroundColor: k.accent }} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{k.label}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: k.accent + '18' }}>
                <k.icon className="h-3.5 w-3.5" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-3xl font-bold text-foreground leading-none mt-0.5">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code or key…"
                className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted/50 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-[#2F6BFF] w-48 transition-colors" />
            </div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value as ErrorClass | 'All')}
              className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-[#2F6BFF]">
              <option value="All">All classes</option>
              {(['Technical', 'Functional', 'Business'] as ErrorClass[]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
              className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-[#2F6BFF]">
              <option value="All">All domains</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="text-[12px] text-muted-foreground">{filtered.length} of {entries.length} · {deprecated} deprecated</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const rows = [['code', 'class', 'domain', 'severity', 'retryable', 'maxRetries', 'backoff', 'circuitBreaker', 'userMessageKey', 'ownerTeam', 'introducedIn', 'deprecatedIn'],
                ...filtered.map(r => [r.errorCode, r.errorClass, r.domain, r.defaultSeverity, String(r.isRetriable), String(r.maxRetries), r.backoffStrategy, String(r.circuitBreaker), r.userMessageKey, r.ownerTeam, r.introducedIn, r.deprecatedIn ?? ''])]
              const csv = rows.map(r => r.join(',')).join('\n')
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
              const a = document.createElement('a'); a.href = url; a.download = 'error-code-registry.csv'; a.click(); URL.revokeObjectURL(url)
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[12px] text-muted-foreground hover:bg-muted transition-colors">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <Link href="/registry/register"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2F6BFF] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity">
              <Plus className="h-3.5 w-3.5" /> Register code
            </Link>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid px-4 py-2 border-b border-border bg-muted/30"
          style={{ gridTemplateColumns: '200px 90px 70px 70px 160px 80px 80px 80px 60px 120px' }}>
          {['CODE', 'CLASS', 'SEV', 'RETRY', 'MSG KEY', 'OWNER', 'INTRODUCED', 'DEPRECATED', 'USE/30D', 'ACTIONS'].map(h => (
            <span key={h} className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">{h}</span>
          ))}
        </div>

        {/* Domain groups */}
        {grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Hash className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">No codes match these filters</p>
          </div>
        ) : (
          <MotionList motionKey={page}>
            {[...grouped.entries()].map(([domain, domainEntries]) => (
              <MotionItem key={domain}>
                <DomainGroup domain={domain} entries={domainEntries}
                  onEdit={e => setEditEntry(e)}
                  onDeprecate={handleDeprecate} />
              </MotionItem>
            ))}
          </MotionList>
        )}

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

        {/* Footer note */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
          <AlertCircle className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            The library refuses unregistered codes in non-dev environments. New registrations ship as reviewed migrations with an <code className="bg-muted px-1 rounded font-mono">introduced_in</code> version and a review note.
          </p>
        </div>
      </div>

      {editEntry && (
        <EditDrawer
          entry={editEntry}
          allEntries={entries}
          onClose={() => setEditEntry(undefined)}
          onSave={handleSave}
        />
      )}
    </AppShell>
  )
}

export default function RegistryPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <RegistryPageContent />
    </Suspense>
  )
}
