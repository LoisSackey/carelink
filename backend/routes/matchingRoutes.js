import express from 'express';
import {
  getMatchedCaregivers,
  getMatchScore,
  getAvailableCaregivers,
  getMatchingStats,
  testMatching,
} from '../controllers/matchingController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/caregivers', getAvailableCaregivers);
router.get('/stats', getMatchingStats);
router.get('/test', testMatching);

// Protected routes
router.post('/match', protectRoute, getMatchedCaregivers);
router.post('/score/:caregiverId', protectRoute, getMatchScore);

export default router;
