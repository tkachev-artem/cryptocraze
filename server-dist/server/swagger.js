"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerAuth = exports.swaggerUiOptions = exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CryptoCraze API',
            version: '2.0.0',
            description: 'Production-ready API for cryptocurrency trading platform with gamification and real-time features',
            contact: {
                name: 'API Support',
                email: 'support@cryptocraze.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'Аутентификация и управление пользователями'
            },
            {
                name: 'Trading',
                description: 'Торговые операции'
            },
            {
                name: 'Binance',
                description: 'Эндпоинты для работы с Binance API'
            },
            {
                name: 'Уведомления',
                description: 'Система уведомлений пользователей'
            },
            {
                name: 'Premium',
                description: 'Premium подписки и платежи'
            },
            {
                name: 'Gamification',
                description: 'Геймификация и награды'
            },
            {
                name: 'Tasks',
                description: 'Система заданий пользователей'
            },
            {
                name: 'Energy',
                description: 'Энергетическая система'
            },
            {
                name: 'Admin',
                description: 'Административные функции (требуют права администратора)'
            },
            {
                name: 'Analytics',
                description: 'Аналитика и статистика'
            }
        ],
        servers: [
            {
                url: process.env.TUNNEL_URL ? `${process.env.TUNNEL_URL}/api` : `http://localhost:${process.env.PORT || 3001}`,
                description: 'Production API server'
            },
            {
                url: `http://localhost:${process.env.PORT || 3001}`,
                description: 'Development API server'
            }
        ],
        components: {
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        profileImageUrl: { type: 'string', description: 'URL аватара пользователя' },
                        phone: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        // Финансы
                        balance: { type: 'string', description: 'Деньги' },
                        coins: { type: 'number', description: 'Монеты' },
                        // Рейтинг и статистика
                        ratingScore: { type: 'number', description: 'Рейтинг в баллах' },
                        ratingRank30Days: { type: 'number', description: 'Номер в рейтинге за 30 дней' },
                        // Торговля
                        tradesCount: { type: 'number', description: 'Количество сделок' },
                        totalTradesVolume: { type: 'string', description: 'Сумма сделок в деньгах' },
                        successfulTradesPercentage: { type: 'string', description: 'Процент успешных сделок' },
                        maxProfit: { type: 'string', description: 'Максимальный профит' },
                        maxLoss: { type: 'string', description: 'Максимальный убыток' },
                        averageTradeAmount: { type: 'string', description: 'Средняя сумма сделки' },
                        // Награды
                        rewardsCount: { type: 'number', description: 'Количество наград' }
                    }
                },
                TradingPair: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        symbol: { type: 'string' },
                        baseAsset: { type: 'string' },
                        quoteAsset: { type: 'string' },
                        isActive: { type: 'boolean' },
                        minTradeAmount: { type: 'string' },
                        maxLeverage: { type: 'number' }
                    }
                },
                PriceData: {
                    type: 'object',
                    properties: {
                        symbol: { type: 'string' },
                        price: { type: 'number' },
                        volume24h: { type: 'number' },
                        priceChange24h: { type: 'number' },
                        timestamp: { type: 'number' }
                    }
                },
                Trade: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        userId: { type: 'string' },
                        pairId: { type: 'number' },
                        direction: { type: 'string', enum: ['long', 'short'] },
                        amount: { type: 'string' },
                        leverage: { type: 'number' },
                        entryPrice: { type: 'string' },
                        takeProfitPrice: { type: 'string' },
                        stopLossPrice: { type: 'string' },
                        status: { type: 'string', enum: ['open', 'closed', 'liquidated'] },
                        exitPrice: { type: 'string' },
                        pnl: { type: 'string' },
                        pnlPercentage: { type: 'number' },
                        openedAt: { type: 'string', format: 'date-time' },
                        closedAt: { type: 'string', format: 'date-time' },
                        closureReason: { type: 'string' }
                    }
                },
                TradeResult: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        trade: { $ref: '#/components/schemas/Trade' },
                        error: { type: 'string' }
                    }
                },
                GamificationProgress: {
                    type: 'object',
                    properties: {
                        level: { type: 'number' },
                        experience: { type: 'number' },
                        nextLevelExp: { type: 'number' },
                        achievements: { type: 'array', items: { type: 'object' } },
                        dailyStreak: { type: 'number' },
                        canClaimDaily: { type: 'boolean' }
                    }
                },
                RewardResult: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        reward: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['currency', 'pro_mode', 'no_ads'] },
                                amount: { type: 'number' },
                                duration: { type: 'number' }
                            }
                        },
                        error: { type: 'string' }
                    }
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        userId: { type: 'string' },
                        type: {
                            type: 'string',
                            enum: ['daily_reward', 'trade_closed', 'achievement_unlocked', 'system_alert', 'trade_opened']
                        },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        isActive: { type: 'boolean' },
                        isRead: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        reward: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['money', 'coins', 'energy'] },
                                amount: { type: 'string' }
                            }
                        },
                        progress: {
                            type: 'object',
                            properties: {
                                current: { type: 'number' },
                                total: { type: 'number' }
                            }
                        },
                        status: { type: 'string', enum: ['active', 'completed', 'expired'] },
                        icon: { type: 'string' }
                    }
                },
                EnergyProgress: {
                    type: 'object',
                    properties: {
                        progress: { type: 'number', description: 'Текущий прогресс (0-100)' }
                    }
                },
                EnergyResult: {
                    type: 'object',
                    properties: {
                        newProgress: { type: 'number', description: 'Новый прогресс (0-100)' },
                        isCompleted: { type: 'boolean', description: 'Было ли выполнено задание' },
                        completedTasks: { type: 'number', description: 'Количество выполненных заданий' }
                    }
                },
                TaskCount: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', description: 'Количество активных заданий' },
                        maxTasks: { type: 'number', description: 'Максимальное количество заданий (3)' }
                    }
                },
                TaskTemplate: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        templateId: { type: 'string', description: 'Уникальный ID шаблона' },
                        taskType: { type: 'string', description: 'Тип задания' },
                        title: { type: 'string', description: 'Название задания' },
                        description: { type: 'string', description: 'Описание задания' },
                        rewardType: { type: 'string', enum: ['money', 'coins', 'energy'], description: 'Тип награды' },
                        rewardAmount: { type: 'string', description: 'Количество награды' },
                        progressTotal: { type: 'number', description: 'Общее количество шагов' },
                        icon: { type: 'string', description: 'Путь к иконке' },
                        category: { type: 'string', enum: ['daily', 'video', 'trade', 'social', 'premium'], description: 'Категория задания' },
                        rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'], description: 'Редкость задания' },
                        expiresInHours: { type: 'number', description: 'Время жизни задания в часах' },
                        isActive: { type: 'boolean', description: 'Активен ли шаблон' },
                        createdBy: { type: 'string', description: 'ID создателя' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    },
    apis: ['./server/routes.ts']
};
exports.specs = (0, swagger_jsdoc_1.default)(options);
exports.swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CryptoCraze API Documentation'
};
// Middleware для защиты Swagger паролем
const swaggerAuth = (req, res, next) => {
    const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'crypto2024';
    const auth = req.headers.authorization;
    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        return res.status(401).json({
            error: 'Authentication required for API documentation access',
            message: 'Please provide valid credentials to access the documentation'
        });
    }
    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic') {
        return res.status(401).json({
            error: 'Invalid authentication scheme',
            message: 'Basic authentication required'
        });
    }
    const buffer = Buffer.from(encoded, 'base64');
    const [username, password] = buffer.toString().split(':');
    // Простая аутентификация: admin / SWAGGER_PASSWORD
    if (username === 'admin' && password === SWAGGER_PASSWORD) {
        next();
    }
    else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        return res.status(401).json({
            error: 'Invalid credentials',
            message: 'Access denied. Please check your username and password.'
        });
    }
};
exports.swaggerAuth = swaggerAuth;
