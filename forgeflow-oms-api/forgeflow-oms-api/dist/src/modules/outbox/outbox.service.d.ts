import { Prisma } from '@prisma/client';
import { OutboxRepository } from './outbox.repository';
export declare class OutboxService {
    private readonly outboxRepository;
    constructor(outboxRepository: OutboxRepository);
    createEvent(data: {
        eventType: string;
        payload: Prisma.InputJsonValue;
    }, tx: Prisma.TransactionClient): Prisma.Prisma__OutboxEventClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OutboxEventStatus;
        eventType: string;
        payload: Prisma.JsonValue;
        attempts: number;
        lastError: string | null;
        publishedAt: Date | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findPending(limit?: number): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OutboxEventStatus;
        eventType: string;
        payload: Prisma.JsonValue;
        attempts: number;
        lastError: string | null;
        publishedAt: Date | null;
    }[]>;
    markPublished(id: string): Prisma.Prisma__OutboxEventClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OutboxEventStatus;
        eventType: string;
        payload: Prisma.JsonValue;
        attempts: number;
        lastError: string | null;
        publishedAt: Date | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    markFailed(id: string, error: string): Prisma.Prisma__OutboxEventClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OutboxEventStatus;
        eventType: string;
        payload: Prisma.JsonValue;
        attempts: number;
        lastError: string | null;
        publishedAt: Date | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
