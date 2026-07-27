import { Module, Res } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueNames } from "../../infrastructure/queue/queue.constants";
import { OrderNotificationsProcessor } from "./order-notifications.processor";
import { OrderNotificationsProducer } from "./order-notifications.producer";
import { EMAIL_PROVIDER } from "./email-provider.interface";
import { FakeEmailProvider } from "./fake-email.provider";
import { ResendEmailProvider } from "./resend-email.provider";
import { NotificationService } from "./notifications.service";

@Module({
    imports: [
        BullModule.registerQueue({
            name: QueueNames.ORDER_EVENTS
        })        
    ],
    providers: [
        OrderNotificationsProcessor,
        OrderNotificationsProducer,
        NotificationService,
        {
            provide: EMAIL_PROVIDER,
            useClass: 
                process.env.EMAIL_PROVIDER === 'resend'
                    ? ResendEmailProvider
                    : FakeEmailProvider
        }
    ],
    exports: [OrderNotificationsProducer, NotificationService]
})

export class NotificationsModule {}