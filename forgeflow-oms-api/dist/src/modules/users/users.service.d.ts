import { Prisma } from '@prisma/client';
import { UsersRepository } from './users.repository';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    create(data: Prisma.UserCreateInput): Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findById(id: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        refreshTokenHash: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByEmail(email: string): Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        passwordHash: string;
        refreshTokenHash: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
