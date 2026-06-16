import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class OrdersRepository {
    constructor(private readonly prisma: PrismaService) {

    }

    create(data: Prisma.OrderCreateInput) {
        return this.prisma.order.create({
            data,
            include: {
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }

    findById(id: string) {
        return this.prisma.order.findUnique({
            where: { id },
            include: {
                user: true,
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
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
    }
}