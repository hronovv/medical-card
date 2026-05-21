import { useEffect, useRef, type ReactNode } from 'react'
import { useToast } from '../context/ToastContext'

type FormMessagesProps = {
  errors?: (string | null | undefined)[]
  hints?: (string | null | undefined)[]
  className?: string
  inline?: boolean
  suppressToast?: boolean
  children?: ReactNode
}

export function FormMessages({
  errors = [],
  hints = [],
  className,
  inline = false,
  suppressToast = false,
  children,
}: FormMessagesProps) {
  const { pushError } = useToast()
  const errorItems = errors.filter((msg): msg is string => Boolean(msg?.trim()))
  const hintItems = hints.filter((msg): msg is string => Boolean(msg?.trim()))
  const lastSerialized = useRef('')
  const showInlineErrors = inline || suppressToast

  useEffect(() => {
    if (suppressToast) return

    const serialized = errorItems.join('\u0001')
    if (!serialized) {
      lastSerialized.current = ''
      return
    }
    if (serialized === lastSerialized.current) return
    errorItems.forEach((msg) => pushError(msg))
    lastSerialized.current = serialized
  }, [errorItems, pushError, suppressToast])

  if (
    (!showInlineErrors || errorItems.length === 0) &&
    hintItems.length === 0 &&
    !children
  ) {
    return null
  }

  return (
    <div className={['mc-form-messages', className].filter(Boolean).join(' ')}>
      {showInlineErrors &&
        errorItems.map((msg, index) => (
          <p key={`error-${index}`} className="mc-form-messages__error" role="alert">
            {msg}
          </p>
        ))}
      {hintItems.map((msg, index) => (
        <p key={`hint-${index}`} className="mc-readonly-hint">
          {msg}
        </p>
      ))}
      {children}
    </div>
  )
}
