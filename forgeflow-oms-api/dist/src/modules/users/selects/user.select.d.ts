import { Prisma } from '@prisma/client';
export declare const publicUserSelect: {
    id: true;
    email: true;
    role: true;
    createdAt: true;
    updatedAt: true;
};
export declare const authUserSelect: {
    id: true;
    email: true;
    role: true;
    passwordHash: true;
    refreshTokenHash: true;
    createdAt: true;
    updatedAt: true;
};
export type PublicUser = Prisma.UserGetPayload<{
    select: typeof publicUserSelect;
}>;
export type AuthUser = Prisma.UserGetPayload<{
    select: typeof authUserSelect;
}>;
