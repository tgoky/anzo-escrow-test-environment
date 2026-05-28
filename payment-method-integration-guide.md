# Payment Method Integration Guide

This guide explains how the payment method integration works in our platform, particularly the relationship between financial accounts and payment methods.

## Overview

The system supports a flexible way to associate payment methods with financial accounts, allowing both:

1. **Direct linking** - A foreign key relationship where a financial account is directly linked to a specific payment method record
2. **Method type support** - A many-to-many relationship where accounts can support multiple payment method types

## Database Schema

### Tables

#### Financial Accounts

```sql
CREATE TABLE financial_accounts (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  balances JSONB NOT NULL,
  institution JSONB NOT NULL,
  regional_details JSONB,
  payment_capabilities JSONB,
  connectivity JSONB,
  account_holder JSONB,
  payment_method_types TEXT[],
  payment_method_id INTEGER REFERENCES payment_methods(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  mask TEXT,
  metadata JSONB,
  user_id INTEGER REFERENCES users(id)
);
```

#### Payment Methods

```sql
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  method_type TEXT NOT NULL,
  currency TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  supported_countries TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_method_type_currency UNIQUE (method_type, currency)
);
```

## Foreign Key Relationship

Financial accounts can be linked to a specific payment method record using the `payment_method_id` field. This creates a direct association between the account and a payment method.

## API Endpoints

### Link a Payment Method to an Account

```
POST /api/financial-accounts/payment-methods/link
```

**Request Body:**
```json
{
  "accountId": "account-123",
  "paymentMethodId": 1
}
```

### Unlink a Payment Method from an Account

```
POST /api/financial-accounts/payment-methods/unlink
```

**Request Body:**
```json
{
  "accountId": "account-123",
  "paymentMethodId": 1
}
```

### Get Payment Method for an Account

```
GET /api/financial-accounts/:accountId/payment-method
```

### Add a Payment Method Type to an Account

```
POST /api/financial-accounts/payment-method-types/add
```

**Request Body:**
```json
{
  "accountId": "account-123",
  "methodType": "zelle",
  "currency": "USD"
}
```

### Remove a Payment Method Type from an Account

```
POST /api/financial-accounts/payment-method-types/remove
```

**Request Body:**
```json
{
  "accountId": "account-123",
  "methodType": "zelle",
  "currency": "USD"
}
```

### Get Accounts by Payment Method

```
GET /api/payment-methods/:paymentMethodId/accounts
```

### Find Matching Payment Methods Between Accounts

```
POST /api/financial-accounts/matching-payment-methods
```

**Request Body:**
```json
{
  "makerAccountId": "account-123",
  "takerAccountId": "account-456"
}
```

## Usage in Transaction Matching

The payment method integration is particularly useful for the transaction matching process, where a maker and taker need to find compatible payment methods to complete a transaction.

### How It Works

1. When a user creates a new offer, they specify which payment methods are accepted
2. When a taker wants to initiate a transaction, the system checks if there are compatible payment methods
3. The `findMatchingPaymentMethods` function compares the payment method types supported by both accounts
4. Only transactions with matching payment methods can proceed to verification

### Unique Payment Method Identifiers

Payment methods are identified by a unique string combining the method type and currency:

```
methodType_currency
```

For example:
- `zelle_USD` - Zelle payments in US Dollars
- `bank_transfer_EUR` - Bank transfers in Euros
- `cash_deposit_NGN` - Cash deposits in Nigerian Naira

## Admin Features

Administrators can manage payment methods and view which accounts are using specific payment methods:

```
GET /api/admin/payment-methods/:paymentMethodId/accounts
```

This endpoint requires admin authentication and returns all financial accounts linked to a specific payment method.

## Example Integration

See the `test-payment-method-link.js` script for a working example of the payment method integration API:

```javascript
// Link a payment method to an account
await fetch('/api/financial-accounts/payment-methods/link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountId: financialAccount.accountId,
    paymentMethodId: paymentMethod.id
  })
});
```