import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {

    }

    @Post()
    @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
    create(
        @CurrentUser() user: CurrentUser,
        @Body() body: CreateOrderDto) {        
        return this.ordersService.create(user.userId, body);
    }

    @Get('my')
    @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
    findMyOrders(@CurrentUser() user: CurrentUser) {
        return this.ordersService.findByUserId(user.userId);
    }
    
    @Roles(UserRole.ADMIN)
    @Get(':id')
    findById(@Param('id') id: string) {
        return this.ordersService.findById(id);
    }

    @Get('user/:userId')
    findByUserId(@Param('userId') userId: string) {
        return this.ordersService.findByUserId(userId);
    }
}