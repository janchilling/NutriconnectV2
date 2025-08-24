const express = require('express');
const router = express.Router();
const sessionService = require('../services/sessionService');
const { authenticate } = require('../middleware/auth');

// POST /api/session/create - Create a new user session after successful authentication
router.post('/create', async (req, res) => {
  try {
    const {
      uin,
      accessToken,
      refreshToken,
      name,
      phone,
      email,
      guardianOf
    } = req.body;

    // Validate required fields
    if (!uin || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'UIN and accessToken are required'
      });
    }

    // Validate token with auth service first
    const tokenValidation = await sessionService.validateTokenWithAuthService(accessToken);
    if (!tokenValidation.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token',
        details: tokenValidation.error
      });
    }

    const userData = {
      uin,
      accessToken,
      refreshToken,
      name: name || tokenValidation.user?.name,
      phone: phone || tokenValidation.user?.phone,
      email: email || tokenValidation.user?.email,
      guardianOf: guardianOf || tokenValidation.user?.guardianOf || []
    };

    const result = await sessionService.createUserSession(userData, req);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'User session created successfully',
        sessionId: result.sessionId,
        session: result.session
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/session/:sessionId - Get session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const result = await sessionService.getSession(sessionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Session retrieved successfully',
        session: result.session
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/session/validate - Validate session/token
router.post('/validate', async (req, res) => {
  try {
    const { sessionId, accessToken } = req.body;

    if (!sessionId && !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Either sessionId or accessToken is required'
      });
    }

    let result;
    if (sessionId) {
      result = await sessionService.getSession(sessionId);
    } else {
      result = await sessionService.getSessionByToken(accessToken);
    }

    if (result.success) {
      res.json({
        success: true,
        valid: true,
        message: 'Session is valid',
        session: result.session
      });
    } else {
      res.status(401).json({
        success: false,
        valid: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Validate session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PUT /api/session/:sessionId/activity - Update session activity
router.put('/:sessionId/activity', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await sessionService.updateSessionActivity(sessionId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Session activity updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update session activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// PUT /api/session/:sessionId/extend - Extend session expiry
router.put('/:sessionId/extend', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { hours = 24 } = req.body;

    const result = await sessionService.extendSession(sessionId, hours);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        expiresAt: result.expiresAt
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Extend session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// DELETE /api/session/:sessionId - Deactivate session (logout)
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await sessionService.deactivateSession(sessionId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Deactivate session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/session/user/:uin - Get all sessions for a user
router.get('/user/:uin', authenticate, async (req, res) => {
  try {
    const { uin } = req.params;

    // Check if the requesting user is accessing their own sessions or has admin privileges
    if (req.user.uin !== uin && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own sessions.'
      });
    }

    const result = await sessionService.getUserSessions(uin);

    if (result.success) {
      res.json({
        success: true,
        message: 'User sessions retrieved successfully',
        sessions: result.sessions,
        count: result.count
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// DELETE /api/session/user/:uin - Deactivate all sessions for a user
router.delete('/user/:uin', authenticate, async (req, res) => {
  try {
    const { uin } = req.params;

    // Check if the requesting user is deactivating their own sessions or has admin privileges
    if (req.user.uin !== uin && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only deactivate your own sessions.'
      });
    }

    const result = await sessionService.deactivateAllUserSessions(uin);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Deactivate user sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/session/cleanup - Cleanup expired sessions (admin only)
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // This endpoint should typically be restricted to admin users or system processes
    // For now, we'll allow authenticated users to run this
    
    const result = await sessionService.cleanupExpiredSessions();

    res.json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;