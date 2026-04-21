import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // optional to support guest bookings
      required: false,
      default: null,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookingDate: {
      type: Date,
      // Required - will be set to first date in bookingDates or the single date
      required: true,
    },
    // Support for multiple dates in a single booking
    bookingDates: [{
      type: Date,
    }],
    startTime: {
      type: String,
      default: "00:00",
      required: false,
    },
    duration: {
      type: Number,
      default: 1,
      min: 1,
      required: false,
    },
    serviceType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    status: {
      type: String,
      enum: ['pending', 'payment-pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
    neededServices: [{
      type: String,
      enum: ['Basic life needs', 'Companionship', 'Physiotherapy', 'Feeding assistance', 'Mobility support']
    }],
    totalPrice: {
      type: Number,
      required: true,
    },
    // Payment fields
    paymentMethod: {
      type: String,
      enum: ['momo', 'bank'],
      default: 'momo',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    // Review fields
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
      default: null,
    },
    reviewNotes: {
      type: String,
      required: false,
      default: null,
    },
    // Legacy field support
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    totalCost: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
