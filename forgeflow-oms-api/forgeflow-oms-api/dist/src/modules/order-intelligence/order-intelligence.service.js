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
exports.OrderIntelligenceService = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("../orders/orders.service");
const ai_provider_interface_1 = require("./ai-provider.interface");
const order_analysis_repository_1 = require("./order-analysis.repository");
const order_analysis_schema_1 = require("./schemas/order-analysis.schema");
const notifications_service_1 = require("../notifications/notifications.service");
let OrderIntelligenceService = class OrderIntelligenceService {
    ordersService;
    orderAnalysisRepository;
    aiProvider;
    notificationService;
    constructor(ordersService, orderAnalysisRepository, aiProvider, notificationService) {
        this.ordersService = ordersService;
        this.orderAnalysisRepository = orderAnalysisRepository;
        this.aiProvider = aiProvider;
        this.notificationService = notificationService;
    }
    async generateAnalysis(orderId) {
        const order = await this.ordersService.findById(orderId);
        if (!order) {
            throw new common_1.NotFoundException('Order not found.');
        }
        const input = {
            orderId: order.id,
            orderStatus: order.status,
            totalAmount: order.totalAmount.toString(),
            customerEmail: order.user?.email,
            items: order.items.map((item) => ({
                productId: item.productId,
                productName: item.product?.name ?? 'Unknown product',
                quantity: item.quantity,
                unitPrice: item.unitPrice.toString()
            }))
        };
        const aiResult = await this.aiProvider.generateOrderAnalysis(input);
        const validationResult = order_analysis_schema_1.orderAnalysisSchema.safeParse(aiResult);
        const metadata = this.aiProvider.getMetadata();
        if (!validationResult.success) {
            throw new common_1.BadGatewayException('AI Provider return an invalid order analaysis response.');
        }
        const validated = validationResult.data;
        const analysis = this.orderAnalysisRepository.create({
            orderId: order.id,
            summary: validated.summary,
            priority: validated.priority,
            riskFlags: validated.riskFlags,
            missingInformation: validated.missingInformation,
            recommendedActions: validated.recommendedActions,
            customerExplanation: validated.customerExplanation,
            provider: metadata.provider,
            model: metadata.model,
            rawResponse: validated
        });
        if (validated.priority === 'HIGH') {
            try {
                await this.notificationService.sendManualReviewAlert({
                    orderId: order.id,
                    priority: validated.priority,
                    summary: validated.summary,
                    riskFlags: validated.riskFlags,
                    recommendedActions: validated.recommendedActions
                });
            }
            catch (error) {
                console.error('Failed to send manual review alert', error);
            }
        }
        return analysis;
    }
    getAnalysisForOrder(orderId) {
        return this.orderAnalysisRepository.findByOrderId(orderId);
    }
};
exports.OrderIntelligenceService = OrderIntelligenceService;
exports.OrderIntelligenceService = OrderIntelligenceService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        order_analysis_repository_1.OrderAnalysisRepository, Object, notifications_service_1.NotificationService])
], OrderIntelligenceService);
//# sourceMappingURL=order-intelligence.service.js.map