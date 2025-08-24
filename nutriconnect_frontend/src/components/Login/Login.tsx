import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, sessionService } from '../../services/api';
import './Login.css';

interface LoginState {
  step: 'uin' | 'otp' | 'loading';
  uin: string;
  otp: string;
  sessionId: string;
  error: string;
  success: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<LoginState>({
    step: 'uin',
    uin: '',
    otp: '',
    sessionId: '',
    error: '',
    success: '',
  });

  const handleUinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.uin.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter your UIN' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'loading', error: '' }));

    try {
      const response = await authService.initiateLogin(state.uin.trim());
      
      if (response.success && response.sessionId) {
        setState(prev => ({
          ...prev,
          step: 'otp',
          sessionId: response.sessionId || '',
          success: response.message || 'OTP sent to your registered phone number',
          error: '',
        }));
      } else {
        setState(prev => ({
          ...prev,
          step: 'uin',
          error: response.message || 'Failed to send OTP',
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        step: 'uin',
        error: error.response?.data?.message || 'Network error. Please try again.',
      }));
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.otp.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter the OTP' }));
      return;
    }

    if (state.otp.length !== 6) {
      setState(prev => ({ ...prev, error: 'OTP must be 6 digits' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'loading', error: '' }));

    try {
      // Step 1: Verify OTP
      const otpResponse = await authService.verifyOTP(state.sessionId, state.otp);
      
      if (!otpResponse.success || !otpResponse.code) {
        setState(prev => ({
          ...prev,
          step: 'otp',
          error: otpResponse.message || 'Invalid OTP',
        }));
        return;
      }

      // Step 2: Exchange code for token
      const tokenResponse = await authService.exchangeToken(state.sessionId, otpResponse.code);
      
      console.log('Token response:', tokenResponse); // Debug log
      
      if (tokenResponse.success && tokenResponse.tokens && tokenResponse.user) {
        // Step 3: Create user session in nutriconnect service
        const sessionData = {
          uin: tokenResponse.user.uin,
          accessToken: tokenResponse.tokens.access_token,
          refreshToken: tokenResponse.tokens.refresh_token,
          name: tokenResponse.user.name,
          phone: tokenResponse.user.phone,
          email: tokenResponse.user.email,
          guardianOf: tokenResponse.user.guardianOf
        };

        console.log('Creating session with data:', sessionData); // Debug log

        const sessionResponse = await sessionService.createSession(sessionData);
        
        console.log('Session response:', sessionResponse); // Debug log
        
        if (sessionResponse.success && sessionResponse.sessionId) {
          // Store tokens, user profile, and session ID
          localStorage.setItem('accessToken', tokenResponse.tokens.access_token);
          if (tokenResponse.tokens.refresh_token) {
            localStorage.setItem('refreshToken', tokenResponse.tokens.refresh_token);
          }
          localStorage.setItem('userProfile', JSON.stringify(tokenResponse.user));
          localStorage.setItem('sessionId', sessionResponse.sessionId);

          setState(prev => ({
            ...prev,
            success: 'Login successful! Creating your session...',
            error: '',
          }));

          console.log('Redirecting to dashboard in 1.5s...'); // Debug log
          console.log('Current pathname before redirect:', window.location.pathname); // Debug log
          
          // Redirect to dashboard after session creation
          setTimeout(() => {
            console.log('Executing navigation to dashboard'); // Debug log
            console.log('About to navigate to /dashboard'); // Debug log
            navigate('/dashboard', { replace: true });
            console.log('Navigate called, new pathname should be:', window.location.pathname); // Debug log
          }, 1500);
        } else {
          // Session creation failed, but authentication was successful
          // Store tokens anyway and show a warning
          localStorage.setItem('accessToken', tokenResponse.tokens.access_token);
          if (tokenResponse.tokens.refresh_token) {
            localStorage.setItem('refreshToken', tokenResponse.tokens.refresh_token);
          }
          localStorage.setItem('userProfile', JSON.stringify(tokenResponse.user));

          console.warn('Session creation failed:', sessionResponse.error);
          setState(prev => ({
            ...prev,
            success: 'Login successful! Redirecting...',
            error: '',
          }));

          console.log('Redirecting to dashboard in 1s (fallback)...'); // Debug log
          
          // Still redirect to dashboard
          setTimeout(() => {
            console.log('Executing fallback navigation to dashboard'); // Debug log
            navigate('/dashboard', { replace: true });
          }, 1000);
        }
      } else {
        console.error('Token exchange failed:', tokenResponse); // Debug log
        setState(prev => ({
          ...prev,
          step: 'otp',
          error: tokenResponse.message || 'Failed to complete authentication',
        }));
      }
    } catch (error: any) {
      console.error('Authentication error:', error); // Debug log
      setState(prev => ({
        ...prev,
        step: 'otp',
        error: error.response?.data?.message || 'Authentication failed. Please try again.',
      }));
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setState(prev => ({ ...prev, otp: value, error: '' }));
  };

  const handleBackToUin = () => {
    setState(prev => ({
      ...prev,
      step: 'uin',
      otp: '',
      sessionId: '',
      error: '',
      success: '',
    }));
  };

  const renderUinForm = () => (
    <form onSubmit={handleUinSubmit} className="login-form fade-in">
      <div className="form-group">
        <label htmlFor="uin" className="form-label">
          UIN (User Identification Number)
        </label>
        <input
          type="text"
          id="uin"
          className="form-input"
          placeholder="Enter your UIN (e.g., UIN001)"
          value={state.uin}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              uin: e.target.value.toUpperCase(),
              error: "",
            }))
          }
          disabled={state.step === "loading"}
          autoComplete="username"
          required
        />
      </div>

      {state.error && (
        <div className="form-error">
          <span>⚠️</span>
          {state.error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={state.step === "loading" || !state.uin.trim()}
        >
          {state.step === "loading" ? (
            <>
              <span className="loading"></span>
              Sending OTP...
            </>
          ) : (
            "Send OTP"
          )}
        </button>
      </div>

      <div className="login-help">
        <p>
          Don't have an account? <a href="/register">Register here</a>
        </p>
        <p className="text-muted">
          Enter your UIN to receive an OTP on your registered phone number
        </p>
      </div>
    </form>
  );

  const renderOtpForm = () => (
    <div className="fade-in">
      {state.success && (
        <div className="form-success">
          <span>✅</span>
          {state.success}
        </div>
      )}

      <form onSubmit={handleOtpSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="otp" className="form-label">
            Enter OTP
          </label>
          <input
            type="text"
            id="otp"
            className="form-input otp-input"
            placeholder="000000"
            value={state.otp}
            onChange={handleOtpChange}
            disabled={state.step === 'loading'}
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
          />
          <small className="form-help">
            OTP sent to your registered phone number
          </small>
        </div>

        {state.error && (
          <div className="form-error">
            <span>⚠️</span>
            {state.error}
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={state.step === 'loading' || state.otp.length !== 6}
          >
            {state.step === 'loading' ? (
              <>
                <span className="loading"></span>
                Verifying...
              </>
            ) : (
              'Verify & Login'
            )}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={handleBackToUin}
            disabled={state.step === 'loading'}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card card">
          <div className="login-header">
            <div className="logo">
              <h1>NutriConnect</h1>
              <p>Smart School Meals & Subsidy System</p>
            </div>
          </div>

          <div className="login-content">
            <div className="login-step-indicator">
              <div className={`step ${state.step === 'uin' || state.step === 'loading' ? 'active' : 'completed'}`}>
                <span className="step-number">1</span>
                <span className="step-label">Enter UIN</span>
              </div>
              <div className="step-divider"></div>
              <div className={`step ${state.step === 'otp' || (state.step === 'loading' && state.sessionId) ? 'active' : (state.step === 'loading') ? 'inactive' : 'inactive'}`}>
                <span className="step-number">2</span>
                <span className="step-label">Verify OTP</span>
              </div>
            </div>

            <div className="login-main">
              <h2>
                {state.step === 'uin' ? 'Welcome Back' : 'Verify Your Identity'}
              </h2>
              <p className="login-subtitle">
                {state.step === 'uin' 
                  ? 'Sign in to access your meal services and manage your account' 
                  : `We've sent a verification code to your registered phone number`
                }
              </p>

              {state.step === 'loading' ? (
                <div className="loading-container">
                  <div className="loading large"></div>
                  <p>Processing your request...</p>
                </div>
              ) : state.step === 'uin' ? (
                renderUinForm()
              ) : (
                renderOtpForm()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;