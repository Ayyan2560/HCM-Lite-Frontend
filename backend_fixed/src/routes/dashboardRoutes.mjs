import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize } from '../middleware/auth.mjs';
import { employeeDashboard, overview } from '../controllers/dashboardController.mjs';

const router = Router();
router.use(authenticate);
router.get('/overview', authorize('admin', 'hr'), asyncHandler(overview));
router.get('/me', asyncHandler(employeeDashboard));

export default router;
