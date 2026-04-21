import Message from '../models/Message.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, bookingId } = req.body;
    const senderId = req.userId; // From auth middleware

    // Validate input
    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({
        message: 'Receiver ID and message content are required',
      });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        message: 'Receiver not found',
      });
    }

    // Get sender's user type
    const sender = await User.findById(senderId).select('userType');
    if (!sender) {
      return res.status(404).json({
        message: 'Sender not found',
      });
    }

    // Check if there's an active booking between sender and receiver
    let activeBooking = null;
    if (sender.userType === 'caregiver') {
      // Sender is caregiver, check for active booking with receiver (family)
      activeBooking = await Booking.findOne({
        caregiverId: senderId,
        userId: receiverId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      });
    } else if (sender.userType === 'family') {
      // Sender is family, check for active booking with receiver (caregiver)
      activeBooking = await Booking.findOne({
        userId: senderId,
        caregiverId: receiverId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      });
    }

    if (!activeBooking) {
      return res.status(403).json({
        message: 'Cannot send message: No active booking found between these users',
      });
    }

    // Create message with booking reference
    const message = await Message.create({
      senderId,
      receiverId,
      content: content.trim(),
      bookingId: bookingId || activeBooking._id, // Use provided bookingId or the active booking
    });

    // Populate sender info
    const populatedMessage = await message.populate('senderId', 'name email');

    // Emit real-time event to booking room if socket server is attached
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        const room = `booking_${(message.bookingId || activeBooking._id).toString()}`;
        io.to(room).emit('newMessage', populatedMessage);
      }
    } catch (emitErr) {
      console.error('Failed to emit socket message:', emitErr.message);
    }

    // Create a notification for the receiver so it shows in their notification bar
    try {
      const notif = new Notification({
        recipientId: receiverId,
        senderId: senderId,
        bookingId: message.bookingId || activeBooking._id,
        message: content.trim().length > 120 ? content.trim().slice(0, 117) + '...' : content.trim(),
        type: 'message',
        link: `/messages?user=${senderId}`,
      });
      await notif.save();

      // Emit notification to receiver-specific room if socket is available
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io) {
          const userRoom = `user_${receiverId}`;
          io.to(userRoom).emit('newNotification', notif);
        }
      } catch (emitErr) {
        console.error('Failed to emit socket notification:', emitErr.message);
      }
    } catch (notifErr) {
      console.error('Failed to create notification for message:', notifErr.message);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

// Get conversation between two users
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId; // From auth middleware

    // Get current user's type
    const currentUser = await User.findById(currentUserId).select('userType');
    if (!currentUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Check if there's an active booking between these users
    let hasActiveBooking = false;
    if (currentUser.userType === 'caregiver') {
      // Current user is caregiver, check if they have an active booking with this family
      const booking = await Booking.findOne({
        caregiverId: currentUserId,
        userId: userId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      });
      hasActiveBooking = !!booking;
    } else if (currentUser.userType === 'family') {
      // Current user is family, check if they have an active booking with this caregiver
      const booking = await Booking.findOne({
        userId: currentUserId,
        caregiverId: userId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      });
      hasActiveBooking = !!booking;
    }

    if (!hasActiveBooking) {
      return res.status(403).json({
        message: 'No active booking found between these users',
      });
    }

    // Get all messages between users
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
    })
      .populate('senderId', 'name email userType')
      .populate('receiverId', 'name email userType')
      .populate('bookingId', 'bookingDate status')
      .sort({ createdAt: -1 })
      .limit(100);

    // Mark messages as read
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
      { read: true }
    );

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      message: 'Failed to fetch conversation',
      error: error.message,
    });
  }
};

// Get all conversations for current user
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.userId;

    // Get current user's type
    const currentUser = await User.findById(currentUserId).select('userType');
    if (!currentUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Get active bookings for the current user
    let activeBookings = [];
    if (currentUser.userType === 'caregiver') {
      // For caregivers, get active bookings where they are the caregiver
      activeBookings = await Booking.find({
        caregiverId: currentUserId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      }).select('userId');
    } else if (currentUser.userType === 'family') {
      // For families, get active bookings where they are the user
      activeBookings = await Booking.find({
        userId: currentUserId,
        status: { $in: ['pending', 'payment-pending', 'confirmed'] }
      }).select('caregiverId');
    }

    // Extract the user IDs from active bookings
    const activeUserIds = activeBookings.map(booking =>
      currentUser.userType === 'caregiver' ? booking.userId : booking.caregiverId
    ).filter(id => id); // Remove null/undefined

    if (activeUserIds.length === 0) {
      // No active bookings, return empty conversations
      return res.status(200).json([]);
    }

    // Get unique conversations only with users who have active bookings
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId, receiverId: { $in: activeUserIds } },
            { senderId: { $in: activeUserIds }, receiverId: currentUserId },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', currentUserId] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', currentUserId] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    // Populate user details and filter based on active bookings
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const user = await User.findById(conv._id).select('_id name email userType avatar');
        return {
          userId: conv._id,
          user: user ? { _id: user._id, ...user.toObject() } : null,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          unreadCount: conv.unreadCount,
        };
      })
    );

    // Additional filter to ensure only active booking users are included
    const filteredConversations = conversationsWithDetails.filter(
      (conv) => conv.user && activeUserIds.includes(conv.user._id.toString())
    );

    res.status(200).json(filteredConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.userId;

    const unreadCount = await Message.countDocuments({
      receiverId: currentUserId,
      read: false,
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    await Message.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
      { read: true }
    );

    res.status(200).json({
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      message: 'Failed to mark messages as read',
      error: error.message,
    });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
      });
    }

    // Verify ownership
    if (message.senderId.toString() !== currentUserId) {
      return res.status(403).json({
        message: 'Not authorized to delete this message',
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      message: 'Failed to delete message',
      error: error.message,
    });
  }
};
