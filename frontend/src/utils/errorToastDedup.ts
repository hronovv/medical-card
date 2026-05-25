const shownErrors = new Set<string>()
const scopeMessages = new Map<string, string[]>()

/**
 * Toast для новых сообщений в рамках scope (FormMessages / useErrorToast).
 * Пустой список в одном scope не сбрасывает ошибки других экранов.
 */
export function syncErrorToasts(
  scope: string,
  messages: string[],
  push: (message: string) => void,
) {
  const prev = scopeMessages.get(scope) ?? []

  for (const msg of prev) {
    if (!messages.includes(msg)) {
      shownErrors.delete(msg)
    }
  }

  scopeMessages.set(scope, messages)

  for (const msg of messages) {
    if (shownErrors.has(msg)) continue
    shownErrors.add(msg)
    push(msg)
  }
}

export function releaseErrorToastScope(scope: string) {
  const prev = scopeMessages.get(scope) ?? []
  for (const msg of prev) {
    shownErrors.delete(msg)
  }
  scopeMessages.delete(scope)
}
