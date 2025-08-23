const validateUIN = (req, res, next) => {
  const { uin } = req.body;
  
  if (!uin) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'UIN is required'
    });
  }

  if (typeof uin !== 'string' || uin.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'UIN must be a non-empty string'
    });
  }

  // Basic UIN format validation (adjust based on your UIN format)
  const uinPattern = /^UIN\d{3,}$/;
  if (!uinPattern.test(uin.trim())) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid UIN format. Expected format: UINxxx'
    });
  }

  req.body.uin = uin.trim();
  next();
};

const validateOTP = (req, res, next) => {
  const { otp, sessionId } = req.body;
  
  if (!otp || !sessionId) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'OTP and sessionId are required'
    });
  }

  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'OTP must be a 6-digit number'
    });
  }

  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid sessionId'
    });
  }

  next();
};

const validateTokenExchange = (req, res, next) => {
  const { sessionId, code } = req.body;
  
  if (!sessionId || !code) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'SessionId and authorization code are required'
    });
  }

  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid sessionId'
    });
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid authorization code'
    });
  }

  next();
};

module.exports = {
  validateUIN,
  validateOTP,
  validateTokenExchange
};