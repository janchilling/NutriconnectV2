// Business logic for order operations

const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const menuService = require('./menuService');

class OrderService {

  // Generate unique order ID
  generateOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD_${timestamp}_${random}`.toUpperCase();
  }

  // Validate order data
  async validateOrderData(orderData) {
    const { orderFor, items, deliveryDate, mealType } = orderData;
    const errors = [];

    // Basic validation
    if (!orderFor) errors.push('orderFor is required');
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('items array is required and cannot be empty');
    }
    if (!deliveryDate) errors.push('deliveryDate is required');
    if (!mealType) errors.push('mealType is required');

    // Validate meal type
    const validMealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    if (mealType && !validMealTypes.includes(mealType)) {
      errors.push(`Invalid mealType. Valid types are: ${validMealTypes.join(', ')}`);
    }

    // Validate delivery date (should be today or future)
    if (deliveryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const orderDeliveryDate = new Date(deliveryDate);
      orderDeliveryDate.setHours(0, 0, 0, 0);
      
      if (orderDeliveryDate < today) {
        errors.push('Delivery date cannot be in the past');
      }
    }

    // Validate items
    if (items && Array.isArray(items)) {
      const menuItemIds = items.map(item => item.menuItemId);
      const validation = await menuService.validateItemAvailability(menuItemIds, new Date(deliveryDate));
      
      if (!validation.isValid) {
        errors.push(`These menu items are not available: ${validation.unavailable.join(', ')}`);
      }

      // Validate item quantities
      items.forEach((item, index) => {
        if (!item.menuItemId) {
          errors.push(`Item ${index + 1}: menuItemId is required`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: quantity must be greater than 0`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Process order items and calculate totals
  async processOrderItems(items) {
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findOne({ 
        id: item.menuItemId, 
        isAvailable: true 
      });

      if (!menuItem) {
        throw new Error(`Menu item ${item.menuItemId} not found or not available`);
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice: itemTotal,
        nutritionInfo: menuItem.nutritionInfo
      });
    }

    return {
      items: processedItems,
      totalAmount: totalAmount,
      nutritionSummary: menuService.calculateNutritionSummary(processedItems)
    };
  }

  // Create a new order
  async createOrder(orderData, userUin) {
    try {
      // Validate order data
      const validation = await this.validateOrderData(orderData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Process order items
      const processedData = await this.processOrderItems(orderData.items);

      // Create order
      const newOrder = new Order({
        orderId: this.generateOrderId(),
        uin: userUin,
        orderFor: orderData.orderFor,
        items: processedData.items,
        totalAmount: processedData.totalAmount,
        deliveryDate: new Date(orderData.deliveryDate),
        mealType: orderData.mealType,
        specialInstructions: orderData.specialInstructions || '',
        status: 'pending',
        paymentStatus: 'pending'
      });

      await newOrder.save();

      return {
        order: newOrder,
        nutritionSummary: processedData.nutritionSummary
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Get orders with filters and pagination
  async getOrders(userUin, filters = {}, pagination = {}) {
    try {
      const { status, mealType, dateFrom, dateTo } = filters;
      const { page = 1, limit = 10 } = pagination;

      let query = { uin: userUin };

      // Apply filters
      if (status) query.status = status;
      if (mealType) query.mealType = mealType;
      
      if (dateFrom || dateTo) {
        query.deliveryDate = {};
        if (dateFrom) query.deliveryDate.$gte = new Date(dateFrom);
        if (dateTo) query.deliveryDate.$lte = new Date(dateTo);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalOrders = await Order.countDocuments(query);

      return {
        orders: orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders: totalOrders,
          hasNext: (parseInt(page) * parseInt(limit)) < totalOrders,
          hasPrevious: parseInt(page) > 1
        }
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  // Cancel order
  async cancelOrder(orderId, userUin, reason = null) {
    try {
      const order = await Order.findOne({ 
        orderId: orderId,
        uin: userUin 
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      const nonCancellableStatuses = ['delivered', 'cancelled'];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // Update order status
      order.status = 'cancelled';
      if (reason) {
        order.specialInstructions = (order.specialInstructions || '') + 
          `\nCancellation reason: ${reason}`;
      }
      await order.save();

      return order;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get order summary for a specific date
  async getOrderSummary(userUin, date = new Date()) {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const orders = await Order.find({
        uin: userUin,
        deliveryDate: { $gte: startOfDay, $lt: endOfDay }
      }).sort({ createdAt: -1 });

      // Calculate summary statistics
      const summary = {
        date: date.toISOString().split('T')[0],
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        ordersByStatus: {},
        ordersByMealType: {},
        upcomingMeals: [],
        nutritionSummary: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }
      };

      // Process orders
      orders.forEach(order => {
        // Count by status
        summary.ordersByStatus[order.status] = (summary.ordersByStatus[order.status] || 0) + 1;

        // Count by meal type
        summary.ordersByMealType[order.mealType] = (summary.ordersByMealType[order.mealType] || 0) + 1;

        // Add upcoming meals (not delivered or cancelled)
        if (!['delivered', 'cancelled'].includes(order.status)) {
          summary.upcomingMeals.push({
            orderId: order.orderId,
            mealType: order.mealType,
            status: order.status,
            totalAmount: order.totalAmount,
            itemCount: order.items.length
          });
        }

        // Calculate nutrition summary for delivered orders
        if (order.status === 'delivered') {
          const orderNutrition = menuService.calculateNutritionSummary(order.items);
          summary.nutritionSummary.calories += orderNutrition.calories || 0;
          summary.nutritionSummary.protein += orderNutrition.protein || 0;
          summary.nutritionSummary.carbohydrates += orderNutrition.carbohydrates || 0;
          summary.nutritionSummary.fat += orderNutrition.fat || 0;
          summary.nutritionSummary.fiber += orderNutrition.fiber || 0;
        }
      });

      return {
        summary: summary,
        orders: orders
      };
    } catch (error) {
      console.error('Error generating order summary:', error);
      throw new Error('Failed to generate order summary');
    }
  }
}

module.exports = new OrderService();