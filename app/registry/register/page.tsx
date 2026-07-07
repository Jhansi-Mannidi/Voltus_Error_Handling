'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { RegisterCodeForm } from '@/components/voltus/register-code-form'
import { addRegistryEntry, buildRegistryEntry, getRegistryEntries } from '@/lib/registry-store'

export default function RegisterCodePage() {
  const router = useRouter()
  const allEntries = useMemo(() => getRegistryEntries(), [])

  function handleSave(data: Parameters<typeof buildRegistryEntry>[0]) {
    const entry = buildRegistryEntry(data, allEntries)
    addRegistryEntry(entry)
    router.push('/registry')
  }

  return (
    <AppShell breadcrumbs={[
      { label: 'VoltusFreight', href: '/overview' },
      { label: 'Registry', href: '/registry' },
      { label: 'Register New Code' },
    ]}>
      <RegisterCodeForm
        allEntries={allEntries}
        onSave={handleSave}
        cancelHref="/registry"
        layout="page"
      />
    </AppShell>
  )
}
