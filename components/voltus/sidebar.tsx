'use client'

import { cn } from '@/lib/utils'
import {
  AlertTriangle, ScrollText, Hash, RefreshCw, BellRing,
  Building2, Settings, ChevronRight, BarChart3, Home, Search,
  Bot, Layers, Menu, X
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { icon: Home,          label: 'Dashboard',      href: '/' },
  { icon: AlertTriangle, label: 'Error Event Log', href: '/errors',     badge: 8  },
  { icon: Layers,        label: 'Catch Seams',    href: '/seams',      badge: 2  },
  { icon: RefreshCw,     label: 'Retry & DLQ',    href: '/retry',      badge: 3  },
  { icon: Bot,           label: 'AI Agent Errors',href: '/ai-agents',  badge: 4  },
  { icon: Hash,          label: 'Error Registry', href: '/registry' },
  { icon: ScrollText,    label: 'Log Viewer',     href: '/logs' },
  { icon: BellRing,      label: 'Alert Rules',    href: '/alerts' },
  { icon: Building2,     label: 'Tenant Console', href: '/tenants' },
  { icon: BarChart3,     label: 'Analytics',      href: '/analytics' },
  { icon: Settings,      label: 'Settings',       href: '/settings' },
]

interface SidebarProps {
  active?: string
}

export function Sidebar({ active = '/errors' }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-[#E9EDF3] bg-white shadow-sm dark:bg-[#1E293B] dark:border-[#334155] md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4 text-[#334155] dark:text-slate-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full w-[240px] flex-col border-r border-[#E9EDF3] bg-white dark:bg-[#1E293B] dark:border-[#334155] transition-transform duration-200',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 shrink-0 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div>
            <div className="text-[15px] font-bold leading-none">
              <span className="text-[#1E293B] dark:text-white">VOLTUS</span>
              <span className="text-[#2F6BFF]">FREIGHT</span>
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 tracking-wide">AI-Native ERP</div>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4 text-[#64748B]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#E9EDF3] dark:border-[#334155]">
          <div className="flex items-center gap-2 rounded-[10px] bg-[#F1F5F9] dark:bg-[#334155] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
            <input
              className="w-full bg-transparent text-[13px] text-[#334155] dark:text-slate-300 placeholder:text-[#94A3B8] outline-none"
              placeholder="Search modules…"
            />
          </div>
        </div>

        {/* Module label */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
            Error Framework
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {navItems.map((item) => {
            const isActive = active === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors group',
                  isActive
                    ? 'bg-[#EAF1FE] text-[#2F6BFF] dark:bg-[#1E3A5F] dark:text-[#93C5FD]'
                    : 'text-[#475569] dark:text-slate-400 hover:bg-[#F7F8FA] dark:hover:bg-[#334155] hover:text-[#1E293B] dark:hover:text-white',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 h-6 w-1 rounded-r-full bg-[#2F6BFF]" />
                )}
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#2F6BFF]' : 'text-[#94A3B8] group-hover:text-[#64748B]')} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    isActive ? 'bg-[#2F6BFF] text-white' : 'bg-[#F1F5F9] dark:bg-[#334155] text-[#64748B] dark:text-slate-400',
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom user */}
        <div className="border-t border-[#E9EDF3] dark:border-[#334155] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF1FE] text-[#2F6BFF] text-[12px] font-semibold shrink-0">
              JM
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#1E293B] dark:text-white truncate">Jhansi M</div>
              <div className="text-[11px] text-[#94A3B8] truncate">Platform Ops Lead</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
          </div>
        </div>
      </aside>
    </>
  )
}
