import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
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

export async function setupAuth(app: Express) {
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

    await storage.upsertUser(testUser);
    
    // Сохраняем в сессии
    (req.session as any).user = testUser;
    
    res.json({ success: true, user: testUser });
  });

  app.get("/api/logout", (req, res) => {
    (req.session as any).destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const user = (req.session as any).user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const dbUser = await storage.getUser(user.id);
    res.json(dbUser || user);
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user = (req.session as any).user;

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Добавляем пользователя в req.user для совместимости
  (req as any).user = { claims: { sub: user.id } };
  next();
};