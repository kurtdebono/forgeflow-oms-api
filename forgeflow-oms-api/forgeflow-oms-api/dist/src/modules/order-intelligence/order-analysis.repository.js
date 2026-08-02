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
exports.OrderAnalysisRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
let OrderAnalysisRepository = class OrderAnalysisRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.orderAnalysis.create({
            data: {
                order: {
                    connect: {
                        id: data.orderId
                    }
                },
                summary: data.summary,
                priority: data.priority,
                riskFlags: data.riskFlags,
                missingInformation: data.missingInformation,
                recommendedActions: data.recommendedActions,
                customerExplanation: data.customerExplanation,
                provider: data.provider,
                model: data.model,
                rawResponse: data.rawResponse
            }
        });
    }
    findByOrderId(orderId) {
        return this.prisma.orderAnalysis.findMany({
            where: {
                orderId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
};
exports.OrderAnalysisRepository = OrderAnalysisRepository;
exports.OrderAnalysisRepository = OrderAnalysisRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrderAnalysisRepository);
//# sourceMappingURL=order-analysis.repository.js.map