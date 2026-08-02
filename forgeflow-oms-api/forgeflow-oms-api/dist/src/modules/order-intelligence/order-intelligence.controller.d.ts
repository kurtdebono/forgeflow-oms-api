import { OrderIntelligenceService } from './order-intelligence.service';
export declare class OrderIntelligenceController {
    private readonly orderIntelligenceService;
    constructor(orderIntelligenceService: OrderIntelligenceService);
    generateAnalysis(orderId: string): Promise<{
        id: string;
        createdAt: Date;
        orderId: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        summary: string;
        customerExplanation: string;
        riskFlags: import("@prisma/client/runtime/client").JsonValue;
        missingInformation: import("@prisma/client/runtime/client").JsonValue;
        recommendedActions: import("@prisma/client/runtime/client").JsonValue;
        provider: string;
        model: string;
        rawResponse: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    getAnalysis(orderId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        orderId: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        summary: string;
        customerExplanation: string;
        riskFlags: import("@prisma/client/runtime/client").JsonValue;
        missingInformation: import("@prisma/client/runtime/client").JsonValue;
        recommendedActions: import("@prisma/client/runtime/client").JsonValue;
        provider: string;
        model: string;
        rawResponse: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
}
