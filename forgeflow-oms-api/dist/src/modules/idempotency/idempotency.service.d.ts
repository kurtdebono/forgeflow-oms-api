import { IdempotencyRecord } from '@prisma/client';
import { IdempotencyRepository } from './idempotency.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { Prisma } from '@prisma/client';
import { IdempotencyDuplicateReason } from './idempotency.types';
export type ExistingIdempotencyResult = {
    exists: false;
} | {
    exists: true;
    orderId: string;
};
export type IdempotencyClaimResult = {
    claimed: true;
    recordId: string;
} | {
    claimed: false;
    reason: IdempotencyDuplicateReason;
};
export declare class IdempotencyService {
    private readonly idempotencyRepository;
    constructor(idempotencyRepository: IdempotencyRepository);
    createRequestHash(data: unknown): string;
    checkExisting(params: {
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
    }): Promise<ExistingIdempotencyResult>;
    claim(params: {
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
        tx: Prisma.TransactionClient;
    }): Promise<IdempotencyClaimResult>;
    complete(params: {
        recordId: string;
        orderId: string;
        tx: Prisma.TransactionClient;
    }): Promise<void>;
    resolveCompletedOrder(record: IdempotencyRecord, expectedRequestHash: string, ordersRepository: OrdersRepository): Promise<{
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        items: ({
            product: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                price: Prisma.Decimal;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            orderId: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
        })[];
    } & {
        id: string;
        userId: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        totalAmount: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
