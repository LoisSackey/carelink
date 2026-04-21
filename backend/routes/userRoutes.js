import express from 'express';
import multer from 'multer';
import protectRoute from '../middleware/auth.js';
import {
  registerUser,
  loginUser,
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  updateCaregiverRates,
  getCaregivers,
  getCaregiversByLocation,
  getAllUsers,
  getPendingCaregivers,
  approveCaregivver,
  rejectCaregivver,
  deleteUser,
  addAdmin,
  addUser,
  googleAuth,
  editUserAccount,
  deactivateUser,
  activateUser,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  requestDeleteAccount,
  approveDeleteAccount,
  rejectDeleteAccount,
  findNearbyCaregiversByProximity,
  findNearestCaregiver,
  validateLocationProximity,
  registerCaregiverWithDocs,
  uploadProfilePicture,
  deleteProfilePictureEndpoint,
  removeProfilePicture,
} from '../controllers/userController.js';

// configure multer same as credentials route
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

// Configure multer for profile pictures (images only)
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile pictures
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid image type. Allowed: JPG, PNG, WEBP'));
  },
});

const router = express.Router();

// Public routes - specific routes BEFORE general parameter routes
// Allow optional profile picture upload during family registration
router.post('/register', profilePictureUpload.single('profilePicture'), registerUser);
// allow caregiver registration with credential files in same request
const caregiverUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX'));
    }
  },
}).fields([
  { name: 'credentials', maxCount: 5 },
  { name: 'profilePicture', maxCount: 1 }
]);

router.post('/register-caregiver', caregiverUpload, registerCaregiverWithDocs);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/caregivers/search/:location', getCaregiversByLocation); // Location-based search - MUST be before /caregivers
router.get('/caregivers/nearby/:location', findNearbyCaregiversByProximity); // Proximity-based search
router.get('/caregiver/nearest/:location', findNearestCaregiver); // Find nearest single caregiver
router.get('/validate-proximity', validateLocationProximity); // Validate proximity between locations
router.get('/caregivers', getCaregivers);

// Public route for viewing caregiver profiles (for booking)
router.get('/public/:id', getPublicUserProfile);

// Password reset routes (public) - SPECIFIC ROUTES BEFORE /:id
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-reset-token', verifyResetToken);

// Admin specific routes - BEFORE /:id parameter routes
router.post('/admin/add', protectRoute, addAdmin);
router.post('/user/add', protectRoute, addUser);
router.get('/pending/caregivers', protectRoute, getPendingCaregivers);

// Account deletion routes - SPECIFIC ROUTES BEFORE /:id parameter routes
router.post('/:id/request-deletion', protectRoute, requestDeleteAccount);
router.put('/:id/approve-deletion', protectRoute, approveDeleteAccount);
router.put('/:id/reject-deletion', protectRoute, rejectDeleteAccount);

// Profile picture upload route - SPECIFIC ROUTE BEFORE /:id parameter routes
router.post('/:id/upload-profile-picture', protectRoute, profilePictureUpload.single('profilePicture'), uploadProfilePicture);
router.delete('/:id/profile-picture', protectRoute, deleteProfilePictureEndpoint);
router.delete('/:id/remove-profile-picture', protectRoute, removeProfilePicture);

// Protected routes with :id parameter - MUST COME LAST
router.get('/:id', protectRoute, getUserProfile);
router.put('/:id', protectRoute, updateUserProfile);
router.put('/:id/rates', protectRoute, updateCaregiverRates);
router.put('/:id/approve', protectRoute, approveCaregivver);
router.delete('/:id/reject', protectRoute, rejectCaregivver);
router.delete('/:id', protectRoute, deleteUser);
router.put('/:id/edit', protectRoute, editUserAccount);
router.put('/:id/deactivate', protectRoute, deactivateUser);
router.put('/:id/activate', protectRoute, activateUser);

// Admin routes - general list
router.get('/', protectRoute, getAllUsers);

export default router;
