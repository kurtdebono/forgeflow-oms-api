"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
const order_notifications_processor_1 = require("./order-notifications.processor");
const order_notifications_producer_1 = require("./order-notifications.producer");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: queue_constants_1.QueueNames.ORDER_EVENTS
            })
        ],
        providers: [
            order_notifications_processor_1.OrderNotificationsProcessor,
            order_notifications_producer_1.OrderNotificationsProducer
        ],
        exports: [order_notifications_producer_1.OrderNotificationsProducer]
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map