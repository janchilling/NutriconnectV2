const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const paymentRoutes = require('./routes/payment');
const walletRoutes = require('./routes/wallet');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nutriconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Payment Service Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'nutriconnect-payment', 
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('🚀 ===================================');
  console.log(`💳 NutriConnect Payment Service running on port ${PORT}`);
  console.log('🚀 ===================================');
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 ===================================');
});