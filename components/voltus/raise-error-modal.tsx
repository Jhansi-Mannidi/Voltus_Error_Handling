'use client'

import { useEffect } from 'react'
import type { ErrorEnvelope } from '@/mock'
import { RaiseErrorForm, type RaiseSourceMode } from './raise-error-form'

export interface RaiseErrorModalProps {
  open:         boolean
  onClose:      () => void
  onRaised:     (envelope: ErrorEnvelope) => void
  onViewDetail?: (envelope: ErrorEnvelope) => void
  initialMode?: RaiseSourceMode
  nextSno:      number
}

export function RaiseErrorModal({
  open,
  onClose,
  onRaised,
  onViewDetail,
  initialMode,
  nextSno,
}: RaiseErrorModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <RaiseErrorForm
        layout="modal"
        initialMode={initialMode}
        nextSno={nextSno}
        onCancel={onClose}
        onRaised={onRaised}
        onViewDetail={envelope => {
          onViewDetail?.(envelope)
          onClose()
        }}
      />
    </div>
  )
}
