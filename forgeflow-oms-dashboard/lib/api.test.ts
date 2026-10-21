import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyOrders, getOrders } from './api';
import { saveAccessToken } from './auth';

const emptyPage = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

describe('order list API client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    saveAccessToken('token-123');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(emptyPage), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  function requestedUrl(): string {
    return fetchMock.mock.calls[0][0] as string;
  }

  it('requests the given page and leaves limit to the API default (AC18, R10)', async () => {
    await getOrders({ page: 2 });

    expect(requestedUrl()).toBe('http://api.test/orders?page=2');
  });

  it('sends no query string when no page is given', async () => {
    await getOrders();

    expect(requestedUrl()).toBe('http://api.test/orders');
  });

  it('sends both page and limit for /orders/my when given', async () => {
    await getMyOrders({ page: 3, limit: 10 });

    expect(requestedUrl()).toBe('http://api.test/orders/my?page=3&limit=10');
  });

  it('returns the paginated body and authenticates the request', async () => {
    await expect(getOrders({ page: 1 })).resolves.toEqual(emptyPage);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-123' });
  });
});
