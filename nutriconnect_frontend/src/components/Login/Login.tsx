import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService, sessionService, UserProfile } from '../../services/api';
import { useExternalScript } from '../../hooks/useExternalScript';
import { Error } from '../common/Error';
import clientDetails from '../../constants/clientDetails';
import './Login.css';

interface LoginState {
  step: 'uin' | 'otp' | 'loading';
  uin: string;
  otp: string;
  sessionId: string;
  error: string;
  success: string;
}

interface EsignetError {
  errorCode: string;
  errorMsg?: string;
  showToast?: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [esignetError, setEsignetError] = useState<EsignetError | null>(null);
  
  const signInButtonScript = window._env_?.SIGN_IN_BUTTON_PLUGIN_URL;
  const scriptState = useExternalScript(signInButtonScript || null);
  
  const [state, setState] = useState<LoginState>({
    step: 'uin',
    uin: '',
    otp: '',
    sessionId: '',
    error: '',
    success: '',
  });

  const renderSignInButton = useCallback(() => {
    if (scriptState !== "ready") return;

    const oidcConfig = {
      authorizeUri: clientDetails.uibaseUrl + clientDetails.authorizeEndpoint,
      redirect_uri: clientDetails.redirect_uri_userprofile,
      client_id: clientDetails.clientId,
      scope: clientDetails.scopeUserProfile,
      nonce: clientDetails.nonce,
      state: clientDetails.state,
      acr_values: clientDetails.acr_values,
      claims_locales: clientDetails.claims_locales,
      display: clientDetails.display,
      prompt: clientDetails.prompt,
      max_age: clientDetails.max_age,
      ui_locales: i18n.language,
      claims: JSON.parse(decodeURIComponent(clientDetails.userProfileClaims)),
    };

    window.SignInWithEsignetButton?.init({
      oidcConfig: oidcConfig,
      buttonConfig: {
        customStyle: {
          labelSpanStyle: {
            display: 'inline-block',
            'font-size': '0.875rem',
            'font-weight': '600',
            'line-height': '1.25rem',
            'vertical-align': 'middle'
          },
          logoDivStyle: {
            alignItems: 'center',
            background: 'white',
            border: '1px solid #A0C878',
            'border-radius': '18px',
            display: 'inline-block',
            height: '30px',
            position: 'absolute',
            right: '8px',
            verticalAlign: 'middle',
            width: '30px'
          },
          logoImgStyle: {
            height: '29px',
            'object-fit': 'contain',
            width: '29px'
          },
          outerDivStyleStandard: {
            'align-items': 'center',
            background: '#A0C878',
            border: '1px solid #A0C878',
            'border-radius': '0.375rem',
            color: 'white',
            display: 'flex',
            padding: '0.625rem 1.25rem',
            position: 'relative',
            'text-decoration': 'none',
            width: '100%',
            'justify-content': 'center',
            'margin-top': '1rem'
          }
        },
        labelText: t('login.sign_in_with_sludi') || 'Sign in with SLUDI',
      },
      signInElement: document.getElementById("sign-in-with-esignet"),
    });
  }, [scriptState, i18n.language, t]);

  // Handle ESIGNET button and URL parameters
  useEffect(() => {
    const checkSearchParams = async () => {
      let errorCode = searchParams.get("error");
      let error_desc = searchParams.get("error_description");

      if (errorCode) {
        setEsignetError({ 
          errorCode: errorCode, 
          errorMsg: error_desc || undefined, 
          showToast: true 
        });
      }
    };
    checkSearchParams();

    renderSignInButton();

    i18n.on("languageChanged", function (lng: string) {
      renderSignInButton();
    });
  }, [scriptState, i18n, searchParams, renderSignInButton]);

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

  // Test login function for UIN001
  const handleTestLogin = async () => {
    try {
      setState(prev => ({ ...prev, step: 'loading' }));
      
      // Create a test user UIN001 directly
      const testUser: UserProfile = {
        uin: 'UIN001',
        name: 'Test User',
        phone: '+94771234567',
        email: 'testuser@nutriconnect.com',
        guardianOf: []
      };

      // Store user data and create session
      localStorage.setItem('userProfile', JSON.stringify(testUser));
      const mockToken = `test_login_${Date.now()}`;
      localStorage.setItem('accessToken', mockToken);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Test login error:', error);
      setState(prev => ({ 
        ...prev, 
        step: 'uin',
        error: 'Test login failed. Please try again.'
      }));
    }
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
        
        {/* Test Login Button for Development */}
        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleTestLogin}
            disabled={state.step === "loading"}
            style={{ marginTop: '10px' }}
          >
            Test Login (UIN001)
          </button>
        )}
      </div>

      <div className="login-help">
        <p>
          Don't have an account? <a href="/register">Register here</a>
        </p>
        <p className="text-muted">
          Enter your UIN to receive an OTP on your registered phone number
        </p>
      </div>

      {/* OR separator */}
      <div className="login-separator">
        <div className="separator-line"></div>
        <span className="separator-text">{t('login.or') || 'OR'}</span>
        <div className="separator-line"></div>
      </div>

      {/* ESIGNET Error Display */}
      {esignetError && (
        <Error 
          errorCode={esignetError.errorCode} 
          errorMsg={esignetError.errorMsg} 
          showToast={esignetError.showToast} 
        />
      )}

      {/* ESIGNET Button */}
      {scriptState === "ready" && (
        <div id="sign-in-with-esignet" className="esignet-button-container"></div>
      )}
      
      {scriptState === "loading" && (
        <div className="esignet-loading">
          <span>Loading SLUDI authentication...</span>
        </div>
      )}
      
      {scriptState === "error" && (
        <div className="esignet-error">
          <span>⚠️ SLUDI authentication unavailable</span>
        </div>
      )}
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