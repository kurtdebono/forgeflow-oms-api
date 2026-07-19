import {
    ConflictException,
    Injectable,
    InternalServerErrorException
} from '@nestjs/common';
import { IdempotencyRecord, IdempotencyStatus } from '@prisma/client';
import { IdempotencyRepository } from './idempotency.repository';
import { createHash } from 'crypto';
import { OrdersRepository } from '../orders/orders.repository';
import { Prisma } from '@prisma/client';
import { IdempotencyDuplicateReason } from './idempotency.types';

export type ExistingIdempotencyResult = 
| { exists: false }
| { exists: true; orderId: string };

export type IdempotencyClaimResult =
| { claimed: true; recordId: string }
| { claimed: false; reason: IdempotencyDuplicateReason };

@Injectable()
export class IdempotencyService {
    constructor(private readonly idempotencyRepository: IdempotencyRepository) {}

    createRequestHash(data: unknown): string {
        const normalized = JSON.stringify(data);

        return createHash('sha256').update(normalized).digest('hex');
    }

    async checkExisting(params: {
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
    }): Promise<ExistingIdempotencyResult> {
        const record = await this.idempotencyRepository.findByUserOperationAndKey(
            params.userId,
            params.operation,
            params.key
        );

        if(!record) {
            return {
                exists: false
            };
        }

        if(record.requestHash !== params.requestHash) {
            throw new ConflictException(
                'Idempotency key was already used with a different request body.'
            );
        }

        if(record.status === IdempotencyStatus.IN_PROGRESS) {
            throw new ConflictException(
                'A request with this idempotency key is already in progress.'
            );
        }

        if(record.status === IdempotencyStatus.COMPLETED) {
            if(!record.orderId) {
                throw new InternalServerErrorException(
                    'Completed idempotency record record has no orderId.'
                );
            }

            return {
                exists: true,
                orderId: record.orderId
            };
        }

        throw new ConflictException('Invalid idempotency record state.');
    }

    async claim(params: {
        userId: string;
        operation: string;
        key: string;
        requestHash: string;
        tx: Prisma.TransactionClient;
    }): Promise<IdempotencyClaimResult> {        
        const result = await this.idempotencyRepository.tryCreateInProgress(
            {
                userId: params.userId,
                operation: params.operation,
                key: params.key,
                requestHash: params.requestHash
            },
            params.tx
        );

        if(!result.created) {
            return {
                claimed: false,
                reason: result.reason
            };
        }

        return {
            claimed: true,
            recordId: result.record.id
        }
    }

    async complete(params: {
        recordId: string;
        orderId: string;
        tx: Prisma.TransactionClient;
    }) {
        await this.idempotencyRepository.markCompleted(
            params.recordId,
            params.orderId,
            params.tx
        );
    }

    async resolveCompletedOrder(
        record: IdempotencyRecord,
        expectedRequestHash: string,
        ordersRepository: OrdersRepository
    ) {
        if(record.requestHash !== expectedRequestHash) {
            throw new ConflictException('Idempotency key was already used in a different request body');
        }

        if(record.status === IdempotencyStatus.IN_PROGRESS) {
            throw new ConflictException('A request with this idempotency key is already in progress.');
        }

        if(record.status === IdempotencyStatus.COMPLETED && record.orderId) {
            const order = await ordersRepository.findById(record.orderId);0

            if(!order) {
                throw new InternalServerErrorException('Idempotency record points to an order that no longer exists.');
            }

            return order;
        }

        throw new ConflictException('Invalid idempotency record state.');
    }
}