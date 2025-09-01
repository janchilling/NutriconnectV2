const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const mpgsService = require('../services/mpgsService');
const { authenticateToken } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/validation');
const sessionService = require('../services/sessionService');

// Create MPGS payment session
router.post('/session', authenticateToken, async (req, res, next) => {
  try {
    const { orderId, amount, customer, billing } = req.body;
    const { uin } = req.user;

    console.log(`Creating MPGS payment session for UIN: ${uin}, Order: ${orderId}, Amount: ${amount}`);

    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Order ID and amount are required'
      });
    }

    // Create payment record first
    const Payment = require('../models/payment');
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const payment = new Payment({
      paymentId,
      orderId,
      userId: uin,
      amount: parseFloat(amount),
      currency: 'LKR',
      paymentMethod: 'mpgs_card',
      status: 'pending',
      metadata: {
        createdAt: new Date()
      }
    });
    await payment.save();

    // Create MPGS session
    const sessionResult = await mpgsService.createSession({
      orderId: paymentId, // Use our paymentId as MPGS orderId
      amount: parseFloat(amount),
      customer: customer || {
        email: `user${uin}@nutriconnect.com`,
        firstName: 'NutriConnect',
        lastName: 'User'
      },
      billing
    });

    if (!sessionResult.success) {
      return res.status(400).json({
        success: false,
        error: sessionResult.error,
        message: sessionResult.message
      });
    }

    // Update payment with session info
    payment.metadata = {
      ...payment.metadata,
      mpgsSessionId: sessionResult.sessionId,
      sessionVersion: sessionResult.sessionVersion,
      resultIndicator: sessionResult.resultIndicator
    };
    await payment.save();

    const sessionId = sessionResult.sessionId;
    
    res.json({
      success: true,
      sessionId,
      checkoutScriptUrl: 'https://cbcmpgs.gateway.mastercard.com/checkout/version/100/checkout.js'
    });
  } catch (error) {
    next(error);
  }
});

