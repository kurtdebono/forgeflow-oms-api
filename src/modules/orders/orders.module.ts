import { Module } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ProductModule } from '../products/product.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [ProductModule, InventoryModule],
    controllers: [OrdersController],
    providers: [OrdersService, OrdersRepository]    
})
export class OrdersModule {}
