const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 4002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory stores
const transactionStore = new Map();
const refundStore = new Map();

// Valid clients
const clients = {
  'nutriconnect-payment-client': {
    clientId: 'nutriconnect-payment-client',
    clientSecret: 'nutriconnect-payment-secret',
    name: 'NutriConnect Payment Service'
  }
};

// Mock payment scenarios based on amount patterns
const getPaymentScenario = (amount, paymentMethod, uin) => {
  // Happy path scenarios
  if (amount <= 100) return 'success';
  if (amount > 100 && amount <= 500) return 'success';
  if (uin.includes('001') || uin.includes('002')) return 'success';
  
  // Subsidy always succeeds
  if (paymentMethod === 'subsidy') return 'success';
  
  // Failure scenarios based on amount patterns
  if (amount === 999) return 'insufficient_funds';
  if (amount === 888) return 'card_declined';
  if (amount === 777) return 'network_error';
  if (amount > 1000) return 'limit_exceeded';
  
  // Edge cases
  if (uin.includes('003')) return 'card_declined'; // UIN003 has card issues
  if (uin.includes('004')) return 'network_error'; // UIN004 has network issues
  
  // Default success for other amounts
  return 'success';
};

// Helper functions
const generateTransactionId = () => 'TXN_' + crypto.randomBytes(16).toString('hex').toUpperCase();
const generateRefundId = () => 'REF_' + crypto.randomBytes(12).toString('hex').toUpperCase();

