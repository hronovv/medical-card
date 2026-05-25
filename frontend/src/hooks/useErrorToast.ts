import { useEffect, useId } from 'react'
import { useToast } from '../context/ToastContext'
import { releaseErrorToastScope, syncErrorToasts } from '../utils/errorToastDedup'

export function useErrorToast(error: string | null | undefined) {
  const { pushError } = useToast()
  const scope = useId()

  useEffect(() => {
    const message = error?.trim() || null
    syncErrorToasts(scope, message ? [message] : [], pushError)
  }, [error, pushError, scope])

  useEffect(() => {
    return () => {
      releaseErrorToastScope(scope)
    }
  }, [scope])
}
