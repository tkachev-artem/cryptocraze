#!/usr/bin/env tsx
"use strict";
/**
 * Data Synchronization Script for CryptoCraze Rating System
 *
 * This script fixes user statistics inconsistencies by:
 * 1. Syncing user stats with actual deal data
 * 2. Calculating accurate P&L from closed deals
 * 3. Updating rating scores based on real trading performance
 * 4. Fixing disconnected user IDs between users and deals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserStatistics = syncUserStatistics;
exports.calculateUserStats = calculateUserStats;
exports.calculateRatingScore = calculateRatingScore;
const db_js_1 = require("../server/db.js");
const schema_js_1 = require("../shared/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
async function calculateUserStats(userId) {
    try {
        // Get all closed deals for this user
        const userDeals = await db_js_1.db
            .select()
            .from(schema_js_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.deals.status, 'closed')));
        if (userDeals.length === 0) {
            console.log(`No closed deals found for user ${userId}`);
            return {
                userId,
                totalTrades: 0,
                totalPnl: 0,
                totalVolume: 0,
                successfulTrades: 0,
                maxProfit: 0,
                maxLoss: 0,
                avgTradeAmount: 0,
                winRate: 0
            };
        }
        let totalPnl = 0;
        let totalVolume = 0;
        let successfulTrades = 0;
        let maxProfit = Number.NEGATIVE_INFINITY;
        let maxLoss = Number.POSITIVE_INFINITY;
        for (const deal of userDeals) {
            const profit = Number(deal.profit || 0);
            const amount = Number(deal.amount || 0);
            totalPnl += profit;
            totalVolume += amount;
            if (profit > 0) {
                successfulTrades++;
            }
            if (profit > maxProfit) {
                maxProfit = profit;
            }
            if (profit < maxLoss) {
                maxLoss = profit;
            }
        }
        // Fix infinity values
        if (maxProfit === Number.NEGATIVE_INFINITY)
            maxProfit = 0;
        if (maxLoss === Number.POSITIVE_INFINITY)
            maxLoss = 0;
        const avgTradeAmount = userDeals.length > 0 ? totalVolume / userDeals.length : 0;
        const winRate = userDeals.length > 0 ? (successfulTrades / userDeals.length) * 100 : 0;
        return {
            userId,
            totalTrades: userDeals.length,
            totalPnl,
            totalVolume,
            successfulTrades,
            maxProfit,
            maxLoss,
            avgTradeAmount,
            winRate
        };
    }
    catch (error) {
        console.error(`Error calculating stats for user ${userId}:`, error);
        return null;
    }
}
function calculateRatingScore(stats) {
    // Rating score calculation based on:
    // - Total P&L (40% weight)
    // - Win rate (30% weight) 
    // - Trade volume (20% weight)
    // - Number of trades (10% weight)
    const pnlScore = Math.max(0, stats.totalPnl / 100); // $100 = 1 point
    const winRateScore = stats.winRate; // Direct percentage
    const volumeScore = stats.totalVolume / 1000; // $1000 = 1 point
    const tradesScore = Math.min(stats.totalTrades * 2, 100); // Max 100 points from trades
    const totalScore = Math.round((pnlScore * 0.4) +
        (winRateScore * 0.3) +
        (volumeScore * 0.2) +
        (tradesScore * 0.1));
    return Math.max(0, totalScore);
}
async function syncUserStatistics() {
    console.log('🔄 Starting user statistics synchronization...');
    try {
        // Get all users
        const allUsers = await db_js_1.db.select({ id: schema_js_1.users.id }).from(schema_js_1.users);
        console.log(`📊 Found ${allUsers.length} users to process`);
        const userStatsArray = [];
        // Process each user
        for (const user of allUsers) {
            console.log(`Processing user: ${user.id}`);
            const stats = await calculateUserStats(user.id);
            if (!stats) {
                console.log(`❌ Failed to calculate stats for user ${user.id}`);
                continue;
            }
            const ratingScore = calculateRatingScore(stats);
            console.log(`📈 User ${user.id} stats:`, {
                trades: stats.totalTrades,
                pnl: stats.totalPnl.toFixed(2),
                winRate: stats.winRate.toFixed(2),
                ratingScore
            });
            // Update user record in database
            await db_js_1.db
                .update(schema_js_1.users)
                .set({
                tradesCount: stats.totalTrades,
                totalTradesVolume: stats.totalVolume.toString(),
                successfulTradesPercentage: stats.winRate.toFixed(2),
                maxProfit: stats.maxProfit.toString(),
                maxLoss: stats.maxLoss.toString(),
                averageTradeAmount: stats.avgTradeAmount.toFixed(2),
                ratingScore: ratingScore,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, user.id));
            userStatsArray.push({ ...stats, ratingScore });
        }
        // Calculate rankings based on rating scores
        console.log('🏆 Calculating user rankings...');
        // Sort by rating score descending, then by total PnL
        userStatsArray.sort((a, b) => {
            if (b.ratingScore !== a.ratingScore) {
                return b.ratingScore - a.ratingScore;
            }
            return b.totalPnl - a.totalPnl;
        });
        // Update rankings
        for (let i = 0; i < userStatsArray.length; i++) {
            const userStats = userStatsArray[i];
            const rank = i + 1;
            await db_js_1.db
                .update(schema_js_1.users)
                .set({
                ratingRank30Days: rank,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, userStats.userId));
            console.log(`🥇 User ${userStats.userId} ranked #${rank} with rating ${userStats.ratingScore}`);
        }
        console.log('✅ User statistics synchronization completed successfully!');
        // Summary statistics
        const totalUsers = userStatsArray.length;
        const usersWithTrades = userStatsArray.filter(s => s.totalTrades > 0).length;
        const totalTrades = userStatsArray.reduce((sum, s) => sum + s.totalTrades, 0);
        const totalPnl = userStatsArray.reduce((sum, s) => sum + s.totalPnl, 0);
        console.log('\n📊 SYNCHRONIZATION SUMMARY:');
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Users with Trades: ${usersWithTrades}`);
        console.log(`Total Trades: ${totalTrades}`);
        console.log(`Total P&L: $${totalPnl.toFixed(2)}`);
        console.log(`Top Performer: User ${userStatsArray[0]?.userId} with rating ${userStatsArray[0]?.ratingScore}`);
    }
    catch (error) {
        console.error('❌ Error during synchronization:', error);
        throw error;
    }
}
async function verifyDataConsistency() {
    console.log('\n🔍 Verifying data consistency...');
    try {
        // Check for users with inconsistent data
        const usersWithInconsistencies = await db_js_1.db
            .select({
            id: schema_js_1.users.id,
            tradesCount: schema_js_1.users.tradesCount,
            ratingScore: schema_js_1.users.ratingScore,
            ratingRank30Days: schema_js_1.users.ratingRank30Days
        })
            .from(schema_js_1.users);
        const inconsistentUsers = usersWithInconsistencies.filter(user => {
            return (Number(user.tradesCount) > 0 && Number(user.ratingScore) === 0) ||
                (user.ratingRank30Days === null && Number(user.tradesCount) > 0);
        });
        if (inconsistentUsers.length > 0) {
            console.log(`⚠️  Found ${inconsistentUsers.length} users with data inconsistencies:`);
            inconsistentUsers.forEach(user => {
                console.log(`  - User ${user.id}: ${user.tradesCount} trades, rating ${user.ratingScore}, rank ${user.ratingRank30Days}`);
            });
        }
        else {
            console.log('✅ No data inconsistencies found!');
        }
        // Check deal-user ID mismatches
        const dealsWithoutUsers = await db_js_1.db
            .select({ userId: schema_js_1.deals.userId })
            .from(schema_js_1.deals)
            .leftJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.deals.userId, schema_js_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, null));
        if (dealsWithoutUsers.length > 0) {
            console.log(`⚠️  Found ${dealsWithoutUsers.length} deals with non-existent user IDs`);
            const uniqueUserIds = [...new Set(dealsWithoutUsers.map(d => d.userId))];
            console.log('Orphaned user IDs:', uniqueUserIds.slice(0, 10));
        }
        else {
            console.log('✅ All deals have valid user IDs');
        }
    }
    catch (error) {
        console.error('❌ Error during verification:', error);
    }
}
// Main execution
async function main() {
    console.log('🚀 CryptoCraze Data Synchronization Script');
    console.log('==========================================\n');
    try {
        await verifyDataConsistency();
        await syncUserStatistics();
        await verifyDataConsistency();
        console.log('\n🎉 All operations completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (process.argv[1] && process.argv[1].includes('sync-user-statistics.ts')) {
    main();
}
