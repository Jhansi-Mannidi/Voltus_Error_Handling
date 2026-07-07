'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutGrid, ServerCrash, ScrollText, Inbox, Zap, Hash,
  Building2, Bot, Settings, ChevronRight, Search, X, Sun,
  Moon, Bell, Maximize2, Activity, Palette, ListChecks, Link2,
  Menu, AlertTriangle, BarChart3, Gauge, GitMerge, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { errors, dlqItems, registry, agentRuns } from '@/mock'
import { PageMotion } from '@/components/voltus/motion'
import { isSubNavActive, parseSubNavHref } from '@/lib/subnav'
import { scrollToSectionById } from '@/lib/use-url-sync'
import { useMediaQuery } from '@/lib/use-media-query'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RailItem {
  icon:  React.ElementType
  label: string
  href:  string
  badge?: number
}

interface SubNavItem {
  label: string
  href:  string
  badge?: number
}

interface BreadcrumbSegment {
  label: string
  href?: string
}

// ─── Rail + Sub-nav config ────────────────────────────────────────────────────

const RAIL: RailItem[] = [
  { icon: LayoutGrid,  label: 'Overview',         href: '/overview' },
  { icon: ServerCrash, label: 'Errors',            href: '/errors',   badge: errors.filter(e => e.status === 'open' || e.status === 'retrying' || e.status === 'dlq').length },
  { icon: ScrollText,  label: 'Logs',              href: '/logs' },
  { icon: Inbox,       label: 'DLQ',               href: '/dlq',      badge: dlqItems.filter(d => d.resolution === 'pending').length },
  { icon: Zap,         label: 'Circuit Breakers',  href: '/breakers' },
  { icon: Hash,        label: 'Registry',          href: '/registry' },
  { icon: BarChart3,   label: 'Analytics',         href: '/analytics' },
  { icon: Building2,   label: 'Tenant Console',    href: '/tenant' },
  { icon: Bot,         label: 'Agent Errors',      href: '/agents',   badge: agentRuns.filter(a => a.status === 'budget_exhausted' || a.status === 'escalated').length },
  { icon: Gauge,       label: 'Log Elevation',     href: '/elevations' },
  { icon: GitMerge,    label: 'Migration',         href: '/migration' },
  { icon: Settings,    label: 'Settings',          href: '/settings' },
]

const SUBNAV: Record<string, SubNavItem[]> = {
  '/overview': [
    { label: 'Operations Dashboard', href: '/overview#dashboard' },
    { label: 'Error Volume Trend',   href: '/overview#trend' },
    { label: 'Seam Health Map',      href: '/overview#seams' },
    { label: 'AI Agent Status',      href: '/overview#agents' },
  ],
  '/errors': [
    { label: 'Event Log',            href: '/errors' },
    { label: 'Raise Error',          href: '/errors/raise' },
    { label: 'By Class',             href: '/errors?class=all' },
    { label: 'Technical',            href: '/errors?class=Technical' },
    { label: 'Functional',           href: '/errors?class=Functional' },
    { label: 'Business',             href: '/errors?class=Business' },
    { label: 'Seam Viewer',          href: '/seams' },
  ],
  '/logs': [
    { label: 'Stream Viewer',        href: '/logs' },
    { label: 'Logger Hierarchy',     href: '/logs?tab=hierarchy' },
    { label: 'Level Management',     href: '/logs?tab=levels' },
    { label: 'Search Logs',          href: '/logs?tab=search' },
  ],
  '/dlq': [
    { label: 'Pending Triage',       href: '/dlq', badge: dlqItems.filter(d => d.resolution === 'pending').length },
    { label: 'Redrive Queue',        href: '/retry' },
    { label: 'Discarded',            href: '/dlq?status=discarded' },
    { label: 'Audit Log',            href: '/dlq?tab=audit' },
  ],
  '/breakers': [
    { label: 'All Breakers',         href: '/breakers' },
    { label: 'Open',                 href: '/breakers?state=open' },
    { label: 'Half-Open',            href: '/breakers?state=half-open' },
    { label: 'Closed',               href: '/breakers?state=closed' },
  ],
  '/registry': [
    { label: 'Error Code Registry',  href: '/registry' },
    { label: 'Register New Code',    href: '/registry/register' },
    { label: 'Technical Codes',      href: '/registry?class=Technical' },
    { label: 'Functional Codes',     href: '/registry?class=Functional' },
    { label: 'Business Codes',       href: '/registry?class=Business' },
  ],
  '/analytics': [
    { label: 'Overview',             href: '/analytics' },
    { label: 'Error Trends',         href: '/analytics#trends' },
    { label: 'Class Breakdown',      href: '/analytics#breakdown' },
    { label: 'Seam Reliability',     href: '/analytics#seams' },
    { label: 'Tenant Insights',      href: '/analytics#tenants' },
    { label: 'MTTR & SLA',           href: '/analytics#mttr' },
  ],
  '/tenant': [
    { label: 'Tenant Overview',      href: '/tenant' },
    { label: 'Gulf Cargo LLC',       href: '/tenant?id=tnt-001' },
    { label: 'Horizon Shipping',     href: '/tenant?id=tnt-002' },
    { label: 'Al Futtaim Logistics', href: '/tenant?id=tnt-003' },
    { label: 'Triton Freight',       href: '/tenant?id=tnt-004' },
  ],
  '/agents': [
    { label: 'Agent Run Log',        href: '/agents' },
    { label: 'Budget Exhausted',     href: '/agents?status=budget_exhausted', badge: agentRuns.filter(a => a.status === 'budget_exhausted').length },
    { label: 'Escalated',            href: '/agents?status=escalated' },
    { label: 'Healing',              href: '/agents?status=healing' },
    { label: 'Recovered',            href: '/agents?status=recovered' },
  ],
  '/elevations': [
    { label: 'Active Elevations',    href: '/elevations' },
    { label: 'New Elevation',        href: '/elevations?new=1' },
    { label: 'History',              href: '/elevations?tab=history' },
  ],
  '/migration': [
    { label: 'UNK Burn-Down',        href: '/migration' },
    { label: 'Module Status',        href: '/migration?tab=modules' },
    { label: 'DoD Checklist',        href: '/migration?tab=dod' },
  ],
  '/settings': [
    { label: 'General',              href: '/settings' },
    { label: 'Logging Config',       href: '/settings?tab=logging' },
    { label: 'Alert Rules',          href: '/alerts' },
    { label: 'API Keys',             href: '/settings?tab=api-keys' },
  ],
}

