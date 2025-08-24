import axios, { AxiosResponse } from 'axios';

const AUTH_BASE_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:3001';
const NUTRICONNECT_BASE_URL = process.env.REACT_APP_NUTRICONNECT_API_URL || 'http://localhost:3002';

// Create axios instances
const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
});

const nutriconnectApi = axios.create({
  baseURL: NUTRICONNECT_BASE_URL,
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
    const response = await nutriconnectApi.get('/menu/today');
    return response.data;
  },

  async getMenuByCategory(category: string): Promise<MenuResponse> {
    const response = await nutriconnectApi.get(`/menu/category/${category}`);
    return response.data;
  },

  async getMenuItem(itemId: string): Promise<MenuResponse> {
    const response = await nutriconnectApi.get(`/menu/item/${itemId}`);
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

    const response = await nutriconnectApi.get(`/menu/search?${params.toString()}`);
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
      const response = await nutriconnectApi.post('/session/create', userData);
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
      const response = await nutriconnectApi.post('/session/validate', { sessionId });
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
      const response = await nutriconnectApi.get(`/session/${sessionId}`);
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
      const response = await nutriconnectApi.delete(`/session/${sessionId}`);
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
      const response = await nutriconnectApi.put(`/session/${sessionId}/extend`, { hours });
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
    const response = await nutriconnectApi.post('/orders', {
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

    const response = await nutriconnectApi.get(`/orders?${searchParams.toString()}`);
    return response.data;
  },

  async getOrder(orderId: string): Promise<OrderResponse> {
    const response = await nutriconnectApi.get(`/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(orderId: string, reason?: string): Promise<OrderResponse> {
    const response = await nutriconnectApi.put(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  async getTodaysOrderSummary(): Promise<OrderResponse> {
    const response = await nutriconnectApi.get('/orders/today/summary');
    return response.data;
  },
};

export { authApi, nutriconnectApi };