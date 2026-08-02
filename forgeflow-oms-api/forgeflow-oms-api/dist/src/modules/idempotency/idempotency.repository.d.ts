import { IdempotencyRecord, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { IdempotencyDuplicateReason } from './idempotency.types';
export type CreateInProgressResult = {
    created: true;
    record: IdempotencyRecord;
} | {
    created: false;
    reason: IdempotencyDuplicateReason;
};
export declare class IdempotencyRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByUserOperationAndKey(userId: string, operation: string, key: string, tx?: Prisma.TransactionClient): Prisma.Prisma__IdempotencyRecordClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IdempotencyStatus;
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
        orderId: string | null;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    tryCreateInProgress(data: {
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
    }, tx?: Prisma.TransactionClient): Promise<CreateInProgressResult>;
    markCompleted(id: string, orderId: string, tx?: Prisma.TransactionClient): Prisma.Prisma__IdempotencyRecordClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.IdempotencyStatus;
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
        orderId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
