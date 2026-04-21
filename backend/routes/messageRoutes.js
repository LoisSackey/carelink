import express from 'express';
import {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  markAsRead,
  deleteMessage,
} from '../controllers/messageController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// All message routes require authentication
router.use(protectRoute);

// Send a new message
router.post('/send', sendMessage);

// Get conversation with a specific user
router.get('/conversation/:userId', getConversation);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Mark messages from a user as read
router.put('/read/:userId', markAsRead);

// Delete a message
router.delete('/:messageId', deleteMessage);

export default router;