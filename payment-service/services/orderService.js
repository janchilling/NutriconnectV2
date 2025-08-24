const axios = require('axios');
const servicesConfig = require('../config/services');

// Update order payment status in nutriconnect-service
const updateOrderPaymentStatus = async (orderId, paymentStatus, paymentId, paymentMethod) => {
  try {
    const response = await axios.patch(
      `${servicesConfig.nutriconnectService.baseUrl}${servicesConfig.nutriconnectService.endpoints.updateOrderPayment}`,
      {
        orderId,
        paymentStatus,
        paymentId,
        paymentMethod,
        updatedAt: new Date()
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Auth': 'payment-service-internal' // Internal service auth
        },
        timeout: 5000
      }
    );

    console.log(`✅ Order ${orderId} payment status updated to: ${paymentStatus}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`❌ Failed to update order ${orderId} payment status:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  updateOrderPaymentStatus
};