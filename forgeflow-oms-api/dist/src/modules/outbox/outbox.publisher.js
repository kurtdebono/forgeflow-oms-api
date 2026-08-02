"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OutboxPublisher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxPublisher = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const outbox_constants_1 = require("./outbox.constants");
const outbox_service_1 = require("./outbox.service");
const order_notifications_producer_1 = require("../notifications/order-notifications.producer");
let OutboxPublisher = OutboxPublisher_1 = class OutboxPublisher {
    outboxService;
    orderNotificationsProducer;
    logger = new common_1.Logger(OutboxPublisher_1.name);
    isPublishing = false;
    constructor(outboxService, orderNotificationsProducer) {
        this.outboxService = outboxService;
        this.orderNotificationsProducer = orderNotificationsProducer;
    }
    async publishPendingEvents() {
        if (this.isPublishing) {
            return;
        }
        this.isPublishing = true;
        try {
            const events = await this.outboxService.findPending(20);
            for (const event of events) {
                await this.publishEvent(event);
            }
        }
        finally {
            this.isPublishing = false;
        }
    }
    async publishEvent(event) {
        try {
            switch (event.eventType) {
                case outbox_constants_1.OutboxEventTypes.ORDER_CONFIRMED:
                    await this.publishOrderConfirmed(event);
                    break;
                default:
                    this.logger.warn(`Unhandled outbox event type: ${event.eventType}`);
                    await this.outboxService.markFailed(event.id, `Unhandled outbox event type: ${event.eventType}`);
                    return;
            }
            await this.outboxService.markPublished(event.id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown publish error.';
            this.logger.error(`Failed to publish outbox event ${event.id}: ${message}`);
            await this.outboxService.markFailed(event.id, message);
        }
    }
    async publishOrderConfirmed(event) {
        const payload = event.payload;
        await this.orderNotificationsProducer.enqueueOrderConfirmedNotification({
            orderId: payload.orderId,
            userId: payload.userId
        });
    }
};
exports.OutboxPublisher = OutboxPublisher;
__decorate([
    (0, schedule_1.Interval)(5000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboxPublisher.prototype, "publishPendingEvents", null);
exports.OutboxPublisher = OutboxPublisher = OutboxPublisher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [outbox_service_1.OutboxService,
        order_notifications_producer_1.OrderNotificationsProducer])
], OutboxPublisher);
//# sourceMappingURL=outbox.publisher.js.map