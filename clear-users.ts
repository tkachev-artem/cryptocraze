#!/usr/bin/env tsx
// Script to clear all users and their data for testing

import { db } from './server/db.js';
import { users, userTasks, deals } from './shared/schema';

async function clearAllUsers() {
  try {
    console.log('🧹 Clearing all users and related data...');
    
    // Delete all tasks first (foreign key constraint)
    const deletedTasks = await db.delete(userTasks);
    console.log(`✅ Deleted user tasks`);
    
    // Delete all deals
    const deletedDeals = await db.delete(deals);
    console.log(`✅ Deleted user deals`);
    
    // Delete all users
    const deletedUsers = await db.delete(users);
    console.log(`✅ Deleted all users`);
    
    console.log('🎉 Database cleared successfully!');
    console.log('You can now test with fresh accounts.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearAllUsers();