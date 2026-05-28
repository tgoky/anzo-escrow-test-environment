/**
 * Utility to get supported currencies from the payment method files
 */

import axios from 'axios';

// List of supported currencies based on payment method files
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'SGD', name: 'Singapore Dollar' }
];

// Cryptocurrency tokens supported by the platform
export const SUPPORTED_TOKENS = [
  { code: 'USDT', name: 'Tether' },
  { code: 'USDC', name: 'USD Coin' },
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'SOL', name: 'Solana' }
];

/**
 * Get available payment methods for a specific country and currency
 */
export async function getPaymentMethodsForCurrency(currency: string, country: string = 'US'): Promise<any[]> {
  try {
    const response = await axios.get(`/api/payment-method-options?country=${country}&currency=${currency}`);
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    return [];
  }
}

/**
 * Get all available payment methods in the system
 */
export async function getAllPaymentMethods(): Promise<any[]> {
  try {
    const response = await axios.get('/api/payment-methods');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch all payment methods:', error);
    return [];
  }
}