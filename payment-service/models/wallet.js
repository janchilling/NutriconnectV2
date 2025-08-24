const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  relatedPaymentId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const WalletSchema = new mongoose.Schema({
  uin: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [WalletTransactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

WalletSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add transaction
WalletSchema.methods.addTransaction = function(type, amount, description, relatedPaymentId = null) {
  this.transactions.push({
    type,
    amount,
    description,
    relatedPaymentId,
    timestamp: new Date()
  });
  
  if (type === 'credit') {
    this.balance += amount;
  } else {
    this.balance -= amount;
  }
  
  return this.save();
};

// Method to check sufficient balance
WalletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

module.exports = mongoose.model('Wallet', WalletSchema);