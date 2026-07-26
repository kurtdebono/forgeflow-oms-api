import { BadRequestException, Headers, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

    @Get()
    @Roles(UserRole.ADMIN)
    get() {
        return this.ordersService.get();
    }

    @Post()
    @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
    create(
        @CurrentUser() user: CurrentUser,
        @Body() body: CreateOrderDto,
        @Headers('idempotency-key') idempotencyKey?: string) {            
        if(!idempotencyKey?.trim()) {
            throw new BadRequestException('Idempotency-key header is required');
        }
        return this.ordersService.create(
            user.userId, 
            body,
            idempotencyKey.trim()
        );
    }

    @Get('my')
    @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
    findMyOrders(@CurrentUser() user: CurrentUser) {
        return this.ordersService.findByUserId(user.userId);
    }    

    @Post(':id/confirm')
    @Roles(UserRole.ADMIN)
    confirm(@Param('id') id: string) {
        return this.ordersService.confirm(id);
    }

    @Post(':id/cancel')
    @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
    cancel(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUser
    ) {
        return this.ordersService.cancel(id, { 
            userId: user.userId, 
            role: user.role as UserRole
        });
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.ordersService.findById(id);
    }

    @Get('user/:userId')
    findByUserId(@Param('userId') userId: string) {
        return this.ordersService.findByUserId(userId);
    }
}