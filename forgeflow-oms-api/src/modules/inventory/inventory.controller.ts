import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryService } from './inventory.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() body: CreateInventoryDto) {
    return this.inventoryService.create(body);
  }

  @Get(':productId')
  findByProductId(@Param('productId') productId: string) {
    return this.inventoryService.findByProductId(productId);
  }
}