// MPGS Payment Completion Handler - GET (Main flow for redirect callbacks)
router.get('/complete', async (req, res, next) => {
  try {
    const { resultIndicator } = req.query;
    
    console.log('GET /complete called with resultIndicator:', resultIndicator);
    
    if (!resultIndicator) {
      console.log('Missing resultIndicator');
      return res.redirect('http://localhost:3000/dashboard?error=missing_result_indicator');
    }

    // Get the most recent pending payment for this session
    const session = await sessionService.getActiveSession(req);
    if (!session) {
      console.log('No active session found');
      return res.redirect('http://localhost:3000/dashboard?error=no_session');
    }

    const Payment = require('../models/payment');
    const pendingPayment = await Payment.findOne({
      userId: session.userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (!pendingPayment) {
      console.log('No pending payment found for user:', session.userId);
      return res.redirect('http://localhost:3000/dashboard?error=no_pending_payment');
    }

    console.log('Found pending payment:', pendingPayment.paymentId);

    // Verify payment status with MPGS
    const paymentData = await mpgsService.verifyPayment(pendingPayment.paymentId);
    
    console.log('MPGS verification result:', paymentData);

    if (paymentData && paymentData.result === 'SUCCESS') {
      // Update payment status
      pendingPayment.status = 'completed';
      pendingPayment.metadata = {
        ...pendingPayment.metadata,
        mpgsVerification: paymentData,
        completedAt: new Date()
      };
      await pendingPayment.save();
      console.log('Payment updated to completed');

      // Update order status if there's an associated order
      if (pendingPayment.orderId) {
        try {
          await orderService.updateOrderStatus(
            pendingPayment.orderId,
            'paid',
            pendingPayment.paymentId,
            pendingPayment.paymentMethod
          );
          console.log('Order updated to paid status');
        } catch (orderError) {
          console.error('Error updating order status:', orderError);
          // Don't fail the payment for order update errors
        }
      }

      console.log('Redirecting to dashboard with success');
      return res.redirect('http://localhost:3000/dashboard?payment=success');
    } else {
      // Payment failed
      pendingPayment.status = 'failed';
      pendingPayment.metadata = {
        ...pendingPayment.metadata,
        mpgsVerification: paymentData,
        failedAt: new Date()
      };
      await pendingPayment.save();
      console.log('Payment marked as failed');

      return res.redirect('http://localhost:3000/dashboard?payment=failed');
    }
  } catch (error) {
    console.error('Error in GET /complete:', error);
    return res.redirect('http://localhost:3000/dashboard?error=processing_failed');
  }
});

// MPGS Payment Completion Handler - POST (Legacy support for callbacks)
router.post('/complete', async (req, res, next) => {
  try {
    const { resultIndicator, sessionId, orderId } = req.body;
    
    console.log('POST /complete called with:', { resultIndicator, sessionId, orderId });
    
    const Payment = require('../models/payment');
    let payment;
    
    // Find payment by orderId (which is our paymentId) or sessionId
    if (orderId) {
      payment = await Payment.findOne({ paymentId: orderId });
    } else if (sessionId) {
      payment = await Payment.findOne({ 'metadata.mpgsSessionId': sessionId });
    }
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify payment status with MPGS
    const paymentData = await mpgsService.verifyPayment(payment.paymentId);
    
    if (paymentData && paymentData.result === 'SUCCESS') {
      // Update payment status
      payment.status = 'completed';
      payment.metadata = {
        ...payment.metadata,
        mpgsVerification: paymentData,
        completedAt: new Date()
      };
      await payment.save();

      // Update order status if there's an associated order
      if (payment.orderId) {
        try {
          await orderService.updateOrderStatus(
            payment.orderId,
            'paid',
            payment.paymentId,
            payment.paymentMethod
          );
        } catch (orderError) {
          console.error('Error updating order status:', orderError);
        }
      }

      res.json({ success: true, payment: { id: payment.paymentId, status: payment.status } });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.metadata = {
        ...payment.metadata,
        mpgsVerification: paymentData,
        failedAt: new Date()
      };
      await payment.save();

      res.status(400).json({ success: false, error: 'Payment verification failed' });
    }
  } catch (error) {
    next(error);
  }
});

// Create a payment record (non-MPGS payments)
router.post('/create', authenticateToken, validatePaymentRequest, async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    const { uin } = req.user;

    const result = await paymentService.createPayment({
      orderId,
      userId: uin,
      amount,
      paymentMethod
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Process a payment
router.post('/process', authenticateToken, async (req, res, next) => {
  try {
    const { paymentId, paymentDetails } = req.body;
    const { uin } = req.user;

    const result = await paymentService.processPayment(paymentId, uin, paymentDetails);

    if (result.success && result.payment.status === 'completed') {
      // Update order status
      await orderService.updateOrderStatus(
        result.payment.orderId,
        'paid',
        result.payment.paymentId,
        result.payment.paymentMethod
      );
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/status/:paymentId', authenticateToken, async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { uin } = req.user;

    const result = await paymentService.getPaymentStatus(paymentId, uin);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's payment history
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const { uin } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const result = await paymentService.getPaymentHistory(uin, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PayDPI callback handler
router.post('/callback', async (req, res, next) => {
  try {
    const { transactionId, status, paymentId } = req.body;
    
    console.log(`Payment callback: ${paymentId}, Status: ${status}`);
    
    const Payment = require('../models/payment');
    const payment = await Payment.findOne({ paymentId });
    
    if (payment) {
      const finalStatus = status === 'success' ? 'completed' : 'failed';
      payment.status = finalStatus;
      await payment.save();
      
      console.log(`Payment ${paymentId} status updated to: ${payment.status}`);
      
      // Update order payment status
      const orderStatus = status === 'success' ? 'paid' : 'failed';
      await orderService.updateOrderStatus(
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
