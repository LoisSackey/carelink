import express from 'express';
import {
  storeCredentialOnBlockchain,
  verifyCredentialOnBlockchain,
  getCredentialHistory,
  getCaregiverBlockchainRecords,
  generateCredentialProof,
  revokeCredentialOnBlockchain,
  getBlockchainStats,
  publicVerifyCredential,
} from '../controllers/blockchainController.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

// Public endpoints (no auth required)
router.get('/stats', getBlockchainStats);
router.get('/verify/:credentialId/:transactionId', publicVerifyCredential);

// Protected endpoints
router.post('/store/:credentialId', protectRoute, storeCredentialOnBlockchain);
router.post('/verify/:credentialId', protectRoute, verifyCredentialOnBlockchain);
router.post('/revoke/:credentialId', protectRoute, revokeCredentialOnBlockchain);

router.get('/history/:credentialId', protectRoute, getCredentialHistory);
router.get('/caregiver/:caregiverId', protectRoute, getCaregiverBlockchainRecords);
router.get('/proof/:credentialId', protectRoute, generateCredentialProof);

export default router;
