import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { markAllRead, markRead, myNotifications } from '../controllers/notificationController.mjs';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(myNotifications));
router.patch('/read-all', asyncHandler(markAllRead));
router.patch('/:id/read', asyncHandler(markRead));

export default router;
