import { Router, Request, Response } from 'express';
import { workerManager } from './workerManager.js';
import { queueManager } from './queueManager.js';
import { priceMonitorService } from './priceMonitorService.js';
import { orderClosureService } from './orderClosureService.js';
import { orderMonitorWorker } from './orderMonitorWorker.js';

const router = Router();

// Middleware for admin authentication
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has admin role
    // This should integrate with your existing user authentication system
    const user = req.session?.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('[AdminRoutes] Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * GET /api/admin/workers/health
 * Get comprehensive system health status
 */
router.get('/health', requireAdmin, async (req: Request, res: Response) => {
  try {
    const health = await workerManager.getSystemHealth();
    const uptime = workerManager.getUptime();
    
    res.json({
      success: true,
      data: {
        ...health,
        uptime,
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health'
    });
  }
});

/**
 * GET /api/admin/workers/stats
 * Get detailed worker statistics
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [queueStats, priceStats, closureStats, workerMetrics] = await Promise.all([
      queueManager.getQueueStats(),
      priceMonitorService.getStats(),
      orderClosureService.getStats(),
      orderMonitorWorker.getMetrics(),
    ]);

    res.json({
      success: true,
      data: {
        queue: queueStats,
        priceMonitor: priceStats,
        orderClosure: closureStats,
        worker: workerMetrics,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get worker statistics'
    });
  }
});

/**
 * GET /api/admin/workers/queues
 * Get detailed queue information
 */
router.get('/queues', requireAdmin, async (req: Request, res: Response) => {
  try {
    const queueStats = await queueManager.getQueueStats();
    const queueHealth = queueManager.getHealthStatus();
    
    res.json({
      success: true,
      data: {
        stats: queueStats,
        health: Array.from(queueHealth.entries()).map(([name, health]) => ({
          name,
          ...health,
        })),
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Queue info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue information'
    });
  }
});

/**
 * GET /api/admin/workers/prices
 * Get price monitoring status
 */
router.get('/prices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = priceMonitorService.getStats();
    const health = priceMonitorService.getHealthStatus();
    const currentPrices = priceMonitorService.getAllCurrentPrices();
    
    res.json({
      success: true,
      data: {
        stats,
        health,
        currentPrices: Object.fromEntries(currentPrices),
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Price monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price monitoring status'
    });
  }
});

/**
 * GET /api/admin/workers/closures
 * Get order closure statistics and recent errors
 */
router.get('/closures', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = orderClosureService.getStats();
    const health = orderClosureService.getHealthStatus();
    const recentErrors = orderClosureService.getRecentErrors();
    
    res.json({
      success: true,
      data: {
        stats,
        health,
        recentErrors,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Closure stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get closure statistics'
    });
  }
});

/**
 * POST /api/admin/workers/restart
 * Restart the worker system
 */
router.post('/restart', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminRoutes] Admin requested worker system restart');
    
    // Shutdown and restart the system
    await workerManager.shutdown();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await workerManager.initialize();
    
    res.json({
      success: true,
      message: 'Worker system restarted successfully'
    });
  } catch (error) {
    console.error('[AdminRoutes] Worker restart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart worker system'
    });
  }
});

/**
 * POST /api/admin/workers/shutdown
 * Gracefully shutdown the worker system
 */
router.post('/shutdown', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminRoutes] Admin requested worker system shutdown');
    
    await workerManager.shutdown();
    
    res.json({
      success: true,
      message: 'Worker system shut down successfully'
    });
  } catch (error) {
    console.error('[AdminRoutes] Worker shutdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to shutdown worker system'
    });
  }
});

/**
 * POST /api/admin/workers/emergency-stop
 * Emergency stop of the worker system
 */
router.post('/emergency-stop', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[AdminRoutes] Admin requested emergency stop');
    
    await workerManager.emergencyStop();
    
    res.json({
      success: true,
      message: 'Emergency stop executed successfully'
    });
  } catch (error) {
    console.error('[AdminRoutes] Emergency stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency stop'
    });
  }
});

/**
 * GET /api/admin/workers/jobs/:dealId
 * Get information about a specific order's monitoring job
 */
router.get('/jobs/:dealId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deal ID'
      });
    }

    // Try to find the job in the queue
    const jobId = `order-${dealId}`;
    const job = await queueManager.orderMonitorQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Job info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job information'
    });
  }
});

/**
 * DELETE /api/admin/workers/jobs/:dealId
 * Manually remove an order from monitoring
 */
router.delete('/jobs/:dealId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (isNaN(dealId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deal ID'
      });
    }

    const removed = await workerManager.removeOrderFromMonitoring(dealId);
    
    res.json({
      success: true,
      data: {
        dealId,
        removed,
        message: removed ? 'Order removed from monitoring' : 'Order not found in monitoring'
      }
    });
  } catch (error) {
    console.error('[AdminRoutes] Job removal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove job'
    });
  }
});

/**
 * GET /api/admin/workers/metrics/export
 * Export comprehensive metrics for analysis
 */
router.get('/metrics/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const health = await workerManager.getSystemHealth();
    const uptime = workerManager.getUptime();
    const recentErrors = orderClosureService.getRecentErrors();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      systemHealth: health,
      systemUptime: uptime,
      recentErrors,
      exportedBy: req.session?.user?.id || 'unknown',
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="worker-metrics-${Date.now()}.json"`);
    res.json(exportData);
    
  } catch (error) {
    console.error('[AdminRoutes] Metrics export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics'
    });
  }
});

/**
 * WebSocket endpoint for real-time monitoring (if WebSocket support is available)
 */
router.get('/monitor/stream', requireAdmin, (req: Request, res: Response) => {
  // Set up Server-Sent Events for real-time monitoring
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial data
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);
  
  // Set up periodic health updates
  const healthInterval = setInterval(async () => {
    try {
      const health = await workerManager.getSystemHealth();
      res.write(`data: ${JSON.stringify({ type: 'health', data: health })}\n\n`);
    } catch (error) {
      console.error('[AdminRoutes] Health stream error:', error);
    }
  }, 5000); // Update every 5 seconds
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(healthInterval);
  });
});

export default router;