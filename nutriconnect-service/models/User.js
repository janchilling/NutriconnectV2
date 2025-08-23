const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uin: { type: String, required: true, unique: true },            // SLUDI UIN
  name: { type: String },
  phone: { type: String },
  email: { type: String },
  guardianOf: [{ type: String }], // array of pupil UINs (if the user is a guardian)
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // minimal audit
  createdVia: { type: String, default: 'signup' } // 'signup' | 'import' | 'sludi-sync'
});

UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', UserSchema);