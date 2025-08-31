#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixMissingColumn() {
  console.log('🔧 Attempting to fix missing active_paying_users column...');
  
  try {
    // First, check if the column exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'revenue_metrics' 
      AND column_name = 'active_paying_users';
    `);
    
    if (checkColumn.length === 0) {
      console.log('❌ Column active_paying_users not found. Adding it...');
      
      // Add the missing column
      await db.execute(sql`
        ALTER TABLE "revenue_metrics" 
        ADD COLUMN "active_paying_users" integer DEFAULT 0;
      `);
      
      // Update existing records
      await db.execute(sql`
        UPDATE "revenue_metrics" 
        SET "active_paying_users" = "total_paying_users";
      `);
      
      console.log('✅ Column added successfully!');
    } else {
      console.log('✅ Column active_paying_users already exists.');
    }
    
    // Now test the query
    console.log('🧪 Testing analytics query...');
    const result = await db.execute(sql`
      SELECT * FROM "revenue_metrics" 
      ORDER BY "date" DESC 
      LIMIT 1;
    `);
    
    console.log('✅ Query successful. Found', result.length, 'records');
    if (result.length > 0) {
      console.log('📊 Sample data:', result[0]);
    }
    
  } catch (error) {
    console.error('❌ Error fixing column:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixMissingColumn();