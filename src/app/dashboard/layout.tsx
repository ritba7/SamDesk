'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Wind, LayoutDashboard, FileText, CheckSquare, Factory,
  Package, BarChart3, LogOut, ChevronLeft, ChevronRight, Menu, X, User,
  Phone, BookOpen
} from 'lucide-react'
import { cn, ROLES } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['director', 'vp', 'accounts', 'manufacturing', 'design'] },
  { href: '/dashboard/deals', label: 'Deals', icon: FileText, roles: ['director', 'vp', 'accounts', 'design'] },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, roles: ['director', 'vp', 'accounts', 'manufacturing', 'design'] },
  { href: '/dashboard/production', label: 'Production', icon: Factory, roles: ['director', 'vp', 'manufacturing'] },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, roles: ['director', 'manufacturing'] },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['director'] },
  { href: '/dashboard/followups', label: 'Follow-ups', icon: Phone, roles: ['director', 'vp', 'accounts'] },
  { href: '/dashboard/accounts', label: 'Accounts', icon: BookOpen, roles: ['director', 'accounts'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNav.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white',
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

      {/* User section */}
      <div className={cn('p-3 border-t border-slate-700/50', collapsed && 'flex flex-col items-center')}>
        <div className={cn('flex items-center gap-3 mb-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-slate-400 text-xs truncate">{ROLES[role] || role}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-sm transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-2 m-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-slate-900 transition-all duration-200 flex-shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-64 h-full bg-slate-900">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-200">
          <button onClick={() => setMobileOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">SamDesk</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
