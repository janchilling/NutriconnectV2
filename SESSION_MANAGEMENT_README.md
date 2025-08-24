# NutriConnect Session Management System

This document outlines the complete session management system implemented for NutriConnect after successful OTP authentication.

## 🔄 Complete Authentication Flow

### 1. **User Login Process**
```
1. User enters UIN → Authentication Service creates temp session
2. User enters OTP → SLUDI validates OTP and returns auth code
3. System exchanges code for access token → Gets user profile
4. NutriConnect creates user session → Stores in database
5. User redirected to Dashboard → Full access granted
```

### 2. **Database Schema**

#### Users Table (authentication-service)
```javascript
{
  uin: String (unique),
  name: String,
  phone: String,
  email: String,
  guardianOf: [String],
  lastLogin: Date,
  isActive: Boolean,
  createdVia: String
}
```

#### Sessions Table (authentication-service) 
```javascript
{
  sessionId: String (unique),
  uin: String,
  state: String,
  step: String, // 'waiting_for_otp' | 'otp_verified' | 'token_exchanged'
  authCode: String,
  expiresAt: Date (10 min TTL)
}
```

#### UserSessions Table (nutriconnect-service)
```javascript
{
  sessionId: String (unique),
  uin: String,
  accessToken: String,
  refreshToken: String,
  userProfile: {
    uin: String,
    name: String,
    phone: String,
    email: String,
    guardianOf: [String]
  },
  loginTimestamp: Date,
  lastActivity: Date,
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  expiresAt: Date (24 hours TTL)
}
```

## 🚀 Backend Implementation

### New Files Created:

#### 1. **UserSession Model** (`nutriconnect-service/models/UserSession.js`)
- MongoDB model for storing user sessions
- TTL indexing for automatic cleanup
- Instance methods for session management
- Static methods for queries

#### 2. **Session Service** (`nutriconnect-service/services/sessionService.js`)
- `createUserSession()` - Creates new session after auth
- `validateSession()` - Validates existing sessions
- `getSessionByToken()` - Gets session by access token
- `deactivateSession()` - Logs out user (single session)
- `deactivateAllUserSessions()` - Logs out from all devices
- `cleanupExpiredSessions()` - Maintenance function

#### 3. **Session Routes** (`nutriconnect-service/routes/session.js`)
- `POST /api/session/create` - Create new session
- `GET /api/session/:sessionId` - Get session details
- `POST /api/session/validate` - Validate session/token
- `PUT /api/session/:sessionId/activity` - Update activity
- `PUT /api/session/:sessionId/extend` - Extend session
- `DELETE /api/session/:sessionId` - Logout (deactivate)
- `GET /api/session/user/:uin` - Get all user sessions
- `DELETE /api/session/user/:uin` - Logout from all devices

## 🎨 Frontend Implementation

### Updated Files:

#### 1. **API Service** (`src/services/api.ts`)
- Added `sessionService` with all session management functions
- Updated `authService.logout()` to deactivate server sessions
- Session validation and management methods

#### 2. **Login Component** (`src/components/Login/Login.tsx`)
- **Step 1**: Enter UIN → Create auth session
- **Step 2**: Enter OTP → Verify OTP & get auth code
- **Step 3**: Exchange token → Get access token & user profile
- **Step 4**: Create user session → Store sessionId & redirect
- Comprehensive error handling and loading states

#### 3. **Dashboard Component** (`src/components/Dashboard/Dashboard.tsx`)
- Updated logout to properly clean up sessions
- Session-aware authentication checks
- Async logout with fallback

#### 4. **App Routing** (`src/App.tsx`)
- Added `SessionValidator` wrapper
- Protected routes with proper authentication
- Automatic session validation on app startup

#### 5. **Session Validator** (`src/components/common/SessionValidator.tsx`)
- Validates sessions on app load
- Auto-cleanup invalid sessions
- Loading state during validation

## 🔐 Security Features

### Session Security
- **Secure Session IDs**: 32-byte hex strings
- **Token Validation**: Cross-validates with auth service
- **Activity Tracking**: Last activity timestamp
- **IP & User Agent**: Logged for security monitoring
- **TTL Expiry**: 24-hour automatic expiration
- **Automatic Cleanup**: Removes expired/old sessions

### Frontend Security
- **Token Storage**: localStorage with automatic cleanup
- **Route Protection**: Protected routes check authentication
- **Session Validation**: Validates sessions on app startup
- **Graceful Logout**: Server-side session deactivation

## 📊 Session Management Features

### User Experience
- **Seamless Login**: OTP → Dashboard redirect
- **Session Persistence**: Stays logged in for 24 hours
- **Multi-Device Support**: Up to 3 concurrent sessions
- **Auto-Cleanup**: Old sessions automatically removed
- **Activity Updates**: Sessions extend on activity

### Admin Features
- **Session Monitoring**: View all user sessions
- **Force Logout**: Deactivate user sessions
- **Cleanup Tools**: Remove expired sessions
- **Session Analytics**: Login times, IP addresses, user agents

## 🔧 Environment Setup

### Required Environment Variables:
```bash
# nutriconnect-service/.env
MONGODB_URI=mongodb://localhost:27017/nutriconnect
AUTH_SERVICE_URL=http://localhost:3001
PORT=3002

# authentication-service/.env
MONGODB_URI=mongodb://localhost:27017/authentication
SLUDI_SERVICE_URL=http://localhost:4000
PORT=3001

# frontend/.env
REACT_APP_AUTH_API_URL=http://localhost:3001
REACT_APP_NUTRICONNECT_API_URL=http://localhost:3002
```

## 🚦 Testing the Complete Flow

### 1. **Start Services**
```bash
# Terminal 1: SLUDI Mock Service
cd sludi-mock-service && npm start

# Terminal 2: Authentication Service
cd authentication-service && npm start

# Terminal 3: NutriConnect Service
cd nutriconnect-service && npm start

# Terminal 4: Frontend
cd nutriconnect_frontend && npm start
```

### 2. **Test Authentication Flow**
1. Go to `http://localhost:3000`
2. Enter UIN (e.g., `UIN001`)
3. Enter OTP `123456` (from SLUDI mock)
4. Should redirect to Dashboard
5. Check browser localStorage for tokens & sessionId
6. Check MongoDB for user session record

### 3. **Test Session Features**
- **Dashboard Access**: Should work seamlessly
- **Menu Viewing**: Should load today's menu
- **Order Placement**: Should create orders
- **Logout**: Should clear sessions and redirect
- **Session Expiry**: Should auto-logout after 24 hours

## 🎯 Key Benefits

### For Users
- ✅ **Single Sign-On**: Login once, access everything
- ✅ **Persistent Sessions**: Stay logged in across browser closes
- ✅ **Multi-Device**: Use from multiple devices
- ✅ **Auto-Logout**: Security with automatic session expiry
- ✅ **Fast Access**: No re-authentication for 24 hours

### For System
- ✅ **Scalable**: Handles multiple concurrent users
- ✅ **Secure**: Proper token validation and cleanup
- ✅ **Maintainable**: Organized session management
- ✅ **Auditable**: Complete session logging and tracking
- ✅ **Efficient**: Automatic cleanup of expired sessions

The session management system is now fully implemented and ready for production use! 🎉