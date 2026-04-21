import express from 'express';
import multer from 'multer';
import protectRoute from '../middleware/auth.js';
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  updatePayment,
  getPaymentInfo,
  uploadReceipt,
  confirmPaymentReceipt,
} from '../controllers/bookingController.js';

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs allowed'));
    }
  },
});

// Booking creation may be done by guests; attachUser parses token if present but doesn't require it
import attachUser from '../middleware/attachUser.js';

// All booking routes require authentication except creation, which is optional
router.post('/', attachUser, createBooking);
// listings require authentication (so guests can't enumerate)
router.get('/', protectRoute, getBookings);
// individual booking retrieval should be allowed even for guest orderers,
// so we attach user if present but do not demand it
router.get('/:id', attachUser, getBookingById);
router.put('/:id', protectRoute, updateBooking);
router.delete('/:id', protectRoute, deleteBooking);

// Payment routes
router.put('/:id/payment', protectRoute, updatePayment);
router.get('/:id/payment', protectRoute, getPaymentInfo);
router.post('/:id/receipt', protectRoute, upload.single('receipt'), uploadReceipt);
router.put('/:id/confirm-payment', protectRoute, confirmPaymentReceipt);

export default router;
