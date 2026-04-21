import Credential from '../models/Credential.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { saveCredentialFile, deleteCredentialFile, getFileUrl, ensureUploadDir as uploadEnsureDir } from '../utils/uploadUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to generate blockchain hash
const generateBlockchainHash = (fileBuffer) => {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Helper function to validate file
const validateCredentialFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit');
  }

  if (!allowedMimes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX');
  }

  return true;
};

// Note: upload directory management delegated to ../utils/uploadUtils.js

/**
 * Upload a credential (document/certificate)
 * POST /api/credentials/upload
 */
export const uploadCredential = async (req, res) => {
  try {
    const { credentialType, credentialName, issuer, issueDate, expiryDate, credentialNumber } = req.body;
    const userId = req.userId;

    console.log('Upload request - Body:', req.body);
    console.log('Upload request - File:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

    // Validate user exists and is caregiver
    const user = await User.findById(userId);
    if (!user || user.userType !== 'caregiver') {
      return res.status(403).json({ 
        message: 'Only caregivers can upload credentials' 
      });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded' 
      });
    }

    // Validate file
    validateCredentialFile(req.file);

    // Save file (S3 or local depending on env)
    const { fileUrl, key } = await saveCredentialFile(req.file.buffer, req.file.originalname, userId);

    // Generate blockchain hash
    const blockchainHash = generateBlockchainHash(req.file.buffer);

    // Create credential record
    const credential = new Credential({
      caregiverId: userId,
      credentialType,
      credentialName,
      issuer: issuer || 'Not specified',
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      credentialNumber: credentialNumber || null,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      blockchainHash,
    });

    await credential.save();

    console.log(`Credential uploaded: ${credentialName} for user ${userId}`);

    // Create notifications for all admin users about the new credential pending review
    try {
      const adminUsers = await User.find({ userType: 'admin' });
      const notificationPromises = adminUsers.map(admin =>
        new Notification({
          recipientId: admin._id,
          message: `New credential uploaded for review: ${credentialName} by ${user.name}`,
          type: 'system',
          link: '#credential-review',
        }).save()
      );
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating admin notifications:', notificationError);
      // Don't fail the upload if notifications fail
    }

    // Update user's verified status if all credentials are verified
    const credentials = await Credential.find({ caregiverId: userId });
    const allVerified = credentials.length > 0 && 
                       credentials.every(c => c.verificationStatus === 'verified');
    
    if (allVerified) {
      user.verified = true;
      await user.save();
    } else if (!user.verified) {
      // just save current state (approval remains as set by admin)
      await user.save();
    }

    res.status(201).json({
      message: 'Credential uploaded successfully',
      credential,
    });
  } catch (err) {
    console.error('Upload credential error:', err.message || err);
    const statusCode = err.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      message: err.message || 'Failed to upload credential',
      error: err.name
    });
  }
};

/**
 * Get all credentials for a caregiver
 * GET /api/credentials/:caregiverId
 */
export const getCaregiverCredentials = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    // Verify user owns credentials or is admin
    const user = await User.findById(req.userId);
    if (req.userId !== caregiverId && (!user || user.userType !== 'admin')) {
      return res.status(403).json({ 
        message: 'Unauthorized' 
      });
    }

    const credentials = await Credential.find({ caregiverId })
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: credentials.length,
      credentials,
    });
  } catch (err) {
    console.error('Get credentials error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch credentials' 
    });
  }
};

/**
 * Get verification status summary for a caregiver
 * GET /api/credentials/status/:caregiverId
 */
export const getCredentialStatus = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    const credentials = await Credential.find({ caregiverId });
    
    const summary = {
      total: credentials.length,
      verified: credentials.filter(c => c.verificationStatus === 'verified').length,
      pending: credentials.filter(c => c.verificationStatus === 'pending').length,
      rejected: credentials.filter(c => c.verificationStatus === 'rejected').length,
      expired: credentials.filter(c => c.isExpired).length,
      allVerified: false,
    };

    summary.allVerified = summary.verified === summary.total && summary.total > 0;

    res.status(200).json(summary);
  } catch (err) {
    console.error('Get credential status error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch credential status' 
    });
  }
};

/**
 * Verify credential (Admin only)
 * PUT /api/credentials/verify/:credentialId
 */
export const verifyCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { verificationStatus, verificationNotes } = req.body;
    const adminId = req.userId;

    // Check if user is admin
    const admin = await User.findById(adminId);
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Only admins can verify credentials' 
      });
    }

    if (!['verified', 'rejected', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({ 
        message: 'Invalid verification status' 
      });
    }

    const credential = await Credential.findByIdAndUpdate(
      credentialId,
      {
        verificationStatus,
        verificationNotes: verificationNotes || '',
        verifiedBy: adminId,
        verificationDate: new Date(),
      },
      { new: true }
    ).populate('verifiedBy', 'name email');

    if (!credential) {
      return res.status(404).json({ 
        message: 'Credential not found' 
      });
    }

    res.status(200).json({
      message: `Credential ${verificationStatus} successfully`,
      credential,
    });
  } catch (err) {
    console.error('Verify credential error:', err);
    res.status(500).json({ 
      message: 'Failed to verify credential' 
    });
  }
};

