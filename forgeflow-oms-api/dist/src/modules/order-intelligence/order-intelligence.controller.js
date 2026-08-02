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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderIntelligenceController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/strategies/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const order_intelligence_service_1 = require("./order-intelligence.service");
let OrderIntelligenceController = class OrderIntelligenceController {
    orderIntelligenceService;
    constructor(orderIntelligenceService) {
        this.orderIntelligenceService = orderIntelligenceService;
    }
    generateAnalysis(orderId) {
        return this.orderIntelligenceService.generateAnalysis(orderId);
    }
    getAnalysis(orderId) {
        return this.orderIntelligenceService.getAnalysisForOrder(orderId);
    }
};
exports.OrderIntelligenceController = OrderIntelligenceController;
__decorate([
    (0, common_1.Post)('analysis'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrderIntelligenceController.prototype, "generateAnalysis", null);
__decorate([
    (0, common_1.Get)('analysis'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrderIntelligenceController.prototype, "getAnalysis", null);
exports.OrderIntelligenceController = OrderIntelligenceController = __decorate([
    (0, common_1.Controller)('orders/:orderId/intelligence'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [order_intelligence_service_1.OrderIntelligenceService])
], OrderIntelligenceController);
//# sourceMappingURL=order-intelligence.controller.js.map