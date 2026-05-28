/**
 * Utility to connect a test wallet for development purposes
 * This is a helper function for testing purposes only
 */

(function connectTestWallet() {
  // A demo wallet address for testing
  const testWalletAddress = '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ';
  
  // Store in localStorage for persistence
  localStorage.setItem('walletPublicKey', testWalletAddress);
  
  console.log('🧪 Test wallet connected:', testWalletAddress);
  console.log('🧪 To use this wallet, refresh the page or restart the application');
  
  // You can run this in the browser console to connect a test wallet
})();