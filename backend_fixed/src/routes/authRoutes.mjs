import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { authLimiter } from '../middleware/rateLimit.mjs';
import {
  changePassword, login, logout, me, setup, setupStatus
} from '../controllers/authController.mjs';

const router = Router();
router.get('/setup-status', asyncHandler(setupStatus));
router.post('/setup', authLimiter, asyncHandler(setup));
router.post('/login', authLimiter, asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
router.post('/change-password', authenticate, asyncHandler(changePassword));
router.post('/logout', authenticate, asyncHandler(logout));

export default router;
