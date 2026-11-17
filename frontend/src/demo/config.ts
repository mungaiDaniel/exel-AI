/**
 * Demo mode: when `VITE_DEMO_MODE=true` the app never talks to a backend.
 * `src/api/client.ts` swaps in an in-memory mock (see ./adapter.ts) and the chat
 * WebSocket is replaced by ./mockSocket.ts. With the flag off, none of this code runs.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

export const DEMO_USER = {
  id: 'demo-user-0001',
  email: 'demo@example.com',
  name: 'Demo User',
  avatar_url: null,
} as const

export const DEMO_ACCESS_TOKEN = 'demo-access-token'
export const DEMO_REFRESH_TOKEN = 'demo-refresh-token'
