import { useEffect, useRef } from 'react'
import { useToast } from '../context/ToastContext'

export function useErrorToast(error: string | null | undefined) {
  const { pushError } = useToast()
  const lastMessage = useRef<string | null>(null)

  useEffect(() => {
    const message = error?.trim() || null
    if (!message) {
      lastMessage.current = null
      return
    }
    if (message === lastMessage.current) return
    pushError(message)
    lastMessage.current = message
  }, [error, pushError])
}
