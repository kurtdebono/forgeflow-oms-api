import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PaginationQueryDto } from './pagination-query.dto';

// Same options as main.ts, so this exercises the real query validation path.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function validateQuery(query: Record<string, unknown>): Promise<unknown> {
  return pipe.transform(query, {
    type: 'query',
    metatype: PaginationQueryDto,
  });
}

describe('PaginationQueryDto', () => {
  it('defaults to page 1 and limit 20 when no params are given', async () => {
    await expect(validateQuery({})).resolves.toEqual({ page: 1, limit: 20 });
  });

  it.each([
    [
      { page: '2', limit: '100' },
      { page: 2, limit: 100 },
    ],
    [{ limit: '1' }, { page: 1, limit: 1 }],
    [{ page: '2147483647' }, { page: 2147483647, limit: 20 }],
    [{ page: '007' }, { page: 7, limit: 20 }],
  ])('accepts %j as %j', async (query, expected) => {
    const result = await validateQuery(query);

    expect(result).toBeInstanceOf(PaginationQueryDto);
    expect(result).toEqual(expected);
  });

  it.each([
    { page: '0' },
    { page: '-1' },
    { page: 'abc' },
    { page: '' },
    { page: '1.5' },
    { page: '2147483648' },
    { limit: '0' },
    { limit: '-5' },
    { limit: '101' },
    { limit: 'abc' },
    { limit: '2.5' },
    { page: ['1', '2'] },
    { foo: '1' },
    { 'page[]': '1' },
    { page: '0x10' },
    { page: '1e1' },
    { page: ' 1' },
  ])('rejects %j with a 400 listing the problems', async (query) => {
    const error = await validateQuery(query).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: expect.arrayContaining([expect.any(String)]) as string[],
    });
  });
});
