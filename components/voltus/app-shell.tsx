import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  active?: string
  title: string
  subtitle?: string
}

export function AppShell({ children, active, title, subtitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0F172A]">
      <Sidebar active={active} />
      <Topbar title={title} subtitle={subtitle} />
      <main className={cn('md:ml-[240px] pt-16 min-h-screen')}>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
