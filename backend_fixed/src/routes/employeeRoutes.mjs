import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize, requireEmployee } from '../middleware/auth.mjs';
import {
  createEmployee, deactivateEmployee, activateEmployee, employeeMeta, exportEmployees, getEmployee,
  importEmployees, listEmployees, myProfile, updateEmployee, updateMyProfile, uploadAvatar
} from '../controllers/employeeController.mjs';
import upload from '../middlewares/uploadMiddleware.js';

const router = Router();
router.use(authenticate);

router.get('/me', requireEmployee, asyncHandler(myProfile));
router.patch('/me', requireEmployee, asyncHandler(updateMyProfile));
router.post('/me/avatar', requireEmployee, upload.single('avatar'), asyncHandler(uploadAvatar));

router.get('/meta', authorize('admin', 'hr'), asyncHandler(employeeMeta));
router.get('/export', authorize('admin', 'hr'), asyncHandler(exportEmployees));
router.post('/import', authorize('admin', 'hr'), asyncHandler(importEmployees));

router.get('/', authorize('admin', 'hr'), asyncHandler(listEmployees));
router.post('/', authorize('admin', 'hr'), asyncHandler(createEmployee));
router.get('/:id', asyncHandler(getEmployee));
router.patch('/:id', authorize('admin', 'hr'), asyncHandler(updateEmployee));
router.post('/:id/deactivate', authorize('admin', 'hr'), asyncHandler(deactivateEmployee));
router.post('/:id/activate', authorize('admin', 'hr'), asyncHandler(activateEmployee));

export default router;
