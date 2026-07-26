import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    create(data: Prisma.UserCreateInput) {
        return this.usersRepository.create(data);
    }

    async findById(id: string) {
        const user = await this.usersRepository.findById(id);
        
        if (!user) {
            throw new NotFoundException(`User with id ${id} was not found.`);
        }

        return user;
    }

    findByEmail(email: string) {
        return this.usersRepository.findByEmail(email);
    }

    updateRefreshTokenHash(
        userId: string, 
        refreshTokenHash: string | null
    ) {
        return this.usersRepository.updateRefreshTokenHash(userId, refreshTokenHash);
    }
}