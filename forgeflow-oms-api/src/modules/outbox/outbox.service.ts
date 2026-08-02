import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  createEvent(
    data: {
      eventType: string;
      payload: Prisma.InputJsonValue;
    },
    tx: Prisma.TransactionClient,
  ) {
    return this.outboxRepository.create(data, tx);
  }

  findPending(limit?: number) {
    return this.outboxRepository.findPending(limit);
  }

  markPublished(id: string) {
    return this.outboxRepository.markPublished(id);
  }

  markFailed(id: string, error: string) {
    return this.outboxRepository.markFailed(id, error);
  }
}
