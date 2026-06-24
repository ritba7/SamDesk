'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Wind, LayoutDashboard, FileText, CheckSquare, Factory,
  Package, BarChart3, LogOut, ChevronLeft, ChevronRight, Menu, User, Bell, CreditCard,
  Users, AlertCircle, Clock
} from 'lucide-react'
import { cn, ROLES } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',            label: 'Dashboard',   icon: LayoutDashboard, roles: ['director', 'vp', 'accounts', 'manufacturing', 'design', 'sales'] },
  { href: '/dashboard/deals',      label: 'Pipeline',    icon: FileText,        roles: ['director', 'vp', 'accounts', 'design', 'sales'] },
  { href: '/dashboard/tasks',      label: 'Tasks',       icon: CheckSquare,     roles: ['director', 'vp', 'accounts', 'manufacturing', 'design', 'sales'] },
  { href: '/dashboard/production', label: 'Production',  icon: Factory,         roles: ['director', 'vp', 'manufacturing'] },
  { href: '/dashboard/inventory',  label: 'Inventory',   icon: Package,         roles: ['director', 'manufacturing'] },
  { href: '/dashboard/analytics',  label: 'Analytics',   icon: BarChart3,       roles: ['director'] },
  { href: '/dashboard/followups',  label: 'Follow-ups',  icon: Bell,            roles: ['director', 'vp', 'accounts', 'sales'] },
  { href: '/dashboard/accounts',   label: 'Accounts',    icon: CreditCard,      roles: ['director', 'accounts'] },
  { href: '/dashboard/workload',   label: 'Workload',    icon: Users,           roles: ['director'] },
]

interface NotifTask {
  id: string
  title: string
  dueDate: string | null
  deal?: { dealNumber: string; customerName: string } | null
  assignedTo?: { name: string } | null
}

interface Notifications {
  overdue: NotifTask[]
  dueToday: NotifTask[]
  dueTomorrow: NotifTask[]
  total: number
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notifications | null>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    function fetchNotifs() {
      fetch('/api/notifications').then(r => r.json()).then(setNotifs).catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <Wind className="w-6 h-6 text-blue-600 animate-pulse" />
          <span className="text-slate-600">Loading SamDesk...</span>
        </div>
      </div>
    )
  }

  if (!session) return null

  const user = session.user as any
  const role = user.role as string
  const filteredNav = navItems.filter(item => item.roles.includes(role))
  const urgentCount = notifs ? notifs.total : 0

  const NotificationBell = () => (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setBellOpen(v => !v)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {bellOpen && notifs && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
            <p className="font-semibold text-slate-800 text-sm">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifs.overdue.length === 0 && notifs.dueToday.length === 0 && notifs.dueTomorrow.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-6">All caught up!</p>
            )}
            {notifs.overdue.length > 0 && (
              <div className="p-3">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Overdue ({notifs.overdue.length})
                </p>
                {notifs.overdue.map(t => (
                  <div key={t.id} className="bg-red-50 rounded-lg p-2 mb-1">
                    <p className="text-xs font-medium text-slate-800 leading-snug">{t.title}</p>
                    {t.deal && <p className="text-xs text-slate-500">{t.deal.customerName}</p>}
                    {role === 'director' && t.assignedTo && <p className="text-xs text-slate-400">→ {t.assignedTo.name}</p>}
                  </div>
                ))}
              </div>
            )}
            {notifs.dueToday.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Due Today ({notifs.dueToday.length})
                </p>
                {notifs.dueToday.map(t => (
                  <div key={t.id} className="bg-amber-50 rounded-lg p-2 mb-1">
                    <p className="text-xs font-medium text-slate-800 leading-snug">{t.title}</p>
                    {t.deal && <p className="text-xs text-slate-500">{t.deal.customerName}</p>}
                    {role === 'director' && t.assignedTo && <p className="text-xs text-slate-400">→ {t.assignedTo.name}</p>}
                  </div>
                ))}
              </div>
            )}
            {notifs.dueTomorrow.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Due Tomorrow ({notifs.dueTomorrow.length})</p>
                {notifs.dueTomorrow.map(t => (
                  <div key={t.id} className="bg-slate-50 rounded-lg p-2 mb-1">
                    <p className="text-xs font-medium text-slate-800 leading-snug">{t.title}</p>
                    {t.deal && <p className="text-xs text-slate-500">{t.deal.customerName}</p>}
                    {role === 'director' && t.assignedTo && <p className="text-xs text-slate-400">→ {t.assignedTo.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <Link href="/dashboard/tasks" onClick={() => setBellOpen(false)} className="text-xs text-blue-600 hover:underline">View all tasks →</Link>
          </div>
        </div>
      )}
    </div>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={cn('flex items-center gap-3 p-4 border-b border-slate-700/50', collapsed && 'justify-center')}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Wind className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base leading-none">SamDesk</p>
            <p className="text-slate-400 text-xs mt-0.5">Air Shower Mfg.</p>
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className={cn('p-3 border-t border-slate-700/50', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate">{ROLES[role] || role}</p>
            </div>
            <NotificationBell />
          </div>
        )}
        {collapsed && <NotificationBell />}
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-sm transition-colors', collapsed && 'justify-center px-2')}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-2 m-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={cn('hidden lg:flex flex-col bg-slate-900 transition-all duration-200 flex-shrink-0', collapsed ? 'w-16' : 'w-64')}>
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 h-full bg-slate-900"><SidebarContent /></aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between gap-3 p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-gray-500 hover:text-gray-700">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800">SamDesk</span>
            </div>
          </div>
          <div className="relative" ref={bellRef}>
            <button onClick={() => setBellOpen(v => !v)} className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              {urgentCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {urgentCount > 9 ? '9+' : urgentCount}
                </span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
