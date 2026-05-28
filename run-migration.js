/**
 * Script to run the database migration to add the foreign key
 * relationship between financial_accounts and payment_methods
 */

import { addPaymentMethodForeignKey } from './migrations/add_payment_method_fk.js';

console.log('🚀 Starting migration to add payment method foreign key...');

addPaymentMethodForeignKey()
  .then(result => {
    if (result.success) {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Migration encountered an error:', error);
    process.exit(1);
  });