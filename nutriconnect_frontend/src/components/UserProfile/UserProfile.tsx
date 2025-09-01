import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '../../services/api';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleEsignetCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          
          // Redirect back to login with error parameters
          setTimeout(() => {
            navigate(`/login?error=${error}&error_description=${encodeURIComponent(errorDescription || 'Authentication failed')}`);
          }, 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          
          setTimeout(() => {
            navigate('/login?error=invalid_request&error_description=Missing authorization parameters');
          }, 3000);
          return;
        }

        setMessage('Exchanging authorization code...');

        // Here you would typically exchange the authorization code for tokens
        // This depends on your backend implementation for ESIGNET token exchange
        
        // For now, let's create a placeholder session
        // You'll need to implement the actual token exchange with your backend
        const mockUserData = {
          uin: 'ESIGNET_USER_' + Date.now(),
          accessToken: 'esignet_access_token_' + code,
          refreshToken: 'esignet_refresh_token_' + code,
          name: 'ESIGNET User',
          phone: '1234567890',
          email: 'user@esignet.gov',
          guardianOf: []
        };

        const sessionResponse = await sessionService.createSession(mockUserData);

        if (sessionResponse.success && sessionResponse.sessionId) {
          // Store tokens and user data
          localStorage.setItem('accessToken', mockUserData.accessToken);
          localStorage.setItem('refreshToken', mockUserData.refreshToken);
          localStorage.setItem('userProfile', JSON.stringify({
            uin: mockUserData.uin,
            name: mockUserData.name,
            phone: mockUserData.phone,
            email: mockUserData.email,
            guardianOf: mockUserData.guardianOf
          }));
          localStorage.setItem('sessionId', sessionResponse.sessionId);

          setStatus('success');
          setMessage('Authentication successful! Redirecting to dashboard...');

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          throw new Error('Failed to create session');
        }

      } catch (error: any) {
        console.error('ESIGNET callback error:', error);
        setStatus('error');
        setMessage('Failed to complete authentication. Please try again.');
        
        setTimeout(() => {
          navigate('/login?error=server_error&error_description=Failed to complete authentication');
        }, 3000);
      }
    };

    handleEsignetCallback();
  }, [searchParams, navigate]);

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
            <div className="login-main">
              <div className="loading-container">
                {status === 'loading' && (
                  <>
                    <div className="loading large"></div>
                    <h2>Processing Authentication</h2>
                    <p>{message}</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <div style={{ fontSize: '3rem', color: '#A0C878', marginBottom: '1rem' }}>✅</div>
                    <h2>Authentication Successful</h2>
                    <p>{message}</p>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <div style={{ fontSize: '3rem', color: '#dc2626', marginBottom: '1rem' }}>❌</div>
                    <h2>Authentication Failed</h2>
                    <p>{message}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
                      You will be redirected to the login page shortly...
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
