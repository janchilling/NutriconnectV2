const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Import models (only if they exist)
let UserSession, Order, MenuItem;
try {
  UserSession = require('../models/UserSession');
  Order = require('../models/Order');
  MenuItem = require('../models/MenuItem');
} catch (error) {
  console.warn('Some models not found, will use mock data:', error.message);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ENHANCED MOCK DATA - using your provided data structure
const mockMenuData = [
  {
    id: 'item_001',
    name: 'Vegetable Rice Bowl',
    description: 'Nutritious rice bowl with seasonal vegetables, dal, and yogurt',
    price: 45.00,
    category: 'lunch',
    nutritionInfo: {
      calories: 380,
      protein: 12,
      carbohydrates: 65,
      fat: 8,
      fiber: 6
    },
    ingredients: ['Basmati Rice', 'Mixed Vegetables', 'Dal', 'Yogurt', 'Spices'],
    allergens: ['Dairy'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    isAvailable: true
  },
  {
    id: 'item_002',
    name: 'Chicken Curry with Roti',
    description: 'Tender chicken curry served with whole wheat roti and salad',
    price: 65.00,
    category: 'lunch',
    nutritionInfo: {
      calories: 520,
      protein: 28,
      carbohydrates: 45,
      fat: 18,
      fiber: 8
    },
    ingredients: ['Chicken', 'Whole Wheat Flour', 'Onions', 'Tomatoes', 'Spices', 'Mixed Salad'],
    allergens: ['Gluten'],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isAvailable: true
  },
  {
    id: 'item_003',
    name: 'Fresh Fruit Salad',
    description: 'Seasonal mixed fruit salad with honey dressing',
    price: 25.00,
    category: 'snack',
    nutritionInfo: {
      calories: 120,
      protein: 2,
      carbohydrates: 30,
      fat: 1,
      fiber: 4
    },
    ingredients: ['Apple', 'Banana', 'Orange', 'Grapes', 'Honey', 'Mint'],
    allergens: [],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isAvailable: true
  },
  {
    id: 'item_004',
    name: 'Masala Dosa',
    description: 'Crispy dosa with spiced potato filling, served with sambar and chutney',
    price: 55.00,
    category: 'breakfast',
    nutritionInfo: {
      calories: 420,
      protein: 8,
      carbohydrates: 58,
      fat: 16,
      fiber: 5
    },
    ingredients: ['Rice', 'Lentils', 'Potatoes', 'Onions', 'Curry Leaves', 'Coconut'],
    allergens: [],
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isAvailable: true
  },
  {
    id: 'item_005',
    name: 'Grilled Fish with Quinoa',
    description: 'Grilled fish fillet with quinoa pilaf and steamed vegetables',
    price: 85.00,
    category: 'dinner',
    nutritionInfo: {
      calories: 450,
      protein: 32,
      carbohydrates: 35,
      fat: 15,
      fiber: 6
    },
    ingredients: ['Fish Fillet', 'Quinoa', 'Broccoli', 'Carrots', 'Bell Peppers', 'Lemon'],
    allergens: ['Fish'],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    isAvailable: true
  },
  {
    id: 'item_006',
    name: 'Protein Smoothie Bowl',
    description: 'Thick smoothie bowl topped with nuts, seeds, and fresh berries',
    price: 75.00,
    category: 'breakfast',
    nutritionInfo: {
      calories: 320,
      protein: 18,
      carbohydrates: 35,
      fat: 12,
      fiber: 8
    },
    ingredients: ['Greek Yogurt', 'Banana', 'Berries', 'Almonds', 'Chia Seeds', 'Honey'],
    allergens: ['Dairy', 'Nuts'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: true,
    isAvailable: true
  },
  {
    id: 'item_007',
    name: 'Paneer Tikka Wrap',
    description: 'Grilled paneer tikka wrapped in whole wheat tortilla with fresh vegetables',
    price: 60.00,
    category: 'lunch',
    nutritionInfo: {
      calories: 480,
      protein: 22,
      carbohydrates: 42,
      fat: 20,
      fiber: 6
    },
    ingredients: ['Paneer', 'Whole Wheat Tortilla', 'Bell Peppers', 'Onions', 'Mint Chutney'],
    allergens: ['Dairy', 'Gluten'],
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    isAvailable: true
  }
];

// SAFE auth middleware - falls back to mock user if real auth fails
router.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token && UserSession) {
      const session = await UserSession.findOne({ accessToken: token, isActive: true });
      if (session) {
        req.user = session.userProfile;
        req.isRealUser = true;
        return next();
      }
    }
    
    req.user = {
      name: 'Test User',
      uin: 'UIN001'
    };
    req.isRealUser = false;
    next();
    
  } catch (error) {
    console.warn('Auth fallback to mock user:', error.message);
    req.user = {
      name: 'Test User',
      uin: 'UIN001'
    };
    req.isRealUser = false;
    next();
  }
});

