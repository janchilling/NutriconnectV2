// Application configuration

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nutriconnect',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0
    }
  },

  // External services
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000
    },
    ndx: {
      url: process.env.NDX_BASE_URL || 'http://localhost:5001',
      apiKey: process.env.NDX_API_KEY,
      timeout: 10000
    },
    payDPI: {
      url: process.env.PAYDPI_BASE_URL || 'http://localhost:6001',
      apiKey: process.env.PAYDPI_API_KEY,
      timeout: 15000
    }
  },

  // Business rules
  business: {
    // Order configuration
    order: {
      maxItemsPerOrder: 10,
      maxOrdersPerDay: 5,
      cancelWindowHours: 2, // Hours before delivery that orders can be cancelled
      validMealTypes: ['breakfast', 'lunch', 'snack', 'dinner']
    },

    // Menu configuration
    menu: {
      maxDaysInAdvance: 7, // How many days in advance menu is available
      syncIntervalMinutes: 30, // How often to sync with upstream service
      categoriesOrder: ['breakfast', 'lunch', 'snack', 'dinner']
    },

    // Nutrition configuration
    nutrition: {
      dailyCalorieTarget: 2000,
      macroTargets: {
        proteinPercent: 20,
        carbohydratesPercent: 50,
        fatPercent: 30
      }
    }
  },

  // API configuration
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    cors: {
      origin: process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    pagination: {
      defaultLimit: 10,
      maxLimit: 50
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple'
  },

  // Feature flags
  features: {
    enablePayments: false, // Will be enabled when PayDPI integration is ready
    enableNutritionTracking: true,
    enableOrderScheduling: true,
    enableMenuRecommendations: false
  }
};