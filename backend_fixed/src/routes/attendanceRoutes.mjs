import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize, requireEmployee } from '../middleware/auth.mjs';
import {
  attendanceRecords, checkIn, checkOut, decideCorrection, hrOverview, listCorrections, myAttendance, requestCorrection
} from '../controllers/attendanceController.mjs';

const router = Router();
router.use(authenticate);

// Fixed-path routes must be declared before any /:id wildcard routes.
router.post('/check-in', requireEmployee, asyncHandler(checkIn));
router.post('/check-out', requireEmployee, asyncHandler(checkOut));
router.get('/me', requireEmployee, asyncHandler(myAttendance));
router.get('/records', authorize('admin', 'hr'), asyncHandler(attendanceRecords));

router.post('/corrections', requireEmployee, asyncHandler(requestCorrection));
router.get('/corrections', asyncHandler(listCorrections));
router.patch('/corrections/:id', authorize('admin', 'hr'), asyncHandler(decideCorrection));

router.get('/', authorize('admin', 'hr'), asyncHandler(hrOverview));

export default router;
