module.exports = {
  baseUrl: process.env.SLUDI_BASE_URL || 'http://localhost:4001',
  clientId: process.env.CLIENT_ID || 'nutriconnect-client',
  clientSecret: process.env.CLIENT_SECRET || 'nutriconnect-secret-key',
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3001/auth/callback',
  
  endpoints: {
    // Note: No requestOtp endpoint - users get OTP directly from SLUDI via SMS
    verifyOtp: '/auth/verify-otp',
    token: '/auth/token',
    userInfo: '/auth/userinfo',
    validate: '/auth/validate'
  },
  
  tokenExpiry: 3600, // 1 hour
  otpExpiry: 300, // 5 minutes
  maxOtpAttempts: 3
};