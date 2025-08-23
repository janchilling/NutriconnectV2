const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const authService = require('../services/authService');

// Protected route - Get user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { uin } = req.user;
    
    console.log(`👤 Profile request for UIN: ${uin}`);
    
    const result = await authService.getUserProfile(uin);
    
    if (result.success) {
      res.json({
        success: true,
        user: result.user
      });
    } else {
      res.status(404).json({
        error: result.error,
        message: 'User profile not found'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Protected route - Update user profile
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { uin } = req.user;
    const updates = req.body;
    
    console.log(`📝 Profile update for UIN: ${uin}`);
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.uin;
    delete updates.createdAt;
    delete updates.createdVia;
    
    const User = require('../models/user');
    const user = await User.findByUIN(uin);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Unable to find user profile'
      });
    }
    
    // Update allowed fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && ['name', 'phone', 'email'].includes(key)) {
        user[key] = updates[key];
      }
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        uin: user.uin,
        name: user.name,
        email: user.email,
        phone: user.phone,
        guardianOf: user.guardianOf,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Protected route - Get guardian relationships
router.get('/guardians', authenticateToken, async (req, res, next) => {
  try {
    const { uin } = req.user;
    
    console.log(`👨‍👩‍👧‍👦 Guardian relationships for UIN: ${uin}`);
    
    const User = require('../models/user');
    const user = await User.findByUIN(uin);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      guardianOf: user.guardianOf || [],
      isGuardian: user.guardianOf && user.guardianOf.length > 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;