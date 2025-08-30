"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsQueueService = exports.AnalyticsQueueService = void 0;
const redisService_js_1 = require("./redisService.js");
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Analytics Queue Service for batch processing of analytics events
 * Uses Redis for queuing and rate limiting to prevent database overload
 */
class AnalyticsQueueService {
    QUEUE_KEY = 'analytics:events';
    PROCESSING_KEY = 'analytics:processing';
    BATCH_SIZE = 50;
    PROCESS_INTERVAL = 10000; // 10 seconds
    MAX_RETRIES = 3;
    isProcessing = false;
    constructor() {
        this.startBatchProcessor();
    }
    /**
     * Add analytics event to queue for batch processing
     */
    async queueEvent(eventData) {
        const event = {
            ...eventData,
            timestamp: eventData.timestamp || new Date(),
            priority: eventData.priority || 'normal',
            retries: 0,
            id: this.generateEventId()
        };
        // Determine which queue to use based on priority
        const queueKey = eventData.priority === 'high'
            ? `${this.QUEUE_KEY}:high`
            : this.QUEUE_KEY;
        await redisService_js_1.redisService.lpush(queueKey, JSON.stringify(event));
        // Process high priority events immediately
        if (eventData.priority === 'high') {
            setImmediate(() => this.processHighPriorityEvents());
        }
    }
    /**
     * Start the batch processor
     */
    startBatchProcessor() {
        setInterval(async () => {
            if (!this.isProcessing) {
                await this.processBatch();
            }
        }, this.PROCESS_INTERVAL);
        // Also process high priority events more frequently
        setInterval(async () => {
            await this.processHighPriorityEvents();
        }, 2000); // Every 2 seconds
    }
    /**
     * Process a batch of analytics events
     */
    async processBatch() {
        if (this.isProcessing)
            return;
        try {
            this.isProcessing = true;
            // Get batch of events from queue
            const events = await this.getBatchEvents();
            if (events.length === 0)
                return;
            console.log(`Processing batch of ${events.length} analytics events`);
            // Group events by type for efficient processing
            const groupedEvents = this.groupEventsByType(events);
            // Process each group
            await Promise.all([
                this.processAnalyticsEvents(groupedEvents.analytics || []),
                this.processSessionEvents(groupedEvents.session || []),
                this.processAdEvents(groupedEvents.ad || []),
                this.processSpecialEvents(groupedEvents.special || [])
            ]);
            console.log(`Successfully processed ${events.length} analytics events`);
        }
        catch (error) {
            console.error('Error processing analytics batch:', error);
            // Handle failed events by re-queueing with retry logic
            await this.handleFailedBatch(error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Process high priority events immediately
     */
    async processHighPriorityEvents() {
        try {
            const events = await this.getHighPriorityEvents();
            if (events.length === 0)
                return;
            console.log(`Processing ${events.length} high priority analytics events`);
            const groupedEvents = this.groupEventsByType(events);
            await Promise.all([
                this.processAnalyticsEvents(groupedEvents.analytics || []),
                this.processSessionEvents(groupedEvents.session || []),
                this.processAdEvents(groupedEvents.ad || []),
                this.processSpecialEvents(groupedEvents.special || [])
            ]);
        }
        catch (error) {
            console.error('Error processing high priority events:', error);
        }
    }
    /**
     * Get batch of events from the main queue
     */
    async getBatchEvents() {
        const eventStrings = await redisService_js_1.redisService.lrange(this.QUEUE_KEY, 0, this.BATCH_SIZE - 1);
        if (eventStrings.length === 0)
            return [];
        // Remove processed events from queue
        await redisService_js_1.redisService.ltrim(this.QUEUE_KEY, eventStrings.length, -1);
        return eventStrings.map(eventStr => {
            try {
                return JSON.parse(eventStr);
            }
            catch (error) {
                console.error('Error parsing analytics event:', error, eventStr);
                return null;
            }
        }).filter(event => event !== null);
    }
    /**
     * Get high priority events
     */
    async getHighPriorityEvents() {
        const highPriorityQueue = `${this.QUEUE_KEY}:high`;
        const eventStrings = await redisService_js_1.redisService.lrange(highPriorityQueue, 0, 10); // Process up to 10 high priority events
        if (eventStrings.length === 0)
            return [];
        // Remove processed events from queue
        await redisService_js_1.redisService.ltrim(highPriorityQueue, eventStrings.length, -1);
        return eventStrings.map(eventStr => {
            try {
                return JSON.parse(eventStr);
            }
            catch (error) {
                console.error('Error parsing high priority event:', error);
                return null;
            }
        }).filter(event => event !== null);
    }
    /**
     * Group events by type for efficient processing
     */
    groupEventsByType(events) {
        const grouped = {
            analytics: [],
            session: [],
            ad: [],
            special: []
        };
        for (const event of events) {
            if (event.eventType.startsWith('session_')) {
                grouped.session.push(event);
            }
            else if (event.eventType.startsWith('ad_')) {
                grouped.ad.push(event);
            }
            else if (['user_signup', 'first_trade', 'premium_purchase'].includes(event.eventType)) {
                grouped.special.push(event);
            }
            else {
                grouped.analytics.push(event);
            }
        }
        return grouped;
    }
    /**
     * Process general analytics events
     */
    async processAnalyticsEvents(events) {
        if (events.length === 0)
            return;
        const analyticsData = events.map(event => ({
            userId: event.userId,
            eventType: event.eventType,
            eventData: event.eventData,
            sessionId: event.sessionId,
            userAgent: event.userAgent,
            ipAddress: event.ipAddress,
            timestamp: new Date(event.timestamp)
        }));
        await db_js_1.db.insert(schema_1.analytics).values(analyticsData);
    }
    /**
     * Process session-related events
     */
    async processSessionEvents(events) {
        if (events.length === 0)
            return;
        for (const event of events) {
            try {
                switch (event.eventType) {
                    case 'session_start':
                        await this.handleSessionStart(event);
                        break;
                    case 'session_update':
                        await this.handleSessionUpdate(event);
                        break;
                    case 'session_end':
                        await this.handleSessionEnd(event);
                        break;
                }
            }
            catch (error) {
                console.error(`Error processing session event ${event.eventType}:`, error);
            }
        }
    }
    /**
     * Process ad-related events
     */
    async processAdEvents(events) {
        if (events.length === 0)
            return;
        const adEventData = events.map(event => ({
            userId: event.userId,
            sessionId: event.sessionId,
            adType: event.eventData?.adType || 'unknown',
            adNetwork: event.eventData?.adNetwork,
            adUnitId: event.eventData?.adUnitId,
            eventType: event.eventType.replace('ad_', ''),
            rewardAmount: event.eventData?.rewardAmount,
            rewardType: event.eventData?.rewardType,
            revenue: event.eventData?.revenue,
            timestamp: new Date(event.timestamp),
            metadata: event.eventData
        }));
        await db_js_1.db.insert(schema_1.adEvents).values(adEventData);
    }
    /**
     * Process special events that require immediate attention
     */
    async processSpecialEvents(events) {
        for (const event of events) {
            try {
                switch (event.eventType) {
                    case 'user_signup':
                        await this.handleUserSignup(event);
                        break;
                    case 'first_trade':
                        await this.handleFirstTrade(event);
                        break;
                    case 'premium_purchase':
                        await this.handlePremiumPurchase(event);
                        break;
                }
                // Also record in main analytics
                await db_js_1.db.insert(schema_1.analytics).values({
                    userId: event.userId,
                    eventType: event.eventType,
                    eventData: event.eventData,
                    sessionId: event.sessionId,
                    userAgent: event.userAgent,
                    ipAddress: event.ipAddress,
                    timestamp: new Date(event.timestamp)
                });
            }
            catch (error) {
                console.error(`Error processing special event ${event.eventType}:`, error);
            }
        }
    }
    /**
     * Handle session start event
     */
    async handleSessionStart(event) {
        const sessionData = {
            userId: event.userId,
            sessionId: event.sessionId,
            startTime: new Date(event.timestamp),
            deviceInfo: event.eventData?.deviceInfo,
            screensOpened: 0,
            tradesOpened: 0,
            adsWatched: 0,
            virtualBalanceUsed: '0'
        };
        await db_js_1.db.insert(schema_1.userSessions).values(sessionData);
    }
    /**
     * Handle session update event
     */
    async handleSessionUpdate(event) {
        const updateData = {};
        if (event.eventData?.screensOpened !== undefined) {
            updateData.screensOpened = event.eventData.screensOpened;
        }
        if (event.eventData?.tradesOpened !== undefined) {
            updateData.tradesOpened = event.eventData.tradesOpened;
        }
        if (event.eventData?.adsWatched !== undefined) {
            updateData.adsWatched = event.eventData.adsWatched;
        }
        if (event.eventData?.virtualBalanceUsed !== undefined) {
            updateData.virtualBalanceUsed = event.eventData.virtualBalanceUsed;
        }
        if (Object.keys(updateData).length > 0) {
            await db_js_1.db.update(schema_1.userSessions)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.userSessions.sessionId, event.sessionId));
        }
    }
    /**
     * Handle session end event
     */
    async handleSessionEnd(event) {
        const endTime = new Date(event.timestamp);
        const sessions = await db_js_1.db
            .select()
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.sessionId, event.sessionId))
            .limit(1);
        if (sessions.length === 0)
            return;
        const session = sessions[0];
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
        await db_js_1.db.update(schema_1.userSessions)
            .set({
            endTime,
            duration,
            screensOpened: event.eventData?.screensOpened || session.screensOpened,
            tradesOpened: event.eventData?.tradesOpened || session.tradesOpened,
            adsWatched: event.eventData?.adsWatched || session.adsWatched,
            virtualBalanceUsed: event.eventData?.virtualBalanceUsed || session.virtualBalanceUsed
        })
            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.sessionId, event.sessionId));
    }
    /**
     * Handle user signup event
     */
    async handleUserSignup(event) {
        // Update user acquisition record with signup date
        await db_js_1.db.update(schema_1.userAcquisition)
            .set({ signupDate: new Date(event.timestamp) })
            .where((0, drizzle_orm_1.eq)(schema_1.userAcquisition.userId, event.userId));
    }
    /**
     * Handle first trade event
     */
    async handleFirstTrade(event) {
        // Update user acquisition record with first trade date
        await db_js_1.db.update(schema_1.userAcquisition)
            .set({ firstTradeDate: new Date(event.timestamp) })
            .where((0, drizzle_orm_1.eq)(schema_1.userAcquisition.userId, event.userId));
    }
    /**
     * Handle premium purchase event
     */
    async handlePremiumPurchase(event) {
        // This could trigger additional analytics or notifications
        console.log(`Premium purchase by user ${event.userId}:`, event.eventData);
        // Invalidate user dashboard cache
        const cacheKey = `user_dashboard_${event.userId}`;
        await redisService_js_1.redisService.del(cacheKey);
    }
    /**
     * Handle failed batch processing
     */
    async handleFailedBatch(error) {
        console.error('Failed to process analytics batch:', error);
        // Store failed events for manual review
        const failedEventsKey = 'analytics:failed_events';
        const timestamp = new Date().toISOString();
        await redisService_js_1.redisService.lpush(failedEventsKey, JSON.stringify({
            timestamp,
            error: error.message,
            stack: error.stack
        }));
        // Keep only last 100 failed event logs
        await redisService_js_1.redisService.ltrim(failedEventsKey, 0, 99);
    }
    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get queue statistics
     */
    async getQueueStats() {
        const [mainQueueLength, highPriorityQueueLength, failedEventsCount] = await Promise.all([
            redisService_js_1.redisService.llen(this.QUEUE_KEY),
            redisService_js_1.redisService.llen(`${this.QUEUE_KEY}:high`),
            redisService_js_1.redisService.llen('analytics:failed_events')
        ]);
        return {
            mainQueueLength,
            highPriorityQueueLength,
            failedEventsCount,
            isProcessing: this.isProcessing
        };
    }
    /**
     * Clear all queues (for maintenance)
     */
    async clearQueues() {
        await Promise.all([
            redisService_js_1.redisService.del(this.QUEUE_KEY),
            redisService_js_1.redisService.del(`${this.QUEUE_KEY}:high`),
            redisService_js_1.redisService.del('analytics:failed_events')
        ]);
    }
    /**
     * Replay failed events
     */
    async replayFailedEvents() {
        const failedEventsKey = 'analytics:failed_events';
        const failedEvents = await redisService_js_1.redisService.lrange(failedEventsKey, 0, -1);
        let replayedCount = 0;
        for (const eventStr of failedEvents) {
            try {
                const failedEvent = JSON.parse(eventStr);
                // Re-queue the event with high priority
                await this.queueEvent({
                    ...failedEvent,
                    priority: 'high'
                });
                replayedCount++;
            }
            catch (error) {
                console.error('Error replaying failed event:', error);
            }
        }
        // Clear failed events after replay
        if (replayedCount > 0) {
            await redisService_js_1.redisService.del(failedEventsKey);
        }
        return replayedCount;
    }
}
exports.AnalyticsQueueService = AnalyticsQueueService;
exports.analyticsQueueService = new AnalyticsQueueService();
