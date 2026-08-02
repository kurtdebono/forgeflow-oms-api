import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrderIntelligenceService } from './order-intelligence.service';

@Controller('orders/:orderId/intelligence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderIntelligenceController {
  constructor(
    private readonly orderIntelligenceService: OrderIntelligenceService,
  ) {}

  @Post('analysis')
  @Roles(UserRole.ADMIN)
  generateAnalysis(@Param('orderId') orderId: string) {
    return this.orderIntelligenceService.generateAnalysis(orderId);
  }

  @Get('analysis')
  @Roles(UserRole.ADMIN)
  getAnalysis(@Param('orderId') orderId: string) {
    return this.orderIntelligenceService.getAnalysisForOrder(orderId);
  }
}
