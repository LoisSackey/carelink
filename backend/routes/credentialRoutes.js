import express from 'express';
import multer from 'multer';
import {
  uploadCredential,
  getCaregiverCredentials,
  getCredentialStatus,
  verifyCredential,
  verifyCredentialBlockchain,
  deleteCredential,
  getPendingCredentials,
  downloadCredentialFile,
  getAllCredentialsForAdmin,
} from '../controllers/credentialController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads - use memoryStorage and set limits
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Middleware to handle multipart form data with fields
const handleMultipart = (req, res, next) => {
  upload.single('credential')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
};

// Public routes (protected by auth)
router.post('/upload', protectRoute, handleMultipart, uploadCredential);

// Admin routes (must be BEFORE /:caregiverId to avoid catch-all match)
router.get('/admin/pending', protectRoute, getPendingCredentials);
router.get('/admin/all', protectRoute, getAllCredentialsForAdmin);
router.get('/download/:credentialId', protectRoute, downloadCredentialFile);

// Caregiver specific routes
router.get('/:caregiverId', protectRoute, getCaregiverCredentials);
router.get('/status/:caregiverId', getCredentialStatus);
router.delete('/:credentialId', protectRoute, deleteCredential);

// Verification routes
router.put('/verify/:credentialId', protectRoute, verifyCredential);
router.post('/verify-blockchain/:credentialId', protectRoute, verifyCredentialBlockchain);

export default router;
