import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const signAccessToken = (userId: string, role: string) =>
  jwt.sign({ sub: userId, role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  });

const signRefreshToken = (userId: string, version: number) =>
  jwt.sign({ sub: userId, version }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.env === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, stationId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'CONFLICT', 'Email already registered', 409);
    return;
  }

  const hashed = await bcrypt.hash(password, config.bcryptRounds);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role as UserRole, stationId },
    select: { id: true, name: true, email: true, role: true, stationId: true },
  });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, 0);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken, user }, 201);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    sendError(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
    return;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    sendError(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
    return;
  }

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.refreshTokenVersion);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, stationId: user.stationId },
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    sendError(res, 'UNAUTHORIZED', 'No refresh token', 401);
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret) as {
      sub: string;
      version: number;
    };

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.refreshTokenVersion !== payload.version) {
      sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
      return;
    }

    const accessToken = signAccessToken(user.id, user.role);
    const newRefreshToken = signRefreshToken(user.id, user.refreshTokenVersion);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);

    sendSuccess(res, {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, stationId: user.stationId },
    });
  } catch {
    sendError(res, 'UNAUTHORIZED', 'Invalid or expired refresh token', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshTokenVersion: { increment: 1 } },
    });
    await prisma.auditLog.create({
      data: {
        action: 'logout',
        entityType: 'User',
        entityId: req.user.id,
        performedBy: req.user.id,
      },
    });
  }
  res.clearCookie('refreshToken', COOKIE_OPTS);
  sendSuccess(res, { message: 'Logged out' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, { user: req.user });
};

// ── Admin user management ──────────────────────────────────────────────────

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, stationId: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, users);
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role as UserRole },
    select: { id: true, name: true, email: true, role: true },
  });
  await prisma.auditLog.create({
    data: {
      action: 'update_role',
      entityType: 'User',
      entityId: user.id,
      performedBy: req.user!.id,
      afterJson: { role: req.body.role },
    },
  });
  sendSuccess(res, user);
};

export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false, refreshTokenVersion: { increment: 1 } },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  await prisma.auditLog.create({
    data: {
      action: 'deactivate_user',
      entityType: 'User',
      entityId: user.id,
      performedBy: req.user!.id,
    },
  });
  sendSuccess(res, user);
};
