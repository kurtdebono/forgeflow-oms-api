import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class OutboxRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(
        data: {
            eventType: string;
            payload: Prisma.InputJsonValue;
        },
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.outboxEvent.create({
            data: {
                eventType: data.eventType,
                payload: data.payload,
                status: OutboxEventStatus.PENDING
            }
        });
    }

    findPending(limit = 20) {
        return this.prisma.outboxEvent.findMany({
            where: {
                status: OutboxEventStatus.PENDING
            },
            orderBy: {
                createdAt: 'asc'
            },
            take: limit
        });
    }

    markPublished(id: string) {
        return this.prisma.outboxEvent.update({
            where: { id },
            data: {
                status: OutboxEventStatus.PUBLISHED,
                publishedAt: new Date()
            }
        });
    }

    markFailed(id: string, error: string) {
        return this.prisma.outboxEvent.update({
            where: { id },
            data: {                
                status: OutboxEventStatus.FAILED,
                lastError: error,
                attempts: {
                    increment: 1
                }
            }
        });
    }
}