import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize } from '../middleware/auth.mjs';
import {
  getOrganizationSettings, updateOrganizationSettings, listUsers, createHrAccount, setUserActive
} from '../controllers/orgController.mjs';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(getOrganizationSettings));
router.put('/', authorize('admin'), asyncHandler(updateOrganizationSettings));
router.get('/users', authorize('admin'), asyncHandler(listUsers));
router.post('/users', authorize('admin'), asyncHandler(createHrAccount));
router.patch('/users/:id', authorize('admin'), asyncHandler(setUserActive));

export default router;
