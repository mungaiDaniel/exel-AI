import { Bell, Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

interface TopbarProps { title?: string }

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useUIStore()
  const { user, logout } = useAuthStore()

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[--color-border] bg-surface-card shrink-0">
      {title && <h2 className="font-display font-semibold text-lg text-[--color-text-primary]">{title}</h2>}
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-[--radius-md] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-surface-hover transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="p-2 rounded-[--radius-md] text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-surface-hover transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary text-sm font-semibold">
              {user.name[0].toUpperCase()}
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-xs">
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
