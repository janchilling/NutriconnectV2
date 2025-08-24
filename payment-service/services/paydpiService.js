const axios = require('axios');
const paydpiConfig = require('../config/paydpi');

// Initiate payment with PayDPI
const initiatePayment = async (paymentData) => {
  try {
    const { paymentId, amount, paymentMethod, uin, orderId } = paymentData;
    
    const response = await axios.post(`${paydpiConfig.baseUrl}${paydpiConfig.endpoints.initiate}`, {
      paymentId,
      amount,
      paymentMethod,
      uin,
      orderId,
      clientId: paydpiConfig.clientId,
      callbackUrl: paydpiConfig.callbackUrl
    });

    return {
      success: true,
      transactionId: response.data.transactionId,
      paymentUrl: response.data.paymentUrl,
      data: response.data
    };
  } catch (error) {
    console.error('PayDPI payment initiation error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Payment initiation failed',
      message: error.response?.data?.message || error.message
    };
  }
};

// Verify payment status
const verifyPayment = async (transactionId) => {
  try {
    const response = await axios.get(`${paydpiConfig.baseUrl}${paydpiConfig.endpoints.verify}/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${paydpiConfig.clientSecret}`
      }
    });

    return {
      success: true,
      status: response.data.status,
      data: response.data
    };
  } catch (error) {
    console.error('PayDPI payment verification error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Payment verification failed',
      message: error.response?.data?.message || error.message
    };
  }
};

// Process refund
const processRefund = async (transactionId, amount, reason) => {
  try {
    const response = await axios.post(`${paydpiConfig.baseUrl}${paydpiConfig.endpoints.refund}`, {
      transactionId,
      amount,
      reason,
      clientId: paydpiConfig.clientId
    });

    return {
      success: true,
      refundId: response.data.refundId,
      data: response.data
    };
  } catch (error) {
    console.error('PayDPI refund error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Refund failed',
      message: error.response?.data?.message || error.message
    };
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  processRefund
};