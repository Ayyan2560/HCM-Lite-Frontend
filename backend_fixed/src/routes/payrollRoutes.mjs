import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize, requireEmployee } from '../middleware/auth.mjs';
import {
  createDraft, downloadPayslip, finalize, getPayroll, listPayrolls, myPayslips, updatePayrollNotes
} from '../controllers/payrollController.mjs';

const router = Router();
router.use(authenticate);

// Fixed-path routes must come before /:id wildcards.
router.get('/me/payslips', requireEmployee, asyncHandler(myPayslips));

router.get('/', authorize('admin', 'hr'), asyncHandler(listPayrolls));
router.post('/drafts', authorize('admin', 'hr'), asyncHandler(createDraft));

router.get('/:id/payslip/:employeeId', asyncHandler(downloadPayslip));
router.get('/:id', authorize('admin', 'hr'), asyncHandler(getPayroll));
router.patch('/:id', authorize('admin', 'hr'), asyncHandler(updatePayrollNotes));
router.post('/:id/finalize', authorize('admin'), asyncHandler(finalize));

export default router;
