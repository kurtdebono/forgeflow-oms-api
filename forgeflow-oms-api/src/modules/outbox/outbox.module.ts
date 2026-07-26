import { Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';
import { OutboxPublisher } from './outbox.publisher';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    providers: [OutboxRepository, OutboxService,  OutboxPublisher],
    exports: [OutboxService, OutboxPublisher]
})
export class OutboxModule {}