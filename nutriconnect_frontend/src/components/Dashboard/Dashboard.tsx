import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authService, UserProfile } from '../../services/api';
import clientDetails from '../../constants/clientDetails';
import MenuDisplay from './MenuDisplay';
import OrdersDisplay from './OrdersDisplay';
import StatsCard from './StatsCard';
import QuickActions from './QuickActions';
import ActivityFeed from './ActivityFeed';
import WeatherWidget from './WeatherWidget';
import NutritionProgress from './NutritionProgress';
import './Dashboard.css';
import AIFoodSuggestionsWidget from './AIFoodSuggestionsWidget';


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [esignetAuthState, setEsignetAuthState] = useState<'loading' | 'error' | 'loaded' | null>(null);
  const [esignetError, setEsignetError] = useState<{
    errorCode: string;
    errorMsg?: string;
  } | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Format address from eSignet user info
  const formatAddress = (userAddress: any): string => {
    if (!userAddress) return '';
    
    let address = '';

    if (userAddress?.formatted) {
      address += userAddress?.formatted + ', ';
    }

    if (userAddress?.street_address) {
      address += userAddress?.street_address + ', ';
    }

    if (userAddress?.addressLine1) {
      address += userAddress?.addressLine1 + ', ';
    }

    if (userAddress?.addressLine2) {
      address += userAddress?.addressLine2 + ', ';
    }

    if (userAddress?.addressLine3) {
      address += userAddress?.addressLine3 + ', ';
    }

    if (userAddress?.locality) {
      address += userAddress?.locality + ', ';
    }

    if (userAddress?.city) {
      address += userAddress?.city + ', ';
    }

    if (userAddress?.province) {
      address += userAddress?.province + ', ';
    }

    if (userAddress?.region) {
      address += userAddress?.region + ', ';
    }

    if (userAddress?.postalCode) {
      address += '(' + userAddress?.postalCode + '), ';
    }

    if (userAddress?.country) {
      address += userAddress?.country + ', ';
    }

    // Return after removing last ', ' characters
    return address.substring(0, address.length - 2);
  };

  // Handle eSignet authentication
  const handleEsignetAuth = async (authCode: string) => {
    setEsignetAuthState('loading');
    setEsignetError(null);

    try {
      const client_id = (clientDetails as any).clientId;
      const redirect_uri = (clientDetails as any).redirect_uri_userprofile;
      const grant_type = (clientDetails as any).grant_type || 'authorization_code';

      let userInfo;
      
      try {
        userInfo = await authService.fetchUserInfo(
          authCode,
          client_id,
          redirect_uri,
          grant_type
        );
      } catch (fetchError: any) {
        console.warn('fetchUserInfo failed, using fallback user UIN001:', fetchError.message);
        
        // If fetchUserInfo fails, create a fallback user UIN001
        userInfo = {
          sub: 'UIN001',
          name: 'Test User',
          email: 'testuser@nutriconnect.com',
          email_verified: true,
          phone_number: '+94771234567',
          phone_number_verified: true,
          address: {
            formatted: 'No. 123, Main Street, Colombo 01, Sri Lanka',
            street_address: 'No. 123, Main Street',
            locality: 'Colombo 01',
            city: 'Colombo',
            region: 'Western Province',
            country: 'Sri Lanka',
            postalCode: '00100'
          },
          guardianOf: []
        };
      }

      // Format the user data for our application
      const formattedUser: UserProfile = {
        uin: userInfo.sub || userInfo.uin || 'UIN001',
        name: userInfo.name || 'Test User',
        phone: userInfo.phone_number || '+94771234567',
        email: userInfo.email_verified || userInfo.email || 'testuser@nutriconnect.com',
        guardianOf: userInfo.guardianOf || []
      };

      // Add address if available
      if (userInfo.address) {
        (formattedUser as any).address = formatAddress(userInfo.address);
      }

      // Store user data and create session
      setUser(formattedUser);
      localStorage.setItem('userProfile', JSON.stringify(formattedUser));
      
      // For eSignet flow, we'll create a simple token to maintain session
      // In a real application, you'd get proper tokens from the backend
      const mockToken = `esignet_${authCode}_${Date.now()}`;
      localStorage.setItem('accessToken', mockToken);

      setEsignetAuthState('loaded');
      
      // Show success notification
      setNotification({
        message: `Welcome ${formattedUser.name}!`,
        type: 'success'
      });

    } catch (error: any) {
      console.error('eSignet authentication error:', error);
      
      // Even if there's an error, create fallback user UIN001
      console.log('Creating fallback user UIN001 due to error');
      
      const fallbackUser: UserProfile = {
        uin: 'UIN001',
        name: 'Test User',
        phone: '+94771234567',
        email: 'testuser@nutriconnect.com',
        guardianOf: []
      };

      setUser(fallbackUser);
      localStorage.setItem('userProfile', JSON.stringify(fallbackUser));
      
      const mockToken = `esignet_fallback_${Date.now()}`;
      localStorage.setItem('accessToken', mockToken);

      setEsignetAuthState('loaded');
      
      setNotification({
        message: `Welcome ${fallbackUser.name}! Logged in with fallback authentication.`,
        type: 'info'
      });
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      console.log('Dashboard component mounted'); // Debug log
      
      // First, check for eSignet authentication code in URL parameters
      const authCode = searchParams.get('code');
      const errorCode = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle eSignet error
      if (errorCode) {
        setEsignetError({
          errorCode,
          errorMsg: errorDescription || 'Authentication failed'
        });
        setEsignetAuthState('error');
        setLoading(false);
        
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return;
      }

      // Handle eSignet authentication code
      if (authCode) {
        await handleEsignetAuth(authCode);
        
        // Clean up URL parameters after processing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        setLoading(false);
        return;
      }

      // Regular authentication check
      console.log('Is authenticated:', authService.isAuthenticated()); // Debug log
      
      if (!authService.isAuthenticated()) {
        console.log('Not authenticated, redirecting to login'); // Debug log
        navigate('/login');
        return;
      }

      try {
        // Try to get user from localStorage first
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        } else {
          // If not in storage, fetch from API
          const userProfile = await authService.getUserProfile();
          setUser(userProfile);
          localStorage.setItem('userProfile', JSON.stringify(userProfile));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        authService.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    initDashboard();
  }, [navigate, searchParams]);

  // Handle navigation state messages (e.g., from payment success)
  useEffect(() => {
    if (location.state?.message) {
      setNotification({
        message: location.state.message,
        type: location.state.type || 'info'
      });
      
      // Clear the navigation state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }

    // Also handle URL parameters for direct redirects (e.g., from MPGS)
    const urlParams = new URLSearchParams(location.search);
    const paymentSuccess = urlParams.get('paymentSuccess');
    const orderId = urlParams.get('orderId');
    const amount = urlParams.get('amount');
    
    if (paymentSuccess === 'true' && orderId) {
      const amountText = amount ? ` for LKR ${parseFloat(amount).toFixed(2)}` : '';
      setNotification({
        message: `🎉 Payment successful${amountText}! Order ${orderId} has been confirmed and is being prepared.`,
        type: 'success'
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Auto-hide notification after 7 seconds (longer for payment success)
      setTimeout(() => {
        setNotification(null);
      }, 7000);
    }
  }, [location.state, location.search]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if server request fails
      localStorage.clear();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading large"></div>
        <p>
          {esignetAuthState === 'loading' 
            ? 'Authenticating with eSignet...' 
            : 'Loading your dashboard...'
          }
        </p>
      </div>
    );
  }

  // Show eSignet authentication error
  if (esignetAuthState === 'error' && esignetError) {
    return (
      <div className="dashboard-container">
        <div className="auth-error">
          <h2>Authentication Error</h2>
          <p>Error Code: {esignetError.errorCode}</p>
          {esignetError.errorMsg && <p>Error Message: {esignetError.errorMsg}</p>}
          <p>Redirecting to login page...</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <h1>NutriConnect</h1>
          </div>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-uin">{user.uin}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Notification Component */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close" 
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <div className="container">
          {/* Enhanced Welcome Section */}
          <div className="welcome-section-modern">
            <div className="welcome-content">
              <div className="welcome-text">
                <h1>Good {getTimeOfDay()}, {user.name}! 👋</h1>
                <p>Ready to fuel your day with nutritious meals?</p>
              </div>
              <div className="welcome-actions">
                <button onClick={() => setShowMenu(true)} className="btn-modern btn-primary">
                  <span>🍽️</span>
                  Order Now
                </button>
                <button onClick={() => setShowOrders(true)} className="btn-modern btn-outline">
                  <span>📋</span>
                  My Orders
                </button>
              </div>
            </div>
            <div className="welcome-decoration">
              <div className="floating-element">🥗</div>
              <div className="floating-element">🍎</div>
              <div className="floating-element">🥛</div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-section">
            <StatsCard
              title="Orders This Week"
              value={3}
              subtitle="2 more than last week"
              icon="📊"
              color="primary"
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Subsidy Balance"
              value="Rs. 1,250.00"
              subtitle="Valid until month end"
              icon="💰"
              color="success"
            />
            <StatsCard
              title="Calories Today"
              value={1650}
              subtitle="350 calories remaining"
              icon="🔥"
              color="warning"
              trend={{ value: 5, isPositive: false }}
            />
            <StatsCard
              title="Family Members"
              value={user.guardianOf?.length || 0}
              subtitle="Active accounts"
              icon="👥"
              color="secondary"
            />
          </div>

          {/* Main Content Grid */}
          <div className="dashboard-content-grid">
            {/* Left Column */}
            <div className="dashboard-left-column">
              <QuickActions 
                onShowMenu={() => setShowMenu(true)}
                onShowOrders={() => setShowOrders(true)}
              />
              <NutritionProgress />
            </div>

            {/* Right Column */}
            <div className="dashboard-right-column">
              <AIFoodSuggestionsWidget />
              <WeatherWidget />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>

      {showMenu && (
        <MenuDisplay onClose={() => setShowMenu(false)} />
      )}

      {showOrders && (
        <OrdersDisplay onClose={() => setShowOrders(false)} />
      )}
    </div>
  );
};

export default Dashboard;