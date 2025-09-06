import ngrok from '@ngrok/ngrok';

/**
 * NgrokService - сервис для управления ngrok туннелем
 * Позволяет получить публичный доступ к localhost приложению
 */
export class NgrokService {
  private static listener: any = null;
  private static publicUrl: string | null = null;
  private static isStarted: boolean = false;

  /**
   * Запуск ngrok туннеля
   */
  static async start(): Promise<string | null> {
    // Проверяем должен ли ngrok быть включен
    const enableNgrok = process.env.ENABLE_NGROK === 'true';
    const ngrokAuthToken = process.env.NGROK_AUTHTOKEN;
    const ngrokDomain = process.env.NGROK_DOMAIN;

    if (!enableNgrok) {
      console.log('🚫 [NgrokService] Ngrok disabled (ENABLE_NGROK != true)');
      return null;
    }

    if (!ngrokAuthToken) {
      console.error('❌ [NgrokService] NGROK_AUTHTOKEN not found in environment');
      return null;
    }

    if (this.isStarted) {
      console.log('ℹ️ [NgrokService] Already started, returning existing URL');
      return this.publicUrl;
    }

    try {
      console.log('🚀 [NgrokService] Starting ngrok tunnel...');
      
      const config: any = {
        addr: process.env.PORT || 1111,
        authtoken: ngrokAuthToken,
      };

      // Если есть фиксированный домен, используем его
      if (ngrokDomain) {
        config.domain = ngrokDomain;
        console.log(`🏠 [NgrokService] Using fixed domain: ${ngrokDomain}`);
      }

      this.listener = await ngrok.forward(config);
      this.publicUrl = this.listener.url();
      this.isStarted = true;

      console.log(`✅ [NgrokService] Tunnel established!`);
      console.log(`🌍 [NgrokService] Public URL: ${this.publicUrl}`);
      
      // Логируем важную информацию для OAuth
      if (ngrokDomain) {
        console.log(`🔐 [NgrokService] OAuth callback: ${this.publicUrl}/api/auth/google/callback`);
      }

      return this.publicUrl;
    } catch (error) {
      console.error('❌ [NgrokService] Failed to start tunnel:', error);
      this.isStarted = false;
      throw error;
    }
  }

  /**
   * Остановка ngrok туннеля
   */
  static async stop(): Promise<void> {
    if (this.listener) {
      console.log('🛑 [NgrokService] Stopping tunnel...');
      try {
        await this.listener.close();
        this.listener = null;
        this.publicUrl = null;
        this.isStarted = false;
        console.log('✅ [NgrokService] Tunnel stopped');
      } catch (error) {
        console.error('❌ [NgrokService] Error stopping tunnel:', error);
      }
    }
  }

  /**
   * Получение текущего публичного URL
   */
  static getPublicUrl(): string | null {
    return this.publicUrl;
  }

  /**
   * Проверка статуса туннеля
   */
  static isRunning(): boolean {
    return this.isStarted && this.publicUrl !== null;
  }

  /**
   * Получение callback URL для OAuth
   */
  static getOAuthCallbackUrl(): string | null {
    if (!this.publicUrl) return null;
    return `${this.publicUrl}/api/auth/google/callback`;
  }

  /**
   * Graceful shutdown при завершении процесса
   */
  static setupGracefulShutdown(): void {
    const cleanup = async () => {
      console.log('🧹 [NgrokService] Cleanup on exit...');
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', () => {
      if (this.isStarted) {
        console.log('⚠️ [NgrokService] Process exiting with active tunnel');
      }
    });
  }
}

export default NgrokService;