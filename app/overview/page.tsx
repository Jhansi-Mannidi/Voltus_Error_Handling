'use client'

import { useState } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { ErrorClassPill, SeverityPill } from '@/components/voltus/status-pill'
import {
  ServerCrash, Cpu, ShieldAlert, Briefcase, Inbox, HelpCircle,
  TrendingUp, TrendingDown, Minus, BellRing, ArrowRight,
  Target, ExternalLink, Bot, Layers,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts'
import { errors, registry, seams, agentRuns, type ErrorEnvelope, type Severity, type AgentStatus } from '@/mock'
import { MotionSection } from '@/components/voltus/motion'
import { useHashScroll } from '@/lib/use-url-sync'

/* ─── Derived counts ─────────────────────────────────────────────────────── */
const total24h     = errors.length
const technical    = errors.filter(e => e.errorClass === 'Technical').length
const functional   = errors.filter(e => e.errorClass === 'Functional').length
const business     = errors.filter(e => e.errorClass === 'Business').length
const dlqCount     = errors.filter(e => e.status === 'dlq').length
const unclassified = 3

/* ─── Chart datasets ─────────────────────────────────────────────────────── */
const DATA_24H = [
  { t: '00:00', T: 1, F: 0, B: 0 }, { t: '01:00', T: 2, F: 1, B: 0 },
  { t: '02:00', T: 1, F: 0, B: 1 }, { t: '03:00', T: 4, F: 2, B: 0 },
  { t: '04:00', T: 2, F: 2, B: 1 }, { t: '05:00', T: 1, F: 1, B: 2 },
  { t: '06:00', T: 3, F: 2, B: 1 }, { t: '07:00', T: 4, F: 1, B: 2 },
  { t: '08:00', T: 2, F: 3, B: 1 }, { t: '09:00', T: 3, F: 2, B: 2 },
  { t: '10:00', T: 2, F: 1, B: 1 }, { t: '11:00', T: 1, F: 2, B: 0 },
  { t: '12:00', T: 3, F: 1, B: 1 }, { t: '13:00', T: 2, F: 2, B: 2 },
  { t: '14:00', T: 4, F: 3, B: 1 }, { t: '15:00', T: 3, F: 2, B: 2 },
  { t: '16:00', T: 2, F: 1, B: 1 }, { t: '17:00', T: 3, F: 2, B: 0 },
  { t: '18:00', T: 1, F: 1, B: 1 }, { t: '19:00', T: 2, F: 0, B: 2 },
  { t: '20:00', T: 3, F: 1, B: 1 }, { t: '21:00', T: 1, F: 2, B: 0 },
  { t: '22:00', T: 2, F: 1, B: 1 }, { t: '23:00', T: 1, F: 0, B: 0 },
]

const DATA_1H = [
  { t: '09:00', T: 3, F: 2, B: 2 }, { t: '09:10', T: 1, F: 1, B: 0 },
  { t: '09:20', T: 2, F: 0, B: 1 }, { t: '09:30', T: 0, F: 1, B: 0 },
  { t: '09:40', T: 1, F: 2, B: 1 }, { t: '09:50', T: 2, F: 1, B: 0 },
  { t: '10:00', T: 2, F: 1, B: 1 },
]

const DATA_7D = [
  { t: '30 Jun', T: 18, F: 12, B:  8 }, { t: '01 Jul', T: 22, F: 14, B: 10 },
  { t: '02 Jul', T: 15, F:  9, B:  6 }, { t: '03 Jul', T: 28, F: 18, B: 12 },
  { t: '04 Jul', T: 20, F: 11, B:  9 }, { t: '05 Jul', T: 24, F: 16, B: 11 },
  { t: '06 Jul', T: 14, F:  8, B:  5 },
]

/* ─── MTTR sparkline (minutes) ───────────────────────────────────────────── */
const MTTR_SPARK = [
  { d: 'Mon', m: 18 }, { d: 'Tue', m: 22 }, { d: 'Wed', m: 14 },
  { d: 'Thu', m: 19 }, { d: 'Fri', m: 16 }, { d: 'Sat', m: 13 }, { d: 'Sun', m: 12 },
]

/* ─── Open incidents ─────────────────────────────────────────────────────── */
const openIncidents = (errors
  .filter(e => (e.severity === 'FATAL' || e.severity === 'ERROR') && e.status !== 'resolved')
  .slice(0, 5) as ErrorEnvelope[])
  .map((e, i) => ({
    ...e,
    ageMins: [42, 17, 5, 91, 28][i] ?? 30,
    paging:  [true, false, true, true, false][i] ?? false,
  }))

/* ─── Top error codes (sorted by event frequency) ───────────────────────── */
const topCodes = [...registry].sort((a, b) => b.eventCount - a.eventCount).slice(0, 8)

const CODE_TRENDS: Record<string, 'up' | 'down' | 'flat'> = {
  'VLT-TEC-CARRIER-0001': 'up',   'VLT-FNC-RATE-0012': 'down',
  'VLT-TEC-DB-0003':      'flat', 'VLT-BUS-CUSTOMS-0007': 'up',
  'VLT-TEC-AUTH-0011':    'down', 'VLT-BUS-SLA-0028': 'up',
  'VLT-TEC-DOC-0018':     'flat', 'VLT-BUS-COMPLIANCE-0004': 'down',
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Range     = '1h' | '24h' | '7d'
type SevFilter = Severity | 'ALL'

const RANGE_DATA: Record<Range, typeof DATA_24H> = {
  '1h': DATA_1H, '24h': DATA_24H, '7d': DATA_7D,
}

/* Severity multipliers simulate filtered breakdown */
const SEV_M: Record<SevFilter, [number, number, number]> = {
  ALL:   [1,    1,    1   ],
  INFO:  [0.2,  0.25, 0.3 ],
  WARN:  [0.35, 0.4,  0.35],
  ERROR: [0.3,  0.25, 0.25],
  FATAL: [0.15, 0.1,  0.1 ],
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Delta({ v }: { v: number }) {
  if (v > 0) return <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#DC2626]"><TrendingUp className="h-2.5 w-2.5" />+{v}%</span>
  if (v < 0) return <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#16A34A]"><TrendingDown className="h-2.5 w-2.5" />{v}%</span>
  return <span className="flex items-center gap-0.5 text-[10px] text-[#94A3B8]"><Minus className="h-2.5 w-2.5" />0%</span>
}

function TrendIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  if (t === 'up')   return <TrendingUp   className="h-3.5 w-3.5 text-[#DC2626]" />
  if (t === 'down') return <TrendingDown className="h-3.5 w-3.5 text-[#16A34A]" />
  return <Minus className="h-3.5 w-3.5 text-[#94A3B8]" />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] border border-[#E9EDF3] bg-white dark:bg-[#1E293B] dark:border-[#334155] px-3 py-2 shadow-lg text-[11px]">
      <p className="font-semibold text-[#64748B] mb-1.5">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[#64748B] dark:text-slate-400">{p.name}</span>
          <span className="font-semibold text-[#1E293B] dark:text-white ml-auto pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const AGENT_STATUS: Record<AgentStatus, { label: string; color: string }> = {
  healing:          { label: 'Healing',          color: '#D97706' },
  budget_exhausted: { label: 'Budget Exhausted', color: '#DC2626' },
  recovered:        { label: 'Recovered',        color: '#16A34A' },
  escalated:        { label: 'Escalated',        color: '#7F1D1D' },
}

const SEAM_HEALTH: Record<string, { label: string; dot: string }> = {
  healthy:  { label: 'Healthy',  dot: 'bg-emerald-500' },
  degraded: { label: 'Degraded', dot: 'bg-amber-500' },
  critical: { label: 'Critical', dot: 'bg-red-500' },
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  const [range, setRange]         = useState<Range>('24h')
  const [sev, setSev]             = useState<SevFilter>('ALL')

  useHashScroll()

  const [tm, tf, tb] = SEV_M[sev]
  const chartData = RANGE_DATA[range].map(d => ({
    t:          d.t,
    Technical:  Math.max(0, Math.round(d.T * tm)),
    Functional: Math.max(0, Math.round(d.F * tf)),
    Business:   Math.max(0, Math.round(d.B * tb)),
  }))

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const kpis = [
    { label: 'Total Errors (24h)', value: total24h,    delta: +18, icon: ServerCrash, accent: '#475569', bg: '#F1F5F9', sub: '↑ 4 vs yesterday', href: '/errors'                    },
    { label: 'Technical',          value: technical,   delta: +12, icon: Cpu,         accent: '#7C3AED', bg: '#F3EEFF', sub: 'Service & infra',   href: '/errors?class=Technical'   },
    { label: 'Functional',         value: functional,  delta:  -5, icon: ShieldAlert,  accent: '#2563EB', bg: '#E8F0FE', sub: 'Logic & integration',href: '/errors?class=Functional' },
    { label: 'Business',           value: business,    delta:   0, icon: Briefcase,    accent: '#059669', bg: '#E7F6F0', sub: 'Compliance & ops',  href: '/errors?class=Business'    },
    { label: 'In DLQ',             value: dlqCount,    delta: +33, icon: Inbox,        accent: '#DC2626', bg: '#FEF2F2', sub: `${dlqCount} need redrive`, href: '/dlq'              },
    { label: 'Unclassified',       value: unclassified,delta: -40, icon: HelpCircle,   accent: '#D97706', bg: '#FFFBEB', sub: 'migration burn-down', href: '/registry'              },
  ] as const

  return (
    <AppShell>

      <MotionSection>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-[18px] font-bold leading-none text-[var(--color-ink-900)] dark:text-white">
          Error Operations Overview
        </h1>
        <p className="text-[12px] text-[var(--color-ink-400)] mt-1">
          VoltusFreight AI-Native ERP — Exception Management Framework · 1 Jul 26 – 6 Jul 26
        </p>
      </div>

      </MotionSection>

      <MotionSection delay={0.05}>
      {/* ── Row 1: 6 KPI cards ───────────────────────────────────────────── */}
      <div id="dashboard" className="scroll-mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {kpis.map(k => (
          <Link key={k.label} href={k.href}
            className="group relative flex flex-col rounded-[12px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4 overflow-hidden hover:border-[var(--color-brand-blue)]/40 hover:shadow-md transition-all">
            {/* accent top bar */}
            <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: k.accent }} />
            {/* date-range chip */}
            <span className="self-start mb-3 rounded-full border border-[var(--color-line)] dark:border-[#334155] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-ink-400)] whitespace-nowrap">
              1 Jul – 6 Jul 26
            </span>
            <div className="flex items-start justify-between gap-1 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-snug text-[var(--color-ink-500)]">
                {k.label}
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] shrink-0" style={{ backgroundColor: k.bg }}>
                <k.icon className="h-3.5 w-3.5" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-[28px] font-bold leading-none text-[var(--color-ink-900)] dark:text-white mb-2">
              {k.value}
            </span>
            <div className="flex items-center justify-between mt-auto gap-1">
              <Delta v={k.delta} />
              <span className="text-[9px] text-[var(--color-ink-400)] text-right leading-tight max-w-[90px] truncate">
                {k.sub}
              </span>
            </div>
          </Link>
        ))}
      </div>

      </MotionSection>

      <MotionSection delay={0.08}>
      {/* ── Row 2: Stacked area chart + MTTR gauge ───────────────────────── */}
      <div id="trend" className="scroll-mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* ── Stacked area chart ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5">
          {/* header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Error Rate Over Time</h2>
              <p className="text-[11px] text-[var(--color-ink-400)] mt-0.5">Stacked area by error class · filter by severity</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              {/* Range switch */}
              <div className="flex overflow-hidden rounded-[8px] border border-[var(--color-line)] dark:border-[#334155] text-[11px] font-medium">
                {(['1h', '24h', '7d'] as Range[]).map(r => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-2.5 py-1 transition-colors ${range === r
                      ? 'bg-[var(--color-brand-blue)] text-white'
                      : 'text-[var(--color-ink-500)] hover:bg-[var(--color-surface-fill)] dark:hover:bg-[#0F172A]'}`}>
                    {r}
                  </button>
                ))}
              </div>
              {/* Severity chips */}
              <div className="flex gap-1 flex-wrap">
                {(['ALL', 'INFO', 'WARN', 'ERROR', 'FATAL'] as SevFilter[]).map(s => {
                  const active = sev === s
                  const styles: Record<SevFilter, string> = {
                    ALL:   'bg-[#334155] text-white',
                    INFO:  'bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-slate-300',
                    WARN:  'bg-amber-50 text-[#D97706]',
                    ERROR: 'bg-red-50 text-[#DC2626]',
                    FATAL: 'bg-[#7F1D1D] text-white',
                  }
                  return (
                    <button key={s} onClick={() => setSev(s)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all ${
                        active
                          ? `${styles[s]} border-transparent`
                          : 'border-transparent text-[var(--color-ink-400)] hover:text-[var(--color-ink-500)]'
                      }`}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3">
            {[['Technical','#7C3AED'],['Functional','#2563EB'],['Business','#059669']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: c }} />
                <span className="text-[11px] text-[var(--color-ink-500)]">{l}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                {[
                  ['gT', '#7C3AED'],
                  ['gF', '#2563EB'],
                  ['gB', '#059669'],
                ].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={c} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF3" strokeOpacity={0.5} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="Technical"  stackId="1" stroke="#7C3AED" fill="url(#gT)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="Functional" stackId="1" stroke="#2563EB" fill="url(#gF)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="Business"   stackId="1" stroke="#059669" fill="url(#gB)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── MTTR gauge ──────────────────────────────────────────────────── */}
        <div className="rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white leading-tight">
                Mean Time to Root Cause
              </h2>
              <p className="text-[11px] text-[var(--color-ink-400)] mt-0.5">Framework headline SLA — target &lt;15 m</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EAF1FE] shrink-0">
              <Target className="h-4 w-4 text-[var(--color-brand-blue)]" />
            </span>
          </div>

          {/* Headline value */}
          <div className="flex items-end gap-2 mt-5 mb-1">
            <span className="text-[44px] font-extrabold leading-none text-[var(--color-ink-900)] dark:text-white tracking-tight">11m</span>
            <span className="text-[26px] font-bold leading-none text-[var(--color-ink-500)] pb-1">42s</span>
          </div>
          <span className="inline-flex self-start items-center gap-1 text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] rounded-full px-2 py-0.5 mb-4">
            <TrendingDown className="h-3 w-3" /> −27% vs last week
          </span>

          {/* Target gauge bar */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] text-[var(--color-ink-400)] mb-1.5">
              <span>0 m</span>
              <span className="font-semibold text-[var(--color-brand-blue)]">Target &lt; 15 m</span>
              <span>30 m</span>
            </div>
            {/* track */}
            <div className="relative h-3.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-visible">
              {/* half-way target marker */}
              <div className="absolute top-[-3px] bottom-[-3px] w-[2px] rounded-full bg-[var(--color-brand-blue)]/50 z-10" style={{ left: '50%' }} />
              {/* current: 11m42s / 30m ≈ 39% */}
              <div className="h-full rounded-full bg-[#16A34A] transition-all" style={{ width: '39%' }} />
            </div>
            <p className="text-[10px] text-[var(--color-ink-400)] mt-1.5 text-center">
              11 m 42 s of 30 m scale — within SLA
            </p>
          </div>

          {/* 7-day sparkline */}
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-400)] mb-1.5">
              7-day MTTR trend (min)
            </p>
            <ResponsiveContainer width="100%" height={70}>
              <LineChart data={MTTR_SPARK} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[8, 25]} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={15} stroke="#2F6BFF" strokeDasharray="4 2" strokeOpacity={0.5} />
                <Line
                  type="monotone" dataKey="m" name="MTTR"
                  stroke="#2F6BFF" strokeWidth={2}
                  dot={{ r: 2.5, fill: '#2F6BFF', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* P-tile row */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--color-line)] dark:border-[#334155]">
            {[['P50','8m 12s'],['P95','22m 05s'],['P99','31m 47s']].map(([l, v]) => (
              <div key={l} className="text-center">
                <p className="text-[9px] text-[var(--color-ink-400)] uppercase tracking-wide">{l}</p>
                <p className="text-[12px] font-semibold text-[var(--color-ink-700)] dark:text-slate-300 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      </MotionSection>

      <MotionSection delay={0.1}>
      {/* ── Row 3: Seam health map ───────────────────────────────────────── */}
      <div id="seams" className="scroll-mt-4 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 mb-4">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Seam Health Map</h2>
            <p className="text-[11px] text-[var(--color-ink-400)] mt-0.5">Architectural boundaries · events &amp; open errors today</p>
          </div>
          <Link href="/seams"
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-blue)] hover:underline shrink-0">
            Full map <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {seams.map(s => {
            const health = SEAM_HEALTH[s.health]
            return (
              <div key={s.id}
                className="rounded-[12px] border border-[var(--color-line)] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-[var(--color-ink-400)] shrink-0" />
                  <span className="text-[12px] font-semibold text-[var(--color-ink-900)] dark:text-white truncate">{s.seam}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${health.dot}`} />
                  <span className="text-[10px] font-medium text-[var(--color-ink-500)]">{health.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  {[
                    { label: 'Events', val: s.eventsToday },
                    { label: 'Open', val: s.openErrors },
                    { label: 'DLQ', val: s.dlqEvents },
                  ].map(stat => (
                    <div key={stat.label}>
                      <p className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white tabular-nums">{stat.val}</p>
                      <p className="text-[9px] text-[var(--color-ink-400)]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      </MotionSection>

      <MotionSection delay={0.12}>
      {/* ── Row 4: AI agent status ───────────────────────────────────────── */}
      <div id="agents" className="scroll-mt-4 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)] dark:border-[#334155]">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">AI Agent Status</h2>
            <p className="text-[11px] text-[var(--color-ink-400)]">Recent skill runs · healing budget &amp; escalation</p>
          </div>
          <Link href="/agents"
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-blue)] hover:underline shrink-0">
            All runs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-[var(--color-line)] dark:divide-[#334155]">
          {agentRuns.slice(0, 5).map(run => {
            const status = AGENT_STATUS[run.status]
            return (
              <div key={run.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#EAF1FE] dark:bg-[#1a2744] shrink-0">
                  <Bot className="h-3.5 w-3.5 text-[var(--color-brand-blue)]" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--color-ink-900)] dark:text-white truncate">{run.agent}</p>
                  <p className="text-[10px] text-[var(--color-ink-400)] truncate">{run.skill} · {run.tenant}</p>
                </div>
                <span className="text-[10px] font-semibold rounded-md px-2 py-0.5 shrink-0"
                  style={{ color: status.color, backgroundColor: `${status.color}14` }}>
                  {status.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      </MotionSection>

      <MotionSection delay={0.14}>
      {/* ── Row 5: Top error codes + Open incidents ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Top error codes */}
        <div className="lg:col-span-3 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)] dark:border-[#334155]">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Top Error Codes</h2>
              <p className="text-[11px] text-[var(--color-ink-400)]">By event frequency · last 24 h</p>
            </div>
            <Link href="/registry"
              className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-blue)] hover:underline">
              Registry <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                  {['CODE', 'CLASS', 'COUNT', 'TREND', 'OWNER', ''].map(h => (
                    <th key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--color-ink-500)] uppercase tracking-[0.05em] border-b border-[var(--color-line)] dark:border-[#334155] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCodes.map(r => (
                  <tr key={r.errorCode}
                    className="border-b border-[var(--color-line)] dark:border-[#334155] last:border-0 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-[var(--color-brand-blue)]">
                        {r.errorCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <ErrorClassPill value={r.errorClass} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-semibold text-[var(--color-ink-900)] dark:text-white">{r.eventCount}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <TrendIcon t={CODE_TRENDS[r.errorCode] ?? 'flat'} />
                    </td>
                    <td className="px-4 py-2.5 max-w-[120px]">
                      <span className="block truncate text-[11px] text-[var(--color-ink-500)]">{r.owner}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link href={`/errors?code=${r.errorCode}`}
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-brand-blue)] hover:underline">
                        view <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open incidents */}
        <div className="lg:col-span-2 rounded-[14px] border border-[var(--color-line)] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)] dark:border-[#334155]">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Open Incidents</h2>
              <p className="text-[11px] text-[var(--color-ink-400)]">FATAL &amp; ERROR · unresolved</p>
            </div>
            <Link href="/errors?status=open"
              className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-blue)] hover:underline">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-[var(--color-line)] dark:divide-[#334155] flex-1">
            {openIncidents.map(inc => {
              const isFatal = inc.severity === 'FATAL'
              return (
                <div key={inc.id}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors cursor-default">
                  {/* sev indicator with optional paging bell */}
                  <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-[6px] shrink-0 ${
                    isFatal ? 'bg-[#7F1D1D]' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    {inc.paging
                      ? <BellRing className={`h-3.5 w-3.5 ${isFatal ? 'text-white' : 'text-[#DC2626]'}`} />
                      : <SeverityPill value={inc.severity} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="font-mono text-[10px] font-semibold text-[var(--color-brand-blue)]">
                        {inc.correlationId}
                      </span>
                      {inc.paging && (
                        <span className="text-[9px] font-bold text-white bg-[#DC2626] rounded-full px-1.5 py-0.5 leading-none">
                          PAGING
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-[var(--color-ink-700)] dark:text-slate-300 leading-snug line-clamp-1">
                      {inc.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-ink-400)]">
                      <span className="truncate max-w-[110px]">{inc.tenant}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap font-medium">{inc.ageMins}m ago</span>
                      <span>·</span>
                      <span className="truncate max-w-[80px]">{inc.seam}</span>
                    </div>
                  </div>
                  <SeverityPill value={inc.severity} />
                </div>
              )
            })}
          </div>

          {/* On-call footer */}
          <div className="px-5 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-[var(--color-line)] dark:border-[#334155]">
            <p className="text-[10px] text-[var(--color-ink-400)]">
              On-call:{' '}
              <span className="font-semibold text-[var(--color-ink-700)] dark:text-slate-300">Jhansi M</span>
              &nbsp;·&nbsp;
              <span className="font-semibold text-[var(--color-ink-700)] dark:text-slate-300">Ops Team</span>
              &nbsp;·&nbsp;PagerDuty active
            </p>
          </div>
        </div>

      </div>
      </MotionSection>
    </AppShell>
  )
}
