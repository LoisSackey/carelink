import axios from 'axios';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';

const PAYSTACK_BASE = 'https://api.paystack.co';

export const initializePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Missing bookingId' });

    const booking = await Booking.findById(bookingId).populate('userId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const email = booking.userId?.email || req.body.email;
    if (!email) return res.status(400).json({ message: 'No customer email available' });

    // Amount in kobo/cents - accept booking.totalPrice or totalCost
    const amountN = booking.totalPrice ?? booking.totalCost ?? 0;
    const amount = Math.round(Number(amountN) * 100);

    const response = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      { email, amount, metadata: { bookingId } },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    return res.json(response.data);
  } catch (error) {
    console.error('Paystack initialize error', error?.response?.data || error.message);
    return next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ message: 'Missing reference' });

    const response = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const data = response.data;

    // If successful, update booking and send notifications
    if (data?.data?.status === 'success') {
      const metadata = data.data.metadata || {};
      const bookingId = metadata.bookingId;
      if (bookingId) {
        const booking = await Booking.findById(bookingId)
          .populate('userId', 'name email')
          .populate('caregiverId', 'name email');
        if (booking) {
          booking.paymentMethod = 'bank';
          booking.paymentStatus = 'completed';
          booking.transactionId = reference;
          booking.paymentDate = new Date();
          await booking.save();

          // Send notification and message to caregiver
          try {
            const computeRange = () => {
              const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
                ? booking.bookingDates
                : [booking.bookingDate];
              const first = new Date(dates[0]).toLocaleDateString();
              return dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
            };
            // Create notification
            const caregiverNotification = new Notification({
              recipientId: booking.caregiverId._id,
              senderId: booking.userId._id,
              bookingId: booking._id,
              message: `Payment received for booking on ${computeRange()}. Amount: GH₵${booking.totalPrice.toFixed(2)}`,
              type: 'payment',
              link: `/caregiver-dashboard?booking=${booking._id}`,
            });
            await caregiverNotification.save();

            // Create system message
            const systemMessage = new Message({
              senderId: booking.userId._id,
              receiverId: booking.caregiverId._id,
              bookingId: booking._id,
              content: `Payment of GH₵${booking.totalPrice.toFixed(2)} has been received via Bank Transfer for the booking on ${computeRange()}. Please confirm receipt and review the booking details.`,
              type: 'system',
            });
            await systemMessage.save();
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Don't fail the payment if notification fails
          }
        }
      }
    }

    return res.json(data);
  } catch (error) {
    console.error('Paystack verify error', error?.response?.data || error.message);
    return next(error);
  }
};

// Webhook endpoint to receive Paystack events (use raw body when registering)
export const paymentWebhook = async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    // req.body is raw buffer when using express.raw
    const rawBody = req.body;
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (signature !== hash) {
      console.warn('Invalid Paystack signature');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    const eventName = event.event;

    if (eventName === 'charge.success') {
      const data = event.data || {};
      const reference = data.reference;
      const metadata = data.metadata || {};
      const bookingId = metadata.bookingId;

      if (bookingId) {
        const booking = await Booking.findById(bookingId)
          .populate('userId', 'name email')
          .populate('caregiverId', 'name email');
        if (booking) {
          booking.paymentMethod = 'bank';
          booking.paymentStatus = 'completed';
          booking.transactionId = reference;
          booking.paymentDate = new Date();
          await booking.save();

          // Send notification and message to caregiver
          try {
            // compute date range string
            const computeRange = () => {
              const dates = Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0
                ? booking.bookingDates
                : [booking.bookingDate];
              const first = new Date(dates[0]).toLocaleDateString();
              return dates.length > 1 ? `${first} to ${new Date(dates[dates.length-1]).toLocaleDateString()}` : first;
            };

            // Create notification
            const caregiverNotification = new Notification({
              recipientId: booking.caregiverId._id,
              senderId: booking.userId._id,
              bookingId: booking._id,
              message: `Payment received for booking on ${computeRange()}. Amount: GH₵${booking.totalPrice.toFixed(2)}`,
              type: 'payment',
              link: `/caregiver-dashboard?booking=${booking._id}`,
            });
            await caregiverNotification.save();

            // Create system message
            const systemMessage = new Message({
              senderId: booking.userId._id,
              receiverId: booking.caregiverId._id,
              bookingId: booking._id,
              content: `Payment of GH₵${booking.totalPrice.toFixed(2)} has been received via Bank Transfer for the booking on ${computeRange()}. Please confirm receipt and review the booking details.`,
              type: 'system',
            });
            await systemMessage.save();
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
          }
        }
      }
    }

    // Acknowledge receipt
    return res.status(200).send('ok');
  } catch (error) {
    console.error('Webhook error', error?.message || error);
    return next(error);
  }
};
