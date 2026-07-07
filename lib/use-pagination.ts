'use client'

import { useEffect, useMemo, useState } from 'react'

export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export function buildPageNumbers(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pageCount]
  if (page >= pageCount - 3) {
    return [1, '…', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
  }
  return [1, '…', page - 1, page, page + 1, '…', pageCount]
}

interface UsePaginationOptions {
  pageSize?: number
  pageSizes?: readonly number[]
  resetDeps?: unknown[]
}

export function usePagination<T>(items: T[], options?: UsePaginationOptions) {
  const pageSizes = options?.pageSizes ?? PAGE_SIZES
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(options?.pageSize ?? pageSizes[0])
  const resetDeps = options?.resetDeps ?? []

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  useEffect(() => {
    setPage(1)
  }, [total, perPage, ...resetDeps])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const paged = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage],
  )

  const pageNumbers = useMemo(() => buildPageNumbers(page, pageCount), [page, pageCount])
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, total)

  function handlePerPageChange(next: number) {
    setPerPage(next)
    setPage(1)
  }

  return {
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
    paged,
    total,
    pageCount,
    pageNumbers,
    rangeStart,
    rangeEnd,
    pageSizes,
  }
}
