import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-[#EAF1FE] text-[#2F6BFF]',
  'bg-[#F3EEFF] text-[#7C3AED]',
  'bg-[#E7F6F0] text-[#059669]',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
]

function colorFor(initials: string) {
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  return PALETTE[code % PALETTE.length]
}

export function AvatarChip({
  initials,
  name,
  size = 'sm',
}: {
  initials: string
  name?: string
  size?: 'sm' | 'md'
}) {
  const sz = size === 'md' ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[11px]'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold shrink-0',
          sz,
          colorFor(initials),
        )}
      >
        {initials}
      </span>
      {name && <span className="text-[13px] text-[#334155] dark:text-slate-300">{name}</span>}
    </span>
  )
}
