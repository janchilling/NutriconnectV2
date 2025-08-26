# 🍎 NutriConnect - Smart School Meals & Subsidy System

**NutriConnect** is a comprehensive smart school meals and subsidy management platform that helps school children access subsidized meals and nutritional guidance through an integrated OAuth-based system with SLUDI authentication, NDX data integration, and PayDPI payment processing.

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Structure](#-project-structure)
- [🔧 Installation & Setup](#-installation--setup)
- [🖥️ Services Overview](#️-services-overview)
- [🔐 Authentication Flow](#-authentication-flow)
- [💳 Payment Integration](#-payment-integration)
- [🤖 AI Features](#-ai-features)
- [🔒 Session Management](#-session-management)
- [📊 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🌍 Environment Configuration](#-environment-configuration)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

## 🌟 Features

### Core Functionality
- **🔐 OAuth Authentication**: Secure login via SLUDI with OTP verification
- **🍽️ Smart Meal Ordering**: View daily menus and place orders in advance
- **💰 Subsidy Management**: Automatic subsidy application and top-ups via PayDPI
- **📊 Nutrition Tracking**: Monitor daily nutritional intake and health metrics
- **👨‍👩‍👧‍👦 Guardian Management**: Parents can manage multiple children's meal plans
- **🤖 AI-Powered Suggestions**: Personalized meal recommendations using Google Gemini AI
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices

### Technical Features
- **🔄 Session Management**: Persistent user sessions with automatic cleanup
- **⚡ Real-time Updates**: Live menu updates and order status tracking
- **🛡️ Security**: Token-based authentication with proper session management
- **📈 Scalable Architecture**: Microservices-based design for easy scaling
- **🗄️ Data Integration**: Seamless integration with NDX for health and canteen data

## 🏗️ Architecture

NutriConnect follows a microservices architecture with the following components:

```mermaid
graph TB
    User[👤 User] --> Frontend[📱 React Frontend<br/>Port 3000]
    Frontend --> AuthService[🔐 Authentication Service<br/>Port 3001]
    Frontend --> NutriService[🍽️ NutriConnect Service<br/>Port 3002]
    Frontend --> PaymentService[💳 Payment Service<br/>Port 3003]
    
    AuthService --> SLUDI[🏛️ SLUDI OAuth Provider<br/>Port 4001]
    NutriService --> NDX[📊 NDX Data Service<br/>Port 5001]
    PaymentService --> PayDPI[💰 PayDPI Payment Gateway<br/>Port 4002]
    
    AuthService --> MongoDB[(🗄️ MongoDB<br/>Authentication DB)]
    NutriService --> MongoDB2[(🗄️ MongoDB<br/>NutriConnect DB)]
    PaymentService --> MongoDB3[(🗄️ MongoDB<br/>Payment DB)]
```

### Service Architecture
- **Frontend**: React.js with TypeScript for the user interface
- **Authentication Service**: Handles OAuth flow with SLUDI integration
- **NutriConnect Service**: Core business logic for meals, orders, and nutrition
- **Payment Service**: Manages payments and subsidies via PayDPI
- **Mock Services**: Development versions of SLUDI and PayDPI for testing

## 🚀 Quick Start

### Prerequisites
- **Node.js** v14.0.0 or higher
- **npm** v6.0.0 or higher
- **MongoDB** v4.4 or higher
- **Git** for version control

### One-Command Setup
```bash
# Clone the repository
git clone https://github.com/nutriconnect/nutriconnect-system.git
cd nutriconnect-system

# Install dependencies for all services
npm run install-all

# Set up environment files
npm run setup-env

# Start all services in development mode
npm run dev-all
```

### Manual Setup
```bash
# Start MongoDB
mongod --dbpath /path/to/your/db

# Terminal 1: Start SLUDI Mock Service
cd sludi-mock-service
npm install && npm start

# Terminal 2: Start PayDPI Mock Service  
cd paydpi-mock-service
npm install && npm start

# Terminal 3: Start Authentication Service
cd authentication-service
npm install && npm run dev

# Terminal 4: Start Payment Service
cd payment-service
npm install && npm run dev

# Terminal 5: Start NutriConnect Service
cd nutriconnect-service
npm install && npm run dev

# Terminal 6: Start Frontend
cd nutriconnect_frontend
npm install && npm start
```

### Access Points
- **Frontend Application**: http://localhost:3000
- **Authentication Service**: http://localhost:3001
- **NutriConnect Service**: http://localhost:3002
- **Payment Service**: http://localhost:3003
- **SLUDI Mock**: http://localhost:4001
- **PayDPI Mock**: http://localhost:4002

## 📁 Project Structure

```
nutriconnect-system/
├── 📱 nutriconnect_frontend/          # React frontend application
│   ├── public/                        # Static files
│   ├── src/
│   │   ├── components/                # React components
│   │   ├── services/                  # API services
│   │   ├── utils/                     # Utility functions
│   │   └── App.tsx                    # Main app component
│   ├── package.json
│   └── tsconfig.json
│
├── 🔐 authentication-service/         # OAuth & user management
│   ├── config/                        # Configuration files
│   ├── middleware/                    # Express middleware
│   ├── models/                        # MongoDB models
│   ├── routes/                        # API routes
│   ├── services/                      # Business logic
│   ├── server.js                      # Main server file
│   └── package.json
│
├── 🍽️ nutriconnect-service/          # Core meal & nutrition service
│   ├── config/                        # App configuration
│   ├── models/                        # Data models
│   ├── routes/                        # API endpoints
│   ├── services/                      # Business services
│   ├── server.js                      # Server entry point
│   └── package.json
│
├── 💳 payment-service/                # Payment processing
│   ├── config/                        # Payment configurations
│   ├── models/                        # Payment models
│   ├── routes/                        # Payment routes
│   ├── services/                      # Payment logic
│   └── package.json
│
├── 🏛️ sludi-mock-service/            # Mock SLUDI OAuth provider
│   ├── sludi-server.js               # Mock server
│   └── package.json
│
├── 💰 paydpi-mock-service/           # Mock PayDPI payment gateway
│   ├── paydpi-server.js              # Mock server
│   └── package.json
│
├── 📖 docs/                           # Documentation
│   ├── api/                           # API documentation
│   ├── deployment/                    # Deployment guides
│   └── SESSION_MANAGEMENT_README.md   # Session management docs
│
└── README.md                          # This file
```

## 🔧 Installation & Setup

### Environment Variables

Create `.env` files for each service:

#### Authentication Service (`.env`)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nutriconnect_auth

# SLUDI Integration
SLUDI_BASE_URL=http://localhost:4001
CLIENT_ID=nutriconnect-client
CLIENT_SECRET=nutriconnect-secret-key
REDIRECT_URI=http://localhost:3001/auth/callback

# Server
PORT=3001
NODE_ENV=development
```

#### NutriConnect Service (`.env`)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nutriconnect

# External Services
AUTH_SERVICE_URL=http://localhost:3001
NDX_BASE_URL=http://localhost:5001
NDX_API_KEY=your-ndx-api-key

# AI Integration
GEMINI_API_KEY=your-google-gemini-api-key

# Server
PORT=3002
NODE_ENV=development
```

#### Payment Service (`.env`)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nutriconnect_payments

# PayDPI Integration
PAYDPI_BASE_URL=http://localhost:4002
PAYDPI_CLIENT_ID=nutriconnect-payment-client
PAYDPI_CLIENT_SECRET=nutriconnect-payment-secret
PAYDPI_CALLBACK_URL=http://localhost:3003/payments/callback

# Server
PORT=3003
NODE_ENV=development
```

#### Frontend (`.env`)
```bash
# API URLs
REACT_APP_AUTH_API_URL=http://localhost:3001
REACT_APP_NUTRICONNECT_API_URL=http://localhost:3002
REACT_APP_PAYMENT_API_URL=http://localhost:3003

# App Configuration
REACT_APP_APP_NAME=NutriConnect
REACT_APP_VERSION=1.0.0
```

### Database Setup

```bash
# Connect to MongoDB
mongo

# Create databases
use nutriconnect_auth
use nutriconnect
use nutriconnect_payments

# Create indexes (automatically handled by the application)
# User sessions have TTL indexes for automatic cleanup
# Authentication sessions expire after 10 minutes
# User sessions expire after 24 hours
```

## 🖥️ Services Overview

### 🔐 Authentication Service

**Purpose**: Handles OAuth authentication with SLUDI integration and user management.

**Key Features**:
- OAuth 2.0 flow with SLUDI
- OTP verification via SMS
- User registration and profile management
- Session management with TTL
- Token validation and refresh

**API Endpoints**:
- `POST /auth/login` - Initiate login with UIN
- `POST /auth/verify-otp` - Verify OTP and get auth code
- `POST /auth/exchange-token` - Exchange code for access token
- `GET /auth/user-profile` - Get authenticated user profile
- `POST /auth/logout` - Logout and invalidate session

### 🍽️ NutriConnect Service

**Purpose**: Core business logic for meal ordering, nutrition tracking, and AI recommendations.

**Key Features**:
- Daily menu management with NDX integration
- Meal ordering system with subsidy calculation
- Nutrition tracking and health metrics
- AI-powered meal recommendations
- Order history and analytics
- Session validation and management

**API Endpoints**:
- `GET /api/menu/today` - Get today's menu
- `GET /api/menu/week` - Get weekly menu
- `POST /api/orders` - Place new meal order
- `GET /api/orders/history` - Get order history
- `POST /api/ai/food-suggestions` - Get AI meal recommendations
- `GET /api/session/:sessionId` - Validate user session

### 💳 Payment Service

**Purpose**: Handles payments, subsidies, and wallet management via PayDPI integration.

**Key Features**:
- Payment processing via PayDPI
- Subsidy application and tracking
- Wallet management
- Payment history and reporting
- Refund processing
- Transaction security

**API Endpoints**:
- `POST /payments/initiate` - Initiate payment
- `POST /payments/verify` - Verify payment status
- `GET /payments/history` - Get payment history
- `POST /wallet/top-up` - Top up wallet balance
- `GET /wallet/balance` - Get current balance
- `POST /payments/refund` - Process refund

### 📱 Frontend Application

**Purpose**: React-based user interface providing seamless user experience.

**Key Features**:
- Responsive design for all devices
- Progressive Web App (PWA) capabilities
- Real-time updates and notifications
- Intuitive meal ordering workflow
- Dashboard with nutrition insights
- Multi-language support ready

**Technology Stack**:
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Axios** for API communications
- **React Router** for navigation
- **Context API** for state management

## 🔐 Authentication Flow

The authentication system follows OAuth 2.0 standards with OTP verification:

### Step-by-Step Flow

1. **User Enters UIN** 
   ```
   User → Frontend → Auth Service → SLUDI
   ```
   - User enters their Unique Identification Number (UIN)
   - Auth service validates UIN with SLUDI
   - Temporary session created

2. **OTP Verification**
   ```
   SLUDI → SMS Gateway → User's Phone
   User → Frontend → Auth Service → SLUDI
   ```
   - SLUDI sends OTP via SMS to registered phone
   - User enters OTP in frontend
   - Auth service verifies OTP with SLUDI
   - Authorization code generated

3. **Token Exchange**
   ```
   Auth Service → SLUDI → NDX Access
   ```
   - Auth code exchanged for access/refresh tokens
   - User profile fetched from SLUDI
   - User record created/updated in database

4. **Session Creation**
   ```
   Auth Service → NutriConnect Service → Database
   ```
   - User session created in NutriConnect service
   - Session stored with TTL (24 hours)
   - Frontend receives session tokens

5. **Dashboard Access**
   ```
   Frontend → NutriConnect Service → NDX/PayDPI
   ```
   - User redirected to dashboard
   - Full access to meals, orders, and payments
   - Session validated on each request

### Authentication Security

- **Secure Session IDs**: 32-byte hex strings
- **Token Validation**: Cross-service validation
- **TTL Management**: Automatic session expiry
- **Activity Tracking**: Last activity timestamps
- **IP & User Agent Logging**: Security monitoring
- **Automatic Cleanup**: Expired session removal

## 💳 Payment Integration

### PayDPI Integration

NutriConnect integrates with PayDPI for secure payment processing:

**Payment Flow**:
1. User selects meals and proceeds to checkout
2. System calculates total amount and applicable subsidies
3. Payment request sent to PayDPI with order details
4. User completes payment via PayDPI interface
5. Payment confirmation received and order confirmed
6. Receipt generated and order queued for fulfillment

**Payment Methods Supported**:
- **Credit/Debit Cards**: Visa, Mastercard, Local cards
- **Digital Wallets**: Mobile money, e-wallets
- **Bank Transfers**: Direct bank integration
- **Subsidies**: Automatic government subsidy application

**Security Features**:
- End-to-end encryption
- PCI DSS compliance
- Fraud detection
- 3D Secure authentication
- Transaction monitoring

## 🤖 AI Features

### AI-Powered Meal Recommendations

NutriConnect uses **Google Gemini AI** to provide personalized meal suggestions:

**Features**:
- **Personalized Recommendations**: Based on user's dietary preferences and history
- **Nutritional Analysis**: Ensures balanced macro and micronutrient intake
- **Allergy Considerations**: Respects dietary restrictions and allergies
- **Cultural Preferences**: Considers local food preferences and availability
- **Health Goals**: Aligns recommendations with user's health objectives

**API Integration**:
```javascript
// AI Suggestion Request
POST /api/ai/food-suggestions
{
  "uin": "UIN001",
  "dietaryPreferences": ["vegetarian", "low-sodium"],
  "allergies": ["nuts", "dairy"],
  "healthGoals": ["weight-maintenance", "high-protein"],
  "currentNutrition": { "calories": 1200, "protein": 45 }
}

// AI Response
{
  "suggestions": [
    {
      "mealName": "Grilled Vegetable Quinoa Bowl",
      "nutritionScore": 95,
      "calories": 420,
      "protein": 18,
      "reasoning": "High protein content complements your daily goals..."
    }
  ]
}
```

## 🔒 Session Management

### Advanced Session Features

**Session Lifecycle**:
- **Creation**: After successful OAuth authentication
- **Validation**: On every API request
- **Extension**: Automatic renewal on user activity
- **Expiration**: 24-hour TTL with cleanup
- **Termination**: Manual logout or security triggers

**Database Schema**:
```javascript
// UserSession Model
{
  sessionId: String (unique, 32-byte hex),
  uin: String (user identifier),
  accessToken: String (OAuth token),
  refreshToken: String (token refresh),
  userProfile: {
    uin: String,
    name: String,
    email: String,
    phone: String,
    guardianOf: [String] // Child UINs for guardians
  },
  loginTimestamp: Date,
  lastActivity: Date,
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  expiresAt: Date (TTL: 24 hours)
}
```

**Security Measures**:
- Session tokens stored securely in localStorage
- Automatic cleanup of expired sessions
- IP address and user agent validation
- Multi-device session management
- Force logout capability for security

## 📊 API Documentation

### Core API Endpoints

#### Authentication Endpoints
```http
# Initiate login
POST /auth/login
Content-Type: application/json
{
  "uin": "UIN001"
}

# Verify OTP
POST /auth/verify-otp  
Content-Type: application/json
{
  "sessionId": "session_id_here",
  "otp": "123456"
}

# Exchange token
POST /auth/exchange-token
Content-Type: application/json
{
  "sessionId": "session_id_here", 
  "code": "auth_code_here"
}
```

#### Menu & Orders Endpoints
```http
# Get today's menu
GET /api/menu/today
Authorization: Bearer <access_token>

# Place order
POST /api/orders
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "items": [
    {
      "menuItemId": "item_123",
      "quantity": 1,
      "specialInstructions": "No onions"
    }
  ],
  "deliveryDate": "2025-08-27",
  "mealType": "lunch"
}
```

#### Payment Endpoints
```http
# Initiate payment
POST /payments/initiate
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "orderId": "order_456",
  "amount": 250.00,
  "currency": "LKR",
  "paymentMethod": "card"
}
```

### Response Formats

All API responses follow a consistent format:

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-08-26T10:30:00Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      // Error details here
    }
  },
  "timestamp": "2025-08-26T10:30:00Z"
}
```

## 🧪 Testing

### Test Users (SLUDI Mock)

For development and testing, use these predefined test users:

**Happy Path Users** ✅:
- **UIN001** (John Doe) - OTP: `123456`
- **UIN002** (Jane Smith) - OTP: `654321` 
- **UIN005** (Charlie Green) - OTP: `999999`

**Sad Path Users** ❌:
- **UIN003** (Inactive Account) - OTP: `111111` (Will fail - inactive user)
- **UIN004** (Missing Phone) - No OTP (Will fail - no phone number)

### Payment Test Scenarios

**PayDPI Mock Payment Scenarios**:
- **Amounts ≤ 100**: Always successful
- **Amount = 999**: Insufficient funds error
- **Amount = 888**: Card declined error
- **Amount = 777**: Network error
- **Amount > 1000**: Limit exceeded error
- **Payment Method = 'subsidy'**: Always successful

### Running Tests

```bash
# Run unit tests
npm run test

# Run integration tests  
npm run test:integration

# Run e2e tests
npm run test:e2e

# Test coverage report
npm run test:coverage
```

### Testing Authentication Flow

1. **Start all services** (see Quick Start section)
2. **Navigate to** http://localhost:3000
3. **Enter UIN**: Use `UIN001` for happy path testing
4. **Enter OTP**: Use `123456` when prompted
5. **Verify redirect**: Should redirect to dashboard
6. **Check session**: Verify localStorage contains tokens
7. **Test features**: Place orders, view menu, check payments

## 🌍 Environment Configuration

### Development Environment
```bash
# Development settings
NODE_ENV=development
LOG_LEVEL=debug

# Database (local MongoDB)
MONGODB_URI=mongodb://localhost:27017/nutriconnect

# Mock services
SLUDI_BASE_URL=http://localhost:4001
PAYDPI_BASE_URL=http://localhost:4002
```

### Production Environment
```bash
# Production settings
NODE_ENV=production
LOG_LEVEL=error

# Database (MongoDB Atlas or production cluster)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutriconnect

# Production services
SLUDI_BASE_URL=https://sludi.gov.lk
PAYDPI_BASE_URL=https://api.paydpi.lk
NDX_BASE_URL=https://api.ndx.gov.lk

# Security
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Service-Specific Configuration

Each service has its own configuration management:

**authentication-service/config/sludi.js**:
```javascript
module.exports = {
  baseUrl: process.env.SLUDI_BASE_URL || 'http://localhost:4001',
  clientId: process.env.CLIENT_ID || 'nutriconnect-client',
  clientSecret: process.env.CLIENT_SECRET || 'nutriconnect-secret-key',
  tokenExpiry: 3600, // 1 hour
  otpExpiry: 300, // 5 minutes
  maxOtpAttempts: 3
};
```

**nutriconnect-service/config/app.js**:
```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development'
  },
  business: {
    order: {
      maxItemsPerOrder: 10,
      maxOrdersPerDay: 5,
      cancelWindowHours: 2
    },
    nutrition: {
      dailyCalorieTarget: 2000,
      macroTargets: {
        proteinPercent: 20,
        carbohydratesPercent: 50,
        fatPercent: 30
      }
    }
  }
};
```

## 🚀 Deployment

### Docker Deployment

**Dockerfile Example** (nutriconnect-service):
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  auth-service:
    build: ./authentication-service
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nutriconnect_auth
      - NODE_ENV=production
    depends_on:
      - mongodb

  nutriconnect-service:
    build: ./nutriconnect-service
    ports:
      - "3002:3002"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nutriconnect
      - NODE_ENV=production
    depends_on:
      - mongodb
      - auth-service

  payment-service:
    build: ./payment-service
    ports:
      - "3003:3003"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nutriconnect_payments
      - NODE_ENV=production
    depends_on:
      - mongodb

  frontend:
    build: ./nutriconnect_frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_AUTH_API_URL=http://localhost:3001
      - REACT_APP_NUTRICONNECT_API_URL=http://localhost:3002
    depends_on:
      - auth-service
      - nutriconnect-service

volumes:
  mongo_data:
```

### Cloud Deployment (AWS/Azure/GCP)

**Kubernetes Deployment** (example for NutriConnect service):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nutriconnect-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nutriconnect-service
  template:
    metadata:
      labels:
        app: nutriconnect-service
    spec:
      containers:
      - name: nutriconnect-service
        image: nutriconnect/nutriconnect-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: nutriconnect-secrets
              key: mongodb-uri
        - name: NODE_ENV
          value: "production"
```

### CI/CD Pipeline

**GitHub Actions Example** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy NutriConnect

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and deploy
      run: |
        docker build -t nutriconnect/app .
        docker push nutriconnect/app:latest
        # Deploy to production
```

## 🤝 Contributing

We welcome contributions to NutriConnect! Please follow these guidelines:

### Development Setup
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Install dependencies**: `npm run install-all`
4. **Run tests**: `npm test`
5. **Make your changes**
6. **Test thoroughly**
7. **Submit a pull request**

### Code Style
- Use **ESLint** and **Prettier** for code formatting
- Follow **TypeScript** best practices
- Write **comprehensive tests** for new features
- Document API changes in the README

### Commit Convention
```
type(scope): description

feat(auth): add two-factor authentication
fix(payment): resolve PayDPI timeout issue
docs(readme): update installation instructions
```

### Pull Request Process
1. Ensure all tests pass
2. Update documentation as needed
3. Get approval from at least 2 reviewers
4. Squash commits before merging

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **SLUDI** for OAuth integration and user authentication
- **NDX** for health and canteen menu data
- **PayDPI** for payment processing infrastructure
- **Google Gemini AI** for intelligent meal recommendations
- **MongoDB** for robust data storage
- **React Team** for the excellent frontend framework

## 📞 Support

For support, please contact:
- **Email**: support@nutriconnect.lk
- **GitHub Issues**: [Create an issue](https://github.com/nutriconnect/issues)
- **Documentation**: [docs.nutriconnect.lk](https://docs.nutriconnect.lk)

---

**NutriConnect** - *Nourishing the future, one meal at a time* 🍎✨