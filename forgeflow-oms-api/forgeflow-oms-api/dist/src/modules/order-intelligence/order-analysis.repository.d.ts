import { OrderAnalysisPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
export declare class OrderAnalysisRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: {
        orderId: string;
        summary: string;
        priority: OrderAnalysisPriority;
        riskFlags: Prisma.InputJsonValue;
        missingInformation: Prisma.InputJsonValue;
        recommendedActions: Prisma.InputJsonValue;
        customerExplanation: string;
        provider: string;
        model: string;
        rawResponse?: Prisma.InputJsonValue;
    }): Prisma.Prisma__OrderAnalysisClient<{
        id: string;
        createdAt: Date;
        orderId: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        summary: string;
        customerExplanation: string;
        riskFlags: Prisma.JsonValue;
        missingInformation: Prisma.JsonValue;
        recommendedActions: Prisma.JsonValue;
        provider: string;
        model: string;
        rawResponse: Prisma.JsonValue | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findByOrderId(orderId: string): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        orderId: string;
        priority: import("@prisma/client").$Enums.OrderAnalysisPriority;
        summary: string;
        customerExplanation: string;
        riskFlags: Prisma.JsonValue;
        missingInformation: Prisma.JsonValue;
        recommendedActions: Prisma.JsonValue;
        provider: string;
        model: string;
        rawResponse: Prisma.JsonValue | null;
    }[]>;
}
