'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import {
  Download, TrendingDown, TrendingUp, Target,
  Activity, Layers, Building2, Gauge, ServerCrash,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { errors, registry, seams, tenants } from '@/mock'
import { useHashScroll } from '@/lib/use-url-sync'

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const CLASS_COLOR: Record<string, string> = { Technical: '#7C3AED', Functional: '#2563EB', Business: '#059669' }
const SEV_COLOR:   Record<string, string> = { INFO: '#64748B', WARN: '#D97706', ERROR: '#DC2626', FATAL: '#7F1D1D' }
const HEALTH_COLOR: Record<string, string> = { healthy: '#16A34A', degraded: '#D97706', critical: '#DC2626' }

/* ─── Derived datasets (from existing mock data) ──────────────────────────── */
const classDist = (['Technical', 'Functional', 'Business'] as const).map(c => ({
  name: c, value: errors.filter(e => e.errorClass === c).length, color: CLASS_COLOR[c],
}))
const sevDist = (['INFO', 'WARN', 'ERROR', 'FATAL'] as const).map(s => ({
  name: s, value: errors.filter(e => e.severity === s).length, color: SEV_COLOR[s],
}))
const seamData = seams.map(s => ({
  name: s.seam, events: s.eventsToday, open: s.openErrors, dlq: s.dlqEvents, health: s.health,
}))
const tenantData = tenants.map(t => ({
  name: t.tenant, open: t.openErrors, dlq: t.dlqErrors, sla: t.slaBreachCount,
}))

const TREND: Record<string, { t: string; Technical: number; Functional: number; Business: number }[]> = {
  '24h': [
    { t: '00', Technical: 1, Functional: 0, Business: 0 }, { t: '04', Technical: 3, Functional: 2, Business: 1 },
    { t: '08', Technical: 4, Functional: 3, Business: 2 }, { t: '12', Technical: 3, Functional: 1, Business: 1 },
    { t: '16', Technical: 4, Functional: 2, Business: 1 }, { t: '20', Technical: 2, Functional: 1, Business: 2 },
  ],
  '7d': [
    { t: '30 Jun', Technical: 18, Functional: 12, Business: 8 }, { t: '01 Jul', Technical: 22, Functional: 14, Business: 10 },
    { t: '02 Jul', Technical: 15, Functional: 9, Business: 6 }, { t: '03 Jul', Technical: 28, Functional: 18, Business: 12 },
    { t: '04 Jul', Technical: 20, Functional: 11, Business: 9 }, { t: '05 Jul', Technical: 24, Functional: 16, Business: 11 },
    { t: '06 Jul', Technical: 21, Functional: 11, Business: 11 },
  ],
  '30d': [
    { t: 'Wk 1', Technical: 120, Functional: 78, Business: 54 }, { t: 'Wk 2', Technical: 142, Functional: 92, Business: 61 },
    { t: 'Wk 3', Technical: 98, Functional: 64, Business: 47 },  { t: 'Wk 4', Technical: 131, Functional: 85, Business: 58 },
  ],
}

const MTTR_TREND = [
  { d: 'Mon', m: 18 }, { d: 'Tue', m: 22 }, { d: 'Wed', m: 14 },
  { d: 'Thu', m: 19 }, { d: 'Fri', m: 16 }, { d: 'Sat', m: 13 }, { d: 'Sun', m: 12 },
]

