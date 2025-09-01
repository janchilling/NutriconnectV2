import React, { useState, useEffect, useRef } from 'react';
import './Payment.css';

declare global {
  interface Window {
    PaymentSession?: any;
  }
}

interface PaymentProps {
  orderId: string;
  amount: number;
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
  onCancel: () => void;
}

interface PaymentFormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  securityCode: string;
  cardholderName: string;
}

const MPGSPayment: React.FC<PaymentProps> = ({ 
  orderId, 
  amount, 
  onSuccess, 
  onError, 
  onCancel 
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionJsUrl, setSessionJsUrl] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
    cardholderName: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const sessionRef = useRef<any>(null);

  // Initialize payment session (STEP 1)
  useEffect(() => {
    initializePaymentSession();
  }, [orderId, amount]);

  // Load session.js when sessionJsUrl is available
  useEffect(() => {
    if (sessionJsUrl && !sessionLoaded) {
      loadSessionJS();
    }
  }, [sessionJsUrl, sessionLoaded]);

  const initializePaymentSession = async () => {
    try {
      console.log('STEP 1: Initializing payment session for order:', orderId);

      const token = localStorage.getItem('authToken');
      if (!token) {
        onError({ message: 'Authentication token not found' });
        return;
      }

      const response = await fetch('/api/payment/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          amount,
          customer: {
            email: 'user@nutriconnect.com',
            firstName: 'NutriConnect',
            lastName: 'User'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('STEP 1: Payment session created:', data.sessionId);
        setSessionId(data.sessionId);
        setSessionJsUrl(data.sessionJsUrl);
      } else {
        console.error('STEP 1: Session creation failed:', data);
        onError(data);
      }
    } catch (error) {
      console.error('STEP 1: Session initialization error:', error);
      onError({ message: 'Failed to initialize payment session' });
    }
  };

  const loadSessionJS = async () => {
    if (!sessionJsUrl) return;

    try {
      console.log('Loading session.js from:', sessionJsUrl);

      // Create script element
      const script = document.createElement('script');
      script.src = sessionJsUrl;
      script.onload = () => {
        console.log('session.js loaded successfully');
        setSessionLoaded(true);
        initializeSession();
      };
      script.onerror = () => {
        console.error('Failed to load session.js');
        onError({ message: 'Failed to load payment library' });
      };

      document.head.appendChild(script);

      // Cleanup
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } catch (error) {
      console.error('session.js loading error:', error);
      onError({ message: 'Failed to load payment library' });
    }
  };

  const initializeSession = () => {
    if (!window.PaymentSession || !sessionId) return;

    try {
      console.log('Initializing PaymentSession with sessionId:', sessionId);

      sessionRef.current = new window.PaymentSession({
        sessionId: sessionId,
        fields: {
          card: {
            number: '#card-number',
            securityCode: '#security-code',
            expiryMonth: '#expiry-month',
            expiryYear: '#expiry-year'
          }
        },
        frameEmbeddingMitigation: ['javascript'],
        callbacks: {
          initialized: (response: any) => {
            console.log('Session initialized:', response);
            setIsSessionReady(true);
          },
          formSessionUpdate: (response: any) => {
            console.log('Session updated:', response);
            if (response.status === 'fields_in_error') {
              const fieldErrors: {[key: string]: string} = {};
              if (response.errors && response.errors.card) {
                Object.keys(response.errors.card).forEach(field => {
                  fieldErrors[field] = response.errors.card[field];
                });
              }
              setErrors(fieldErrors);
            } else if (response.status === 'ok') {
              setErrors({});
            }
          }
        },
        interaction: {
          displayControl: {
            formatCard: 'EMBOSSED',
            invalidFieldCharacters: 'REJECT'
          }
        }
      });

      console.log('PaymentSession created successfully');

    } catch (error) {
      console.error('PaymentSession initialization error:', error);
      onError({ message: 'Failed to initialize payment session' });
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm() || !sessionRef.current || !sessionId) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Starting payment process...');

      // Update session with card details (STEP 2)
      console.log('STEP 2: Updating session with card details...');
      
      // The session.js will automatically capture and update the session
      // We need to trigger the session update
      sessionRef.current.updateSessionFromForm('card');

      // Wait a moment for session update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Initiate authentication (STEP 3)
      console.log('STEP 3: Initiating authentication...');
      const authResponse = await fetch('/api/payment/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          sessionId,
          orderId
        })
      });

      const authData = await authResponse.json();

      if (!authData.success) {
        throw new Error(authData.message || 'Authentication failed');
      }

      // Check if 3DS authentication is required
      if (authData.authenticationRequired && authData.redirectUrl) {
        console.log('STEP 4: 3DS authentication required, redirecting...');
        
        // Handle 3DS authentication (could be popup or redirect)
        const authWindow = window.open(
          authData.redirectUrl,
          '3DSAuthentication',
          'width=400,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for authentication completion
        const checkAuth = setInterval(() => {
          try {
            if (authWindow?.closed) {
              clearInterval(checkAuth);
              // Authentication window closed, assume completed
              processPaymentAfterAuth();
            }
          } catch (e) {
            // Cross-origin error, continue checking
          }
        }, 1000);

        return;
      }

      // No authentication required, proceed with payment
      await processPaymentAfterAuth();

    } catch (error) {
      console.error('Payment process error:', error);
      setIsProcessing(false);
      onError({ message: error instanceof Error ? error.message : 'Payment failed' });
    }
  };

  const processPaymentAfterAuth = async () => {
    try {
      console.log('STEP 5: Processing payment...');

      const paymentResponse = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          sessionId,
          orderId
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success && paymentData.verified) {
        console.log('Payment completed successfully:', paymentData);
        onSuccess({
          transactionId: paymentData.transactionId,
          acquirerCode: paymentData.acquirerCode,
          receiptNumber: paymentData.receiptNumber,
          amount: paymentData.amount,
          currency: paymentData.currency
        });
      } else {
        console.error('Payment verification failed:', paymentData);
        onError({
          message: paymentData.message || 'Payment verification failed'
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      onError({ message: 'Payment processing failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => ({ 
    value: String(i + 1).padStart(2, '0'), 
    label: String(i + 1).padStart(2, '0') 
  }));

  return (
    <div className="mpgs-payment-container">
      <div className="payment-header">
        <h2>Payment Details</h2>
        <p>Order: {orderId} | Amount: ${amount.toFixed(2)}</p>
      </div>

      {!sessionLoaded && (
        <div className="loading-session">
          <div className="spinner"></div>
          <p>Loading secure payment form...</p>
        </div>
      )}

      {sessionLoaded && !isSessionReady && (
        <div className="loading-session">
          <div className="spinner"></div>
          <p>Initializing payment session...</p>
        </div>
      )}

      {sessionLoaded && isSessionReady && (
        <div className="payment-form">
          <div className="form-group">
            <label htmlFor="cardholder-name">Cardholder Name *</label>
            <input
              type="text"
              id="cardholder-name"
              value={formData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value)}
              className={errors.cardholderName ? 'error' : ''}
              placeholder="John Doe"
              disabled={isProcessing}
            />
            {errors.cardholderName && <div className="error-message">{errors.cardholderName}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="card-number">Card Number *</label>
            <input
              type="text"
              id="card-number"
              className={errors.cardNumber ? 'error' : ''}
              placeholder="1234 5678 9012 3456"
              disabled={isProcessing}
            />
            {errors.cardNumber && <div className="error-message">{errors.cardNumber}</div>}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="expiry-month">Month *</label>
              <select
                id="expiry-month"
                className={errors.expiryMonth ? 'error' : ''}
                disabled={isProcessing}
              >
                <option value="">MM</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              {errors.expiryMonth && <div className="error-message">{errors.expiryMonth}</div>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="expiry-year">Year *</label>
              <select
                id="expiry-year"
                className={errors.expiryYear ? 'error' : ''}
                disabled={isProcessing}
              >
                <option value="">YYYY</option>
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.expiryYear && <div className="error-message">{errors.expiryYear}</div>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="security-code">CVV *</label>
              <input
                type="text"
                id="security-code"
                className={errors.securityCode ? 'error' : ''}
                placeholder="123"
                maxLength={4}
                disabled={isProcessing}
              />
              {errors.securityCode && <div className="error-message">{errors.securityCode}</div>}
            </div>
          </div>

          <div className="payment-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-pay"
              onClick={handlePayment}
              disabled={isProcessing || !isSessionReady}
            >
              {isProcessing ? (
                <>
                  <div className="spinner-small"></div>
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}

      <div className="payment-security">
        <div className="security-icons">
          <span className="icon-shield">🔒</span>
          <span>Secured by MPGS</span>
        </div>
        <p className="security-text">
          Your payment information is encrypted and secure.
        </p>
      </div>
    </div>
  );
};

export default MPGSPayment;
