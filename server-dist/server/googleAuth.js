"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.isAuthenticated = void 0;
exports.getSession = getSession;
exports.setupAuth = setupAuth;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const storage_js_1 = require("./storage.js");
const autoRewards_js_1 = require("./services/autoRewards.js");
function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = (0, connect_pg_simple_1.default)(express_session_1.default);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: 'sessions',
    });
    // Allow overriding cookie flags via environment
    const cookieSameSite = (process.env.SESSION_COOKIE_SAMESITE || 'lax');
    const cookieSecureEnv = process.env.SESSION_COOKIE_SECURE;
    const cookieSecure = typeof cookieSecureEnv === 'string'
        ? cookieSecureEnv.toLowerCase() === 'true'
        : process.env.NODE_ENV === 'production';
    return (0, express_session_1.default)({
        name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
        secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: cookieSecure,
            maxAge: sessionTtl,
            sameSite: cookieSameSite,
        },
    });
}
async function setupAuth(app) {
    app.set('trust proxy', 1);
    // CORS для фронтенда - ДОЛЖЕН БЫТЬ ПЕРЕД ВСЕМИ РОУТАМИ
    app.use((req, res, next) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.header('Access-Control-Allow-Origin', frontendUrl);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        }
        else {
            next();
        }
    });
    app.use(getSession());
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    // Debug route to force session write and check Set-Cookie in non-production
    if (process.env.NODE_ENV !== 'production') {
        app.get('/api/_debug/session', (req, res) => {
            req.session.debug = {
                at: new Date().toISOString(),
            };
            res.json({ ok: true, message: 'Session should be set', sessionId: req.sessionID });
        });
    }
    // Google OAuth Strategy
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || process.env.TUNNEL_URL + '/api/auth/google/callback' || 'http://localhost:3001/api/auth/google/callback',
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Сначала проверяем, существует ли пользователь
            const existingUser = await storage_js_1.storage.getUser(profile.id);
            if (existingUser) {
                // Пользователь существует - обновляем только профильные данные
                const updatedUser = await storage_js_1.storage.upsertUser({
                    ...existingUser, // Сохраняем все существующие данные
                    email: profile.emails?.[0]?.value,
                    firstName: profile.name?.givenName,
                    lastName: profile.name?.familyName,
                    profileImageUrl: profile.photos?.[0]?.value,
                    updatedAt: new Date(),
                });
                // info: user logged in
                return done(null, updatedUser);
            }
            else {
                // Новый пользователь - создаем с начальными значениями
                // Автоматически делим стартовые 10,000 на 70/30 между balance и freeBalance
                const startTotal = 10000;
                const startFree = (startTotal * 0.3).toFixed(8); // 3000.00000000
                const startBalance = (startTotal - Number(startFree)).toFixed(2); // 7000.00
                const newUser = await storage_js_1.storage.upsertUser({
                    id: profile.id,
                    email: profile.emails?.[0]?.value,
                    firstName: profile.name?.givenName,
                    lastName: profile.name?.familyName,
                    profileImageUrl: profile.photos?.[0]?.value,
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
                // info: new user created
                return done(null, newUser);
            }
        }
        catch (error) {
            console.error('Ошибка в Google OAuth стратегии:', error);
            return done(error);
        }
    }));
    passport_1.default.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport_1.default.deserializeUser(async (id, done) => {
        try {
            const user = await storage_js_1.storage.getUser(id);
            done(null, user);
        }
        catch (error) {
            done(error, undefined);
        }
    });
    // Google OAuth routes
    app.get('/api/auth/google', passport_1.default.authenticate('google'));
    app.get('/api/auth/google/callback', passport_1.default.authenticate('google', {
        failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login',
        successRedirect: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/'
    }));
    // Logout route (clears session and cookies)
    app.get('/api/auth/logout', (req, res) => {
        req.logout(() => {
            const finish = () => {
                const baseOptions = {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                };
                const cookieNames = [process.env.SESSION_COOKIE_NAME || 'connection.sid', 'connect.sid'];
                for (const name of cookieNames) {
                    res.clearCookie(name, baseOptions);
                    res.clearCookie(name, { ...baseOptions, domain: 'localhost' });
                    res.clearCookie(name, { ...baseOptions, path: '/api' });
                    res.clearCookie(name, { ...baseOptions, domain: 'localhost', path: '/api' });
                    res.cookie(name, '', { ...baseOptions, expires: new Date(0) });
                    res.cookie(name, '', { ...baseOptions, domain: 'localhost', expires: new Date(0) });
                    res.cookie(name, '', { ...baseOptions, path: '/api', expires: new Date(0) });
                    res.cookie(name, '', { ...baseOptions, domain: 'localhost', path: '/api', expires: new Date(0) });
                }
                res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173/');
            };
            if (req.session?.destroy) {
                req.session.destroy(finish);
            }
            else {
                finish();
            }
        });
    });
    // Get current user
    app.get('/api/auth/user', async (req, res) => {
        const reqUser = req.user || {};
        const currentUserId = reqUser.id || reqUser?.claims?.sub;
        console.log(`🌐 API /auth/user запрос от пользователя: ${currentUserId || 'неизвестен'}`);
        console.log(`🔐 Аутентифицирован: ${req.isAuthenticated()}`);
        if (req.isAuthenticated()) {
            try {
                // Перед отдачей пользователя — применим автоуровни (если пороги уже достигнуты)
                await (0, autoRewards_js_1.applyAutoRewards)(currentUserId);
                // Получаем свежие данные из базы данных
                const freshUser = await storage_js_1.storage.getUser(currentUserId);
                if (freshUser) {
                    console.log(`📊 Возвращаем данные пользователя ${freshUser.id}: энергия=${freshUser.energyTasksBonus}, баланс=${freshUser.balance}`);
                    res.json(freshUser);
                }
                else {
                    console.log(`❌ Пользователь ${currentUserId} не найден в БД`);
                    res.status(404).json({ message: 'User not found' });
                }
            }
            catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).json({ message: "Failed to fetch user" });
            }
        }
        else {
            console.log(`❌ Пользователь не аутентифицирован`);
            res.status(401).json({ message: 'Not authenticated' });
        }
    });
    // Update user data
    app.put('/api/auth/user/update', exports.isAuthenticated, async (req, res) => {
        try {
            const userId = req.user?.id || req.user?.claims?.sub;
            const { phone, firstName, lastName, coins, balance } = req.body;
            const user = await storage_js_1.storage.getUser(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
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
            console.error("Error updating user:", error);
            res.status(500).json({ message: "Failed to update user" });
        }
    });
    // Update game data (coins, balance, rating)
    app.put('/api/auth/user/game-data', exports.isAuthenticated, async (req, res) => {
        try {
            const userId = req.user.id;
            const { coins, balance, ratingScore, tradesCount, totalTradesVolume, successfulTradesPercentage, maxProfit, maxLoss, averageTradeAmount, rewardsCount } = req.body;
            const user = await storage_js_1.storage.getUser(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
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
            console.error("Error updating game data:", error);
            res.status(500).json({ message: "Failed to update game data" });
        }
    });
}
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};
exports.isAuthenticated = isAuthenticated;
const isAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const user = await storage_js_1.storage.getUser(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Проверяем роль пользователя
        if (user.role === 'admin') {
            next();
            return;
        }
        res.status(403).json({ message: 'Admin access required' });
    }
    catch (error) {
        console.error('Error checking admin role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.isAdmin = isAdmin;