// GET /api/ai/food-suggestions - ENHANCED VERSION
router.get('/food-suggestions', async (req, res) => {
  try {
    console.log('🤖 AI Suggestions endpoint called');
    console.log('🔍 Real user:', req.isRealUser);
    
    const user = req.user;
    let userContext, menuItems;
    
    if (req.isRealUser) {
      console.log('📊 Attempting to get real data...');
      try {
        userContext = await getUserNutritionContext(user.uin);
        menuItems = await getAvailableMenuItems();
        console.log('✅ Real data loaded successfully');
      } catch (error) {
        console.warn('❌ Real data failed, falling back to mock:', error.message);
        userContext = getMockUserContext(user.name);
        menuItems = getMockMenuItems();
      }
    } else {
      console.log('🎭 Using mock data');
      userContext = getMockUserContext(user.name);
      menuItems = getMockMenuItems();
    }

    // Calculate nutritional needs
    const calorieDeficit = Math.max(0, userContext.caloriesTarget - userContext.caloriesConsumedToday);
    const proteinDeficit = Math.max(0, userContext.proteinTarget - userContext.proteinConsumed);
    
    // Enhanced prompt for Gemini with combo suggestions
    const prompt = `
You are a nutrition assistant for NutriConnect food service. Analyze the user's current nutrition status and suggest both individual items AND cost-effective combos with quantities to help them meet their daily goals efficiently.

User Context:
- Name: ${userContext.name}
- Current time: ${userContext.timeOfDay}
- Calories consumed: ${userContext.caloriesConsumedToday}/${userContext.caloriesTarget} (${calorieDeficit} remaining)
- Protein consumed: ${userContext.proteinConsumed}g/${userContext.proteinTarget}g (${proteinDeficit}g remaining)
- Preferences: ${userContext.preferences.join(', ') || 'None specified'}
- Recent orders: ${userContext.recentOrders.join(', ') || 'No recent orders'}

Available Menu Items:
${menuItems.map(item => 
  `- ${item.name} (${item.category}): ${item.nutritionInfo.calories} cal, ${item.nutritionInfo.protein}g protein, ${item.nutritionInfo.carbohydrates}g carbs, ${item.nutritionInfo.fat}g fat, Rs. ${item.price}
    Description: ${item.description}
    Cost per calorie: Rs. ${(item.price / item.nutritionInfo.calories).toFixed(2)}/cal, Cost per protein: Rs. ${(item.price / item.nutritionInfo.protein).toFixed(2)}/g
    Dietary: ${item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}, ${item.isVegan ? 'Vegan' : 'Non-Vegan'}, ${item.isGlutenFree ? 'Gluten-Free' : 'Contains Gluten'}`
).join('\n')}

IMPORTANT: Always use "Rs." for currency, never use ₹ or other currency symbols. This is Sri Lankan Rupees, not Indian Rupees.

OPTIMIZATION CRITERIA:
1. Fill calorie deficit (${calorieDeficit} cal needed) cost-effectively
2. Meet protein goals (${proteinDeficit}g protein needed) efficiently
3. Consider cost per calorie and cost per protein ratios
4. Suggest optimal quantities (1-3 units per item)
5. Create combo suggestions that complement each other
6. Time-appropriate meals (current time: ${userContext.timeOfDay})
7. Respect dietary preferences
8. IMPORTANT: Always use "Rs." for Sri Lankan Rupees, never ₹ symbol

Please respond in JSON format with exactly this structure:
{
  "individualSuggestions": [
    {
      "itemName": "exact menu item name",
      "quantity": number,
      "reason": "specific reason based on nutritional needs and cost efficiency",
      "nutritionHighlight": "key nutrition benefit that addresses user's deficit",
      "priority": "high/medium/low",
      "totalCalories": number,
      "totalProtein": number,
      "totalCost": number,
      "costEfficiency": "explanation of cost effectiveness"
    }
  ],
  "comboSuggestions": [
    {
      "comboName": "descriptive combo name",
      "items": [
        {
          "itemName": "exact menu item name",
          "quantity": number
        }
      ],
      "totalCalories": number,
      "totalProtein": number,
      "totalCost": number,
      "reason": "why this combo is optimal",
      "nutritionHighlight": "combined nutritional benefits",
      "priority": "high/medium/low"
    }
  ]
}
`;

    console.log('🔄 Calling Gemini API...');
    
    let suggestions;
    
    // Try Gemini API first
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Gemini API Response received');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (aiError) {
      console.warn('❌ AI API failed, using intelligent fallback:', aiError.message);
      suggestions = getIntelligentFallbackSuggestions(userContext, menuItems);
    }

    res.json({
      success: true,
      individualSuggestions: suggestions.individualSuggestions || suggestions.suggestions || suggestions,
      comboSuggestions: suggestions.comboSuggestions || [],
      context: {
        timeOfDay: userContext.timeOfDay,
        remainingCalories: calorieDeficit,
        remainingProtein: proteinDeficit,
        totalCaloriesConsumed: userContext.caloriesConsumedToday,
        totalProteinConsumed: userContext.proteinConsumed,
        budgetEfficiency: {
          avgCostPerCalorie: (menuItems.reduce((sum, item) => sum + (item.price / item.nutritionInfo.calories), 0) / menuItems.length).toFixed(2),
          avgCostPerProtein: (menuItems.reduce((sum, item) => sum + (item.price / item.nutritionInfo.protein), 0) / menuItems.length).toFixed(2)
        }
      },
      dataSource: req.isRealUser ? 'real' : 'mock'
    });

  } catch (error) {
    console.error('AI Suggestions error:', error);
    
    // Final fallback with basic suggestions
    const basicContext = getMockUserContext('User');
    const basicSuggestions = getIntelligentFallbackSuggestions(basicContext, getMockMenuItems());
    
    res.json({
      success: true,
      individualSuggestions: basicSuggestions.individualSuggestions || [],
      comboSuggestions: basicSuggestions.comboSuggestions || [],
      context: {
        timeOfDay: getTimeOfDay(),
        remainingCalories: 350, // Based on mock data: 2000 - 1650
        remainingProtein: 15,   // Based on mock data: 60 - 45
        totalCaloriesConsumed: 1650,
        totalProteinConsumed: 45,
        budgetEfficiency: {
          avgCostPerCalorie: '0.15',
          avgCostPerProtein: '2.50'
        }
      },
      dataSource: 'fallback'
    });
  }
});

