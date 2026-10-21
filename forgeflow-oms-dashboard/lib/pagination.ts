// Mirrors the API's page bound so the dashboard never sends a page the API would reject.
export const ORDERS_PAGE_MAX = 2147483647;

export function parsePageParam(value: string | string[] | undefined): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return 1;
  }

  const page = Number(value);

  return page <= ORDERS_PAGE_MAX ? page : 1;
}

export function ordersPageHref(page: number): string {
  return page <= 1 ? '/orders' : `/orders?page=${page}`;
}
