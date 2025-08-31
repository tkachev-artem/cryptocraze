/**
 * Worker System Initialization
 * Central initialization point for the TP/SL worker system
 */

import { workerManager } from './workerManager.js';

// Re-export all worker components for easy access
export { workerManager } from './workerManager.js';
export { queueManager } from './queueManager.js';
export { orderMonitorWorker } from './orderMonitorWorker.js';
export { priceMonitorService } from './priceMonitorService.js';
export { orderClosureService } from './orderClosureService.js';
export { default as adminRoutes } from './adminRoutes.js';

/**
 * Initialize the entire TP/SL worker system
 */
export async function initializeWorkerSystem(): Promise<void> {
  try {
    console.log('[WorkerSystem] Initializing automatic TP/SL worker system...');
    
    // Initialize the worker manager (which orchestrates all components)
    await workerManager.initialize();
    
    console.log('[WorkerSystem] ✅ TP/SL worker system initialized successfully');
    
    // Setup graceful shutdown handlers
    setupGracefulShutdown();
    
  } catch (error) {
    console.error('[WorkerSystem] ❌ Failed to initialize worker system:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown the worker system
 */
export async function shutdownWorkerSystem(): Promise<void> {
  try {
    console.log('[WorkerSystem] Shutting down TP/SL worker system...');
    
    await workerManager.shutdown();
    
    console.log('[WorkerSystem] ✅ Worker system shutdown completed');
    
  } catch (error) {
    console.error('[WorkerSystem] ❌ Error during worker system shutdown:', error);
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers for the worker system
 */
function setupGracefulShutdown(): void {
  // Handle SIGTERM (Docker/K8s shutdown)
  process.on('SIGTERM', async () => {
    console.log('[WorkerSystem] Received SIGTERM, starting graceful shutdown...');
    try {
      await shutdownWorkerSystem();
      process.exit(0);
    } catch (error) {
      console.error('[WorkerSystem] Error during SIGTERM shutdown:', error);
      process.exit(1);
    }
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('[WorkerSystem] Received SIGINT, starting graceful shutdown...');
    try {
      await shutdownWorkerSystem();
      process.exit(0);
    } catch (error) {
      console.error('[WorkerSystem] Error during SIGINT shutdown:', error);
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[WorkerSystem] Uncaught exception:', error);
    try {
      await workerManager.emergencyStop();
    } catch (shutdownError) {
      console.error('[WorkerSystem] Error during emergency stop:', shutdownError);
    }
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[WorkerSystem] Unhandled rejection at:', promise, 'reason:', reason);
    try {
      await workerManager.emergencyStop();
    } catch (shutdownError) {
      console.error('[WorkerSystem] Error during emergency stop:', shutdownError);
    }
    process.exit(1);
  });

  console.log('[WorkerSystem] Graceful shutdown handlers configured');
}

/**
 * Health check function for external monitoring
 */
export async function getWorkerSystemHealth(): Promise<{
  isHealthy: boolean;
  status: string;
  uptime: number;
  components: any;
}> {
  try {
    const health = await workerManager.getSystemHealth();
    const uptime = workerManager.getUptime();
    
    return {
      isHealthy: health.isHealthy,
      status: health.isHealthy ? 'healthy' : 'unhealthy',
      uptime: uptime.uptime,
      components: health.components,
    };
  } catch (error) {
    console.error('[WorkerSystem] Health check error:', error);
    return {
      isHealthy: false,
      status: 'error',
      uptime: 0,
      components: null,
    };
  }
}

// Export types for external use
export type {
  OrderMonitorJobData,
  WorkerStats,
  QueueHealth,
} from './queueManager.js';

export type {
  TPSLCheckResult,
} from './orderMonitorWorker.js';

export type {
  PriceAlert,
  PriceMonitorStats,
} from './priceMonitorService.js';

export type {
  OrderClosureRequest,
  OrderClosureResult,
  ClosureStats,
} from './orderClosureService.js';

export type {
  WorkerSystemHealth,
} from './workerManager.js';