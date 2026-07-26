"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const product_module_1 = require("./modules/products/product.module");
const orders_module_1 = require("./modules/orders/orders.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const database_module_1 = require("./infrastructure/database/database.module");
const passport_1 = require("@nestjs/passport");
const app_cache_module_1 = require("./infrastructure/cache/app-cache.module");
const app_queue_module_1 = require("./infrastructure/queue/app-queue.module");
const idempotency_module_1 = require("./modules/idempotency/idempotency.module");
const order_intelligence_module_1 = require("./modules/order-intelligence/order-intelligence.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            app_queue_module_1.AppQueueModule,
            app_cache_module_1.AppCacheModule,
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            product_module_1.ProductModule,
            orders_module_1.OrdersModule,
            inventory_module_1.InventoryModule,
            idempotency_module_1.IdempotencyModule,
            database_module_1.DatabaseModule,
            passport_1.PassportModule,
            order_intelligence_module_1.OrderIntelligenceModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map