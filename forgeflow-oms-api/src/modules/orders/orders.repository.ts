import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { publicUserSelect } from '../users/selects/user.select';
import { PageRequest } from './pagination';

const orderWithDetails = {
  include: {
    user: {
      select: publicUserSelect,
    },
    items: {
      include: {
        product: true,
      },
    },
  },
} satisfies Prisma.OrderDefaultArgs;

export type OrderWithDetails = Prisma.OrderGetPayload<typeof orderWithDetails>;

export type OrderListFilter = { userId?: string };

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // findMany and count share one REPEATABLE READ snapshot so data and total agree.
  async findPage(
    filter: OrderListFilter,
    { page, limit }: PageRequest,
  ): Promise<{ items: OrderWithDetails[]; total: number }> {
    const where: Prisma.OrderWhereInput =
      filter.userId !== undefined ? { userId: filter.userId } : {};

    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.order.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          ...orderWithDetails,
        }),
        this.prisma.order.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return { items, total };
  }

  create(
    data: Prisma.OrderCreateInput,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.order.create({
      data,
      ...orderWithDetails,
    });
  }

  findById(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<OrderWithDetails | null> {
    return tx.order.findUnique({
      where: { id },
      ...orderWithDetails,
    });
  }

  tryUpdateStatus(
    id: string,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.order.updateMany({
      where: {
        id,
        status: currentStatus,
      },
      data: {
        status: nextStatus,
      },
    });
  }
}
