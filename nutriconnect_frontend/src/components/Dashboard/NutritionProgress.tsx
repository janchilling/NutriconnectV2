import React from 'react';

interface NutritionGoal {
  name: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  icon: string;
}

const NutritionProgress: React.FC = () => {
  const nutritionGoals: NutritionGoal[] = [
    {
      name: 'Calories',
      current: 1650,
      target: 2000,
      unit: 'kcal',
      color: '#A0C878',
      icon: '🔥'
    },
    {
      name: 'Protein',
      current: 45,
      target: 60,
      unit: 'g',
      color: '#DDEB9D',
      icon: '💪'
    },
    {
      name: 'Carbs',
      current: 180,
      target: 250,
      unit: 'g',
      color: '#A0C878',
      icon: '🌾'
    },
    {
      name: 'Fat',
      current: 35,
      target: 65,
      unit: 'g',
      color: '#DDEB9D',
      icon: '🥑'
    }
  ];

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return 'completed';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'moderate';
    return 'low';
  };

  return (
    <div className="nutrition-progress">
      <div className="nutrition-header">
        <h3>Today's Nutrition</h3>
        <div className="nutrition-summary">
          <span className="calories-remaining">
            {Math.max(0, nutritionGoals[0].target - nutritionGoals[0].current)} kcal remaining
          </span>
        </div>
      </div>

      <div className="nutrition-goals">
        {nutritionGoals.map((goal, index) => {
          const percentage = getProgressPercentage(goal.current, goal.target);
          const status = getProgressStatus(goal.current, goal.target);
          
          return (
            <div 
              key={goal.name} 
              className="nutrition-goal"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="goal-header">
                <div className="goal-info">
                  <span className="goal-icon">{goal.icon}</span>
                  <span className="goal-name">{goal.name}</span>
                </div>
                <div className="goal-values">
                  <span className="goal-current">{goal.current}</span>
                  <span className="goal-separator">/</span>
                  <span className="goal-target">{goal.target} {goal.unit}</span>
                </div>
              </div>
              
              <div className="goal-progress">
                <div className="progress-bar">
                  <div 
                    className={`progress-fill progress-${status}`}
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: goal.color
                    }}
                  ></div>
                </div>
                <div className="progress-percentage">
                  {Math.round(percentage)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nutrition-tips">
        <div className="tip-icon">💡</div>
        <p>You're doing great! Consider adding some protein-rich foods to reach your daily goal.</p>
      </div>
    </div>
  );
};

export default NutritionProgress;