"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxModule = void 0;
const common_1 = require("@nestjs/common");
const outbox_repository_1 = require("./outbox.repository");
const outbox_service_1 = require("./outbox.service");
const outbox_publisher_1 = require("./outbox.publisher");
const notifications_module_1 = require("../notifications/notifications.module");
let OutboxModule = class OutboxModule {
};
exports.OutboxModule = OutboxModule;
exports.OutboxModule = OutboxModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        providers: [outbox_repository_1.OutboxRepository, outbox_service_1.OutboxService, outbox_publisher_1.OutboxPublisher],
        exports: [outbox_service_1.OutboxService, outbox_publisher_1.OutboxPublisher]
    })
], OutboxModule);
//# sourceMappingURL=outbox.module.js.map