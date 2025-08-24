import React, { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  recommendation: string;
}

const WeatherWidget: React.FC = () => {
  const [weather] = useState<WeatherData>({
    temperature: 28,
    condition: 'Partly Cloudy',
    icon: '⛅',
    recommendation: 'Perfect weather for a fresh salad!'
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading weather data
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getMealRecommendation = (temp: number, condition: string) => {
    if (temp > 30) {
      return 'Stay cool with fresh fruits and cold beverages! 🧊';
    } else if (temp < 20) {
      return 'Warm soups and hot meals are perfect today! 🍲';
    } else {
      return 'Great weather for balanced, nutritious meals! 🥗';
    }
  };

  return (
    <div className={`weather-widget ${isLoaded ? 'weather-loaded' : ''}`}>
      <div className="weather-header">
        <h3>Today's Weather</h3>
        <div className="weather-location">📍 Colombo, Sri Lanka</div>
      </div>
      
      <div className="weather-main">
        <div className="weather-icon">
          {weather.icon}
        </div>
        <div className="weather-temp">
          {weather.temperature}°C
        </div>
        <div className="weather-condition">
          {weather.condition}
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-stat">
          <span className="stat-label">Humidity</span>
          <span className="stat-value">65%</span>
        </div>
        <div className="weather-stat">
          <span className="stat-label">Wind</span>
          <span className="stat-value">12 km/h</span>
        </div>
      </div>

      <div className="weather-recommendation">
        <div className="recommendation-icon">🍽️</div>
        <p>{getMealRecommendation(weather.temperature, weather.condition)}</p>
      </div>
    </div>
  );
};

export default WeatherWidget;