import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      family: 4 // Use IPv4
    });
    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`✗ Error connecting to MongoDB: ${error.message}`);
    if (error.message.includes('whitelisted')) {
      console.error('Your IP address is not whitelisted in MongoDB Atlas.');
      console.error('Add your IP to the whitelist at: https://cloud.mongodb.com/security/access');
    }
    process.exit(1);
  }
};

export default connectDB;
