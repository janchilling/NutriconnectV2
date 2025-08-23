const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const sludiService = require('./sludiService');

// Generate secure random strings
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Create a new session
const createSession = async (uin) => {
  try {
    const sessionId = generateRandomString(16);
    const state = generateRandomString(32);

    const session = new Session({
      sessionId,
      uin,
      state,
      step: 'waiting_for_otp'
    });

    await session.save();

    return {
      success: true,
      sessionId,
      state
    };
  } catch (error) {
    console.error('Session creation error:', error.message);
    return {
      success: false,
      error: 'Failed to create session'
    };
  }
};

// Get session by ID
const getSession = async (sessionId) => {
  try {
    const session = await Session.findOne({ sessionId });
    return session;
  } catch (error) {
    console.error('Session retrieval error:', error.message);
    return null;
  }
};

// Update session step
const updateSession = async (sessionId, updates) => {
  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      updates,
      { new: true }
    );
    return session;
  } catch (error) {
    console.error('Session update error:', error.message);
    return null;
  }
};

// Delete session
const deleteSession = async (sessionId) => {
  try {
    await Session.deleteOne({ sessionId });
    return true;
  } catch (error) {
    console.error('Session deletion error:', error.message);
    return false;
  }
};

// Initiate login process - just create session, no OTP request
const initiateLogin = async (uin) => {
  try {
    // Create session for the user
    const sessionResult = await createSession(uin);
    if (!sessionResult.success) {
      return sessionResult;
    }

    return {
      success: true,
      sessionId: sessionResult.sessionId,
      message: 'Session created. Please enter the OTP you received from SLUDI on your registered phone number.'
    };
  } catch (error) {
    console.error('Login initiation error:', error.message);
    return {
      success: false,
      error: 'Failed to initiate login'
    };
  }
};

// Verify OTP (user enters OTP they received via SMS from SLUDI)
const verifyOTP = async (sessionId, otp) => {
  try {
    // Get session
    const session = await getSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid or expired session'
      };
    }

    // Verify OTP with SLUDI
    const verifyResult = await sludiService.verifyOTP(session.uin, otp, session.state);
    if (!verifyResult.success) {
      return verifyResult;
    }

    // Update session with authorization code
    await updateSession(sessionId, {
      step: 'code_received',
      authCode: verifyResult.code
    });

    return {
      success: true,
      code: verifyResult.code,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('OTP verification error:', error.message);
    return {
      success: false,
      error: 'OTP verification failed'
    };
  }
};

// Exchange code for token
const exchangeToken = async (sessionId, code) => {
  try {
    // Get session
    const session = await getSession(sessionId);
    if (!session || session.authCode !== code) {
      return {
        success: false,
        error: 'Invalid session or authorization code'
      };
    }

    // Exchange code for tokens with SLUDI
    const tokenResult = await sludiService.exchangeCodeForToken(code);
    if (!tokenResult.success) {
      return tokenResult;
    }

    // Get user info
    const userInfoResult = await sludiService.getUserInfo(tokenResult.tokens.access_token);
    if (!userInfoResult.success) {
      return userInfoResult;
    }

    // Create or update user
    const userResult = await createOrUpdateUser(session.uin, userInfoResult.userInfo);
    if (!userResult.success) {
      return userResult;
    }

    // Update session
    await updateSession(sessionId, {
      step: 'token_exchanged'
    });

    // Clean up session after successful authentication
    await deleteSession(sessionId);

    return {
      success: true,
      user: userResult.user,
      tokens: tokenResult.tokens,
      message: 'Authentication successful'
    };
  } catch (error) {
    console.error('Token exchange error:', error.message);
    return {
      success: false,
      error: 'Token exchange failed'
    };
  }
};

// Create or update user
const createOrUpdateUser = async (uin, userInfo) => {
  try {
    let user = await User.findByUIN(uin);

    if (!user) {
      // Create new user
      user = new User({
        uin,
        name: userInfo.name,
        phone: userInfo.phone,
        email: userInfo.email,
        guardianOf: userInfo.guardianOf || [],
        createdVia: 'sludi-auth'
      });
    } else {
      // Update existing user
      user.name = userInfo.name || user.name;
      user.phone = userInfo.phone || user.phone;
      user.email = userInfo.email || user.email;
      user.guardianOf = userInfo.guardianOf || user.guardianOf;
      user.lastLogin = new Date();
    }

    await user.save();

    return {
      success: true,
      user: {
        uin: user.uin,
        name: user.name,
        email: user.email,
        phone: user.phone,
        guardianOf: user.guardianOf,
        lastLogin: user.lastLogin
      }
    };
  } catch (error) {
    console.error('User creation/update error:', error.message);
    return {
      success: false,
      error: 'Failed to create or update user'
    };
  }
};

// Get user profile
const getUserProfile = async (uin) => {
  try {
    const user = await User.findByUIN(uin);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      user: {
        uin: user.uin,
        name: user.name,
        email: user.email,
        phone: user.phone,
        guardianOf: user.guardianOf,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    };
  } catch (error) {
    console.error('Get user profile error:', error.message);
    return {
      success: false,
      error: 'Failed to get user profile'
    };
  }
};

module.exports = {
  generateRandomString,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  initiateLogin,
  verifyOTP,
  exchangeToken,
  createOrUpdateUser,
  getUserProfile
};