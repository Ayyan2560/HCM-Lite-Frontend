import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate, authorize } from '../middleware/auth.mjs';
import { createAnnouncement, deleteAnnouncement, listAnnouncements } from '../controllers/announcementController.mjs';

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(listAnnouncements));
router.post('/', authorize('admin', 'hr'), asyncHandler(createAnnouncement));
router.delete('/:id', authorize('admin', 'hr'), asyncHandler(deleteAnnouncement));

export default router;
