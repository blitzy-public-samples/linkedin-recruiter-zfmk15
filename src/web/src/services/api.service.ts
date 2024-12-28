/**
 * @file Enhanced API Service with Security Monitoring
 * @version 1.0.0
 * @description Core API service providing centralized HTTP client functionality with
 * comprehensive security monitoring, error handling, and rate limiting
 * 
 * Dependencies:
 * - axios: ^1.4.0
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse,
  AxiosError 
} from 'axios';

import { 
  API_CONFIG, 
  BASE_URL, 
  API_VERSION, 
  ENDPOINTS, 
  RATE_LIMITS 
} from '../config/api.config';

import { 
  handleApiError, 
  logError, 
  ErrorSeverity,
  ApiError 
} from '../utils/errorHandling';

import { 
  LoginRequest, 
  JWTPayload 
} from '../types/auth.types';

/**
 * Interface for tracking request metrics
 */
interface RequestMetrics {
  startTime: number;
  endpoint: string;
  method: string;
}

/**
 * Interface for rate limit tracking
 */
interface RateLimitTracker {
  [endpoint: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Enhanced API Service class with security monitoring
 */
export class ApiService {
  private readonly client: AxiosInstance;
  private readonly rateLimitTracker: RateLimitTracker = {};
  private metrics: RequestMetrics | null = null;

  constructor() {
    // Initialize axios instance with enhanced security configuration
    this.client = axios.create({
      baseURL: `${BASE_URL}/api/${API_VERSION}`,
      timeout: API_CONFIG.TIMEOUTS.DEFAULT,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Request-ID': this.generateRequestId()
      },
      withCredentials: true // Enable secure cookie handling
    });

    this.setupInterceptors();
  }

  /**
   * Configures enhanced request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptors
    this.client.interceptors.request.use(
      (config) => {
        // Start request timing tracking
        this.metrics = {
          startTime: Date.now(),
          endpoint: config.url || 'unknown',
          method: config.method?.toUpperCase() || 'unknown'
        };

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add security headers
        config.headers['X-Request-Time'] = new Date().toISOString();
        
        return config;
      },
      (error) => {
        this.handleRequestError(error);
        return Promise.reject(error);
      }
    );

    // Response interceptors
    this.client.interceptors.response.use(
      (response) => {
        this.trackResponseMetrics(response);
        return response;
      },
      async (error: AxiosError) => {
        // Handle token refresh
        if (this.isTokenExpiredError(error)) {
          return this.handleTokenRefresh(error);
        }

        // Enhanced error handling with security monitoring
        const apiError = handleApiError(error, {
          includeStack: true,
          logToMonitoring: true
        });

        // Log error with security context
        logError(apiError, 'API Request Failed', {
          securityContext: {
            endpoint: this.metrics?.endpoint,
            method: this.metrics?.method,
            duration: this.getRequestDuration()
          }
        });

        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Makes a GET request with enhanced monitoring
   */
  public async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    await this.checkRateLimit(endpoint);

    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Makes a POST request with enhanced monitoring
   */
  public async post<T>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    await this.checkRateLimit(endpoint);

    try {
      const response = await this.client.post<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Makes a PUT request with enhanced monitoring
   */
  public async put<T>(
    endpoint: string, 
    data?: unknown, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    await this.checkRateLimit(endpoint);

    try {
      const response = await this.client.put<T>(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Makes a DELETE request with enhanced monitoring
   */
  public async delete<T>(endpoint: string): Promise<T> {
    await this.checkRateLimit(endpoint);

    try {
      const response = await this.client.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Handles JWT token refresh with retry logic
   */
  private async handleTokenRefresh(error: AxiosError): Promise<AxiosResponse> {
    try {
      // Attempt token refresh
      const response = await this.client.post(ENDPOINTS.AUTH.REFRESH);
      const newToken = response.data.token;

      // Update stored token
      this.setAuthToken(newToken);

      // Retry original request
      const failedRequest = error.config;
      if (failedRequest) {
        failedRequest.headers.Authorization = `Bearer ${newToken}`;
        return this.client(failedRequest);
      }

      throw new Error('Failed to retry request after token refresh');
    } catch (refreshError) {
      // Handle refresh failure - force re-login
      this.clearAuthToken();
      throw handleApiError(refreshError);
    }
  }

  /**
   * Checks and enforces rate limits
   */
  private async checkRateLimit(endpoint: string): Promise<void> {
    const limit = this.getRateLimit(endpoint);
    if (!limit) return;

    const tracker = this.rateLimitTracker[endpoint] || {
      count: 0,
      resetTime: Date.now() + 3600000 // 1 hour
    };

    if (tracker.count >= limit) {
      if (Date.now() < tracker.resetTime) {
        throw new Error(`Rate limit exceeded for ${endpoint}`);
      }
      // Reset tracker if time window has passed
      tracker.count = 0;
      tracker.resetTime = Date.now() + 3600000;
    }

    tracker.count++;
    this.rateLimitTracker[endpoint] = tracker;
  }

  /**
   * Gets rate limit for endpoint
   */
  private getRateLimit(endpoint: string): number {
    if (endpoint.includes('/search')) return RATE_LIMITS.SEARCH;
    if (endpoint.includes('/profiles')) return RATE_LIMITS.PROFILES;
    if (endpoint.includes('/analytics')) return RATE_LIMITS.ANALYTICS;
    if (endpoint.includes('/export')) return RATE_LIMITS.EXPORT;
    return 0; // No limit
  }

  /**
   * Tracks response timing metrics
   */
  private trackResponseMetrics(response: AxiosResponse): void {
    if (!this.metrics) return;

    const duration = this.getRequestDuration();
    const status = response.status;

    // Log metrics for monitoring
    console.info('API Request Metrics', {
      endpoint: this.metrics.endpoint,
      method: this.metrics.method,
      duration,
      status
    });

    this.metrics = null;
  }

  /**
   * Gets current request duration in ms
   */
  private getRequestDuration(): number {
    if (!this.metrics) return 0;
    return Date.now() - this.metrics.startTime;
  }

  /**
   * Generates unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if error is due to expired token
   */
  private isTokenExpiredError(error: AxiosError): boolean {
    return error.response?.status === 401 && 
           error.response?.data?.code === 'TOKEN_EXPIRED';
  }

  /**
   * Enhanced error handling with security monitoring
   */
  private handleRequestError(error: unknown): ApiError {
    const apiError = handleApiError(error as Error);

    // Add request context
    if (this.metrics) {
      apiError.details = {
        ...apiError.details,
        endpoint: this.metrics.endpoint,
        method: this.metrics.method,
        duration: this.getRequestDuration()
      };
    }

    // Set critical severity for security-related errors
    if (apiError.status === 401 || apiError.status === 403) {
      apiError.severity = ErrorSeverity.CRITICAL;
    }

    return apiError;
  }

  // Auth token management methods
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }
}

// Export singleton instance
export const apiService = new ApiService();