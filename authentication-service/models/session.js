const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  uin: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  step: {
    type: String,
    enum: ['waiting_for_otp', 'otp_verified', 'code_received', 'token_exchanged'],
    default: 'waiting_for_otp'
  },
  authCode: {
    type: String
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', SessionSchema);