// Helper: get active rail area from pathname
function getActiveArea(pathname: string): string {
  const match = RAIL.find(r => pathname === r.href || pathname.startsWith(r.href + '/') || pathname.startsWith(r.href + '?'))
  if (match) return match.href
  // Aliases
  if (pathname.startsWith('/seams'))      return '/errors'
  if (pathname.startsWith('/retry'))      return '/dlq'
  if (pathname.startsWith('/alerts'))     return '/settings'
  if (pathname.startsWith('/tenants'))    return '/tenant'
  if (pathname.startsWith('/ai-agent'))   return '/agents'
  if (pathname.startsWith('/elevations')) return '/elevations'
  if (pathname.startsWith('/migration'))  return '/migration'
  if (pathname.startsWith('/analytics'))  return '/analytics'
  if (pathname === '/')                   return '/overview'
  return '/overview'
}

// Helper: build breadcrumb segments from pathname
function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segs: BreadcrumbSegment[] = [{ label: 'VoltusFreight', href: '/overview' }]
  const parts = pathname.split('/').filter(Boolean)
  let built = ''
  parts.forEach((part, i) => {
    built += '/' + part
    const railItem = RAIL.find(r => r.href === built)
    const label = railItem?.label ?? part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    segs.push({ label, href: i < parts.length - 1 ? built : undefined })
  })
  return segs
}

// ─── Command Palette ─────────────────────────────────────────────────────────

interface SearchResult {
  type:  'error' | 'code' | 'tenant' | 'correlation'
  label: string
  sub:   string
  href:  string
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []
  errors.forEach(e => {
    results.push({ type: 'error',       label: e.errorCode,     sub: e.message.slice(0, 60),       href: `/errors` })
    results.push({ type: 'correlation', label: e.correlationId, sub: `${e.service} · ${e.tenant}`, href: `/errors` })
  })
  registry.forEach(r => {
    results.push({ type: 'code', label: r.errorCode, sub: r.description.slice(0, 60), href: `/registry` })
  })
  return results
}

const SEARCH_INDEX = buildSearchIndex()

// ─── Derived feeds for header menus ───────────────────────────────────────────

const NOTIFICATIONS = errors
  .filter(e => (e.severity === 'FATAL' || e.severity === 'ERROR') && e.status !== 'resolved')
  .slice(0, 5)
  .map(e => ({ id: e.id, code: e.errorCode, text: e.message, tenant: e.tenant, sev: e.severity, href: '/errors' }))

const ACTIVITY = errors.slice(0, 6).map((e, i) => ({
  id: e.id,
  actor:  ['System', 'Jhansi M', 'Arjun K', 'System', 'Meera S', 'System'][i % 6],
  action: e.status === 'dlq' ? 'routed to DLQ'
        : e.status === 'resolved' ? 'resolved'
        : e.status === 'retrying' ? 'scheduled a retry for'
        : 'raised',
  code: e.errorCode,
  tenant: e.tenant,
  href: '/errors',
}))

