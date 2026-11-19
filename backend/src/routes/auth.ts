import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '../config';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { refreshTokenMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['doctor', 'nurse', 'patient']).optional(),
});

function generateAccessToken(user: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

function generateRefreshToken(): string {
  return uuidv4();
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });
}

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = loginSchema.parse(req.body);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
      expiresIn: rememberMe ? 60 * 60 * 24 * 7 : 15 * 60,
    },
  });
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role } = registerSchema.parse(req.body);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    name,
    role: role || 'patient',
  }).returning();

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
    },
  });
}));

router.post('/refresh', refreshTokenMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { refreshToken } = req.body;

  await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));

  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(req.user!.id, newRefreshToken);

  const accessToken = generateAccessToken(req.user!);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    },
  });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }

  res.json({ success: true, message: 'Logged out successfully' });
}));

router.get('/me', asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatar: users.avatar,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  res.json({ success: true, data: user });
}));

export { router as authRoutes };