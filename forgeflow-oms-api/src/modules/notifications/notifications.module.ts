import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueNames } from "../../infrastructure/queue/queue.constants";
import { OrderNotificationsProcessor } from "./order-notifications.processor";
import { OrderNotificationsProducer } from "./order-notifications.producer";

@Module({
    imports: [
        BullModule.registerQueue({
            name: QueueNames.ORDER_EVENTS
        })
    ],
    providers: [
        OrderNotificationsProcessor,
        OrderNotificationsProducer
    ],
    exports: [OrderNotificationsProducer]
})

export class NotificationsModule {}