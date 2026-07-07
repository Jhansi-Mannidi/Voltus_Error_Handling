'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/shell/app-shell'
import { MotionSection } from '@/components/voltus/motion'
import { ErrorDetailDrawer } from '@/components/voltus/error-detail-drawer'
import { errors } from '@/mock'

interface Props {
  params: Promise<{ errorId: string }>
}

export default function ErrorDetailPage({ params }: Props) {
  const { errorId } = use(params)
  const event = errors.find(e => e.id === errorId)

  if (!event) notFound()

  return (
    <AppShell breadcrumbs={[
      { label: 'Error Log', href: '/errors' },
      { label: event.errorCode },
    ]}>
      <MotionSection className="flex flex-col h-full min-h-0">
        {/* back bar */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-[#E9EDF3] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]">
          <Link href="/errors"
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#2F6BFF] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Error Log
          </Link>
          <span className="text-[#E9EDF3] dark:text-[#334155]">·</span>
          <span className="font-mono text-[12px] font-semibold text-[#2F6BFF]">{event.errorCode}</span>
        </div>

        {/* full-page drawer (no backdrop, no fixed positioning) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ErrorDetailDrawer
            event={event}
            onClose={() => {}}
            fullPage
          />
        </div>
      </MotionSection>
    </AppShell>
  )
}
