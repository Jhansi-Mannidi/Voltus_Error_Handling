'use client'

import { Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { RaiseErrorForm, type RaiseSourceMode } from '@/components/voltus/raise-error-form'
import { addRaisedError, getNextErrorSno } from '@/lib/error-store'
import { errors as ALL_ERRORS } from '@/mock'

function RaiseErrorPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') as RaiseSourceMode | null) ?? 'manual'
  const nextSno = useMemo(() => getNextErrorSno(ALL_ERRORS.length), [])

  function handleRaised(envelope: Parameters<typeof addRaisedError>[0]) {
    addRaisedError(envelope)
  }

  function handleViewDetail(envelope: Parameters<typeof addRaisedError>[0]) {
    addRaisedError(envelope)
    router.push(`/errors?code=${encodeURIComponent(envelope.errorCode)}`)
  }

  return (
    <RaiseErrorForm
      layout="page"
      initialMode={mode}
      nextSno={nextSno}
      cancelHref="/errors"
      onRaised={handleRaised}
      onViewDetail={handleViewDetail}
    />
  )
}

export default function RaiseErrorPage() {
  return (
    <AppShell breadcrumbs={[
      { label: 'VoltusFreight', href: '/overview' },
      { label: 'Errors', href: '/errors' },
      { label: 'Raise Error' },
    ]}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-24 text-[#64748B] text-sm">Loading…</div>
      }>
        <RaiseErrorPageContent />
      </Suspense>
    </AppShell>
  )
}
