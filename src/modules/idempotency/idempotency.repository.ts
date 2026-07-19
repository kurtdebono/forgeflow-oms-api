import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IdempotencyRecord, IdempotencyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

import { IdempotencyDuplicateReason } from './idempotency.types';

export type CreateInProgressResult = 
| { created: true; record: IdempotencyRecord }
| { created: false; reason: IdempotencyDuplicateReason }

@Injectable()
export class IdempotencyRepository {
    constructor(private readonly prisma: PrismaService) {

    }

    findByUserOperationAndKey(
        userId: string,
        operation: string,
        key: string,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.idempotencyRecord.findUnique({
            where: {
                userId_operation_key: {
                    userId,
                    operation,
                    key
                }
            }
        });
    }

    async tryCreateInProgress(
        data: {
            userId: string;
            operation: string;
            key: string;
            requestHash: string;
        },
        tx: Prisma.TransactionClient = this.prisma
    ): Promise<CreateInProgressResult> {
        const createResult = await tx.idempotencyRecord.createMany({
            data: {
                userId: data.userId,
                operation: data.operation,
                key: data.key,
                requestHash: data.requestHash,
                status: IdempotencyStatus.IN_PROGRESS
            },
            skipDuplicates: true
        });

        if(createResult.count === 0) {
            return {
                created: false,
                reason: 'DUPLICATE_KEY'
            };
        }

        const record = await this.findByUserOperationAndKey(
            data.userId,
            data.operation,
            data.key,
            tx
        );

        if(!record) {
            throw new InternalServerErrorException(
                'Idempotency record was created but could not be found.'
            );
        }

        return {
            created: true,
            record
        };
    }

    markCompleted(
        id: string,
        orderId: string,
        tx: Prisma.TransactionClient = this.prisma
    ) {
        return tx.idempotencyRecord.update({
            where: { id },
            data: {
                status: IdempotencyStatus.COMPLETED,
                orderId
            }
        });
    }
}