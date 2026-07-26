"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderIntelligenceModule = void 0;
const common_1 = require("@nestjs/common");
const orders_module_1 = require("../orders/orders.module");
const ai_provider_interface_1 = require("./ai-provider.interface");
const fake_ai_provider_1 = require("./fake-ai.provider");
const order_analysis_repository_1 = require("./order-analysis.repository");
const order_intelligence_controller_1 = require("./order-intelligence.controller");
const order_intelligence_service_1 = require("./order-intelligence.service");
const openai_provider_1 = require("./openai.provider");
let OrderIntelligenceModule = class OrderIntelligenceModule {
};
exports.OrderIntelligenceModule = OrderIntelligenceModule;
exports.OrderIntelligenceModule = OrderIntelligenceModule = __decorate([
    (0, common_1.Module)({
        imports: [orders_module_1.OrdersModule],
        controllers: [order_intelligence_controller_1.OrderIntelligenceController],
        providers: [
            order_intelligence_service_1.OrderIntelligenceService,
            order_analysis_repository_1.OrderAnalysisRepository,
            {
                provide: ai_provider_interface_1.AI_PROVIDER,
                useClass: process.env.AI_PROVIDER === 'openai'
                    ? openai_provider_1.OpenAIProvider
                    : fake_ai_provider_1.FakeAIProvider
            }
        ]
    })
], OrderIntelligenceModule);
//# sourceMappingURL=order-intelligence.module.js.map