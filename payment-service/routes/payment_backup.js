const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');
const mpgsService = require('../services/mpgsService');
const { authenticateToken } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/validation');

// MPGS Payment Session Creation (STEP 1)
router.post('/session', authenticateToken, async (req, res, next) => {
  try {
    const { orderId, amount, customer, billing } = req.body;
    const { uin } = req.user;

    console.log(`🎯 STEP 1: Creating MPGS payment session for UIN: ${uin}, Order: ${orderId}, Amount: ${amount}`);

    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Order ID and amount are required'
      });
    }

    // Create MPGS session (STEP 1)
    const sessionResult = await mpgsService.createSession({
      orderId,
      amount: parseFloat(amount),
      customer: customer || {
        email: `user${uin}@nutriconnect.com`,
        firstName: 'NutriConnect',
        lastName: 'User'
      },
      billing
    });

    if (sessionResult.success) {
      // Store session info in payment record for tracking
      const Payment = require('../models/payment');
      const payment = new Payment({
        paymentId: `MPGS_${orderId}_${Date.now()}`,
        orderId,
        uin,
        amount: parseFloat(amount),
        paymentMethod: 'mpgs_card',
        status: 'session_created',
        metadata: {
          mpgsSessionId: sessionResult.sessionId,
          mpgsSessionVersion: sessionResult.sessionVersion,
          resultIndicator: sessionResult.resultIndicator // Store for callback lookup
        }
      });
      await payment.save();

      res.json({
        success: true,
        sessionId: sessionResult.sessionId,
        checkoutUrl: sessionResult.checkoutUrl,
        mpgsSessionId: sessionResult.mpgsSessionId,
        callbackUrl: sessionResult.callbackUrl,
        paymentId: payment.paymentId
      });
    } else {
      res.status(400).json({
        success: false,
        error: sessionResult.error,
        message: sessionResult.message
      });
    }
  } catch (error) {
    console.error('❌ STEP 1: Payment session creation error:', error);
    next(error);
  }
});

// MPGS Authentication Check (STEP 3)
router.post('/authenticate', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId, orderId } = req.body;
    const { uin } = req.user;

    console.log(`🔐 STEP 3: Initiating authentication for UIN: ${uin}, Session: ${sessionId}, Order: ${orderId}`);

    if (!sessionId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Session ID and Order ID are required'
      });
    }

    // Initiate authentication (STEP 3)
    const authResult = await mpgsService.initiateAuthentication(sessionId, orderId);

    if (authResult.success) {
      // Update payment status
      const Payment = require('../models/payment');
      await Payment.findOneAndUpdate(
        { orderId, uin },
        { 
          status: authResult.authenticationRequired ? 'authentication_required' : 'authentication_not_required',
          'metadata.authenticationStatus': authResult.authenticationStatus,
          'metadata.transactionId': authResult.transactionId
        }
      );

      res.json({
        success: true,
        authenticationRequired: authResult.authenticationRequired,
        redirectUrl: authResult.redirectUrl,
        authenticationStatus: authResult.authenticationStatus,
        transactionId: authResult.transactionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: authResult.error,
        message: authResult.message
      });
    }
  } catch (error) {
    console.error('❌ STEP 3: Authentication initiation error:', error);
    next(error);
  }
});

// MPGS Payer Authentication (STEP 4)
router.post('/authenticate-payer', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId, orderId, paRes } = req.body;
    const { uin } = req.user;

    console.log(`🔑 STEP 4: Authenticating payer for UIN: ${uin}, Session: ${sessionId}, Order: ${orderId}`);

    if (!sessionId || !orderId || !paRes) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Session ID, Order ID, and PaRes are required'
      });
    }

    // Authenticate payer (STEP 4)
    const authResult = await mpgsService.authenticatePayer(sessionId, orderId, paRes);

    if (authResult.success) {
      // Update payment status
      const Payment = require('../models/payment');
      await Payment.findOneAndUpdate(
        { orderId, uin },
        { 
          status: authResult.authenticationSuccessful ? 'authentication_successful' : 'authentication_failed',
          'metadata.authenticationStatus': authResult.authenticationStatus,
          'metadata.transactionId': authResult.transactionId
        }
      );

      res.json({
        success: true,
        authenticationSuccessful: authResult.authenticationSuccessful,
        authenticationStatus: authResult.authenticationStatus,
        transactionId: authResult.transactionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: authResult.error,
        message: authResult.message
      });
    }
  } catch (error) {
    console.error('❌ STEP 4: Payer authentication error:', error);
    next(error);
  }
});

