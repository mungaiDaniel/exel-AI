import { useState } from 'react'
import { Bot, CheckCircle, XCircle, Loader } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { apiClient } from '@/api/client'

type AiStatus = 'idle' | 'loading' | 'ok' | 'error'

export default function Settings() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle')
  const [aiReply, setAiReply] = useState('')

  const testAiConnection = async () => {
    setAiStatus('loading')
    setAiReply('')
    try {
      const { data } = await apiClient.post('/chat/message', {
        content: 'Say "ExcelAI is ready!" in exactly 5 words.',
      })
      setAiReply(data.content)
      setAiStatus('ok')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Could not reach AI. Check that ANTHROPIC_API_KEY is set in your backend .env file.'
      setAiReply(msg)
      setAiStatus('error')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Settings</h1>

      {/* Account */}
      <Card>
        <h3 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-4">Account</h3>
        {user && (
          <div className="space-y-2">
            <p className="text-[--color-text-primary] font-medium">{user.name}</p>
            <p className="text-sm text-[--color-text-secondary]">{user.email}</p>
          </div>
        )}
        <Button variant="danger" size="sm" className="mt-4" onClick={logout}>
          Sign out
        </Button>
      </Card>

      {/* Appearance */}
      <Card>
        <h3 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[--color-text-primary]">Theme</p>
            <p className="text-xs text-[--color-text-tertiary] mt-0.5">Currently using {theme} mode</p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </Button>
        </div>
      </Card>

      {/* AI Configuration */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-brand-purple" />
          </div>
          <h3 className="text-sm font-semibold text-[--color-text-secondary] uppercase tracking-wider">AI Profile</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-elevated rounded-lg p-4 border border-[--color-border] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[--color-text-secondary]">Provider</span>
              <span className="text-[--color-text-primary] font-medium">Anthropic Claude</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[--color-text-secondary]">Model</span>
              <span className="font-mono text-xs text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded">claude-sonnet-4-6</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[--color-text-secondary]">API Key</span>
              <span className="text-[--color-text-tertiary] font-mono text-xs">Set in backend .env</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={testAiConnection}
              loading={aiStatus === 'loading'}
              disabled={aiStatus === 'loading'}
            >
              Test AI Connection
            </Button>
            {aiStatus === 'ok' && <CheckCircle className="w-4 h-4 text-brand-secondary shrink-0" />}
            {aiStatus === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
          </div>

          {aiReply && (
            <div className={`rounded-lg p-3 text-sm border ${
              aiStatus === 'ok'
                ? 'bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary'
                : 'bg-red-900/20 border-red-800/30 text-red-400'
            }`}>
              {aiReply}
            </div>
          )}

          {aiStatus === 'error' && (
            <div className="text-xs text-[--color-text-tertiary] space-y-1">
              <p className="font-semibold text-[--color-text-secondary]">To enable AI:</p>
              <p>1. Open <span className="font-mono text-brand-primary">/backend/.env</span></p>
              <p>2. Set <span className="font-mono text-brand-primary">ANTHROPIC_API_KEY=sk-ant-your-key-here</span></p>
              <p>3. Restart the backend server</p>
              <p>Get your key at <span className="font-mono text-brand-primary">console.anthropic.com</span></p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
