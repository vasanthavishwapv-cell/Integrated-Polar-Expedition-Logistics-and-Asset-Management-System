import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/schemas';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, auth.getMe);

// Admin user management
router.get('/users', authenticate, authorize('users', 'full'), auth.getUsers);
router.put('/users/:id/role', authenticate, authorize('users', 'full'), auth.updateUserRole);
router.put('/users/:id/deactivate', authenticate, authorize('users', 'full'), auth.deactivateUser);

export default router;
