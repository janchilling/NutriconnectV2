import React from 'react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  onShowMenu: () => void;
  onShowOrders: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onShowMenu, onShowOrders }) => {
  const actions: QuickAction[] = [
    {
      id: 'view-menu',
      title: 'Today\'s Menu',
      description: 'Browse and order from today\'s meals',
      icon: '🍽️',
      color: '#A0C878',
      onClick: onShowMenu
    },
    {
      id: 'my-orders',
      title: 'My Orders',
      description: 'Track your current and past orders',
      icon: '📋',
      color: '#DDEB9D',
      onClick: onShowOrders
    },
    {
      id: 'quick-order',
      title: 'Quick Order',
      description: 'Repeat your last favorite order',
      icon: '⚡',
      color: '#A0C878',
      onClick: () => console.log('Quick order clicked')
    },
    {
      id: 'meal-plan',
      title: 'Weekly Plan',
      description: 'Plan your meals for the week',
      icon: '📅',
      color: '#DDEB9D',
      onClick: () => console.log('Meal plan clicked')
    },
    {
      id: 'nutrition',
      title: 'Nutrition Goals',
      description: 'Track your nutritional intake',
      icon: '🎯',
      color: '#A0C878',
      onClick: () => console.log('Nutrition clicked')
    },
    {
      id: 'family',
      title: 'Family Orders',
      description: 'Manage orders for family members',
      icon: '👨‍👩‍👧‍👦',
      color: '#DDEB9D',
      onClick: () => console.log('Family orders clicked')
    }
  ];

  // Override specific actions
  const actionHandlers: { [key: string]: () => void } = {
    'my-orders': onShowOrders
  };

  return (
    <div className="quick-actions">
      <div className="quick-actions-header">
        <h3>Quick Actions</h3>
        <p>What would you like to do today?</p>
      </div>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <button
            key={action.id}
            className="quick-action-card"
            onClick={actionHandlers[action.id] || action.onClick || (() => console.log(`${action.title} clicked`))}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="quick-action-icon" style={{ backgroundColor: action.color }}>
              {action.icon}
            </div>
            <div className="quick-action-content">
              <h4>{action.title}</h4>
              <p>{action.description}</p>
            </div>
            <div className="quick-action-arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;