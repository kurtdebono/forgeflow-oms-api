import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [AuthModule, UsersModule, ProductsModule, OrdersModule, InventoryModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
