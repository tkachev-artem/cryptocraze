import { redisService } from './redisService.js';
import { analyticsService } from './analyticsService.js';
import { db } from '../db.js';
import { 
  analytics,
  userSessions,
  userAcquisition,
  adEvents,
  type InsertUserSession,
  type InsertAdEvent
} from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Analytics Queue Service for batch processing of analytics events
 * Uses Redis for queuing and rate limiting to prevent database overload
 */
export class AnalyticsQueueService {
  private readonly QUEUE_KEY = 'analytics:events';
  private readonly PROCESSING_KEY = 'analytics:processing';
  private readonly BATCH_SIZE = 50;
  private readonly PROCESS_INTERVAL = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;

  constructor() {
    this.startBatchProcessor();
  }

  /**
   * Add analytics event to queue for batch processing
   */
  async queueEvent(eventData: {
    userId?: string | null;
    eventType: string;
    eventData?: any;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    timestamp?: Date;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<void> {
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

    await redisService.lpush(queueKey, JSON.stringify(event));

    // Process high priority events immediately
    if (eventData.priority === 'high') {
      setImmediate(() => this.processHighPriorityEvents());
    }
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor(): void {
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
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      
      // Get batch of events from queue
      const events = await this.getBatchEvents();
      if (events.length === 0) return;

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

    } catch (error) {
      console.error('Error processing analytics batch:', error);
      // Handle failed events by re-queueing with retry logic
      await this.handleFailedBatch(error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process high priority events immediately
   */
  private async processHighPriorityEvents(): Promise<void> {
    try {
      const events = await this.getHighPriorityEvents();
      if (events.length === 0) return;

      console.log(`Processing ${events.length} high priority analytics events`);

      const groupedEvents = this.groupEventsByType(events);
      await Promise.all([
        this.processAnalyticsEvents(groupedEvents.analytics || []),
        this.processSessionEvents(groupedEvents.session || []),
        this.processAdEvents(groupedEvents.ad || []),
        this.processSpecialEvents(groupedEvents.special || [])
      ]);

    } catch (error) {
      console.error('Error processing high priority events:', error);
    }
  }

  /**
   * Get batch of events from the main queue
   */
  private async getBatchEvents(): Promise<any[]> {
    const eventStrings = await redisService.lrange(this.QUEUE_KEY, 0, this.BATCH_SIZE - 1);
    if (eventStrings.length === 0) return [];

    // Remove processed events from queue
    await redisService.ltrim(this.QUEUE_KEY, eventStrings.length, -1);

    return eventStrings.map(eventStr => {
      try {
        return JSON.parse(eventStr);
      } catch (error) {
        console.error('Error parsing analytics event:', error, eventStr);
        return null;
      }
    }).filter(event => event !== null);
  }

  /**
   * Get high priority events
   */
  private async getHighPriorityEvents(): Promise<any[]> {
    const highPriorityQueue = `${this.QUEUE_KEY}:high`;
    const eventStrings = await redisService.lrange(highPriorityQueue, 0, 10); // Process up to 10 high priority events
    
    if (eventStrings.length === 0) return [];

    // Remove processed events from queue
    await redisService.ltrim(highPriorityQueue, eventStrings.length, -1);

    return eventStrings.map(eventStr => {
      try {
        return JSON.parse(eventStr);
      } catch (error) {
        console.error('Error parsing high priority event:', error);
        return null;
      }
    }).filter(event => event !== null);
  }

  /**
   * Group events by type for efficient processing
   */
  private groupEventsByType(events: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {
      analytics: [],
      session: [],
      ad: [],
      special: []
    };

    for (const event of events) {
      if (event.eventType.startsWith('session_')) {
        grouped.session.push(event);
      } else if (event.eventType.startsWith('ad_')) {
        grouped.ad.push(event);
      } else if (['user_signup', 'first_trade', 'premium_purchase'].includes(event.eventType)) {
        grouped.special.push(event);
      } else {
        grouped.analytics.push(event);
      }
    }

    return grouped;
  }

  /**
   * Process general analytics events
   */
  private async processAnalyticsEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    const analyticsData = events.map(event => ({
      userId: event.userId,
      eventType: event.eventType,
      eventData: event.eventData,
      sessionId: event.sessionId,
      userAgent: event.userAgent,
      ipAddress: event.ipAddress,
      country: event.country,
      timestamp: new Date(event.timestamp)
    }));

    await db.insert(analytics).values(analyticsData);
  }

  /**
   * Process session-related events
   */
  private async processSessionEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

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
      } catch (error) {
        console.error(`Error processing session event ${event.eventType}:`, error);
      }
    }
  }

  /**
   * Process ad-related events
   */
  private async processAdEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    const adEventData: InsertAdEvent[] = events.map(event => ({
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

    await db.insert(adEvents).values(adEventData);
  }

  /**
   * Process special events that require immediate attention
   */
  private async processSpecialEvents(events: any[]): Promise<void> {
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
        await db.insert(analytics).values({
          userId: event.userId,
          eventType: event.eventType,
          eventData: event.eventData,
          sessionId: event.sessionId,
          userAgent: event.userAgent,
          ipAddress: event.ipAddress,
          timestamp: new Date(event.timestamp)
        });

      } catch (error) {
        console.error(`Error processing special event ${event.eventType}:`, error);
      }
    }
  }

  /**
   * Handle session start event
   */
  private async handleSessionStart(event: any): Promise<void> {
    const sessionData: InsertUserSession = {
      userId: event.userId,
      sessionId: event.sessionId,
      startTime: new Date(event.timestamp),
      deviceInfo: event.eventData?.deviceInfo,
      screensOpened: 0,
      tradesOpened: 0,
      adsWatched: 0,
      virtualBalanceUsed: '0'
    };

    await db.insert(userSessions).values(sessionData);
  }

  /**
   * Handle session update event
   */
  private async handleSessionUpdate(event: any): Promise<void> {
    const updateData: Partial<InsertUserSession> = {};

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
      await db.update(userSessions)
        .set(updateData)
        .where(eq(userSessions.sessionId, event.sessionId));
    }
  }

