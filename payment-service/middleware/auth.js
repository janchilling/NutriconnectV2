const axios = require('axios');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        error: 'Empty token',
        message: 'Token cannot be empty'
      });
    }
    
    // Verify token with auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    try {
      const response = await axios.get(`${authServiceUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.data || !response.data.success) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Token validation failed'
        });
      }
      
      // Add user info to request object
      req.user = response.data.user;
      req.user.token = token;
      
      console.log(`✅ Payment Service - Token validated for UIN: ${req.user.uin}`);
      next();
      
    } catch (authError) {
      console.error('Auth service verification failed:', authError.message);
      return res.status(401).json({
        success: false,
        error: 'Token verification failed',
        message: 'Unable to validate token'
      });
    }
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal authentication error'
    });
  }
};

module.exports = {
  authenticateToken
};