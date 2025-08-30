"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
exports.getSession = getSession;
exports.setupAuth = setupAuth;
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const storage_js_1 = require("./storage.js");
function getSession() {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = (0, connect_pg_simple_1.default)(express_session_1.default);
    const sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
    });
    return (0, express_session_1.default)({
        name: process.env.SESSION_COOKIE_NAME || 'connection.sid',
        secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: sessionTtl,
        },
    });
}
async function setupAuth(app) {
    app.set("trust proxy", 1);
    app.use(getSession());
    // Простая аутентификация для разработки
    app.get("/api/login", async (req, res) => {
        // Создаем тестового пользователя
        const testUser = {
            id: 'dev-user-123',
            email: 'dev@example.com',
            firstName: 'Dev',
            lastName: 'User',
            profileImageUrl: 'https://via.placeholder.com/150',
        };
        await storage_js_1.storage.upsertUser(testUser);
        // Сохраняем в сессии
        req.session.user = testUser;
        res.json({ success: true, user: testUser });
    });
    app.get("/api/logout", (req, res) => {
        req.session.destroy(() => {
            res.json({ success: true });
        });
    });
    app.get("/api/auth/user", async (req, res) => {
        const user = req.session.user;
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const dbUser = await storage_js_1.storage.getUser(user.id);
        res.json(dbUser || user);
    });
}
const isAuthenticated = (req, res, next) => {
    const user = req.session.user;
    if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Добавляем пользователя в req.user для совместимости
    req.user = { claims: { sub: user.id } };
    next();
};
exports.isAuthenticated = isAuthenticated;
