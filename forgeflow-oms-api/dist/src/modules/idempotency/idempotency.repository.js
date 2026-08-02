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
exports.IdempotencyRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
let IdempotencyRepository = class IdempotencyRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findByUserOperationAndKey(userId, operation, key, tx = this.prisma) {
        return tx.idempotencyRecord.findUnique({
            where: {
                userId_operation_key: {
                    userId,
                    operation,
                    key
                }
            }
        });
    }
    async tryCreateInProgress(data, tx = this.prisma) {
        const createResult = await tx.idempotencyRecord.createMany({
            data: {
                userId: data.userId,
                operation: data.operation,
                key: data.key,
                requestHash: data.requestHash,
                status: client_1.IdempotencyStatus.IN_PROGRESS
            },
            skipDuplicates: true
        });
        if (createResult.count === 0) {
            return {
                created: false,
                reason: 'DUPLICATE_KEY'
            };
        }
        const record = await this.findByUserOperationAndKey(data.userId, data.operation, data.key, tx);
        if (!record) {
            throw new common_1.InternalServerErrorException('Idempotency record was created but could not be found.');
        }
        return {
            created: true,
            record
        };
    }
    markCompleted(id, orderId, tx = this.prisma) {
        return tx.idempotencyRecord.update({
            where: { id },
            data: {
                status: client_1.IdempotencyStatus.COMPLETED,
                orderId
            }
        });
    }
};
exports.IdempotencyRepository = IdempotencyRepository;
exports.IdempotencyRepository = IdempotencyRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyRepository);
//# sourceMappingURL=idempotency.repository.js.map