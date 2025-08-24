const Payment = require('../models/payment');
const Wallet = require('../models/wallet');
const paydpiService = require('./paydpiService');
const orderService = require('./orderService');
const crypto = require('crypto');

// Generate unique payment ID
const generatePaymentId = () => {
  return 'PAY_' + crypto.randomBytes(16).toString('hex').toUpperCase();
};

// Get or create wallet
const getOrCreateWallet = async (uin) => {
  let wallet = await Wallet.findOne({ uin });
  if (!wallet) {
    wallet = new Wallet({ uin, balance: 0 });
    await wallet.save();
  }
  return wallet;
};

// Process payment
const processPayment = async (paymentData) => {
  try {
    const { uin, amount, orderId, paymentMethod, metadata = {} } = paymentData;
    const paymentId = generatePaymentId();

    // Create payment record
    const payment = new Payment({
      paymentId,
      orderId,
      uin,
      amount,
      paymentMethod,
      status: 'pending',
      metadata
    });

    await payment.save();

    // Process based on payment method
    let result;
    switch (paymentMethod) {
      case 'wallet':
        result = await processWalletPayment(payment);
        break;
      case 'card':
      case 'subsidy':
        result = await processExternalPayment(payment);
        break;
      case 'cash':
        result = await processCashPayment(payment);
        break;
      default:
        throw new Error('Unsupported payment method');
    }

    return result;
  } catch (error) {
    console.error('Payment processing error:', error.message);
    throw error;
  }
};

// Process wallet payment
const processWalletPayment = async (payment) => {
  try {
    const wallet = await getOrCreateWallet(payment.uin);
    
    if (!wallet.hasSufficientBalance(payment.amount)) {
      payment.status = 'failed';
      payment.metadata.failureReason = 'Insufficient wallet balance';
      await payment.save();
      
      // Update order status
      await orderService.updateOrderPaymentStatus(
        payment.orderId,
        'failed',
        payment.paymentId,
        payment.paymentMethod
      );
      
      return {
        success: false,
        paymentId: payment.paymentId,
        error: 'Insufficient balance',
        message: `Wallet balance (${wallet.balance}) insufficient for payment (${payment.amount})`
      };
    }

    payment.metadata.walletBalanceBefore = wallet.balance;
    
    await wallet.addTransaction(
      'debit',
      payment.amount,
      `Payment for order ${payment.orderId}`,
      payment.paymentId
    );

    payment.metadata.walletBalanceAfter = wallet.balance;
    payment.status = 'completed';
    await payment.save();

    // ADD THIS: Update order payment status
    await orderService.updateOrderPaymentStatus(
      payment.orderId,
      'paid',
      payment.paymentId,
      payment.paymentMethod
    );

    return {
      success: true,
      paymentId: payment.paymentId,
      status: 'completed',
      message: 'Payment successful',
      walletBalance: wallet.balance
    };
  } catch (error) {
    payment.status = 'failed';
    payment.metadata.failureReason = error.message;
    await payment.save();
    
    // ADD THIS: Update order status on error
    await orderService.updateOrderPaymentStatus(
      payment.orderId,
      'failed',
      payment.paymentId,
      payment.paymentMethod
    );
    
    throw error;
  }
};

// Process external payment (card/subsidy)
const processExternalPayment = async (payment) => {
  try {
    payment.status = 'processing';
    await payment.save();

    const paydpiResult = await paydpiService.initiatePayment({
      paymentId: payment.paymentId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      uin: payment.uin,
      orderId: payment.orderId
    });

    if (!paydpiResult.success) {
      payment.status = 'failed';
      payment.metadata.failureReason = paydpiResult.error;
      await payment.save();
      
      return {
        success: false,
        paymentId: payment.paymentId,
        error: paydpiResult.error,
        message: paydpiResult.message
      };
    }

    payment.paydpiTransactionId = paydpiResult.transactionId;
    await payment.save();

    return {
      success: true,
      paymentId: payment.paymentId,
      transactionId: paydpiResult.transactionId,
      paymentUrl: paydpiResult.paymentUrl,
      status: 'processing',
      message: 'Payment initiated successfully'
    };
  } catch (error) {
    payment.status = 'failed';
    payment.metadata.failureReason = error.message;
    await payment.save();
    throw error;
  }
};

// Process cash payment
const processCashPayment = async (payment) => {
  try {
    payment.status = 'pending';
    payment.metadata.requiresConfirmation = true;
    await payment.save();

    // ADD THIS: Update order to pending payment confirmation
    await orderService.updateOrderPaymentStatus(
      payment.orderId,
      'pending',
      payment.paymentId,
      payment.paymentMethod
    );

    return {
      success: true,
      paymentId: payment.paymentId,
      status: 'pending',
      message: 'Cash payment recorded, awaiting confirmation'
    };
  } catch (error) {
    payment.status = 'failed';
    payment.metadata.failureReason = error.message;
    await payment.save();
    
    // ADD THIS: Update order status on error
    await orderService.updateOrderPaymentStatus(
      payment.orderId,
      'failed',
      payment.paymentId,
      payment.paymentMethod
    );
    
    throw error;
  }
};

// Top up wallet
const topUpWallet = async (uin, amount, method) => {
  try {
    const wallet = await getOrCreateWallet(uin);
    const topupId = 'TOPUP_' + crypto.randomBytes(8).toString('hex').toUpperCase();

    if (method === 'subsidy') {
      // Direct subsidy credit
      await wallet.addTransaction(
        'credit',
        amount,
        `Subsidy top-up: ${topupId}`,
        topupId
      );

      return {
        success: true,
        topupId,
        message: 'Subsidy credited successfully',
        newBalance: wallet.balance
      };
    } else {
      // External payment for top-up
      const paydpiResult = await paydpiService.initiatePayment({
        paymentId: topupId,
        amount,
        paymentMethod: method,
        uin,
        orderId: `WALLET_TOPUP_${topupId}`
      });

      if (!paydpiResult.success) {
        return {
          success: false,
          error: paydpiResult.error,
          message: paydpiResult.message
        };
      }

      return {
        success: true,
        topupId,
        transactionId: paydpiResult.transactionId,
        paymentUrl: paydpiResult.paymentUrl,
        message: 'Wallet top-up initiated'
      };
    }
  } catch (error) {
    console.error('Wallet top-up error:', error.message);
    throw error;
  }
};

// Get payment status
const getPaymentStatus = async (paymentId) => {
  try {
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    return {
      success: true,
      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    };
  } catch (error) {
    console.error('Get payment status error:', error.message);
    throw error;
  }
};

module.exports = {
  processPayment,
  topUpWallet,
  getPaymentStatus,
  getOrCreateWallet
};