/**
 * Verify credential with blockchain hash
 * POST /api/credentials/verify-blockchain/:credentialId
 */
export const verifyCredentialBlockchain = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { fileBuffer } = req.body;

    const credential = await Credential.findById(credentialId);
    if (!credential) {
      return res.status(404).json({ 
        message: 'Credential not found' 
      });
    }

    // Generate hash from provided file
    const computedHash = generateBlockchainHash(Buffer.from(fileBuffer, 'base64'));

    // Verify hash matches
    const isValid = computedHash === credential.blockchainHash;

    if (isValid) {
      credential.blockchainVerified = true;
      await credential.save();
    }

    res.status(200).json({
      isValid,
      message: isValid ? 'Credential verified on blockchain' : 'Credential verification failed',
      credential,
    });
  } catch (err) {
    console.error('Blockchain verification error:', err);
    res.status(500).json({ 
      message: 'Failed to verify credential on blockchain' 
    });
  }
};

/**
 * Delete a credential
 * DELETE /api/credentials/:credentialId
 */
export const deleteCredential = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.userId;

    const credential = await Credential.findById(credentialId);
    if (!credential) {
      return res.status(404).json({ 
        message: 'Credential not found' 
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (credential.caregiverId.toString() !== userId && (!user || user.userType !== 'admin')) {
      return res.status(403).json({ 
        message: 'Unauthorized' 
      });
    }

    // Delete file (S3 or local)
    try {
      await deleteCredentialFile(credential.fileUrl);
    } catch (err) {
      console.warn('Failed to delete credential file:', err);
    }

    // Delete record
    await Credential.findByIdAndDelete(credentialId);

    res.status(200).json({ 
      message: 'Credential deleted successfully' 
    });
  } catch (err) {
    console.error('Delete credential error:', err);
    res.status(500).json({ 
      message: 'Failed to delete credential' 
    });
  }
};

/**
 * Get all pending credentials for admin review
 * GET /api/credentials/admin/pending
 */
export const getPendingCredentials = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Only admins can view pending credentials' 
      });
    }

    const credentials = await Credential.find({ verificationStatus: 'pending' })
      .populate('caregiverId', 'name email phone userType')
      .sort({ createdAt: -1 });

    console.log(`Found ${credentials.length} pending credentials for admin`);

    res.status(200).json({
      count: credentials.length,
      credentials,
    });
  } catch (err) {
    console.error('Get pending credentials error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch pending credentials' 
    });
  }
};

/**
 * Download credential file (Admin only)
 * GET /api/credentials/download/:credentialId
 */
export const downloadCredentialFile = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const userId = req.userId;

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Only admins can download credential files' 
      });
    }

    // Get credential
    const credential = await Credential.findById(credentialId)
      .populate('caregiverId', 'name email');
    
    if (!credential) {
      return res.status(404).json({ 
        message: 'Credential not found' 
      });
    }

    // Resolve file URL (may be presigned S3 URL or local path)
    const resolved = await getFileUrl(credential.fileUrl);
    if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
      // Redirect to presigned URL
      return res.redirect(resolved);
    }

    // Local file: stream as download
    const uploadDir = uploadEnsureDir('credentials');
    const fileName = path.basename(credential.fileUrl);
    const filePath = path.join(uploadDir, fileName);
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    res.download(filePath, credential.fileName, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (err) {
    console.error('Download credential file error:', err);
    res.status(500).json({ 
      message: 'Failed to download credential file' 
    });
  }
};

/**
 * Get all credentials for admin review (with file links)
 * GET /api/credentials/admin/all
 */
export const getAllCredentialsForAdmin = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Only admins can view all credentials' 
      });
    }

    const { status, caregiverId } = req.query;

    // Build query
    let query = {};
    if (status) {
      query.verificationStatus = status;
    }
    if (caregiverId) {
      query.caregiverId = caregiverId;
    }

    const credentials = await Credential.find(query)
      .populate('caregiverId', 'name email phone verified')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    // Add download URLs for admin
    const credentialsWithLinks = credentials.map(cred => ({
      ...cred.toObject(),
      downloadUrl: `/api/credentials/download/${cred._id}`,
    }));

    res.status(200).json({
      count: credentials.length,
      credentials: credentialsWithLinks,
    });
  } catch (err) {
    console.error('Get all credentials error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch credentials' 
    });
  }
};
