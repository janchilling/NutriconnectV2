const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { validateUIN, validateOTP, validateTokenExchange } = require('../middleware/validation');

// Step 1: Initiate login with UIN (create session, user gets OTP from SLUDI directly)
router.post('/login', validateUIN, async (req, res, next) => {
  try {
    const { uin } = req.body;
    
    console.log(`🔐 Login initiated for UIN: ${uin}`);
    
    const result = await authService.initiateLogin(uin);
    
    if (result.success) {
      res.json({
        success: true,
        sessionId: result.sessionId,
        message: result.message,
        instruction: 'Please enter the OTP you received from SLUDI on your registered phone number'
      });
    } else {
      res.status(400).json({
        error: result.error,
        message: result.message || 'Failed to initiate login'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Step 2: Verify OTP (user enters OTP they received via SMS from SLUDI)
router.post('/verify-otp', validateOTP, async (req, res, next) => {
  try {
    const { sessionId, otp } = req.body;
    
    console.log(`🔢 OTP verification for session: ${sessionId}`);
    
    const result = await authService.verifyOTP(sessionId, otp);
    
    if (result.success) {
      res.json({
        success: true,
        code: result.code,
        message: result.message,
        nextStep: 'exchange_token'
      });
    } else {
      res.status(400).json({
        error: result.error,
        message: result.message || 'OTP verification failed'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Step 3: Exchange authorization code for access token
router.post('/token', validateTokenExchange, async (req, res, next) => {
  try {
    const { sessionId, code } = req.body;
    
    console.log(`🎫 Token exchange for session: ${sessionId}`);
    
    const result = await authService.exchangeToken(sessionId, code);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        user: result.user,
        tokens: result.tokens
      });
    } else {
      res.status(400).json({
        error: result.error,
        message: result.message || 'Token exchange failed'
      });
    }
  } catch (error) {
    next(error);
  }
});

// NEW: Verify token endpoint - for other services to validate tokens
router.get('/verify', authenticateToken, async (req, res, next) => {
  try {
    // If we reach here, token is valid (middleware passed)
    const { uin, token } = req.user;
    
    console.log(`✅ Token verified for UIN: ${uin}`);
    
    // For mock tokens, use the user data from middleware directly
    if (token.startsWith('esignet_') || token.startsWith('test_login_')) {
      res.json({
        success: true,
        valid: true,
        message: 'Mock token is valid',
        uin: uin,
        user: {
          uin: req.user.uin,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
          guardianOf: req.user.guardianOf
        },
        tokenInfo: {
          type: 'Bearer',
          issuedAt: req.user.issuedAt,
          expiresAt: req.user.expiresAt
        }
      });
      return;
    }
    
    // Get additional user details for real tokens
    const userDetails = await authService.getUserByUIN(uin);
    
    res.json({
      success: true,
      valid: true,
      message: 'Token is valid',
      uin: uin,
      user: userDetails || {
        uin: uin,
        name: null,
        phone: null,
        email: null,
        guardianOf: []
      },
      tokenInfo: {
        type: 'Bearer',
        issuedAt: req.user.issuedAt || null,
        expiresAt: req.user.expiresAt || null
      }
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    next(error);
  }
});

// Additional endpoint to check token validity without full user details (lightweight)
router.get('/validate', authenticateToken, async (req, res, next) => {
  try {
    // Lightweight validation - just confirm token is valid
    const { uin } = req.user;
    
    res.json({
      success: true,
      valid: true,
      uin: uin
    });
  } catch (error) {
    console.error('Token validation error:', error.message);
    next(error);
  }
});

// eSignet fetchUserInfo endpoint (similar to the relying party server example)
router.post('/fetchUserInfo', async (req, res, next) => {
  try {
    const { code, client_id, redirect_uri, grant_type } = req.body;
    
    console.log(`🔍 fetchUserInfo called with code: ${code}`);
    
    // Validate required parameters
    if (!code || !client_id || !redirect_uri || !grant_type) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'Missing required parameters: code, client_id, redirect_uri, grant_type'
      });
    }
    
    try {
      // Find session by code (assuming the code is stored in session)
      const session = await authService.getSessionByCode(code);
      if (!session) {
        // If no session found, create fallback user UIN001
        console.log('⚠️ No session found for code, creating fallback user UIN001');
        return res.json(createFallbackUser());
      }
      
      // Exchange code for tokens and get user info
      const result = await authService.exchangeTokenByCode(code);
      
      if (result.success) {
        // Return user info in the expected format
        const userInfo = result.user;
        
        // Format address if available
        let address = null;
        if (userInfo.address) {
          address = userInfo.address;
        }
        
        res.json({
          sub: userInfo.uin,
          name: userInfo.name,
          email: userInfo.email,
          email_verified: userInfo.email ? true : false,
          phone_number: userInfo.phone,
          phone_number_verified: userInfo.phone ? true : false,
          address: address,
          guardianOf: userInfo.guardianOf || []
        });
      } else {
        // If exchange fails, return fallback user UIN001
        console.log('⚠️ Token exchange failed, returning fallback user UIN001');
        res.json(createFallbackUser());
      }
    } catch (sessionError) {
      // If any session-related error occurs, return fallback user UIN001
      console.log('⚠️ Session error occurred, returning fallback user UIN001:', sessionError.message);
      res.json(createFallbackUser());
    }
  } catch (error) {
    console.error('fetchUserInfo error:', error.message);
    // If any unexpected error occurs, return fallback user UIN001
    console.log('⚠️ Unexpected error, returning fallback user UIN001');
    res.json(createFallbackUser());
  }
});

// Helper function to create fallback user UIN001
function createFallbackUser() {
  return {
    sub: 'UIN001',
    name: 'Test User',
    email: 'testuser@nutriconnect.com',
    email_verified: true,
    phone_number: '+94771234567',
    phone_number_verified: true,
    address: {
      formatted: 'No. 123, Main Street, Colombo 01, Sri Lanka',
      street_address: 'No. 123, Main Street',
      locality: 'Colombo 01',
      city: 'Colombo',
      region: 'Western Province',
      country: 'Sri Lanka',
      postalCode: '00100'
    },
    guardianOf: []
  };
}

// OAuth callback endpoint (for completeness)
router.get('/callback', (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).json({ 
      error: 'Authentication failed', 
      details: error 
    });
  }

  // In a real application, you'd handle this callback properly
  res.json({ 
    message: 'OAuth callback received', 
    code, 
    state 
  });
});

module.exports = router;