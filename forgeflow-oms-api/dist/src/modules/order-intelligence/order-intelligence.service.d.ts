import { OrdersService } from '../orders/orders.service';
import { OrderAnalysisRepository } from './order-analysis.repository';
import type { AIProvider } from './ai-provider.interface';
export declare class OrderIntelligenceService {
    private readonly ordersService;
    private readonly orderAnalysisRepository;
    private readonly aiProvider;
    constructor(ordersService: OrdersService, orderAnalysisRepository: OrderAnalysisRepository, aiProvider: AIProvider);
    generateAnalysis(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        summary: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        riskFlags: import("@prisma/client/runtime/client").JsonValue;
        missingInformation: import("@prisma/client/runtime/client").JsonValue;
        recommendedActions: import("@prisma/client/runtime/client").JsonValue;
        customerExplanation: string;
        provider: string;
        model: string;
        rawResponse: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    getAnalysisForOrder(orderId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        orderId: string;
        summary: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        riskFlags: import("@prisma/client/runtime/client").JsonValue;
        missingInformation: import("@prisma/client/runtime/client").JsonValue;
        recommendedActions: import("@prisma/client/runtime/client").JsonValue;
        customerExplanation: string;
        provider: string;
        model: string;
        rawResponse: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
}
