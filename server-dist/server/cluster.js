"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const PORT = process.env.PORT || 8000;
const WORKERS = parseInt(process.env.WORKERS || '') || Math.min(4, os_1.default.cpus().length);
async function startServer() {
    const { registerRoutes } = await Promise.resolve().then(() => __importStar(require('./routes')));
    const express = await Promise.resolve().then(() => __importStar(require('express')));
    const app = express.default();
    const httpServer = await registerRoutes(app);
    httpServer.listen(PORT, () => {
        const workerId = cluster_1.default.worker?.id || 'master';
        console.log(`🌐 Сервер ${workerId} слушает порт ${PORT} (PID: ${process.pid})`);
    });
    return httpServer;
}
(async () => {
    if (cluster_1.default.isPrimary) {
        console.log(`🚀 Запускаем кластер с ${WORKERS} воркерами`);
        // Запускаем воркеров
        for (let i = 0; i < WORKERS; i++) {
            const worker = cluster_1.default.fork({ WORKER_ID: i + 1 });
            console.log(`👷 Воркер ${i + 1} запущен (PID: ${worker.process.pid})`);
        }
        cluster_1.default.on('exit', (worker, code, signal) => {
            console.log(`💀 Воркер PID ${worker.process.pid} завершен (${signal || code}). Перезапуск...`);
            const newWorker = cluster_1.default.fork();
            console.log(`👷 Новый воркер запущен (PID: ${newWorker.process.pid})`);
        });
        // Мастер процесс тоже запускает сервер (для простоты)
        await startServer();
    }
    else {
        // Воркер процесс
        const workerId = process.env.WORKER_ID || cluster_1.default.worker?.id;
        console.log(`👷 Воркер ${workerId} (PID: ${process.pid}) запущен`);
        await startServer();
        process.on('SIGTERM', () => {
            console.log(`👷 Воркер ${workerId} получил SIGTERM, завершение...`);
            process.exit(0);
        });
    }
})().catch(console.error);
