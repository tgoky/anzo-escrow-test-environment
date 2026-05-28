/**
 * Script to test the payment method linking functionality
 * This demonstrates how to use the API endpoints for payment method integration
 */

import fetch from 'node-fetch';

// Simulated financial account and payment method
const testFinancialAccount = {
  accountId: 'test-acct-123',
  accountName: 'Test Bank Account',
  accountType: 'bank_account',
  currency: 'USD',
  status: 'active',
  paymentMethodTypes: ['zelle_USD', 'bank_transfer_USD']
};

const testPaymentMethod = {
  methodType: 'zelle',
  currency: 'USD',
  name: 'Zelle',
  description: 'Fast bank-to-bank transfers in the US',
  fields: [
    { name: 'email', label: 'Email Address', type: 'email', required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', required: false }
  ],
  enabled: true,
  supportedCountries: ['US']
};

async function runTest() {
  console.log('🔍 Testing payment method integration...');
  
  try {
    // 1. Create a payment method
    console.log('\n1️⃣ Creating payment method...');
    const paymentMethodResponse = await fetch('http://localhost:3000/api/admin/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPaymentMethod)
    });
    
    if (!paymentMethodResponse.ok) {
      throw new Error(`Failed to create payment method: ${paymentMethodResponse.status} ${paymentMethodResponse.statusText}`);
    }
    
    const paymentMethod = await paymentMethodResponse.json();
    console.log('✅ Payment method created:', paymentMethod);
    
    // 2. Create a financial account (simulated - just for testing)
    console.log('\n2️⃣ Creating test financial account (simulated)...');
    console.log('✅ Financial account created:', testFinancialAccount);
    
    // 3. Link the payment method to the account
    console.log('\n3️⃣ Linking payment method to financial account...');
    const linkResponse = await fetch('http://localhost:3000/api/financial-accounts/payment-methods/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: testFinancialAccount.accountId,
        paymentMethodId: paymentMethod.id
      })
    });
    
    if (!linkResponse.ok) {
      throw new Error(`Failed to link payment method: ${linkResponse.status} ${linkResponse.statusText}`);
    }
    
    const linkResult = await linkResponse.json();
    console.log('✅ Payment method linked to account:', linkResult);
    
    // 4. Get payment method for the account
    console.log('\n4️⃣ Getting payment method for the account...');
    const getMethodResponse = await fetch(`http://localhost:3000/api/financial-accounts/${testFinancialAccount.accountId}/payment-method`);
    
    if (!getMethodResponse.ok) {
      throw new Error(`Failed to get payment method: ${getMethodResponse.status} ${getMethodResponse.statusText}`);
    }
    
    const accountMethod = await getMethodResponse.json();
    console.log('✅ Retrieved payment method for account:', accountMethod);
    
    // 5. Add a payment method type to the account
    console.log('\n5️⃣ Adding payment method type to account...');
    const addTypeResponse = await fetch('http://localhost:3000/api/financial-accounts/payment-method-types/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: testFinancialAccount.accountId,
        methodType: 'cash_deposit',
        currency: 'USD'
      })
    });
    
    if (!addTypeResponse.ok) {
      throw new Error(`Failed to add payment method type: ${addTypeResponse.status} ${addTypeResponse.statusText}`);
    }
    
    const addTypeResult = await addTypeResponse.json();
    console.log('✅ Added payment method type:', addTypeResult);
    
    // 6. Find matching payment methods (simulate with two accounts)
    console.log('\n6️⃣ Finding matching payment methods...');
    const findMatchingResponse = await fetch('http://localhost:3000/api/financial-accounts/matching-payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        makerAccountId: testFinancialAccount.accountId,
        takerAccountId: testFinancialAccount.accountId // using same account for demo
      })
    });
    
    if (!findMatchingResponse.ok) {
      throw new Error(`Failed to find matching methods: ${findMatchingResponse.status} ${findMatchingResponse.statusText}`);
    }
    
    const matchingMethods = await findMatchingResponse.json();
    console.log('✅ Found matching payment methods:', matchingMethods);
    
    // 7. Unlink the payment method
    console.log('\n7️⃣ Unlinking payment method from account...');
    const unlinkResponse = await fetch('http://localhost:3000/api/financial-accounts/payment-methods/unlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: testFinancialAccount.accountId,
        paymentMethodId: paymentMethod.id
      })
    });
    
    if (!unlinkResponse.ok) {
      throw new Error(`Failed to unlink payment method: ${unlinkResponse.status} ${unlinkResponse.statusText}`);
    }
    
    const unlinkResult = await unlinkResponse.json();
    console.log('✅ Payment method unlinked from account:', unlinkResult);
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();