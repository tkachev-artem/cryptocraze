"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoinGeckoIcon = getCoinGeckoIcon;
const CACHE_TTL = 60 * 60 * 1000; // 1 час
const cache = {};
async function getCoinGeckoIcon(id) {
    const now = Date.now();
    const cached = cache[id];
    if (cached && cached.expiresAt > now) {
        return cached.icon;
    }
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
        if (!response.ok)
            throw new Error('CoinGecko error');
        const data = await response.json();
        const icon = data?.image?.large || null;
        cache[id] = { icon, expiresAt: now + CACHE_TTL };
        return icon;
    }
    catch (e) {
        cache[id] = { icon: null, expiresAt: now + 5 * 60 * 1000 }; // fail cache на 5 минут
        return null;
    }
}
