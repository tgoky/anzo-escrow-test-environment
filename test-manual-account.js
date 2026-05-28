// Simple test script to create a manual financial account
import fetch from 'node-fetch';

async function createManualAccount() {
  // Create a proper test account with all required fields
  const accountData = {
    walletAddress: "6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ",
    accountName: "Test Bank Account",
    accountType: "bank_account",
    institution: {
      name: "Test Bank",
      type: "bank",
      country: "GB"
    },
    currency: "GBP",
    paymentMethods: [
      {
        type: "bank_transfer",
        provider: "Test Bank",
        details: {
          accountNumber: "12345678",
          sortCode: "12-34-56",
          accountHolder: "Test Account Owner" // Added missing required field
        },
        country: "GB",
        currency: "GBP",
        instructions: "Please reference the transaction ID when making payment"
      }
    ]
  };

  try {
    console.log('Sending account data:', JSON.stringify(accountData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/manual-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error creating account:', result);
      return;
    }
    
    console.log('Account created successfully:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Exception:', error);
  }
}

createManualAccount();