// INTELLIGENT FALLBACK SUGGESTIONS with quantities and combos
function getIntelligentFallbackSuggestions(userContext, menuItems) {
  const calorieDeficit = Math.max(0, userContext.caloriesTarget - userContext.caloriesConsumedToday);
  const proteinDeficit = Math.max(0, userContext.proteinTarget - userContext.proteinConsumed);
  const timeOfDay = userContext.timeOfDay;
  
  // Filter items based on time of day
  let timeAppropriateItems = menuItems.filter(item => {
    if (timeOfDay === 'morning') {
      return item.category === 'breakfast' || item.category === 'snack';
    } else if (timeOfDay === 'afternoon') {
      return item.category === 'lunch' || item.category === 'snack';
    } else {
      return item.category === 'dinner' || item.category === 'lunch' || item.category === 'snack';
    }
  });
  
  if (timeAppropriateItems.length === 0) {
    timeAppropriateItems = menuItems;
  }
  
  // Filter by preferences
  if (userContext.preferences.includes('vegetarian')) {
    timeAppropriateItems = timeAppropriateItems.filter(item => item.isVegetarian);
  }
  
  // Calculate cost efficiency metrics for each item
  const itemsWithEfficiency = timeAppropriateItems.map(item => ({
    ...item,
    costPerCalorie: item.price / item.nutritionInfo.calories,
    costPerProtein: item.price / item.nutritionInfo.protein,
    proteinCalorieRatio: item.nutritionInfo.protein / item.nutritionInfo.calories,
    overallScore: (item.nutritionInfo.protein * 2) + (item.nutritionInfo.calories * 0.5) - (item.price * 0.1)
  }));
  
  // Individual suggestions with optimal quantities
  const individualSuggestions = [];
  
  // 1. High-protein, cost-effective option
  const highProteinItems = itemsWithEfficiency
    .filter(item => item.nutritionInfo.protein >= 15)
    .sort((a, b) => a.costPerProtein - b.costPerProtein);
    
  if (highProteinItems.length > 0) {
    const bestProteinItem = highProteinItems[0];
    const optimalQty = Math.min(3, Math.ceil(proteinDeficit / bestProteinItem.nutritionInfo.protein));
    const finalQty = Math.max(1, optimalQty);
    
    individualSuggestions.push({
      itemName: bestProteinItem.name,
      quantity: finalQty,
      reason: `Most cost-effective protein source at Rs. ${bestProteinItem.costPerProtein.toFixed(2)} per gram of protein`,
      nutritionHighlight: `${bestProteinItem.nutritionInfo.protein * finalQty}g protein (${Math.round((bestProteinItem.nutritionInfo.protein * finalQty / proteinDeficit) * 100)}% of remaining need)`,
      priority: 'high',
      totalCalories: bestProteinItem.nutritionInfo.calories * finalQty,
      totalProtein: bestProteinItem.nutritionInfo.protein * finalQty,
      totalCost: bestProteinItem.price * finalQty,
      costEfficiency: `Rs. ${(bestProteinItem.price * finalQty / (bestProteinItem.nutritionInfo.protein * finalQty)).toFixed(2)}/g protein`
    });
  }
  
  // 2. Best calorie value option
  const calorieEfficientItems = itemsWithEfficiency
    .filter(item => !individualSuggestions.some(s => s.itemName === item.name))
    .sort((a, b) => a.costPerCalorie - b.costPerCalorie);
    
  if (calorieEfficientItems.length > 0) {
    const bestCalorieItem = calorieEfficientItems[0];
    const optimalQty = Math.min(2, Math.ceil(calorieDeficit / bestCalorieItem.nutritionInfo.calories));
    const finalQty = Math.max(1, optimalQty);
    
    individualSuggestions.push({
      itemName: bestCalorieItem.name,
      quantity: finalQty,
      reason: `Best calorie value at Rs. ${bestCalorieItem.costPerCalorie.toFixed(2)} per calorie`,
      nutritionHighlight: `${bestCalorieItem.nutritionInfo.calories * finalQty} calories (${Math.round((bestCalorieItem.nutritionInfo.calories * finalQty / calorieDeficit) * 100)}% of remaining need)`,
      priority: 'medium',
      totalCalories: bestCalorieItem.nutritionInfo.calories * finalQty,
      totalProtein: bestCalorieItem.nutritionInfo.protein * finalQty,
      totalCost: bestCalorieItem.price * finalQty,
      costEfficiency: `Rs. ${(bestCalorieItem.price * finalQty / (bestCalorieItem.nutritionInfo.calories * finalQty)).toFixed(2)}/calorie`
    });
  }
  
  // 3. Balanced option
  const balancedItems = itemsWithEfficiency
    .filter(item => !individualSuggestions.some(s => s.itemName === item.name))
    .sort((a, b) => b.overallScore - a.overallScore);
    
  if (balancedItems.length > 0) {
    const balancedItem = balancedItems[0];
    
    individualSuggestions.push({
      itemName: balancedItem.name,
      quantity: 1,
      reason: `Well-balanced nutrition with good overall value`,
      nutritionHighlight: `${balancedItem.nutritionInfo.calories} cal, ${balancedItem.nutritionInfo.protein}g protein`,
      priority: 'medium',
      totalCalories: balancedItem.nutritionInfo.calories,
      totalProtein: balancedItem.nutritionInfo.protein,
      totalCost: balancedItem.price,
      costEfficiency: `Balanced macro profile`
    });
  }
  
  // Combo suggestions - create optimal combinations
  const comboSuggestions = [];
  
  // Combo 1: Protein + Light meal combo
  if (itemsWithEfficiency.length >= 2) {
    const proteinItem = itemsWithEfficiency
      .filter(item => item.nutritionInfo.protein >= 20)
      .sort((a, b) => a.costPerProtein - b.costPerProtein)[0];
      
    const lightItem = itemsWithEfficiency
      .filter(item => item.nutritionInfo.calories <= 200 && item.name !== proteinItem?.name)
      .sort((a, b) => a.costPerCalorie - b.costPerCalorie)[0];
    
    if (proteinItem && lightItem) {
      const comboCalories = proteinItem.nutritionInfo.calories + lightItem.nutritionInfo.calories * 2;
      const comboProtein = proteinItem.nutritionInfo.protein + lightItem.nutritionInfo.protein * 2;
      const comboCost = proteinItem.price + lightItem.price * 2;
      
      comboSuggestions.push({
        comboName: "Protein Power Combo",
        items: [
          { itemName: proteinItem.name, quantity: 1 },
          { itemName: lightItem.name, quantity: 2 }
        ],
        totalCalories: comboCalories,
        totalProtein: comboProtein,
        totalCost: comboCost,
        reason: `Maximizes protein intake while adding variety with cost-effective portions`,
        nutritionHighlight: `${comboProtein}g protein, ${comboCalories} calories for Rs. ${comboCost}`,
        priority: 'high'
      });
    }
  }
  
  // Combo 2: Calorie deficit filler combo
  if (calorieDeficit > 500 && itemsWithEfficiency.length >= 2) {
    const mediumItems = itemsWithEfficiency
      .filter(item => item.nutritionInfo.calories >= 300 && item.nutritionInfo.calories <= 500)
      .sort((a, b) => a.costPerCalorie - b.costPerCalorie);
      
    if (mediumItems.length >= 2) {
      const item1 = mediumItems[0];
      const item2 = mediumItems[1];
      
      comboSuggestions.push({
        comboName: "Calorie Complete Combo",
        items: [
          { itemName: item1.name, quantity: 1 },
          { itemName: item2.name, quantity: 1 }
        ],
        totalCalories: item1.nutritionInfo.calories + item2.nutritionInfo.calories,
        totalProtein: item1.nutritionInfo.protein + item2.nutritionInfo.protein,
        totalCost: item1.price + item2.price,
        reason: `Efficiently fills your ${calorieDeficit} calorie gap with variety`,
        nutritionHighlight: `${item1.nutritionInfo.calories + item2.nutritionInfo.calories} calories, ${item1.nutritionInfo.protein + item2.nutritionInfo.protein}g protein`,
        priority: 'medium'
      });
    }
  }
  
  // Combo 3: Budget-friendly variety combo
  const budgetItems = itemsWithEfficiency
    .filter(item => item.price <= 50)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3);
    
  if (budgetItems.length >= 2) {
    const totalComboCalories = budgetItems.reduce((sum, item) => sum + item.nutritionInfo.calories, 0);
    const totalComboProtein = budgetItems.reduce((sum, item) => sum + item.nutritionInfo.protein, 0);
    const totalComboCost = budgetItems.reduce((sum, item) => sum + item.price, 0);
    
    comboSuggestions.push({
      comboName: "Budget Variety Pack",
      items: budgetItems.map(item => ({ itemName: item.name, quantity: 1 })),
      totalCalories: totalComboCalories,
      totalProtein: totalComboProtein,
      totalCost: totalComboCost,
      reason: `Maximum variety within budget while meeting nutritional needs`,
      nutritionHighlight: `${totalComboCalories} calories, ${totalComboProtein}g protein for just Rs. ${totalComboCost}`,
      priority: 'low'
    });
  }
  
  return {
    individualSuggestions,
    comboSuggestions
  };
}

