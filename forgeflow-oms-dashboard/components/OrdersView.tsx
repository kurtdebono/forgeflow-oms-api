'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { OrderCard } from '@/components/OrderCard';
import { Pagination } from '@/components/Pagination';
import { secondaryControlClassName } from '@/components/controlStyles';
import { useOrders } from '@/hooks/useOrders';
import { ordersPageHref } from '@/lib/pagination';
import {
  getOrdersViewState,
  type OrdersViewState,
} from '@/lib/ordersViewState';

type OrdersViewProps = {
  page: number;
  headingId: string;
};

const infoBoxClassName = 'rounded-xl border p-5 text-gray-600';

function announcementFor(view: OrdersViewState): string {
  switch (view.kind) {
    case 'loading':
      return 'Loading orders...';
    case 'empty':
      return 'No orders found.';
    case 'out-of-range':
      return `Page ${view.page} doesn't exist.`;
    case 'success': {
      const { data, meta } = view.page;
      return `Page ${meta.page} of ${meta.totalPages}, showing ${data.length} of ${meta.total} orders.`;
    }
    case 'error':
      // Announced by the error message's own role="alert".
      return '';
  }
}

function pageCountSentence(totalPages: number): string {
  return totalPages === 1
    ? 'There is 1 page.'
    : `There are ${totalPages} pages.`;
}

export function OrdersView({ page, headingId }: OrdersViewProps) {
  const { result, retry } = useOrders(page);
  const view = getOrdersViewState(result);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Set only by user actions, so the initial load and Back/Forward never steal focus.
  const focusResultsAfterLoad = useRef(false);

  useEffect(() => {
    if (view.kind !== 'loading' && focusResultsAfterLoad.current) {
      focusResultsAfterLoad.current = false;
      resultsRef.current?.focus();
    }
  }, [view.kind]);

  function markUserNavigation() {
    focusResultsAfterLoad.current = true;
  }

  function handleRetry() {
    markUserNavigation();
    retry();
  }

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcementFor(view)}
      </p>

      <div
        id="orders-results"
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby={headingId}
        className="space-y-6 outline-none"
      >
        {view.kind === 'loading' && (
          <div className={`${infoBoxClassName} min-h-48`}>Loading orders...</div>
        )}

        {view.kind === 'error' && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert">{view.message}</p>
            <button
              type="button"
              onClick={handleRetry}
              className={`${secondaryControlClassName} bg-white text-gray-900`}
            >
              Try again
            </button>
          </div>
        )}

        {view.kind === 'empty' && (
          <div className={infoBoxClassName}>No orders found.</div>
        )}

        {view.kind === 'out-of-range' && (
          <div className={`${infoBoxClassName} space-y-3`}>
            <p>
              Page {view.page} doesn&apos;t exist.{' '}
              {pageCountSentence(view.lastPage)}
            </p>
            <Link
              href={ordersPageHref(view.lastPage)}
              onClick={markUserNavigation}
              className={`${secondaryControlClassName} w-full sm:w-auto`}
            >
              Go to last page (page {view.lastPage})
            </Link>
          </div>
        )}

        {view.kind === 'success' && (
          <>
            <div className="space-y-4">
              {view.page.data.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>

            {view.page.meta.totalPages > 1 && (
              <Pagination
                page={view.page.meta.page}
                totalPages={view.page.meta.totalPages}
                total={view.page.meta.total}
                hrefForPage={ordersPageHref}
                onNavigate={markUserNavigation}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
