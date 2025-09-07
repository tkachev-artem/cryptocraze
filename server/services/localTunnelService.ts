import localtunnel from 'localtunnel';
import { createLogger } from '../utils/logger';

const logger = createLogger('LocalTunnel');

export class LocalTunnelService {
  private tunnel: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  async start(port: number = 1111, subdomain: string = 'cryptocraze'): Promise<string> {
    try {
      logger.info(`Starting LocalTunnel on port ${port} with subdomain ${subdomain}...`);
      
      this.tunnel = await localtunnel({
        port,
        subdomain,
        host: 'https://loca.lt'
      });

      const url = this.tunnel.url;
      logger.info(`✅ LocalTunnel started: ${url}`);

      // Handle tunnel close
      this.tunnel.on('close', () => {
        logger.warn('LocalTunnel closed');
        this.handleReconnect(port, subdomain);
      });

      // Handle tunnel error  
      this.tunnel.on('error', (err: Error) => {
        logger.error('LocalTunnel error:', err);
        this.handleReconnect(port, subdomain);
      });

      this.reconnectAttempts = 0;
      return url;

    } catch (error) {
      logger.error('Failed to start LocalTunnel:', error);
      throw error;
    }
  }

  private async handleReconnect(port: number, subdomain: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached (${this.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.start(port, subdomain).catch(err => {
        logger.error('Reconnect failed:', err);
      });
    }, this.reconnectDelay);
  }

  stop() {
    if (this.tunnel) {
      logger.info('Stopping LocalTunnel...');
      this.tunnel.close();
      this.tunnel = null;
    }
  }

  getUrl(): string | null {
    return this.tunnel ? this.tunnel.url : null;
  }

  isActive(): boolean {
    return this.tunnel !== null;
  }
}

export const localTunnelService = new LocalTunnelService();