import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { sendError } from '../utils/response';
import { UserRole } from '@prisma/client';

export interface AuthRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    stationId: string | null;
    isActive: boolean;
    refreshTokenVersion: number;
  };
}

// ── Authenticate: verify access token ────────────────────────────────────
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'No token provided', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as {
      sub: string;
      role: UserRole;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        stationId: true,
        isActive: true,
        refreshTokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'UNAUTHORIZED', 'User not found or inactive', 401);
      return;
    }

    req.user = user;
    next();
  } catch {
    sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
};

// ── RBAC permission matrix (single source of truth) ──────────────────────
type PermissionLevel = 'full' | 'read' | 'limited';
type Module =
  | 'expeditions'
  | 'cargo'
  | 'inventory'
  | 'personnel'
  | 'assets'
  | 'incidents'
  | 'alerts'
  | 'users';

const PERMISSIONS: Record<Module, Partial<Record<UserRole, PermissionLevel>>> = {
  expeditions: {
    admin: 'full',
    expedition_coordinator: 'full',
    logistics_officer: 'read',
    inventory_manager: 'read',
    personnel_coordinator: 'read',
    emergency_coordinator: 'read',
    station_ops: 'read',
  },
  cargo: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'full',
    inventory_manager: 'read',
    emergency_coordinator: 'read',
    station_ops: 'limited',
  },
  inventory: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    inventory_manager: 'full',
    emergency_coordinator: 'read',
    station_ops: 'limited',
  },
  personnel: {
    admin: 'full',
    expedition_coordinator: 'read',
    personnel_coordinator: 'full',
    emergency_coordinator: 'read',
    station_ops: 'limited',
  },
  assets: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    emergency_coordinator: 'read',
    station_ops: 'limited',
  },
  incidents: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    inventory_manager: 'read',
    personnel_coordinator: 'read',
    emergency_coordinator: 'full',
    station_ops: 'limited',
  },
  alerts: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    inventory_manager: 'read',
    personnel_coordinator: 'read',
    emergency_coordinator: 'read',
    station_ops: 'read',
  },
  users: {
    admin: 'full',
  },
};

export const authorize = (module: Module, requiredLevel: PermissionLevel = 'read') => {
  const levelRank: Record<PermissionLevel, number> = { read: 1, limited: 2, full: 3 };

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
      return;
    }

    const userLevel = PERMISSIONS[module][role];
    if (!userLevel || levelRank[userLevel] < levelRank[requiredLevel]) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};

export { PERMISSIONS };
