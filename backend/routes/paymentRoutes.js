import express from 'express';
import { initializePayment, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

// Initialize a Paystack transaction for a booking
router.post('/initialize', initializePayment);

// Verify a Paystack transaction by reference
router.get('/verify/:reference', verifyPayment);

export default router;
