import React from 'react'
import { cn } from '../../utils'
import {
  LayoutDashboard, Gamepad2, Zap, ListChecks, BarChart3,
  Settings, TrendingUp, FileText, Menu, X
} from 'lucide-react'

interface NavItem { id: string; label: string; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'results', label: 'Results', icon: <ListChecks className="w-5 h-5" /> },
  { id: 'games', label: 'Games', icon: <Gamepad2 className="w-5 h-5" /> },
  { id: 'strategies', label: 'Strategies', icon: <Zap className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
]

const BOTTOM_NAV = NAV_ITEMS.slice(0, 5)

interface LayoutProps {
  page: string
  onNavigate: (page: string) => void
  children: React.ReactNode
}

export function AppLayout({ page, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="flex h-dvh bg-surface-50 dark:bg-slate-950">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-56 bg-white dark:bg-slate-900 border-r border-surface-200 dark:border-slate-800">
        <div className="p-4 border-b border-surface-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-bold">LT</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Lotto Tracker</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Pro</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                page === item.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center">Lotto Tracker Pro v1.0</p>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xs font-bold">LT</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Lotto Tracker Pro</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-0.5">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setSidebarOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium',
                    page === item.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-slate-600 dark:text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">LT</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {NAV_ITEMS.find(n => n.id === page)?.label ?? 'Lotto Tracker'}
            </span>
          </div>
          <div className="w-7" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-surface-200 dark:border-slate-800 flex z-40">
          {BOTTOM_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 transition-colors',
                page === item.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-600'
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
