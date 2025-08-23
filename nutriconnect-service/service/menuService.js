// Business logic for menu operations

const MenuItem = require('../models/MenuItem');

class MenuService {
  
  // Simulate NDX upstream service call
  async fetchMenuFromUpstream(date = new Date()) {
    // Mock delay to simulate real API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // In real implementation, this would make HTTP request to NDX service
    // const response = await axios.get(`${process.env.NDX_BASE_URL}/api/menu/daily`, {
    //   headers: { 'Authorization': `Bearer ${ndxToken}` },
    //   params: { date: date.toISOString().split('T')[0] }
    // });
    
    // For now, return mock data
    const mockMenuData = [
      {
        id: 'item_001',
        name: 'Vegetable Rice Bowl',
        description: 'Nutritious rice bowl with seasonal vegetables, dal, and yogurt',
        price: 45.00,
        category: 'lunch',
        nutritionInfo: { calories: 380, protein: 12, carbohydrates: 65, fat: 8, fiber: 6 },
        ingredients: ['Basmati Rice', 'Mixed Vegetables', 'Dal', 'Yogurt', 'Spices'],
        allergens: ['Dairy'],
        isVegetarian: true, isVegan: false, isGlutenFree: true, isAvailable: true
      },
      {
        id: 'item_002',
        name: 'Chicken Curry with Roti',
        description: 'Tender chicken curry served with whole wheat roti and salad',
        price: 65.00,
        category: 'lunch',
        nutritionInfo: { calories: 520, protein: 28, carbohydrates: 45, fat: 18, fiber: 8 },
        ingredients: ['Chicken', 'Whole Wheat Flour', 'Onions', 'Tomatoes', 'Spices', 'Mixed Salad'],
        allergens: ['Gluten'],
        isVegetarian: false, isVegan: false, isGlutenFree: false, isAvailable: true
      },
      {
        id: 'item_003',
        name: 'Fresh Fruit Salad',
        description: 'Seasonal mixed fruit salad with honey dressing',
        price: 25.00,
        category: 'snack',
        nutritionInfo: { calories: 120, protein: 2, carbohydrates: 30, fat: 1, fiber: 4 },
        ingredients: ['Apple', 'Banana', 'Orange', 'Grapes', 'Honey', 'Mint'],
        allergens: [],
        isVegetarian: true, isVegan: true, isGlutenFree: true, isAvailable: true
      },
      {
        id: 'item_004',
        name: 'Masala Dosa',
        description: 'Crispy dosa with spiced potato filling, served with sambar and chutney',
        price: 55.00,
        category: 'breakfast',
        nutritionInfo: { calories: 420, protein: 8, carbohydrates: 58, fat: 16, fiber: 5 },
        ingredients: ['Rice', 'Lentils', 'Potatoes', 'Onions', 'Curry Leaves', 'Coconut'],
        allergens: [],
        isVegetarian: true, isVegan: true, isGlutenFree: true, isAvailable: true
      },
      {
        id: 'item_005',
        name: 'Grilled Fish with Quinoa',
        description: 'Grilled fish fillet with quinoa pilaf and steamed vegetables',
        price: 85.00,
        category: 'dinner',
        nutritionInfo: { calories: 450, protein: 32, carbohydrates: 35, fat: 15, fiber: 6 },
        ingredients: ['Fish Fillet', 'Quinoa', 'Broccoli', 'Carrots', 'Bell Peppers', 'Lemon'],
        allergens: ['Fish'],
        isVegetarian: false, isVegan: false, isGlutenFree: true, isAvailable: true
      }
    ];
    
    return mockMenuData.map(item => ({
      ...item,
      availableDate: date,
      fetchedAt: new Date()
    }));
  }

  // Sync menu data from upstream to local database
  async syncMenuData(date = new Date()) {
    try {
      const upstreamMenu = await this.fetchMenuFromUpstream(date);
      
      for (const item of upstreamMenu) {
        await MenuItem.findOneAndUpdate(
          { id: item.id },
          { ...item, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
      
      return upstreamMenu;
    } catch (error) {
      console.error('Error syncing menu data:', error);
      throw new Error('Failed to sync menu data from upstream service');
    }
  }

  // Get menu items by date and filters
  async getMenuByDate(date = new Date(), filters = {}) {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      let query = {
        availableDate: { $gte: startOfDay, $lt: endOfDay },
        isAvailable: true
      };
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.isVegetarian) {
        query.isVegetarian = true;
      }
      if (filters.isVegan) {
        query.isVegan = true;
      }
      if (filters.isGlutenFree) {
        query.isGlutenFree = true;
      }
      
      const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
      
      return this.groupMenuByCategory(menuItems);
    } catch (error) {
      console.error('Error fetching menu by date:', error);
      throw new Error('Failed to fetch menu data');
    }
  }

  // Group menu items by category
  groupMenuByCategory(menuItems) {
    return menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
  }

  // Calculate nutrition summary for multiple items
  calculateNutritionSummary(items) {
    return items.reduce((summary, item) => {
      const nutrition = item.nutritionInfo || {};
      const quantity = item.quantity || 1;
      
      return {
        calories: (summary.calories || 0) + ((nutrition.calories || 0) * quantity),
        protein: (summary.protein || 0) + ((nutrition.protein || 0) * quantity),
        carbohydrates: (summary.carbohydrates || 0) + ((nutrition.carbohydrates || 0) * quantity),
        fat: (summary.fat || 0) + ((nutrition.fat || 0) * quantity),
        fiber: (summary.fiber || 0) + ((nutrition.fiber || 0) * quantity)
      };
    }, {});
  }

  // Validate menu item availability
  async validateItemAvailability(menuItemIds, date = new Date()) {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const availableItems = await MenuItem.find({
        id: { $in: menuItemIds },
        availableDate: { $gte: startOfDay, $lt: endOfDay },
        isAvailable: true
      });
      
      const availableIds = availableItems.map(item => item.id);
      const unavailableIds = menuItemIds.filter(id => !availableIds.includes(id));
      
      return {
        available: availableItems,
        unavailable: unavailableIds,
        isValid: unavailableIds.length === 0
      };
    } catch (error) {
      console.error('Error validating item availability:', error);
      throw new Error('Failed to validate menu item availability');
    }
  }
}

module.exports = new MenuService();