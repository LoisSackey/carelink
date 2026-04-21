import { blockchainService } from '../services/blockchainService.js';
import { fabricService } from '../services/fabricService.js';
import Credential from '../models/Credential.js';
import User from '../models/User.js';

/**
 * Store credential on blockchain after verification
 * POST /api/blockchain/store/:credentialId
 */
export const storeCredentialOnBlockchain = async (req, res) => {
  try {
    const { credentialId } = req.params;

    // Only admins can store on blockchain
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can store credentials on blockchain',
      });
    }

    // Get credential
    const credential = await Credential.findById(credentialId);
    if (!credential) {
      return res.status(404).json({
        message: 'Credential not found',
      });
    }

    // Only verified credentials can be stored
    if (credential.verificationStatus !== 'verified') {
      return res.status(400).json({
        message: 'Only verified credentials can be stored on blockchain',
      });
    }

    let blockchainResult = null;
    if (process.env.USE_FABRIC === 'true') {
      try {
        await fabricService.init();
        blockchainResult = await fabricService.storeCredential(credential);
      } catch (err) {
        console.warn('Fabric storage failed, falling back to simulated blockchain:', err);
        blockchainResult = await blockchainService.storeCredentialOnBlockchain(credential);
      }
    } else {
      blockchainResult = await blockchainService.storeCredentialOnBlockchain(credential);
    }

    // Update credential with blockchain info when available
    credential.blockchainVerified = true;
    credential.blockchainHash = blockchainResult.blockchainHash || credential.blockchainHash;
    await credential.save();

    res.status(200).json({
      message: 'Credential stored on blockchain',
      blockchainResult,
      credential,
    });
  } catch (err) {
    console.error('Store on blockchain error:', err);
    res.status(500).json({
      message: err.message || 'Failed to store on blockchain',
    });
  }
};

/**
 * Verify credential on blockchain
 * POST /api/blockchain/verify/:credentialId
 */
export const verifyCredentialOnBlockchain = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { fileHash } = req.body;

    // Get credential
    const credential = await Credential.findById(credentialId);
    if (!credential) {
      return res.status(404).json({
        message: 'Credential not found',
      });
    }

    // Verify on blockchain
    const verificationResult = await blockchainService.verifyCredentialOnBlockchain(
      credentialId,
      fileHash || credential.blockchainHash
    );

    res.status(200).json({
      message: 'Blockchain verification complete',
      verification: verificationResult,
    });
  } catch (err) {
    console.error('Verify on blockchain error:', err);
    res.status(500).json({
      message: 'Failed to verify on blockchain',
    });
  }
};

/**
 * Get credential history on blockchain
 * GET /api/blockchain/history/:credentialId
 */
export const getCredentialHistory = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const history = await blockchainService.getCredentialHistory(credentialId);

    res.status(200).json({
      message: 'Credential history retrieved',
      history,
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({
      message: 'Failed to retrieve history',
    });
  }
};

/**
 * Get caregiver's blockchain records
 * GET /api/blockchain/caregiver/:caregiverId
 */
export const getCaregiverBlockchainRecords = async (req, res) => {
  try {
    const { caregiverId } = req.params;

    // Verify user access
    const currentUserId = req.user ? req.user.id || req.user._id : req.userId;
    const currentUserType = req.user ? req.user.userType : null;

    if (currentUserId !== caregiverId && currentUserType !== 'admin') {
      return res.status(403).json({
        message: 'Unauthorized',
      });
    }

    const records = await blockchainService.getCaregiverBlockchainRecords(caregiverId);

    res.status(200).json({
      message: 'Caregiver blockchain records retrieved',
      records,
    });
  } catch (err) {
    console.error('Get caregiver records error:', err);
    res.status(500).json({
      message: 'Failed to retrieve records',
    });
  }
};

/**
 * Generate credential proof (for sharing/verification)
 * GET /api/blockchain/proof/:credentialId
 */
export const generateCredentialProof = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const proof = await blockchainService.generateCredentialProof(credentialId);

    res.status(200).json({
      message: 'Credential proof generated',
      proof,
    });
  } catch (err) {
    console.error('Generate proof error:', err);
    res.status(404).json({
      message: 'Credential not found on blockchain',
    });
  }
};

/**
 * Revoke credential on blockchain
 * POST /api/blockchain/revoke/:credentialId
 */
export const revokeCredentialOnBlockchain = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { reason } = req.body;

    // Only admins can revoke
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        message: 'Only admins can revoke credentials',
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: 'Revocation reason required',
      });
    }

    // Revoke on blockchain
    const revocationResult = await blockchainService.revokeCredentialOnBlockchain(
      credentialId,
      reason
    );

    // Update credential status
    const credential = await Credential.findById(credentialId);
    if (credential) {
      credential.verificationStatus = 'rejected';
      credential.verificationNotes = `Revoked: ${reason}`;
      await credential.save();
    }

    res.status(200).json({
      message: 'Credential revoked on blockchain',
      revocation: revocationResult,
    });
  } catch (err) {
    console.error('Revoke credential error:', err);
    res.status(500).json({
      message: 'Failed to revoke credential',
    });
  }
};

/**
 * Get blockchain network statistics
 * GET /api/blockchain/stats
 */
export const getBlockchainStats = async (req, res) => {
  try {
    const stats = await blockchainService.getBlockchainStats();

    res.status(200).json({
      message: 'Blockchain statistics',
      stats,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({
      message: 'Failed to get statistics',
    });
  }
};

/**
 * Public verification endpoint
 * GET /api/blockchain/verify/:credentialId/:transactionId
 * 
 * Anyone can verify a credential using public link
 */
export const publicVerifyCredential = async (req, res) => {
  try {
    const { credentialId, transactionId } = req.params;

    const verification = await blockchainService.verifyCredentialOnBlockchain(
      credentialId,
      null
    );

    // Also check transaction ID matches
    const isValidTransaction = verification.transactionId === transactionId;

    res.status(200).json({
      message: 'Public credential verification',
      credentialId,
      verified: verification.verified && isValidTransaction,
      credentialName: verification.credentialName,
      issuer: verification.issuer,
      verificationStatus: verification.verificationStatus,
      timestamp: verification.timestamp,
      immutable: verification.immutable,
      blockNumber: verification.blockNumber,
    });
  } catch (err) {
    console.error('Public verify error:', err);
    res.status(404).json({
      message: 'Credential not found',
    });
  }
};
