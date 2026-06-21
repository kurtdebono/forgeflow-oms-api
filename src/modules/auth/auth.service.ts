import {
    ConflictException,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) {}

    async register(data: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(data.email);

        if (existingUser) {
            throw new ConflictException(`User with email ${data.email} already exists.`);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        return this.usersService.create({
            email: data.email,
            passwordHash
        });
    }

    async validateCredentials(data: LoginDto) {
        const user = await this.usersService.findByEmail(data.email);

        if(!user) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

        if(!isValidPassword) {
            throw new UnauthorizedException('Invalid credentials.');
        }

        return user;
    }

    async login(data: LoginDto) {
        const user = await this.validateCredentials(data);

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };

        return {
            accessToken: await this.jwtService.signAsync(payload)
        };
    }
}