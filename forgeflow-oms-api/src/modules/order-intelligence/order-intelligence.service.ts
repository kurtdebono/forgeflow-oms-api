import {
  Inject,
  Injectable,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { AI_PROVIDER, OrderAnalysisInput } from './ai-provider.interface';
import { OrderAnalysisRepository } from './order-analysis.repository';
import { orderAnalysisSchema } from './schemas/order-analysis.schema';
import { NotificationService } from '../notifications/notifications.service';
import type { OrderAnalysis } from '@prisma/client';

import type { AIProvider } from './ai-provider.interface';

@Injectable()
export class OrderIntelligenceService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderAnalysisRepository: OrderAnalysisRepository,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AIProvider,
    private readonly notificationService: NotificationService,
  ) {}

  async generateAnalysis(orderId: string): Promise<OrderAnalysis> {
    const order = await this.ordersService.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const input: OrderAnalysisInput = {
      orderId: order.id,
      orderStatus: order.status,
      totalAmount: order.totalAmount.toString(),
      customerEmail: order.user?.email,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name ?? 'Unknown product',
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    };

    const aiResult = await this.aiProvider.generateOrderAnalysis(input);

    const validationResult = orderAnalysisSchema.safeParse(aiResult);
    const metadata = this.aiProvider.getMetadata();

    if (!validationResult.success) {
      throw new BadGatewayException(
        'AI Provider return an invalid order analysis response.',
      );
    }

    const validated = validationResult.data;

    const analysis = this.orderAnalysisRepository.create({
      orderId: order.id,
      summary: validated.summary,
      priority: validated.priority,
      riskFlags: validated.riskFlags,
      missingInformation: validated.missingInformation,
      recommendedActions: validated.recommendedActions,
      customerExplanation: validated.customerExplanation,
      provider: metadata.provider,
      model: metadata.model,
      rawResponse: validated,
    });

    if (validated.priority === 'HIGH') {
      try {
        await this.notificationService.sendManualReviewAlert({
          orderId: order.id,
          priority: validated.priority,
          summary: validated.summary,
          riskFlags: validated.riskFlags,
          recommendedActions: validated.recommendedActions,
        });
      } catch (error) {
        console.error('Failed to send manual review alert', error);
      }
    }

    return analysis;
  }

  getAnalysisForOrder(orderId: string) {
    return this.orderAnalysisRepository.findByOrderId(orderId);
  }
}
