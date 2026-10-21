import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { publicUserSelect } from '../users/selects/user.select';

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

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  get(): Promise<OrderWithDetails[]> {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      ...orderWithDetails,
    });
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

  findByUserId(userId: string): Promise<OrderWithDetails[]> {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
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