const AI_PROMPTS = [
  { label: 'What is failing right now?',        href: '/errors?status=open' },
  { label: 'Show DLQ items needing redrive',    href: '/dlq' },
  { label: 'Which tenants are most affected?',  href: '/analytics#tenants' },
  { label: 'Summarise business exceptions',     href: '/errors?class=Business' },
]

const EXTERNAL_LINKS = [
  { label: 'PagerDuty',   url: 'https://voltusfreight.pagerduty.com' },
  { label: 'Grafana',     url: 'https://grafana.voltusfreight.com' },
  { label: 'Status Page', url: 'https://status.voltusfreight.com' },
  { label: 'Runbook (Wiki)', url: 'https://wiki.voltusfreight.com/error-framework' },
]

const SEARCH_ICON_MAP: Record<string, React.ElementType> = {
  error: ServerCrash, code: Hash, tenant: Building2, correlation: Link2,
}
const SEARCH_COLOR_MAP: Record<string, string> = {
  error: '#DC2626', code: '#2F6BFF', tenant: '#059669', correlation: '#7C3AED',
}

function SearchResultsList({
  query,
  onNavigate,
  compact = false,
}: {
  query: string
  onNavigate: () => void
  compact?: boolean
}) {
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    setResults(SEARCH_INDEX.filter(r =>
      r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)
    ).slice(0, compact ? 12 : 8))
  }, [query, compact])

  if (!query.trim()) return null

  if (results.length === 0) {
    return (
      <div className={cn('text-center text-[#94A3B8]', compact ? 'px-3 py-6 text-[13px]' : 'px-3 py-4 text-[12px]')}>
        No results for{' '}
        <span className="font-mono text-[#1E293B] dark:text-white">&quot;{query}&quot;</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-0.5', compact ? 'p-2' : 'p-1')}>
      {results.map((r, i) => {
        const Icon = SEARCH_ICON_MAP[r.type]
        return (
          <Link key={i} href={r.href} onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 rounded-[8px] hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors',
              compact ? 'px-3 py-3' : 'px-2.5 py-2',
            )}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
              style={{ backgroundColor: SEARCH_COLOR_MAP[r.type] + '15' }}>
              <Icon className="h-3.5 w-3.5" style={{ color: SEARCH_COLOR_MAP[r.type] }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-mono font-semibold text-[#1E293B] dark:text-white truncate">{r.label}</div>
              <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">{r.sub}</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function SearchDropdown({
  query,
  onNavigate,
}: {
  query: string
  onNavigate: () => void
}) {
  if (!query.trim()) return null

  return (
    <div className="absolute left-3 right-3 top-full mt-1 z-30 rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-lg overflow-hidden">
      <SearchResultsList query={query} onNavigate={onNavigate} />
    </div>
  )
}

function MobileSearchOverlay({
  open,
  query,
  onQueryChange,
  onClose,
}: {
  open: boolean
  query: string
  onQueryChange: (value: string) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] lg:hidden flex flex-col bg-white dark:bg-[#1E293B] safe-top">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#E9EDF3] dark:border-[#334155] shrink-0">
        <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          placeholder="Search error codes, tenants…"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto safe-bottom">
        {query.trim() ? (
          <SearchResultsList query={query} onNavigate={onClose} compact />
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-[#94A3B8]">
            Type to search error codes, correlation IDs, and registry entries.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50
          whitespace-nowrap rounded-md bg-[#1E293B] dark:bg-[#F8FAFC] px-2.5 py-1
          text-[11px] font-semibold text-white dark:text-[#1E293B] shadow-lg">
          {label}
          <span className="absolute top-1/2 -translate-y-1/2 right-full border-4 border-transparent border-r-[#1E293B] dark:border-r-[#F8FAFC]" />
        </div>
      )}
    </div>
  )
}

// ─── Header dropdown menu ──────────────────────────────────────────────────────

interface HeaderMenuProps {
  label:    string
  icon:     React.ElementType
  width?:   number
  dot?:     boolean
  trigger?: 'icon' | 'ai' | 'avatar'
  children: (close: () => void, isMobile: boolean) => React.ReactNode
}

function HeaderMenu({ label, icon: Icon, width = 300, dot, trigger = 'icon', children }: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  const triggerEl =
    trigger === 'ai' ? (
      <button onClick={() => setOpen(o => !o)}
        className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#2F6BFF] text-white text-[11px] font-bold hover:opacity-90 transition-opacity shadow-sm">
        <span>Ai</span>
      </button>
    ) : trigger === 'avatar' ? (
      <button onClick={() => setOpen(o => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F6BFF] text-white text-[12px] font-bold shadow-sm hover:opacity-90 transition-opacity shrink-0">
        JM
      </button>
    ) : (
      <button onClick={() => setOpen(o => !o)}
        className={cn('relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          open ? 'bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF]' : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A]')}>
        <Icon className="h-[18px] w-[18px]" />
        {dot && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#DC2626] ring-2 ring-white dark:ring-[#1E293B]" />}
      </button>
    )

  return (
    <div className="relative flex">
      {open ? triggerEl : <Tooltip label={label}>{triggerEl}</Tooltip>}
      {open && (
        <>
          <div
            className={cn(
              'fixed inset-0 z-[55]',
              isMobile ? 'bg-[#0F172A]/25 backdrop-blur-[1px]' : 'bg-black/40 backdrop-blur-sm',
            )}
            onClick={close}
          />
          <div
            className={cn(
              'z-[56] bg-white dark:bg-[#1E293B] overflow-hidden',
              isMobile
                ? 'fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] flex flex-col max-h-[min(70dvh,520px)] border-b border-[#E9EDF3] dark:border-[#334155] shadow-[0_12px_40px_rgba(15,23,42,0.14)] animate-in fade-in slide-in-from-top-2 duration-200'
                : 'absolute right-0 top-11 rounded-2xl border border-[#E9EDF3] dark:border-[#334155] shadow-2xl',
            )}
            style={isMobile ? undefined : { width }}
          >
            <div className={cn(isMobile ? 'flex flex-col min-h-0 flex-1 overflow-hidden' : '')}>
              {children(close, isMobile)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuHeader({
  title,
  action,
  onClose,
  isMobile = false,
}: {
  title: string
  action?: React.ReactNode
  onClose?: () => void
  isMobile?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center justify-between shrink-0 bg-white dark:bg-[#1E293B] border-b border-[#E9EDF3] dark:border-[#334155]',
      isMobile ? 'px-4 py-3.5' : 'px-4 py-3',
    )}>
      <span className={cn(
        'font-bold text-[#1E293B] dark:text-white',
        isMobile ? 'text-[15px]' : 'text-[12px]',
      )}>
        {title}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Sub-nav (reads URL search params) ────────────────────────────────────────

function SubNavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: SubNavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const searchParams = useSearchParams()
  const [currentHash, setCurrentHash] = useState('')

  useEffect(() => {
    setCurrentHash(window.location.hash)
    const sync = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [pathname])

  return (
    <>
      {items.map(item => {
        const isActive = isSubNavActive(pathname, searchParams, currentHash, item.href)
        const { hash: itemHash } = parseSubNavHref(item.href)
        return (
          <Link key={item.href} href={item.href} scroll={false}
            onClick={() => {
              onNavigate?.()
              if (itemHash) {
                setCurrentHash(`#${itemHash}`)
                scrollToSectionById(itemHash)
              } else if (!item.href.includes('?')) {
                setCurrentHash('')
              }
            }}
            className={cn(
              'flex items-center justify-between rounded-[10px] px-3 py-2.5 mb-0.5 text-[13px] font-medium transition-all',
              isActive
                ? 'bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF] font-semibold'
                : 'text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] hover:text-[#1E293B] dark:hover:text-white',
            )}
          >
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white px-1 shrink-0">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}

function SubNavFallback({ items }: { items: SubNavItem[] }) {
  return (
    <>
      {items.map(item => (
        <Link key={item.href} href={item.href} scroll={false}
          className="flex items-center justify-between rounded-[10px] px-3 py-2 mb-0.5 text-[13px] font-medium text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]">
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

interface AppShellProps {
  children:       React.ReactNode
  breadcrumbs?:   BreadcrumbSegment[]
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const pathname         = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen]       = useState(false)   // mobile slide-over
  const [mounted, setMounted]               = useState(false)
  const [notifRead, setNotifRead]           = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchActive, setSearchActive]     = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen]     = useState(false)
  const [drawerSearch, setDrawerSearch]         = useState('')
  const searchInputRef                      = useRef<HTMLInputElement>(null)
  const isMobile                            = useMediaQuery('(max-width: 1023px)')

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchActive(false)
    setMobileSearchOpen(false)
    setDrawerSearch('')
    searchInputRef.current?.blur()
  }, [])

  const openSearch = useCallback(() => {
    if (isMobile) setMobileSearchOpen(true)
    else searchInputRef.current?.focus()
  }, [isMobile])

  useEffect(() => {
    if (!mobileMoreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMoreOpen])

  useEffect(() => { setMounted(true) }, [])

  // Cmd/Ctrl+K — focus sidebar search (desktop) or open mobile search
  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape') {
      if (mobileSearchOpen || mobileMoreOpen) {
        setMobileSearchOpen(false)
        setMobileMoreOpen(false)
      } else if (searchActive || searchQuery) {
        clearSearch()
      }
    }
  }, [openSearch, mobileSearchOpen, mobileMoreOpen, searchActive, searchQuery, clearSearch])
  useEffect(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleKeydown])

  const activeArea = getActiveArea(pathname)
  const subNav     = SUBNAV[activeArea] ?? []
  const crumbs     = breadcrumbs ?? buildBreadcrumbs(pathname)
  const activeRail = RAIL.find(r => r.href === activeArea)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA] dark:bg-[#0F172A]">

      {/* ── 56px Icon Rail ──────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col items-center w-14 shrink-0 bg-white dark:bg-[#1E293B]
          border-r border-[#E9EDF3] dark:border-[#334155] py-3 z-30"
      >
        {/* Wordmark */}
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F6BFF] shadow-sm">
          <span className="text-[11px] font-black text-white tracking-tight">VF</span>
        </div>
        <div className="w-6 h-px bg-[#E9EDF3] dark:bg-[#334155] mb-3" />

        {/* Rail icons */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {RAIL.map(item => {
            const isActive = activeArea === item.href
            return (
              <Tooltip key={item.href} label={item.label}>
                <Link href={item.href}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                    isActive
                      ? 'bg-[#2F6BFF] text-white shadow-sm shadow-blue-200 dark:shadow-blue-900'
                      : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] hover:text-[#1E293B] dark:hover:text-white'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white px-0.5">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </Tooltip>
            )
          })}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="mt-auto">
          {mounted && (
            <Tooltip label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
              >
                {theme === 'dark'
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </button>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* ── 240px Sidebar ───────────────────────────────────────────────────── */}
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 bg-white dark:bg-[#1E293B]
          border-r border-[#E9EDF3] dark:border-[#334155] z-20"
      >
        {/* Section title */}
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.08em]">
            {activeRail?.label ?? 'Overview'}
          </h2>
        </div>

        {/* Search field */}
        <div className="px-3 mb-3 relative">
          <div className={cn(
            'flex w-full items-center gap-2 rounded-[10px] bg-[#F7F8FA] dark:bg-[#0F172A]',
            'border px-3 py-2 text-[12px] transition-colors',
            searchActive
              ? 'border-[#2F6BFF]/50 ring-1 ring-[#2F6BFF]/20'
              : 'border-[#E9EDF3] dark:border-[#334155] hover:border-[#2F6BFF]/40'
          )}>
            <Search className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchActive(true)}
              onBlur={() => setTimeout(() => setSearchActive(false), 200)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  clearSearch()
                }
              }}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setSearchQuery('')}
                className="shrink-0 p-0.5 rounded hover:bg-[#E9EDF3] dark:hover:bg-[#334155] transition-colors"
              >
                <X className="h-3 w-3 text-[#94A3B8]" />
              </button>
            ) : (
              <kbd className="text-[9px] border border-[#E9EDF3] dark:border-[#334155] rounded px-1 py-0.5 font-mono text-[#94A3B8]">⌘K</kbd>
            )}
          </div>
          {searchActive && searchQuery.trim() && (
            <SearchDropdown query={searchQuery} onNavigate={clearSearch} />
          )}
        </div>

        {/* Sub-nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <Suspense fallback={<SubNavFallback items={subNav} />}>
            <SubNavLinks items={subNav} pathname={pathname} />
          </Suspense>
        </nav>

        {/* Footer: version + environment */}
        <div className="px-4 py-3 border-t border-[#E9EDF3] dark:border-[#334155]">
          <div className="text-[10px] text-[#94A3B8]">
            <span className="font-semibold text-[#2F6BFF]">VoltusFreight</span> &nbsp;v4.2.1
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-0.5">Error Console · Production</div>
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-[#0F172A]/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col w-[min(100vw,20rem)] bg-white dark:bg-[#1E293B] border-r border-[#E9EDF3] dark:border-[#334155] lg:hidden safe-top safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-[#2F6BFF] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">VF</span>
                </div>
                <span className="text-[14px] font-bold text-[#1E293B] dark:text-white truncate">VoltusFreight</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] shrink-0"
              >
                <X className="h-5 w-5 text-[#64748B]" />
              </button>
            </div>

            <div className="px-3 py-3 border-b border-[#E9EDF3] dark:border-[#334155] shrink-0">
              <div className="flex items-center gap-2 rounded-[10px] bg-[#F7F8FA] dark:bg-[#0F172A] border border-[#E9EDF3] dark:border-[#334155] px-3 py-2.5">
                <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
                <input
                  value={drawerSearch}
                  onChange={e => setDrawerSearch(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 min-w-0 bg-transparent text-[14px] text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] outline-none"
                />
              </div>
              {drawerSearch.trim() && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-[10px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B]">
                  <SearchResultsList
                    query={drawerSearch}
                    onNavigate={() => { setSidebarOpen(false); clearSearch() }}
                    compact
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-3 pt-3 pb-2">
                <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.08em] px-1">
                  {activeRail?.label ?? 'Overview'}
                </h2>
              </div>
              <nav className="px-2 pb-3">
                <Suspense fallback={<SubNavFallback items={subNav} />}>
                  <SubNavLinks items={subNav} pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
                </Suspense>
              </nav>

              <div className="mx-3 border-t border-[#E9EDF3] dark:border-[#334155]" />

              <div className="px-3 pt-3 pb-2">
                <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.08em] px-1">
                  All modules
                </h2>
              </div>
              <nav className="px-2 pb-4">
                {RAIL.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 mb-0.5 text-[14px] font-medium transition-all',
                      activeArea === item.href
                        ? 'bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF]'
                        : 'text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] text-[9px] font-bold text-white px-1 shrink-0">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="px-4 py-3 border-t border-[#E9EDF3] dark:border-[#334155] shrink-0">
              <div className="text-[10px] text-[#94A3B8]">
                <span className="font-semibold text-[#2F6BFF]">VoltusFreight</span> v4.2.1
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Error Console · Production</div>
            </div>
          </aside>
        </>
      )}

      <MobileSearchOverlay
        open={mobileSearchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setMobileSearchOpen(false)}
      />

      {/* ── Main content area ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <header
          className="min-h-14 shrink-0 flex items-center gap-2 px-3 sm:px-4 lg:px-5 safe-top
            bg-white dark:bg-[#1E293B] border-b border-[#E9EDF3] dark:border-[#334155] z-10"
        >
          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-[#64748B]" />
          </button>

          {/* Module title */}
          <div className="flex-1 min-w-0">
            <span className="block text-[15px] sm:text-[16px] font-bold text-[#1E293B] dark:text-white truncate">
              {activeRail?.label ?? 'Overview'}
            </span>
          </div>

          {/* Icon cluster */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Search */}
            <Tooltip label="Search (⌘K)">
              <button
                onClick={openSearch}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] dark:text-slate-400
                  hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>

            {/* Desktop-only utilities */}
            <div className="hidden md:contents">
              <HeaderMenu label="AI Assist" icon={Bot} trigger="ai" width={320}>
                {(close, isMobile) => (
                  <>
                    <MenuHeader title="Voltus AI Assist" />
                    <div className="p-3 space-y-1">
                      {AI_PROMPTS.map(p => (
                        <Link key={p.href} href={p.href} onClick={close}
                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-[#7C3AED] to-[#2F6BFF] text-white shrink-0">
                            <Bot className="h-3 w-3" />
                          </span>
                          {p.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </HeaderMenu>

              <HeaderMenu label="External links" icon={Link2} width={240}>
                {(close, isMobile) => (
                  <>
                    <MenuHeader title="External Tools" />
                    <div className="p-2">
                      {EXTERNAL_LINKS.map(l => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" onClick={close}
                          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors">
                          {l.label}
                          <Maximize2 className="h-3 w-3 text-[#94A3B8] rotate-45" />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </HeaderMenu>

              <HeaderMenu label="Checklists" icon={ListChecks} width={280}>
                {(close, isMobile) => (
                  <>
                    <MenuHeader title="Runbooks & Checklists" />
                    <div className="p-2">
                      {[
                        { label: 'Definition of Done', href: '/migration?tab=dod' },
                        { label: 'On-call handoff',    href: '/settings' },
                        { label: 'DLQ triage steps',   href: '/dlq' },
                        { label: 'Incident response',  href: '/errors?status=open' },
                      ].map(c => (
                        <Link key={c.href + c.label} href={c.href} onClick={close}
                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors">
                          <ListChecks className="h-3.5 w-3.5 text-[#94A3B8]" /> {c.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </HeaderMenu>

              <HeaderMenu label="Appearance" icon={Palette} width={200}>
                {(close, isMobile) => (
                  <>
                    <MenuHeader title="Appearance" />
                    <div className="p-2">
                      {[
                        { key: 'light',  label: 'Light',  icon: Sun },
                        { key: 'dark',   label: 'Dark',   icon: Moon },
                        { key: 'system', label: 'System', icon: Activity },
                      ].map(t => (
                        <button key={t.key} onClick={() => { setTheme(t.key); close() }}
                          className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] transition-colors',
                            (mounted && theme === t.key) ? 'bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF] font-semibold' : 'text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]')}>
                          <t.icon className="h-3.5 w-3.5" /> {t.label}
                          {mounted && theme === t.key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2F6BFF]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </HeaderMenu>

              <HeaderMenu label="Activity" icon={Activity} width={340}>
                {(close, isMobile) => (
                  <>
                    <MenuHeader title="Recent Activity" />
                    <div className="max-h-80 overflow-y-auto py-1">
                      {ACTIVITY.map(a => (
                        <Link key={a.id} href={a.href} onClick={close}
                          className="flex items-start gap-2.5 px-4 py-3 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors">
                          <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF1FE] dark:bg-[#1a2744] shrink-0">
                            <Zap className="h-3 w-3 text-[#2F6BFF]" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] text-[#334155] dark:text-slate-300 leading-snug">
                              <span className="font-semibold text-[#1E293B] dark:text-white">{a.actor}</span> {a.action}{' '}
                              <span className="font-mono text-[#2F6BFF]">{a.code}</span>
                            </p>
                            <p className="text-[11px] text-[#94A3B8] truncate">{a.tenant}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </HeaderMenu>
            </div>

            {/* Notifications */}
            <HeaderMenu label="Notifications" icon={Bell} width={360} dot={!notifRead}>
              {(close, isMobile) => (
                <>
                  <MenuHeader
                    title="Notifications"
                    onClose={close}
                    isMobile={isMobile}
                    action={
                      <button
                        type="button"
                        onClick={() => setNotifRead(true)}
                        className={cn(
                          'font-medium text-[#2F6BFF] hover:underline',
                          isMobile ? 'text-[13px] px-1' : 'text-[11px]',
                        )}
                      >
                        Mark all read
                      </button>
                    }
                  />
                  <div className={cn(
                    'overflow-y-auto',
                    isMobile ? 'flex-1 min-h-0' : 'max-h-[min(60dvh,320px)]',
                  )}>
                    {NOTIFICATIONS.map(n => (
                      <Link key={n.id} href={n.href} onClick={close}
                        className={cn(
                          'flex items-start gap-3 border-b border-[#F1F5F9] dark:border-[#334155] last:border-0',
                          'hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] active:bg-[#EAF1FE] dark:active:bg-[#1a2744] transition-colors',
                          isMobile ? 'px-4 py-4' : 'px-4 py-3.5',
                        )}>
                        <span className={cn(
                          'flex items-center justify-center rounded-lg shrink-0',
                          isMobile ? 'h-9 w-9' : 'h-7 w-7 mt-0.5',
                        )}
                          style={{ backgroundColor: n.sev === 'FATAL' ? '#7F1D1D' : '#FEF2F2' }}>
                          <AlertTriangle className={cn(isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5')} style={{ color: n.sev === 'FATAL' ? '#fff' : '#DC2626' }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'font-mono font-semibold text-[#2F6BFF]',
                              isMobile ? 'text-[13px]' : 'text-[12px]',
                            )}>{n.code}</span>
                            <span className={cn(
                              'font-bold uppercase rounded-md',
                              isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1',
                            )} style={{ backgroundColor: n.sev === 'FATAL' ? '#7F1D1D' : '#FEF2F2', color: n.sev === 'FATAL' ? '#fff' : '#DC2626' }}>
                              {n.sev}
                            </span>
                          </div>
                          <p className={cn(
                            'text-[#64748B] dark:text-slate-400 leading-snug mt-1',
                            isMobile ? 'text-[13px] line-clamp-3' : 'text-[12px] line-clamp-2',
                          )}>{n.text}</p>
                          <p className={cn(
                            'text-[#94A3B8] mt-1',
                            isMobile ? 'text-[12px]' : 'text-[11px]',
                          )}>{n.tenant}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/alerts" onClick={close}
                    className={cn(
                      'block text-center font-medium text-[#2F6BFF] border-t border-[#E9EDF3] dark:border-[#334155]',
                      'hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] active:bg-[#EAF1FE] transition-colors shrink-0',
                      isMobile ? 'px-4 py-4 text-[14px]' : 'px-4 py-3 text-[13px]',
                    )}>
                    View all alert rules
                  </Link>
                </>
              )}
            </HeaderMenu>

            {/* Mobile more menu */}
            <div className="md:hidden relative flex">
              <Tooltip label="More">
                <button
                  onClick={() => setMobileMoreOpen(o => !o)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                    mobileMoreOpen
                      ? 'bg-[#EAF1FE] dark:bg-[#1a2744] text-[#2F6BFF]'
                      : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A]',
                  )}
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </button>
              </Tooltip>
              {mobileMoreOpen && (
                <>
                  <div className="fixed inset-0 z-[55] bg-[#0F172A]/25 backdrop-blur-[1px]" onClick={() => setMobileMoreOpen(false)} />
                  <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-[56] flex flex-col max-h-[min(70dvh,520px)] bg-white dark:bg-[#1E293B] border-b border-[#E9EDF3] dark:border-[#334155] shadow-[0_12px_40px_rgba(15,23,42,0.14)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <MenuHeader title="More options" isMobile onClose={() => setMobileMoreOpen(false)} />
                    <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
                      {AI_PROMPTS.map(p => (
                        <Link key={p.href} href={p.href} onClick={() => setMobileMoreOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]">
                          <Bot className="h-4 w-4 text-[#2F6BFF]" /> {p.label}
                        </Link>
                      ))}
                      <div className="my-2 border-t border-[#E9EDF3] dark:border-[#334155]" />
                      {EXTERNAL_LINKS.map(l => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMoreOpen(false)}
                          className="flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-[14px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]">
                          {l.label}
                          <Maximize2 className="h-3.5 w-3.5 text-[#94A3B8] rotate-45" />
                        </a>
                      ))}
                      <div className="my-2 border-t border-[#E9EDF3] dark:border-[#334155]" />
                      {[
                        { key: 'light',  label: 'Light mode',  icon: Sun },
                        { key: 'dark',   label: 'Dark mode',   icon: Moon },
                        { key: 'system', label: 'System theme', icon: Activity },
                      ].map(t => (
                        <button key={t.key} onClick={() => { setTheme(t.key); setMobileMoreOpen(false) }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A]">
                          <t.icon className="h-4 w-4 text-[#94A3B8]" /> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Tooltip label="Fullscreen">
              <button
                onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() }}
                className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#0F172A] transition-colors"
              >
                <Maximize2 className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>

            {/* Avatar / user menu */}
            <HeaderMenu label="Account" icon={Bot} trigger="avatar" width={230}>
              {(close, isMobile) => (
                <>
                  {isMobile ? (
                    <MenuHeader title="Account" onClose={close} isMobile />
                  ) : null}
                  <div className={cn(
                    'flex items-center gap-3 border-b border-[#E9EDF3] dark:border-[#334155]',
                    isMobile ? 'px-4 py-4' : 'px-4 py-3',
                  )}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F6BFF] text-white text-[12px] font-bold shrink-0">JM</span>
                    <div className="min-w-0">
                      <p className={cn('font-semibold text-[#1E293B] dark:text-white truncate', isMobile ? 'text-[14px]' : 'text-[12px]')}>Jhansi M</p>
                      <p className={cn('text-[#94A3B8] truncate', isMobile ? 'text-[12px]' : 'text-[10px]')}>Platform Ops Lead</p>
                    </div>
                  </div>
                  <div className={cn(isMobile ? 'p-3 space-y-1' : 'p-2')}>
                    <Link href="/settings" onClick={close}
                      className={cn(
                        'flex items-center gap-3 rounded-xl text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors',
                        isMobile ? 'px-3 py-3 text-[14px]' : 'px-3 py-2 text-[12px] rounded-lg',
                      )}>
                      <Settings className="h-4 w-4 text-[#94A3B8]" /> Settings
                    </Link>
                    <Link href="/tenant" onClick={close}
                      className={cn(
                        'flex items-center gap-3 rounded-xl text-[#334155] dark:text-slate-300 hover:bg-[#F7F8FA] dark:hover:bg-[#0F172A] transition-colors',
                        isMobile ? 'px-3 py-3 text-[14px]' : 'px-3 py-2 text-[12px] rounded-lg',
                      )}>
                      <Building2 className="h-4 w-4 text-[#94A3B8]" /> Tenant console
                    </Link>
                    <button onClick={close}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10 transition-colors',
                        isMobile ? 'px-3 py-3 text-[14px]' : 'px-3 py-2 text-[12px] rounded-lg',
                      )}>
                      <X className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </HeaderMenu>
          </div>
        </header>

        {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-3 sm:px-4 lg:px-5 py-2 bg-[#F7F8FA] dark:bg-[#0F172A] border-b border-[#E9EDF3] dark:border-[#334155] overflow-x-auto scrollbar-none">
          {crumbs.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-[#C4CDD8] dark:text-[#475569]" />}
              {seg.href && i < crumbs.length - 1 ? (
                <Link href={seg.href} className="text-[12px] text-[#64748B] dark:text-slate-400 hover:text-[#2F6BFF] transition-colors font-medium whitespace-nowrap">
                  {seg.label}
                </Link>
              ) : (
                <span className="text-[12px] text-[#1E293B] dark:text-white font-semibold whitespace-nowrap">{seg.label}</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Scrollable content slot ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0">
          <div className="p-3 sm:p-4 lg:p-5 min-w-0 max-w-full min-h-0 safe-bottom">
            <PageMotion motionKey={pathname}>{children}</PageMotion>
          </div>
        </main>

      </div>
    </div>
  )
}
