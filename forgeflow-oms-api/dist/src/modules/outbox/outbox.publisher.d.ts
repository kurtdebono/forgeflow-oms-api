import { OutboxService } from './outbox.service';
import { OrderNotificationsProducer } from '../notifications/order-notifications.producer';
export declare class OutboxPublisher {
    private readonly outboxService;
    private readonly orderNotificationsProducer;
    private readonly logger;
    private isPublishing;
    constructor(outboxService: OutboxService, orderNotificationsProducer: OrderNotificationsProducer);
    publishPendingEvents(): Promise<void>;
    private publishEvent;
    private publishOrderConfirmed;
}
