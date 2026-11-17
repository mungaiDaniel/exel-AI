import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { AppShell } from '@/components/layout/AppShell'
import { DemoBanner } from '@/components/ui/DemoBanner'

import Landing         from '@/pages/Landing'
import Login           from '@/pages/Login'
import Register        from '@/pages/Register'
import Dashboard       from '@/pages/Dashboard'
import WorkbookView    from '@/pages/WorkbookView'
import SheetView       from '@/pages/SheetView'
import FormulaLab      from '@/pages/FormulaLab'
import Settings        from '@/pages/Settings'
import DashboardList    from '@/pages/DashboardList'
import DashboardBuilder  from '@/pages/DashboardBuilder'
import SharedDashboard   from '@/pages/SharedDashboard'
import AiChat            from '@/pages/AiChat'
import Search            from '@/pages/Search'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.accessToken)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            },
          }}
        />
        <DemoBanner />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/shared/:token" element={<SharedDashboard />} />

          {/* Protected */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workbooks/:id" element={<WorkbookView />} />
            <Route path="/workbooks/:workbookId/sheets/:sheetId" element={<SheetView />} />
            <Route path="/dashboards" element={<DashboardList />} />
            <Route path="/dashboards/:id" element={<DashboardBuilder />} />
            <Route path="/formula-lab" element={<FormulaLab />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
