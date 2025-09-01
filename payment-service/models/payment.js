const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  uin: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'card', 'subsidy', 'cash', 'mpgs_card', 'paydpi'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'session_created', 'authenticated', 'cancelled'],
    default: 'pending'
  },
  paydpiTransactionId: {
    type: String
  },
  // MPGS specific fields
  mpgsSessionId: {
    type: String
  },
  mpgsTransactionId: {
    type: String
  },
  metadata: {
    cardLast4: String,
    subsidyType: String,
    walletBalanceBefore: Number,
    walletBalanceAfter: Number,
    // MPGS specific metadata
    acquirerCode: String,
    receiptNumber: String,
    authenticationStatus: String,
    paymentMethodType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

PaymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);