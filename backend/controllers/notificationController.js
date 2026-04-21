import Notification from '../models/Notification.js';

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res) => {
  try {
    const { recipientId, senderId, bookingId, message, type, link } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({ message: 'recipientId and message are required' });
    }

    const notification = new Notification({
      recipientId,
      senderId,
      bookingId,
      message,
      type,
      link,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { recipientId, read } = req.query;

    const filter = {};
    if (recipientId) {
      filter.recipientId = recipientId;
    }
    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const notifications = await Notification.find(filter)
      .populate('senderId', 'name email')
      .populate('recipientId', 'name email')
      .populate('bookingId', 'bookingDate serviceType')
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread count for a user
// @route   GET /api/notifications/unread/:userId
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    });

    res.status(200).json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear all unread notifications for a user
// @route   PUT /api/notifications/clear/:userId
// @access  Private
export const clearUnreadNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany(
      { recipientId: userId, read: false },
      { read: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
