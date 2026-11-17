import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { DEMO_ACCESS_TOKEN, DEMO_REFRESH_TOKEN, DEMO_USER } from './config'

/** Logs in instantly as the fake demo user (no credentials, no network) and opens the app. */
export function useDemoLogin() {
  const navigate = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)
  return () => {
    setTokens(DEMO_ACCESS_TOKEN, DEMO_REFRESH_TOKEN, { ...DEMO_USER })
    navigate('/dashboard')
  }
}
