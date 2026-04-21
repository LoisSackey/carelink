import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import userRoutes from './routes/userRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import credentialRoutes from './routes/credentialRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import blockchainRoutes from './routes/blockchainRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { paymentWebhook } from './controllers/paymentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
// Configure Helmet but allow cross-origin resource policy for static uploads
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate limiting — relaxed in development, strict in production
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 300,   // dev: generous for hot-reload/polling; prod: strict
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev && false, // set to () => true to disable entirely in dev
});
app.use(limiter);

// Paystack webhook needs raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
// Serve uploaded files and allow cross-origin access so frontend (dev server)
// can load images from a different origin (e.g., Vite at localhost:5173)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // allow credentials or specific headers if needed in future
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err.message);

  // Multer-specific errors often mean invalid file or too large
  if (err.name === 'MulterError' || err.message === 'Invalid file type') {
    // choose 400 Bad Request for client-side issues
    return res.status(400).json({ message: err.message });
  }

  // if the controller set a status earlier, use it (for example res.status(400).send())
  const statusCode = err.status || 500;
  res.status(statusCode).json({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server (attach socket.io)
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connection established');

    const server = http.createServer(app);
    const io = new IOServer(server, {
      cors: {
        origin: '*',
      },
    });

    // expose io to controllers via app
    app.set('io', io);

    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('joinBooking', (bookingId) => {
        const room = `booking_${bookingId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      });

      // allow clients to join a user-specific room for personal notifications
      socket.on('joinUser', (userId) => {
        const room = `user_${userId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined user room ${room}`);
      });

      socket.on('joinUserRoom', (roomName) => {
        // support a more explicit room name if client sends it
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      });

      socket.on('leaveBooking', (bookingId) => {
        const room = `booking_${bookingId}`;
        socket.leave(room);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    server.listen(PORT, () => {
      console.log(`Server (with sockets) is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();
