import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware that optionally parses a JWT token if provided but does not reject
// requests without authentication. Useful for flows where both logged-in and
// guest users can perform the same action (e.g. creating a booking).
export const attachUser = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7);
      } else {
        token = req.headers.authorization;
      }
    }

    if (!token) {
      // no token supplied, simply continue as guest
      return next();
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      try {
        const user = await User.findById(decoded.id).select('-password');
        req.user = user;
      } catch (fetchErr) {
        console.warn('Failed to load user in attachUser:', fetchErr.message);
        req.user = null;
      }
    } catch (jwtErr) {
      // token invalid or expired; ignore and treat as guest
      console.warn('attachUser: invalid token, treating as guest:', jwtErr.message);
    }

    next();
  } catch (err) {
    console.error('attachUser middleware error:', err.message);
    next();
  }
};

export default attachUser;
