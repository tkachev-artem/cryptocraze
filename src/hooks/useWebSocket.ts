import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from './useUser';

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error';
  channel?: string;
  data?: any;
  error?: string;
}

interface WebSocketHookOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useWebSocket = (options: WebSocketHookOptions = {}): WebSocketHookReturn => {
  const {
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const { user } = useUser();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  const getWebSocketUrl = useCallback(() => {
    // Use environment variable for WebSocket URL if available
    const wsBaseUrl = (import.meta as any).env?.VITE_WS_URL || (import.meta as any).env?.VITE_API_SERVER;
    
    if (wsBaseUrl) {
      // If we have a configured WebSocket/API server URL, use it
      const url = new URL(wsBaseUrl);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws`;
    }
    
    // Fallback to current host (development mode)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setConnectionState('connecting');
    
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to all previously subscribed channels
        for (const channel of subscribedChannelsRef.current) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          if (message.type === 'error') {
            console.error('WebSocket error:', message.error);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        wsRef.current = null;

        // Auto-reconnect if enabled and not manually closed
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setConnectionState('error');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [user, getWebSocketUrl, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  const subscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.add(channel);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel
      }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel
      }));
    }
  }, []);

  // Connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
    connectionState
  };
};

// Hook for specific analytics updates
export const useAnalyticsWebSocket = () => {
  const webSocket = useWebSocket();
  const [analyticsData, setAnalyticsData] = useState<Record<string, any>>({});

  // Subscribe to analytics channels
  useEffect(() => {
    if (webSocket.isConnected) {
      webSocket.subscribe('analytics:admin');
      webSocket.subscribe('analytics:revenue');
      webSocket.subscribe('analytics:user_activity');
      webSocket.subscribe('analytics:monetization');
      webSocket.subscribe('analytics:ads');
      webSocket.subscribe('analytics:retention');
      webSocket.subscribe('analytics:regional');
    }
  }, [webSocket.isConnected, webSocket.subscribe]);

  // Process incoming analytics messages
  useEffect(() => {
    if (webSocket.lastMessage?.type === 'update' && webSocket.lastMessage.channel?.startsWith('analytics:')) {
      const { channel, data } = webSocket.lastMessage;
      const analyticsType = channel.replace('analytics:', '');
      
      setAnalyticsData(prev => ({
        ...prev,
        [analyticsType]: {
          ...data,
          lastUpdate: Date.now()
        }
      }));
    }
  }, [webSocket.lastMessage]);

  return {
    ...webSocket,
    analyticsData
  };
};

// Hook for user-specific updates
export const useUserWebSocket = (userId?: string) => {
  const webSocket = useWebSocket();
  const [userData, setUserData] = useState<any>(null);

  // Subscribe to user-specific channel
  useEffect(() => {
    if (webSocket.isConnected && userId) {
      webSocket.subscribe(`user:${userId}`);
    }
  }, [webSocket.isConnected, userId, webSocket.subscribe]);

  // Process incoming user messages
  useEffect(() => {
    if (webSocket.lastMessage?.type === 'update' && 
        webSocket.lastMessage.channel === `user:${userId}`) {
      setUserData(webSocket.lastMessage.data);
    }
  }, [webSocket.lastMessage, userId]);

  return {
    ...webSocket,
    userData
  };
};