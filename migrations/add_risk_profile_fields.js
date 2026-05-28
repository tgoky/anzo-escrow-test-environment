import { sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import 'dotenv/config';

// Create a new database connection for migration
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

/**
 * Migration to add risk profile fields to the makers table
 */
export async function addRiskProfileFields() {
  console.log("🔄 Running migration: Adding risk profile fields to makers table");
  
  try {
    // Add risk_category column
    await db.execute(sql`
      ALTER TABLE makers 
      ADD COLUMN IF NOT EXISTS risk_category TEXT DEFAULT 'medium';
    `);
    console.log("✅ Added risk_category column");
    
    // Add risk_score column (decimal with precision 5, scale 2)
    await db.execute(sql`
      ALTER TABLE makers 
      ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2);
    `);
    console.log("✅ Added risk_score column");
    
    // Add risk_factors column (JSONB)
    await db.execute(sql`
      ALTER TABLE makers 
      ADD COLUMN IF NOT EXISTS risk_factors JSONB;
    `);
    console.log("✅ Added risk_factors column");
    
    console.log("✅ Migration completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration when file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  addRiskProfileFields()
    .then(() => {
      console.log("✅ Risk profile fields migration complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}