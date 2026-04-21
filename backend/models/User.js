import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    userType: {
      type: String,
      enum: ['family', 'caregiver', 'admin'],
      default: 'family',
    },
    profilePicture: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    approved: {
      type: Boolean,
      default: false, // we'll explicitly set true for non-caregivers during registration
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Caregiver-specific fields
    serviceType: {
      type: String,
      enum: ['eldercare', 'childcare', 'physical-therapy', 'nursing', 'companionship', 'other'],
    },
    location: {
      type: String, // Service location (e.g., "Accra, Greater Accra Region")
    },
    latitude: {
      type: Number,
      default: 0,
    },
    longitude: {
      type: Number,
      default: 0,
    },
    licenseNumber: {
      type: String,
    },
    bio: {
      type: String,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    dailyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    weeklyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    certifications: [
      {
        type: String,
      },
    ],
    availability: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false },
    },
    rateUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    // Services fields for matching
    providedServices: [{
      type: String,
      enum: ['Basic life needs', 'Companionship', 'Physiotherapy', 'Feeding assistance', 'Mobility support']
    }],
    neededServices: [{
      type: String,
      enum: ['Basic life needs', 'Companionship', 'Physiotherapy', 'Feeding assistance', 'Mobility support']
    }],
    // Payment information for caregivers
    mobileMoneyNumber: {
      type: String,
    },
    mobileMoneyName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    accountName: {
      type: String,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // Account deletion fields
    deletionRequested: {
      type: Boolean,
      default: false,
    },
    deletionRequestedAt: {
      type: Date,
      default: null,
    },
    deletionStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure approval state is correct on creation or when userType changes
userSchema.pre('save', function (next) {
  if (this.isNew) {
    this.approved = this.userType === 'caregiver' ? false : true;
  } else if (this.isModified('userType')) {
    this.approved = this.userType === 'caregiver' ? false : true;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
