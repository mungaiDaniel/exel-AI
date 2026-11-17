import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { DEMO_MODE } from '@/demo/config'
import { MockChatSocket } from '@/demo/mockSocket'

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface UseAiChatOptions {
  workbookId: string | null
}

// Keep the full /ws path — do NOT strip it
const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/chat/ws'

const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export function useAiChat({ workbookId }: UseAiChatOptions) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const streamingIdRef = useRef<string | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef = useRef(0)
  const token = useAuthStore(s => s.accessToken)

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const connect = useCallback(() => {
    if (!workbookId || !token) return
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    setConnecting(true)
    clearReconnectTimer()

    const url = `${WS_BASE}/${workbookId}?token=${encodeURIComponent(token)}`
    const ws = (DEMO_MODE ? new MockChatSocket(workbookId) : new WebSocket(url)) as WebSocket
    wsRef.current = ws

    ws.onopen = () => {
      if (wsRef.current !== ws) return  // stale socket, a newer one was already created
      setConnected(true)
      setConnecting(false)
      reconnectCountRef.current = 0
    }

    ws.onclose = (evt) => {
      if (wsRef.current !== ws) return  // stale socket — don't clobber the active connection
      wsRef.current = null
      setConnected(false)
      setConnecting(false)
      // Don't auto-reconnect on auth errors (4001/4003) or intentional close (1000)
      const authError = evt.code === 4001 || evt.code === 4003
      if (!authError && evt.code !== 1000 && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCountRef.current += 1
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      if (wsRef.current !== ws) return
      setConnected(false)
      setConnecting(false)
    }

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data) as { type: string; data: string }

      // Capture the streaming ID synchronously — before any async batch runs.
      // In React 18 automatic batching, reading streamingIdRef.current *inside*
      // the updater is too late: by the time React flushes the batch, the 'done'
      // handler may have already cleared the ref, causing all token updates to
      // be silently dropped (the root cause of empty AI responses).
      const sid = streamingIdRef.current

      if (msg.type === 'token') {
        if (!sid) return
        setMessages(prev =>
          prev.map(m => m.id === sid ? { ...m, content: m.content + msg.data } : m)
        )
      } else if (msg.type === 'done') {
        streamingIdRef.current = null
        if (!sid) return
        setMessages(prev =>
          prev.map(m => m.id === sid ? { ...m, streaming: false } : m)
        )
      } else if (msg.type === 'error') {
        streamingIdRef.current = null
        if (!sid) return
        setMessages(prev =>
          prev.map(m => m.id === sid
            ? { ...m, content: `Error: ${msg.data}`, streaming: false }
            : m
          )
        )
      }
    }
  }, [workbookId, token])

  useEffect(() => {
    reconnectCountRef.current = 0
    connect()
    return () => {
      clearReconnectTimer()
      wsRef.current?.close(1000, 'component unmounted')
    }
  }, [connect])

  const send = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
    const aiMsg: ChatMsg   = { id: `a-${Date.now()}`, role: 'assistant', content: '', streaming: true }
    streamingIdRef.current = aiMsg.id

    setMessages(prev => [...prev, userMsg, aiMsg])
    wsRef.current.send(JSON.stringify({ content: text }))
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, send, connected, connecting, connect, clearMessages }
}
