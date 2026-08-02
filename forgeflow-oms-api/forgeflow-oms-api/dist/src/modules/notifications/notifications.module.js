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
const email_provider_interface_1 = require("./email-provider.interface");
const fake_email_provider_1 = require("./fake-email.provider");
const resend_email_provider_1 = require("./resend-email.provider");
const notifications_service_1 = require("./notifications.service");
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
            order_notifications_producer_1.OrderNotificationsProducer,
            notifications_service_1.NotificationService,
            {
                provide: email_provider_interface_1.EMAIL_PROVIDER,
                useClass: process.env.EMAIL_PROVIDER === 'resend'
                    ? resend_email_provider_1.ResendEmailProvider
                    : fake_email_provider_1.FakeEmailProvider
            }
        ],
        exports: [order_notifications_producer_1.OrderNotificationsProducer, notifications_service_1.NotificationService]
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map