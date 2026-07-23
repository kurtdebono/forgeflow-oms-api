import { Module } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ProductModule } from '../products/product.module';
import { InventoryModule } from '../inventory/inventory.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
    imports: [
        ProductModule,
        InventoryModule,
        IdempotencyModule,
        OutboxModule
    ],
    controllers: [OrdersController],
    providers: [OrdersService, OrdersRepository]    
})
export class OrdersModule {}
