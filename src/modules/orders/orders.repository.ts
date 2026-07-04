import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { publicUserSelect } from '../users/selects/user.select';

@Injectable()
export class OrdersRepository {
    constructor(private readonly prisma: PrismaService) {

    }

    create(
        data: Prisma.OrderCreateInput,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.order.create({
            data,
            include: {
                user: {
                    select: publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    findById(
        id: string,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.order.findUnique({
            where: { id },
            include: {
                user: {
                    select: publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    findByUserId(userId: string) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: publicUserSelect
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    tryUpdateStatus(
        id: string,
        currentStatus: OrderStatus,
        nextStatus: OrderStatus,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.order.updateMany({
            where: {
                id,
                status: currentStatus
            },
            data: {
                status: nextStatus
            }
        });
    }
}