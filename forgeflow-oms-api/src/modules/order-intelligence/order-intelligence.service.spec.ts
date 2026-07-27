import { BadGatewayException, NotFoundException } from "@nestjs/common";
import { Test } from '@nestjs/testing';
import { OrderAnalysisPriority, OrderStatus, Prisma } from '@prisma/client';
import { AI_PROVIDER } from "./ai-provider.interface";
import { OrderAnalysisRepository } from "./order-analysis.repository";
import { OrderIntelligenceService } from "./order-intelligence.service";
import { OrdersService } from "../orders/orders.service";
import { NotificationService } from "../notifications/notifications.service";

import type { AIProvider } from "./ai-provider.interface";
import { meta } from "zod/v4/core";

type OrdersServiceMock = jest.Mocked<
    Pick<OrdersService, 'findById'>
>;

type OrderAnalysisRepositoryMock = jest.Mocked<
    Pick<OrderAnalysisRepository, 'create' | 'findByOrderId'>
>;

type AIProviderMock = jest.Mocked<
    Pick<AIProvider, 'generateOrderAnalysis' | 'getMetadata'>
>;

type NotificationServiceMock = jest.Mocked<
    Pick<NotificationService, 'sendManualReviewAlert'>>;

describe('OrderIntelligenceService', () => {
    let service: OrderIntelligenceService;

    let ordersServiceMock: OrdersServiceMock;
    let orderAnalysisRepositoryMock: OrderAnalysisRepositoryMock;
    let aiProviderMock: AIProviderMock;
    let notificationServiceMock: NotificationServiceMock;

    beforeEach(async () => {
        ordersServiceMock = { 
            findById: jest.fn()
        };

        orderAnalysisRepositoryMock = {
            create: jest.fn(),
            findByOrderId: jest.fn()
        };

        aiProviderMock = {
            generateOrderAnalysis: jest.fn(),
            getMetadata: jest.fn().mockReturnValue({
                provider: 'fake',
                model: 'fake-order-analysis-v1',
            }),
        };

        notificationServiceMock = {
            sendManualReviewAlert: jest.fn()
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                OrderIntelligenceService,
                {
                    provide: OrdersService,
                    useValue: ordersServiceMock
                },
                {
                    provide: OrderAnalysisRepository,
                    useValue: orderAnalysisRepositoryMock
                },
                {
                    provide: AI_PROVIDER,
                    useValue: aiProviderMock
                },
                {
                    provide: NotificationService,
                    useValue: notificationServiceMock
                }
            ]
        }).compile();

        service = moduleRef.get(OrderIntelligenceService);
    });

    it('generates, validates and stores an order analysis', async () => {
        const order: any = {
            id: 'order-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(100),
            user: {
                email: 'customer@example.com'
            },
            items: [
                {
                    productId: 'product-1',
                    quantity: 2,
                    unitPrice: new Prisma.Decimal(50),
                    product: {
                        name: 'Keyboard'
                    }
                }
            ]
        };

        const aiResult = {
            summary: 'Customer ordered two keyboards',
            priority: 'MEDIUM' as const,
            riskFlags: [],
            missingInformation: [],
            recommendedActions: ['Proceed with normal fulfilment checks.'],
            customerExplanation: 'Your order is being processed.'
        };

        const storedAnalysis = {
            id: 'analysis-1',
            orderId: 'order-1',
            ...aiResult,
            priority: OrderAnalysisPriority.MEDIUM,
            provider: 'fake',
            model: 'fake-order-analysis-v1',
            rawResponse: aiResult,
            createdAt: new Date()
        };

        const fakeMetadata = {
            provider: 'fake',
            model: 'fake-order-analysis-v1'
        };

        ordersServiceMock.findById.mockResolvedValue(order);
        aiProviderMock.generateOrderAnalysis.mockResolvedValue(aiResult);
        aiProviderMock.getMetadata.mockReturnValue(fakeMetadata);
        orderAnalysisRepositoryMock.create.mockResolvedValue(storedAnalysis as any);

        const result = await service.generateAnalysis('order-1');

        expect(ordersServiceMock.findById).toHaveBeenCalledWith('order-1');

        expect(aiProviderMock.generateOrderAnalysis).toHaveBeenCalledWith({
            orderId: 'order-1',
            orderStatus: OrderStatus.PENDING,
            totalAmount: '100',
            customerEmail: 'customer@example.com',
            items: [
                {
                    productId: 'product-1',
                    productName: 'Keyboard',
                    quantity: 2,
                    unitPrice: '50'
                }
            ]
        });

        expect(orderAnalysisRepositoryMock.create).toHaveBeenCalledWith({
            orderId: 'order-1',
            summary: aiResult.summary,
            priority: OrderAnalysisPriority.MEDIUM,
            riskFlags: aiResult.riskFlags,
            missingInformation: aiResult.missingInformation,
            recommendedActions: aiResult.recommendedActions,
            customerExplanation: aiResult.customerExplanation,
            provider: 'fake',
            model: 'fake-order-analysis-v1',
            rawResponse: aiResult
        });

        expect(result).toBe(storedAnalysis);
    });

    it('throws NotFoundException when the order does not exist', async () => {
        ordersServiceMock.findById.mockResolvedValue(null as any);

        await expect(
            service.generateAnalysis('missing-order-1')
        ).rejects.toThrow(NotFoundException);

        expect(aiProviderMock.generateOrderAnalysis).not.toHaveBeenCalled();
        expect(orderAnalysisRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('throws BadGatewayException and does not store when AI output is invalid', async () => {
        const order: any = {
            id: 'order-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(100),
            user: {
                email: 'customer@example.com'
            },
            items: []
        };

        ordersServiceMock.findById.mockResolvedValue(order);
    
        aiProviderMock.generateOrderAnalysis.mockResolvedValue({
            summary: '',
            priority: 'URGENT',
            riskFlags: 'not-an-array',
            missingInformation: [],
            recommendedActions: [],
            customerExplanation: ''
        } as any);

        await expect(
            service.generateAnalysis('order-1')
        ).rejects.toThrow(BadGatewayException);

        expect(orderAnalysisRepositoryMock.create).not.toHaveBeenCalled();
    });
        
    it('returns analyses for an order', async () => {
        const analyses: any[] = [
        {
            id: 'analysis-1',
            orderId: 'order-1',
            summary: 'Analysis summary',
        },
        ];

        orderAnalysisRepositoryMock.findByOrderId.mockResolvedValue(analyses);

        const result = await service.getAnalysisForOrder('order-1');

        expect(orderAnalysisRepositoryMock.findByOrderId).toHaveBeenCalledWith(
        'order-1',
        );

        expect(result).toBe(analyses);
    });

    it('sends a manual review alert when generated analysis is HIGH priority', async () => {
        const order: any = {
            id: 'order-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(999),
            user: {
                email: 'customer@example.com'
            },
            items: [
                {
                    productId: 'product-1',
                    quantity: 2,
                    unitPrice: new Prisma.Decimal(499.5),
                    product: {
                        name: 'Webcam'
                    }
                }
            ]
        };

        const aiResult = {
            summary: 'High value order requires review',
            priority: 'HIGH' as const,
            riskFlags: ['High value order', 'Missing details'],
            missingInformation: ['Shipping address'],
            recommendedActions: ['Review before fulfilment.'],
            customerExplanation: 'Your order is being reviewed by our operations team.'
        };

        const storedAnalysis = {
            id: 'analysis-1',
            orderId: order.id,
            ...aiResult,
            provider: 'openai',
            model: 'gpt-5-mini',
            rawResponse: aiResult,
            createdAt: new Date()
        };

        const metadata = {
            provider: 'openai',
            model: 'gpt-5-mini'
        };

        ordersServiceMock.findById.mockResolvedValue(order);
        aiProviderMock.generateOrderAnalysis.mockResolvedValue(aiResult);
        aiProviderMock.getMetadata.mockReturnValue(metadata);
        orderAnalysisRepositoryMock.create.mockResolvedValue(storedAnalysis as any);

        const result = await service.generateAnalysis(order.id);

        expect(orderAnalysisRepositoryMock.create).toHaveBeenCalled();

        expect(notificationServiceMock.sendManualReviewAlert).toHaveBeenCalledWith({
            orderId: order.id,
            priority: 'HIGH',
            summary: aiResult.summary,
            riskFlags: aiResult.riskFlags,
            recommendedActions: aiResult.recommendedActions
        });

        expect(result).toBe(storedAnalysis);
    });

    it('does not send a manual review alert when analysis priority is not HIGH', async () => {
        const order: any = {
            id: 'order-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(100),
            user: {
            email: 'customer@example.com',
            },
            items: [],
        };

        const aiResult = {
            summary: 'Normal order.',
            priority: 'MEDIUM' as const,
            riskFlags: [],
            missingInformation: [],
            recommendedActions: ['Proceed with normal checks.'],
            customerExplanation: 'Your order is being processed.',
        };

        const storedAnalysis = {
            id: 'analysis-1',
            orderId: order.id,
            ...aiResult,
            provider: 'openai',
            model: 'gpt-5-mini',
            rawResponse: aiResult,
            createdAt: new Date(),
        };

        ordersServiceMock.findById.mockResolvedValue(order);
        aiProviderMock.generateOrderAnalysis.mockResolvedValue(aiResult);
        aiProviderMock.getMetadata.mockReturnValue({
            provider: 'openai',
            model: 'gpt-5-mini',
        });
        orderAnalysisRepositoryMock.create.mockResolvedValue(storedAnalysis as any);

        const result = await service.generateAnalysis(order.id);

        expect(notificationServiceMock.sendManualReviewAlert).not.toHaveBeenCalled();
        expect(result).toBe(storedAnalysis);
    });

    it('still returns stored analysis when manual review alert fails', async () => {
        const order: any = {
            id: 'order-1',
            status: OrderStatus.PENDING,
            totalAmount: new Prisma.Decimal(999),
            user: {
            email: 'customer@example.com',
            },
            items: [],
        };

        const aiResult = {
            summary: 'High priority order.',
            priority: 'HIGH' as const,
            riskFlags: ['High value order'],
            missingInformation: [],
            recommendedActions: ['Review manually.'],
            customerExplanation: 'Your order is being reviewed.',
        };

        const storedAnalysis = {
            id: 'analysis-1',
            orderId: order.id,
            ...aiResult,
            provider: 'openai',
            model: 'gpt-5-mini',
            rawResponse: aiResult,
            createdAt: new Date(),
        };

        ordersServiceMock.findById.mockResolvedValue(order);
        aiProviderMock.generateOrderAnalysis.mockResolvedValue(aiResult);
        aiProviderMock.getMetadata.mockReturnValue({
            provider: 'openai',
            model: 'gpt-5-mini',
        });
        orderAnalysisRepositoryMock.create.mockResolvedValue(storedAnalysis as any);

        notificationServiceMock.sendManualReviewAlert.mockRejectedValue(
            new Error('Email provider unavailable'),
        );

        const result = await service.generateAnalysis(order.id);

        expect(notificationServiceMock.sendManualReviewAlert).toHaveBeenCalled();
        expect(result).toBe(storedAnalysis);
        });
});