'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import {
  Settings, Shield, Bell, Database, Key, RefreshCw,
  CheckCircle2, Save, AlertTriangle, Globe, Zap, Clock,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'general' | 'notifications' | 'integrations' | 'security' | 'retention'

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>}>
      <SettingsPageContent />
    </Suspense>
  )
}

function SettingsPageContent() {
  const urlParams = useSearchParams()
  const [tab, setTab]     = useState<Tab>('general')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const tabParam = urlParams.get('tab')
    if (tabParam === 'logging') setTab('integrations')
    else if (tabParam === 'api-keys') setTab('security')
    else if (!tabParam) setTab('general')
  }, [urlParams])

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'general',       label: 'General',       icon: Settings  },
    { id: 'notifications', label: 'Notifications',  icon: Bell      },
    { id: 'integrations',  label: 'Integrations',  icon: Zap       },
    { id: 'security',      label: 'Security',      icon: Shield    },
    { id: 'retention',     label: 'Retention',     icon: Database  },
  ]

  return (
    <AppShell>
      <div className="w-full min-w-0 max-w-full">

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-[12px] bg-[var(--color-surface-fill)] dark:bg-slate-800 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-700 text-[var(--color-ink-900)] dark:text-white shadow-sm'
                  : 'text-[var(--color-ink-500)] dark:text-slate-400 hover:text-[var(--color-ink-900)] dark:hover:text-white'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className="rounded-[14px] border border-[var(--color-line)] dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">

          {/* General */}
          {tab === 'general' && (
            <div className="divide-y divide-[var(--color-line)] dark:divide-slate-700">
              <div className="px-6 py-4 bg-[var(--color-surface-alt)] dark:bg-slate-700/30">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Platform Configuration</h3>
                <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">Global settings for the Voltus Error Console.</p>
              </div>
              {([ 
                { label: 'Console Name',       desc: 'Display name shown in the topbar',            type: 'text'   as const, value: 'Voltus Error & Observability Console'  },
                { label: 'Platform Region',    desc: 'Primary deployment region',                   type: 'select' as const, value: 'Middle East — UAE (me-central-1)'       },
                { label: 'Default Time Zone',  desc: 'Timestamps shown across all screens',         type: 'select' as const, value: 'Asia/Dubai (GST, UTC+4)'                },
                { label: 'Page Size',          desc: 'Default rows per table page',                 type: 'select' as const, value: '20 rows'                                },
                { label: 'Error Class Colors', desc: 'Only disable for accessibility overrides',    type: 'toggle' as const, value: true                                     },
                { label: 'Auto-Refresh',       desc: 'Live stream polling interval (seconds)',      type: 'number' as const, value: '30'                                     },
              ]).map(f => (
                <SettingRow key={f.label} {...f} />
              ))}
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <div className="divide-y divide-[var(--color-line)] dark:divide-slate-700">
              <div className="px-6 py-4 bg-[var(--color-surface-alt)] dark:bg-slate-700/30">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Alert & Notification Channels</h3>
                <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">Configure where error alerts are delivered.</p>
              </div>
              {([
                { label: 'PagerDuty Integration Key', desc: 'Routing key from PagerDuty service',  type: 'password' as const, value: 'pd_rk_●●●●●●●●●●●●' },
                { label: 'Slack Webhook URL',          desc: '#voltus-errors channel webhook',      type: 'password' as const, value: 'https://hooks.slack.com/●●●' },
                { label: 'Email Digest Recipients',    desc: 'Comma-separated ops team addresses',  type: 'text'     as const, value: 'ops@voltusfreight.com, cto@voltusfreight.com' },
                { label: 'FATAL Alert Threshold',      desc: 'Trigger on N FATAL errors in 5 min',  type: 'number'   as const, value: '1' },
                { label: 'DLQ Overflow Alert',         desc: 'Notify when DLQ exceeds N items',     type: 'number'   as const, value: '50' },
                { label: 'SLA Breach Notification',    desc: 'Alert when error SLA is breached',    type: 'toggle'   as const, value: true },
              ]).map(f => (
                <SettingRow key={f.label} {...f} />
              ))}
            </div>
          )}

          {/* Integrations */}
          {tab === 'integrations' && (
            <div className="divide-y divide-[var(--color-line)] dark:divide-slate-700">
              <div className="px-6 py-4 bg-[var(--color-surface-alt)] dark:bg-slate-700/30">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">External Integrations</h3>
                <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">Connect the console to VoltusFreight platform services.</p>
              </div>
              {[
                { name: 'VoltusFreight Core API',    status: 'connected',    endpoint: 'https://api.voltusfreight.com/v3'          },
                { name: 'OpenTelemetry Collector',   status: 'connected',    endpoint: 'http://otel-collector:4317'                 },
                { name: 'Kafka Event Bus',            status: 'connected',    endpoint: 'kafka://broker.voltus.internal:9092'        },
                { name: 'Redis DLQ Store',            status: 'connected',    endpoint: 'redis://dlq.voltus.internal:6379'           },
                { name: 'Sentry (Supplemental)',      status: 'disconnected', endpoint: 'https://sentry.io/api/0/projects/voltus/'   },
                { name: 'Datadog APM',                status: 'warning',      endpoint: 'https://api.datadoghq.com — key expires 3d' },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface-alt)] dark:hover:bg-slate-700/30 transition-colors">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-ink-900)] dark:text-white">{int.name}</p>
                    <p className="text-[11px] font-mono text-[var(--color-ink-400)] mt-0.5">{int.endpoint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      int.status === 'connected'    ? 'bg-[#F0FDF4] text-[#16A34A]' :
                      int.status === 'warning'      ? 'bg-[#FFFBEB] text-[#D97706]' :
                                                      'bg-[#F1F5F9] text-[#64748B]'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        int.status === 'connected' ? 'bg-[#16A34A]' : int.status === 'warning' ? 'bg-[#D97706]' : 'bg-[#94A3B8]'
                      }`} />
                      {int.status.charAt(0).toUpperCase() + int.status.slice(1)}
                    </span>
                    <button className="text-[12px] font-medium text-[#2F6BFF] hover:underline">
                      {int.status === 'disconnected' ? 'Connect' : 'Test'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security */}
          {tab === 'security' && (
            <div className="divide-y divide-[var(--color-line)] dark:divide-slate-700">
              <div className="px-6 py-4 bg-[var(--color-surface-alt)] dark:bg-slate-700/30">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Security & Access Control</h3>
                <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">PII masking, RBAC, and audit settings.</p>
              </div>
              {([
                { label: 'Global PII Redaction',  desc: 'Mask email, phone, NIC numbers in all log output', type: 'toggle' as const, value: true  },
                { label: 'Audit Log Retention',   desc: 'Days to retain DLQ triage audit records',          type: 'number' as const, value: '365' },
                { label: 'RBAC Enforcement',      desc: 'Require roles for screen access',                  type: 'toggle' as const, value: true  },
                { label: 'API Rate Limit',        desc: 'Max requests per minute per tenant',               type: 'number' as const, value: '500' },
                { label: 'Session Timeout',       desc: 'Auto-logout after inactivity (minutes)',           type: 'number' as const, value: '60'  },
                { label: 'Two-Factor Required',   desc: 'Enforce 2FA for all console operators',            type: 'toggle' as const, value: true  },
              ]).map(f => (
                <SettingRow key={f.label} {...f} />
              ))}
            </div>
          )}

          {/* Retention */}
          {tab === 'retention' && (
            <div className="divide-y divide-[var(--color-line)] dark:divide-slate-700">
              <div className="px-6 py-4 bg-[var(--color-surface-alt)] dark:bg-slate-700/30">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink-900)] dark:text-white">Data Retention Policies</h3>
                <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">TTL settings for error logs, DLQ items, and audit records.</p>
              </div>
              {([
                { label: 'Error Log TTL',           desc: 'Days to keep error_log entries',              type: 'number' as const, value: '90'  },
                { label: 'DLQ Item TTL',            desc: 'Days before unresolved DLQ items are purged', type: 'number' as const, value: '30'  },
                { label: 'Resolved Event TTL',      desc: 'Days to retain resolved error envelopes',     type: 'number' as const, value: '180' },
                { label: 'Log Level Elevation TTL', desc: 'Max hours for runtime level elevation',       type: 'number' as const, value: '4'   },
                { label: 'Audit Record TTL',        desc: 'Months to retain DLQ triage audit logs',      type: 'number' as const, value: '24'  },
                { label: 'Archive to Cold Store',   desc: 'Move expired records to object storage',      type: 'toggle' as const, value: true  },
              ]).map(f => (
                <SettingRow key={f.label} {...f} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-line)] dark:border-slate-700 bg-[var(--color-surface-alt)] dark:bg-slate-700/20">
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-500)] hover:text-[#DC2626] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-[10px] bg-[#2F6BFF] hover:bg-[#1E4FD6] text-white px-5 py-2 text-[13px] font-semibold transition-colors"
            >
              {saved
                ? <><CheckCircle2 className="h-4 w-4" /> Saved</>
                : <><Save className="h-4 w-4" /> Save Changes</>
              }
            </button>
          </div>
        </div>

        {/* Danger zone — full width of main body */}
        <div className="mt-6 w-full rounded-[14px] border border-border bg-card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-border bg-muted/30">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14px] font-semibold text-foreground">Danger Zone</h4>
                <p className="text-[12px] text-muted-foreground mt-0.5 max-w-3xl">
                  These actions are irreversible. All error records, audit logs, and tenant configurations will be permanently deleted.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
            <p className="text-[11px] text-muted-foreground">
              Requires operator confirmation and is recorded in the audit trail.
            </p>
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <button className="rounded-[8px] border border-border text-foreground px-4 py-2 text-[12px] font-semibold hover:bg-muted transition-colors">
                Purge All DLQ Items
              </button>
              <button className="rounded-[8px] border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 text-[12px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                Reset Error Registry
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}

// ─── Setting Row ─────────────────────────────────────────────────────────────

function SettingRow({
  label, desc, type, value,
}: {
  label: string
  desc:  string
  type:  'text' | 'select' | 'number' | 'password' | 'toggle'
  value: string | boolean
}) {
  const [val, setVal] = useState(value)

  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4 hover:bg-[var(--color-surface-alt)] dark:hover:bg-slate-700/20 transition-colors">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--color-ink-900)] dark:text-white">{label}</p>
        <p className="text-[11px] text-[var(--color-ink-500)] mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">
        {type === 'toggle' ? (
          <button
            onClick={() => setVal(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6BFF] ${val ? 'bg-[#2F6BFF]' : 'bg-[#E9EDF3] dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        ) : (
          <input
            type={type === 'password' ? 'password' : type === 'number' ? 'number' : 'text'}
            value={val as string}
            onChange={e => setVal(e.target.value)}
            className="w-56 rounded-[8px] border border-[var(--color-line)] dark:border-slate-600 bg-[var(--color-surface-fill)] dark:bg-slate-700 px-3 py-1.5 text-[13px] text-[var(--color-ink-900)] dark:text-white placeholder:text-[var(--color-ink-400)] outline-none focus:ring-2 focus:ring-[#2F6BFF]/40 focus:border-[#2F6BFF] transition-all"
          />
        )}
      </div>
    </div>
  )
}
