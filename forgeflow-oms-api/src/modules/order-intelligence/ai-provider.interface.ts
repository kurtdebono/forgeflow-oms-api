export type OrderAnalysisInput = {
  orderId: string;
  orderStatus: string;
  totalAmount: string;
  customerEmail?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
  }[];
};

export type OrderAnalysisResult = {
  summary: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFlags: string[];
  missingInformation: string[];
  recommendedActions: string[];
  customerExplanation: string;
};

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AIProviderMetadata = {
  provider: string;
  model: string;
};

export interface AIProvider {
  generateOrderAnalysis(
    input: OrderAnalysisInput,
  ): Promise<OrderAnalysisResult>;

  getMetadata(): AIProviderMetadata;
}
