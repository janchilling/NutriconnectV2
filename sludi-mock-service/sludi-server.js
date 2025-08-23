const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 4001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory stores
const codeStore = new Map();
const tokenStore = new Map();

// Valid OAuth clients
const clients = {
  'nutriconnect-client': {
    clientId: 'nutriconnect-client',
    clientSecret: 'nutriconnect-secret-key',
    redirectUris: ['http://localhost:3001/auth/callback'],
    name: 'NutriConnect App'
  }
};

// Mock user database with different scenarios
const users = {
  // Happy Path Users
  'UIN001': {
    uin: 'UIN001',
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    guardianOf: ['UIN101', 'UIN102'],
    isActive: true,
    validOTP: '123456' // Mock OTP that was "sent" to their phone
  },
  'UIN002': {
    uin: 'UIN002',
    name: 'Jane Smith',
    phone: '+0987654321',
    email: 'jane.smith@example.com',
    guardianOf: [],
    isActive: true,
    validOTP: '654321'
  },
  
  // Sad Path Users
  'UIN003': {
    uin: 'UIN003',
    name: 'Bob Wilson (Inactive)',
    phone: '+1122334455',
    email: 'bob.wilson@example.com',
    guardianOf: ['UIN103'],
    isActive: false, // Inactive user
    validOTP: '111111'
  },
  'UIN004': {
    uin: 'UIN004',
    name: 'Alice Brown (No Phone)',
    phone: null, // No phone number
    email: 'alice.brown@example.com',
    guardianOf: [],
    isActive: true,
    validOTP: null
  },
  
  // Edge Case Users
  'UIN005': {
    uin: 'UIN005',
    name: 'Charlie Green (Valid)',
    phone: '+5566778899',
    email: 'charlie.green@example.com',
    guardianOf: ['UIN105'],
    isActive: true,
    validOTP: '999999'
  }
};

// Helper functions
const generateCode = () => crypto.randomBytes(32).toString('hex');
const generateToken = () => crypto.randomBytes(32).toString('hex');

