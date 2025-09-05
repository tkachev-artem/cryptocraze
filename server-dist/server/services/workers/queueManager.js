"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueManager = exports.QueueManager = void 0;
const bullmq_1 = require("bullmq");
/**
 * Queue Manager Service
 * Manages BullMQ queues and workers for automated TP/SL processing
 */
class QueueManager {
    static instance;
    // Redis connection configuration
    redisConfig;
    // Queues
    orderMonitorQueue;
    deadLetterQueue;
    // Queue Events for monitoring
    orderMonitorEvents;
    deadLetterEvents;
    // Workers registry
    workers = new Map();
    // Health monitoring
    healthStats = new Map();
    healthInterval = null;
    constructor() {
        // Redis configuration from environment
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            lazyConnect: true,
        };
        // Initialize queues with advanced configuration
        this.orderMonitorQueue = new bullmq_1.Queue('orderMonitor', {
            connection: this.redisConfig,
            defaultJobOptions: {
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50, // Keep last 50 failed jobs
                attempts: 3, // Retry failed jobs 3 times
                backoff: {
                    type: 'exponential',
                    delay: 2000, // Start with 2s delay
                },
                delay: 1000, // Initial processing delay
            },
        });
        this.deadLetterQueue = new bullmq_1.Queue('deadLetter', {
            connection: this.redisConfig,
            defaultJobOptions: {
                removeOnComplete: 500, // Keep more dead letter jobs for analysis
                removeOnFail: 200,
                attempts: 1, // Dead letter jobs should not be retried
            },
        });
        // Initialize queue events for monitoring
        this.orderMonitorEvents = new bullmq_1.QueueEvents('orderMonitor', {
            connection: this.redisConfig,
        });
        this.deadLetterEvents = new bullmq_1.QueueEvents('deadLetter', {
            connection: this.redisConfig,
        });
        this.setupEventHandlers();
        this.startHealthMonitoring();
    }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    /**
     * Add an order to monitoring queue
     */
    async addOrderToMonitoring(orderData) {
        try {
            // Only add orders with TP or SL set
            if (!orderData.takeProfit && !orderData.stopLoss) {
                console.log(`[QueueManager] Skipping order ${orderData.dealId} - no TP/SL set`);
                throw new bullmq_1.UnrecoverableError('No TP/SL levels set');
            }
            const job = await this.orderMonitorQueue.add(`monitor-order-${orderData.dealId}`, orderData, {
                jobId: `order-${orderData.dealId}`, // Unique job ID to prevent duplicates
                priority: this.calculateJobPriority(orderData),
                repeat: {
                    every: 2000, // Check every 2 seconds
                    limit: 43200, // Max 24 hours (43200 * 2 seconds)
                },
            });
            console.log(`[QueueManager] Added order ${orderData.dealId} to monitoring queue`);
            return job;
        }
        catch (error) {
            console.error(`[QueueManager] Failed to add order ${orderData.dealId} to queue:`, error);
            throw error;
        }
    }
    /**
     * Remove an order from monitoring (when manually closed)
     */
    async removeOrderFromMonitoring(dealId) {
        try {
            const jobId = `order-${dealId}`;
            const job = await this.orderMonitorQueue.getJob(jobId);
            if (job) {
                await job.remove();
                console.log(`[QueueManager] Removed order ${dealId} from monitoring`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`[QueueManager] Failed to remove order ${dealId} from queue:`, error);
            return false;
        }
    }
    /**
     * Move failed order to dead letter queue
     */
    async moveToDeadLetter(jobData, error) {
        try {
            await this.deadLetterQueue.add(`dead-order-${jobData.dealId}`, {
                ...jobData,
                error,
                movedAt: new Date(),
            }, {
                priority: 1, // Low priority for dead letters
            });
            console.log(`[QueueManager] Moved order ${jobData.dealId} to dead letter queue: ${error}`);
        }
        catch (error) {
            console.error(`[QueueManager] Failed to move order to dead letter queue:`, error);
        }
    }
    /**
     * Register a worker
     */
    registerWorker(name, worker) {
        this.workers.set(name, worker);
        console.log(`[QueueManager] Registered worker: ${name}`);
    }
    /**
     * Get all registered workers
     */
    getWorkers() {
        return this.workers;
    }
    /**
     * Get queue statistics
     */
    async getQueueStats() {
        const [orderMonitorStats, deadLetterStats] = await Promise.all([
            this.getQueueWorkerStats(this.orderMonitorQueue),
            this.getQueueWorkerStats(this.deadLetterQueue),
        ]);
        return {
            orderMonitor: orderMonitorStats,
            deadLetter: deadLetterStats,
        };
    }
    /**
     * Get health status of all queues
     */
    getHealthStatus() {
        return new Map(this.healthStats);
    }
    /**
     * Gracefully shutdown all queues and workers
     */
    async shutdown() {
        console.log('[QueueManager] Starting graceful shutdown...');
        try {
            // Stop health monitoring
            if (this.healthInterval) {
                clearInterval(this.healthInterval);
            }
            // Close all workers
            const workerShutdowns = Array.from(this.workers.values()).map(worker => worker.close());
            await Promise.all(workerShutdowns);
            // Close queue events
            await Promise.all([
                this.orderMonitorEvents.close(),
                this.deadLetterEvents.close(),
            ]);
            // Close queues
            await Promise.all([
                this.orderMonitorQueue.close(),
                this.deadLetterQueue.close(),
            ]);
            console.log('[QueueManager] Graceful shutdown completed');
        }
        catch (error) {
            console.error('[QueueManager] Error during shutdown:', error);
            throw error;
        }
    }
    /**
     * Calculate job priority based on order characteristics
     */
    calculateJobPriority(orderData) {
        let priority = 10; // Base priority
        // Higher priority for larger orders
        const orderValue = orderData.amount * orderData.multiplier;
        if (orderValue > 10000)
            priority += 5;
        else if (orderValue > 1000)
            priority += 3;
        else if (orderValue > 100)
            priority += 1;
        // Higher priority if both TP and SL are set
        if (orderData.takeProfit && orderData.stopLoss)
            priority += 2;
        return priority;
    }
    /**
     * Get worker statistics for a queue
     */
    async getQueueWorkerStats(queue) {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed(),
            queue.getPaused(),
        ]);
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            paused: paused.length,
        };
    }
    /**
     * Setup event handlers for monitoring
     */
    setupEventHandlers() {
        // Order Monitor Queue Events
        this.orderMonitorEvents.on('completed', ({ jobId }) => {
            console.log(`[QueueManager] Job completed: ${jobId}`);
        });
        this.orderMonitorEvents.on('failed', ({ jobId, failedReason }) => {
            console.error(`[QueueManager] Job failed: ${jobId}, reason: ${failedReason}`);
        });
        this.orderMonitorEvents.on('error', (error) => {
            console.error('[QueueManager] Order monitor queue error:', error);
        });
        // Dead Letter Queue Events
        this.deadLetterEvents.on('completed', ({ jobId }) => {
            console.log(`[QueueManager] Dead letter job processed: ${jobId}`);
        });
        this.deadLetterEvents.on('error', (error) => {
            console.error('[QueueManager] Dead letter queue error:', error);
        });
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthInterval = setInterval(async () => {
            await this.updateHealthStats();
        }, 30000); // Update every 30 seconds
    }
    /**
     * Update health statistics
     */
    async updateHealthStats() {
        try {
            const [orderStats, deadLetterStats] = await Promise.all([
                this.getQueueWorkerStats(this.orderMonitorQueue),
                this.getQueueWorkerStats(this.deadLetterQueue),
            ]);
            // Update order monitor health
            this.healthStats.set('orderMonitor', {
                queueName: 'orderMonitor',
                isHealthy: this.workers.size > 0 && orderStats.failed < 10,
                workers: this.workers.size,
                jobs: orderStats,
                lastProcessed: new Date(),
                errors: [],
            });
            // Update dead letter health
            this.healthStats.set('deadLetter', {
                queueName: 'deadLetter',
                isHealthy: deadLetterStats.failed < 5,
                workers: 1, // Dead letter typically has one worker
                jobs: deadLetterStats,
                lastProcessed: new Date(),
                errors: [],
            });
        }
        catch (error) {
            console.error('[QueueManager] Health monitoring error:', error);
        }
    }
}
exports.QueueManager = QueueManager;
// Export singleton instance
exports.queueManager = QueueManager.getInstance();
