module.exports = {
  baseUrl: process.env.PAYDPI_BASE_URL || 'http://localhost:4002',
  clientId: process.env.PAYDPI_CLIENT_ID || 'nutriconnect-payment-client',
  clientSecret: process.env.PAYDPI_CLIENT_SECRET || 'nutriconnect-payment-secret',
  callbackUrl: process.env.PAYDPI_CALLBACK_URL || 'http://localhost:3003/payments/callback',
  endpoints: {
    initiate: '/api/payments/initiate',
    verify: '/api/payments/verify',
    refund: '/api/payments/refund',
    status: '/api/payments/status'
  }
};