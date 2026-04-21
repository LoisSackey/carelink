import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes and verify JWT token
export const protectRoute = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token;
    
    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7); // Remove "Bearer " prefix
      } else {
        token = req.headers.authorization;
      }
    }

    // Check if token exists
    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ message: 'Not authorized to access this route - No token provided' });
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;

      // also attach a user object so controllers that reference req.user work
      try {
        const user = await User.findById(decoded.id).select('-password');
        req.user = user;

        // enforce admin approval for caregivers on most protected routes
        if (user && user.userType === 'caregiver' && !user.approved) {
          // allow document upload during signup (frontend will supply token)
          // the upload endpoint is POST /api/credentials/upload
          if (req.method === 'POST' && req.originalUrl.startsWith('/api/credentials/upload')) {
            // continue without blocking
          } else {
            console.warn(`Blocked unapproved caregiver ${user._id} from route ${req.originalUrl}`);
            return res.status(403).json({ message: 'Your account is pending admin approval.' });
          }
        }
      } catch (fetchErr) {
        console.warn('Could not fetch user in auth middleware:', fetchErr.message);
        req.user = null;
      }

      next();
    } catch (jwtErr) {
      console.error('JWT verification failed:', jwtErr.message);
      return res.status(401).json({ message: 'Not authorized - Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Not authorized to access this route' });
  }
};

export default protectRoute;
