const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uin: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  name: { 
    type: String,
    trim: true
  },
  phone: { 
    type: String,
    trim: true
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true
  },
  guardianOf: [{ 
    type: String,
    trim: true
  }], // array of pupil UINs (if the user is a guardian)
  lastLogin: { 
    type: Date 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  // minimal audit
  createdVia: { 
    type: String, 
    default: 'signup',
    enum: ['signup', 'import', 'sludi-sync', 'sludi-auth']
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to update last login
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find by UIN
UserSchema.statics.findByUIN = function(uin) {
  return this.findOne({ uin: uin });
};

// Virtual for full name (if needed later)
UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);