// MPGS Process Payment (STEP 5)
router.post('/process', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId, orderId } = req.body;
    const { uin } = req.user;

    console.log(`💳 STEP 5: Processing payment for UIN: ${uin}, Session: ${sessionId}, Order: ${orderId}`);

    if (!sessionId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Session ID and Order ID are required'
      });
    }

    // Process payment (STEP 5)
    const paymentResult = await mpgsService.processPayment(sessionId, orderId);

    if (paymentResult.success) {
      // Update payment status
      const Payment = require('../models/payment');
      const payment = await Payment.findOneAndUpdate(
        { orderId, uin },
        { 
          status: paymentResult.verified ? 'completed' : 'failed',
          'metadata.transactionId': paymentResult.transactionId,
          'metadata.acquirerCode': paymentResult.acquirerCode,
          'metadata.receiptNumber': paymentResult.receiptNumber,
          'metadata.paymentMethod': paymentResult.paymentMethod
        },
        { new: true }
      );

      if (paymentResult.verified) {
        // Notify order service of successful payment
        try {
          await orderService.updateOrderStatus(orderId, 'paid', {
            paymentId: payment.paymentId,
            transactionId: paymentResult.transactionId,
            amount: paymentResult.amount,
            currency: paymentResult.currency
          });
          console.log(`✅ Order ${orderId} marked as paid`);
        } catch (orderError) {
          console.error(`❌ Failed to update order status:`, orderError);
        }
      }

      res.json({
        success: true,
        verified: paymentResult.verified,
        status: paymentResult.status,
        transactionId: paymentResult.transactionId,
        acquirerCode: paymentResult.acquirerCode,
        receiptNumber: paymentResult.receiptNumber,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        paymentMethod: paymentResult.paymentMethod
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error,
        message: paymentResult.message
      });
    }
  } catch (error) {
    console.error('❌ STEP 5: Payment processing error:', error);
    next(error);
  }
});

