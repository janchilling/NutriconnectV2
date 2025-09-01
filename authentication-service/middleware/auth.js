const sludiService = require('../services/sludiService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        valid: false,
        error: 'Access token required',
        message: 'Please provide a valid Bearer token in format: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        success: false,
        valid: false,
        error: 'Empty token',
        message: 'Token cannot be empty'
      });
    }
    
    // Check for mock tokens (eSignet or test tokens)
    if (token.startsWith('esignet_') || token.startsWith('test_login_')) {
      console.log('🔓 Mock token detected, using fallback validation');
      
      // For mock tokens, return UIN001 user
      req.user = {
        uin: 'UIN001',
        token: token,
        name: 'Test User',
        phone: '+94771234567',
        email: 'testuser@nutriconnect.com',
        guardianOf: [],
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        scope: ['profile', 'openid']
      };
      
      console.log(`✅ Mock token validated for UIN: ${req.user.uin}`);
      return next();
    }
    
    // Validate token with SLUDI
    const validation = await sludiService.validateToken(token);
    
    if (!validation.valid) {
      return res.status(401).json({ 
        success: false,
        valid: false,
        error: 'Invalid token',
        message: validation.error || 'Token validation failed'
      });
    }

    // Add user info to request object
    req.user = {
      uin: validation.uin,
      token: token,
      // Add any additional user data from SLUDI validation
      name: validation.name || null,
      phone: validation.phone || null,
      email: validation.email || null,
      guardianOf: validation.guardianOf || [],
      issuedAt: validation.issuedAt || null,
      expiresAt: validation.expiresAt || null,
      scope: validation.scope || []
    };

    console.log(`✅ Token validated for UIN: ${validation.uin}`);
    next();
  } catch (error) {
    console.error('Token validation error:', error.message);
    
    // Determine if it's a network/service error or token error
    const isServiceError = error.message.includes('SLUDI') || 
                          error.message.includes('timeout') || 
                          error.message.includes('network');
    
    if (isServiceError) {
      res.status(503).json({ 
        success: false,
        valid: false,
        error: 'Authentication service unavailable',
        message: 'Unable to validate token at this time. Please try again.'
      });
    } else {
      res.status(500).json({ 
        success: false,
        valid: false,
        error: 'Authentication service error',
        message: 'Failed to validate token'
      });
    }
  }
};

// Optional: Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      req.user = null;
      return next();
    }
    
    // Try to validate token, but don't fail if invalid
    try {
      const validation = await sludiService.validateToken(token);
      
      if (validation.valid) {
        req.user = {
          uin: validation.uin,
          token: token,
          name: validation.name || null,
          phone: validation.phone || null,
          email: validation.email || null,
          guardianOf: validation.guardianOf || []
        };
      } else {
        req.user = null;
      }
    } catch (validationError) {
      console.warn('Optional auth validation failed:', validationError.message);
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error.message);
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};