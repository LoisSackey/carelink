import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// Create a new contact message
export const createContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
    });

    // Create notifications for all admin users about the new contact message
    try {
      const adminUsers = await User.find({ userType: 'admin' });
      const notificationPromises = adminUsers.map(admin =>
        new Notification({
          recipientId: admin._id,
          message: `New contact message from ${name}: ${subject}`,
          type: 'system',
          link: '#messages',
        }).save()
      );
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating admin notifications:', notificationError);
      // Don't fail the contact creation if notifications fail
    }

    res.status(201).json({
      message: 'Contact message sent successfully',
      contact,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: 'Failed to send contact message', error: error.message });
  }
};

// Get all contact messages (admin only)
export const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Failed to fetch contacts', error: error.message });
  }
};

// Get a single contact message
export const getContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ message: 'Failed to fetch contact', error: error.message });
  }
};

// Update contact status
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Please provide a status' });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json({
      message: 'Contact updated successfully',
      contact,
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Failed to update contact', error: error.message });
  }
};

// Delete a contact message
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Failed to delete contact', error: error.message });
  }
};
