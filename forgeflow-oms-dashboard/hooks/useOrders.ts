'use client';

import { getOrders } from '@/lib/api';
import type { OrdersResult } from '@/lib/ordersViewState';
import { useAsyncData } from '@/hooks/useAsyncData';

export function useOrders(page: number): {
  result: OrdersResult;
  retry: () => void;
} {
  const { data, error, isError, retry } = useAsyncData(
    () => getOrders({ page }),
    [page],
  );

  if (data) {
    return { result: { status: 'success', data }, retry };
  }

  if (isError) {
    return { result: { status: 'error', error: error ?? '' }, retry };
  }

  return { result: { status: 'loading' }, retry };
}
