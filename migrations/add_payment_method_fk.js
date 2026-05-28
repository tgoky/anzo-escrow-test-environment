import pkg from 'pg';
const { Pool } = pkg;
import process from 'node:process';

/**
 * Migration to add a foreign key relationship from financial_accounts to payment_methods
 */
export async function addPaymentMethodForeignKey() {
  console.log('🔄 Adding payment_method_id column to financial_accounts table...');

  // Create a connection to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // First, add the column if it doesn't exist
    await client.query(`
      ALTER TABLE financial_accounts 
      ADD COLUMN IF NOT EXISTS payment_method_id INTEGER
    `);

    console.log('✅ payment_method_id column added successfully');

    // Then, add the foreign key constraint
    await client.query(`
      ALTER TABLE financial_accounts 
      ADD CONSTRAINT fk_financial_account_payment_method 
      FOREIGN KEY (payment_method_id) 
      REFERENCES payment_methods(id)
    `);

    // Commit the transaction
    await client.query('COMMIT');

    console.log('✅ Foreign key constraint added successfully');
    return { success: true };
  } catch (error) {
    // Rollback the transaction if there's an error
    await client.query('ROLLBACK');
    console.error('❌ Error adding payment method foreign key:', error);
    return { success: false, error };
  } finally {
    // Release the client back to the pool
    client.release();
    await pool.end();
  }
}