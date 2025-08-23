const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: String, required: true },
  menuItemName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  uin: { type: String, required: true }, // User UIN who placed the order
  orderFor: { type: String, required: true }, // UIN of the person the meal is for (could be self or pupil)
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date, required: true }, // When the meal should be delivered/available
  mealType: { type: String, enum: ['breakfast', 'lunch', 'snack', 'dinner'], required: true },
  specialInstructions: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentMethod: { type: String, enum: ['subsidy', 'wallet', 'card', 'cash'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', OrderSchema);