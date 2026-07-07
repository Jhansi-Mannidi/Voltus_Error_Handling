import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  subLabel?: string
  icon: LucideIcon
  accentColor: string
  accentBg: string
  active?: boolean
  onClick?: () => void
}

export function KPICard({
  label,
  value,
  subLabel,
  icon: Icon,
  accentColor,
  accentBg,
  active,
  onClick,
}: KPICardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-2 rounded-[14px] border border-[#E9EDF3] bg-[#FFFFFF] dark:bg-[#1E293B] dark:border-[#334155] p-4 text-left transition-all w-full',
        'hover:shadow-md hover:-translate-y-0.5',
        active && 'ring-2 ring-[#2F6BFF] shadow-md',
      )}
    >
      {/* top accent bar */}
      <span
        className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start justify-between mt-1">
        <span className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: accentBg }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </span>
      </div>
      <span className="text-[28px] font-bold leading-none text-[#1E293B] dark:text-white">
        {value}
      </span>
      {subLabel && (
        <span className="text-[12px] text-[#94A3B8]">{subLabel}</span>
      )}
    </button>
  )
}
