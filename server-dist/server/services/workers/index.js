"use strict";
/**
 * Worker System Initialization
 * Central initialization point for the TP/SL worker system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = exports.orderClosureService = exports.priceMonitorService = exports.orderMonitorWorker = exports.queueManager = exports.workerManager = void 0;
exports.initializeWorkerSystem = initializeWorkerSystem;
exports.shutdownWorkerSystem = shutdownWorkerSystem;
exports.getWorkerSystemHealth = getWorkerSystemHealth;
const workerManager_js_1 = require("./workerManager.js");
// Re-export all worker components for easy access
var workerManager_js_2 = require("./workerManager.js");
Object.defineProperty(exports, "workerManager", { enumerable: true, get: function () { return workerManager_js_2.workerManager; } });
var queueManager_js_1 = require("./queueManager.js");
Object.defineProperty(exports, "queueManager", { enumerable: true, get: function () { return queueManager_js_1.queueManager; } });
var orderMonitorWorker_js_1 = require("./orderMonitorWorker.js");
Object.defineProperty(exports, "orderMonitorWorker", { enumerable: true, get: function () { return orderMonitorWorker_js_1.orderMonitorWorker; } });
var priceMonitorService_js_1 = require("./priceMonitorService.js");
Object.defineProperty(exports, "priceMonitorService", { enumerable: true, get: function () { return priceMonitorService_js_1.priceMonitorService; } });
var orderClosureService_js_1 = require("./orderClosureService.js");
Object.defineProperty(exports, "orderClosureService", { enumerable: true, get: function () { return orderClosureService_js_1.orderClosureService; } });
var adminRoutes_js_1 = require("./adminRoutes.js");
Object.defineProperty(exports, "adminRoutes", { enumerable: true, get: function () { return __importDefault(adminRoutes_js_1).default; } });
/**
 * Initialize the entire TP/SL worker system
 */
async function initializeWorkerSystem() {
    try {
        console.log('[WorkerSystem] Initializing automatic TP/SL worker system...');
        // Initialize the worker manager (which orchestrates all components)
        await workerManager_js_1.workerManager.initialize();
        console.log('[WorkerSystem] ✅ TP/SL worker system initialized successfully');
        // Setup graceful shutdown handlers
        setupGracefulShutdown();
    }
    catch (error) {
        console.error('[WorkerSystem] ❌ Failed to initialize worker system:', error);
        throw error;
    }
}
/**
 * Gracefully shutdown the worker system
 */
async function shutdownWorkerSystem() {
    try {
        console.log('[WorkerSystem] Shutting down TP/SL worker system...');
        await workerManager_js_1.workerManager.shutdown();
        console.log('[WorkerSystem] ✅ Worker system shutdown completed');
    }
    catch (error) {
        console.error('[WorkerSystem] ❌ Error during worker system shutdown:', error);
        throw error;
    }
}
/**
 * Setup graceful shutdown handlers for the worker system
 */
function setupGracefulShutdown() {
    // Handle SIGTERM (Docker/K8s shutdown)
    process.on('SIGTERM', async () => {
        console.log('[WorkerSystem] Received SIGTERM, starting graceful shutdown...');
        try {
            await shutdownWorkerSystem();
            process.exit(0);
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('[WorkerSystem] Error during SIGINT shutdown:', error);
            process.exit(1);
        }
    });
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
        console.error('[WorkerSystem] Uncaught exception:', error);
        try {
            await workerManager_js_1.workerManager.emergencyStop();
        }
        catch (shutdownError) {
            console.error('[WorkerSystem] Error during emergency stop:', shutdownError);
        }
        process.exit(1);
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
        console.error('[WorkerSystem] Unhandled rejection at:', promise, 'reason:', reason);
        try {
            await workerManager_js_1.workerManager.emergencyStop();
        }
        catch (shutdownError) {
            console.error('[WorkerSystem] Error during emergency stop:', shutdownError);
        }
        process.exit(1);
    });
    console.log('[WorkerSystem] Graceful shutdown handlers configured');
}
/**
 * Health check function for external monitoring
 */
async function getWorkerSystemHealth() {
    try {
        const health = await workerManager_js_1.workerManager.getSystemHealth();
        const uptime = workerManager_js_1.workerManager.getUptime();
        return {
            isHealthy: health.isHealthy,
            status: health.isHealthy ? 'healthy' : 'unhealthy',
            uptime: uptime.uptime,
            components: health.components,
        };
    }
    catch (error) {
        console.error('[WorkerSystem] Health check error:', error);
        return {
            isHealthy: false,
            status: 'error',
            uptime: 0,
            components: null,
        };
    }
}