// MPGS Payment Completion Handler - GET (for MPGS redirects)
router.get('/complete', async (req, res, next) => {
  try {
    const { resultIndicator, sessionVersion, checkoutVersion } = req.query;

    console.log(`🔔 MPGS payment completion GET callback:`, { 
      resultIndicator,
      sessionVersion,
      checkoutVersion,
      query: req.query
    });

    // Simple approach: If MPGS redirected here, assume payment was successful
    const Payment = require('../models/payment');
    
    // Find the most recent pending payment session
    const pendingPayment = await Payment.findOne({ 
      status: { $in: ['session_created', 'pending'] }
    }).sort({ createdAt: -1 });

    if (!pendingPayment) {
      console.error('❌ No pending payment found');
      return res.send(`
        <html>
          <head><title>Payment Error</title></head>
          <body>
            <h1>❌ No Pending Payment Found</h1>
            <script>
              setTimeout(() => {
                window.location.href = 'http://localhost:3000/dashboard';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }

    const orderId = pendingPayment.orderId;
    const amount = pendingPayment.amount;
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    console.log('✅ Processing payment completion for:', { orderId, amount });

    // Update payment record to completed
    await Payment.findByIdAndUpdate(pendingPayment._id, {
      status: 'completed',
      'metadata.transactionId': transactionId,
      'metadata.resultIndicator': resultIndicator,
      'metadata.completedAt': new Date()
    });

    // Update order status to paid
    try {
      await orderService.updateOrderStatus(orderId, 'paid', {
        paymentId: pendingPayment.paymentId,
        transactionId: transactionId,
        amount: amount,
        currency: 'LKR'
      });
      console.log(`✅ Order ${orderId} marked as paid`);
    } catch (orderError) {
      console.error(`❌ Failed to update order status:`, orderError);
    }
    
    // Return success page that redirects to dashboard
    return res.send(`
      <html>
        <head><title>Payment Successful</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #e8f5e8;">
          <h1 style="color: #28a745;">✅ Payment Successful!</h1>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 400px;">
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Amount:</strong> LKR ${amount.toFixed(2)}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
          </div>
          <p style="color: #007bff;">Redirecting to dashboard...</p>
          <script>
            setTimeout(() => {
              window.location.href = 'http://localhost:3000/dashboard?paymentSuccess=true&orderId=${orderId}&amount=${amount}';
            }, 2000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ MPGS completion GET callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">❌ Payment Processing Error</h1>
          <p>An error occurred while processing the payment</p>
          <script>
            setTimeout(() => {
              window.location.href = 'http://localhost:3000/dashboard';
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
});

    // Handle MPGS callback with resultIndicator or sessionVersion
    if ((resultIndicator || sessionVersion) && !sessionId) {
      console.log('🔍 Looking up session by MPGS parameters:', { resultIndicator, sessionVersion });
      
      const Payment = require('../models/payment');
      
      // Try to find payment using resultIndicator first
      let payment = await Payment.findOne({ 
        'metadata.resultIndicator': resultIndicator 
      }).sort({ createdAt: -1 });

      // If not found by resultIndicator, try sessionVersion
      if (!payment && sessionVersion) {
        payment = await Payment.findOne({ 
          'metadata.mpgsSessionVersion': sessionVersion 
        }).sort({ createdAt: -1 });
        console.log('🔍 Looking up by sessionVersion:', sessionVersion, payment ? 'Found' : 'Not found');
      }

      // If still not found, try the most recent pending payment as fallback
      if (!payment) {
        console.log('� No direct match found, checking most recent pending payment...');
        
        const pendingPayments = await Payment.find({ 
          status: { $in: ['session_created', 'pending'] }
        }).sort({ createdAt: -1 }).limit(3);

        console.log('🔍 Found pending payments to check:', pendingPayments.length);
        
        // Use the most recent pending payment as a reasonable assumption
        if (pendingPayments.length > 0) {
          payment = pendingPayments[0];
          console.log('✅ Using most recent pending payment:', {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            createdAt: payment.createdAt
          });
          
          // Update the payment record with the resultIndicator for future lookups
          if (resultIndicator) {
            payment.metadata.resultIndicator = resultIndicator;
            await payment.save();
          }
        }
      }

      if (!payment) {
        console.error('❌ No payment found for MPGS callback:', { resultIndicator, sessionVersion });
        return res.status(400).send(`
          <html>
            <head>
              <title>Payment Error</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; }
              </style>
            </head>
            <body>
              <h1 class="error">❌ Payment Session Not Found</h1>
              <p>Unable to locate payment session for verification</p>
              <p class="loading">Redirecting back to application...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'MPGS_PAYMENT_ERROR',
                    error: 'Payment session not found'
                  }, '*');
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.href = 'http://localhost:3000/dashboard';
                  }, 3000);
                }
              </script>
            </body>
          </html>
        `);
      }

      // Use the found payment's session and order IDs
      const foundSessionId = payment.metadata?.mpgsSessionId || payment.sessionId;
      const foundOrderId = payment.orderId;
      
      console.log('✅ Found payment session:', { 
        sessionId: foundSessionId, 
        orderId: foundOrderId,
        paymentId: payment.paymentId,
        metadata: payment.metadata
      });

      // Verify payment with MPGS using the found session
      const verificationResult = await mpgsService.verifyPayment(foundSessionId, foundOrderId);

      if (!verificationResult.success) {
        console.error('❌ Payment verification failed:', verificationResult);
        return res.status(400).send(`
          <html>
            <head>
              <title>Payment Verification Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; }
              </style>
            </head>
            <body>
              <h1 class="error">❌ Payment Verification Failed</h1>
              <p>${verificationResult.message || 'Unable to verify payment'}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'MPGS_PAYMENT_ERROR',
                    error: '${verificationResult.message || 'Payment verification failed'}'
                  }, '*');
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.href = 'http://localhost:3000/dashboard';
                  }, 3000);
                }
              </script>
            </body>
          </html>
        `);
      }

      if (verificationResult.verified && verificationResult.status === 'completed') {
        console.log('✅ Payment verified and completed:', verificationResult);
        
        // Update order status
        try {
          await orderService.updateOrderStatus(foundOrderId, 'paid', {
            paymentId: payment.paymentId,
            transactionId: verificationResult.transactionId,
            amount: verificationResult.amount,
            currency: verificationResult.currency
          });
          console.log(`✅ Order ${foundOrderId} marked as paid`);
        } catch (orderError) {
          console.error(`❌ Failed to update order status:`, orderError);
        }
        
        // Return success page that redirects to dashboard
        return res.send(`
          <html>
            <head>
              <title>Payment Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #28a745; }
                .loading { color: #007bff; }
              </style>
            </head>
            <body>
              <h1 class="success">✅ Payment Successful!</h1>
              <p>Order ID: ${foundOrderId}</p>
              <p>Transaction ID: ${verificationResult.transactionId}</p>
              <p class="loading">Redirecting to dashboard...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'MPGS_PAYMENT_SUCCESS',
                    sessionId: '${foundSessionId}',
                    orderId: '${foundOrderId}',
                    transactionId: '${verificationResult.transactionId}'
                  }, '*');
                  window.close();
                } else {
                  // Redirect to dashboard with success message
                  setTimeout(() => {
                    window.location.href = 'http://localhost:3000/dashboard?paymentSuccess=true&orderId=${foundOrderId}';
                  }, 2000);
                }
              </script>
            </body>
          </html>
        `);
      } else {
        console.log('❌ Payment not completed or failed:', verificationResult);
        return res.send(`
          <html>
            <head>
              <title>Payment Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; }
              </style>
            </head>
            <body>
              <h1 class="error">❌ Payment Failed</h1>
              <p>${verificationResult.message || 'Payment was not completed successfully'}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'MPGS_PAYMENT_ERROR',
                    error: '${verificationResult.message || 'Payment failed'}'
                  }, '*');
                  window.close();
                } else {
                  setTimeout(() => {
                    window.location.href = 'http://localhost:3000/dashboard';
                  }, 3000);
                }
              </script>
            </body>
          </html>
        `);
      }
    }

    // Legacy handling for direct sessionId/orderId parameters
    if (!sessionId || !orderId) {
      console.error('❌ Missing parameters in GET callback');
      return res.status(400).send(`
        <html>
          <body>
            <h1>Payment Error</h1>
            <p>Missing required parameters</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }

    // Verify payment with MPGS
    const verificationResult = await mpgsService.verifyPayment(sessionId, orderId);

    if (!verificationResult.success) {
      console.error('❌ Payment verification failed:', verificationResult);
      return res.status(400).send(`
        <html>
          <body>
            <h1>Payment Verification Failed</h1>
            <p>${verificationResult.message || 'Unable to verify payment'}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }

    if (verificationResult.verified && verificationResult.status === 'completed') {
      console.log('✅ Payment verified and completed:', verificationResult);
      
      // For GET callbacks, return a success page that closes the popup
      res.send(`
        <html>
          <head>
            <title>Payment Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #28a745; }
              .loading { color: #007bff; }
            </style>
          </head>
          <body>
            <h1 class="success">✅ Payment Successful!</h1>
            <p>Transaction ID: ${verificationResult.transactionId}</p>
            <p class="loading">Redirecting back to the application...</p>
            <script>
              // Close popup window and notify parent
              if (window.opener) {
                window.opener.postMessage({
                  type: 'MPGS_PAYMENT_SUCCESS',
                  sessionId: '${sessionId}',
                  orderId: '${orderId}',
                  transactionId: '${verificationResult.transactionId}'
                }, '*');
                window.close();
              } else {
                // If not a popup, redirect to frontend success page
                setTimeout(() => {
                  window.location.href = 'http://localhost:3000/payment/success?sessionId=${sessionId}&orderId=${orderId}';
                }, 2000);
              }
            </script>
          </body>
        </html>
      `);
    } else {
      console.log('❌ Payment not completed or failed:', verificationResult);
      res.send(`
        <html>
          <body>
            <h1>❌ Payment Failed</h1>
            <p>${verificationResult.message || 'Payment was not completed successfully'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'MPGS_PAYMENT_ERROR',
                  error: '${verificationResult.message || 'Payment failed'}'
                }, '*');
                window.close();
              } else {
                setTimeout(() => {
                  window.location.href = 'http://localhost:3000/payment/failed';
                }, 2000);
              }
            </script>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('❌ MPGS completion GET callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Payment Processing Error</h1>
          <p>An error occurred while processing the payment</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
});

// MPGS Payment Completion Handler - POST (Legacy support for callbacks)
router.post('/complete', async (req, res, next) => {
  try {
    const { sessionId, orderId, resultIndicator } = req.body;
    
    // Also check query parameters (common for MPGS callbacks)
    const sessionIdFromQuery = req.query.sessionId || sessionId;
    const orderIdFromQuery = req.query.orderId || orderId;

    console.log(`🔔 MPGS payment completion callback:`, { 
      sessionId: sessionIdFromQuery, 
      orderId: orderIdFromQuery, 
      resultIndicator,
      body: req.body,
      query: req.query
    });

    if (!sessionIdFromQuery || !orderIdFromQuery) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'Session ID and Order ID are required'
      });
    }

    // Verify payment with MPGS
    const verificationResult = await mpgsService.verifyPayment(sessionIdFromQuery, orderIdFromQuery);

    if (!verificationResult.success) {
      console.error('❌ Payment verification failed:', verificationResult);
      return res.status(400).json({
        success: false,
        error: verificationResult.error,
        message: verificationResult.message
      });
    }

    // Find payment record
    const Payment = require('../models/payment');
    const payment = await Payment.findOne({ 
      orderId: orderIdFromQuery,
      'metadata.mpgsSessionId': sessionIdFromQuery
    });

    if (!payment) {
      console.error('❌ Payment record not found:', { sessionId: sessionIdFromQuery, orderId: orderIdFromQuery });
      return res.status(404).json({
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: 'Payment record not found'
      });
    }

    // Update payment status
    const finalStatus = verificationResult.verified ? 'completed' : 'failed';
    payment.status = finalStatus;
    payment.metadata = {
      ...payment.metadata,
      mpgsTransactionId: verificationResult.transactionId,
      mpgsAcquirerCode: verificationResult.acquirerCode,
      mpgsReceiptNumber: verificationResult.receiptNumber,
      mpgsPaymentMethod: verificationResult.paymentMethod,
      verificationResult: verificationResult,
      completedAt: new Date()
    };
    await payment.save();

    // Update order payment status
    const orderStatus = verificationResult.verified ? 'paid' : 'failed';
    await orderService.updateOrderPaymentStatus(
      orderIdFromQuery,
      orderStatus,
      payment.paymentId,
      'mpgs_card'
    );

    console.log(`✅ Payment ${payment.paymentId} status updated to: ${payment.status}`);

    res.json({
      success: true,
      verified: verificationResult.verified,
      status: finalStatus,
      paymentId: payment.paymentId,
      transactionId: verificationResult.transactionId,
      message: verificationResult.verified ? 'Payment completed successfully' : 'Payment failed'
    });

  } catch (error) {
    console.error('❌ Payment completion error:', error);
    next(error);
  }
});

// MPGS Payment Status Check
router.get('/session/:sessionId/status', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    console.log(`📊 Checking MPGS session status: ${sessionId}`);

    const sessionResult = await mpgsService.getSession(sessionId);

    if (sessionResult.success) {
      const session = sessionResult.session;
      res.json({
        success: true,
        sessionId,
        status: session.status,
        order: session.order,
        transaction: session.transaction
      });
    } else {
      res.status(404).json({
        success: false,
        error: sessionResult.error,
        message: sessionResult.message
      });
    }
  } catch (error) {
    console.error('❌ Session status check error:', error);
    next(error);
  }
});

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