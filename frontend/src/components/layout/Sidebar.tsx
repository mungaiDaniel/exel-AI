import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileSpreadsheet, FlaskConical, MessageSquare, Settings, ChevronLeft, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'

const navItems = [
  { to: '/dashboard',   icon: FileSpreadsheet, label: 'Workbooks' },
  { to: '/dashboards',  icon: LayoutDashboard, label: 'Dashboards' },
  { to: '/formula-lab', icon: FlaskConical,     label: 'Formula Lab' },
  { to: '/ai-chat',     icon: MessageSquare,    label: 'AI Chat' },
  { to: '/search',      icon: Search,           label: 'Search' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-surface-card border-r border-[--color-border] transition-all duration-300 shrink-0',
      sidebarCollapsed ? 'w-16' : 'w-56',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[--color-border]">
        <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-sm">E</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-display font-bold text-[--color-text-primary] text-lg leading-none">ExcelAI</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-[--radius-md] text-sm font-medium transition-all duration-[--transition-fast]',
              isActive
                ? 'bg-brand-primary/15 text-brand-primary'
                : 'text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-surface-hover',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[--color-border] p-2 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2 rounded-[--radius-md] text-sm font-medium transition-colors',
            isActive ? 'text-brand-primary' : 'text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-surface-hover',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && 'Settings'}
        </NavLink>
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[--radius-md] text-sm text-[--color-text-tertiary] hover:text-[--color-text-secondary] hover:bg-surface-hover transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 shrink-0 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
