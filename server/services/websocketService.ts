import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAdmin?: boolean;
  subscriptions?: Set<string>;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'update' | 'error';
  channel?: string;
  data?: any;
  error?: string;
}

interface AnalyticsUpdate {
  type: 'user_activity' | 'revenue' | 'monetization' | 'ads' | 'retention' | 'regional';
  data: any;
  timestamp: number;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedWebSocket> = new Set();
  private channels: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('WebSocket service initialized');
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      const url = parse(info.req.url || '', true);
      const token = url.query.token as string;

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        return false;
      }

      jwt.verify(token, JWT_SECRET);
      return true;
    } catch (error) {
      console.log('WebSocket connection rejected: Invalid token', error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage) {
    try {
      const url = parse(req.url || '', true);
      const token = url.query.token as string;
      
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      ws.userId = decoded.userId;
      ws.isAdmin = decoded.isAdmin || false;
      ws.subscriptions = new Set();

      this.clients.add(ws);
      console.log(`WebSocket client connected: ${ws.userId} (admin: ${ws.isAdmin})`);

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'update',
        data: { 
          message: 'Connected to real-time analytics', 
          channels: Array.from(this.channels.keys())
        }
      });

    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close();
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.channel);
          break;
        default:
          this.sendMessage(ws, {
            type: 'error',
            error: 'Unknown message type'
          });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendMessage(ws, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  private handleSubscribe(ws: AuthenticatedWebSocket, channel?: string) {
    if (!channel) {
      this.sendMessage(ws, {
        type: 'error',
        error: 'Channel name required'
      });
      return;
    }

    // Admin-only channels
    const adminChannels = ['analytics:admin', 'monetization:admin', 'ads:admin', 'users:admin'];
    if (adminChannels.includes(channel) && !ws.isAdmin) {
      this.sendMessage(ws, {
        type: 'error',
        error: 'Admin privileges required for this channel'
      });
      return;
    }

    // User-specific channels
    if (channel.startsWith('user:') && !channel.endsWith(`:${ws.userId}`) && !ws.isAdmin) {
      this.sendMessage(ws, {
        type: 'error',
        error: 'Access denied to this user channel'
      });
      return;
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel)!.add(ws);
    ws.subscriptions!.add(channel);

    this.sendMessage(ws, {
      type: 'update',
      data: { message: `Subscribed to ${channel}` }
    });

    console.log(`Client ${ws.userId} subscribed to ${channel}`);
  }

  private handleUnsubscribe(ws: AuthenticatedWebSocket, channel?: string) {
    if (!channel || !ws.subscriptions!.has(channel)) {
      this.sendMessage(ws, {
        type: 'error',
        error: 'Not subscribed to this channel'
      });
      return;
    }

    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }

    ws.subscriptions!.delete(channel);

    this.sendMessage(ws, {
      type: 'update',
      data: { message: `Unsubscribed from ${channel}` }
    });

    console.log(`Client ${ws.userId} unsubscribed from ${channel}`);
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    this.clients.delete(ws);

    // Remove from all channels
    if (ws.subscriptions) {
      for (const channel of ws.subscriptions) {
        const channelClients = this.channels.get(channel);
        if (channelClients) {
          channelClients.delete(ws);
          if (channelClients.size === 0) {
            this.channels.delete(channel);
          }
        }
      }
    }

    console.log(`WebSocket client disconnected: ${ws.userId}`);
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public methods for broadcasting updates
  
  public broadcastToChannel(channel: string, data: any) {
    const clients = this.channels.get(channel);
    if (!clients || clients.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'update',
      channel,
      data
    };

    for (const client of clients) {
      this.sendMessage(client, message);
    }

    console.log(`Broadcasted to ${channel}: ${clients.size} clients`);
  }

  public broadcastAnalyticsUpdate(update: AnalyticsUpdate) {
    const channel = `analytics:${update.type}`;
    this.broadcastToChannel(channel, update);
    
    // Also broadcast to admin channel
    this.broadcastToChannel('analytics:admin', update);
  }

  public broadcastUserActivity(userId: string, activity: any) {
    // Broadcast to user-specific channel
    this.broadcastToChannel(`user:${userId}`, {
      type: 'user_activity',
      data: activity,
      timestamp: Date.now()
    });

    // Broadcast aggregated data to admin
    this.broadcastToChannel('users:admin', {
      type: 'user_activity_aggregate',
      data: { userId, activity },
      timestamp: Date.now()
    });
  }

  public broadcastMonetizationUpdate(data: any) {
    this.broadcastAnalyticsUpdate({
      type: 'monetization',
      data,
      timestamp: Date.now()
    });
  }

  public broadcastAdsUpdate(data: any) {
    this.broadcastAnalyticsUpdate({
      type: 'ads',
      data,
      timestamp: Date.now()
    });
  }

  public broadcastRetentionUpdate(data: any) {
    this.broadcastAnalyticsUpdate({
      type: 'retention',
      data,
      timestamp: Date.now()
    });
  }

  public broadcastRegionalUpdate(data: any) {
    this.broadcastAnalyticsUpdate({
      type: 'regional',
      data,
      timestamp: Date.now()
    });
  }

  public broadcastRevenueUpdate(data: any) {
    this.broadcastAnalyticsUpdate({
      type: 'revenue',
      data,
      timestamp: Date.now()
    });
  }

  // Health check methods
  
  public getStats() {
    return {
      totalClients: this.clients.size,
      totalChannels: this.channels.size,
      channelStats: Array.from(this.channels.entries()).map(([channel, clients]) => ({
        channel,
        clientCount: clients.size
      }))
    };
  }

  public pingAllClients() {
    let activeSent = 0;
    let inactiveRemoved = 0;

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
        activeSent++;
      } else {
        this.handleDisconnection(client);
        inactiveRemoved++;
      }
    }

    console.log(`WebSocket ping: ${activeSent} sent, ${inactiveRemoved} removed`);
    return { activeSent, inactiveRemoved };
  }
}

export const websocketService = new WebSocketService();

// Helper function to initialize WebSocket with Express server
export const initializeWebSocket = (server: any) => {
  websocketService.initialize(server);
  
  // Ping clients every 30 seconds to maintain connections
  setInterval(() => {
    websocketService.pingAllClients();
  }, 30000);
  
  return websocketService;
};