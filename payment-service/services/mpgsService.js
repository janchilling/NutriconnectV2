const axios = require('axios');
const crypto = require('crypto');
const mpgsConfig = require('../config/mpgs');

class MPGSService {
  constructor() {
    this.apiVersion = mpgsConfig.apiVersion;
    this.merchantId = mpgsConfig.merchantId;
    this.merchantPassword = mpgsConfig.merchantPassword;
    this.gatewayHost = mpgsConfig.gatewayHost;
    
    // Use the gateway host from env (should be cbcmpgs.gateway.mastercard.com for test)
    this.baseUrl = `https://${this.gatewayHost}/api/rest/version/${this.apiVersion}`;
    
    if (!this.merchantId || !this.merchantPassword) {
      console.warn('⚠️ MPGS credentials not configured. Payment sessions will fail.');
    }
    
    console.log(`🔧 MPGS Service initialized:`, {
      apiVersion: this.apiVersion,
      merchantId: this.merchantId,
      gatewayHost: this.gatewayHost,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Create authentication headers for MPGS API
   */
  getAuthHeaders() {
    // MPGS requires username in format: merchant.<merchantId>
    const username = `merchant.${this.merchantId}`;
    const credentials = `${username}:${this.merchantPassword}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generate unique session ID (MPGS requires >28 and <36 characters)
   * Note: This is only used for transaction IDs, not session creation
   */
  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    // Format: TXN_<timestamp>_<12-char-hex> = ~30 chars
    return `TXN_${timestamp}_${random}`;
  }

  /**
   * STEP 1: Create Payment Session for Hosted Checkout
   * Creates a session that will be used by Mastercard's hosted payment form
   * @param {Object} sessionData - Session creation data
   * @returns {Promise<Object>} Session response
   */
  async createSession(sessionData) {
    try {
      const { orderId, amount, currency = mpgsConfig.currency, customer, billing } = sessionData;

      // Validate required parameters
      if (!orderId || amount === undefined || amount <= 0) {
        throw new Error('Order ID and valid amount are required');
      }

      // STEP 1: Create session for HOSTED CHECKOUT using INITIATE_CHECKOUT
      const sessionPayload = {
        apiOperation: "INITIATE_CHECKOUT",
        interaction: {
          merchant: {
            name: mpgsConfig.interaction.merchant.name || this.merchantId
          },
          operation: "PURCHASE",
          displayControl: {
            billingAddress: "HIDE",
            customerEmail: "HIDE", 
            shipping: "HIDE"
          },
          returnUrl: `${mpgsConfig.callbackUrl}?orderId=${orderId}`
        },
        order: {
          id: orderId,
          currency: currency,
          description: `NutriConnect Order ${orderId}`,
          amount: parseFloat(amount).toFixed(2)
        }
      };

      // Add customer information if provided
      if (customer) {
        sessionPayload.customer = {};
        if (customer.email) sessionPayload.customer.email = customer.email;
        if (customer.firstName) sessionPayload.customer.firstName = customer.firstName;
        if (customer.lastName) sessionPayload.customer.lastName = customer.lastName;
        if (customer.phone) sessionPayload.customer.phone = customer.phone;
      }

      // Add billing information if provided
      if (billing && billing.address) {
        sessionPayload.billing = {
          address: billing.address
        };
      }

      console.log('🎯 STEP 1: Creating MPGS hosted checkout session:', {
        orderId,
        amount,
        currency,
        payload: JSON.stringify(sessionPayload, null, 2),
        url: `${this.baseUrl}/merchant/${this.merchantId}/session`
      });

      const response = await axios.post(
        `${this.baseUrl}/merchant/${this.merchantId}/session`,
        sessionPayload,
        { 
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      if (response.data.result === 'SUCCESS') {
        const sessionId = response.data.session?.id;
        
        console.log('✅ STEP 1: MPGS hosted checkout session created:', {
          sessionId,
          version: response.data.session?.version,
          status: response.data.session?.status
        });

        console.log('🔍 Full MPGS response:', JSON.stringify(response.data, null, 2));

        return {
          success: true,
          sessionId: sessionId,
          sessionVersion: response.data.session?.version,
          status: response.data.session?.status,
          // For MPGS hosted checkout, return the checkout.js script URL
          checkoutUrl: `https://cbcmpgs.gateway.mastercard.com/static/checkout/checkout.min.js`,
          // Session ID for frontend configuration
          mpgsSessionId: sessionId,
          // Callback URL for payment completion
          callbackUrl: `${mpgsConfig.callbackUrl}?orderId=${orderId}`,
          // Complete session data for debugging
          sessionData: response.data
        };
      } else {
        console.error('❌ STEP 1: MPGS session creation failed:', {
          result: response.data.result,
          error: response.data.error,
          explanation: response.data.error?.explanation
        });
        
        return {
          success: false,
          error: 'SESSION_CREATION_FAILED',
          message: response.data.error?.explanation || 'Failed to create payment session',
          result: response.data.result,
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ STEP 1: MPGS createSession error:', error.message);
      
      if (error.response) {
        console.error('❌ MPGS API Error Response:', error.response.data);
        return {
          success: false,
          error: 'MPGS_API_ERROR',
          message: error.response.data?.error?.explanation || 'MPGS API error',
          statusCode: error.response.status,
          data: error.response.data
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to MPGS gateway'
      };
    }
  }

  /**
   * HOSTED CHECKOUT: Handle Payment Completion
   * Called when user is redirected back from Mastercard hosted checkout
   * This combines Steps 2-5 automatically handled by Mastercard
   * @param {string} sessionId - Session ID from the callback
   * @param {string} orderId - Order ID for verification
   * @param {string} resultIndicator - Result indicator from callback (optional)
   * @returns {Promise<Object>} Payment completion result
   */
  async handleHostedCheckoutCompletion(sessionId, orderId, resultIndicator = null) {
    try {
      console.log('🏁 HOSTED CHECKOUT: Processing completion callback:', { 
        sessionId, 
        orderId, 
        resultIndicator 
      });

      // For hosted checkout, we need to retrieve the session to check the final status
      // Mastercard handles Steps 2-5 automatically in the hosted flow
      const sessionResult = await this.getSession(sessionId);
      
      if (!sessionResult.success) {
        console.error('❌ HOSTED CHECKOUT: Unable to retrieve session:', sessionResult);
        return {
          success: false,
          error: 'SESSION_RETRIEVAL_FAILED',
          message: 'Unable to retrieve payment session for verification'
        };
      }

      const session = sessionResult.session;
      console.log('📊 HOSTED CHECKOUT: Session retrieved:', JSON.stringify(session, null, 2));

      // Extract payment details from session
      const order = session.order;
      const transactions = session.transaction || [];
      
      // Find the latest transaction (payment attempt)
      const latestTransaction = Array.isArray(transactions) 
        ? transactions[transactions.length - 1] 
        : transactions;

      // Verify order ID matches
      if (order?.id !== orderId) {
        console.error('❌ HOSTED CHECKOUT: Order ID mismatch:', {
          sessionOrderId: order?.id,
          expectedOrderId: orderId
        });
        return {
          success: false,
          error: 'ORDER_MISMATCH',
          message: 'Order ID does not match session'
        };
      }

      // Check payment status
      const isSuccess = latestTransaction?.result === 'SUCCESS' && 
                       latestTransaction?.response?.acquirerCode === '00';

      const paymentStatus = isSuccess ? 'completed' : 'failed';

      console.log(`${isSuccess ? '✅' : '❌'} HOSTED CHECKOUT: Payment ${paymentStatus}:`, {
        transactionResult: latestTransaction?.result,
        acquirerCode: latestTransaction?.response?.acquirerCode,
        transactionId: latestTransaction?.id
      });

      return {
        success: true,
        verified: isSuccess,
        status: paymentStatus,
        transactionId: latestTransaction?.id,
        acquirerCode: latestTransaction?.response?.acquirerCode,
        receiptNumber: latestTransaction?.receipt,
        amount: order?.amount,
        currency: order?.currency,
        paymentMethod: latestTransaction?.sourceOfFunds?.type,
        authorizationCode: latestTransaction?.response?.authorizationCode,
        // Include session data for debugging
        sessionData: session,
        // Error information if payment failed
        errorCode: !isSuccess ? latestTransaction?.error?.cause : null,
        errorMessage: !isSuccess ? latestTransaction?.error?.explanation : null
      };

    } catch (error) {
      console.error('❌ HOSTED CHECKOUT: Completion handling error:', error.message);
      return {
        success: false,
        error: 'COMPLETION_PROCESSING_ERROR',
        message: 'Failed to process payment completion'
      };
    }
  }

  /**
   * STEP 3: Initiate Authentication
   * Called after user clicks "Pay" - checks if authentication is needed
   * @param {string} sessionId - Session ID
   * @param {string} orderId - Order ID  
   * @returns {Promise<Object>} Authentication response
   */
  async initiateAuthentication(sessionId, orderId) {
    try {
      console.log('🔐 STEP 3: Initiating authentication:', { sessionId, orderId });

      const authPayload = {
        apiOperation: 'INITIATE_AUTHENTICATION',
        authentication: {
          acceptVersions: "3DS1,3DS2",
          channel: "PAYER_BROWSER",
          purpose: "PAYMENT_TRANSACTION"
        },
        correlationId: `AUTH_${Date.now()}`,
        order: {
          id: orderId
        }
      };

      const response = await axios.put(
        `${this.baseUrl}/merchant/${this.merchantId}/order/${orderId}/transaction/${sessionId}`,
        authPayload,
        { 
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      if (response.data.result === 'SUCCESS') {
        const authRequired = response.data.authentication?.redirectResponseUrl ? true : false;
        
        console.log('✅ STEP 3: Authentication check completed:', {
          authRequired,
          redirectUrl: response.data.authentication?.redirectResponseUrl
        });

        return {
          success: true,
          authenticationRequired: authRequired,
          redirectUrl: response.data.authentication?.redirectResponseUrl,
          authenticationStatus: response.data.authentication?.status,
          transactionId: response.data.transaction?.id,
          data: response.data
        };
      } else {
        console.error('❌ STEP 3: Authentication initiation failed:', response.data);
        return {
          success: false,
          error: 'AUTHENTICATION_FAILED',
          message: response.data.error?.explanation || 'Authentication initiation failed',
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ STEP 3: Authentication error:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: 'MPGS_API_ERROR',
          message: error.response.data?.error?.explanation || 'Authentication API error',
          statusCode: error.response.status,
          data: error.response.data
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to MPGS gateway'
      };
    }
  }

  /**
   * STEP 4: Authenticate Payer (after OTP)
   * Called after user completes OTP challenge
   * @param {string} sessionId - Session ID
   * @param {string} orderId - Order ID
   * @param {string} paRes - Payer authentication response
   * @returns {Promise<Object>} Authentication result
   */
  async authenticatePayer(sessionId, orderId, paRes) {
    try {
      console.log('🔑 STEP 4: Authenticating payer:', { sessionId, orderId });

      const authPayload = {
        apiOperation: 'AUTHENTICATE_PAYER',
        authentication: {
          redirectResponseUrl: paRes
        },
        order: {
          id: orderId
        }
      };

      const response = await axios.put(
        `${this.baseUrl}/merchant/${this.merchantId}/order/${orderId}/transaction/${sessionId}`,
        authPayload,
        { 
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      if (response.data.result === 'SUCCESS') {
        console.log('✅ STEP 4: Payer authentication completed:', {
          status: response.data.authentication?.status
        });

        return {
          success: true,
          authenticationStatus: response.data.authentication?.status,
          authenticationSuccessful: response.data.authentication?.status === 'AUTHENTICATION_SUCCESSFUL',
          transactionId: response.data.transaction?.id,
          data: response.data
        };
      } else {
        console.error('❌ STEP 4: Payer authentication failed:', response.data);
        return {
          success: false,
          error: 'PAYER_AUTHENTICATION_FAILED',
          message: response.data.error?.explanation || 'Payer authentication failed',
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ STEP 4: Payer authentication error:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: 'MPGS_API_ERROR',
          message: error.response.data?.error?.explanation || 'Payer authentication API error',
          statusCode: error.response.status,
          data: error.response.data
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to MPGS gateway'
      };
    }
  }

  /**
   * STEP 5: Process Payment (PAY API)
   * Final payment processing
   * @param {string} sessionId - Session ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(sessionId, orderId) {
    try {
      console.log('💳 STEP 5: Processing payment:', { sessionId, orderId });

      const paymentPayload = {
        apiOperation: 'PAY',
        order: {
          id: orderId
        },
        session: {
          id: sessionId
        }
      };

      const response = await axios.put(
        `${this.baseUrl}/merchant/${this.merchantId}/order/${orderId}/transaction/${sessionId}`,
        paymentPayload,
        { 
          headers: this.getAuthHeaders(),
          timeout: 30000
        }
      );

      if (response.data.result === 'SUCCESS') {
        console.log('✅ STEP 5: Payment processed successfully:', {
          transactionId: response.data.transaction?.id,
          acquirerCode: response.data.response?.acquirerCode
        });

        return {
          success: true,
          verified: true,
          status: 'completed',
          transactionId: response.data.transaction?.id,
          acquirerCode: response.data.response?.acquirerCode,
          receiptNumber: response.data.transaction?.receipt,
          amount: response.data.order?.amount,
          currency: response.data.order?.currency,
          paymentMethod: response.data.sourceOfFunds?.type,
          data: response.data
        };
      } else {
        console.error('❌ STEP 5: Payment processing failed:', response.data);
        return {
          success: true,
          verified: false,
          status: 'failed',
          error: response.data.error?.cause || 'PAYMENT_DECLINED',
          message: response.data.error?.explanation || 'Payment was declined',
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ STEP 5: Payment processing error:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: 'MPGS_API_ERROR',
          message: error.response.data?.error?.explanation || 'Payment API error',
          statusCode: error.response.status,
          data: error.response.data
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to MPGS gateway'
      };
    }
  }

  /**
   * Retrieve session information
   * @param {string} sessionId - Session ID to retrieve
   * @returns {Promise<Object>} Session information
   */
  async getSession(sessionId) {
    try {
      console.log('📊 Retrieving MPGS session:', sessionId);

      const response = await axios.get(
        `${this.baseUrl}/merchant/${this.merchantId}/session/${sessionId}`,
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        session: response.data
      };

    } catch (error) {
      console.error('❌ MPGS getSession error:', error.message);
      
      if (error.response) {
        return {
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: error.response.data?.error?.explanation || 'Session not found',
          statusCode: error.response.status
        };
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to MPGS gateway'
      };
    }
  }

  /**
   * Verify payment completion by checking session status
   * @param {string} sessionId - Session ID to verify
   * @param {string} orderId - Order ID for verification
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(sessionId, orderId) {
    try {
      console.log('🔍 Verifying MPGS payment:', { sessionId, orderId });

      const sessionResult = await this.getSession(sessionId);
      
      if (!sessionResult.success) {
        return {
          success: false,
          error: 'VERIFICATION_FAILED',
          message: 'Unable to retrieve session for verification'
        };
      }

      const session = sessionResult.session;
      const order = session.order;
      const transaction = session.transaction;

      // Verify order ID matches
      if (order?.id !== orderId) {
        return {
          success: false,
          error: 'ORDER_MISMATCH',
          message: 'Order ID does not match session'
        };
      }

      // Check transaction status
      const isSuccess = transaction?.result === 'SUCCESS' && 
                       transaction?.response?.acquirerCode === '00';

      return {
        success: true,
        verified: isSuccess,
        status: isSuccess ? 'completed' : 'failed',
        transactionId: transaction?.id,
        acquirerCode: transaction?.response?.acquirerCode,
        receiptNumber: transaction?.receipt,
        amount: order?.amount,
        currency: order?.currency,
        resultIndicator: session?.resultIndicator, // Include resultIndicator for tracking
        session: session,
        paymentMethod: transaction?.sourceOfFunds?.type
      };

    } catch (error) {
      console.error('❌ MPGS verifyPayment error:', error.message);
      return {
        success: false,
        error: 'VERIFICATION_ERROR',
        message: 'Payment verification failed'
      };
    }
  }

  /**
   * Validate webhook signature (if webhook secret is configured)
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Validation result
   */
  validateWebhookSignature(payload, signature) {
    if (!mpgsConfig.webhookSecret) {
      console.warn('⚠️ Webhook secret not configured, skipping signature validation');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', mpgsConfig.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('❌ Webhook signature validation error:', error.message);
      return false;
    }
  }
}

module.exports = new MPGSService();
