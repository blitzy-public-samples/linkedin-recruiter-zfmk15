/**
 * @file Enhanced WebSocket Hook v1.0.0
 * @description Custom React hook providing WebSocket connection management and event subscription
 * with enhanced error handling, automatic reconnection, and type-safe event handling
 * 
 * Dependencies:
 * - react: ^18.2.0
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { WebSocketService, WEBSOCKET_EVENTS } from '../services/websocket.service';
import { useAuth } from './useAuth';
import { logError, ErrorSeverity } from '../utils/errorHandling';

// Type definitions for WebSocket hook
interface WebSocketMetrics {
  connectedAt: Date | null;
  lastPingTime: number | null;
  reconnectAttempts: number;
  messageCount: number;
}

interface WebSocketError {
  code: string;
  message: string;
  timestamp: Date;
  severity: ErrorSeverity;
}

interface SubscriptionOptions {
  retryOnError?: boolean;
  maxRetries?: number;
  onError?: (error: WebSocketError) => void;
}

/**
 * Enhanced WebSocket hook with comprehensive connection management
 * @returns WebSocket state and methods
 */
export const useWebSocket = () => {
  // Get WebSocket service instance
  const wsService = WebSocketService.getInstance();
  
  // Get auth context for secure connection
  const { user, token } = useAuth();

  // State management
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<WebSocketError | null>(null);

  // Metrics tracking with ref to prevent re-renders
  const metricsRef = useRef<WebSocketMetrics>({
    connectedAt: null,
    lastPingTime: null,
    reconnectAttempts: 0,
    messageCount: 0
  });

  /**
   * Enhanced subscription handler with error boundary and retry logic
   */
  const handleSubscribe = useCallback(async (
    event: keyof typeof WEBSOCKET_EVENTS,
    callback: Function,
    options: SubscriptionOptions = {}
  ): Promise<void> => {
    const { 
      retryOnError = true, 
      maxRetries = 3,
      onError 
    } = options;

    try {
      // Validate event type
      if (!Object.values(WEBSOCKET_EVENTS).includes(event)) {
        throw new Error(`Invalid event type: ${event}`);
      }

      // Create enhanced callback with error handling
      const enhancedCallback = async (data: unknown) => {
        try {
          await callback(data);
          metricsRef.current.messageCount++;
        } catch (error) {
          const wsError: WebSocketError = {
            code: 'CALLBACK_ERROR',
            message: (error as Error).message,
            timestamp: new Date(),
            severity: ErrorSeverity.HIGH
          };

          logError(error as Error, 'WebSocket Callback Error', {
            securityContext: {
              userId: user?.id,
              event,
              timestamp: new Date().toISOString()
            }
          });

          setError(wsError);
          onError?.(wsError);

          // Implement retry logic if enabled
          if (retryOnError && metricsRef.current.reconnectAttempts < maxRetries) {
            metricsRef.current.reconnectAttempts++;
            await wsService.reconnect();
          }
        }
      };

      // Subscribe with enhanced callback
      await wsService.subscribe(event, enhancedCallback);

    } catch (error) {
      const wsError: WebSocketError = {
        code: 'SUBSCRIPTION_ERROR',
        message: (error as Error).message,
        timestamp: new Date(),
        severity: ErrorSeverity.MEDIUM
      };

      logError(error as Error, 'WebSocket Subscription Error', {
        securityContext: {
          userId: user?.id,
          event,
          timestamp: new Date().toISOString()
        }
      });

      setError(wsError);
      onError?.(wsError);
    }
  }, [user, wsService]);

  /**
   * Enhanced unsubscribe handler with cleanup
   */
  const handleUnsubscribe = useCallback(async (
    event: keyof typeof WEBSOCKET_EVENTS,
    callback: Function
  ): Promise<void> => {
    try {
      await wsService.unsubscribe(event, callback);
    } catch (error) {
      logError(error as Error, 'WebSocket Unsubscribe Error', {
        securityContext: {
          userId: user?.id,
          event,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [user, wsService]);

  /**
   * Set up WebSocket connection with automatic reconnection
   */
  useEffect(() => {
    if (!token) return;

    const connectWebSocket = async () => {
      try {
        await wsService.connect(token);
        setIsConnected(true);
        setError(null);
        metricsRef.current = {
          ...metricsRef.current,
          connectedAt: new Date(),
          reconnectAttempts: 0
        };

      } catch (error) {
        const wsError: WebSocketError = {
          code: 'CONNECTION_ERROR',
          message: (error as Error).message,
          timestamp: new Date(),
          severity: ErrorSeverity.HIGH
        };

        logError(error as Error, 'WebSocket Connection Error', {
          securityContext: {
            userId: user?.id,
            timestamp: new Date().toISOString()
          }
        });

        setError(wsError);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      wsService.disconnect();
      setIsConnected(false);
      setError(null);
    };
  }, [token, user, wsService]);

  /**
   * Monitor connection status and handle reconnection
   */
  useEffect(() => {
    if (!isConnected || !token) return;

    const checkConnection = async () => {
      try {
        const connected = await wsService.isConnected();
        if (!connected) {
          await wsService.reconnect();
        }
        metricsRef.current.lastPingTime = Date.now();
      } catch (error) {
        logError(error as Error, 'WebSocket Connection Check Error', {
          securityContext: {
            userId: user?.id,
            timestamp: new Date().toISOString()
          }
        });
      }
    };

    // Check connection every 30 seconds
    const connectionMonitor = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(connectionMonitor);
    };
  }, [isConnected, token, user, wsService]);

  return {
    isConnected,
    error,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
    connectionMetrics: metricsRef.current
  };
};

export type { WebSocketMetrics, WebSocketError, SubscriptionOptions };
```

This implementation provides:

1. Enhanced WebSocket connection management with automatic reconnection
2. Type-safe event subscription and handling
3. Comprehensive error handling and logging
4. Connection metrics tracking
5. Security context integration with authentication
6. Retry logic for failed operations
7. Automatic cleanup on unmount
8. Connection status monitoring
9. Performance optimization with useCallback and useRef
10. Detailed error reporting with severity levels

The hook can be used in components like this:

```typescript
const { isConnected, subscribe, unsubscribe } = useWebSocket();

useEffect(() => {
  if (!isConnected) return;

  const handleProfileFound = (profile: any) => {
    // Handle profile found event
  };

  subscribe(WEBSOCKET_EVENTS.PROFILE_FOUND, handleProfileFound, {
    retryOnError: true,
    maxRetries: 3,
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  return () => {
    unsubscribe(WEBSOCKET_EVENTS.PROFILE_FOUND, handleProfileFound);
  };
}, [isConnected, subscribe, unsubscribe]);