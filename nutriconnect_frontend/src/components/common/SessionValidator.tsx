import React, { useEffect, useState } from 'react';
import { sessionService, authService } from '../../services/api';

interface SessionValidatorProps {
  children: React.ReactNode;
}

const SessionValidator: React.FC<SessionValidatorProps> = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const sessionId = localStorage.getItem('sessionId');
      const accessToken = localStorage.getItem('accessToken');

      if (!sessionId && !accessToken) {
        setIsValidating(false);
        return;
      }

      try {
        if (sessionId) {
          const validationResult = await sessionService.validateSession(sessionId);
          
          if (!validationResult.success || !validationResult.valid) {
            // Session is invalid, clear storage
            await authService.logout();
          } else {
            // Session is valid, update user profile if available
            if (validationResult.session?.userProfile) {
              localStorage.setItem('userProfile', JSON.stringify(validationResult.session.userProfile));
            }
          }
        }
      } catch (error) {
        console.warn('Session validation failed:', error);
        // Don't logout on network errors, just continue
      }

      setIsValidating(false);
    };

    validateSession();
  }, []);

  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#FFFDF6'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#A0C878'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '2px solid #DDEB9D',
            borderTop: '2px solid #A0C878',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Validating your session...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionValidator;