const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { authenticate } = require('../middleware/auth');

// Helper function to generate unique order ID
const generateOrderId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5);
  return `ORD_${timestamp}_${random}`.toUpperCase();
};

// POST /api/orders - Create a new order
// router.post('/', authenticate, async (req, res) => {
router.post('/', async (req, res) => {
  try {
    const { orderFor, items, deliveryDate, mealType, specialInstructions } = req.body;
    
    // Validation
    if (!orderFor || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderFor and items are required'
      });
    }
    
    if (!deliveryDate || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'deliveryDate and mealType are required'
      });
    }
    
    const validMealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mealType. Valid types are: ' + validMealTypes.join(', ')
      });
    }
    
    // Validate and process order items
    const processedItems = [];
    let totalAmount = 0;
    
    for (const item of items) {
      const { menuItemId, quantity } = item;
      
      if (!menuItemId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have menuItemId and quantity > 0'
        });
      }
      
      // Find menu item
      const menuItem = await MenuItem.findOne({ 
        id: menuItemId, 
        isAvailable: true 
      });
      
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item ${menuItemId} not found or not available`
        });
      }
      
      const itemTotal = menuItem.price * quantity;
      totalAmount += itemTotal;
      
      processedItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: quantity,
        unitPrice: menuItem.price,
        totalPrice: itemTotal
      });
    }

    console.log(req)
    
    // Create order
    const newOrder = new Order({
      orderId: generateOrderId(),
      uin: req.body.uin,
      orderFor: orderFor,
      items: processedItems,
      totalAmount: totalAmount,
      deliveryDate: new Date(deliveryDate),
      mealType: mealType,
      specialInstructions: specialInstructions || '',
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    await newOrder.save();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        orderId: newOrder.orderId,
        orderFor: newOrder.orderFor,
        items: newOrder.items,
        totalAmount: newOrder.totalAmount,
        deliveryDate: newOrder.deliveryDate,
        mealType: newOrder.mealType,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        createdAt: newOrder.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order' 
    });
  }
});

// GET /api/orders - Get user's orders
router.get('/', async (req, res) => {
  try {
    const { uin, status, mealType, page = 1, limit = 10 } = req.query;
    
    // Validate UIN is provided
    if (!uin) {
      return res.status(400).json({
        success: false,
        message: 'UIN is required as query parameter'
      });
    }
    
    let filter = { uin: uin };
    
    // Add optional filters
    if (status) {
      filter.status = status;
    }
    if (mealType) {
      filter.mealType = mealType;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalOrders = await Order.countDocuments(filter);
    
    res.json({
      success: true,
      message: 'Orders fetched successfully',
      orders: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders: totalOrders,
        hasNext: (parseInt(page) * parseInt(limit)) < totalOrders,
        hasPrevious: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

// GET /api/orders/:orderId - Get specific order details
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ 
      orderId: orderId,
      uin: req.user.uin 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Order details fetched successfully',
      order: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch order details' 
    });
  }
});

// PUT /api/orders/:orderId/cancel - Cancel an order
router.put('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = await Order.findOne({ 
      orderId: orderId,
      uin: req.user.uin 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order can be cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }
    
    // Update order status
    order.status = 'cancelled';
    order.specialInstructions = (order.specialInstructions || '') + 
      (reason ? `\nCancellation reason: ${reason}` : '\nCancelled by user');
    await order.save();
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel order' 
    });
  }
});

// GET /api/orders/today/summary - Get today's order summary
router.get('/today/summary', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todaysOrders = await Order.find({
      uin: req.user.uin,
      deliveryDate: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ createdAt: -1 });
    
    // Calculate summary statistics
    const summary = {
      totalOrders: todaysOrders.length,
      totalAmount: todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      ordersByStatus: {},
      ordersByMealType: {},
      upcomingMeals: []
    };
    
    // Group by status and meal type
    todaysOrders.forEach(order => {
      // By status
      if (!summary.ordersByStatus[order.status]) {
        summary.ordersByStatus[order.status] = 0;
      }
      summary.ordersByStatus[order.status]++;
      
      // By meal type
      if (!summary.ordersByMealType[order.mealType]) {
        summary.ordersByMealType[order.mealType] = 0;
      }
      summary.ordersByMealType[order.mealType]++;
      
      // Upcoming meals (not delivered or cancelled)
      if (!['delivered', 'cancelled'].includes(order.status)) {
        summary.upcomingMeals.push({
          orderId: order.orderId,
          mealType: order.mealType,
          status: order.status,
          totalAmount: order.totalAmount,
          itemCount: order.items.length
        });
      }
    });
    
    res.json({
      success: true,
      message: 'Today\'s order summary fetched successfully',
      date: today.toISOString().split('T')[0],
      summary: summary,
      orders: todaysOrders
    });
  } catch (error) {
    console.error('Error fetching today\'s order summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch order summary' 
    });
  }
});

router.patch('/payment-status', async (req, res) => {
  try {
    // Simple internal service authentication
    const serviceAuth = req.headers['x-service-auth'];
    if (serviceAuth !== 'payment-service-internal') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Internal service access only'
      });
    }

    const { orderId, paymentStatus, paymentId, paymentMethod } = req.body;
    
    if (!orderId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'orderId and paymentStatus are required'
      });
    }

    // Find and update the order
    const Order = require('../models/Order');
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update payment-related fields
    order.paymentStatus = paymentStatus;
    if (paymentId) order.paymentId = paymentId;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    
    // Update order status based on payment status
    if (paymentStatus === 'paid') {
      order.status = 'confirmed'; // Move to confirmed when payment succeeds
    } else if (paymentStatus === 'failed') {
      order.status = 'cancelled'; // Cancel order if payment fails
    }
    // Keep existing status for 'pending' payments
    
    order.updatedAt = new Date();
    await order.save();

    console.log(`📦 Order ${orderId} updated - Payment: ${paymentStatus}, Status: ${order.status}`);

    res.json({
      success: true,
      message: 'Order payment status updated successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating order payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order payment status'
    });
  }
});

// PATCH /api/orders/:orderId/status - Update order status (internal service call)
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentDetails } = req.body;

    // Validate service authentication
    const serviceAuth = req.headers['x-service-auth'];
    if (serviceAuth !== 'payment-service-internal') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized service call'
      });
    }

    console.log(`📦 Updating order ${orderId} status to: ${status}`);
    console.log(`💳 Payment details:`, paymentDetails);

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.status = status;
    order.updatedAt = new Date();

    // If payment details are provided, update payment information
    if (paymentDetails) {
      if (paymentDetails.paymentId) order.paymentId = paymentDetails.paymentId;
      if (paymentDetails.transactionId) order.transactionId = paymentDetails.transactionId;
      if (paymentDetails.amount) order.paymentAmount = paymentDetails.amount;
      if (paymentDetails.currency) order.paymentCurrency = paymentDetails.currency;
      if (paymentDetails.paymentMethod) order.paymentMethod = paymentDetails.paymentMethod;
      
      // Update payment status based on order status
      if (status === 'confirmed' || status === 'preparing' || status === 'ready' || status === 'delivered') {
        order.paymentStatus = 'paid';
      } else if (status === 'cancelled') {
        order.paymentStatus = 'failed';
      }
    }

    await order.save();

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;