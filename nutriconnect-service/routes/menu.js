const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { authenticate } = require('../middleware/auth');

// Mock data for menu items (simulating upstream NDX service)
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
  }
];

// Initialize mock data in database (run once)
const initializeMockData = async () => {
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      await MenuItem.insertMany(mockMenuData);
      console.log('Mock menu data initialized');
    }
  } catch (error) {
    console.error('Error initializing mock data:', error);
  }
};

// Initialize data when module loads
initializeMockData();

// Get today's menu (simulating upstream NDX service call)
const getTodaysMenuFromUpstream = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In real implementation, this would call NDX service
  // For now, return mock data with today's date
  const todaysMenu = mockMenuData.map(item => ({
    ...item,
    availableDate: new Date()
  }));
  
  return todaysMenu;
};

// GET /api/menu/today - Get today's meal plan 
// With endpoint with auth router.get('/today', authenticate, async (req, res) =>
router.get('/today', async (req, res) => {
  try {
    // Get today's menu from upstream service (mocked)
    const upstreamMenu = await getTodaysMenuFromUpstream();
    
    // Store/update in local database
    for (const item of upstreamMenu) {
      await MenuItem.findOneAndUpdate(
        { id: item.id },
        { ...item, availableDate: new Date() },
        { upsert: true, new: true }
      );
    }
    
    // Fetch today's menu from database
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todaysMenu = await MenuItem.find({
      availableDate: { $gte: startOfDay, $lt: endOfDay },
      isAvailable: true
    }).sort({ category: 1, name: 1 });
    
    // Group by category
    const menuByCategory = todaysMenu.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
    
    res.json({
      success: true,
      message: 'Today\'s menu fetched successfully',
      date: today.toISOString().split('T')[0],
      menu: menuByCategory,
      totalItems: todaysMenu.length
    });
  } catch (error) {
    console.error('Error fetching today\'s menu:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch today\'s menu' 
    });
  }
});

// GET /api/menu/category/:category - Get menu items by category
// router.get('/category/:category', authenticate, async (req, res) => {
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['breakfast', 'lunch', 'snack', 'dinner'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories are: ' + validCategories.join(', ')
      });
    }
    
    const menuItems = await MenuItem.find({
      category: category,
      isAvailable: true
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      message: `${category} menu items fetched successfully`,
      category: category,
      items: menuItems,
      count: menuItems.length
    });
  } catch (error) {
    console.error('Error fetching menu by category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch menu items' 
    });
  }
});

// GET /api/menu/item/:itemId - Get specific menu item details
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const menuItem = await MenuItem.findOne({ 
      id: itemId, 
      isAvailable: true 
    });
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu item fetched successfully',
      item: menuItem
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch menu item' 
    });
  }
});

// GET /api/menu/search - Search menu items
router.get('/search', async (req, res) => {
  try {
    const { q, category, vegetarian, vegan, glutenFree } = req.query;
    
    let searchQuery = { isAvailable: true };
    
    // Text search
    if (q) {
      searchQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { ingredients: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    // Category filter
    if (category) {
      searchQuery.category = category;
    }
    
    // Dietary filters
    if (vegetarian === 'true') {
      searchQuery.isVegetarian = true;
    }
    if (vegan === 'true') {
      searchQuery.isVegan = true;
    }
    if (glutenFree === 'true') {
      searchQuery.isGlutenFree = true;
    }
    
    const menuItems = await MenuItem.find(searchQuery).sort({ name: 1 });
    
    res.json({
      success: true,
      message: 'Menu search completed',
      query: { q, category, vegetarian, vegan, glutenFree },
      items: menuItems,
      count: menuItems.length
    });
  } catch (error) {
    console.error('Error searching menu:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search menu' 
    });
  }
});

module.exports = router;