  /**
   * Handle session end event
   */
  private async handleSessionEnd(event: any): Promise<void> {
    const endTime = new Date(event.timestamp);
    
    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, event.sessionId))
      .limit(1);

    if (sessions.length === 0) return;

    const session = sessions[0];
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    await db.update(userSessions)
      .set({
        endTime,
        duration,
        screensOpened: event.eventData?.screensOpened || session.screensOpened,
        tradesOpened: event.eventData?.tradesOpened || session.tradesOpened,
        adsWatched: event.eventData?.adsWatched || session.adsWatched,
        virtualBalanceUsed: event.eventData?.virtualBalanceUsed || session.virtualBalanceUsed
      })
      .where(eq(userSessions.sessionId, event.sessionId));
  }

  /**
   * Handle user signup event
   */
  private async handleUserSignup(event: any): Promise<void> {
    // Update user acquisition record with signup date
    await db.update(userAcquisition)
      .set({ signupDate: new Date(event.timestamp) })
      .where(eq(userAcquisition.userId, event.userId));
  }

  /**
   * Handle first trade event
   */
  private async handleFirstTrade(event: any): Promise<void> {
    // Update user acquisition record with first trade date
    await db.update(userAcquisition)
      .set({ firstTradeDate: new Date(event.timestamp) })
      .where(eq(userAcquisition.userId, event.userId));
  }

  /**
   * Handle premium purchase event
   */
  private async handlePremiumPurchase(event: any): Promise<void> {
    // This could trigger additional analytics or notifications
    console.log(`Premium purchase by user ${event.userId}:`, event.eventData);
    
    // Invalidate user dashboard cache
    const cacheKey = `user_dashboard_${event.userId}`;
    await redisService.del(cacheKey);
  }

  /**
   * Handle failed batch processing
   */
  private async handleFailedBatch(error: any): Promise<void> {
    console.error('Failed to process analytics batch:', error);
    
    // Store failed events for manual review
    const failedEventsKey = 'analytics:failed_events';
    const timestamp = new Date().toISOString();
    
    await redisService.lpush(failedEventsKey, JSON.stringify({
      timestamp,
      error: error.message,
      stack: error.stack
    }));

    // Keep only last 100 failed event logs
    await redisService.ltrim(failedEventsKey, 0, 99);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    mainQueueLength: number;
    highPriorityQueueLength: number;
    failedEventsCount: number;
    isProcessing: boolean;
  }> {
    const [mainQueueLength, highPriorityQueueLength, failedEventsCount] = await Promise.all([
      redisService.llen(this.QUEUE_KEY),
      redisService.llen(`${this.QUEUE_KEY}:high`),
      redisService.llen('analytics:failed_events')
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
  async clearQueues(): Promise<void> {
    await Promise.all([
      redisService.del(this.QUEUE_KEY),
      redisService.del(`${this.QUEUE_KEY}:high`),
      redisService.del('analytics:failed_events')
    ]);
  }

  /**
   * Replay failed events
   */
  async replayFailedEvents(): Promise<number> {
    const failedEventsKey = 'analytics:failed_events';
    const failedEvents = await redisService.lrange(failedEventsKey, 0, -1);
    
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
      } catch (error) {
        console.error('Error replaying failed event:', error);
      }
    }

    // Clear failed events after replay
    if (replayedCount > 0) {
      await redisService.del(failedEventsKey);
    }

    return replayedCount;
  }
}

export const analyticsQueueService = new AnalyticsQueueService();