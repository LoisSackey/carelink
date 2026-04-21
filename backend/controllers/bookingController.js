import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';
import { saveReceiptFile, deleteReceiptFile } from '../utils/uploadUtils.js';

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    // allow booking.userId supplied from body (legacy) or from authenticated user
    if (req.userId && !req.body.userId) {
      req.body.userId = req.userId;
    }

    // Handle multiple dates as a single booking
    const bookingData = { ...req.body };
    
    console.log('createBooking - Received request body:');
    console.log('  - bookingDate:', bookingData.bookingDate);
    console.log('  - bookingDates type:', Array.isArray(bookingData.bookingDates) ? 'array' : typeof bookingData.bookingDates);
    console.log('  - bookingDates:', bookingData.bookingDates);

    // Ensure bookingDate is valid (required by schema)
    let bookingDate = null;
    let bookingDates = [];

    // If bookingDate is provided, use it
    if (bookingData.bookingDate) {
      const parsedDate = new Date(bookingData.bookingDate);
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid bookingDate:', bookingData.bookingDate);
        return res.status(400).json({ message: 'Invalid bookingDate format' });
      }
      bookingDate = parsedDate;
      console.log('Using provided bookingDate:', bookingDate);
    }

    // If bookingDates array is provided, use it
    if (Array.isArray(bookingData.bookingDates) && bookingData.bookingDates.length > 0) {
      bookingDates = bookingData.bookingDates.map(d => {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) {
          throw new Error(`Invalid date in bookingDates: ${d}`);
        }
        return dateObj;
      });
      console.log('Using bookingDates array with', bookingDates.length, 'dates');
      
      // If no bookingDate was provided, use first date from array
      if (!bookingDate) {
        bookingDate = bookingDates[0];
        console.log('Set bookingDate from first date in bookingDates array');
      }
    } 
    // If neither provided, error
    else if (!bookingDate) {
      console.error('No dates provided - either bookingDate or bookingDates is required');
      return res.status(400).json({ 
        message: 'At least one booking date is required. Provide "bookingDate" or "bookingDates" array.'
      });
    }

    // Ensure bookingDate is always set (required by schema)
    bookingData.bookingDate = bookingDate;
    
    // Keep bookingDates if provided, otherwise create array with single date
    if (bookingDates.length > 0) {
      bookingData.bookingDates = bookingDates;
    } else {
      bookingData.bookingDates = [bookingDate];
    }

    console.log('Final bookingData - date:', bookingData.bookingDate.toISOString(), '| dates count:', bookingData.bookingDates.length);

    const booking = new Booking(bookingData);
    console.log('Booking object created, attempting to save...');
    console.log('bookingData before save:', JSON.stringify({
      bookingDate: bookingData.bookingDate,
      bookingDates: bookingData.bookingDates,
      numberOfDays: bookingData.numberOfDays,
      bookingDatesLength: bookingData.bookingDates?.length
    }, null, 2));
    await booking.save();
    console.log('Booking saved successfully with ID:', booking._id);
    console.log('Saved booking data:', JSON.stringify({
      bookingDate: booking.bookingDate,
      bookingDates: booking.bookingDates,
      numberOfDays: booking.numberOfDays,
      bookingDatesLength: booking.bookingDates?.length
    }, null, 2));

    // Populate booking data for notification message
    const populatedBooking = await booking.populate('caregiverId', 'name');
    // populate userId only if present
    let familyData = null;
    if (booking.userId) {
      familyData = await booking.populate('userId', 'name');
    }

    // Format date range for notification
    const dateCount = booking.bookingDates.length;
    const firstDate = new Date(booking.bookingDates[0]).toLocaleDateString();
    const lastDate = dateCount > 1 ? new Date(booking.bookingDates[dateCount - 1]).toLocaleDateString() : firstDate;
    const dateRange = dateCount === 1 ? firstDate : `${firstDate} to ${lastDate}`;

    // Create notification for the caregiver - always done
    const caregiverNotification = new Notification({
      recipientId: booking.caregiverId,
      senderId: booking.userId || null,
      bookingId: booking._id,
      message: booking.userId
        ? `New booking request from a family member for ${dateCount} day(s): ${dateRange}`
        : `New booking request (guest) for ${dateCount} day(s): ${dateRange}`,
      type: 'booking',
      link: `/caregiver-dashboard?booking=${booking._id}`,
    });
    await caregiverNotification.save();

    // Create notification for the family member only if we know who they are
    if (booking.userId) {
      const familyNotification = new Notification({
        recipientId: booking.userId,
        senderId: booking.caregiverId,
        bookingId: booking._id,
        message: `Your booking request for ${dateCount} day(s) (${dateRange}) has been submitted to ${populatedBooking.caregiverId.name}`,
        type: 'booking',
        link: `/family-dashboard?booking=${booking._id}`,
      });
      await familyNotification.save();
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req, res) => {
  try {
    const { userId, status, caregiverId } = req.query;
    const filter = {};

    if (userId) {
      filter.$or = [
        { userId: userId },
        { familyId: userId },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (caregiverId) {
      filter.caregiverId = caregiverId;
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email phone location address city state profilePicture')
      .populate('familyId', 'name email phone location address city state profilePicture')
      .populate('caregiverId', 'name email phone location address city state profilePicture')
      .sort({ bookingDate: -1, startDate: -1 });
    
    console.log(`getBookings - Found ${bookings.length} bookings for filter:`, JSON.stringify(filter));
    
    // normalize each booking to ensure consistent data structure
    bookings.forEach((b, idx) => {
      console.log(`Booking ${idx}:`, {
        id: b._id,
        bookingDate: b.bookingDate,
        bookingDatesCount: b.bookingDates?.length,
        bookingDates: b.bookingDates,
        numberOfDays: b.numberOfDays
      });
      
      if (!Array.isArray(b.bookingDates) || b.bookingDates.length === 0) {
        const dateVal = b.bookingDate || b.startDate;
        if (dateVal) b.bookingDates = [dateVal];
        else b.bookingDates = [];
      }
      if (!b.serviceType) b.serviceType = 'daily';
      if (!b.bookingType) b.bookingType = 'daily';
      if (!b.numberOfDays) {
        b.numberOfDays = Array.isArray(b.bookingDates) ? b.bookingDates.length : 1;
      }
      // enforce defaults for time/duration
      b.startTime = b.startTime || '00:00';
      b.duration = b.duration || 1;
      
      console.log(`Booking ${idx} after normalization:`, {
        id: b._id,
        bookingDatesCount: b.bookingDates?.length,
        numberOfDays: b.numberOfDays
      });
    });
    
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone profilePicture address city state location')
      .populate('caregiverId', 'name email phone profilePicture address city state location');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    // normalize as in list endpoint
    if (!Array.isArray(booking.bookingDates) || booking.bookingDates.length === 0) {
      const dateVal = booking.bookingDate || booking.startDate;
      booking.bookingDates = dateVal ? [dateVal] : [];
    }
    booking.serviceType = booking.serviceType || 'daily';
    booking.bookingType = booking.bookingType || 'daily';
    booking.numberOfDays = booking.numberOfDays || (Array.isArray(booking.bookingDates) ? booking.bookingDates.length : 1);
    booking.startTime = booking.startTime || '00:00';
    booking.duration = booking.duration || 1;

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a booking
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBooking = async (req, res) => {
  try {
    // fetch existing booking so we can inspect previous status
    const prevBooking = await Booking.findById(req.params.id);
    if (!prevBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // if the status changed, send notifications to interested parties
    if (req.body.status && req.body.status !== prevBooking.status) {
      const newStatus = req.body.status;
      // caregiver accepted request and now family should pay
      if (newStatus === 'payment-pending') {
        // notify family that caregiver has accepted and payment can be made
        if (booking.userId) {
          const notification = new Notification({
            recipientId: booking.userId,
            senderId: booking.caregiverId || null,
            bookingId: booking._id,
            message: 'Your booking request has been accepted by the caregiver.',
            type: 'booking',
            link: `/family-dashboard?booking=${booking._id}`,
          });
          await notification.save();
        }
      }
      // could add other status-change notifications here as needed
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Private
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment information for a booking
// @route   PUT /api/bookings/:id/payment
// @access  Private
export const updatePayment = async (req, res) => {
  try {
    const { paymentMethod, transactionId, paymentStatus } = req.body;
    
    // Validate payment method
    if (!['momo', 'bank'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Retrieve booking so we can enforce status rules
    const bookingBefore = await Booking.findById(req.params.id);
    if (!bookingBefore) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow payments once caregiver has accepted
    if (bookingBefore.status === 'pending') {
      return res.status(400).json({ message: 'Cannot make payment before caregiver accepts booking' });
    }
    if (bookingBefore.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot make payment on a cancelled booking' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        paymentMethod,
        transactionId: transactionId || null,
        paymentStatus: paymentStatus || 'pending',
        paymentDate: paymentStatus === 'completed' ? new Date() : null,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate('caregiverId', 'name email').populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If payment is completed, send notification and message to caregiver
    if (paymentStatus === 'completed') {
      // Create notification for caregiver
      const caregiverNotification = new Notification({
        recipientId: booking.caregiverId._id,
        senderId: booking.userId._id,
        bookingId: booking._id,
        message: (() => {
          const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
            ? booking.bookingDates
            : [booking.bookingDate];
          const first = new Date(dates[0]).toLocaleDateString();
          const range = dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
          return `Payment received for booking on ${range}. Amount: GH₵${booking.totalPrice.toFixed(2)}`;
        })(),
        type: 'payment',
        link: `/caregiver-dashboard?booking=${booking._id}`,
      });
      await caregiverNotification.save();

      // Create system message for caregiver
      const systemMessage = new Message({
        senderId: booking.userId._id,
        receiverId: booking.caregiverId._id,
        bookingId: booking._id,
        content: (() => {
          const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
            ? booking.bookingDates
            : [booking.bookingDate];
          const first = new Date(dates[0]).toLocaleDateString();
          const range = dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
          return `Payment of GH₵${booking.totalPrice.toFixed(2)} has been received via ${paymentMethod === 'momo' ? 'Mobile Money' : 'Bank Transfer'} for the booking on ${range}. Please confirm receipt and review the booking details.`;
        })(),
        type: 'system',
      });
      await systemMessage.save();
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment information for a booking
// @route   GET /api/bookings/:id/payment
// @access  Private
export const getPaymentInfo = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select(
      'paymentMethod paymentStatus receiptUrl transactionId paymentDate totalPrice'
    );
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({
      bookingId: booking._id,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      receiptUrl: booking.receiptUrl,
      transactionId: booking.transactionId,
      paymentDate: booking.paymentDate,
      totalPrice: booking.totalPrice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload receipt for a booking
// @route   POST /api/bookings/:id/receipt
// @access  Private
export const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt file provided' });
    }

    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Delete old receipt if exists
    if (booking.receiptUrl) {
      deleteReceiptFile(booking.receiptUrl);
    }

    // Save new receipt
    const receiptUrl = await saveReceiptFile(req.file.buffer, req.file.originalname);

    // Update booking with receipt URL
    booking.receiptUrl = receiptUrl;
    await booking.save();

    res.status(200).json({
      message: 'Receipt uploaded successfully',
      receiptUrl: booking.receiptUrl,
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm payment receipt (caregiver confirms payment received)
// @route   PUT /api/bookings/:id/confirm-payment
// @access  Private
export const confirmPaymentReceipt = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('caregiverId', 'name email')
      .populate('userId', 'name email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

        // Ensure request is authenticated
    if (!req.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Verify caregiver is confirming their own booking
    const caregiverId = booking?.caregiverId?._id || booking?.caregiverId;
    if (!caregiverId) {
      return res.status(400).json({ message: 'Booking has no caregiver assigned' });
    }

    if (caregiverId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to confirm this payment' });
    }

    // Update payment status and mark booking confirmed
    booking.paymentStatus = 'completed';
    booking.paymentDate = new Date();
    booking.status = 'confirmed';
    await booking.save();

    // Create notification for family member
    const familyRecipientId = booking?.userId?._id || booking?.userId;
    const familySenderId = booking?.caregiverId?._id || booking?.caregiverId;
    const caregiverName = booking?.caregiverId?.name || 'Caregiver';

    const familyNotification = new Notification({
      recipientId: familyRecipientId,
      senderId: familySenderId,
      bookingId: booking._id,
      message: (() => {
        const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
          ? booking.bookingDates
          : [booking.bookingDate];
        const first = new Date(dates[0]).toLocaleDateString();
        const range = dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
        return `${caregiverName} has confirmed receipt of your payment for the booking on ${range}`;
      })(),
      type: 'payment',
      link: `/family-dashboard?booking=${booking._id}`,
    });
    await familyNotification.save();

    // Create system message for family member
    const systemMessage = new Message({
      senderId: familySenderId,
      receiverId: familyRecipientId,
      bookingId: booking._id,
      content: (() => {
        const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
          ? booking.bookingDates
          : [booking.bookingDate];
        const first = new Date(dates[0]).toLocaleDateString();
        const range = dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
        return `I have confirmed receipt of your payment of GH₵${booking.totalPrice.toFixed(2)}. Your booking for ${range} is confirmed. Looking forward to providing excellent care!`;
      })(),
      type: 'system',
    });
    await systemMessage.save();

    res.status(200).json({
      message: 'Payment confirmed successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
