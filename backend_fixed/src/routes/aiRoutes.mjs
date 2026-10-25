import { Router } from 'express';
import { asyncHandler } from '../utils/http.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { aiLimiter } from '../middleware/rateLimit.mjs';
import { askAssistant, assistantStatus, leaveSuggestion } from '../controllers/aiController.mjs';

const router = Router();
router.use(authenticate);
router.get('/status', asyncHandler(assistantStatus));
router.post('/chat', aiLimiter, asyncHandler(askAssistant));
router.post('/leave-suggestion', aiLimiter, asyncHandler(leaveSuggestion));

export default router;
