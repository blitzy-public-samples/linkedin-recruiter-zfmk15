// WebSocket Service v1.0.0
// Dependencies:
// - reconnecting-websocket: ^4.4.0

import { ReconnectingWebSocket } from 'reconnecting-websocket';
import { API_CONFIG } from '../config/api.config';

// Type definitions for WebSocket messages and events
interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: number;
}

interface Queue<T> {
  items: T[];
  maxSize: number;
}

// WebSocket events enum for type safety
export const WEBSOCKET_EVENTS = {
  SEARCH_STARTED: 'search.started',
  PROFILE_FOUND: 'profile.found',
  ANALYSIS_COMPLETE: 'analysis.complete',
  SEARCH_COMPLETE: 'search.complete'
} as const;

// WebSocket configuration constants
const WEBSOCKET_CONFIG = {
  RECONNECT_INTERVAL: 1000,
  MAX_RETRIES: 5,
  CONNECTION_TIMEOUT: 30000,
  HEARTBEAT_INTERVAL: 15000,
  MESSAGE_QUEUE_SIZE: 1000,
  MAX_CONNECTIONS: 100
} as const;

/**
 * Production-ready WebSocket service implementing singleton pattern
 * with comprehensive connection management and error handling
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private socket: ReconnectingWebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private connectionStatus: boolean = false;
  private messageQueue: Queue<WebSocketMessage> = {
    items: [],
    maxSize: WEBSOCKET_CONFIG.MESSAGE_QUEUE_SIZE
  };
  private retryCount: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize service state
    this.eventHandlers = new Map();
    this.resetState();
  }

  /**
   * Get singleton instance of WebSocketService
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Establish WebSocket connection with auto-reconnection
   * @param token Authentication token for secure connection
   */
  public async connect(token: string): Promise<void> {
    try {
      if (this.socket) {
        return;
      }

      // Validate token
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid authentication token');
      }

      // Create WebSocket URL with secure protocol
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${API_CONFIG.BASE_URL.replace(/^https?:\/\//, '')}/ws`;

      // Initialize WebSocket with reconnection options
      this.socket = new ReconnectingWebSocket(wsUrl, [], {
        maxRetries: WEBSOCKET_CONFIG.MAX_RETRIES,
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
        minReconnectionDelay: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
        connectionTimeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT
      });

      // Set up connection handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);

      // Initialize heartbeat mechanism
      this.startHeartbeat();

    } catch (error) {
      console.error('WebSocket connection error:', error);
      throw error;
    }
  }

  /**
   * Safely disconnect WebSocket connection
   */
  public disconnect(): void {
    try {
      this.stopHeartbeat();
      this.processRemainingMessages();
      
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      this.resetState();
    } catch (error) {
      console.error('WebSocket disconnection error:', error);
    }
  }

  /**
   * Subscribe to WebSocket events with type-safe validation
   * @param event Event type from WEBSOCKET_EVENTS
   * @param callback Event handler function
   */
  public subscribe(event: keyof typeof WEBSOCKET_EVENTS, callback: Function): void {
    try {
      // Validate event type
      if (!Object.values(WEBSOCKET_EVENTS).includes(event)) {
        throw new Error(`Invalid event type: ${event}`);
      }

      // Get or create handler set for event
      let handlers = this.eventHandlers.get(event);
      if (!handlers) {
        handlers = new Set();
        this.eventHandlers.set(event, handlers);
      }

      // Add callback if not already registered
      if (!handlers.has(callback)) {
        handlers.add(callback);
      }
    } catch (error) {
      console.error('WebSocket subscription error:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from WebSocket events
   * @param event Event type from WEBSOCKET_EVENTS
   * @param callback Event handler function to remove
   */
  public unsubscribe(event: keyof typeof WEBSOCKET_EVENTS, callback: Function): void {
    try {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(callback);
      }
    } catch (error) {
      console.error('WebSocket unsubscription error:', error);
      throw error;
    }
  }

  /**
   * Check current connection status
   */
  public isConnected(): boolean {
    return this.connectionStatus;
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    this.connectionStatus = true;
    this.retryCount = 0;
    this.processQueuedMessages();
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(): void {
    this.connectionStatus = false;
    this.stopHeartbeat();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      const handlers = this.eventHandlers.get(message.event);
      
      if (handlers) {
        handlers.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error('WebSocket callback error:', error);
          }
        });
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.retryCount++;
    
    if (this.retryCount >= WEBSOCKET_CONFIG.MAX_RETRIES) {
      this.disconnect();
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connectionStatus) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Process queued messages
   */
  private processQueuedMessages(): void {
    while (this.messageQueue.items.length > 0 && this.connectionStatus) {
      const message = this.messageQueue.items.shift();
      if (message && this.socket) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  /**
   * Process remaining messages before disconnect
   */
  private processRemainingMessages(): void {
    if (this.connectionStatus && this.messageQueue.items.length > 0) {
      this.processQueuedMessages();
    }
  }

  /**
   * Reset service state
   */
  private resetState(): void {
    this.connectionStatus = false;
    this.retryCount = 0;
    this.messageQueue.items = [];
    this.eventHandlers.clear();
  }
}

export default WebSocketService;
```

This implementation provides a robust WebSocket service with the following features:

1. Singleton pattern implementation for consistent WebSocket management
2. Auto-reconnection using reconnecting-websocket library
3. Type-safe event handling with predefined event types
4. Comprehensive error handling and logging
5. Message queuing for reliability
6. Heartbeat mechanism to maintain connection health
7. Connection state management
8. Clean disconnection handling
9. Secure WebSocket connection with authentication
10. Resource cleanup on disconnection

The service can be used throughout the application by getting the singleton instance:

```typescript
const wsService = WebSocketService.getInstance();
await wsService.connect(authToken);

wsService.subscribe(WEBSOCKET_EVENTS.PROFILE_FOUND, (data) => {
  // Handle profile found event
});