const crypto = require('crypto');
const UserSession = require('../models/UserSession');
const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Generate secure session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create a new user session after successful authentication
const createUserSession = async (userData, req) => {
  try {
    const sessionId = generateSessionId();
    
    const session = new UserSession({
      sessionId,
      uin: userData.uin,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      userProfile: {
        uin: userData.uin,
        name: userData.name,
        phone: userData.phone,
        email: userData.email,
        guardianOf: userData.guardianOf || []
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      isActive: true
    });

    await session.save();

    // Cleanup old sessions for the user (keep only 3 most recent)
    await cleanupOldUserSessions(userData.uin, 3);

    return {
      success: true,
      sessionId: session.sessionId,
      session: {
        sessionId: session.sessionId,
        uin: session.uin,
        userProfile: session.userProfile,
        loginTimestamp: session.loginTimestamp,
        expiresAt: session.expiresAt
      }
    };
  } catch (error) {
    console.error('Session creation error:', error);
    return {
      success: false,
      error: 'Failed to create user session',
      details: error.message
    };
  }
};

// Get session by session ID
const getSession = async (sessionId) => {
  try {
    const session = await UserSession.findActiveSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found or expired' };
    }

    // Update last activity
    await session.updateActivity();

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        uin: session.uin,
        userProfile: session.userProfile,
        loginTimestamp: session.loginTimestamp,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }
    };
  } catch (error) {
    console.error('Session retrieval error:', error);
    return { success: false, error: 'Failed to retrieve session' };
  }
};

// Get session by access token
const getSessionByToken = async (accessToken) => {
  try {
    const session = await UserSession.findByToken(accessToken);
    if (!session) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Update last activity
    await session.updateActivity();

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        uin: session.uin,
        userProfile: session.userProfile,
        loginTimestamp: session.loginTimestamp,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }
    };
  } catch (error) {
    console.error('Session by token retrieval error:', error);
    return { success: false, error: 'Failed to retrieve session' };
  }
};

// Validate token with authentication service
const validateTokenWithAuthService = async (token) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.data && response.data.success && response.data.valid) {
      return {
        success: true,
        uin: response.data.uin,
        user: response.data.user,
        tokenInfo: response.data.tokenInfo
      };
    } else {
      return { success: false, error: 'Token validation failed' };
    }
  } catch (error) {
    console.error('Token validation error:', error.message);
    return { 
      success: false, 
      error: 'Token validation failed',
      details: error.response?.data?.message || error.message
    };
  }
};

// Update session activity
const updateSessionActivity = async (sessionId) => {
  try {
    const session = await UserSession.findActiveSession(sessionId);
    if (session) {
      await session.updateActivity();
      return { success: true };
    }
    return { success: false, error: 'Session not found' };
  } catch (error) {
    console.error('Update session activity error:', error);
    return { success: false, error: 'Failed to update session activity' };
  }
};

// Deactivate session (logout)
const deactivateSession = async (sessionId) => {
  try {
    const session = await UserSession.findActiveSession(sessionId);
    if (session) {
      await session.deactivate();
      return { success: true, message: 'Session deactivated successfully' };
    }
    return { success: false, error: 'Session not found' };
  } catch (error) {
    console.error('Session deactivation error:', error);
    return { success: false, error: 'Failed to deactivate session' };
  }
};

// Deactivate all sessions for a user
const deactivateAllUserSessions = async (uin) => {
  try {
    await UserSession.deactivateUserSessions(uin);
    return { success: true, message: 'All user sessions deactivated' };
  } catch (error) {
    console.error('User sessions deactivation error:', error);
    return { success: false, error: 'Failed to deactivate user sessions' };
  }
};

// Get all active sessions for a user
const getUserSessions = async (uin) => {
  try {
    const sessions = await UserSession.findByUIN(uin, true);
    return {
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        loginTimestamp: session.loginTimestamp,
        lastActivity: session.lastActivity,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt: session.expiresAt
      })),
      count: sessions.length
    };
  } catch (error) {
    console.error('Get user sessions error:', error);
    return { success: false, error: 'Failed to retrieve user sessions' };
  }
};

// Extend session expiry
const extendSession = async (sessionId, hours = 24) => {
  try {
    const session = await UserSession.findActiveSession(sessionId);
    if (session) {
      await session.extendExpiry(hours);
      return { 
        success: true, 
        message: 'Session extended successfully',
        expiresAt: session.expiresAt
      };
    }
    return { success: false, error: 'Session not found' };
  } catch (error) {
    console.error('Session extension error:', error);
    return { success: false, error: 'Failed to extend session' };
  }
};

// Cleanup old sessions for a user (keep only the most recent N sessions)
const cleanupOldUserSessions = async (uin, keepCount = 3) => {
  try {
    const allSessions = await UserSession.find({ uin: uin })
      .sort({ lastActivity: -1 });

    if (allSessions.length > keepCount) {
      const sessionsToRemove = allSessions.slice(keepCount);
      const sessionIdsToRemove = sessionsToRemove.map(s => s._id);
      
      await UserSession.deleteMany({ _id: { $in: sessionIdsToRemove } });
      console.log(`Cleaned up ${sessionIdsToRemove.length} old sessions for UIN: ${uin}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Cleanup old sessions error:', error);
    return { success: false, error: 'Failed to cleanup old sessions' };
  }
};

// Cleanup all expired sessions (can be run as a cron job)
const cleanupExpiredSessions = async () => {
  try {
    const result = await UserSession.cleanupExpiredSessions();
    console.log(`Cleaned up ${result.deletedCount} expired sessions`);
    return { 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Cleaned up ${result.deletedCount} expired sessions`
    };
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    return { success: false, error: 'Failed to cleanup expired sessions' };
  }
};

module.exports = {
  generateSessionId,
  createUserSession,
  getSession,
  getSessionByToken,
  validateTokenWithAuthService,
  updateSessionActivity,
  deactivateSession,
  deactivateAllUserSessions,
  getUserSessions,
  extendSession,
  cleanupOldUserSessions,
  cleanupExpiredSessions
};