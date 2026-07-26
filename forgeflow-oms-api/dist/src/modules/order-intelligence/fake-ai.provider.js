"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeAIProvider = void 0;
class FakeAIProvider {
    async generateOrderAnalysis(input) {
        const hasLargeOrder = Number(input.totalAmount) >= 500;
        return {
            summary: `Order ${input.orderId} contains ${input.items.length} item line(s) with status ${input.orderStatus}.`,
            priority: hasLargeOrder ? 'HIGH' : 'MEDIUM',
            riskFlags: hasLargeOrder
                ? ['High-value order may require manual review.']
                : [],
            missingInformation: [],
            recommendedActions: hasLargeOrder
                ? ['Review the order before fulfilment.']
                : ['Proceed with normal fulfilment checks.'],
            customerExplanation: 'Your order is being reviewed and processed by our operations team.'
        };
    }
    getMetadata() {
        return {
            provider: 'fake',
            model: 'fake-order-analysis-v1'
        };
    }
}
exports.FakeAIProvider = FakeAIProvider;
//# sourceMappingURL=fake-ai.provider.js.map