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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
let OutboxRepository = class OutboxRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data, tx = this.prisma) {
        return tx.outboxEvent.create({
            data: {
                eventType: data.eventType,
                payload: data.payload,
                status: client_1.OutboxEventStatus.PENDING
            }
        });
    }
    findPending(limit = 20) {
        return this.prisma.outboxEvent.findMany({
            where: {
                status: client_1.OutboxEventStatus.PENDING
            },
            orderBy: {
                createdAt: 'asc'
            },
            take: limit
        });
    }
    markPublished(id) {
        return this.prisma.outboxEvent.update({
            where: { id },
            data: {
                status: client_1.OutboxEventStatus.PUBLISHED,
                publishedAt: new Date()
            }
        });
    }
    markFailed(id, error) {
        return this.prisma.outboxEvent.update({
            where: { id },
            data: {
                status: client_1.OutboxEventStatus.FAILED,
                lastError: error,
                attempts: {
                    increment: 1
                }
            }
        });
    }
};
exports.OutboxRepository = OutboxRepository;
exports.OutboxRepository = OutboxRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OutboxRepository);
//# sourceMappingURL=outbox.repository.js.map