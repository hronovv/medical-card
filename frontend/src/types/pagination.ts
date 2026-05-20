export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ListQuery = {
  q?: string
  page?: number
  limit?: number
}

export const DEFAULT_LIST_LIMIT = 10

export function buildListQuery(params: ListQuery = {}): string {
  const sp = new URLSearchParams()
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.page && params.page > 0) sp.set('page', String(params.page))
  if (params.limit && params.limit > 0) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}
