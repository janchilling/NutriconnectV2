import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, UserProfile } from '../../services/api';
import MenuDisplay from './MenuDisplay';
import OrdersDisplay from './OrdersDisplay';
import StatsCard from './StatsCard';
import QuickActions from './QuickActions';
import ActivityFeed from './ActivityFeed';
import WeatherWidget from './WeatherWidget';
import NutritionProgress from './NutritionProgress';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  useEffect(() => {
    const initDashboard = async () => {
      console.log('Dashboard component mounted'); // Debug log
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
  }, [navigate]);

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
        <p>Loading your dashboard...</p>
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