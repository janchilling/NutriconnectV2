module.exports = {
  // MPGS Configuration
  apiVersion: process.env.MPGS_API_VERSION || '100',
  merchantId: process.env.MPGS_MERCHANT_ID,
  merchantPassword: process.env.MPGS_MERCHANT_PASSWORD,
  gatewayHost: process.env.MPGS_GATEWAY_HOST || 'cbcmpgs.gateway.mastercard.com',
  
  // Hosted Checkout Configuration
  checkoutVersion: process.env.MPGS_CHECKOUT_VERSION || '1.5.0',
  checkoutHost: process.env.MPGS_CHECKOUT_HOST || 'cbcmpgs.gateway.mastercard.com',
  
  // Webhook and Callback Configuration
  callbackUrl: process.env.MPGS_CALLBACK_URL || 'http://localhost:3003/api/payment/complete',
  cancelUrl: process.env.MPGS_CANCEL_URL || 'http://localhost:3003/api/payment/complete?status=cancelled',
  errorUrl: process.env.MPGS_ERROR_URL || 'http://localhost:3003/api/payment/complete?status=error',
  
  // Payment Interaction
  interaction: {
    merchant: {
      name: process.env.MERCHANT_NAME || 'NutriConnect',
      url: process.env.MERCHANT_URL || 'http://localhost:3000',
      logo: process.env.MERCHANT_LOGO || 'http://localhost:3000/logo.png'
    },
    displayControl: {
      billingAddress: 'HIDE',
      customerEmail: 'HIDE',
      shipping: 'HIDE'
    },
    timeout: 1800, // 30 minutes
    timeoutUrl: process.env.MPGS_TIMEOUT_URL || 'http://localhost:3003/api/payment/complete?status=timeout'
  },
  
  // Currency and Order Settings
  currency: process.env.PAYMENT_CURRENCY || 'LKR',
  
  // Security Settings
  webhookSecret: process.env.MPGS_WEBHOOK_SECRET
};