// SAFE REAL DATA FUNCTIONS - with error handling
async function getUserNutritionContext(uin) {
  if (!Order) throw new Error('Order model not available');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = await Order.find({
    uin: uin,
    deliveryDate: { $gte: today },
    status: { $in: ['delivered', 'confirmed'] }
  });
  
  let caloriesConsumed = 0;
  let proteinConsumed = 0;
  
  todaysOrders.forEach(order => {
    order.items.forEach(item => {
      caloriesConsumed += (item.calories || 0) * (item.quantity || 1);
      proteinConsumed += (item.protein || 0) * (item.quantity || 1);
    });
  });
  
  return {
    name: 'User',
    caloriesConsumedToday: caloriesConsumed,
    proteinConsumed,
    caloriesTarget: 2000,
    proteinTarget: 100,
    timeOfDay: getTimeOfDay(),
    preferences: [],
    recentOrders: todaysOrders.map(o => o.items.map(i => i.menuItemName)).flat().slice(0, 5)
  };
}

async function getAvailableMenuItems() {
  if (!MenuItem) throw new Error('MenuItem model not available');
  
  const menuItems = await MenuItem.find({
    isAvailable: true
  }).limit(15);
  
  return menuItems.map(item => ({
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    nutritionInfo: item.nutritionInfo || { calories: 400, protein: 20, carbohydrates: 50, fat: 15 },
    isVegetarian: item.isVegetarian || false,
    isVegan: item.isVegan || false,
    isGlutenFree: item.isGlutenFree || false
  }));
}

// ENHANCED MOCK DATA FUNCTIONS
function getMockUserContext(userName) {
  // Based on your nutrition progress component data
  return {
    name: userName || 'User',
    caloriesConsumedToday: 1650,  // From your nutrition progress data
    caloriesTarget: 2000,
    proteinConsumed: 45,
    proteinTarget: 60,  // Adjusted to match your nutrition progress
    timeOfDay: getTimeOfDay(),
    preferences: ['vegetarian'], // Can be dynamic based on user
    recentOrders: ['Masala Dosa', 'Fresh Fruit Salad']
  };
}

function getMockMenuItems() {
  // Return the enhanced mock data with all nutritional information
  return mockMenuData.filter(item => item.isAvailable);
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

module.exports = router;