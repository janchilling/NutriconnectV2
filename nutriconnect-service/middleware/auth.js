const axios = require('axios');
const User = require('../models/User');

// Middleware to authenticate requests using the auth service token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authorization token required' 
      });
    }
    
    const accessToken = token.substring(7);
    
    // Verify token with the auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    try {
      const response = await axios.get(`${authServiceUrl}/api/verify`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.data || !response.data.success) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid or expired token' 
        });
      }
      
      const { uin, user } = response.data;
      
      // Find or create user in our local database
      let localUser = await User.findOne({ uin });
      if (!localUser) {
        localUser = new User({
          uin,
          name: user?.name,
          phone: user?.phone,
          email: user?.email,
          guardianOf: user?.guardianOf || [],
          createdVia: 'auth-service'
        });
        await localUser.save();
      } else {
        // Update last login
        localUser.lastLogin = new Date();
        await localUser.save();
      }
      
      req.user = localUser;
      req.token = accessToken;
      next();
      
    } catch (authError) {
      console.error('Auth service verification failed:', authError.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Token verification failed' 
      });
    }
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Middleware to get user info from token (optional authentication)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    
    if (!token || !token.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const accessToken = token.substring(7);
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    try {
      const response = await axios.get(`${authServiceUrl}/api/verify`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.data && response.data.success) {
        const { uin } = response.data;
        const localUser = await User.findOne({ uin });
        req.user = localUser;
        req.token = accessToken;
      } else {
        req.user = null;
      }
    } catch (authError) {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};