import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Notification from './models/Notification.js';
import connectDB from './config/database.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin', userType: 'admin' });

    if (adminExists) {
      console.log('Admin user already exists');
      // Create a test notification for the admin
      const existingNotification = await Notification.findOne({ 
        recipientId: adminExists._id, 
        message: 'Test notification: Welcome to the admin dashboard!' 
      });
      
      if (!existingNotification) {
        await Notification.create({
          recipientId: adminExists._id,
          message: 'Test notification: Welcome to the admin dashboard! This is a test to verify the notification system is working.',
          type: 'system',
          link: '#overview',
        });
        console.log('Test notification created for admin');
      } else {
        console.log('Test notification already exists');
      }
    } else {
      // Create admin user with credentials admin/admin (password will be hashed by schema)
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin',
        password: 'admin',
        userType: 'admin',
        phone: '+233 555 000 000',
        verified: true,
        approved: true,
      });

      await adminUser.save();
      console.log('Admin user created successfully');
      console.log('Email: admin');
      console.log('Password: admin');
      
      // Create a test notification for the admin
      await Notification.create({
        recipientId: adminUser._id,
        message: 'Test notification: Welcome to the admin dashboard! This is a test to verify the notification system is working.',
        type: 'system',
        link: '#overview',
      });
      console.log('Test notification created for admin');
    }
    
    // Create sample family users
    const familyUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        userType: 'family',
        phone: '+233 501 234 567',
        city: 'Accra',
        state: 'Greater Accra',
        verified: true,
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        userType: 'family',
        phone: '+233 502 345 678',
        city: 'Kumasi',
        state: 'Ashanti',
        verified: true,
      }
    ];

    // Create sample caregiver users
    const caregiverUsers = [
      {
        name: 'Ama Mensah',
        email: 'ama@example.com',
        password: 'password123',
        userType: 'caregiver',
        phone: '+233 503 456 789',
        city: 'Accra',
        state: 'Greater Accra',
        verified: true,
        approved: true,
        serviceType: 'eldercare',
        bio: 'Experienced eldercare professional with 8+ years specializing in seniors with mobility issues and chronic conditions. Compassionate, patient, and certified in CPR.',
        dailyRate: 250,
        weeklyRate: 1400,
        rating: 4.8,
        totalReviews: 24,
        certifications: ['CPR Certified', 'Senior Care', 'First Aid'],
      },
      {
        name: 'Akosua Boateng',
        email: 'akosua@example.com',
        password: 'password123',
        userType: 'caregiver',
        phone: '+233 504 567 890',
        city: 'Accra',
        state: 'Greater Accra',
        verified: true,
        approved: true,
        serviceType: 'childcare',
        bio: 'Loving childcare provider with 6 years of experience. Specializing in infants and toddlers. References available. Flexible availability.',
        dailyRate: 180,
        weeklyRate: 900,
        rating: 4.9,
        totalReviews: 18,
        certifications: ['Childcare Certificate', 'Infant Care', 'CPR'],
      },
      {
        name: 'Kofi Osei',
        email: 'kofi@example.com',
        password: 'password123',
        userType: 'caregiver',
        phone: '+233 505 678 901',
        city: 'Tema',
        state: 'Greater Accra',
        verified: true,
        approved: false,
        serviceType: 'physical-therapy',
        bio: 'Licensed physical therapist with 10 years in home-based rehabilitation. Specialized training in stroke recovery and mobility restoration.',
        dailyRate: 350,
        weeklyRate: 1800,
        rating: 4.7,
        totalReviews: 15,
        certifications: ['PT License', 'Home Therapy', 'Rehabilitation Specialist'],
      }
    ];

    // Check and create users
    // First delete existing caregivers to refresh with new rates
    await User.deleteMany({ userType: 'caregiver' });
    console.log('Cleared existing caregivers');

    let familyCount = 0;
    for (const familyData of familyUsers) {
      const exists = await User.findOne({ email: familyData.email });
      if (!exists) {
        await User.create(familyData);
        familyCount++;
      }
    }

    let caregiverCount = 0;
    for (const caregiverData of caregiverUsers) {
      const exists = await User.findOne({ email: caregiverData.email });
      if (!exists) {
        await User.create(caregiverData);
        caregiverCount++;
      }
    }

    console.log(`Created ${familyCount} family users`);
    console.log(`Created ${caregiverCount} caregiver users`);

    console.log('\nSample Credentials:');
    console.log('Admin:');
    console.log('  Email: admin | Password: admin');
    console.log('\nFamily Users:');
    familyUsers.forEach((user) => {
      console.log(`  Email: ${user.email} | Password: password123`);
    });
    console.log('\nCaregiver Users:');
    caregiverUsers.forEach((user) => {
      console.log(`  Email: ${user.email} | Password: password123`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDatabase();
