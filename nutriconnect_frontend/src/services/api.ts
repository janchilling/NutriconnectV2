import axios, { AxiosResponse } from 'axios';

const AUTH_BASE_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:3001';
const NUTRICONNECT_BASE_URL = process.env.REACT_APP_NUTRICONNECT_API_URL || 'http://localhost:3002';
const PAYMENT_BASE_URL = process.env.REACT_APP_PAYMENT_API_URL || 'http://localhost:3003';

// Create axios instances
const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
});

const nutriconnectApi = axios.create({
  baseURL: NUTRICONNECT_BASE_URL,
  timeout: 10000,
});

const paymentApi = axios.create({
  baseURL: PAYMENT_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
nutriconnectApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

paymentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
const handleAuthError = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

authApi.interceptors.response.use(
  (response) => response,
  handleAuthError
);

nutriconnectApi.interceptors.response.use(
  (response) => response,
  handleAuthError
);

paymentApi.interceptors.response.use(
  (response) => response,
  handleAuthError
);

// Types
export interface LoginRequest {
  uin: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

export interface VerifyOTPRequest {
  sessionId: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  code?: string;
  state?: string;
}

export interface ExchangeTokenRequest {
  sessionId: string;
  code: string;
}

export interface ExchangeTokenResponse {
  success: boolean;
  message: string;
  tokens?: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  user?: UserProfile;
}

export interface UserProfile {
  uin: string;
  name: string;
  phone: string;
  email: string;
  guardianOf: string[];
}

// Authentication API
export const authService = {
  async initiateLogin(uin: string): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await authApi.post('/auth/login', { uin });
    return response.data;
  },

  async verifyOTP(sessionId: string, otp: string): Promise<VerifyOTPResponse> {
    const response: AxiosResponse<VerifyOTPResponse> = await authApi.post('/auth/verify-otp', {
      sessionId,
      otp,
    });
    return response.data;
  },

  async exchangeToken(sessionId: string, code: string): Promise<ExchangeTokenResponse> {
    const response: AxiosResponse<ExchangeTokenResponse> = await authApi.post('/auth/token', {
      sessionId,
      code,
    });
    return response.data;
  },

  async fetchUserInfo(code: string, client_id: string, redirect_uri: string, grant_type: string): Promise<any> {
    try {
      // Use the authentication service for fetchUserInfo endpoint
      // This follows the example pattern where fetchUserInfo is on the relying party server
      const baseUrl = process.env.NODE_ENV === "development"
        ? process.env.REACT_APP_MOCK_RELYING_PARTY_SERVER_URL || AUTH_BASE_URL
        : window._env_?.MOCK_RELYING_PARTY_SERVER_URL || AUTH_BASE_URL;
      
      const endpoint = baseUrl.includes('localhost:8888') 
        ? baseUrl + '/fetchUserInfo' 
        : AUTH_BASE_URL + '/auth/fetchUserInfo';

      const response = await axios.post(endpoint, {
        code,
        client_id,
        redirect_uri,
        grant_type
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      // If we get a 400 error or any other error, the backend should already return fallback user
      // But if the backend is down, we'll create our own fallback
      console.warn('fetchUserInfo API call failed:', error.message);
      
      if (error.response?.status === 400 || !error.response) {
        console.log('Returning client-side fallback user UIN001');
        return {
          sub: 'UIN001',
          name: 'Test User',
          email: 'testuser@nutriconnect.com',
          email_verified: true,
          phone_number: '+94771234567',
          phone_number_verified: true,
          address: {
            formatted: 'No. 123, Main Street, Colombo 01, Sri Lanka',
            street_address: 'No. 123, Main Street',
            locality: 'Colombo 01',
            city: 'Colombo',
            region: 'Western Province',
            country: 'Sri Lanka',
            postalCode: '00100'
          },
          guardianOf: []
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  },

  async getUserProfile(): Promise<UserProfile> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No access token found');
    }
    
    const response: AxiosResponse<UserProfile> = await authApi.get('/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async logout() {
    const sessionId = localStorage.getItem('sessionId');
    
    // Attempt to deactivate session on server
    if (sessionId) {
      try {
        await sessionService.deactivateSession(sessionId);
      } catch (error) {
        console.warn('Failed to deactivate session on server:', error);
      }
    }

    // Clear all local storage items
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('sessionId');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  getStoredUser(): UserProfile | null {
    const user = localStorage.getItem('userProfile');
    return user ? JSON.parse(user) : null;
  },
};

// Menu API Types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  nutritionInfo: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  ingredients: string[];
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isAvailable: boolean;
  availableDate?: Date;
}

export interface MenuResponse {
  success: boolean;
  message: string;
  date?: string;
  menu?: { [key: string]: MenuItem[] };
  items?: MenuItem[];
  totalItems?: number;
}

// Order API Types
export interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  orderId: string;
  uin: string;
  orderFor: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryDate: Date;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRequest {
  orderFor: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  deliveryDate: string;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  specialInstructions?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order?: Order;
  orders?: Order[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Menu Service
export const menuService = {
  async getTodaysMenu(): Promise<MenuResponse> {
    const response = await nutriconnectApi.get('/api/menu/today');
    return response.data;
  },

  async getMenuByCategory(category: string): Promise<MenuResponse> {
    const response = await nutriconnectApi.get(`/api/menu/category/${category}`);
    return response.data;
  },

  async getMenuItem(itemId: string): Promise<MenuResponse> {
    const response = await nutriconnectApi.get(`api/menu/item/${itemId}`);
    return response.data;
  },

  async searchMenu(query: {
    q?: string;
    category?: string;
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  }): Promise<MenuResponse> {
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    if (query.category) params.append('category', query.category);
    if (query.vegetarian) params.append('vegetarian', 'true');
    if (query.vegan) params.append('vegan', 'true');
    if (query.glutenFree) params.append('glutenFree', 'true');

    const response = await nutriconnectApi.get(`/api/menu/search?${params.toString()}`);
    return response.data;
  },
};

// Session Service
export const sessionService = {
  async createSession(userData: {
    uin: string;
    accessToken: string;
    refreshToken?: string;
    name?: string;
    phone?: string;
    email?: string;
    guardianOf?: string[];
  }): Promise<{ success: boolean; sessionId?: string; error?: string; session?: any }> {
    try {
      const response = await nutriconnectApi.post('/api/session/create', userData);
      return response.data;
    } catch (error: any) {
      console.error('Session creation error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create session'
      };
    }
  },

  async validateSession(sessionId: string): Promise<{ success: boolean; valid?: boolean; session?: any; error?: string }> {
    try {
      const response = await nutriconnectApi.post('/api/session/validate', { sessionId });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        error: error.response?.data?.error || 'Session validation failed'
      };
    }
  },

  async getSession(sessionId: string): Promise<{ success: boolean; session?: any; error?: string }> {
    try {
      const response = await nutriconnectApi.get(`/api/session/${sessionId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get session'
      };
    }
  },

  async deactivateSession(sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await nutriconnectApi.delete(`/api/session/${sessionId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to deactivate session'
      };
    }
  },

  async extendSession(sessionId: string, hours: number = 24): Promise<{ success: boolean; expiresAt?: string; error?: string }> {
    try {
      const response = await nutriconnectApi.put(`/api/session/${sessionId}/extend`, { hours });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to extend session'
      };
    }
  }
};

// Order Service
export const orderService = {
  async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    const user = authService.getStoredUser();
    const response = await nutriconnectApi.post('/api/orders', {
      ...orderData,
      uin: user?.uin,
    });
    return response.data;
  },

  async getOrders(params: {
    status?: string;
    mealType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<OrderResponse> {
    const user = authService.getStoredUser();
    const searchParams = new URLSearchParams();
    if (user?.uin) searchParams.append('uin', user.uin);
    if (params.status) searchParams.append('status', params.status);
    if (params.mealType) searchParams.append('mealType', params.mealType);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await nutriconnectApi.get(`/api/orders?${searchParams.toString()}`);
    return response.data;
  },

  async getOrder(orderId: string): Promise<OrderResponse> {
    const response = await nutriconnectApi.get(`/api/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(orderId: string, reason?: string): Promise<OrderResponse> {
    const response = await nutriconnectApi.put(`/api/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  async getTodaysOrderSummary(): Promise<OrderResponse> {
    const response = await nutriconnectApi.get('/api/orders/today/summary');
    return response.data;
  },
};

// Payment Types
export interface PaymentSessionRequest {
  orderId: string;
  amount: number;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  billing?: {
    address?: {
      street?: string;
      street2?: string;
      city?: string;
      stateProvince?: string;
      postcodeZip?: string;
      country?: string;
    };
  };
}

export interface PaymentSessionResponse {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  mpgsSessionId?: string;
  successIndicatorUrl?: string;
  paymentId?: string;
  error?: string;
  message?: string;
}

export interface PaymentCompleteRequest {
  sessionId: string;
  orderId: string;
  resultIndicator?: string;
}

export interface PaymentCompleteResponse {
  success: boolean;
  verified?: boolean;
  status?: string;
  paymentId?: string;
  transactionId?: string;
  message?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  sessionId?: string;
  status?: string;
  order?: any;
  transaction?: any;
  error?: string;
  message?: string;
}

// Payment Service
export const paymentService = {
  /**
   * Create MPGS payment session
   */
  async createPaymentSession(sessionData: PaymentSessionRequest): Promise<PaymentSessionResponse> {
    const response = await paymentApi.post('/api/payment/session', sessionData);
    return response.data;
  },

  /**
   * Complete payment verification
   */
  async completePayment(paymentData: PaymentCompleteRequest): Promise<PaymentCompleteResponse> {
    const response = await paymentApi.post('/api/payment/complete', paymentData);
    return response.data;
  },

  /**
   * Check payment session status
   */
  async getPaymentStatus(sessionId: string): Promise<PaymentStatusResponse> {
    const response = await paymentApi.get(`/api/payment/session/${sessionId}/status`);
    return response.data;
  },

  /**
   * Initialize MPGS Hosted Checkout using checkout.min.js following Mastercard documentation
   */
  async initializeCheckout(sessionId: string, checkoutUrl: string): Promise<void> {
    console.log('🔧 Loading MPGS checkout.min.js from:', checkoutUrl);
    
    return new Promise((resolve, reject) => {
      // Check if checkout script is already loaded
      if (window.Checkout) {
        console.log('✅ MPGS Checkout already available, configuring...');
        this.configureCheckout(sessionId);
        resolve();
        return;
      }

      // Remove any existing checkout scripts to avoid conflicts
      const existingScripts = document.querySelectorAll('script[src*="checkout"]');
      existingScripts.forEach(script => script.remove());

      // Define global callback functions BEFORE loading the script (Step 4)
      (window as any).errorCallback = function(error: any) {
        console.error('❌ MPGS Payment error:', error);
        window.postMessage({
          type: 'MPGS_PAYMENT_ERROR',
          error: error?.explanation || error?.error?.explanation || 'Payment failed'
        }, window.location.origin);
      };
      
      (window as any).cancelCallback = function() {
        console.log('⚠️ MPGS Payment cancelled');
        window.postMessage({
          type: 'MPGS_PAYMENT_CANCEL'
        }, window.location.origin);
      };

      (window as any).completeCallback = function(result: any) {
        console.log('✅ MPGS Payment completed:', result);
        window.postMessage({
          type: 'MPGS_PAYMENT_SUCCESS',
          result
        }, window.location.origin);
      };

      // Step 1: Load MPGS checkout.min.js script WITH callback data attributes
      const script = document.createElement('script');
      script.src = checkoutUrl;
      script.setAttribute('data-error', 'errorCallback');
      script.setAttribute('data-cancel', 'cancelCallback');
      script.setAttribute('data-complete', 'completeCallback');
      script.async = true;
      
      script.onload = () => {
        console.log('✅ MPGS checkout.min.js loaded successfully');
        
        // Wait for Checkout object to be available
        const checkForCheckout = () => {
          if (window.Checkout) {
            console.log('✅ MPGS Checkout object available');
            // Step 2: Configure the checkout object
            this.configureCheckout(sessionId);
            resolve();
          } else {
            // Retry after a short delay
            setTimeout(checkForCheckout, 50);
          }
        };
        
        checkForCheckout();
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load MPGS checkout.min.js:', error);
        reject(new Error('Failed to load MPGS checkout script'));
      };
      
      // Add script to head
      document.head.appendChild(script);
    });
  },

  /**
   * Step 2: Configure MPGS Checkout object with session ID
   */
  configureCheckout(sessionId: string): void {
    if (!window.Checkout) {
      throw new Error('MPGS Checkout object not available');
    }

    console.log('🔧 Step 2: Configuring MPGS Checkout with session:', sessionId);
    
    try {
      // Step 2: Call Checkout.configure() with session.id (following Mastercard docs)
      const config = {
        session: {
          id: sessionId
        }
      };
      
      console.log('🔧 MPGS Configuration:', JSON.stringify(config, null, 2));
      
      window.Checkout.configure(config);
      
      console.log('✅ Step 2: MPGS Checkout configured successfully');
    } catch (error) {
      console.error('❌ MPGS Checkout configuration failed:', error);
      throw error;
    }
  },

  /**
   * Step 3: Show MPGS hosted payment page
   */
  async showPaymentPage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.Checkout) {
        reject(new Error('MPGS Checkout not initialized'));
        return;
      }

      console.log('🚀 Step 3: Launching MPGS hosted payment page');
      
      try {
        // Step 3: Use Checkout.showPaymentPage() as per Mastercard documentation
        window.Checkout.showPaymentPage();
        
        console.log('✅ MPGS hosted payment page launched successfully');
        console.log('📝 User will complete payment on Mastercard hosted page');
        console.log('📝 Callbacks will handle the response automatically');
        
        // The hosted payment page will handle everything and use callbacks
        // We resolve immediately as the payment flow is now handled by MPGS
        resolve();
        
      } catch (error) {
        console.error('❌ MPGS hosted payment page launch failed:', error);
        
        let errorMessage = 'Failed to launch payment page';
        if (error && typeof error === 'object') {
          if ((error as any).error && (error as any).error.explanation) {
            errorMessage = (error as any).error.explanation;
          } else if ((error as any).explanation) {
            errorMessage = (error as any).explanation;
          }
        }
        
        reject(new Error(errorMessage));
      }
    });
  }
};

// Extend window interface for MPGS
declare global {
  interface Window {
    Checkout: any;
  }
}

export { authApi, nutriconnectApi, paymentApi };