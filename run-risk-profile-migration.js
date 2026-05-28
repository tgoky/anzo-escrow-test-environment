/**
 * Script to run the database migration to add risk profile fields to the makers table
 */
import { addRiskProfileFields } from './migrations/add_risk_profile_fields.js';

async function runMigration() {
  console.log("🚀 Starting migration for risk profile fields");
  
  try {
    await addRiskProfileFields();
    console.log("✅ Risk profile migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration().then(() => {
  console.log("🔁 Migration process finished");
  process.exit(0);
});