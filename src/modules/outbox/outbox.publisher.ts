import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OutboxEvent } from '@prisma/client';
import { OutboxEventTypes } from './outbox.constants';
import { OutboxService } from './outbox.service';
import { OrderNotificationsProducer } from '../notifications/order-notifications.producer';

@Injectable()
export class OutboxPublisher {
    private readonly logger = new Logger(OutboxPublisher.name)
    private isPublishing = false;

    constructor (
        private readonly outboxService: OutboxService,
        private readonly orderNotificationsProducer: OrderNotificationsProducer    
    ) {}

    @Interval(5000)
    async publishPendingEvents() {
        if (this.isPublishing) {
            return;
        }

        this.isPublishing = true;

        try {
           const events = await this.outboxService.findPending(20);

            for (const event of events) {
                await this.publishEvent(event);
            }
        } finally {
            this.isPublishing = false;
        }
    }

    private async publishEvent(event: OutboxEvent) {
        try {
            switch (event.eventType) {
                case OutboxEventTypes.ORDER_CONFIRMED:
                    await this.publishOrderConfirmed(event);
                    break;
                default:
                    this.logger.warn(`Unhandled outbox event type: ${event.eventType}`);
                    await this.outboxService.markFailed(
                        event.id,
                        `Unhandled outbox event type: ${event.eventType}`
                    );

                    return;
            }

            await this.outboxService.markPublished(event.id);
        }
        catch(error) {
            const message = error instanceof Error ? error.message : 'Unknown publish error.';

            this.logger.error(
                `Failed to publish outbox event ${event.id}: ${message}`
            );

            await this.outboxService.markFailed(event.id, message);
        }
    }

    private async publishOrderConfirmed(event: OutboxEvent) {
        const payload = event.payload as {
            orderId: string;
            userId: string;
        };

        await this.orderNotificationsProducer.enqueueOrderConfirmedNotification({
            orderId: payload.orderId,
            userId: payload.userId
        });
    }
}