const logWithTimestamp = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [PayDPI] ${message}`, data);
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PayDPI Mock Provider',
    port: PORT,
    timestamp: new Date().toISOString(),
    activeTransactions: transactionStore.size,
    activeRefunds: refundStore.size
  });
});

// Initiate payment
app.post('/api/payments/initiate', (req, res) => {
  try {
    const { paymentId, amount, paymentMethod, uin, orderId, clientId, callbackUrl } = req.body;
    
    logWithTimestamp('Payment initiation request:', { paymentId, amount, paymentMethod, uin, orderId });
    
    // Validate client
    if (!clients[clientId]) {
      return res.status(401).json({
        error: 'invalid_client',
        message: 'Invalid client ID'
      });
    }
    
    // Validate required fields
    if (!paymentId || !amount || !paymentMethod || !uin || !orderId) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Missing required fields: paymentId, amount, paymentMethod, uin, orderId'
      });
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Amount must be a positive number'
      });
    }
    
    // Generate transaction ID
    const transactionId = generateTransactionId();
    
    // Determine scenario based on input
    const scenario = getPaymentScenario(amount, paymentMethod, uin);
    
    // Store transaction
    const transaction = {
      transactionId,
      paymentId,
      amount,
      paymentMethod,
      uin,
      orderId,
      clientId,
      callbackUrl,
      scenario,
      status: 'initiated',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    transactionStore.set(transactionId, transaction);
    
    // Simulate different payment method flows
    let responseData = {
      success: true,
      transactionId,
      status: 'initiated',
      message: 'Payment initiated successfully'
    };
    
    if (paymentMethod === 'card') {
      responseData.paymentUrl = `http://localhost:${PORT}/payment-gateway?txn=${transactionId}`;
      responseData.requiresRedirect = true;
      responseData.message = 'Redirect user to payment gateway';
    } else if (paymentMethod === 'subsidy') {
      // Subsidy payments are processed immediately
      transaction.status = scenario === 'success' ? 'completed' : 'failed';
      transaction.updatedAt = new Date();
      
      responseData.status = transaction.status;
      responseData.message = scenario === 'success' ? 'Subsidy payment completed' : 'Subsidy payment failed';
      
      // Send callback immediately for subsidy
      setTimeout(() => {
        sendCallback(transaction);
      }, 1000);
    }
    
    logWithTimestamp('Payment initiated:', {
      transactionId,
      scenario,
      status: transaction.status,
      paymentMethod
    });
    
    res.json(responseData);
    
  } catch (error) {
    logWithTimestamp('Payment initiation error:', error.message);
    res.status(500).json({
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

// Payment gateway simulation (for card payments)
app.get('/payment-gateway', (req, res) => {
  try {
    const { txn } = req.query;
    
    if (!txn) {
      return res.status(400).send('Missing transaction ID');
    }
    
    const transaction = transactionStore.get(txn);
    if (!transaction) {
      return res.status(404).send('Transaction not found');
    }
    
    logWithTimestamp('Payment gateway accessed:', { transactionId: txn });
    
    // Simple HTML payment gateway simulation
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PayDPI Payment Gateway</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
        .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #f9f9f9; }
        .amount { font-size: 24px; font-weight: bold; color: #2c5aa0; }
        .details { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
        button { padding: 10px 20px; margin: 10px; font-size: 16px; border: none; border-radius: 4px; cursor: pointer; }
        .success { background: #28a745; color: white; }
        .failure { background: #dc3545; color: white; }
        .scenario { background: #17a2b8; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>PayDPI Payment Gateway</h2>
        <div class="details">
            <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
            <p><strong>Order ID:</strong> ${transaction.orderId}</p>
            <p><strong>Amount:</strong> <span class="amount">₹${transaction.amount}</span></p>
            <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
            <p><strong>UIN:</strong> ${transaction.uin}</p>
            <p><span class="scenario">Test Scenario: ${transaction.scenario}</span></p>
        </div>
        
        <div style="text-align: center;">
            <button class="success" onclick="processPayment('success')">
                ✅ Simulate Success
            </button>
            <button class="failure" onclick="processPayment('failure')">
                ❌ Simulate Failure
            </button>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <h4>Test Scenarios:</h4>
            <ul style="text-align: left;">
                <li>Amount ≤ ₹500: Success</li>
                <li>Amount = ₹999: Insufficient funds</li>
                <li>Amount = ₹888: Card declined</li>
                <li>Amount = ₹777: Network error</li>
                <li>Amount > ₹1000: Limit exceeded</li>
                <li>UIN003: Card issues</li>
                <li>UIN004: Network issues</li>
            </ul>
        </div>
    </div>
    
    <script>
        function processPayment(action) {
            const status = action === 'success' ? 'completed' : 'failed';
            fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    transactionId: '${txn}', 
                    action: status 
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Payment ' + status + ' successfully!');
                    window.close();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                alert('Error processing payment: ' + error.message);
            });
        }
    </script>
</body>
</html>`;
    
    res.send(html);
    
  } catch (error) {
    logWithTimestamp('Payment gateway error:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Process payment from gateway
app.post('/api/payments/process', (req, res) => {
  try {
    const { transactionId, action } = req.body;
    
    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    // Update transaction status
    transaction.status = action;
    transaction.updatedAt = new Date();
    
    if (action === 'failed') {
      transaction.failureReason = getFailureReason(transaction.scenario);
    }
    
    logWithTimestamp('Payment processed:', {
      transactionId,
      status: action,
      scenario: transaction.scenario
    });
    
    // Send callback to payment service
    sendCallback(transaction);
    
    res.json({
      success: true,
      transactionId,
      status: action,
      message: `Payment ${action} successfully`
    });
    
  } catch (error) {
    logWithTimestamp('Payment processing error:', error.message);
    res.status(500).json({
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

// Verify payment status
app.get('/api/payments/verify/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    
    logWithTimestamp('Payment verification request:', { transactionId });
    
    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      transactionId: transaction.transactionId,
      paymentId: transaction.paymentId,
      status: transaction.status,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      uin: transaction.uin,
      orderId: transaction.orderId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      failureReason: transaction.failureReason || null
    });
    
  } catch (error) {
    logWithTimestamp('Payment verification error:', error.message);
    res.status(500).json({
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

// Process refund
app.post('/api/payments/refund', (req, res) => {
  try {
    const { transactionId, amount, reason, clientId } = req.body;
    
    logWithTimestamp('Refund request:', { transactionId, amount, reason });
    
    // Validate client
    if (!clients[clientId]) {
      return res.status(401).json({
        error: 'invalid_client',
        message: 'Invalid client ID'
      });
    }
    
    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    if (transaction.status !== 'completed') {
      return res.status(400).json({
        error: 'invalid_status',
        message: 'Can only refund completed transactions'
      });
    }
    
    if (amount > transaction.amount) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Refund amount cannot exceed transaction amount'
      });
    }
    
    const refundId = generateRefundId();
    
    // Create refund record
    const refund = {
      refundId,
      transactionId,
      originalAmount: transaction.amount,
      refundAmount: amount,
      reason,
      status: 'completed', // Simulate immediate refund success
      createdAt: new Date()
    };
    
    refundStore.set(refundId, refund);
    
    logWithTimestamp('Refund processed:', {
      refundId,
      transactionId,
      amount,
      status: 'completed'
    });
    
    res.json({
      success: true,
      refundId,
      transactionId,
      refundAmount: amount,
      status: 'completed',
      message: 'Refund processed successfully'
    });
    
  } catch (error) {
    logWithTimestamp('Refund processing error:', error.message);
    res.status(500).json({
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

// Get payment status (alternative endpoint)
app.get('/api/payments/status/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    res.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
    
  } catch (error) {
    logWithTimestamp('Status check error:', error.message);
    res.status(500).json({
      error: 'server_error',
      message: 'Internal server error'
    });
  }
});

// Debug endpoints
app.get('/debug/transactions', (req, res) => {
  const transactions = Array.from(transactionStore.values()).map(txn => ({
    transactionId: txn.transactionId,
    paymentId: txn.paymentId,
    amount: txn.amount,
    paymentMethod: txn.paymentMethod,
    uin: txn.uin,
    status: txn.status,
    scenario: txn.scenario,
    createdAt: txn.createdAt
  }));
  
  res.json({
    totalTransactions: transactions.length,
    transactions: transactions.slice(-20) // Last 20 transactions
  });
});

app.get('/debug/scenarios', (req, res) => {
  res.json({
    message: 'PayDPI Mock Payment Scenarios',
    scenarios: {
      'Happy Path': {
        'amount <= 500': 'success',
        'UIN001 or UIN002': 'success',
        'subsidy payment': 'always success'
      },
      'Failure Scenarios': {
        'amount = 999': 'insufficient_funds',
        'amount = 888': 'card_declined',
        'amount = 777': 'network_error',
        'amount > 1000': 'limit_exceeded',
        'UIN003': 'card_declined',
        'UIN004': 'network_error'
      }
    },
    testUsers: {
      'UIN001': 'John Doe - Happy path user',
      'UIN002': 'Jane Smith - Happy path user',
      'UIN003': 'Bob Wilson - Card issues',
      'UIN004': 'Alice Brown - Network issues'
    }
  });
});

app.get('/debug/status', (req, res) => {
  res.json({
    activeTransactions: transactionStore.size,
    activeRefunds: refundStore.size,
    clients: Object.keys(clients).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Helper function to get failure reason
const getFailureReason = (scenario) => {
  const reasons = {
    'insufficient_funds': 'Insufficient funds in account',
    'card_declined': 'Card was declined by issuer',
    'network_error': 'Network connectivity issue',
    'limit_exceeded': 'Transaction amount exceeds limit'
  };
  return reasons[scenario] || 'Payment failed';
};

// Helper function to send callback
const sendCallback = async (transaction) => {
  if (!transaction.callbackUrl) {
    logWithTimestamp('No callback URL provided for transaction:', transaction.transactionId);
    return;
  }
  
  try {
    const callbackData = {
      transactionId: transaction.transactionId,
      paymentId: transaction.paymentId,
      status: transaction.status === 'completed' ? 'success' : 'failure',
      amount: transaction.amount,
      timestamp: transaction.updatedAt
    };
    
    logWithTimestamp('Sending callback to:', transaction.callbackUrl, callbackData);
    
    await axios.post(transaction.callbackUrl, callbackData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-PayDPI-Signature': 'mock-signature' // In real implementation, this would be a proper signature
      }
    });
    
    logWithTimestamp('Callback sent successfully:', transaction.transactionId);
    
  } catch (error) {
    logWithTimestamp('Callback failed:', {
      transactionId: transaction.transactionId,
      error: error.message,
      callbackUrl: transaction.callbackUrl
    });
  }
};

// Error handling
app.use((err, req, res, next) => {
  logWithTimestamp('Unhandled error:', err.message);
  res.status(500).json({
    error: 'server_error',
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ===================================');
  console.log(`💳 PayDPI Mock Provider running on port ${PORT}`);
  console.log('🚀 ===================================');
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test scenarios: http://localhost:${PORT}/debug/scenarios`);
  console.log(`📈 Status: http://localhost:${PORT}/debug/status`);
  console.log(`💸 Transactions: http://localhost:${PORT}/debug/transactions`);
  console.log('🚀 ===================================');
  
  logWithTimestamp('PayDPI Mock Server started successfully');
  logWithTimestamp(`Registered clients: ${Object.keys(clients).length}`);
  
  // Display test scenarios
  console.log('\n💳 Payment Test Scenarios:');
  console.log('Happy Path:');
  console.log('  - Amount ≤ 500: Success');
  console.log('  - UIN001, UIN002: Success');
  console.log('  - Subsidy payments: Always success');
  console.log('\nFailure Scenarios:');
  console.log('  - Amount = 999: Insufficient funds');
  console.log('  - Amount = 888: Card declined');
  console.log('  - Amount = 777: Network error');
  console.log('  - Amount > 1000: Limit exceeded');
  console.log('  - UIN003: Card issues');
  console.log('  - UIN004: Network issues');
  console.log('\n🧪 Use these patterns for testing payment flows!\n');
});