const axios = require('axios');
const sludiConfig = require('../config/sludi');

// Verify OTP with SLUDI (user enters OTP they received via SMS from SLUDI)
const verifyOTP = async (uin, otp, state) => {
  try {
    const response = await axios.post(`${sludiConfig.baseUrl}${sludiConfig.endpoints.verifyOtp}`, {
      uin,
      otp,
      client_id: sludiConfig.clientId,
      state,
      redirect_uri: sludiConfig.redirectUri
    });

    return {
      success: true,
      code: response.data.code,
      data: response.data
    };
  } catch (error) {
    console.error('SLUDI OTP verification error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'OTP verification failed',
      message: error.response?.data?.message || error.message
    };
  }
};

// Exchange authorization code for access token
const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(`${sludiConfig.baseUrl}${sludiConfig.endpoints.token}`, {
      grant_type: 'authorization_code',
      code,
      client_id: sludiConfig.clientId,
      client_secret: sludiConfig.clientSecret,
      redirect_uri: sludiConfig.redirectUri
    });

    return {
      success: true,
      tokens: response.data
    };
  } catch (error) {
    console.error('SLUDI token exchange error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Token exchange failed',
      message: error.response?.data?.error_description || error.message
    };
  }
};

// Get user info from SLUDI
const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(`${sludiConfig.baseUrl}${sludiConfig.endpoints.userInfo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return {
      success: true,
      userInfo: response.data
    };
  } catch (error) {
    console.error('SLUDI user info error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get user info',
      message: error.response?.data?.error_description || error.message
    };
  }
};

// Validate access token
const validateToken = async (accessToken) => {
  try {
    const response = await axios.get(`${sludiConfig.baseUrl}${sludiConfig.endpoints.validate}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('SLUDI token validation error:', error.message);
    return {
      valid: false,
      error: error.response?.data?.error || 'Token validation failed'
    };
  }
};

module.exports = {
  verifyOTP,
  exchangeCodeForToken,
  getUserInfo,
  validateToken
};