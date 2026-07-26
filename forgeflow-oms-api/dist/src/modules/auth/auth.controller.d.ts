import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: RegisterDto): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
    login(body: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: CurrentUser): Promise<{
        message: string;
    }>;
    refresh(body: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    me(user: CurrentUser): CurrentUser;
}
