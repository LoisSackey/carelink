import express from 'express';
import protectRoute from '../middleware/auth.js';
import {
  createContact,
  getAllContacts,
  getContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController.js';

const router = express.Router();

// Public endpoint to submit contact form
router.post('/', createContact);

// Admin endpoints - require authentication
router.get('/', protectRoute, getAllContacts);
router.get('/:id', protectRoute, getContact);
router.put('/:id', protectRoute, updateContact);
router.delete('/:id', protectRoute, deleteContact);

export default router;
