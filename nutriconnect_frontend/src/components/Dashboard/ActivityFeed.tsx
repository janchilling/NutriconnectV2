import React from 'react';

interface ActivityItem {
  id: string;
  type: 'order' | 'payment' | 'nutrition' | 'system';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

const ActivityFeed: React.FC = () => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'order',
      title: 'Order Placed',
      description: 'Vegetable Rice Bowl ordered for lunch',
      timestamp: '2 hours ago',
      icon: '🛒',
      color: '#A0C878'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Rs. 45.00 charged for today\'s meal',
      timestamp: '2 hours ago',
      icon: '💳',
      color: '#DDEB9D'
    },
    {
      id: '3',
      type: 'nutrition',
      title: 'Daily Goal Reached',
      description: 'You\'ve met your protein intake goal!',
      timestamp: '4 hours ago',
      icon: '🎯',
      color: '#A0C878'
    },
    {
      id: '4',
      type: 'order',
      title: 'Order Delivered',
      description: 'Yesterday\'s dinner was delivered',
      timestamp: '1 day ago',
      icon: '✅',
      color: '#DDEB9D'
    },
    {
      id: '5',
      type: 'system',
      title: 'Weekly Menu Updated',
      description: 'New meals available for next week',
      timestamp: '2 days ago',
      icon: '📋',
      color: '#A0C878'
    }
  ];

  const getActivityTypeColor = (type: string) => {
    const colors = {
      order: '#A0C878',
      payment: '#DDEB9D', 
      nutrition: '#A0C878',
      system: '#DDEB9D'
    };
    return colors[type as keyof typeof colors] || '#A0C878';
  };

  return (
    <div className="activity-feed">
      <div className="activity-feed-header">
        <h3>Recent Activity</h3>
        <button className="view-all-btn">View All</button>
      </div>
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div 
            key={activity.id} 
            className="activity-item"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="activity-icon" style={{ backgroundColor: activity.color }}>
              {activity.icon}
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <h4>{activity.title}</h4>
                <p>{activity.description}</p>
              </div>
              <div className="activity-timestamp">
                {activity.timestamp}
              </div>
            </div>
            <div 
              className="activity-status-dot" 
              style={{ backgroundColor: getActivityTypeColor(activity.type) }}
            ></div>
          </div>
        ))}
      </div>
      <div className="activity-feed-footer">
        <button className="load-more-btn">Load More Activities</button>
      </div>
    </div>
  );
};

export default ActivityFeed;