import { OrderAnalysisInput, OrderAnalysisResult } from './ai-provider.interface';
import type { AIProvider } from './ai-provider.interface';
export declare class OpenAIProvider implements AIProvider {
    private readonly client;
    private readonly model;
    constructor();
    generateOrderAnalysis(input: OrderAnalysisInput): Promise<OrderAnalysisResult>;
    getMetadata(): {
        provider: string;
        model: string;
    };
}
