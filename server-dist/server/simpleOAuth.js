"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminWithAuth = exports.isAdmin = exports.isAuthenticated = void 0;
exports.setupSimpleOAuth = setupSimpleOAuth;
const storage_js_1 = require("./storage.js");
const autoRewards_js_1 = require("./services/autoRewards.js");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const analyticsLogger_js_1 = __importDefault(require("./middleware/analyticsLogger.js"));
// Simple OAuth without Passport.js
function setupSimpleOAuth(app) {
    console.log('🔐 Setting up Simple OAuth...');
    // Trust proxy for tunnel
    app.set('trust proxy', true);
    // Session configuration
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = (0, connect_pg_simple_1.default)(express_session_1.default);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: 'sessions',
    });
    app.use((0, express_session_1.default)({
        name: 'crypto_session',
        secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: sessionTtl,
            sameSite: 'lax',
        },
    }));
    // Google OAuth URLs
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
    const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`🔗 OAuth Callback URL: ${CALLBACK_URL}`);
    // Start Google OAuth flow
    app.get('/api/auth/google', (req, res) => {
        console.log('🚀 Starting Google OAuth flow...');
        const scopes = ['profile', 'email'];
        const state = Math.random().toString(36).substring(7);
        // Store state in session for security
        req.session.oauth_state = state;
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        googleAuthUrl.searchParams.set('redirect_uri', CALLBACK_URL);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', scopes.join(' '));
        googleAuthUrl.searchParams.set('state', state);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        console.log(`🔄 Redirecting to: ${googleAuthUrl.toString()}`);
        res.redirect(googleAuthUrl.toString());
    });
    // Handle Google OAuth callback
    app.get('/api/auth/google/callback', async (req, res) => {
        console.log('📥 Google OAuth callback received');
        try {
            const { code, state } = req.query;
            // Verify state parameter
            if (!state || state !== req.session.oauth_state) {
                console.error('❌ Invalid state parameter');
                return res.redirect(`${FRONTEND_URL}/?error=invalid_state`);
            }
            if (!code) {
                console.error('❌ No authorization code received');
                return res.redirect(`${FRONTEND_URL}/?error=no_code`);
            }
            console.log('🔑 Exchanging code for tokens...');
            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: CALLBACK_URL,
                }),
            });
            if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenResponse.status}`);
            }
            const tokenData = await tokenResponse.json();
            console.log('✅ Tokens received');
            // Get user profile
            console.log('👤 Fetching user profile...');
            const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
            if (!profileResponse.ok) {
                throw new Error(`Profile fetch failed: ${profileResponse.status}`);
            }
            const profile = await profileResponse.json();
            console.log(`📋 User profile: ${profile.email} (${profile.id})`);
            // Check if user exists
            let user = await storage_js_1.storage.getUser(profile.id);
            if (user) {
                console.log('👋 Existing user logging in');
                // Update profile data, but keep custom avatar if user uploaded one
                user = await storage_js_1.storage.upsertUser({
                    ...user,
                    email: profile.email,
                    firstName: profile.given_name,
                    lastName: profile.family_name,
                    // Only update profileImageUrl if user doesn't have a custom one (uploaded to /uploads)
                    profileImageUrl: user.profileImageUrl?.startsWith('/uploads') ? user.profileImageUrl : profile.picture,
                    updatedAt: new Date(),
                });
            }
            else {
                console.log('🆕 Creating new user');
                // Create new user with starting balance
                const startTotal = 10000;
                const startFree = (startTotal * 0.3).toFixed(8); // 3000.00000000
                const startBalance = (startTotal - Number(startFree)).toFixed(2); // 7000.00
                user = await storage_js_1.storage.upsertUser({
                    id: profile.id,
                    email: profile.email,
                    firstName: profile.given_name,
                    lastName: profile.family_name,
                    profileImageUrl: profile.picture,
                    phone: null,
                    balance: startBalance,
                    freeBalance: startFree,
                    coins: 0,
                    ratingScore: 0,
                    tradesCount: 0,
                    totalTradesVolume: "0.00",
                    successfulTradesPercentage: "0.00",
                    maxProfit: "0.00",
                    maxLoss: "0.00",
                    averageTradeAmount: "0.00",
                    rewardsCount: 0,
                });
            }
            // Store user ID in session
            req.session.userId = user.id;
            console.log(`✅ User authenticated: ${user.id}`);
            // Логируем событие логина в ClickHouse
            console.log(`[Analytics Debug] About to log login event for user ${user.id}`);
            try {
                // Используем BigInt для больших ID, затем Number для ClickHouse
                const userIdNumber = Number(BigInt(user.id));
                console.log(`[Analytics Debug] Calling logUserEvent with userId: ${userIdNumber}, eventType: login`);
                await analyticsLogger_js_1.default.logUserEvent(userIdNumber, 'login', {
                    email: profile.email,
                    firstName: profile.given_name,
                    lastName: profile.family_name,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    isNewUser: !user // true если пользователь был создан только что
                }, `oauth-session-${Date.now()}`);
                console.log(`[Analytics] ✅ Login event logged successfully for user ${user.id}`);
            }
            catch (error) {
                console.error('[Analytics] ❌ Failed to log login event:', error);
                console.error('[Analytics] ❌ Error details:', error?.message, error?.stack);
            }
            // Clean up OAuth state
            delete req.session.oauth_state;
            // Redirect to frontend
            res.redirect(`${FRONTEND_URL}/`);
        }
        catch (error) {
            console.error('❌ OAuth callback error:', error);
            res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
        }
    });
    // Get current user
    app.get('/api/auth/user', async (req, res) => {
        console.log('🔍 Checking user authentication...');
        const userId = req.session?.userId;
        if (!userId) {
            console.log('❌ No user in session');
            return res.status(401).json({ message: 'Not authenticated' });
        }
        try {
            // Apply auto rewards
            await (0, autoRewards_js_1.applyAutoRewards)(userId);
            // Get fresh user data
            const user = await storage_js_1.storage.getUser(userId);
            if (!user) {
                console.log(`❌ User ${userId} not found in database`);
                delete req.session.userId;
                return res.status(404).json({ message: 'User not found' });
            }
            console.log(`✅ User data returned: ${user.id}`);
            res.json(user);
        }
        catch (error) {
            console.error('❌ Error fetching user:', error);
            res.status(500).json({ message: 'Failed to fetch user' });
        }
    });
    // Logout
    app.get('/api/auth/logout', (req, res) => {
        console.log('👋 User logging out');
        req.session?.destroy((err) => {
            if (err) {
                console.error('❌ Session destroy error:', err);
            }
            res.clearCookie('crypto_session');
            res.redirect(`${FRONTEND_URL}/`);
        });
    });
    // Update user data
    app.put('/api/auth/user/update', async (req, res) => {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        try {
            const { phone, firstName, lastName, coins, balance } = req.body;
            const user = await storage_js_1.storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const updatedUser = await storage_js_1.storage.upsertUser({
                ...user,
                phone: phone !== undefined ? phone : user.phone,
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                coins: coins !== undefined ? coins : user.coins,
                balance: balance !== undefined ? balance : user.balance,
                updatedAt: new Date(),
            });
            res.json(updatedUser);
        }
        catch (error) {
            console.error('❌ Error updating user:', error);
            res.status(500).json({ message: 'Failed to update user' });
        }
    });
    // Update game data
    app.put('/api/auth/user/game-data', async (req, res) => {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        try {
            const { coins, balance, ratingScore, tradesCount, totalTradesVolume, successfulTradesPercentage, maxProfit, maxLoss, averageTradeAmount, rewardsCount } = req.body;
            const user = await storage_js_1.storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const updatedUser = await storage_js_1.storage.upsertUser({
                ...user,
                coins: coins !== undefined ? coins : user.coins,
                balance: balance !== undefined ? balance : user.balance,
                ratingScore: ratingScore !== undefined ? ratingScore : user.ratingScore,
                tradesCount: tradesCount !== undefined ? tradesCount : user.tradesCount,
                totalTradesVolume: totalTradesVolume !== undefined ? totalTradesVolume : user.totalTradesVolume,
                successfulTradesPercentage: successfulTradesPercentage !== undefined ? successfulTradesPercentage : user.successfulTradesPercentage,
                maxProfit: maxProfit !== undefined ? maxProfit : user.maxProfit,
                maxLoss: maxLoss !== undefined ? maxLoss : user.maxLoss,
                averageTradeAmount: averageTradeAmount !== undefined ? averageTradeAmount : user.averageTradeAmount,
                rewardsCount: rewardsCount !== undefined ? rewardsCount : user.rewardsCount,
                updatedAt: new Date(),
            });
            res.json(updatedUser);
        }
        catch (error) {
            console.error('❌ Error updating game data:', error);
            res.status(500).json({ message: 'Failed to update game data' });
        }
    });
    console.log('✅ Simple OAuth setup complete');
}
// Authentication middleware
const isAuthenticated = (req, res, next) => {
    // Skip auth only for static mode
    const shouldSkipAuth = process.env.STATIC_ONLY === 'true';
    if (shouldSkipAuth) {
        req.user = { id: 'test-user' };
        return next();
    }
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // Add user ID to request for convenience
    req.user = { id: userId };
    next();
};
exports.isAuthenticated = isAuthenticated;
// Admin middleware (placeholder - implement based on your needs)
const isAdmin = async (req, res, next) => {
    // Skip admin auth if disabled for testing/development
    const shouldSkipAuth = process.env.STATIC_ONLY === 'true' || process.env.DISABLE_ADMIN_AUTH === 'true';
    if (shouldSkipAuth) {
        req.user = { id: 'test-admin', role: 'admin' };
        return next();
    }
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await storage_js_1.storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is admin
        if (user.role === 'admin') {
            req.user = user;
            return next();
        }
        res.status(403).json({ message: 'Admin access required' });
    }
    catch (error) {
        console.error('Error checking admin role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.isAdmin = isAdmin;
// Combined admin middleware that handles both authentication and admin check
const isAdminWithAuth = async (req, res, next) => {
    // Skip both auth and admin check if disabled for testing/development  
    const shouldSkipAuth = process.env.STATIC_ONLY === 'true' || process.env.DISABLE_ADMIN_AUTH === 'true';
    if (shouldSkipAuth) {
        req.user = { id: 'test-admin', role: 'admin' };
        return next();
    }
    // Normal flow: check authentication first
    const userId = req.session?.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await storage_js_1.storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if user is admin
        if (user.role === 'admin') {
            req.user = user;
            return next();
        }
        res.status(403).json({ message: 'Admin access required' });
    }
    catch (error) {
        console.error('Error checking admin role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.isAdminWithAuth = isAdminWithAuth;
