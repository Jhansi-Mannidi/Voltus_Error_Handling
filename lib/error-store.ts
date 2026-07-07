import type { ErrorEnvelope } from '@/mock'

const STORAGE_KEY = 'voltus-raised-errors'

export function getRaisedErrors(): ErrorEnvelope[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ErrorEnvelope[]) : []
  } catch {
    return []
  }
}

export function addRaisedError(envelope: ErrorEnvelope) {
  if (typeof window === 'undefined') return
  const existing = getRaisedErrors()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([envelope, ...existing]))
}

export function getNextErrorSno(baseCount: number): number {
  const raised = getRaisedErrors()
  const maxRaised = raised.reduce((m, e) => Math.max(m, e.sno), 0)
  return Math.max(baseCount, maxRaised) + 1
}
