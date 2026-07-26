"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OrderNotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderNotificationsProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
let OrderNotificationsProcessor = OrderNotificationsProcessor_1 = class OrderNotificationsProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(OrderNotificationsProcessor_1.name);
    async process(job) {
        switch (job.name) {
            case queue_constants_1.OrderEventJobs.ORDER_CONFIRMED_NOTIFICATION:
                return this.handleOrderConfirmedNotification(job);
            default:
                this.logger.warn(`Unhandled job type: ${job.name}`);
                return;
        }
    }
    async handleOrderConfirmedNotification(job) {
        const { orderId, userId } = job.data;
        this.logger.log(`Simulating order confirmation notification. orderId=${orderId}, userId=${userId}`);
        return {
            notified: true,
            orderId,
            userId
        };
    }
};
exports.OrderNotificationsProcessor = OrderNotificationsProcessor;
exports.OrderNotificationsProcessor = OrderNotificationsProcessor = OrderNotificationsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_constants_1.QueueNames.ORDER_EVENTS)
], OrderNotificationsProcessor);
//# sourceMappingURL=order-notifications.processor.js.map