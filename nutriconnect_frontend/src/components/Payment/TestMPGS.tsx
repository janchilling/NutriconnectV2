import React from 'react';

const TestMPGS: React.FC = () => {
  const testWithValidSession = async () => {
    try {
      // First, let's create a session via our backend
      const response = await fetch('http://localhost:3003/api/payment/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          orderId: 'TEST_ORDER_' + Date.now(),
          amount: 100.00,
          customer: {
            email: 'test@nutriconnect.com',
            firstName: 'Test',
            lastName: 'User'
          }
        })
      });
      
      const sessionData = await response.json();
      console.log('Session created:', sessionData);
      
      if (!sessionData.success) {
        alert('Failed to create session: ' + sessionData.message);
        return;
      }
      
      // Now test the hosted checkout with the real session
      testMPGSHostedCheckout(sessionData.mpgsSessionId);
      
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session: ' + error);
    }
  };

  const testMPGSHostedCheckout = (sessionId: string) => {
    console.log('🔧 Testing MPGS with session:', sessionId);
    
    // Step 1: Create the checkout object
    const script = document.createElement('script');
    script.src = 'https://cbcmpgs.gateway.mastercard.com/static/checkout/checkout.min.js';
    script.setAttribute('data-error', 'errorCallback');
    script.setAttribute('data-cancel', 'cancelCallback');
    script.setAttribute('data-complete', 'completeCallback');
    
    // Define callbacks before loading script
    (window as any).errorCallback = function(error: any) {
      console.error('❌ MPGS Error:', error);
      alert('Payment failed: ' + JSON.stringify(error, null, 2));
    };
    
    (window as any).cancelCallback = function() {
      console.log('⚠️ Payment cancelled');
      alert('Payment was cancelled');
    };
    
    (window as any).completeCallback = function(result: any) {
      console.log('✅ Payment completed:', result);
      alert('Payment successful: ' + JSON.stringify(result, null, 2));
    };
    
    script.onload = () => {
      console.log('✅ MPGS script loaded');
      
      try {
        // Step 2: Configure the checkout object
        (window as any).Checkout.configure({
          session: {
            id: sessionId
          }
        });
        
        console.log('✅ MPGS configured with session:', sessionId);
        
        // Step 3: Launch payment page after a short delay
        setTimeout(() => {
          console.log('🚀 Launching MPGS hosted payment page...');
          (window as any).Checkout.showPaymentPage();
        }, 1000);
        
      } catch (configError) {
        console.error('❌ MPGS configuration error:', configError);
        alert('Configuration failed: ' + configError);
      }
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load MPGS script:', error);
      alert('Failed to load MPGS script');
    };
    
    document.head.appendChild(script);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>MPGS Integration Test</h2>
      <p>Test the complete MPGS hosted checkout flow</p>
      
      <button 
        onClick={testWithValidSession}
        style={{
          padding: '15px 30px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Test with Real Session
      </button>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '14px',
        marginTop: '20px'
      }}>
        <strong>What this test does:</strong>
        <ol>
          <li>Creates a real payment session via our backend</li>
          <li>Loads the MPGS checkout script</li>
          <li>Configures it with the session ID</li>
          <li>Launches the hosted payment page</li>
        </ol>
        
        <p><strong>Test Cards:</strong></p>
        <ul>
          <li><strong>Visa:</strong> 4005520000000129</li>
          <li><strong>Mastercard:</strong> 5123450000000008</li>
          <li><strong>Expiry:</strong> Any future date (e.g., 12/25)</li>
          <li><strong>CVV:</strong> Any 3 digits (e.g., 123)</li>
        </ul>
      </div>
    </div>
  );
};

export default TestMPGS;
