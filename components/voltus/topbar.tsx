'use client'

import {
  Link2, CheckSquare, Palette, Activity, Bell, Maximize2,
  Sparkles, Sun, Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#E9EDF3] bg-white/95 dark:bg-[#1E293B]/95 dark:border-[#334155] backdrop-blur-sm px-4 md:left-[240px]">
      {/* Left — module title */}
      <div className="flex items-center gap-3 pl-10 md:pl-0">
        <div>
          <h1 className="text-[18px] font-semibold leading-tight text-[#1E293B] dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-[#94A3B8] leading-none mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {/* AI toggle */}
        <button className="hidden sm:flex items-center gap-1 rounded-full bg-[#EAF1FE] dark:bg-[#1E3A5F] px-3 py-1.5 text-[12px] font-semibold text-[#2F6BFF] dark:text-[#93C5FD] hover:bg-[#2F6BFF] hover:text-white transition-colors">
          <Sparkles className="h-3 w-3" />
          <span>Ai</span>
        </button>

        {/* Icon cluster */}
        <div className="flex items-center gap-1">
          <IconBtn icon={Link2} label="Copy link" />
          <IconBtn icon={CheckSquare} label="Tasks" />
          <IconBtn icon={Palette} label="Theme editor" />
          <IconBtn icon={Activity} label="Activity" />

          {/* Bell with badge */}
          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#DC2626]" />
            <span className="sr-only">Notifications</span>
          </button>

          <IconBtn icon={Maximize2} label="Fullscreen" />

          {/* Dark mode toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF1FE] dark:bg-[#1E3A5F] text-[#2F6BFF] dark:text-[#93C5FD] text-[12px] font-semibold hover:ring-2 hover:ring-[#2F6BFF]/40 transition-all">
          JM
        </button>
      </div>
    </header>
  )
}

function IconBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition-colors"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
