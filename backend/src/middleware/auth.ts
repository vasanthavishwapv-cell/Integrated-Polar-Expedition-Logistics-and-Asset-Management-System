import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser, UserRole } from '../models/User';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: IUser;
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

    const user = await User.findById(payload.sub).select('-password');
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
// Maps module → roles allowed to perform the action level
// Levels: 'full' | 'read' | 'limited' | none (absence = denied)
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
    station_ops: 'limited', // read + receive
  },
  inventory: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    inventory_manager: 'full',
    emergency_coordinator: 'read',
    station_ops: 'limited', // read + record consumption
  },
  personnel: {
    admin: 'full',
    expedition_coordinator: 'read',
    personnel_coordinator: 'full',
    emergency_coordinator: 'read',
    station_ops: 'limited', // read own + station roster
  },
  assets: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    emergency_coordinator: 'read',
    station_ops: 'limited', // log faults
  },
  incidents: {
    admin: 'full',
    expedition_coordinator: 'read',
    logistics_officer: 'read',
    inventory_manager: 'read',
    personnel_coordinator: 'read',
    emergency_coordinator: 'full',
    station_ops: 'limited', // create + read
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
