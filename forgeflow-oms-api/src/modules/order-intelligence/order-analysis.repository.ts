import { Injectable } from '@nestjs/common';
import { OrderAnalysisPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class OrderAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

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
  }) {
    return this.prisma.orderAnalysis.create({
      data: {
        order: {
          connect: {
            id: data.orderId,
          },
        },
        summary: data.summary,
        priority: data.priority,
        riskFlags: data.riskFlags,
        missingInformation: data.missingInformation,
        recommendedActions: data.recommendedActions,
        customerExplanation: data.customerExplanation,
        provider: data.provider,
        model: data.model,
        rawResponse: data.rawResponse,
      },
    });
  }

  findByOrderId(orderId: string) {
    return this.prisma.orderAnalysis.findMany({
      where: {
        orderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
