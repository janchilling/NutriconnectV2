const validatePaymentRequest = (req, res, next) => {
  const { amount, orderId, paymentMethod } = req.body;
  
  if (!amount || !orderId || !paymentMethod) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Amount, orderId, and paymentMethod are required'
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Amount must be a positive number'
    });
  }

  if (typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid orderId'
    });
  }

  const validMethods = ['wallet', 'card', 'subsidy', 'cash'];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: `Payment method must be one of: ${validMethods.join(', ')}`
    });
  }

  next();
};

const validateWalletTopup = (req, res, next) => {
  const { amount, method } = req.body;
  
  if (!amount || !method) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Amount and method are required'
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Amount must be a positive number'
    });
  }

  const validMethods = ['card', 'bank_transfer', 'subsidy'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: `Top-up method must be one of: ${validMethods.join(', ')}`
    });
  }

  next();
};

module.exports = {
  validatePaymentRequest,
  validateWalletTopup
};