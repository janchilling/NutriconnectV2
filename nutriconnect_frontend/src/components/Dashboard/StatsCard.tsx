import React, { useState, useEffect } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon, trend, color }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    if (typeof value === 'number') {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let currentValue = 0;
      
      const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= value) {
          currentValue = value;
          clearInterval(timer);
        }
        setAnimatedValue(Math.round(currentValue));
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value]);

  const colorClasses = {
    primary: 'stats-card-primary',
    secondary: 'stats-card-secondary', 
    success: 'stats-card-success',
    warning: 'stats-card-warning'
  };

  return (
    <div className={`stats-card ${colorClasses[color]} ${isVisible ? 'stats-card-visible' : ''}`}>
      <div className="stats-card-header">
        <div className="stats-card-icon">
          <span>{icon}</span>
        </div>
        {trend && (
          <div className={`stats-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
            <span className="trend-icon">
              {trend.isPositive ? '↗' : '↘'}
            </span>
            <span className="trend-value">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="stats-card-content">
        <div className="stats-card-value">
          {typeof value === 'number' ? animatedValue : value}
        </div>
        <div className="stats-card-title">{title}</div>
        <div className="stats-card-subtitle">{subtitle}</div>
      </div>
    </div>
  );
};

export default StatsCard;