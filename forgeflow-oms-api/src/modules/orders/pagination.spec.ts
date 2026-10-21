import { toPage } from './pagination';

describe('toPage', () => {
  it.each([
    { total: 0, limit: 20, totalPages: 0 },
    { total: 28, limit: 20, totalPages: 2 },
    { total: 20, limit: 20, totalPages: 1 },
    { total: 21, limit: 20, totalPages: 2 },
    { total: 1, limit: 100, totalPages: 1 },
  ])(
    'gives $totalPages pages for $total orders at limit $limit',
    ({ total, limit, totalPages }) => {
      expect(toPage([], total, { page: 1, limit }).meta.totalPages).toBe(
        totalPages,
      );
    },
  );

  it('echoes the requested page and limit with the data, even past the last page', () => {
    const data = [{ id: 'a' }];

    expect(toPage(data, 28, { page: 99, limit: 20 })).toEqual({
      data,
      meta: { page: 99, limit: 20, total: 28, totalPages: 2 },
    });
  });
});
