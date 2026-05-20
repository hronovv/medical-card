import type { ReactNode } from 'react'

type FormMessagesProps = {
  errors?: (string | null | undefined)[]
  hints?: (string | null | undefined)[]
  className?: string
  children?: ReactNode
}

export function FormMessages({ errors = [], hints = [], className, children }: FormMessagesProps) {
  const errorItems = errors.filter((msg): msg is string => Boolean(msg?.trim()))
  const hintItems = hints.filter((msg): msg is string => Boolean(msg?.trim()))
  if (errorItems.length === 0 && hintItems.length === 0 && !children) return null

  return (
    <div className={['mc-form-messages', className].filter(Boolean).join(' ')}>
      {errorItems.map((msg, index) => (
        <p key={`error-${index}`} className="mc-auth-form__error" role="alert">
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
