import { OrderAnalysisInput, OrderAnalysisResult } from './ai-provider.interface';
import type { AIProvider } from './ai-provider.interface';
export declare class FakeAIProvider implements AIProvider {
    generateOrderAnalysis(input: OrderAnalysisInput): Promise<OrderAnalysisResult>;
    getMetadata(): {
        provider: string;
        model: string;
    };
}
