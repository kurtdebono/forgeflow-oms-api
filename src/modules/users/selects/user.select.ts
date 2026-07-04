import { Prisma } from '@prisma/client';

export const publicUserSelect = {
    id: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.UserSelect;