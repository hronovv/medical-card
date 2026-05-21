import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastType = 'error' | 'success' | 'info'

type ToastItem = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  pushError: (message: string) => void
  pushSuccess: (message: string) => void
  pushInfo: (message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 5
const DEFAULT_DURATION_MS = 5000

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <svg className="mc-toast__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 12.5 11 14.5 15.5 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  if (type === 'info') {
    return (
      <svg className="mc-toast__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg className="mc-toast__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="mc-toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`mc-toast mc-toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <div className="mc-toast__icon-wrap">
            <ToastIcon type={toast.type} />
          </div>
          <p className="mc-toast__message">{toast.message}</p>
          <button
            type="button"
            className="mc-toast__close"
            aria-label="Закрыть"
            onClick={() => onDismiss(toast.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

type ToastProviderProps = {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (type: ToastType, message: string, durationMs = DEFAULT_DURATION_MS) => {
      const trimmed = message.trim()
      if (!trimmed) return

      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, type, message: trimmed }].slice(-MAX_TOASTS))

      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs)
      }
    },
    [dismiss],
  )

  const pushError = useCallback((message: string) => push('error', message), [push])
  const pushSuccess = useCallback((message: string) => push('success', message), [push])
  const pushInfo = useCallback((message: string) => push('info', message), [push])

  const value = useMemo(
    () => ({ pushError, pushSuccess, pushInfo, dismiss }),
    [pushError, pushSuccess, pushInfo, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
