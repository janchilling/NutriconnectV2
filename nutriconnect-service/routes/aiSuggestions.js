// nutriconnect-service/routes/aiSuggestions.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini AI (you'll need to install @google/generative-ai)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple auth middleware for POC
router.use((req, res, next) => {
  // For POC, mock the user - replace with real auth later
  req.user = {
    name: 'Test User',
    uin: 'UIN001'
  };
  next();
});

// GET /api/ai/food-suggestions
router.get('/food-suggestions', async (req, res) => {
  try {
    console.log('🤖 AI Suggestions endpoint called'); // Debug log
    
    // Get user info from session/token (simplified for POC)
    const user = req.user;
    
    // Mock data for POC - replace with real data later
    const mockUserContext = {
      name: user?.name || 'User',
      caloriesConsumedToday: 1200,
      caloriesTarget: 2000,
      proteinConsumed: 45,
      proteinTarget: 100,
      timeOfDay: getTimeOfDay(),
      preferences: ['vegetarian'], // could come from user profile
      recentOrders: ['grilled chicken', 'caesar salad'] // could come from order history
    };

    // Mock available menu items - replace with real menu query later
    const mockMenuItems = [
      {
        name: 'Grilled Chicken Bowl',
        category: 'lunch',
        calories: 450,
        protein: 35,
        price: 'Rs. 280',
        description: 'Grilled chicken with rice and vegetables'
      },
      {
        name: 'Quinoa Salad',
        category: 'lunch',
        calories: 320,
        protein: 12,
        price: 'Rs. 220',
        description: 'Fresh quinoa with mixed vegetables'
      },
      {
        name: 'Protein Smoothie',
        category: 'snack',
        calories: 180,
        protein: 25,
        price: 'Rs. 150',
        description: 'Banana protein smoothie'
      }
    ];

    // Create prompt for Gemini
    const prompt = `
You are a nutrition assistant for NutriConnect food service. Suggest 3 personalized meal recommendations.

User Context:
- Name: ${mockUserContext.name}
- Current time: ${mockUserContext.timeOfDay}
- Calories consumed today: ${mockUserContext.caloriesConsumedToday}/${mockUserContext.caloriesTarget}
- Protein consumed: ${mockUserContext.proteinConsumed}g/${mockUserContext.proteinTarget}g
- Preferences: ${mockUserContext.preferences.join(', ')}
- Recent orders: ${mockUserContext.recentOrders.join(', ')}

Available Menu Items:
${mockMenuItems.map(item => 
  `- ${item.name} (${item.category}): ${item.calories} cal, ${item.protein}g protein, ${item.price} - ${item.description}`
).join('\n')}

Please respond in JSON format with exactly this structure:
{
  "suggestions": [
    {
      "itemName": "menu item name",
      "reason": "brief reason why this is good for the user",
      "nutritionHighlight": "key nutrition benefit",
      "priority": "high/medium/low"
    }
  ]
}

Focus on:
1. Meeting remaining calorie/protein needs
2. Variety from recent orders  
3. Time-appropriate meals
4. User preferences
`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Response received:', text.substring(0, 100) + '...'); // Debug log

    // Parse JSON response
    let suggestions;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      suggestions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      // Fallback suggestions
      suggestions = {
        suggestions: [
          {
            itemName: "Grilled Chicken Bowl",
            reason: "High protein to meet your daily goals",
            nutritionHighlight: "35g protein, balanced meal",
            priority: "high"
          }
        ]
      };
    }

    res.json({
      success: true,
      suggestions: suggestions.suggestions || [],
      context: {
        timeOfDay: mockUserContext.timeOfDay,
        remainingCalories: mockUserContext.caloriesTarget - mockUserContext.caloriesConsumedToday,
        remainingProtein: mockUserContext.proteinTarget - mockUserContext.proteinConsumed
      }
    });

  } catch (error) {
    console.error('AI Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate food suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

module.exports = router;