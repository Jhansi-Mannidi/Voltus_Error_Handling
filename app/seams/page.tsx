'use client'

import { useState } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { SeverityPill, LifecyclePill, ErrorClassPill } from '@/components/voltus/status-pill'
import { AvatarChip } from '@/components/voltus/avatar-chip'
import {
  Shield, AlertTriangle, CheckCircle2, Inbox, Activity,
  ChevronDown, ChevronRight, ExternalLink, Layers, Wifi,
  Database, Server, Bot, Globe,
} from 'lucide-react'
import { MotionSection, MotionList, MotionItem, MotionKpiGrid } from '@/components/voltus/motion'
import { seams, errorEvents, type SeamEntry, type SeamName } from '@/lib/data'

const seamIcon: Record<SeamName, React.ElementType> = {
  'API Gateway':        Globe,
  'Service Boundary':   Layers,
  'Repository':         Database,
  'External Adapter':   Wifi,
  'AI Skill':           Bot,
}

const seamColor: Record<SeamName, { accent: string; bg: string; border: string }> = {
  'API Gateway':       { accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'Service Boundary':  { accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'Repository':        { accent: '#2563EB', bg: '#E8F0FE', border: '#BFDBFE' },
  'External Adapter':  { accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'AI Skill':          { accent: '#7C3AED', bg: '#F3EEFF', border: '#DDD6FE' },
}

export default function SeamsPage() {
  const [expanded, setExpanded] = useState<string | null>('seam-001')

  const eventsForSeam = (seam: SeamName) =>
    errorEvents.filter(e => e.seam === seam)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

  const totalEvents = seams.reduce((s, x) => s + x.eventsToday, 0)
  const criticalSeams = seams.filter(s => s.health === 'critical').length
  const openErrors = seams.reduce((s, x) => s + x.openErrors, 0)
  const dlqTotal = seams.reduce((s, x) => s + x.dlqEvents, 0)

  return (
    <AppShell>

      {/* KPI strip */}
      <MotionKpiGrid className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Events Today', value: totalEvents, icon: AlertTriangle, accent: '#2F6BFF', bg: '#EAF1FE' },
          { label: 'Critical Seams', value: criticalSeams, icon: Shield, accent: '#DC2626', bg: '#FEF2F2' },
          { label: 'Open Errors', value: openErrors, icon: Activity, accent: '#D97706', bg: '#FFFBEB' },
          { label: 'In DLQ', value: dlqTotal, icon: Inbox, accent: '#7F1D1D', bg: '#FEF2F2' },
        ].map(k => (
          <div key={k.label} className="relative flex flex-col gap-1.5 rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-4">
            <span className="absolute top-0 left-3 right-3 h-[3px] rounded-b-full" style={{ backgroundColor: k.accent }} />
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{k.label}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: k.bg }}>
                <k.icon className="h-3 w-3" style={{ color: k.accent }} />
              </span>
            </div>
            <span className="text-[28px] font-bold leading-none text-[#1E293B] dark:text-white">{k.value}</span>
          </div>
        ))}
      </MotionKpiGrid>

      <MotionSection delay={0.05}>
      {/* Architecture diagram strip */}
      <div className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] p-5 mb-5">
        <h3 className="text-[13px] font-semibold text-[#1E293B] dark:text-white mb-4">Exception Flow Architecture</h3>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {seams.map((s, idx) => {
            const Icon = seamIcon[s.seam]
            const c = seamColor[s.seam]
            const isLast = idx === seams.length - 1
            return (
              <div key={s.id} className="flex items-center gap-0 shrink-0">
                <button
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="flex flex-col items-center gap-1.5 rounded-[12px] border-2 px-4 py-3 min-w-[110px] transition-all hover:scale-105"
                  style={{
                    borderColor: expanded === s.id ? c.accent : c.border,
                    backgroundColor: expanded === s.id ? c.bg : 'transparent',
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: c.bg }}>
                    <Icon className="h-4 w-4" style={{ color: c.accent }} />
                  </span>
                  <span className="text-[10px] font-semibold text-[#334155] dark:text-slate-300 text-center leading-tight">{s.seam}</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
                      backgroundColor: s.health === 'critical' ? '#DC2626' : s.health === 'degraded' ? '#D97706' : '#16A34A'
                    }} />
                    <span className="text-[9px] capitalize" style={{
                      color: s.health === 'critical' ? '#DC2626' : s.health === 'degraded' ? '#D97706' : '#16A34A'
                    }}>{s.health}</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">{s.eventsToday} events</span>
                </button>
                {!isLast && (
                  <div className="flex items-center px-1">
                    <div className="h-px w-6 bg-[#E9EDF3] dark:bg-[#334155]" />
                    <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Seam accordion list */}
      <div className="space-y-3">
        {seams.map(s => {
          const Icon = seamIcon[s.seam]
          const c = seamColor[s.seam]
          const isOpen = expanded === s.id
          const seamEvts = eventsForSeam(s.seam)

          return (
            <div key={s.id} className="rounded-[14px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors"
                onClick={() => setExpanded(isOpen ? null : s.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: c.bg }}>
                    <Icon className="h-4.5 w-4.5" style={{ color: c.accent }} />
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1E293B] dark:text-white">{s.seam}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                        style={{
                          backgroundColor: s.health === 'critical' ? '#FEF2F2' : s.health === 'degraded' ? '#FFFBEB' : '#F0FDF4',
                          color: s.health === 'critical' ? '#DC2626' : s.health === 'degraded' ? '#D97706' : '#16A34A',
                        }}>
                        {s.health}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 text-left max-w-[500px] leading-snug mt-0.5">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="hidden sm:flex items-center gap-3 text-[11px]">
                    <span className="text-[#64748B]">{s.eventsToday} today</span>
                    {s.openErrors > 0 && <span className="font-semibold text-[#D97706]">{s.openErrors} open</span>}
                    {s.dlqEvents  > 0 && <span className="font-semibold text-[#DC2626]">{s.dlqEvents} DLQ</span>}
                    <span className="text-[#94A3B8]">{s.services.length} svc</span>
                  </div>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-[#94A3B8] shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-[#94A3B8] shrink-0" />
                  }
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-[#E9EDF3] dark:border-[#334155]">
                  {/* Services */}
                  <div className="px-5 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
                    <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2 block">Monitored Services</span>
                    <div className="flex flex-wrap gap-2">
                      {s.services.map(svc => (
                        <span key={svc} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{ backgroundColor: c.bg, color: c.accent }}>
                          <Server className="h-2.5 w-2.5" />
                          {svc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Events table */}
                  {seamEvts.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#94A3B8]">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                      No events at this seam today
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]">
                            {['#', 'CODE', 'SEV', 'STATUS', 'CLASS', 'SERVICE / OPERATION', 'TENANT', 'TIME'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.04em] border-b border-[#E9EDF3] dark:border-[#334155] whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seamEvts.map(evt => (
                            <tr key={evt.id} className="border-b border-[#E9EDF3] dark:border-[#334155] last:border-0 hover:bg-[#F9FBFF] dark:hover:bg-[#1a2744] transition-colors">
                              <td className="px-3 py-2.5 text-[10px] text-[#94A3B8]">{evt.sno}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="font-mono text-[10px] font-semibold text-[#2F6BFF]">{evt.errorCode}</span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><SeverityPill value={evt.severity} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><LifecyclePill value={evt.status} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap"><ErrorClassPill value={evt.errorClass} /></td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="font-medium text-[#1E293B] dark:text-white">{evt.service}</div>
                                <div className="text-[9px] text-[#94A3B8] font-mono">{evt.operation}</div>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-[#64748B] dark:text-slate-400 max-w-[110px] truncate">{evt.tenant}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[#94A3B8]">
                                {new Date(evt.occurredAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </MotionSection>
    </AppShell>
  )
}