/* ─── Tooltip ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] border border-[#E9EDF3] bg-white dark:bg-[#1E293B] dark:border-[#334155] px-3 py-2 shadow-lg text-[11px]">
      {label != null && <p className="font-semibold text-[#64748B] mb-1.5">{label}</p>}
      {payload.map((p: { name: string; value: number; color?: string; payload?: { color?: string } }) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.payload?.color ?? '#94A3B8' }} />
          <span className="text-[#64748B] dark:text-slate-400">{p.name}</span>
          <span className="font-semibold text-[#1E293B] dark:text-white ml-auto pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function Card({ id, title, sub, children, className = '' }: {
  id?: string; title: string; sub?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div id={id} className={`scroll-mt-24 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">{title}</h2>
        {sub && <p className="text-[11px] text-[var(--color-ink-400)] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const [range, setRange]        = useState<'24h' | '7d' | '30d'>('7d')

  useHashScroll()

  const totalEvents   = useMemo(() => registry.reduce((s, r) => s + r.eventCount, 0), [])
  const resolvedPct   = Math.round((errors.filter(e => e.status === 'resolved').length / errors.length) * 100)
  const dlqPct        = Math.round((errors.filter(e => e.status === 'dlq').length / errors.length) * 100)
  const criticalSeams = seams.filter(s => s.health === 'critical').length

  function handleExport() {
    const rows = [
      ['Metric', 'Value'],
      ['Total events (30d)', String(totalEvents)],
      ['Resolution rate %', String(resolvedPct)],
      ['DLQ rate %', String(dlqPct)],
      ...classDist.map(c => [`Class · ${c.name}`, String(c.value)]),
      ...sevDist.map(s => [`Severity · ${s.name}`, String(s.value)]),
      ...seamData.map(s => [`Seam · ${s.name}`, String(s.events)]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'voltus-analytics.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    { label: 'Total Events (30d)', value: totalEvents.toLocaleString(), icon: ServerCrash, accent: '#475569', delta: '+8%',  down: false },
    { label: 'Resolution Rate',    value: `${resolvedPct}%`,            icon: Activity,    accent: '#059669', delta: '+3%',  down: false },
    { label: 'DLQ Rate',           value: `${dlqPct}%`,                 icon: Layers,      accent: '#DC2626', delta: '-2%',  down: true  },
    { label: 'MTTR',               value: '11m 42s',                    icon: Gauge,       accent: '#2F6BFF', delta: '-27%', down: true  },
    { label: 'Critical Seams',     value: String(criticalSeams),        icon: Target,      accent: '#D97706', delta: '0%',   down: false },
  ]

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-[18px] font-bold leading-none text-[var(--color-ink-900)] dark:text-white">Platform Analytics</h1>
          <p className="text-[12px] text-[var(--color-ink-400)] mt-1">
            Error trends, class breakdown, seam reliability &amp; tenant insights · 1 Jul 26 – 6 Jul 26
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 rounded-[8px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-700)] hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {kpis.map(k => (
          <div key={k.label} className="relative flex flex-col rounded-[12px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: k.accent }} />
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)] leading-snug">{k.label}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] shrink-0" style={{ backgroundColor: k.accent + '18' }}>
                <k.icon className="h-3.5 w-3.5" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-[26px] font-bold leading-none text-[var(--color-ink-900)] dark:text-white mb-1.5">{k.value}</span>
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${k.down ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
              {k.down ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}{k.delta}
              <span className="text-[var(--color-ink-400)] font-normal ml-0.5">vs last week</span>
            </span>
          </div>
        ))}
      </div>

      {/* Trends */}
      <Card id="trends" title="Error Volume Trend" sub="Stacked by error class" className="mb-4">
        <div className="flex justify-end mb-3">
          <div className="flex overflow-hidden rounded-[8px] border border-[var(--color-line)] dark:border-[#334155] text-[11px] font-medium">
            {(['24h', '7d', '30d'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 transition-colors ${range === r ? 'bg-[var(--color-brand-blue)] text-white' : 'text-[var(--color-ink-500)] hover:bg-[var(--color-surface-fill)] dark:hover:bg-[#0F172A]'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={TREND[range]} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {[['aT', '#7C3AED'], ['aF', '#2563EB'], ['aB', '#059669']].map(([id, c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Technical"  stackId="1" stroke="#7C3AED" fill="url(#aT)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="Functional" stackId="1" stroke="#2563EB" fill="url(#aF)" strokeWidth={2} isAnimationActive={false} />
            <Area type="monotone" dataKey="Business"   stackId="1" stroke="#059669" fill="url(#aB)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Breakdown */}
      <div id="breakdown" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Error Class Distribution" sub="Share of events by class">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={classDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                  {classDist.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {classDist.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-[12px] text-[var(--color-ink-700)] dark:text-slate-300">{d.name}</span>
                  <span className="ml-auto text-[12px] font-semibold text-[var(--color-ink-900)] dark:text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Severity Distribution" sub="Event count by severity">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sevDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#F1F5F9', fillOpacity: 0.4 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {sevDist.map(d => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Seams */}
      <Card id="seams" title="Seam Reliability" sub="Events, open errors & DLQ by architectural seam" className="mb-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={seamData} layout="vertical" margin={{ top: 4, right: 12, left: 30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={100} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#F1F5F9', fillOpacity: 0.4 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="events" name="Events" fill="#2F6BFF" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="open"   name="Open"   fill="#D97706" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="dlq"    name="DLQ"    fill="#DC2626" radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 mt-3">
          {seamData.map(s => (
            <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] dark:border-[#334155] px-2.5 py-1 text-[11px] text-[var(--color-ink-700)] dark:text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: HEALTH_COLOR[s.health] }} />
              {s.name} · <span className="capitalize text-[var(--color-ink-400)]">{s.health}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Tenants */}
      <Card id="tenants" title="Tenant Insights" sub="Open errors, DLQ items & SLA breaches per tenant" className="mb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tenantData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: '#F1F5F9', fillOpacity: 0.4 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="open" name="Open"        fill="#2563EB" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="dlq"  name="DLQ"         fill="#DC2626" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="sla"  name="SLA breach"  fill="#D97706" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* MTTR & SLA */}
      <Card id="mttr" title="MTTR & SLA" sub="Mean time to root cause vs 15-minute target">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="sm:w-48 shrink-0">
            <div className="flex items-end gap-1.5">
              <span className="text-[36px] font-extrabold leading-none text-[var(--color-ink-900)] dark:text-white tracking-tight">11m</span>
              <span className="text-[20px] font-bold leading-none text-[var(--color-ink-500)] pb-0.5">42s</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] rounded-full px-2 py-0.5 mt-2">
              <TrendingDown className="h-3 w-3" /> −27% vs last week
            </span>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--color-line)] dark:border-[#334155]">
              {[['P50', '8m 12s'], ['P95', '22m 05s'], ['P99', '31m 47s']].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[9px] text-[var(--color-ink-400)] uppercase tracking-wide">{l}</p>
                  <p className="text-[12px] font-semibold text-[var(--color-ink-700)] dark:text-slate-300 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={MTTR_TREND} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[8, 25]} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={15} stroke="#2F6BFF" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: 'Target 15m', fontSize: 9, fill: '#2F6BFF', position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="m" name="MTTR (min)" stroke="#2F6BFF" strokeWidth={2}
                  dot={{ r: 3, fill: '#2F6BFF', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </AppShell>
  )
}
