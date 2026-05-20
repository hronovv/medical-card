import { useEffect, useState } from 'react'
import type { PaginationMeta } from '../types/pagination'

const SEARCH_DEBOUNCE_MS = 350

type ListControlsProps = {
  q: string
  onQChange: (value: string) => void
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  placeholder?: string
  id?: string
}

export function ListControls({
  q,
  onQChange,
  pagination,
  onPageChange,
  placeholder = 'Поиск…',
  id,
}: ListControlsProps) {
  const [draft, setDraft] = useState(q)
  const { page, totalPages, total, limit } = pagination
  const showPager = totalPages > 1
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  useEffect(() => {
    setDraft(q)
  }, [q])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== q) onQChange(draft)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, q, onQChange])

  return (
    <div className="mc-list-controls">
      <label className="mc-field mc-list-controls__search">
        <span className="mc-field__label visually-hidden">Поиск</span>
        <input
          id={id}
          className="mc-field__input"
          type="search"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <div className="mc-list-controls__pager">
        <span className="mc-list-controls__info">
          {total === 0 ? 'Нет записей' : `${from}–${to} из ${total}`}
        </span>
        {showPager && (
          <>
            <button
              type="button"
              className="mc-btn mc-btn--ghost mc-btn--sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ←
            </button>
            <span className="mc-list-controls__page">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="mc-btn mc-btn--ghost mc-btn--sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
