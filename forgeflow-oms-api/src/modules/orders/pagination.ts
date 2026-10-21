export type PageRequest = { page: number; limit: number };

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = { data: T[]; meta: PageMeta };

export function toPage<T>(
  data: T[],
  total: number,
  { page, limit }: PageRequest,
): Paginated<T> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
