import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AI_PROVIDER } from './ai-provider.interface';
import { FakeAIProvider } from './fake-ai.provider';
import { OrderAnalysisRepository } from './order-analysis.repository';
import { OrderIntelligenceController } from './order-intelligence.controller';
import { OrderIntelligenceService } from './order-intelligence.service';
import { OpenAIProvider } from './openai.provider';

@Module({
    imports: [OrdersModule],
    controllers: [OrderIntelligenceController],
    providers: [
        OrderIntelligenceService,
        OrderAnalysisRepository,
        {
            provide: AI_PROVIDER,
            useClass: 
                process.env.AI_PROVIDER === 'openai'
                    ? OpenAIProvider
                    : FakeAIProvider
        }
    ]
})
export class OrderIntelligenceModule {}