import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize } from '../middleware/auth.mjs';
import { listAuditLogs } from '../controllers/auditController.mjs';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/', asyncHandler(listAuditLogs));

export default router;
