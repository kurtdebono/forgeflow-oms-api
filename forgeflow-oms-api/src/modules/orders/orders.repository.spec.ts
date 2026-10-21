import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { publicUserSelect } from '../users/selects/user.select';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  describe('findPage', () => {
    const items = [{ id: 'order-1' }];

    function setup() {
      const findMany = jest.fn().mockReturnValue('findMany-query');
      const count = jest.fn().mockReturnValue('count-query');
      const $transaction = jest.fn().mockResolvedValue([items, 42]);
      const prisma = {
        order: { findMany, count },
        $transaction,
      } as unknown as PrismaService;

      return {
        repository: new OrdersRepository(prisma),
        findMany,
        count,
        $transaction,
      };
    }

    it('lists all orders newest first with an id tie-breaker and only public user fields', async () => {
      const { repository, findMany, count } = setup();

      await repository.findPage({}, { page: 1, limit: 20 });

      expect(findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
        include: {
          user: { select: publicUserSelect },
          items: { include: { product: true } },
        },
      });
      expect(count).toHaveBeenCalledWith({ where: {} });
    });

    it('skips the rows of earlier pages', async () => {
      const { repository, findMany } = setup();

      await repository.findPage({}, { page: 3, limit: 10 });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('filters both the list and the count by userId', async () => {
      const { repository, findMany, count } = setup();

      await repository.findPage({ userId: 'user-1' }, { page: 1, limit: 20 });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('treats an empty userId as a filter, not as "all orders"', async () => {
      const { repository, findMany, count } = setup();

      await repository.findPage({ userId: '' }, { page: 1, limit: 20 });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: '' } }),
      );
      expect(count).toHaveBeenCalledWith({ where: { userId: '' } });
    });

    it('runs list and count in one repeatable-read transaction and returns both', async () => {
      const { repository, $transaction } = setup();

      const result = await repository.findPage({}, { page: 1, limit: 20 });

      expect($transaction).toHaveBeenCalledWith(
        ['findMany-query', 'count-query'],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      expect(result).toEqual({ items, total: 42 });
    });
  });
});
