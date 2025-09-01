import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService, PaymentSessionRequest } from '../../services/api';
import './Payment.css';

interface PaymentProps {
  orderId: string;
  amount: number;
  onPaymentSuccess: (paymentId: string, transactionId: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancel: () => void;
}

interface PaymentState {
  loading: boolean;
  sessionId: string | null;
  mpgsSessionId: string | null;
  checkoutInitialized: boolean;
  error: string | null;
  success: boolean;
  paymentCompleted: boolean;
  initializationAttempted: boolean;
}

const Payment: React.FC<PaymentProps> = ({
  orderId,
  amount,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<PaymentState>({
    loading: false,
    sessionId: null,
    mpgsSessionId: null,
    checkoutInitialized: false,
    error: null,
    success: false,
    paymentCompleted: false,
    initializationAttempted: false
  });

  /**
   * Create payment session and initialize checkout
   */
  const initializePayment = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Create payment session
      const sessionData: PaymentSessionRequest = {
        orderId,
        amount,
        customer: {
          email: 'customer@nutriconnect.com',
          firstName: 'NutriConnect',
          lastName: 'Customer'
        }
      };

      console.log('🎯 Creating payment session for order:', orderId);
      const sessionResponse = await paymentService.createPaymentSession(sessionData);

      console.log('🔍 Payment session response:', JSON.stringify(sessionResponse, null, 2));

      if (!sessionResponse.success) {
        throw new Error(sessionResponse.message || 'Failed to create payment session');
      }

      console.log('✅ Payment session created:', sessionResponse.sessionId);
      console.log('✅ MPGS session ID:', sessionResponse.mpgsSessionId);

      // Initialize MPGS checkout
      await paymentService.initializeCheckout(
        sessionResponse.sessionId!,
        sessionResponse.checkoutUrl!
      );

      setState(prev => ({
        ...prev,
        loading: false,
        sessionId: sessionResponse.sessionId!,
        mpgsSessionId: sessionResponse.mpgsSessionId!,
        checkoutInitialized: true
      }));

    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed',
        initializationAttempted: true // Prevent retries
      }));
      onPaymentError(error instanceof Error ? error.message : 'Payment initialization failed');
    }
  };

  /**
   * Launch MPGS hosted payment page using the proper Mastercard integration steps
   */
  const launchPayment = async () => {
    if (!state.sessionId || !state.checkoutInitialized || !state.mpgsSessionId) {
      onPaymentError('Payment not initialized');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      console.log('🚀 Step 3: Launching MPGS hosted payment page for session:', state.mpgsSessionId);
      
      // Step 3: Use the MPGS showPaymentPage method (this will redirect to hosted page)
      await paymentService.showPaymentPage();
      
      console.log('✅ MPGS hosted payment page launched - user redirected to Mastercard');
      
      // Note: The payment completion will be handled by MPGS callbacks
      // The user is now on Mastercard's hosted page and will either:
      // 1. Complete payment -> completeCallback -> redirect to our callback URL
      // 2. Cancel payment -> cancelCallback 
      // 3. Encounter error -> errorCallback

    } catch (error) {
      console.error('❌ Payment launch error:', error);
      setState(prev => ({ ...prev, loading: false }));
      
      if (error instanceof Error) {
        onPaymentError(error.message);
      } else {
        onPaymentError('Payment launch failed');
      }
    }
  };

  // Effect to initialize payment on component mount
  useEffect(() => {
    if (orderId && amount > 0 && !state.sessionId && !state.loading && !state.initializationAttempted) {
      console.log('🎯 Initializing payment for order:', orderId);
      setState(prev => ({ ...prev, initializationAttempted: true }));
      initializePayment();
    }
  }, [orderId, amount, state.sessionId, state.loading, state.initializationAttempted]);

  // Effect to handle postMessage events from MPGS callbacks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ensure the message is from our own window (MPGS callbacks post to our window)
      if (event.origin !== window.location.origin) {
        return;
      }

      console.log('📨 Received message from MPGS:', event.data);

      if (event.data.type === 'MPGS_PAYMENT_SUCCESS') {
        console.log('✅ Payment completed successfully:', event.data.result);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          success: true, 
          paymentCompleted: true 
        }));
        
        // Call success handler with session ID
        if (state.sessionId) {
          onPaymentSuccess(state.sessionId, event.data.result?.transactionId || 'HOSTED_CHECKOUT');
        }
        
      } else if (event.data.type === 'MPGS_PAYMENT_ERROR') {
        console.log('❌ Payment failed:', event.data.error);
        setState(prev => ({ ...prev, loading: false }));
        onPaymentError(event.data.error || 'Payment failed');
        
      } else if (event.data.type === 'MPGS_PAYMENT_CANCEL') {
        console.log('⚠️ Payment cancelled by user');
        setState(prev => ({ ...prev, loading: false }));
        onPaymentCancel();
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [state.sessionId]);

  // Separate effect to check for payment completion on page load (return from hosted checkout)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const resultIndicator = urlParams.get('resultIndicator');
    
    if (sessionId && state.sessionId && sessionId === state.sessionId) {
      console.log('🔄 Processing payment return from hosted checkout');
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        success: true, 
        paymentCompleted: true 
      }));
      onPaymentSuccess(sessionId, resultIndicator || 'HOSTED_CHECKOUT');
    }
  }, [state.sessionId, onPaymentSuccess]);

  if (state.error) {
    return (
      <div className="payment-container error">
        <div className="payment-card">
          <h2>❌ Payment Error</h2>
          <p>{state.error}</p>
          <div className="payment-actions">
            <button 
              className="btn btn-secondary" 
              onClick={onPaymentCancel}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setState(prev => ({ ...prev, initializationAttempted: false, error: null }));
                initializePayment();
              }}
            >
              Retry Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.success && state.paymentCompleted) {
    return (
      <div className="payment-container success">
        <div className="payment-card">
          <h2>✅ Payment Successful!</h2>
          <div className="success-details">
            <p>🎉 Your order has been confirmed and payment processed successfully.</p>
            <div className="detail-row">
              <span className="label">Order ID:</span>
              <span className="value">{orderId}</span>
            </div>
            <div className="detail-row">
              <span className="label">Amount:</span>
              <span className="value">LKR {amount.toFixed(2)}</span>
            </div>
          </div>
          <div className="redirect-info">
            <div className="status-indicator">
              <span className="spinner"></span>
              <span>Redirecting to dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>💳 Secure Payment</h2>
        
        <div className="payment-details">
          <div className="detail-row">
            <span className="label">Order ID:</span>
            <span className="value">{orderId}</span>
          </div>
          <div className="detail-row">
            <span className="label">Amount:</span>
            <span className="value">LKR {amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="payment-info">
          <p>🔒 Your payment is secured by Mastercard Payment Gateway Services (MPGS)</p>
          <p>✅ All transactions are encrypted and secure</p>
        </div>

        <div className="payment-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onPaymentCancel}
            disabled={state.loading}
          >
            Cancel
          </button>
          
          <button 
            className="btn btn-primary btn-pay" 
            onClick={launchPayment}
            disabled={state.loading || !state.checkoutInitialized}
          >
            {state.loading ? (
              <>
                <span className="spinner"></span>
                {state.checkoutInitialized ? 'Processing...' : 'Initializing...'}
              </>
            ) : (
              <>
                <span>💳</span>
                Pay LKR {amount.toFixed(2)}
              </>
            )}
          </button>
        </div>

        {state.loading && (
          <div className="payment-status">
            <div className="status-indicator">
              <span className="spinner"></span>
              <span>
                {!state.checkoutInitialized 
                  ? 'Setting up secure payment...' 
                  : 'Processing payment...'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;
