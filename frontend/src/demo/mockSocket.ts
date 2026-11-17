/**
 * Drop-in replacement for the chat WebSocket in demo mode. Implements just the parts of the
 * WebSocket API that `useAiChat` uses and streams a canned, data-aware reply word by word,
 * following the same {type: 'token' | 'done' | 'error', data} protocol as the real backend.
 */
export class MockChatSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readyState: number = MockChatSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: ((evt: { code: number }) => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((evt: { data: string }) => void) | null = null

  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(private workbookId: string) {
    this.timers.push(
      setTimeout(() => {
        this.readyState = MockChatSocket.OPEN
        this.onopen?.()
      }, 150),
    )
  }

  send(raw: string) {
    const { content } = JSON.parse(raw) as { content: string }
    // Loaded lazily so the mock data never ships in non-demo bundles' main chunk.
    void import('./mockBackend').then(({ generateChatReply }) => {
      const reply = generateChatReply(this.workbookId, content)
      const emit = (type: string, data: string) => this.onmessage?.({ data: JSON.stringify({ type, data }) })

      let delay = 400
      for (const w of reply.split(/(\s+)/)) {
        delay += 25
        this.timers.push(setTimeout(() => emit('token', w), delay))
      }
      this.timers.push(setTimeout(() => emit('done', reply), delay + 30))
    })
  }

  close(code = 1000) {
    this.timers.forEach(clearTimeout)
    this.readyState = MockChatSocket.CLOSED
    this.onclose?.({ code })
  }
}
