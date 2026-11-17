import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface Message { role: 'user' | 'assistant'; content: string }

interface ChatPanelProps {
  onSend: (msg: string) => Promise<string>
  workbookName?: string
}

export function ChatPanel({ onSend, workbookName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const reply = await onSend(text)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-card rounded-xl border border-[--color-border] overflow-hidden">
      <div className="px-4 py-3 border-b border-[--color-border] bg-surface-elevated flex items-center gap-2">
        <Bot className="w-4 h-4 text-brand-purple" />
        <span className="text-sm font-semibold text-[--color-text-primary]">AI Assistant</span>
        {workbookName && (
          <span className="text-xs text-[--color-text-tertiary] ml-auto">{workbookName}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="mx-auto w-8 h-8 text-brand-purple mb-3" />
            <p className="text-sm text-[--color-text-secondary]">Ask me anything about your data.</p>
            <p className="text-xs text-[--color-text-tertiary] mt-1">e.g. "Which region had the highest sales?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', m.role === 'assistant' ? 'bg-brand-purple/20' : 'bg-brand-primary/20')}>
              {m.role === 'assistant' ? <Bot className="w-4 h-4 text-brand-purple" /> : <User className="w-4 h-4 text-brand-primary" />}
            </div>
            <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5 text-sm', m.role === 'assistant' ? 'bg-surface-elevated text-[--color-text-primary]' : 'bg-brand-primary text-white')}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-purple/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-purple" />
            </div>
            <div className="bg-surface-elevated rounded-xl px-4 py-3">
              <span className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-[--color-border] flex gap-2">
        <input
          className="flex-1 bg-surface-elevated border border-[--color-border] rounded-lg px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-purple"
          placeholder="Ask about your data..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <Button onClick={send} loading={loading} size="sm" className="bg-brand-purple hover:bg-purple-600">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
