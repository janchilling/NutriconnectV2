// nutriconnect_frontend/src/components/Dashboard/AIFoodSuggestionsWidget.tsx
import React, { useState, useEffect } from 'react';
import { nutriconnectApi } from '../../services/api';

interface FoodSuggestion {
  itemName: string;
  reason: string;
  nutritionHighlight: string;
  priority: 'high' | 'medium' | 'low';
}

interface SuggestionsResponse {
  success: boolean;
  individualSuggestions: FoodSuggestion[];
  comboSuggestions: any[];
  context: {
    timeOfDay: string;
    remainingCalories: number;
    remainingProtein: number;
    totalCaloriesConsumed: number;
    totalProteinConsumed: number;
    budgetEfficiency: {
      avgCostPerCalorie: string;
      avgCostPerProtein: string;
    };
  };
  dataSource: string;
}

const AIFoodSuggestionsWidget: React.FC = () => {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await nutriconnectApi.get<SuggestionsResponse>('/api/ai/food-suggestions');
      
      if (response.data.success) {
        // Handle the new API response structure with safety checks
        const allSuggestions = response.data.individualSuggestions || [];
        setSuggestions(Array.isArray(allSuggestions) ? allSuggestions : []);
        setContext(response.data.context);
      } else {
        setError('Failed to load AI suggestions');
      }
    } catch (err: any) {
      console.error('AI suggestions error:', err);
      setError('Unable to get food suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#A0C878';
      case 'medium': return '#DDEB9D'; 
      case 'low': return '#f7fafc';
      default: return '#f7fafc';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '⭐';
      case 'medium': return '👍';
      case 'low': return '💡';
      default: return '🍽️';
    }
  };

  if (loading) {
    return (
      <div className="ai-suggestions-widget">
        <div className="widget-header">
          <h3>🤖 AI Food Suggestions</h3>
        </div>
        <div className="widget-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Getting personalized suggestions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-suggestions-widget">
        <div className="widget-header">
          <h3>🤖 AI Food Suggestions</h3>
        </div>
        <div className="widget-content">
          <div className="error-state">
            <p>Unable to load suggestions</p>
            <button onClick={loadSuggestions} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions-widget">
      <div className="widget-header">
        <h3>🤖 AI Food Suggestions</h3>
        <button onClick={loadSuggestions} className="refresh-btn">
          🔄
        </button>
      </div>
      
      {context && (
        <div className="context-info">
          <small>
            Good {context.timeOfDay}! You have {context.remainingCalories} calories 
            and {context.remainingProtein}g protein remaining today.
          </small>
        </div>
      )}

      <div className="widget-content">
        {!suggestions || suggestions.length === 0 ? (
          <p className="no-suggestions">No suggestions available right now.</p>
        ) : (
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className="suggestion-card"
                style={{ borderLeft: `3px solid ${getPriorityColor(suggestion.priority)}` }}
              >
                <div className="suggestion-header">
                  <span className="priority-icon">
                    {getPriorityIcon(suggestion.priority)}
                  </span>
                  <strong className="item-name">{suggestion.itemName}</strong>
                </div>
                <p className="suggestion-reason">{suggestion.reason}</p>
                <div className="nutrition-highlight">
                  <small>💚 {suggestion.nutritionHighlight}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="widget-footer">
          <small>Powered by Gemini AI</small>
        </div>
      </div>
    </div>
  );
};

export default AIFoodSuggestionsWidget;