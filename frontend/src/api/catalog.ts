import { apiRequest } from './client'
import { buildListQuery, type ListQuery, type PaginationMeta } from '../types/pagination'

export type CatalogDisease = {
  id: string
  name: string
  code: string
}

export function fetchDiseaseCatalog(token: string, params?: ListQuery) {
  return apiRequest<{ diseases: CatalogDisease[]; pagination: PaginationMeta }>(
    `/catalog/diseases${buildListQuery(params)}`,
    { token },
  )
}
