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
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const idempotency_repository_1 = require("./idempotency.repository");
const crypto_1 = require("crypto");
let IdempotencyService = class IdempotencyService {
    idempotencyRepository;
    constructor(idempotencyRepository) {
        this.idempotencyRepository = idempotencyRepository;
    }
    createRequestHash(data) {
        const normalized = JSON.stringify(data);
        return (0, crypto_1.createHash)('sha256').update(normalized).digest('hex');
    }
    async checkExisting(params) {
        const record = await this.idempotencyRepository.findByUserOperationAndKey(params.userId, params.operation, params.key);
        if (!record) {
            return {
                exists: false
            };
        }
        if (record.requestHash !== params.requestHash) {
            throw new common_1.ConflictException('Idempotency key was already used with a different request body.');
        }
        if (record.status === client_1.IdempotencyStatus.IN_PROGRESS) {
            throw new common_1.ConflictException('A request with this idempotency key is already in progress.');
        }
        if (record.status === client_1.IdempotencyStatus.COMPLETED) {
            if (!record.orderId) {
                throw new common_1.InternalServerErrorException('Completed idempotency record record has no orderId.');
            }
            return {
                exists: true,
                orderId: record.orderId
            };
        }
        throw new common_1.ConflictException('Invalid idempotency record state.');
    }
    async claim(params) {
        const result = await this.idempotencyRepository.tryCreateInProgress({
            userId: params.userId,
            operation: params.operation,
            key: params.key,
            requestHash: params.requestHash
        }, params.tx);
        if (!result.created) {
            return {
                claimed: false,
                reason: result.reason
            };
        }
        return {
            claimed: true,
            recordId: result.record.id
        };
    }
    async complete(params) {
        await this.idempotencyRepository.markCompleted(params.recordId, params.orderId, params.tx);
    }
    async resolveCompletedOrder(record, expectedRequestHash, ordersRepository) {
        if (record.requestHash !== expectedRequestHash) {
            throw new common_1.ConflictException('Idempotency key was already used in a different request body');
        }
        if (record.status === client_1.IdempotencyStatus.IN_PROGRESS) {
            throw new common_1.ConflictException('A request with this idempotency key is already in progress.');
        }
        if (record.status === client_1.IdempotencyStatus.COMPLETED && record.orderId) {
            const order = await ordersRepository.findById(record.orderId);
            0;
            if (!order) {
                throw new common_1.InternalServerErrorException('Idempotency record points to an order that no longer exists.');
            }
            return order;
        }
        throw new common_1.ConflictException('Invalid idempotency record state.');
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [idempotency_repository_1.IdempotencyRepository])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map