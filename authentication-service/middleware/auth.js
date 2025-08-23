const sludiService = require('../services/sludiService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7);
    
    // Validate token with SLUDI
    const validation = await sludiService.validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: validation.error || 'Token validation failed'
      });
    }

    // Add user info to request
    req.user = {
      uin: validation.uin,
      token: token
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    res.status(500).json({ 
      error: 'Authentication service error',
      message: 'Failed to validate token'
    });
  }
};

module.exports = {
  authenticateToken
};