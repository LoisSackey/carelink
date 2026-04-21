import mongoose from 'mongoose';

const credentialSchema = new mongoose.Schema(
  {
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    credentialType: {
      type: String,
      enum: [
        'nursing-license',
        'cpr-certification',
        'first-aid-certification',
        'background-check',
        'health-screening',
        'training-certificate',
        'degree',
        'other'
      ],
      required: true,
    },
    credentialName: {
      type: String,
      required: true, // e.g., "CPR Certification 2024"
    },
    issuer: {
      type: String, // e.g., "Red Cross", "Ministry of Health"
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    credentialNumber: {
      type: String, // License/certificate number for verification
    },
    fileUrl: {
      type: String,
      required: true, // Path or URL to the uploaded file
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // In bytes
    },
    mimeType: {
      type: String, // e.g., "application/pdf", "image/jpeg"
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who verified
    },
    verificationNotes: {
      type: String, // Reason for rejection or additional notes
    },
    verificationDate: {
      type: Date,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    blockchainHash: {
      type: String, // Hash of credential for blockchain verification
    },
    blockchainVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to check if credential is expired
credentialSchema.pre('save', function(next) {
  if (this.expiryDate) {
    this.isExpired = new Date() > this.expiryDate;
  }
  next();
});

// Index for faster queries
credentialSchema.index({ caregiverId: 1, verificationStatus: 1 });
credentialSchema.index({ credentialType: 1 });

const Credential = mongoose.model('Credential', credentialSchema);
export default Credential;
