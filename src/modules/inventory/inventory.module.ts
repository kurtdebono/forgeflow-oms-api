import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
// import { ProductService } from '../products/product.service';
import { ProductModule } from '../products/product.module';

@Module({
  imports: [ProductModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository]
})
export class InventoryModule {}
