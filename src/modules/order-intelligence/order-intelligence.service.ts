import {
    Inject,
    Injectable,
    NotFoundException,
    BadGatewayException
} from '@nestjs/common';
import { OrderAnalysisPriority } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import {
    AI_PROVIDER,
    OrderAnalysisInput
} from './ai-provider.interface';
import { OrderAnalysisRepository } from './order-analysis.repository';
import { orderAnalysisSchema } from './schemas/order-analysis.schema';

import type { AIProvider } from './ai-provider.interface';

@Injectable()
export class OrderIntelligenceService {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly orderAnalysisRepository: OrderAnalysisRepository,
        @Inject(AI_PROVIDER)
        private readonly aiProvider: AIProvider
    ) {}

    async generateAnalysis(orderId: string) {
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
                unitPrice: item.unitPrice.toString()
            }))
        };

        const aiResult = await this.aiProvider.generateOrderAnalysis(input);

        const validationResult = orderAnalysisSchema.safeParse(aiResult);

        if(!validationResult.success) {
            throw new BadGatewayException(
                'AI Provider return an invalid order analaysis response.'
            );
        }

        const validated = validationResult.data;

        return this.orderAnalysisRepository.create({
            orderId: order.id,
            summary: validated.summary,
            priority: validated.priority as OrderAnalysisPriority,
            riskFlags: validated.riskFlags,
            missingInformation: validated.missingInformation,
            recommendedActions: validated.recommendedActions,
            customerExplanation: validated.customerExplanation,
            provider: 'fake',
            model: 'fake-order-analysis-v1',
            rawResponse: validated
        });
    }

    getAnalysisForOrder(orderId: string) {
        return this.orderAnalysisRepository.findByOrderId(orderId);
    }
}