import User from '../models/User.js';
import Credential from '../models/Credential.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { saveProfilePicture, deleteProfilePicture, saveCredentialFile } from '../utils/uploadUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helpers copied from credentialController
const generateBlockchainHash = (fileBuffer) => {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

const validateCredentialFile = (file) => {
  const maxSize = 10 * 1024 * 1024;
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit');
  }
  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX');
  }
};

// upload utilities (local or S3) are provided by ../utils/uploadUtils.js

// Create JWT Token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper function to calculate caregiver ratings from bookings
const calculateCaregiverRating = async (caregiverId) => {
  try {
    const bookings = await Booking.find({
      caregiverId: caregiverId,
      status: 'completed',
      rating: { $exists: true, $ne: null }
    });

    if (bookings.length === 0) {
      return {
        rating: 0,
        reviewCount: 0,
        totalReviews: 0
      };
    }

    const averageRating = bookings.reduce((sum, booking) => sum + (booking.rating || 0), 0) / bookings.length;
    
    return {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount: bookings.length,
      totalReviews: bookings.length
    };
  } catch (error) {
    console.error('Error calculating rating for caregiver:', caregiverId, error);
    return {
      rating: 0,
      reviewCount: 0,
      totalReviews: 0
    };
  }
};

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register a user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, userType, location, dailyRate, mobileMoneyNumber, mobileMoneyName, accountNumber, accountName, neededServices } = req.body;

    // Debug logging to investigate missing fields during registration
    console.log('RegisterUser called. Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body preview:', {
      name: req.body.name,
      email: req.body.email,
      passwordPresent: !!req.body.password,
    });
    if (req.file) {
      console.log('Uploaded file on register route:', { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Parse neededServices if provided as a JSON string (FormData submissions send arrays as strings)
    let neededServicesArray = [];
    if (neededServices) {
      try {
        neededServicesArray = typeof neededServices === 'string' ? JSON.parse(neededServices) : neededServices;
      } catch (parseErr) {
        // If parsing fails, fallback to treating it as a single-value array
        neededServicesArray = Array.isArray(neededServices) ? neededServices : [neededServices];
      }
    }

    user = new User({
      name,
      email,
      phone: phone || '',
      password,
      userType,
      // Location for both families and caregivers
      location: location || '',
      // explicit approval state: caregivers start false, others true
      approved: userType === 'caregiver' ? false : true,
      // Family-specific needed services
      ...(userType === 'family' && { neededServices: neededServicesArray }),
      // Add caregiver-specific daily rate
      ...(userType === 'caregiver' && {
        dailyRate: dailyRate || 0,
        mobileMoneyNumber: mobileMoneyNumber || '',
        mobileMoneyName: mobileMoneyName || '',
        accountNumber: accountNumber || '',
        accountName: accountName || '',
      })
    });

    await user.save();

    // Generate a token regardless of approval state so we can
    // authenticate the upload step during signup.  The login
    // endpoint will still block unapproved caregivers.
    const token = createToken(user._id);

    // If a profile picture was uploaded during registration, save it now
    if (req.file) {
      try {
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: 'Uploaded profile picture must be an image' });
        }

        const profileResult = await saveProfilePicture(req.file.buffer, req.file.originalname, user._id);
        user.profilePicture = profileResult.fileUrl || profileResult;
        await user.save();
      } catch (err) {
        console.error('Error saving profile picture during registration:', err);
        // Don't fail the entire registration if profile picture saving fails
      }
    }

    if (userType === 'caregiver') {
      console.log('=== BASIC CAREGIVER REGISTRATION ===');
      console.log('Payment info:', {
        mobileMoneyNumber: user.mobileMoneyNumber,
        mobileMoneyName: user.mobileMoneyName,
        accountNumber: user.accountNumber,
        accountName: user.accountName
      });
    }

    // If caregiver is not yet approved, include token but inform the
    // client that they cannot log in until an admin approves the account.
    if (user.userType === 'caregiver' && !user.approved) {
      return res.status(201).json({
        token,
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          approved: user.approved,
          profilePicture: user.profilePicture || null,
        },
      });
    }

    // Normal response for non-caregiver or already-approved users
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// registration route that handles caregiver docs as well
export const registerCaregiverWithDocs = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      location, 
      latitude,
      longitude,
      licenseNumber,
      dailyRate, 
      providedServices, 
      certifications,
      mobileMoneyNumber,
      mobileMoneyName,
      accountNumber,
      accountName,
      phone
    } = req.body;

    console.log('=== CAREGIVER REGISTRATION WITH DOCS ===');
    console.log('Payment info received:', { mobileMoneyNumber, mobileMoneyName, accountNumber, accountName });
    console.log('License number received:', licenseNumber);

    // check for existing user
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // parse providedServices if it's a string
    let servicesArray = [];
    if (providedServices) {
      servicesArray = typeof providedServices === 'string' ? JSON.parse(providedServices) : providedServices;
    }

    // parse certifications if it's a string
    let certificationsArray = [];
    if (certifications) {
      certificationsArray = typeof certifications === 'string' ? JSON.parse(certifications) : certifications;
    }

    // create caregiver record unapproved
    user = new User({
      name,
      email,
      phone: phone || '',
      password,
      userType: 'caregiver',
      location: location || '',
      latitude: latitude ? parseFloat(latitude) : 0,
      longitude: longitude ? parseFloat(longitude) : 0,
      licenseNumber: licenseNumber || '',
      approved: false,
      dailyRate: dailyRate ? parseFloat(dailyRate) : 0,
      providedServices: servicesArray,
      certifications: certificationsArray,
      mobileMoneyNumber: mobileMoneyNumber || '',
      mobileMoneyName: mobileMoneyName || '',
      accountNumber: accountNumber || '',
      accountName: accountName || '',
    });

    await user.save();
    console.log('User saved with payment info:', {
      mobileMoneyNumber: user.mobileMoneyNumber,
      mobileMoneyName: user.mobileMoneyName,
      accountNumber: user.accountNumber,
      accountName: user.accountName,
      licenseNumber: user.licenseNumber
    });

    // handle uploaded files (multer stored them in req.files)
    if (req.files) {
      // Handle profile picture if uploaded
      if (req.files.profilePicture && req.files.profilePicture.length > 0) {
        const profileFile = req.files.profilePicture[0];
        try {
          const profileResult = await saveProfilePicture(profileFile.buffer, profileFile.originalname, user._id);
          // `saveProfilePicture` returns { fileUrl, key } (S3 or local). Store fileUrl.
          user.profilePicture = profileResult.fileUrl || profileResult;
          await user.save();
          console.log('Profile picture saved for caregiver:', user.profilePicture);
        } catch (err) {
          console.error('Error saving profile picture:', err);
          // Don't fail the entire registration if profile picture fails
        }
      }

      // Handle credential documents
      if (req.files.credentials && req.files.credentials.length > 0) {
        for (const file of req.files.credentials) {
          validateCredentialFile(file);
          // Save credential using unified upload utility (S3 or local)
          const { fileUrl, key } = await saveCredentialFile(file.buffer, file.originalname, user._id);
          const blockchainHash = generateBlockchainHash(file.buffer);

          const credential = new Credential({
            caregiverId: user._id,
            credentialType: req.body.credentialType || 'other',
            credentialName: req.body.credentialName || file.originalname.replace(/\.[^/.]+$/, ''),
            issuer: req.body.issuer || 'Not specified',
            fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            blockchainHash,
          });
          await credential.save();
        }
      }
    }

    // Create notifications for all admin users about the new pending caregiver
    try {
      const adminUsers = await User.find({ userType: 'admin' });
      const notificationPromises = adminUsers.map(admin =>
        new Notification({
          recipientId: admin._id,
          message: `New caregiver registration pending approval: ${user.name} (${user.email})`,
          type: 'system',
          link: '#caregivers',
        }).save()
      );
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating admin notifications:', notificationError);
      // Don't fail the registration if notifications fail
    }

    const token = createToken(user._id);

    res.status(201).json({
      token,
      message: 'Registration complete; documents received, account pending admin approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approved: user.approved,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (error) {
    console.error('Register caregiver with docs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email/phone and password
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email or phone and password' });
    }

    // Determine if input is email or phone
    // Simpler detection: if it contains @ it's email, otherwise it's phone
    const isPhone = !email.includes('@');
    
    // Check for user by email or phone
    let user;
    if (isPhone) {
      // For phone: remove all non-digit characters from input
      const phoneDigitsOnly = email.replace(/\D/g, '');
      
      console.log('Login attempt with phone:', phoneDigitsOnly);
      
      // Search: try to find user where phone contains or matches the input
      // We'll fetch users and filter because phone might have different formats
      const potentialUsers = await User.find({ phone: { $exists: true, $ne: null } });
      user = potentialUsers.find(u => {
        if (!u.phone) return false;
        // Remove all non-digit characters from DB phone for comparison
        const dbPhoneDigitsOnly = String(u.phone).replace(/\D/g, '');
        // Match if phone contains the input or vice versa
        return dbPhoneDigitsOnly.includes(phoneDigitsOnly) || phoneDigitsOnly.includes(dbPhoneDigitsOnly);
      });
      
      if (!user) {
        console.log('Phone not found:', phoneDigitsOnly);
      }
    } else {
      // Email login
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // If frontend provided a providerPicture (from OAuth), persist it if user doesn't have one
    try {
      const providerPicture = req.body?.providerPicture;
      if (providerPicture && (!user.profilePicture || user.profilePicture === '')) {
        user.profilePicture = providerPicture;
        await user.save();
      }
    } catch (err) {
      console.warn('Failed to persist provider picture on login:', err.message);
    }

    // Prevent unapproved caregivers from logging in
    if (user.userType === 'caregiver' && !user.approved) {
      return res.status(403).json({ message: 'Your account is pending admin approval.' });
    }

    // Create JWT token
    const token = createToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approved: user.approved,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If this is a caregiver, calculate and include their rating
    let userObj = user.toObject();

    console.log('getUserProfile for caregiver:', {
      userId: user._id,
      mobileMoneyNumber: userObj.mobileMoneyNumber,
      mobileMoneyName: userObj.mobileMoneyName,
      accountNumber: userObj.accountNumber,
      accountName: userObj.accountName
    });

    if (user.userType === 'caregiver') {
      const ratingData = await calculateCaregiverRating(user._id);
      userObj.rating = ratingData.rating;
      userObj.reviewCount = ratingData.reviewCount;
    }

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/users/public/:id
// @access  Public (for viewing caregiver profiles)
export const getPublicUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow public access for approved caregivers
    if (user.userType !== 'caregiver' || !user.approved) {
      return res.status(403).json({ message: 'Profile not publicly available' });
    }

    // If this is a caregiver, calculate and include their rating
    let userObj = user.toObject();

    if (user.userType === 'caregiver') {
      const ratingData = await calculateCaregiverRating(user._id);
      userObj.rating = ratingData.rating;
      userObj.reviewCount = ratingData.reviewCount;
    }

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload user profile picture
// @route   POST /api/users/:id/upload-profile-picture
// @access  Private
export const uploadProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Uploaded file must be an image' });
    }

    try {
      // Delete old profile picture if it exists
      if (user.profilePicture) {
        deleteProfilePicture(user.profilePicture);
      }

      // Save new profile picture (returns { fileUrl, key } on success)
      const profileResult = await saveProfilePicture(req.file.buffer, req.file.originalname, id);
      const profilePictureUrl = profileResult.fileUrl || profileResult;

      // Update user with new profile picture URL
      user.profilePicture = profilePictureUrl;
      await user.save();

      res.status(200).json({
        message: 'Profile picture uploaded successfully',
        profilePicture: profilePictureUrl,
        user: user
      });
    } catch (uploadError) {
      console.error('Error uploading profile picture:', uploadError);
      return res.status(500).json({ 
        message: 'Error uploading profile picture',
        error: uploadError.message 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete profile picture
// @route   DELETE /api/users/:id/profile-picture
// @access  Private
export const deleteProfilePictureEndpoint = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a profile picture
    if (!user.profilePicture) {
      return res.status(400).json({ message: 'No profile picture to delete' });
    }

    try {
      // Delete the profile picture file
      deleteProfilePicture(user.profilePicture);

      // Update user to remove profile picture reference
      user.profilePicture = null;
      await user.save();

      res.status(200).json({
        message: 'Profile picture deleted successfully',
        user: user
      });
    } catch (deleteError) {
      console.error('Error deleting profile picture:', deleteError);
      return res.status(500).json({ 
        message: 'Error deleting profile picture',
        error: deleteError.message 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all caregivers
// @route   GET /api/users/caregivers
// @access  Public
export const getCaregivers = async (req, res) => {
  try {
    const caregivers = await User.find({ userType: 'caregiver', approved: true }).select('-password');
    
    // Calculate ratings for each caregiver
    const caregiversWithRatings = await Promise.all(
      caregivers.map(async (caregiver) => {
        const caregiverObj = caregiver.toObject();
        const ratingData = await calculateCaregiverRating(caregiver._id);
        caregiverObj.rating = ratingData.rating;
        caregiverObj.reviewCount = ratingData.reviewCount;
        return caregiverObj;
      })
    );

    // Sort by rating (highest first)
    caregiversWithRatings.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.status(200).json(caregiversWithRatings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get caregivers by location (filtered for family)
// @route   GET /api/users/caregivers/by-location/:location
// @access  Public
export const getCaregiversByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    const { useProximity, radiusKm } = req.query;
    
    if (!location) {
      return res.status(400).json({ message: 'Location parameter is required' });
    }

    // Search for caregivers with matching or similar location
    // Using regex for case-insensitive partial matching
    const locationRegex = new RegExp(location, 'i');
    
    const caregivers = await User.find({
      userType: 'caregiver',
      approved: true,
      location: { $regex: locationRegex }
    }).select('-password');

    // Add ratings to all caregivers
    const caregiversWithRatings = await Promise.all(
      caregivers.map(async (caregiver) => {
        const caregiverObj = caregiver.toObject();
        const ratingData = await calculateCaregiverRating(caregiver._id);
        caregiverObj.rating = ratingData.rating;
        caregiverObj.reviewCount = ratingData.reviewCount;
        return caregiverObj;
      })
    );

    // If proximity matching is requested, enhance with distance data
    if (useProximity === 'true' && caregiversWithRatings.length > 0) {
      try {
        const locationService = (await import('../utils/locationService.js')).default;
        const radius = parseInt(radiusKm) || 5; // Default 5km radius
        const nearbyCaregiversWithDistance = await locationService.findNearbyCaregiversByProximity(
          location,
          caregiversWithRatings,
          radius
        );
        return res.status(200).json(nearbyCaregiversWithDistance);
      } catch (error) {
        // Fallback to standard location matching if proximity fails
        console.warn('Proximity matching failed, using standard location matching:', error.message);
        return res.status(200).json(caregiversWithRatings);
      }
    }

    // Sort by rating (highest first)
    caregiversWithRatings.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.status(200).json(caregiversWithRatings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending caregiver approvals (Admin only)
// @route   GET /api/users/pending/caregivers
// @access  Private/Admin
export const getPendingCaregivers = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const pendingCaregivers = await User.find({ userType: 'caregiver', approved: false }).select('-password');
    res.status(200).json(pendingCaregivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a caregiver (Admin only)
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
export const approveCaregivver = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'caregiver') {
      return res.status(400).json({ message: 'Only caregivers can be approved' });
    }

    user.approved = true;
    await user.save();

    res.status(200).json({
      message: 'Caregiver approved successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approved: user.approved,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a pending caregiver (Admin only)
// @route   DELETE /api/users/:id/reject
// @access  Private/Admin
export const rejectCaregivver = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'caregiver') {
      return res.status(400).json({ message: 'Only caregivers can be rejected' });
    }

    if (user.approved) {
      return res.status(400).json({ message: 'This caregiver has already been approved' });
    }

    // Delete the rejected caregiver
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'Caregiver rejected successfully',
      rejectedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new admin (Admin only)
// @route   POST /api/users/admin/add
// @access  Private/Admin
export const addAdmin = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new admin user
    user = new User({
      name,
      email,
      password,
      userType: 'admin',
      approved: true,
    });

    await user.save();

    // Create JWT token
    const token = createToken(user._id);

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new regular user (Admin only)
// @route   POST /api/users/user/add
// @access  Private/Admin
export const addUser = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    const { name, email, password, userType } = req.body;

    // Validate userType
    if (!['family', 'caregiver'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      userType,
    });

    await user.save();

    // Create JWT token
    const token = createToken(user._id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approved: user.approved,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google OAuth Login/Register
// @route   POST /api/users/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { token, userType } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    if (!userType || !['family', 'caregiver'].includes(userType)) {
      return res.status(400).json({ message: 'Valid userType (family or caregiver) is required' });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        password: 'google-oauth', // Password not used for Google auth
        userType,
        // Do NOT automatically persist Google profile pictures. Users should upload
        // their own profile picture via the profile upload endpoint if they choose.
        profilePicture: null,
        approved: userType === 'family' ? true : false, // Auto-approve family, not caregivers
      });

      await user.save();

      // If caregiver created via Google, do not issue token until admin approval
      if (user.userType === 'caregiver' && !user.approved) {
        return res.status(201).json({
          message: 'Registration successful via Google. Your account is pending admin approval.',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            userType: user.userType,
            approved: user.approved,
            profilePicture: user.profilePicture,
          },
        });
      }
    } else {
      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
      }

      // Prevent unapproved caregivers from logging in
      if (user.userType === 'caregiver' && !user.approved) {
        return res.status(403).json({ message: 'Your account is pending admin approval.' });
      }

      // Do NOT automatically overwrite or persist Google profile pictures here.
      // If the app later chooses to persist a provider picture it should do so
      // explicitly via the profile upload endpoint.
    }

    // Create JWT token
    const authToken = createToken(user._id);

    res.status(200).json({
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        approved: user.approved,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: error.message || 'Google authentication failed' });
  }
};

// @desc    Update caregiver rates
// @route   PUT /api/users/:id/rates
// @access  Private
export const updateCaregiverRates = async (req, res) => {
  try {
    const { dailyRate, weeklyRate, serviceType, bio, certifications, availability, providedServices } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'caregiver') {
      return res.status(400).json({ message: 'Only caregivers can update rates' });
    }

    // Update rates and related info
    if (dailyRate !== undefined) user.dailyRate = dailyRate;
    if (weeklyRate !== undefined) user.weeklyRate = weeklyRate;
    if (serviceType !== undefined) user.serviceType = serviceType;
    if (bio !== undefined) user.bio = bio;
    if (certifications !== undefined) user.certifications = certifications;
    if (availability !== undefined) user.availability = availability;
    if (providedServices !== undefined) user.providedServices = providedServices;
    
    user.rateUpdatedAt = new Date();

    await user.save();

    res.status(200).json({
      message: 'Rates updated successfully',
      user: {
        id: user._id,
        name: user.name,
        dailyRate: user.dailyRate,
        weeklyRate: user.weeklyRate,
        serviceType: user.serviceType,
        bio: user.bio,
        certifications: user.certifications,
        availability: user.availability,
        providedServices: user.providedServices,
        rateUpdatedAt: user.rateUpdatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove profile picture from user account
// @route   DELETE /api/users/:id/remove-profile-picture
// @access  Private (user can only remove their own profile picture)
export const removeProfilePicture = async (req, res) => {
  try {
    // Check authorization - user can only remove their own profile picture
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to remove this profile picture' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has a profile picture, try to delete the file
    if (user.profilePicture) {
      try {
        await deleteProfilePicture(user.profilePicture);
      } catch (err) {
        console.log('Warning: Could not delete profile picture file:', err.message);
        // Continue anyway and remove the reference from database
      }
    }

    // Remove profile picture reference from database
    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      message: 'Profile picture removed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete users' });
    }

    // Find user to delete
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit user account details (Admin only)
// @route   PUT /api/users/:id/edit
// @access  Private/Admin
export const editUserAccount = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit user accounts' });
    }

    // Find user to edit
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update editable fields
    const { name, email, phone, userType, address, city, state, zipCode, serviceType, dailyRate, weeklyRate, bio } = req.body;

    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      // Check if new email is already used by another user
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (zipCode !== undefined) user.zipCode = zipCode;

    // Allow editing caregiver-specific fields
    if (user.userType === 'caregiver') {
      if (serviceType !== undefined) user.serviceType = serviceType;
      if (dailyRate !== undefined) user.dailyRate = dailyRate;
      if (weeklyRate !== undefined) user.weeklyRate = weeklyRate;
      if (bio !== undefined) user.bio = bio;
    }

    await user.save();

    res.status(200).json({
      message: 'User account updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        ...(user.userType === 'caregiver' && {
          serviceType: user.serviceType,
          dailyRate: user.dailyRate,
          weeklyRate: user.weeklyRate,
          bio: user.bio,
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deactivate a user account (Admin only)
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin
export const deactivateUser = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to deactivate users' });
    }

    // Find user to deactivate
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot deactivate your own admin account' });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      message: 'User account deactivated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activate a user account (Admin only)
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
export const activateUser = async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.userId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to activate users' });
    }

    // Find user to activate
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      message: 'User account activated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!userType) {
      return res.status(400).json({ message: 'User type is required' });
    }

    // Prevent administrators from using password reset
    if (userType === 'admin') {
      return res.status(403).json({ message: 'Administrators cannot reset password through this feature. Please contact support.' });
    }

    // Find user by email AND userType to ensure email is associated with correct category
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      userType: userType
    });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this email in the selected category. Please check your email and category.' });
    }

    // Generate reset token (6 digit OTP for simplicity, or token)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // In production, send email with reset link
    // For development, return token in response (don't do this in production!)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    res.status(200).json({
      message: 'Password reset link sent to email',
      // Remove this in production - only for development testing
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
      token: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password with token
// @route   POST /api/users/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword, userType } = req.body;

    if (!email || !token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required' });
    }

    if (!userType) {
      return res.status(400).json({ message: 'User type is required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find user with valid reset token AND userType validation
    const user = await User.findOne({
      email: email.toLowerCase(),
      userType: userType,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({
      message: 'Password reset successfully. Please login with your new password.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify reset token
// @route   POST /api/users/verify-reset-token
// @access  Public
export const verifyResetToken = async (req, res) => {
  try {
    const { email, token, userType } = req.body;

    if (!email || !token) {
      return res.status(400).json({ message: 'Email and token are required' });
    }

    if (!userType) {
      return res.status(400).json({ message: 'User type is required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      userType: userType,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.status(200).json({
      message: 'Token is valid',
      valid: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request account deletion (requires admin approval)
// @route   POST /api/users/:id/request-deletion
// @access  Private
export const requestDeleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set deletion request flag and timestamp
    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    user.deletionStatus = 'pending'; // pending, approved, rejected

    await user.save();

    // Create notifications for all admin users about the deletion request
    try {
      const adminUsers = await User.find({ userType: 'admin' });
      const notificationPromises = adminUsers.map(admin =>
        new Notification({
          recipientId: admin._id,
          message: `Account deletion request from ${user.name} (${user.email})`,
          type: 'system',
          link: '#deletion-requests',
        }).save()
      );
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating admin notifications:', notificationError);
      // Don't fail the deletion request if notifications fail
    }

    res.status(200).json({
      message: 'Account deletion request submitted. Admin will review and process your request.',
      user: {
        id: user._id,
        deletionStatus: user.deletionStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve account deletion (Admin only)
// @route   PUT /api/users/:id/approve-deletion
// @access  Private/Admin
export const approveDeleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(req.userId);

    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized. Admin access required.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user and all associated data
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: 'User account has been permanently deleted',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject account deletion (Admin only)
// @route   PUT /api/users/:id/reject-deletion
// @access  Private/Admin
export const rejectDeleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(req.userId);

    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized. Admin access required.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reset deletion request
    user.deletionRequested = false;
    user.deletionStatus = 'rejected';
    await user.save();

    res.status(200).json({
      message: 'Account deletion request has been rejected',
      user: {
        id: user._id,
        deletionStatus: user.deletionStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Find caregivers by proximity (nearby caregivers based on GPS distance)
// @route   GET /api/users/caregivers/nearby/:location
// @access  Public
export const findNearbyCaregiversByProximity = async (req, res) => {
  try {
    const { location } = req.params;
    const { radiusKm = '5', limit = '20', lat, lng } = req.query;

    if (!location) {
      return res.status(400).json({ message: 'Location parameter is required' });
    }

    const radius = Math.max(1, Math.min(parseInt(radiusKm), 100)); // 1-100km range
    const resultLimit = Math.max(1, Math.min(parseInt(limit), 100));

    // Use client-supplied GPS coords when available — avoids a Nominatim geocoding round-trip
    const preResolvedCoords = lat && lng
      ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
      : null;

    try {
      // Import location service
      const locationService = (await import('../utils/locationService.js')).default;

      // Get all approved caregivers
      const caregivers = await User.find({
        userType: 'caregiver',
        approved: true,
        isActive: true
      }).select('-password').lean();

      if (caregivers.length === 0) {
        return res.status(200).json({
          message: 'No caregivers available in this area',
          caregivers: [],
          searchLocation: location,
          radiusKm: radius,
          totalFound: 0
        });
      }

      // Find nearby caregivers — stored caregiver coords are used when available,
      // and the search origin skips geocoding when preResolvedCoords is supplied
      const nearbyCaregiversWithDistance = await locationService.findNearbyCaregiversByProximity(
        location,
        caregivers,
        radius,
        preResolvedCoords
      );

      // Filter to only those within radius
      const withinRadius = nearbyCaregiversWithDistance.filter(c => c.withinRadius);

      // Return limited results sorted by distance
      return res.status(200).json({
        message: `Found ${withinRadius.length} caregivers within ${radius}km of ${location}`,
        caregivers: withinRadius.slice(0, resultLimit).map(caregiver => ({
          _id: caregiver._id,
          name: caregiver.name,
          email: caregiver.email,
          phone: caregiver.phone,
          location: caregiver.location,
          serviceType: caregiver.serviceType,
          dailyRate: caregiver.dailyRate,
          rating: caregiver.rating,
          totalReviews: caregiver.totalReviews,
          bio: caregiver.bio,
          distance: caregiver.distance,
          proximityScore: caregiver.proximityScore,
          withinRadius: caregiver.withinRadius,
          verified: caregiver.verified,
          certifications: caregiver.certifications
        })),
        searchLocation: location,
        radiusKm: radius,
        totalFound: withinRadius.length,
        totalCaregiversInSystem: caregivers.length,
        distanceUnit: 'kilometers'
      });
    } catch (error) {
      console.error('Proximity search error:', error);
      
      // Fallback to simple location regex matching
      const locationRegex = new RegExp(location, 'i');
      const caregivers = await User.find({
        userType: 'caregiver',
        approved: true,
        location: { $regex: locationRegex }
      }).select('-password').lean();

      return res.status(200).json({
        message: `Proximity search unavailable. Showing ${caregivers.length} caregivers matching "${location}"`,
        caregivers: caregivers.slice(0, resultLimit),
        searchLocation: location,
        fallbackToRegex: true,
        radiusKm: radius,
        totalFound: caregivers.length
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearby caregiver (single nearest caregiver)
// @route   GET /api/users/caregiver/nearest/:location
// @access  Public
export const findNearestCaregiver = async (req, res) => {
  try {
    const { location } = req.params;

    if (!location) {
      return res.status(400).json({ message: 'Location parameter is required' });
    }

    try {
      const locationService = (await import('../utils/locationService.js')).default;

      // Get all approved caregivers
      const caregivers = await User.find({
        userType: 'caregiver',
        approved: true,
        isActive: true
      }).select('-password').lean();

      if (caregivers.length === 0) {
        return res.status(200).json({
          message: 'No caregivers available',
          caregiver: null
        });
      }

      // Find nearest caregiver
      const nearestCaregiver = await locationService.findNearestCaregiver(location, caregivers);

      if (!nearestCaregiver) {
        return res.status(200).json({
          message: 'Could not find nearest caregiver',
          caregiver: null
        });
      }

      res.status(200).json({
        message: `Found nearest caregiver: ${nearestCaregiver.name}`,
        caregiver: {
          _id: nearestCaregiver._id,
          name: nearestCaregiver.name,
          email: nearestCaregiver.email,
          phone: nearestCaregiver.phone,
          location: nearestCaregiver.location,
          serviceType: nearestCaregiver.serviceType,
          dailyRate: nearestCaregiver.dailyRate,
          rating: nearestCaregiver.rating,
          totalReviews: nearestCaregiver.totalReviews,
          bio: nearestCaregiver.bio,
          distance: nearestCaregiver.distance,
          proximityScore: nearestCaregiver.proximityScore,
          verified: nearestCaregiver.verified
        },
        searchLocation: location,
        distanceUnit: 'kilometers'
      });
    } catch (error) {
      console.error('Nearest caregiver search error:', error);
      
      // Fallback to any approved caregiver
      const caregiver = await User.findOne({
        userType: 'caregiver',
        approved: true
      }).select('-password');

      if (!caregiver) {
        return res.status(200).json({
          message: 'No caregivers available',
          caregiver: null
        });
      }

      res.status(200).json({
        message: `Proximity search unavailable. Showing available caregiver: ${caregiver.name}`,
        caregiver: caregiver,
        fallbackToAny: true,
        searchLocation: location
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Validate location proximity (check if two locations are within radius)
// @route   GET /api/users/validate-proximity
// @access  Public
export const validateLocationProximity = async (req, res) => {
  try {
    const { location1, location2, radiusKm = '5' } = req.query;

    if (!location1 || !location2) {
      return res.status(400).json({ message: 'Both location1 and location2 parameters are required' });
    }

    const radius = Math.max(1, Math.min(parseInt(radiusKm), 100));

    try {
      const locationService = (await import('../utils/locationService.js')).default;
      const isWithinRadius = await locationService.isLocationWithinRadius(location1, location2, radius);

      res.status(200).json({
        location1,
        location2,
        radiusKm: radius,
        withinRadius: isWithinRadius,
        message: isWithinRadius 
          ? `${location1} is within ${radius}km of ${location2}`
          : `${location1} is more than ${radius}km away from ${location2}`
      });
    } catch (error) {
      console.error('Proximity validation error:', error);
      res.status(500).json({ message: 'Could not validate proximity', error: error.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
