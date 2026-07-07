'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PAGE_SIZES, buildPageNumbers } from '@/lib/use-pagination'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  perPage: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  onPerPageChange: (size: number) => void
  pageSizes?: readonly number[]
  className?: string
  showPageSize?: boolean
}

export function Pagination({
  page,
  pageCount,
  total,
  perPage,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPerPageChange,
  pageSizes = PAGE_SIZES,
  className,
  showPageSize = true,
}: PaginationProps) {
  const pageNumbers = buildPageNumbers(page, pageCount)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3',
        'border-t border-[#E9EDF3] dark:border-[#334155] bg-[#FAFBFF] dark:bg-[#0F172A]/40',
        className,
      )}
    >
      {showPageSize && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748B] dark:text-slate-400">Show</span>
          <select
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
            className="rounded-[7px] border border-[#E9EDF3] dark:border-[#334155] bg-white dark:bg-[#1E293B] px-2 py-0.5 text-[11px] text-[#334155] dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#2F6BFF]"
          >
            {pageSizes.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-[11px] text-[#64748B] dark:text-slate-400">entries</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.span
          key={`${rangeStart}-${rangeEnd}-${total}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="text-[11px] text-[#64748B] dark:text-slate-400 order-first sm:order-none"
        >
          Showing {total === 0 ? 0 : rangeStart}–{rangeEnd} of {total} entries
        </motion.span>
      </AnimatePresence>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-[6px] border border-[#E9EDF3] dark:border-[#334155] text-[#64748B] disabled:opacity-30 hover:bg-[#EAF1FE] dark:hover:bg-[#1E3A5F] hover:text-[#2F6BFF] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-7 w-7 items-center justify-center text-[12px] text-[#94A3B8]"
            >
              …
            </span>
          ) : (
            <motion.button
              key={p}
              layout
              onClick={() => onPageChange(p as number)}
              whileTap={{ scale: 0.94 }}
              className={cn(
                'flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors',
                p === page
                  ? 'bg-[#2F6BFF] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-slate-400 hover:bg-[#EAF1FE] dark:hover:bg-[#1E3A5F] hover:text-[#2F6BFF]',
              )}
            >
              {p}
            </motion.button>
          ),
        )}

        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded-[6px] border border-[#E9EDF3] dark:border-[#334155] text-[#64748B] disabled:opacity-30 hover:bg-[#EAF1FE] dark:hover:bg-[#1E3A5F] hover:text-[#2F6BFF] transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
