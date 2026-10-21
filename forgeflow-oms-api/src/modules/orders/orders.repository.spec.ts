import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { publicUserSelect } from '../users/selects/user.select';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  it('lists all orders with only the public user fields, newest first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { order: { findMany } } as unknown as PrismaService;

    await new OrdersRepository(prisma).get();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: publicUserSelect },
        items: { include: { product: true } },
      },
    });
  });
});
