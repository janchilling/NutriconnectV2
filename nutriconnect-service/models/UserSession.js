const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  uin: {
    type: String,
    required: true,
    index: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  userProfile: {
    uin: String,
    name: String,
    phone: String,
    email: String,
    guardianOf: [String]
  },
  loginTimestamp: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    expires: 0 // MongoDB TTL
  }
}, {
  timestamps: true
});

// Index for automatic cleanup
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient queries
UserSessionSchema.index({ uin: 1, isActive: 1 });
UserSessionSchema.index({ accessToken: 1 });

// Instance methods
UserSessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

UserSessionSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

UserSessionSchema.methods.extendExpiry = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Static methods
UserSessionSchema.statics.findActiveSession = function(sessionId) {
  return this.findOne({ 
    sessionId: sessionId, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

UserSessionSchema.statics.findByUIN = function(uin, activeOnly = true) {
  const query = { uin: uin };
  if (activeOnly) {
    query.isActive = true;
    query.expiresAt = { $gt: new Date() };
  }
  return this.find(query).sort({ lastActivity: -1 });
};

UserSessionSchema.statics.findByToken = function(accessToken) {
  return this.findOne({ 
    accessToken: accessToken, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

UserSessionSchema.statics.deactivateUserSessions = function(uin) {
  return this.updateMany(
    { uin: uin, isActive: true },
    { isActive: false }
  );
};

UserSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

module.exports = mongoose.model('UserSession', UserSessionSchema);