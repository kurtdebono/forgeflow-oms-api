import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductModule } from './modules/products/product.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { PassportModule } from '@nestjs/passport';
import { AppCacheModule } from './infrastructure/cache/app-cache.module';
import { AppQueueModule } from './infrastructure/queue/app-queue.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';

@Module({
  imports: [
    AppQueueModule,
    AppCacheModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, 
    UsersModule, 
    ProductModule, 
    OrdersModule, 
    InventoryModule, 
    IdempotencyModule,
    DatabaseModule,
    PassportModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
