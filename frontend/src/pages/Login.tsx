import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import { DEMO_MODE } from '@/demo/config'
import { useDemoLogin } from '@/demo/useDemoLogin'

export default function Login() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const startDemo = useDemoLogin()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (!form.email) { setErrors({ email: 'Email is required' }); return }
    if (!form.password) { setErrors({ password: 'Password is required' }); return }

    setLoading(true)
    try {
      const data = await authApi.login(form)
      setTokens(data.access_token, data.refresh_token, data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center mx-auto mb-4">
            <span className="font-display font-bold text-white text-xl">E</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Welcome back</h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">Sign in to ExcelAI Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card border border-[--color-border] rounded-xl p-8 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            error={errors.password}
          />
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
          {DEMO_MODE && (
            <>
              <div className="flex items-center gap-3 text-xs text-[--color-text-secondary]">
                <span className="h-px flex-1 bg-[--color-border]" />or<span className="h-px flex-1 bg-[--color-border]" />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={startDemo}>
                Try Demo
              </Button>
              <p className="text-center text-xs text-[--color-text-secondary]">
                Signs you in as demo@example.com with sample data — no account needed.
              </p>
            </>
          )}
          <p className="text-center text-sm text-[--color-text-secondary]">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-primary hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
