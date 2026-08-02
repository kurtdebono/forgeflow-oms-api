import { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const authUserSelect = {
  id: true,
  email: true,
  role: true,
  passwordHash: true,
  refreshTokenHash: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;
export type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;
