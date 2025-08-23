const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
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