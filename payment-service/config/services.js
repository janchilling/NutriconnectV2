module.exports = {
  nutriconnectService: {
    baseUrl: process.env.NUTRICONNECT_SERVICE_URL || 'http://localhost:3002',
    endpoints: {
      updateOrderPayment: '/api/orders/payment-status'
    }
  }
};