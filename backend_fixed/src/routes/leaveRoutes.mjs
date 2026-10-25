import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize, requireEmployee } from '../middleware/auth.mjs';
import {
  applyLeave, cancelLeave, decide, employeeBalances, listLeaves, myLeaves
} from '../controllers/leaveController.mjs';

const router = Router();
router.use(authenticate);

// Fixed-path routes must come before /:id wildcards.
router.get('/me', requireEmployee, asyncHandler(myLeaves));
router.post('/', requireEmployee, asyncHandler(applyLeave));

router.get('/balances/:employeeId', authorize('admin', 'hr'), asyncHandler(employeeBalances));
router.get('/', authorize('admin', 'hr'), asyncHandler(listLeaves));

router.patch('/:id/cancel', requireEmployee, asyncHandler(cancelLeave));
router.patch('/:id/decision', authorize('admin', 'hr'), asyncHandler(decide));

export default router;
