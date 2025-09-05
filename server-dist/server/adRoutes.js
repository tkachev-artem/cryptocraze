"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdRoutes = registerAdRoutes;
const simpleOAuth_1 = require("./simpleOAuth");
const adService_1 = require("./services/adService");
const analyticsLogger_js_1 = __importDefault(require("./middleware/analyticsLogger.js"));
function registerAdRoutes(app) {
    // ============ AD SYSTEM ROUTES ============
    /**
     * @swagger
     * /api/ads/session/start:
     *   post:
     *     summary: Start an ad session
     *     tags: [Ads]
     *     security:
     *       - sessionAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               adId:
     *                 type: string
     *               placement:
     *                 type: string
     *                 enum: [task_completion, wheel_spin, box_opening, trading_bonus, screen_transition]
     *               userAgent:
     *                 type: string
     *               deviceInfo:
     *                 type: object
     *     responses:
     *       200:
     *         description: Ad session started successfully
     *       403:
     *         description: Premium user or fraud detected
     *       429:
     *         description: Rate limit exceeded
     */
    app.post('/api/ads/session/start', simpleOAuth_1.isAuthenticated, async (req, res) => {
        try {
            const userId = req.user?.id ?? req.user?.claims?.sub;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { adId, placement, userAgent, deviceInfo } = req.body;
            if (!adId || !placement) {
                res.status(400).json({
                    success: false,
                    message: 'adId and placement are required'
                });
                return;
            }
            const sessionId = await adService_1.adService.startAdSession(userId, {
                adId,
                placement,
                userAgent: userAgent || req.headers['user-agent'] || 'unknown',
                deviceInfo
            }, req);
            res.json({
                success: true,
                sessionId,
                message: 'Ad session started successfully'
            });
        }
        catch (error) {
            console.error('[AdRoutes] Ad session start error:', error);
            if (error instanceof adService_1.AdServiceError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    code: error.code
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to start ad session'
            });
        }
    });
    /**
     * @swagger
     * /api/ads/session/complete:
     *   post:
     *     summary: Complete an ad session and process reward
     *     tags: [Ads]
     *     security:
     *       - sessionAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               adId:
     *                 type: string
     *               watchTime:
     *                 type: number
     *               reward:
     *                 type: object
     *                 properties:
     *                   type:
     *                     type: string
     *                     enum: [money, coins, energy, trading_bonus]
     *                   amount:
     *                     type: number
     *                   multiplier:
     *                     type: number
     *                   bonusPercentage:
     *                     type: number
     *               completed:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Ad session completed and reward processed
     *       403:
     *         description: Fraud detected
     *       404:
     *         description: Ad session not found
     */
    app.post('/api/ads/session/complete', simpleOAuth_1.isAuthenticated, analyticsLogger_js_1.default.adLogger(), async (req, res) => {
        try {
            const userId = req.user?.id ?? req.user?.claims?.sub;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const { adId, watchTime, reward, completed } = req.body;
            if (!adId || typeof watchTime !== 'number' || !reward) {
                res.status(400).json({
                    success: false,
                    message: 'adId, watchTime, and reward are required'
                });
                return;
            }
            const result = await adService_1.adService.completeAdSession(userId, {
                adId,
                watchTime,
                reward,
                completed: completed !== false // Default to true if not specified
            });
            res.json({
                success: result.success,
                fraudDetected: result.fraudDetected,
                reward: result.reward,
                message: result.success ? 'Reward processed successfully' : 'Ad completion failed'
            });
        }
        catch (error) {
            console.error('[AdRoutes] Ad session complete error:', error);
            if (error instanceof adService_1.AdServiceError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    fraudDetected: error.name === 'AdFraudError'
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to complete ad session'
            });
        }
    });
    /**
     * @swagger
     * /api/ads/user/stats:
     *   get:
     *     summary: Get user ad watching statistics
     *     tags: [Ads]
     *     security:
     *       - sessionAuth: []
     *     responses:
     *       200:
     *         description: User ad statistics
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     dailyRewards:
     *                       type: number
     *                     hourlyRewards:
     *                       type: number
     *                     totalRewards:
     *                       type: number
     *                     canWatchAd:
     *                       type: boolean
     *                     nextAdAvailableAt:
     *                       type: string
     *                       format: date-time
     */
    app.get('/api/ads/user/stats', simpleOAuth_1.isAuthenticated, async (req, res) => {
        try {
            const userId = req.user?.id ?? req.user?.claims?.sub;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const stats = await adService_1.adService.getUserAdStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('[AdRoutes] User ad stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user ad statistics'
            });
        }
    });
    /**
     * @swagger
     * /api/ads/analytics:
     *   get:
     *     summary: Get ad performance analytics (admin only)
     *     tags: [Ads]
     *     security:
     *       - sessionAuth: []
     *     parameters:
     *       - in: query
     *         name: timeframe
     *         schema:
     *           type: string
     *           enum: [day, week, month]
     *         description: Analytics timeframe
     *     responses:
     *       200:
     *         description: Ad performance analytics
     *       403:
     *         description: Access denied
     */
    app.get('/api/ads/analytics', simpleOAuth_1.isAdminWithAuth, async (req, res) => {
        try {
            const timeframe = req.query.timeframe || 'day';
            const analytics = await adService_1.adService.getAnalytics(timeframe);
            res.json({
                success: true,
                data: analytics
            });
        }
        catch (error) {
            console.error('[AdRoutes] Ad analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch ad analytics'
            });
        }
    });
    /**
     * @swagger
     * /api/ads/check-eligibility:
     *   get:
     *     summary: Check if user is eligible to watch ads
     *     tags: [Ads]
     *     security:
     *       - sessionAuth: []
     *     parameters:
     *       - in: query
     *         name: placement
     *         schema:
     *           type: string
     *           enum: [task_completion, wheel_spin, box_opening, trading_bonus, screen_transition]
     *         description: Ad placement to check eligibility for
     *     responses:
     *       200:
     *         description: Eligibility status
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     eligible:
     *                       type: boolean
     *                     reason:
     *                       type: string
     *                     isPremium:
     *                       type: boolean
     *                     canWatchAd:
     *                       type: boolean
     *                     nextAdAvailableAt:
     *                       type: string
     *                       format: date-time
     */
    app.get('/api/ads/check-eligibility', simpleOAuth_1.isAuthenticated, async (req, res) => {
        try {
            const userId = req.user?.id ?? req.user?.claims?.sub;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const placement = req.query.placement;
            // Get user ad stats to check eligibility
            const stats = await adService_1.adService.getUserAdStats(userId);
            // Check if user has premium (using the ad service method)
            let isPremium = false;
            try {
                // We need to get user data to check premium status
                // This would typically come from the user service or database
                // For now, we'll assume not premium unless we can check
                isPremium = false;
            }
            catch (error) {
                console.warn('[AdRoutes] Could not check premium status:', error);
            }
            const eligible = !isPremium && stats.canWatchAd;
            let reason = '';
            if (isPremium) {
                reason = 'Premium users have ad-free experience';
            }
            else if (!stats.canWatchAd) {
                if (stats.dailyRewards >= 50) { // Daily limit from AD_CONFIG
                    reason = 'Daily ad limit reached';
                }
                else if (stats.hourlyRewards >= 5) { // Hourly limit from AD_CONFIG
                    reason = 'Hourly ad limit reached';
                }
                else {
                    reason = 'Please wait before watching another ad';
                }
            }
            res.json({
                success: true,
                data: {
                    eligible,
                    reason,
                    isPremium,
                    canWatchAd: stats.canWatchAd,
                    nextAdAvailableAt: stats.nextAdAvailableAt,
                    dailyRewards: stats.dailyRewards,
                    totalRewards: stats.totalRewards
                }
            });
        }
        catch (error) {
            console.error('[AdRoutes] Check eligibility error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check ad eligibility'
            });
        }
    });
}
