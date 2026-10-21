import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrders } from '@/lib/api';
import type { Order, Paginated } from '@/types/api';
import { OrdersView } from './OrdersView';

vi.mock('@/lib/api', () => ({ getOrders: vi.fn() }));

const getOrdersMock = vi.mocked(getOrders);

function makeOrders(count: number, prefix = 'order'): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    userId: 'user-1',
    status: 'PENDING',
    totalAmount: '10.00',
    items: [],
  }));
}

function pageOf(
  data: Order[],
  page: number,
  total: number,
  limit = 20,
): Paginated<Order> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

function renderView(page: number) {
  return render(<OrdersView page={page} headingId="orders-heading" />);
}

function orderCards() {
  return screen
    .queryAllByRole('link')
    .filter((link) => /^\/orders\/order-/.test(link.getAttribute('href') ?? ''));
}

function pagination() {
  return screen.queryByRole('navigation', { name: 'Orders pagination' });
}

describe('OrdersView', () => {
  beforeEach(() => {
    getOrdersMock.mockReset();
  });

  it('shows the first 20 of 28 orders with Previous disabled and Next enabled (AC15)', async () => {
    getOrdersMock.mockResolvedValue(pageOf(makeOrders(20), 1, 28));

    renderView(1);

    await waitFor(() => expect(orderCards()).toHaveLength(20));
    const nav = pagination();
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain('Page 1 of 2');
    expect(nav?.textContent).toContain('28 orders');
    const previous = within(nav!).getByRole('button', { name: 'Previous' });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    expect(
      within(nav!).getByRole('link', { name: 'Next' }).getAttribute('href'),
    ).toBe('/orders?page=2');
    expect(getOrdersMock).toHaveBeenCalledWith({ page: 1 });
  });

  it('shows the last 8 orders on page 2 with Next disabled and Previous linking to page 1 (AC16)', async () => {
    getOrdersMock.mockResolvedValue(pageOf(makeOrders(8), 2, 28));

    renderView(2);

    await waitFor(() => expect(orderCards()).toHaveLength(8));
    const nav = pagination()!;
    const next = within(nav).getByRole('button', { name: 'Next' });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(
      within(nav).getByRole('link', { name: 'Previous' }).getAttribute('href'),
    ).toBe('/orders');
    expect(getOrdersMock).toHaveBeenCalledWith({ page: 2 });
  });

  it('shows the out-of-range message with a link to the last page, not the empty message (AC19)', async () => {
    getOrdersMock.mockResolvedValue(pageOf([], 9, 28));

    renderView(9);

    expect(
      await screen.findByText(/Page 9 doesn't exist\. There are 2 pages\./),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Go to last page (page 2)' })
        .getAttribute('href'),
    ).toBe('/orders?page=2');
    expect(screen.queryByText('No orders found.')).toBeNull();
    expect(pagination()).toBeNull();
  });

  it('shows only the empty message, with no controls, when there are no orders (AC20)', async () => {
    getOrdersMock.mockResolvedValue(pageOf([], 1, 0));

    renderView(1);

    await waitFor(() => {
      expect(screen.getAllByText('No orders found.').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Loading orders...', { selector: 'div' })).toBeNull();
    expect(pagination()).toBeNull();
  });

  it('shows only the loading message while the request is in flight (AC20)', () => {
    getOrdersMock.mockReturnValue(new Promise(() => {}));

    renderView(1);

    expect(screen.getByText('Loading orders...', { selector: 'div' })).toBeTruthy();
    expect(screen.queryByText('No orders found.')).toBeNull();
    expect(pagination()).toBeNull();
  });

  it('shows the error and a retry that reloads the same page, never the empty message (AC20)', async () => {
    getOrdersMock
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(pageOf(makeOrders(3), 1, 3));

    renderView(1);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Service unavailable',
    );
    expect(screen.queryByText('No orders found.')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(orderCards()).toHaveLength(3));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getOrdersMock).toHaveBeenNthCalledWith(2, { page: 1 });
  });

  it('hides the pagination controls when everything fits on one page (AC21)', async () => {
    getOrdersMock.mockResolvedValue(pageOf(makeOrders(15), 1, 15));

    renderView(1);

    await waitFor(() => expect(orderCards()).toHaveLength(15));
    expect(pagination()).toBeNull();
  });

  it('replaces the previous page with the loading state when the page changes (R13)', async () => {
    getOrdersMock.mockResolvedValueOnce(pageOf(makeOrders(20), 1, 28));
    const { rerender } = renderView(1);
    await waitFor(() => expect(orderCards()).toHaveLength(20));

    getOrdersMock.mockReturnValueOnce(new Promise(() => {}));
    rerender(<OrdersView page={2} headingId="orders-heading" />);

    expect(orderCards()).toHaveLength(0);
    expect(screen.getByText('Loading orders...', { selector: 'div' })).toBeTruthy();
    expect(getOrdersMock).toHaveBeenLastCalledWith({ page: 2 });
  });

  it('announces the page that loaded in the live region', async () => {
    getOrdersMock.mockResolvedValue(pageOf(makeOrders(8), 2, 28));

    renderView(2);

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'Page 2 of 2, showing 8 of 28 orders.',
      ),
    );
  });

  it('moves focus to the results after a user-initiated load, but not on the first load', async () => {
    getOrdersMock
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(pageOf(makeOrders(3), 1, 3));

    renderView(1);
    await screen.findByRole('alert');
    const results = document.getElementById('orders-results');
    expect(document.activeElement).not.toBe(results);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(orderCards()).toHaveLength(3));
    await act(async () => {});

    expect(document.activeElement).toBe(results);
  });
});
