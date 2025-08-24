const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const { authenticateToken } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/validation');

// Process payment
router.post('/process', authenticateToken, validatePaymentRequest, async (req, res, next) => {
  try {
    const { amount, orderId, paymentMethod, metadata } = req.body;
    const { uin } = req.user;
    
    console.log(`💳 Processing payment for UIN: ${uin}, Amount: ${amount}, Method: ${paymentMethod}`);
    
    const result = await paymentService.processPayment({
      uin,
      amount,
      orderId,
      paymentMethod,
      metadata
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        paymentId: result.paymentId,
        status: result.status,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
        walletBalance: result.walletBalance
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message,
        paymentId: result.paymentId
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/status/:paymentId', authenticateToken, async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`📊 Getting payment status for: ${paymentId}`);
    
    const result = await paymentService.getPaymentStatus(paymentId);
    
    if (result.success) {
      res.json({
        success: true,
        payment: result.payment
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// Payment callback from PayDPI
router.post('/callback', async (req, res, next) => {
  try {
    const { transactionId, status, paymentId } = req.body;
    
    console.log(`🔔 Payment callback: ${paymentId}, Status: ${status}`);
    
    const Payment = require('../models/payment');
    const payment = await Payment.findOne({ paymentId });
    
    if (payment) {
      const finalStatus = status === 'success' ? 'completed' : 'failed';
      payment.status = finalStatus;
      await payment.save();
      
      console.log(`✅ Payment ${paymentId} status updated to: ${payment.status}`);
      
      // ADD THIS: Update order payment status
      const orderStatus = status === 'success' ? 'paid' : 'failed';
      await orderService.updateOrderPaymentStatus(
        payment.orderId,
        orderStatus,
        payment.paymentId,
        payment.paymentMethod
      );
    }
    
    res.json({ success: true, message: 'Callback processed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;