import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { publicUserSelect } from './selects/user.select';

@Injectable()
export class UsersRepository {
    constructor(private readonly prisma: PrismaService) {
        
    }

    create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({ 
            data,
            select: publicUserSelect
        });
    }

    findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id }
        });
    }

    findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }

    updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash }
        });
    }
}