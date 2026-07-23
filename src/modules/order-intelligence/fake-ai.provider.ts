import { 
    OrderAnalysisInput,
    OrderAnalysisResult
} from './ai-provider.interface';

import type { AIProvider } from './ai-provider.interface';

export class FakeAIProvider implements AIProvider {
    async generateOrderAnalysis(input: OrderAnalysisInput): Promise<OrderAnalysisResult> {
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
            customerExplanation:
                'Your order is being reviewed and processed by our operations team.'
        };
    }
}