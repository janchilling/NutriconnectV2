const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nutriconnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ Payment Service MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Payment Service Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;