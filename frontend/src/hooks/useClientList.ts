import { useMemo, useState } from 'react'
import { DEFAULT_LIST_LIMIT, type PaginationMeta } from '../types/pagination'

function metaFor(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0
  return { page, limit, total, totalPages }
}

export function useClientList<T>(
  items: T[],
  searchText: (item: T) => string,
  limit = DEFAULT_LIST_LIMIT,
) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => searchText(item).toLowerCase().includes(needle))
  }, [items, q, searchText])

  const pagination = useMemo(() => metaFor(filtered.length, page, limit), [filtered.length, page, limit])

  const slice = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page, limit])

  function setQuery(next: string) {
    setQ(next)
    setPage(1)
  }

  return {
    items: slice,
    q,
    setQ: setQuery,
    page,
    setPage,
    pagination,
    totalFiltered: filtered.length,
  }
}
