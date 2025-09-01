import React from 'react';

interface ErrorProps {
  errorCode: string;
  errorMsg?: string;
  showToast?: boolean;
}

export const Error: React.FC<ErrorProps> = ({ errorCode, errorMsg, showToast }) => {
  if (!showToast) return null;

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'sign_in_failed':
        return 'Sign in failed. Please try again.';
      case 'access_denied':
        return 'Access denied. Authorization was cancelled.';
      case 'invalid_request':
        return 'Invalid request. Please try again.';
      case 'unauthorized_client':
        return 'Unauthorized client. Please contact support.';
      case 'unsupported_response_type':
        return 'Unsupported response type.';
      case 'invalid_scope':
        return 'Invalid scope requested.';
      case 'server_error':
        return 'Server error occurred. Please try again later.';
      case 'temporarily_unavailable':
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return errorMsg || 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="form-error" style={{ 
      backgroundColor: '#fee', 
      border: '1px solid #fcc', 
      borderRadius: '4px', 
      padding: '12px', 
      margin: '10px 0',
      color: '#c33'
    }}>
      <span style={{ marginRight: '8px' }}>⚠️</span>
      {getErrorMessage(errorCode)}
    </div>
  );
};
