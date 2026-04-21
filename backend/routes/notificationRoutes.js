import express from 'express';
import protectRoute from '../middleware/auth.js';
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  clearUnreadNotifications,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.post('/', protectRoute, createNotification);
router.get('/', protectRoute, getNotifications);
router.get('/unread/:userId', protectRoute, getUnreadCount);
router.put('/:id', protectRoute, markAsRead);
router.delete('/:id', protectRoute, deleteNotification);
router.put('/clear/:userId', protectRoute, clearUnreadNotifications);

export default router;
