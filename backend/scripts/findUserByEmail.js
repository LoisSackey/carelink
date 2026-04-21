import connectDB from '../config/database.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/findUserByEmail.js user@example.com');
  process.exit(2);
}

const run = async () => {
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
    if (!user) {
      console.log(JSON.stringify({ found: false, email }, null, 2));
      process.exit(0);
    }
    // Print key fields
    const out = {
      found: true,
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      approved: user.approved,
      profilePicture: user.profilePicture || null,
      isActive: user.isActive,
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
};

run();
