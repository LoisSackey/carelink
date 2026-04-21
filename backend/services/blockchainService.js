//Store credential verification records on blockchain
import crypto from 'crypto';

 //BlockchainService - Simulated Hyperledger Fabric Integration
class BlockchainService {
  constructor() {
    this.blockchainNetwork = 'carelink-network';
    this.chaincodeName = 'credential-verification';
    this.channel = 'carelink-channel';
    this.simulatedChain = []; // Simulate blockchain ledger
  }

  
  //Generate credential record hash   
  generateCredentialHash(credential) {
    const data = {
      caregiverId: credential.caregiverId,
      credentialType: credential.credentialType,
      credentialName: credential.credentialName,
      issuer: credential.issuer,
      fileHash: credential.blockchainHash,
      verificationStatus: credential.verificationStatus,
      timestamp: new Date().toISOString(),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  
  //Create credential record on blockchain
  
  async storeCredentialOnBlockchain(credential) {
    try {
      const credentialHash = this.generateCredentialHash(credential);
      const transactionId = this.generateTransactionId();

      const blockchainRecord = {
        transactionId,
        credentialId: credential._id,
        caregiverId: credential.caregiverId,
        credentialHash,
        fileHash: credential.blockchainHash,
        credentialType: credential.credentialType,
        credentialName: credential.credentialName,
        issuer: credential.issuer,
        verificationStatus: credential.verificationStatus,
        verifiedBy: credential.verifiedBy,
        verificationDate: credential.verificationDate,
        blockchainTimestamp: new Date().toISOString(),
        networkName: this.blockchainNetwork,
        channelName: this.channel,
        chaincodeName: this.chaincodeName,
        status: 'recorded',
        immutable: true,
      };

      // Simulate blockchain storage
      this.simulatedChain.push(blockchainRecord);

      return {
        success: true,
        transactionId,
        blockchainHash: credentialHash,
        blockNumber: this.simulatedChain.length - 1,
        timestamp: blockchainRecord.blockchainTimestamp,
        message: 'Credential stored on blockchain',
      };
    } catch (err) {
      console.error('Blockchain storage error:', err);
      throw new Error('Failed to store credential on blockchain');
    }
  }

  /**
   * Verify credential authenticity on blockchain
   */
  async verifyCredentialOnBlockchain(credentialId, fileHash) {
    try {
      // Find credential in simulated blockchain
      const blockchainRecord = this.simulatedChain.find(
        record => record.credentialId === credentialId
      );

      if (!blockchainRecord) {
        return {
          verified: false,
          message: 'Credential not found on blockchain',
        };
      }

      // Verify file hash matches
      const fileHashMatches = blockchainRecord.fileHash === fileHash;

      return {
        verified: fileHashMatches && blockchainRecord.status === 'recorded',
        credentialId,
        transactionId: blockchainRecord.transactionId,
        blockNumber: this.simulatedChain.indexOf(blockchainRecord),
        timestamp: blockchainRecord.blockchainTimestamp,
        credentialName: blockchainRecord.credentialName,
        issuer: blockchainRecord.issuer,
        verificationStatus: blockchainRecord.verificationStatus,
        fileHashMatches,
        immutable: blockchainRecord.immutable,
        message: fileHashMatches ? 'Credential verified' : 'File hash mismatch',
      };
    } catch (err) {
      console.error('Blockchain verification error:', err);
      throw new Error('Failed to verify credential on blockchain');
    }
  }

  /**
   * Get credential history from blockchain
   */
  async getCredentialHistory(credentialId) {
    try {
      const records = this.simulatedChain.filter(
        record => record.credentialId === credentialId
      );

      return {
        credentialId,
        recordCount: records.length,
        history: records.map(record => ({
          transactionId: record.transactionId,
          timestamp: record.blockchainTimestamp,
          blockNumber: this.simulatedChain.indexOf(record),
          status: record.verificationStatus,
          action: 'verified',
          verifiedBy: record.verifiedBy,
        })),
        message: `Found ${records.length} blockchain records`,
      };
    } catch (err) {
      console.error('Get history error:', err);
      throw new Error('Failed to get credential history');
    }
  }

  /**
   * Query caregiver's blockchain records
   */
  async getCaregiverBlockchainRecords(caregiverId) {
    try {
      const records = this.simulatedChain.filter(
        record => record.caregiverId === caregiverId
      );

      const summary = {
        caregiverId,
        totalRecords: records.length,
        verified: records.filter(r => r.verificationStatus === 'verified').length,
        pending: records.filter(r => r.verificationStatus === 'pending').length,
        rejected: records.filter(r => r.verificationStatus === 'rejected').length,
        records: records.map(r => ({
          credentialId: r.credentialId,
          credentialName: r.credentialName,
          transactionId: r.transactionId,
          timestamp: r.blockchainTimestamp,
          status: r.verificationStatus,
        })),
      };

      return summary;
    } catch (err) {
      console.error('Get caregiver records error:', err);
      throw new Error('Failed to get caregiver blockchain records');
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate blockchain proof for credential
   */
  async generateCredentialProof(credentialId) {
    try {
      const record = this.simulatedChain.find(
        r => r.credentialId === credentialId
      );

      if (!record) {
        throw new Error('Credential not found on blockchain');
      }

      const proof = {
        credentialId,
        credentialName: record.credentialName,
        issuer: record.issuer,
        transactionId: record.transactionId,
        blockNumber: this.simulatedChain.indexOf(record),
        timestamp: record.blockchainTimestamp,
        networkName: record.networkName,
        proofHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(record))
          .digest('hex'),
        verifyUrl: `https://carelink.platform/verify/${credentialId}/${record.transactionId}`,
      };

      return proof;
    } catch (err) {
      console.error('Generate proof error:', err);
      throw err;
    }
  }

  /**
   * Revoke credential on blockchain (mark as revoked, not deletable)
   */
  async revokeCredentialOnBlockchain(credentialId, reason) {
    try {
      const recordIndex = this.simulatedChain.findIndex(
        r => r.credentialId === credentialId
      );

      if (recordIndex === -1) {
        throw new Error('Credential not found on blockchain');
      }

      // Add revocation record (immutable - cannot delete)
      const revocationRecord = {
        ...this.simulatedChain[recordIndex],
        status: 'revoked',
        revocationReason: reason,
        revokedAt: new Date().toISOString(),
        transactionId: this.generateTransactionId(),
      };

      this.simulatedChain.push(revocationRecord);

      return {
        success: true,
        credentialId,
        status: 'revoked',
        reason,
        revokedAt: revocationRecord.revokedAt,
        message: 'Credential revoked on blockchain',
      };
    } catch (err) {
      console.error('Revoke credential error:', err);
      throw new Error('Failed to revoke credential on blockchain');
    }
  }

  /**
   * Get blockchain network stats
   */
  async getBlockchainStats() {
    return {
      networkName: this.blockchainNetwork,
      channelName: this.channel,
      chaincodeName: this.chaincodeName,
      totalRecords: this.simulatedChain.length,
      verifiedCredentials: this.simulatedChain.filter(
        r => r.verificationStatus === 'verified'
      ).length,
      revokedCredentials: this.simulatedChain.filter(
        r => r.status === 'revoked'
      ).length,
      pendingCredentials: this.simulatedChain.filter(
        r => r.verificationStatus === 'pending'
      ).length,
      lastUpdate: this.simulatedChain.length > 0 
        ? this.simulatedChain[this.simulatedChain.length - 1].blockchainTimestamp
        : null,
    };
  }
}

export const blockchainService = new BlockchainService();

