import { describe, expect, it } from 'vitest';
import { ORDERS_PAGE_MAX, ordersPageHref, parsePageParam } from './pagination';

describe('parsePageParam', () => {
  it.each([
    ['1', 1],
    ['2', 2],
    ['37', 37],
    [String(ORDERS_PAGE_MAX), ORDERS_PAGE_MAX],
  ])('reads %j as page %i', (value, expected) => {
    expect(parsePageParam(value)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'abc',
    '0',
    '-3',
    '1.5',
    '007',
    ' 2',
    '1e1',
    '0x10',
    String(ORDERS_PAGE_MAX + 1),
    ['2', '3'],
  ])('falls back to page 1 for %j (AC18)', (value) => {
    expect(parsePageParam(value)).toBe(1);
  });
});

describe('ordersPageHref', () => {
  it('links page 1 to the bare orders URL', () => {
    expect(ordersPageHref(1)).toBe('/orders');
  });

  it('puts later pages in the query string', () => {
    expect(ordersPageHref(2)).toBe('/orders?page=2');
  });
});
