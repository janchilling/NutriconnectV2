const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticateToken } = require('../middleware/auth');
const { validateWalletTopup } = require('../middleware/validation');

// Get wallet balance and transactions
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { uin } = req.user;
    
    console.log(`👛 Getting wallet info for UIN: ${uin}`);
    
    const wallet = await paymentService.getOrCreateWallet(uin);
    
    res.json({
      success: true,
      wallet: {
        uin: wallet.uin,
        balance: wallet.balance,
        transactions: wallet.transactions.slice(-10), // Last 10 transactions
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Top up wallet
router.post('/topup', authenticateToken, validateWalletTopup, async (req, res, next) => {
  try {
    const { amount, method } = req.body;
    const { uin } = req.user;
    
    console.log(`💰 Wallet top-up for UIN: ${uin}, Amount: ${amount}, Method: ${method}`);
    
    const result = await paymentService.topUpWallet(uin, amount, method);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        topupId: result.topupId,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
        newBalance: result.newBalance
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;