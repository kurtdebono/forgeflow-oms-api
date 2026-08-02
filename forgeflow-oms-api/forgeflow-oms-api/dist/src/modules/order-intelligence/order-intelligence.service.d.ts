import { OrdersService } from '../orders/orders.service';
import { OrderAnalysisRepository } from './order-analysis.repository';
import { NotificationService } from '../notifications/notifications.service';
import type { AIProvider } from './ai-provider.interface';
export declare class OrderIntelligenceService {
    private readonly ordersService;
    private readonly orderAnalysisRepository;
    private readonly aiProvider;
    private readonly notificationService;
    constructor(ordersService: OrdersService, orderAnalysisRepository: OrderAnalysisRepository, aiProvider: AIProvider, notificationService: NotificationService);
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
    getAnalysisForOrder(orderId: string): import("@prisma/client").Prisma.PrismaPromise<{
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
