import { useEffect, useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Bot, User, Send, Wifi, WifiOff, Trash2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { BarChart } from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'
import { PieChart } from '@/components/charts/PieChart'
import { AreaChart } from '@/components/charts/AreaChart'
import { workbooksApi } from '@/api/workbooks.api'
import { useAiChat, type ChatMsg } from '@/hooks/useAiChat'
import { cn } from '@/utils/cn'
import type { Workbook } from '@/types/workbook.types'

// ── Inline chart detection ─────────────────────────────────────────────────────

interface InlineChart {
  chart_type: string; x: string; y: string; title?: string
  data?: Record<string, unknown>[]
}

function extractChart(content: string): InlineChart | null {
  const match = content.match(/\{[^{}]*"chart"\s*:\s*true[^{}]*\}/s)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function stripChart(content: string): string {
  return content.replace(/\{[^{}]*"chart"\s*:\s*true[^{}]*\}/s, '').trim()
}

function renderInlineChart(chart: InlineChart, sheetData: Record<string, unknown>[]) {
  if (!sheetData.length) return null
  const data = sheetData.slice(0, 50)
  const p = { data, xKey: chart.x, yKey: chart.y }
  switch (chart.chart_type) {
    case 'bar':     return <BarChart {...p} />
    case 'line':    return <LineChart {...p} />
    case 'area':    return <AreaChart {...p} />
    case 'pie':     return <PieChart data={data} nameKey={chart.x} valueKey={chart.y} />
    default:        return <BarChart {...p} />
  }
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, sheetData }: { msg: ChatMsg; sheetData: Record<string, unknown>[] }) {
  const isUser = msg.role === 'user'
  const chart = !isUser ? extractChart(msg.content) : null
  const text  = chart ? stripChart(msg.content) : msg.content

  return (
    <div className={cn('flex gap-3 group', isUser && 'flex-row-reverse')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-brand-primary/20' : 'bg-brand-purple/20')}>
        {isUser
          ? <User className="w-4 h-4 text-brand-primary" />
          : <Bot  className="w-4 h-4 text-brand-purple" />}
      </div>

      <div className={cn('max-w-[78%] space-y-2', isUser && 'items-end flex flex-col')}>
        {(text || msg.streaming) && (
          <div className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-brand-primary text-white rounded-tr-sm'
              : 'bg-surface-elevated text-[--color-text-primary] rounded-tl-sm',
          )}>
            {text && <p className="whitespace-pre-wrap">{text}</p>}
            {msg.streaming && (
              <span className={cn('inline-flex gap-0.5', text && 'ml-1')}>
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-brand-purple opacity-70 animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            )}
          </div>
        )}

        {chart && sheetData.length > 0 && (
          <div className="w-full bg-surface-elevated rounded-xl border border-[--color-border] overflow-hidden">
            {chart.title && (
              <p className="px-4 pt-3 text-xs font-semibold text-[--color-text-secondary]">{chart.title}</p>
            )}
            <div className="h-52 p-2">{renderInlineChart(chart, sheetData)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'What are the key trends in this data?',
  'Which values are the highest and lowest?',
  'Show me a chart of the top categories',
  'Are there any anomalies or outliers?',
  'Summarise this sheet in 3 bullet points',
]

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AiChat() {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [selectedWbId, setSelectedWbId] = useState<string | null>(null)
  const [sheetData, setSheetData] = useState<Record<string, unknown>[]>([])
  const [input, setInput] = useState('')
  const [loadingWbs, setLoadingWbs] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, send, connected, connecting, connect, clearMessages } = useAiChat({ workbookId: selectedWbId })

  // Load workbooks
  useEffect(() => {
    workbooksApi.list()
      .then(d => {
        const ready = d.items.filter(w => w.status === 'ready')
        setWorkbooks(ready)
        if (ready[0]) setSelectedWbId(ready[0].id)
      })
      .catch(() => toast.error('Failed to load workbooks'))
      .finally(() => setLoadingWbs(false))
  }, [])

  // Load first sheet data for inline chart rendering
  useEffect(() => {
    if (!selectedWbId) return
    setSheetData([])
    workbooksApi.sheets(selectedWbId).then(sheets => {
      if (sheets[0]) {
        workbooksApi.sheetData(sheets[0].id, 1, 100).then(d => setSheetData(d.data))
      }
    })
  }, [selectedWbId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || !connected) return
    send(text)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 flex-wrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-brand-purple" />
        </div>
        <h1 className="text-xl font-display font-bold text-[--color-text-primary]">AI Chat</h1>

        {/* Connection indicator + reconnect button */}
        <div className="flex items-center gap-2 ml-auto">
          <div className={cn('flex items-center gap-1.5 text-xs font-medium',
            connected ? 'text-brand-secondary' : connecting ? 'text-brand-accent' : 'text-[--color-text-tertiary]')}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? 'Connected' : connecting ? 'Connecting…' : 'Disconnected'}
          </div>
          {!connected && !connecting && (
            <button
              onClick={connect}
              className="text-xs px-2 py-1 rounded-md bg-brand-purple/10 text-brand-purple border border-brand-purple/30 hover:bg-brand-purple/20 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>

        {/* Workbook selector */}
        {!loadingWbs && workbooks.length > 0 && (
          <select
            className="bg-surface-elevated border border-[--color-border] rounded-[--radius-md] px-3 py-1.5 text-sm text-[--color-text-primary] outline-none focus:border-brand-purple"
            value={selectedWbId ?? ''}
            onChange={e => { setSelectedWbId(e.target.value); clearMessages() }}
          >
            {workbooks.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}

        {messages.length > 0 && (
          <button onClick={clearMessages} className="p-1.5 rounded hover:bg-surface-hover text-[--color-text-tertiary] hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {loadingWbs ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-brand-purple" />
              </div>
              <h2 className="text-lg font-display font-semibold text-[--color-text-primary] mb-1">
                Ask me about your data
              </h2>
              {selectedWbId ? (
                <p className="text-sm text-[--color-text-secondary]">
                  I have full context on your workbook. Try asking:
                </p>
              ) : (
                <p className="text-sm text-[--color-text-tertiary]">
                  <FileSpreadsheet className="inline w-4 h-4 mr-1" />
                  Upload a workbook first to enable data-aware responses.
                </p>
              )}
            </div>
            {selectedWbId && (
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="px-3 py-1.5 text-xs rounded-full border border-[--color-border] text-[--color-text-secondary] hover:border-brand-purple/50 hover:text-brand-purple hover:bg-brand-purple/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} sheetData={sheetData} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 pb-1">
        <div className={cn(
          'flex gap-2 items-end p-3 rounded-xl border transition-colors',
          connected ? 'border-[--color-border] focus-within:border-brand-purple' : 'border-[--color-border] opacity-60',
        )}>
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none max-h-36"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            placeholder={connected ? 'Ask anything about your data…' : connecting ? 'Connecting to AI…' : 'Disconnected — click Reconnect above'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!connected}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            className="bg-brand-purple hover:bg-purple-600 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-[--color-text-tertiary] text-center mt-1.5">
          Powered by Claude · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
