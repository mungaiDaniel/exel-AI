import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/authStore'

export default function Register() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authApi.register(form)
      setTokens(data.access_token, data.refresh_token, data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center mx-auto mb-4">
            <span className="font-display font-bold text-white text-xl">E</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Create your account</h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">Start analysing your data with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card border border-[--color-border] rounded-xl p-8 space-y-4">
          <Input label="Name" placeholder="Jane Smith" {...field('name')} />
          <Input label="Email" type="email" placeholder="you@example.com" {...field('email')} />
          <Input label="Password" type="password" placeholder="Min 8 characters" {...field('password')} />
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
          <p className="text-center text-sm text-[--color-text-secondary]">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