const logWithTimestamp = (message, data = '') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SLUDI] ${message}`, data);
};

// Cleanup expired entries every 5 minutes
const cleanup = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [code, data] of codeStore.entries()) {
    if (data.expires < now) {
      codeStore.delete(code);
      cleaned++;
    }
  }
  
  for (const [token, data] of tokenStore.entries()) {
    if (data.expires < now) {
      tokenStore.delete(token);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logWithTimestamp(`Cleaned up ${cleaned} expired entries`);
  }
};

setInterval(cleanup, 5 * 60 * 1000);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sludi-oauth-provider', 
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      activeCodes: codeStore.size,
      activeTokens: tokenStore.size,
      registeredUsers: Object.keys(users).length
    }
  });
});

// Verify OTP and return authorization code
app.post('/auth/verify-otp', (req, res) => {
  try {
    const { uin, otp, client_id, state, redirect_uri } = req.body;
    
    logWithTimestamp(`OTP verification - UIN: ${uin}, OTP: ${otp}`);
    
    // Validate required parameters
    if (!uin || !otp || !client_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'invalid_request',
        error_description: 'uin, otp, and client_id are required' 
      });
    }
    
    // Validate client
    if (!clients[client_id]) {
      logWithTimestamp(`Invalid client: ${client_id}`);
      return res.status(401).json({ 
        success: false, 
        error: 'invalid_client',
        error_description: 'Unknown client_id' 
      });
    }
    
    // Check if user exists
    const user = users[uin];
    if (!user) {
      logWithTimestamp(`User not found: ${uin}`);
      return res.status(404).json({ 
        success: false, 
        error: 'user_not_found',
        error_description: 'User with provided UIN does not exist' 
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      logWithTimestamp(`Inactive user: ${uin}`);
      return res.status(403).json({ 
        success: false, 
        error: 'user_inactive',
        error_description: 'User account is not active' 
      });
    }
    
    // Check if user has phone number (required for OTP)
    if (!user.phone) {
      logWithTimestamp(`No phone number for user: ${uin}`);
      return res.status(400).json({ 
        success: false, 
        error: 'no_phone_number',
        error_description: 'User does not have a registered phone number' 
      });
    }
    
    // Verify OTP
    if (user.validOTP !== otp) {
      logWithTimestamp(`Invalid OTP for UIN: ${uin}`);
      return res.status(400).json({ 
        success: false, 
        error: 'invalid_otp',
        error_description: 'Invalid OTP provided'
      });
    }
    
    // Generate authorization code
    const code = generateCode();
    const codeExpires = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    codeStore.set(code, {
      uin,
      clientId: client_id,
      expires: codeExpires,
      used: false,
      redirectUri: redirect_uri || '',
      state: state || ''
    });
    
    logWithTimestamp(`OTP verified successfully for ${uin}, code generated: ${code.substring(0, 8)}...`);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      code,
      state: state || ''
    });
    
  } catch (error) {
    logWithTimestamp('OTP verification error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
});

// Exchange authorization code for access token
app.post('/auth/token', (req, res) => {
  try {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
    
    logWithTimestamp(`Token exchange - Grant: ${grant_type}, Code: ${code?.substring(0, 8)}...`);
    
    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ 
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported' 
      });
    }
    
    if (!code || !client_id || !client_secret) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Missing required parameters' 
      });
    }
    
    const client = clients[client_id];
    if (!client || client.clientSecret !== client_secret) {
      logWithTimestamp(`Invalid client credentials: ${client_id}`);
      return res.status(401).json({ 
        error: 'invalid_client',
        error_description: 'Invalid client credentials' 
      });
    }
    
    const codeData = codeStore.get(code);
    if (!codeData) {
      logWithTimestamp(`Invalid authorization code: ${code?.substring(0, 8)}...`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code' 
      });
    }
    
    if (codeData.expires < Date.now()) {
      codeStore.delete(code);
      logWithTimestamp(`Expired authorization code: ${code?.substring(0, 8)}...`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code expired' 
      });
    }
    
    if (codeData.used) {
      codeStore.delete(code);
      logWithTimestamp(`Authorization code already used: ${code?.substring(0, 8)}...`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code already used' 
      });
    }
    
    if (codeData.clientId !== client_id) {
      logWithTimestamp(`Client ID mismatch for code: ${code?.substring(0, 8)}...`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code issued to different client' 
      });
    }
    
    codeData.used = true;
    codeStore.set(code, codeData);
    
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const expiresIn = 3600;
    const tokenExpires = Date.now() + (expiresIn * 1000);
    
    tokenStore.set(accessToken, {
      uin: codeData.uin,
      clientId: client_id,
      expires: tokenExpires,
      scope: 'openid profile',
      type: 'access_token'
    });
    
    tokenStore.set(refreshToken, {
      uin: codeData.uin,
      clientId: client_id,
      expires: Date.now() + (30 * 24 * 60 * 60 * 1000),
      scope: 'openid profile',
      type: 'refresh_token'
    });
    
    codeStore.delete(code);
    
    logWithTimestamp(`Access token generated for UIN: ${codeData.uin}`);
    
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: 'openid profile'
    });
    
  } catch (error) {
    logWithTimestamp('Token exchange error:', error.message);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
});

// UserInfo endpoint
app.get('/auth/userinfo', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Bearer token required' 
      });
    }
    
    const token = authHeader.substring(7);
    const tokenData = tokenStore.get(token);
    
    if (!tokenData || tokenData.expires < Date.now() || tokenData.type !== 'access_token') {
      if (tokenData && tokenData.expires < Date.now()) {
        tokenStore.delete(token);
      }
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Token expired or invalid' 
      });
    }
    
    const user = users[tokenData.uin];
    if (!user) {
      logWithTimestamp(`User not found for token: ${tokenData.uin}`);
      return res.status(404).json({ 
        error: 'user_not_found',
        error_description: 'User not found' 
      });
    }
    
    logWithTimestamp(`UserInfo request for UIN: ${user.uin}`);
    
    res.json({
      sub: user.uin,
      uin: user.uin,
      name: user.name,
      phone: user.phone,
      email: user.email,
      guardianOf: user.guardianOf,
      email_verified: true,
      phone_number_verified: user.phone ? true : false
    });
    
  } catch (error) {
    logWithTimestamp('UserInfo error:', error.message);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
});

// Token validation endpoint
app.get('/auth/validate', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ 
        valid: false, 
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.substring(7);
    const tokenData = tokenStore.get(token);
    
    if (!tokenData || tokenData.expires < Date.now() || tokenData.type !== 'access_token') {
      if (tokenData && tokenData.expires < Date.now()) {
        tokenStore.delete(token);
      }
      return res.json({ 
        valid: false, 
        error: 'Token expired or invalid' 
      });
    }
    
    res.json({
      valid: true,
      uin: tokenData.uin,
      clientId: tokenData.clientId,
      scope: tokenData.scope,
      expiresAt: new Date(tokenData.expires).toISOString()
    });
    
  } catch (error) {
    logWithTimestamp('Token validation error:', error.message);
    res.json({ 
      valid: false, 
      error: 'Validation failed' 
    });
  }
});

// Debug endpoints
app.get('/debug/users', (req, res) => {
  res.json({
    message: 'Available test users with mock OTPs',
    users: Object.keys(users).map(uin => ({
      uin,
      name: users[uin].name,
      email: users[uin].email,
      phone: users[uin].phone,
      isActive: users[uin].isActive,
      guardianOf: users[uin].guardianOf,
      mockOTP: users[uin].validOTP,
      scenario: getScenarioType(uin)
    }))
  });
});

app.get('/debug/status', (req, res) => {
  res.json({
    activeCodes: codeStore.size,
    activeTokens: tokenStore.size,
    clients: Object.keys(clients).length,
    users: Object.keys(users).length
  });
});

// Helper function to get scenario type
const getScenarioType = (uin) => {
  const user = users[uin];
  if (!user.isActive) return 'Inactive User (Sad Path)';
  if (!user.phone) return 'No Phone Number (Sad Path)';
  if (['UIN001', 'UIN002', 'UIN005'].includes(uin)) return 'Happy Path';
  return 'Edge Case';
};

// Error handling
app.use((err, req, res, next) => {
  logWithTimestamp('Unhandled error:', err.message);
  res.status(500).json({ 
    error: 'server_error',
    error_description: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ===================================');
  console.log(`🔐 SLUDI OAuth Provider running on port ${PORT}`);
  console.log('🚀 ===================================');
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Test users: http://localhost:${PORT}/debug/users`);
  console.log(`📈 Status: http://localhost:${PORT}/debug/status`);
  console.log('🚀 ===================================');
  
  logWithTimestamp('Server started successfully');
  logWithTimestamp(`Registered clients: ${Object.keys(clients).length}`);
  logWithTimestamp(`Available users: ${Object.keys(users).length}`);
  
  // Display test scenarios
  console.log('\n📋 Test Scenarios Available:');
  console.log('Happy Path Users:');
  console.log('  - UIN001 (John Doe) - OTP: 123456');
  console.log('  - UIN002 (Jane Smith) - OTP: 654321');
  console.log('  - UIN005 (Charlie Green) - OTP: 999999');
  console.log('\nSad Path Users:');
  console.log('  - UIN003 (Inactive user) - OTP: 111111');
  console.log('  - UIN004 (No phone number) - No OTP');
  console.log('\n🧪 Use these UINs and OTPs for testing!\n');
});