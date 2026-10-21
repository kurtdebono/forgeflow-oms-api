import type { Order, Paginated } from '@/types/api';

export type OrdersResult =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: Paginated<Order> };

export type OrdersViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'out-of-range'; page: number; lastPage: number }
  | { kind: 'success'; page: Paginated<Order> };

const FALLBACK_ERROR_MESSAGE = "Couldn't load orders.";

// Exactly one state is derived from one result, so the empty message can never
// show while loading or after an error.
export function getOrdersViewState(result: OrdersResult): OrdersViewState {
  if (result.status === 'loading') {
    return { kind: 'loading' };
  }

  if (result.status === 'error') {
    return { kind: 'error', message: result.error || FALLBACK_ERROR_MESSAGE };
  }

  const { data, meta } = result.data;

  if (meta.total === 0) {
    return { kind: 'empty' };
  }

  if (data.length === 0 && meta.page > meta.totalPages) {
    return { kind: 'out-of-range', page: meta.page, lastPage: meta.totalPages };
  }

  return { kind: 'success', page: result.data };
}
