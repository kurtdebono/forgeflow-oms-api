import { describe, expect, it } from 'vitest';
import type { Order, Paginated } from '@/types/api';
import { getOrdersViewState } from './ordersViewState';

const order: Order = {
  id: 'order-1',
  userId: 'user-1',
  status: 'PENDING',
  totalAmount: '10.00',
  items: [],
};

function page(
  data: Order[],
  meta: Paginated<Order>['meta'],
): { status: 'success'; data: Paginated<Order> } {
  return { status: 'success', data: { data, meta } };
}

describe('getOrdersViewState', () => {
  it('is loading while the request is in flight', () => {
    expect(getOrdersViewState({ status: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('shows the API error message on failure', () => {
    expect(getOrdersViewState({ status: 'error', error: 'Boom' })).toEqual({
      kind: 'error',
      message: 'Boom',
    });
  });

  it('falls back to a generic message when the error is empty', () => {
    expect(getOrdersViewState({ status: 'error', error: '' })).toEqual({
      kind: 'error',
      message: "Couldn't load orders.",
    });
  });

  it('is empty only when the request succeeded with no orders at all', () => {
    expect(
      getOrdersViewState(page([], { page: 1, limit: 20, total: 0, totalPages: 0 })),
    ).toEqual({ kind: 'empty' });
  });

  it('is empty, not out of range, on a later page when there are no orders', () => {
    expect(
      getOrdersViewState(page([], { page: 3, limit: 20, total: 0, totalPages: 0 })),
    ).toEqual({ kind: 'empty' });
  });

  it('is out of range past the last page and points at the last page', () => {
    expect(
      getOrdersViewState(page([], { page: 9, limit: 20, total: 28, totalPages: 2 })),
    ).toEqual({ kind: 'out-of-range', page: 9, lastPage: 2 });
  });

  it('is success with orders, including a single page', () => {
    const result = page([order], { page: 1, limit: 20, total: 1, totalPages: 1 });

    expect(getOrdersViewState(result)).toEqual({
      kind: 'success',
      page: result.data,
    });
  });
});
