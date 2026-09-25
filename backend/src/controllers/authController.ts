import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { AuditLog } from '../models/Alert';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

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
  const { name, email, password, role, station } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    sendError(res, 'CONFLICT', 'Email already registered', 409);
    return;
  }

  const hashed = await bcrypt.hash(password, config.bcryptRounds);
  const user = await User.create({ name, email, password: hashed, role, station });

  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = signRefreshToken(user._id.toString(), user.refreshTokenVersion);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

  sendSuccess(res, {
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  }, 201);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    sendError(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
    return;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    sendError(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
    return;
  }

  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = signRefreshToken(user._id.toString(), user.refreshTokenVersion);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

  sendSuccess(res, {
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, station: user.station },
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

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive || user.refreshTokenVersion !== payload.version) {
      sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
      return;
    }

    const accessToken = signAccessToken(user._id.toString(), user.role);
    const newRefreshToken = signRefreshToken(user._id.toString(), user.refreshTokenVersion);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);

    sendSuccess(res, {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, station: user.station },
    });
  } catch {
    sendError(res, 'UNAUTHORIZED', 'Invalid or expired refresh token', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    // Increment version to invalidate all existing refresh tokens
    await User.findByIdAndUpdate(req.user._id, { $inc: { refreshTokenVersion: 1 } });
    await AuditLog.create({
      action: 'logout',
      entityType: 'User',
      entityId: req.user._id,
      performedBy: req.user._id,
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
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  sendSuccess(res, users);
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true }
  ).select('-password');
  if (!user) { sendError(res, 'NOT_FOUND', 'User not found', 404); return; }

  await AuditLog.create({
    action: 'update_role',
    entityType: 'User',
    entityId: user._id,
    performedBy: req.user!._id,
    changes: { role: { before: null, after: req.body.role } },
  });
  sendSuccess(res, user);
};

export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, $inc: { refreshTokenVersion: 1 } },
    { new: true }
  ).select('-password');
  if (!user) { sendError(res, 'NOT_FOUND', 'User not found', 404); return; }

  await AuditLog.create({
    action: 'deactivate_user',
    entityType: 'User',
    entityId: user._id,
    performedBy: req.user!._id,
  });
  sendSuccess(res, user);
};
